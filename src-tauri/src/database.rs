use rusqlite::Connection;
use std::io;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Database not initialized")]
    NotInitialized,

    #[error("Migration failed: {0}")]
    MigrationFailed(String),

    #[error("Record not found")]
    NotFound,

    #[error("IO error: {0}")]
    Io(#[from] io::Error),
}

pub type DatabaseResult<T> = Result<T, DatabaseError>;

/// Database manager for LuminaFast catalogue
/// Phase 1.1: Schema SQLite du Catalogue
pub struct Database {
    connection: Connection,
}

impl Database {
    /// Create new database connection
    pub fn new<P: AsRef<Path>>(path: P) -> DatabaseResult<Self> {
        let connection = Connection::open(path)?;
        let db = Database { connection };

        // Configure SQLite PRAGMA for performance as specified in plan
        db.connection.pragma_update(None, "journal_mode", "WAL")?;
        db.connection.pragma_update(None, "synchronous", "NORMAL")?;
        db.connection.pragma_update(None, "cache_size", "-20000")?;
        db.connection.pragma_update(None, "page_size", "4096")?;
        db.connection.pragma_update(None, "temp_store", "memory")?;
        db.connection.pragma_update(None, "foreign_keys", "ON")?;

        Ok(db)
    }

    /// Get reference to the underlying SQLite connection
    pub fn connection(&self) -> &Connection {
        &self.connection
    }

    /// Execute a transaction with the given function
    pub fn execute_transaction<F, R>(&mut self, f: F) -> DatabaseResult<R>
    where
        F: FnOnce(&rusqlite::Transaction) -> DatabaseResult<R>,
    {
        let tx = self.connection.transaction()?;
        let result = f(&tx)?;
        tx.commit()?;
        Ok(result)
    }

    /// Initialize database schema (run migrations)
    pub fn initialize(&mut self) -> DatabaseResult<()> {
        // Create migrations table if not exists
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL UNIQUE,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Run initial migration
        self.run_migration("001_initial")?;
        
        // Run ingestion sessions migration
        self.run_migration("002_ingestion_sessions")?;
        
        // TODO: Fix 003_previews migration parsing (triggers with BEGIN...END)
        // self.run_migration("003_previews")?;

        Ok(())
    }

    /// Check if migration has been applied
    fn is_migration_applied(&self, version: &str) -> DatabaseResult<bool> {
        // First check if migrations table exists
        let table_exists: i64 = self
            .connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='migrations'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if table_exists == 0 {
            // migrations table doesn't exist yet
            return Ok(false);
        }

        let mut stmt = self
            .connection
            .prepare("SELECT COUNT(*) as count FROM migrations WHERE version = ?")?;

        let count: i64 = stmt.query_row([version], |row| row.get(0))?;
        Ok(count > 0)
    }

    /// Run a migration script
    fn run_migration(&mut self, version: &str) -> DatabaseResult<()> {
        log::info!("Running migration: {}", version);

        if self.is_migration_applied(version)? {
            log::info!("Migration {} already applied", version);
            return Ok(());
        }

        let migration_sql = match version {
            "001_initial" => include_str!("../migrations/001_initial.sql"),
            "002_ingestion_sessions" => include_str!("../migrations/002_ingestion_sessions.sql"),
            // "003_previews" => include_str!("../migrations/003_previews.sql"),  // TODO: Fix trigger parsing
            _ => {
                return Err(DatabaseError::MigrationFailed(format!(
                    "Unknown migration version: {}",
                    version
                )))
            }
        };

        log::info!(
            "Migration SQL loaded, length: {} chars",
            migration_sql.len()
        );

        // Execute migration directly (without transaction for now)
        let mut statements_executed = 0;

        // Split by semicolon and filter out empty statements and comments
        for statement in migration_sql.split(';') {
            let statement = statement.trim();

            // Skip empty statements and pure comments
            if statement.is_empty() || statement.lines().all(|line| line.trim().starts_with("--")) {
                continue;
            }

            // Remove inline comments and create owned string
            let clean_statement: String = statement
                .lines()
                .map(|line| {
                    if let Some(comment_pos) = line.find("--") {
                        &line[..comment_pos]
                    } else {
                        line
                    }
                })
                .collect::<Vec<&str>>()
                .join("\n")
                .trim()
                .to_string();

            if !clean_statement.is_empty() {
                log::debug!(
                    "Executing: {}",
                    &clean_statement[..100.min(clean_statement.len())]
                );
                self.connection.execute(&clean_statement, [])?;
                statements_executed += 1;
            }
        }

        // Record migration
        self.connection
            .execute("INSERT INTO migrations (version) VALUES (?)", [version])?;

        log::info!(
            "Applied migration: {} ({} statements)",
            version,
            statements_executed
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_migration_debug() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_debug.db");

        let db = Database::new(&db_path)?;

        // Load migration content directly
        let migration_sql = include_str!("../migrations/001_initial.sql");
        println!("Migration content length: {}", migration_sql.len());
        println!(
            "First 200 chars: {}",
            &migration_sql[..200.min(migration_sql.len())]
        );

        // Try to execute first statement manually
        let statements: Vec<&str> = migration_sql.split(';').collect();
        println!("Number of statements: {}", statements.len());

        for (i, statement) in statements.iter().enumerate() {
            let statement = statement.trim();
            if !statement.is_empty() && !statement.starts_with("--") {
                println!(
                    "Statement {}: {}",
                    i,
                    &statement[..100.min(statement.len())]
                );
                if i == 0 {
                    // Try to execute first statement
                    match db.connection.execute(statement, []) {
                        Ok(_) => println!("✓ First statement executed successfully"),
                        Err(e) => println!("✗ First statement failed: {}", e),
                    }
                }
            }
        }

        Ok(())
    }

    #[test]
    fn test_manual_migration() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_manual.db");

        let db = Database::new(&db_path)?;

        // Manually execute the first CREATE TABLE
        db.connection.execute(
            "CREATE TABLE images (
                id INTEGER PRIMARY KEY,
                blake3_hash TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL,
                extension TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                orientation INTEGER DEFAULT 0,
                file_size_bytes INTEGER,
                captured_at TEXT,
                imported_at TEXT DEFAULT (datetime('now')),
                folder_id INTEGER REFERENCES folders(id)
            )",
            [],
        )?;

        // Check that table exists
        let table_exists: i64 = db
            .connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='images'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        assert_eq!(table_exists, 1);

        Ok(())
    }

    #[test]
    fn test_migration_simple() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_migration.db");

        let db = Database::new(&db_path)?;

        // Check that no tables exist initially
        let tables_before: Vec<String> = db
            .connection()
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")?
            .query_map([], |row| row.get(0))?
            .collect::<Result<_, _>>()?;

        assert!(!tables_before.contains(&"images".to_string()));
        assert!(!tables_before.contains(&"migrations".to_string()));

        // Run initialization
        let mut db = db; // Rebinding as mutable
        db.initialize()?;

        // Check that tables exist after migration
        let tables_after: Vec<String> = db
            .connection()
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")?
            .query_map([], |row| row.get(0))?
            .collect::<Result<_, _>>()?;

        assert!(tables_after.contains(&"images".to_string()));
        assert!(tables_after.contains(&"migrations".to_string()));

        Ok(())
    }

    #[test]
    fn test_database_creation() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test.db");

        let db = Database::new(&db_path)?;
        assert!(db_path.exists());

        Ok(())
    }

    #[test]
    fn test_database_initialization() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_init.db");

        let mut db = Database::new(&db_path)?;
        db.initialize()?;

        // Check that tables exist as specified in plan
        let tables: Vec<String> = db
            .connection()
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")?
            .query_map([], |row| row.get(0))?
            .collect::<Result<_, _>>()?;

        // Verify all tables from plan exist
        assert!(tables.contains(&"images".to_string()));
        assert!(tables.contains(&"folders".to_string()));
        assert!(tables.contains(&"exif_metadata".to_string()));
        assert!(tables.contains(&"collections".to_string()));
        assert!(tables.contains(&"collection_images".to_string()));
        assert!(tables.contains(&"image_state".to_string()));
        assert!(tables.contains(&"tags".to_string()));
        assert!(tables.contains(&"image_tags".to_string()));
        assert!(tables.contains(&"migrations".to_string()));

        Ok(())
    }

    #[test]
    fn test_migration_idempotency() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_migrate.db");

        let mut db = Database::new(&db_path)?;

        // Run initialization twice
        db.initialize()?;
        db.initialize()?;

        // Should not fail and migrations should only be applied once
        let migration_count: i64 = db
            .connection()
            .prepare("SELECT COUNT(*) FROM migrations")?
            .query_row([], |row| row.get(0))?;

        // Two migrations are run: 001_initial and 002_ingestion_sessions
        assert_eq!(migration_count, 2);

        Ok(())
    }

    #[test]
    fn test_insert_and_query_image() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_crud.db");

        let mut db = Database::new(&db_path)?;
        db.initialize()?;

        // Insert a test image as specified in schema
        db.connection.execute(
            "INSERT INTO images (blake3_hash, filename, extension, width, height, orientation, file_size_bytes, captured_at, imported_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
            ["hash123", "test.CR3", "CR3", "6000", "4000", "0", "25000000"],
        )?;

        // Query the image
        let image_count: i64 = db
            .connection()
            .prepare("SELECT COUNT(*) FROM images WHERE blake3_hash = ?")?
            .query_row(["hash123"], |row| row.get(0))?;

        assert_eq!(image_count, 1);

        Ok(())
    }

    #[test]
    fn test_foreign_key_constraints() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_fk.db");

        let mut db = Database::new(&db_path)?;
        db.initialize()?;

        // Try to insert image_state for non-existent image (should fail)
        let result = db.connection.execute(
            "INSERT INTO image_state (image_id, rating) VALUES (?, ?)",
            [999, 5],
        );

        assert!(result.is_err()); // Should fail due to foreign key constraint

        Ok(())
    }

    #[test]
    fn test_indexes_created() -> DatabaseResult<()> {
        let temp_dir = tempdir()?;
        let db_path = temp_dir.path().join("test_indexes.db");

        let mut db = Database::new(&db_path)?;
        db.initialize()?;

        // Check that indexes exist as specified in migration
        let indexes: Vec<String> = db
            .connection()
            .prepare("SELECT name FROM sqlite_master WHERE type='index'")?
            .query_map([], |row| row.get(0))?
            .collect::<Result<_, _>>()?;

        // Verify key indexes from plan
        assert!(indexes.contains(&"idx_images_blake3_hash".to_string()));
        assert!(indexes.contains(&"idx_images_filename".to_string()));
        assert!(indexes.contains(&"idx_images_captured_at".to_string()));
        assert!(indexes.contains(&"idx_folders_path".to_string()));
        assert!(indexes.contains(&"idx_collections_type".to_string()));

        Ok(())
    }
}
