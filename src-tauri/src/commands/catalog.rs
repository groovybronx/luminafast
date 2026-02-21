use crate::database::Database;
use crate::database::DatabaseError;
use crate::models::dto::*;
use std::sync::{Arc, Mutex};
use tauri::State;

/// Application state containing the database connection
pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

/// Get all images with optional filtering
#[tauri::command]
pub async fn get_all_images(
    filter: Option<ImageFilter>,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let mut query = String::from(
        "SELECT i.id, i.blake3_hash, i.filename, i.extension,
                i.width, i.height, i.file_size_bytes, i.orientation,
                i.captured_at, i.imported_at, i.folder_id,
                ist.rating, ist.flag, ist.color_label,
                e.iso, e.aperture, e.shutter_speed, e.focal_length,
                e.lens, e.camera_make, e.camera_model
         FROM images i
         LEFT JOIN image_state ist ON i.id = ist.image_id
         LEFT JOIN exif_metadata e ON i.id = e.image_id",
    );

    let mut params = Vec::new();

    // Build WHERE clause based on filter
    if let Some(f) = filter {
        let mut conditions = Vec::new();

        if let Some(rating_min) = f.rating_min {
            conditions.push("image_state.rating >= ?");
            params.push(rating_min.to_string());
        }

        if let Some(rating_max) = f.rating_max {
            conditions.push("image_state.rating <= ?");
            params.push(rating_max.to_string());
        }

        if let Some(flag) = f.flag {
            conditions.push("image_state.flag = ?");
            params.push(flag);
        }

        if let Some(folder_id) = f.folder_id {
            conditions.push("i.folder_id = ?");
            params.push(folder_id.to_string());
        }

        if let Some(search_text) = f.search_text {
            conditions.push("(i.filename LIKE ? OR i.blake3_hash LIKE ?)");
            let search_pattern = format!("%{}%", search_text);
            params.push(search_pattern.clone());
            params.push(search_pattern);
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }
    }

    query.push_str(" ORDER BY i.imported_at DESC");

    let mut stmt = db
        .connection()
        .prepare(&query)
        .map_err(|e| format!("Database error: {}", e))?;

    let images_iter = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(ImageDTO {
                id: row.get(0)?,
                blake3_hash: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                rating: row.get(11)?,
                flag: row.get(12)?,
                captured_at: row.get(8)?,
                imported_at: row.get(9)?,
                iso: row.get(14)?,
                aperture: row.get(15)?,
                shutter_speed: row.get(16)?,
                focal_length: row.get(17)?,
                lens: row.get(18)?,
                camera_make: row.get(19)?,
                camera_model: row.get(20)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut images = Vec::new();
    for image in images_iter {
        images.push(image.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(images)
}

/// Get detailed information for a single image
#[tauri::command]
pub async fn get_image_detail(
    id: u32,
    state: State<'_, AppState>,
) -> CommandResult<ImageDetailDTO> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let mut stmt = db.connection().prepare(
        "SELECT i.id, i.blake3_hash, i.filename, i.extension, 
                i.width, i.height, i.file_size_bytes, i.orientation,
                i.captured_at, i.imported_at, i.folder_id,
                image_state.rating, image_state.flag, image_state.color_label,
                exif_metadata.iso, exif_metadata.aperture, exif_metadata.shutter_speed, exif_metadata.focal_length,
                exif_metadata.lens, exif_metadata.camera_make, exif_metadata.camera_model,
                exif_metadata.gps_lat, exif_metadata.gps_lon, exif_metadata.color_space
         FROM images i
         LEFT JOIN image_state image_state ON i.id = image_state.image_id
         LEFT JOIN exif_metadata exif_metadata ON i.id = exif_metadata.image_id
         WHERE i.id = ?"
    )
    .map_err(|e| format!("Database error: {}", e))?;

    let result = stmt
        .query_row([id], |row| {
            let exif_metadata = if row.get::<_, Option<i32>>(14)?.is_some() {
                Some(ExifMetadataDTO {
                    iso: row.get(14)?,
                    aperture: row.get(15)?,
                    shutter_speed: row.get(16)?,
                    focal_length: row.get(17)?,
                    lens: row.get(18)?,
                    camera_make: row.get(19)?,
                    camera_model: row.get(20)?,
                    gps_lat: row.get(21)?,
                    gps_lon: row.get(22)?,
                    color_space: row.get(23)?,
                })
            } else {
                None
            };

            Ok(ImageDetailDTO {
                id: row.get(0)?,
                blake3_hash: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                rating: row.get(12)?,
                flag: row.get(13)?,
                captured_at: row.get(8)?,
                imported_at: row.get(9)?,
                exif_metadata,
                folder_id: row.get(11)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(result)
}

/// Update image state (rating, flag, color_label)
#[tauri::command]
pub async fn update_image_state(
    id: u32,
    rating: Option<u8>,
    flag: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Check if image exists
    let exists: Result<i32, _> =
        db.connection()
            .query_row("SELECT 1 FROM images WHERE id = ?", [id], |row| row.get(0));

    if exists.is_err() {
        return Err("Image not found".to_string());
    }

    // Utiliser Option<T> directement — None → SQL NULL → COALESCE conserve la valeur existante
    // Évite l'insertion de la chaîne littérale "NULL" qui violerait CHECK(flag IN ('pick','reject',NULL))
    let result = db.connection().execute(
        "INSERT OR REPLACE INTO image_state (image_id, rating, flag)
         VALUES (?,
                 COALESCE(?, (SELECT rating FROM image_state WHERE image_id = ?)),
                 COALESCE(?, (SELECT flag FROM image_state WHERE image_id = ?)))",
        rusqlite::params![
            id, rating, // Option<u8>   — None → SQL NULL
            id, flag, // Option<String> — None → SQL NULL
            id
        ],
    );

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to update image state: {}", e)),
    }
}

/// Create a new collection
#[tauri::command]
pub async fn create_collection(
    name: String,
    collection_type: String,
    parent_id: Option<u32>,
    state: State<'_, AppState>,
) -> CommandResult<CollectionDTO> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Validate collection type
    if !["static", "smart", "quick"].contains(&collection_type.as_str()) {
        return Err("Invalid collection type. Must be 'static', 'smart', or 'quick'".to_string());
    }

    let result = if let Some(parent_id) = parent_id {
        db.connection().execute(
            "INSERT INTO collections (name, type, parent_id) VALUES (?, ?, ?)",
            [name, collection_type, parent_id.to_string()],
        )
    } else {
        db.connection().execute(
            "INSERT INTO collections (name, type) VALUES (?, ?)",
            [name, collection_type],
        )
    };

    match result {
        Ok(_) => {
            let id = db.connection().last_insert_rowid() as u32;
            Ok(CollectionDTO {
                id,
                name: db
                    .connection()
                    .query_row("SELECT name FROM collections WHERE id = ?", [id], |row| {
                        row.get(0)
                    })
                    .map_err(|e| format!("Failed to retrieve collection name: {}", e))?,
                collection_type: db
                    .connection()
                    .query_row("SELECT type FROM collections WHERE id = ?", [id], |row| {
                        row.get(0)
                    })
                    .map_err(|e| format!("Failed to retrieve collection type: {}", e))?,
                parent_id,
                image_count: 0, // New collection starts empty
            })
        }
        Err(e) => Err(format!("Failed to create collection: {}", e)),
    }
}

/// Add images to a collection
#[tauri::command]
pub async fn add_images_to_collection(
    collection_id: u32,
    image_ids: Vec<u32>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Verify collection exists first
    let collection_exists: Result<i32, _> = db.connection().query_row(
        "SELECT 1 FROM collections WHERE id = ?",
        [collection_id],
        |row| row.get(0),
    );

    if collection_exists.is_err() {
        return Err("Collection not found".to_string());
    }

    // Execute transaction
    db.execute_transaction(|tx| {
        for (index, image_id) in image_ids.iter().enumerate() {
            let image_exists = tx.query_row(
                "SELECT 1 FROM images WHERE id = ?",
                [image_id],
                |row| row.get::<_, i32>(0)
            );
            if image_exists.is_err() {
                return Err(DatabaseError::NotFound);
            }
            tx.execute(
                "INSERT OR IGNORE INTO collection_images (collection_id, image_id, sort_order) VALUES (?, ?, ?)",
                [collection_id, *image_id, index as u32],
            )?;
        }
        Ok(())
    }).map_err(|e| format!("Transaction failed: {}", e))?;

    Ok(())
}

/// Get all collections
#[tauri::command]
pub async fn get_collections(state: State<'_, AppState>) -> CommandResult<Vec<CollectionDTO>> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT c.id, c.name, c.type, c.parent_id, COUNT(ci.image_id) as image_count
         FROM collections c
         LEFT JOIN collection_images ci ON c.id = ci.collection_id
         GROUP BY c.id, c.name, c.type, c.parent_id
         ORDER BY c.name",
        )
        .map_err(|e| format!("Database error: {}", e))?;

    let collections_iter = stmt
        .query_map([], |row| {
            Ok(CollectionDTO {
                id: row.get(0)?,
                name: row.get(1)?,
                collection_type: row.get(2)?,
                parent_id: row.get(3)?,
                image_count: row.get::<_, i64>(4)? as u32,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut collections = Vec::new();
    for collection in collections_iter {
        collections.push(collection.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(collections)
}

/// Search images with text query
#[tauri::command]
pub async fn search_images(
    query: String,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let search_pattern = format!("%{}%", query);

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT i.id, i.blake3_hash, i.filename, i.extension,
                i.width, i.height, i.file_size_bytes, i.orientation,
                i.captured_at, i.imported_at, i.folder_id,
                ist.rating, ist.flag, ist.color_label,
                e.iso, e.aperture, e.shutter_speed, e.focal_length,
                e.lens, e.camera_make, e.camera_model
         FROM images i
         LEFT JOIN image_state ist ON i.id = ist.image_id
         LEFT JOIN exif_metadata e ON i.id = e.image_id
         WHERE i.filename LIKE ? OR i.blake3_hash LIKE ?
         ORDER BY i.imported_at DESC",
        )
        .map_err(|e| format!("Database error: {}", e))?;

    let images_iter = stmt
        .query_map([&search_pattern, &search_pattern], |row| {
            Ok(ImageDTO {
                id: row.get(0)?,
                blake3_hash: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                rating: row.get(11)?,
                flag: row.get(12)?,
                captured_at: row.get(8)?,
                imported_at: row.get(9)?,
                iso: row.get(14)?,
                aperture: row.get(15)?,
                shutter_speed: row.get(16)?,
                focal_length: row.get(17)?,
                lens: row.get(18)?,
                camera_make: row.get(19)?,
                camera_model: row.get(20)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut images = Vec::new();
    for image in images_iter {
        images.push(image.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(images)
}

/// Delete a collection and all its image associations (cascade)
#[tauri::command]
pub async fn delete_collection(
    collection_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let collection_exists: Result<i32, _> = db.connection().query_row(
        "SELECT 1 FROM collections WHERE id = ?",
        [collection_id],
        |row| row.get(0),
    );

    if collection_exists.is_err() {
        return Err("Collection not found".to_string());
    }

    db.execute_transaction(|tx| {
        // Remove associations first (FK constraint: collection_images → collections)
        tx.execute(
            "DELETE FROM collection_images WHERE collection_id = ?",
            [collection_id],
        )?;
        tx.execute("DELETE FROM collections WHERE id = ?", [collection_id])?;
        Ok(())
    })
    .map_err(|e| format!("Transaction failed: {}", e))?;

    Ok(())
}

/// Rename an existing static collection
#[tauri::command]
pub async fn rename_collection(
    collection_id: u32,
    name: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    if name.trim().is_empty() {
        return Err("Collection name cannot be empty".to_string());
    }

    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let rows_affected = db
        .connection()
        .execute(
            "UPDATE collections SET name = ? WHERE id = ?",
            rusqlite::params![name, collection_id],
        )
        .map_err(|e| format!("Database error: {}", e))?;

    if rows_affected == 0 {
        return Err("Collection not found".to_string());
    }

    Ok(())
}

/// Remove specific images from a collection (does not delete images from the catalogue)
#[tauri::command]
pub async fn remove_images_from_collection(
    collection_id: u32,
    image_ids: Vec<u32>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let collection_exists: Result<i32, _> = db.connection().query_row(
        "SELECT 1 FROM collections WHERE id = ?",
        [collection_id],
        |row| row.get(0),
    );

    if collection_exists.is_err() {
        return Err("Collection not found".to_string());
    }

    db.execute_transaction(|tx| {
        for image_id in &image_ids {
            // Idempotent: ignore if the image is not in the collection
            tx.execute(
                "DELETE FROM collection_images WHERE collection_id = ? AND image_id = ?",
                [collection_id, *image_id],
            )?;
        }
        Ok(())
    })
    .map_err(|e| format!("Transaction failed: {}", e))?;

    Ok(())
}

/// Get all images belonging to a specific collection
#[tauri::command]
pub async fn get_collection_images(
    collection_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let collection_exists: Result<i32, _> = db.connection().query_row(
        "SELECT 1 FROM collections WHERE id = ?",
        [collection_id],
        |row| row.get(0),
    );

    if collection_exists.is_err() {
        return Err("Collection not found".to_string());
    }

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT i.id, i.blake3_hash, i.filename, i.extension,
                    i.width, i.height, i.file_size_bytes, i.orientation,
                    i.captured_at, i.imported_at, i.folder_id,
                    ist.rating, ist.flag, ist.color_label,
                    e.iso, e.aperture, e.shutter_speed, e.focal_length,
                    e.lens, e.camera_make, e.camera_model
             FROM images i
             INNER JOIN collection_images ci ON i.id = ci.image_id
             LEFT JOIN image_state ist ON i.id = ist.image_id
             LEFT JOIN exif_metadata e ON i.id = e.image_id
             WHERE ci.collection_id = ?
             ORDER BY ci.sort_order ASC, i.imported_at DESC",
        )
        .map_err(|e| format!("Database error: {}", e))?;

    let images_iter = stmt
        .query_map([collection_id], |row| {
            Ok(ImageDTO {
                id: row.get(0)?,
                blake3_hash: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                rating: row.get(11)?,
                flag: row.get(12)?,
                captured_at: row.get(8)?,
                imported_at: row.get(9)?,
                iso: row.get(14)?,
                aperture: row.get(15)?,
                shutter_speed: row.get(16)?,
                focal_length: row.get(17)?,
                lens: row.get(18)?,
                camera_make: row.get(19)?,
                camera_model: row.get(20)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut images = Vec::new();
    for image in images_iter {
        images.push(image.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(images)
}

#[cfg(test)]
mod tests {
    // use super::*;
    use crate::database::Database;
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let mut db = Database::new(&db_path).unwrap();
        db.initialize().unwrap();
        db
    }

    #[test]
    fn test_get_all_images_empty_database() {
        let db = setup_test_db();

        // Test internal logic by calling the database directly
        let mut stmt = db
            .connection()
            .prepare("SELECT COUNT(*) FROM images")
            .unwrap();

        let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_create_collection_database() {
        let db = setup_test_db();

        // Test collection creation directly in database
        let result = db.connection().execute(
            "INSERT INTO collections (name, type) VALUES (?, ?)",
            ["Test Collection", "static"],
        );

        assert!(result.is_ok());

        // Verify collection exists
        let name: String = db
            .connection()
            .query_row(
                "SELECT name FROM collections WHERE name = ?",
                ["Test Collection"],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(name, "Test Collection");

        // Test collection type validation (database enforces the constraint)
        let invalid_result = db.connection().execute(
            "INSERT INTO collections (name, type) VALUES (?, ?)",
            ["Invalid Collection", "invalid_type"],
        );

        // This should fail due to CHECK constraint in the database schema
        assert!(
            invalid_result.is_err(),
            "Database should reject invalid collection types due to CHECK constraint"
        );
    }

    #[test]
    fn test_image_state_operations() {
        let db = setup_test_db();

        // First create an image
        let image_result = db.connection().execute(
            "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
            ["hash123", "test.CR3", "CR3", "2024-01-01T00:00:00Z"]
        );

        assert!(image_result.is_ok());
        let image_id = db.connection().last_insert_rowid();

        // Test image state update
        let result = db.connection().execute(
            "INSERT OR REPLACE INTO image_state (image_id, rating, flag) VALUES (?, ?, ?)",
            rusqlite::params![image_id, 5i64, "pick"],
        );

        assert!(result.is_ok());

        // Verify image state
        let rating: i32 = db
            .connection()
            .query_row(
                "SELECT rating FROM image_state WHERE image_id = ?",
                [image_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(rating, 5);
    }

    #[test]
    fn test_update_image_state_null_values() {
        let db = setup_test_db();

        // Créer une image
        db.connection().execute(
            "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
            ["hash_null_test", "null_test.RAF", "RAF", "2026-01-01T00:00:00Z"],
        ).unwrap();
        let image_id = db.connection().last_insert_rowid() as u32;

        // Insérer l'état initial (rating=3, flag='pick')
        db.connection()
            .execute(
                "INSERT INTO image_state (image_id, rating, flag) VALUES (?, ?, ?)",
                rusqlite::params![image_id, 3i32, "pick"],
            )
            .unwrap();

        // Mettre à jour avec rating=None, flag=None → doit CONSERVER les valeurs existantes
        // (et ne pas insérer la chaîne "NULL" qui violerait le CHECK constraint)
        let result = db.connection().execute(
            "INSERT OR REPLACE INTO image_state (image_id, rating, flag)
             VALUES (?,
                     COALESCE(?, (SELECT rating FROM image_state WHERE image_id = ?)),
                     COALESCE(?, (SELECT flag FROM image_state WHERE image_id = ?)))",
            rusqlite::params![
                image_id,
                Option::<u8>::None,
                image_id,
                Option::<String>::None,
                image_id
            ],
        );

        assert!(
            result.is_ok(),
            "update avec None ne doit pas échouer: {:?}",
            result
        );

        // Vérifier que les valeurs initiales sont conservées
        let (rating, flag): (i32, String) = db
            .connection()
            .query_row(
                "SELECT rating, flag FROM image_state WHERE image_id = ?",
                [image_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(rating, 3, "rating doit être conservé à 3");
        assert_eq!(flag, "pick", "flag doit être conservé à 'pick'");
    }

    #[test]
    fn test_transaction_rollback() {
        let mut db = setup_test_db();

        // Test transaction rollback on error
        let result = db.execute_transaction(|tx| {
            // Insert valid data
            tx.execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["Valid Collection", "static"]
            )?;

            // Try to insert invalid data (non-existent image in collection_images)
            tx.execute(
                "INSERT INTO collection_images (collection_id, image_id, sort_order) VALUES (?, ?, ?)",
                [999, 999, 0]  // Non-existent IDs
            )?;

            Ok(())
        });

        // This should fail due to foreign key constraint
        assert!(result.is_err());

        // Verify no data was inserted (transaction rolled back)
        let count: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM collections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    // --- Phase 3.2: Tests for delete_collection ---

    #[test]
    fn test_delete_collection_success() {
        let mut db = setup_test_db();

        // Create a collection
        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["To Delete", "static"],
            )
            .unwrap();
        let id = db.connection().last_insert_rowid() as u32;

        // Delete it
        db.execute_transaction(|tx| {
            tx.execute(
                "DELETE FROM collection_images WHERE collection_id = ?",
                [id],
            )?;
            tx.execute("DELETE FROM collections WHERE id = ?", [id])?;
            Ok(())
        })
        .unwrap();

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM collections WHERE id = ?",
                [id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "Collection should be deleted");
    }

    #[test]
    fn test_delete_collection_not_found() {
        let db = setup_test_db();
        let exists: Result<i32, _> =
            db.connection()
                .query_row("SELECT 1 FROM collections WHERE id = ?", [9999u32], |row| {
                    row.get(0)
                });
        assert!(exists.is_err(), "Collection 9999 should not exist");
    }

    #[test]
    fn test_delete_collection_cascades_images() {
        let mut db = setup_test_db();

        // Create image
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
                ["hash_del_test", "del_test.CR3", "CR3", "2026-01-01T00:00:00Z"],
            )
            .unwrap();
        let image_id = db.connection().last_insert_rowid() as u32;

        // Create collection
        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["To Delete With Images", "static"],
            )
            .unwrap();
        let col_id = db.connection().last_insert_rowid() as u32;

        // Link image to collection
        db.connection()
            .execute(
                "INSERT INTO collection_images (collection_id, image_id, sort_order) VALUES (?, ?, ?)",
                [col_id, image_id, 0u32],
            )
            .unwrap();

        let link_count_before: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM collection_images WHERE collection_id = ?",
                [col_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(link_count_before, 1);

        // Delete collection (cascade)
        db.execute_transaction(|tx| {
            tx.execute(
                "DELETE FROM collection_images WHERE collection_id = ?",
                [col_id],
            )?;
            tx.execute("DELETE FROM collections WHERE id = ?", [col_id])?;
            Ok(())
        })
        .unwrap();

        let link_count_after: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM collection_images WHERE collection_id = ?",
                [col_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            link_count_after, 0,
            "collection_images should be cleaned up"
        );

        // Image itself should still exist
        let img_count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images WHERE id = ?",
                [image_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            img_count, 1,
            "Image should not be deleted when collection is"
        );
    }

    // --- Phase 3.2: Tests for rename_collection ---

    #[test]
    fn test_rename_collection_success() {
        let db = setup_test_db();

        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["Old Name", "static"],
            )
            .unwrap();
        let id = db.connection().last_insert_rowid() as u32;

        let rows = db
            .connection()
            .execute(
                "UPDATE collections SET name = ? WHERE id = ?",
                rusqlite::params!["New Name", id],
            )
            .unwrap();
        assert_eq!(rows, 1);

        let name: String = db
            .connection()
            .query_row("SELECT name FROM collections WHERE id = ?", [id], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(name, "New Name");
    }

    #[test]
    fn test_rename_collection_not_found() {
        let db = setup_test_db();
        let rows = db
            .connection()
            .execute(
                "UPDATE collections SET name = ? WHERE id = ?",
                rusqlite::params!["New Name", 9999u32],
            )
            .unwrap();
        assert_eq!(rows, 0, "Should affect 0 rows when id does not exist");
    }

    // --- Phase 3.2: Tests for remove_images_from_collection ---

    #[test]
    fn test_remove_images_from_collection() {
        let mut db = setup_test_db();

        // Create image
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
                ["hash_remove_test", "remove_test.RAF", "RAF", "2026-01-01T00:00:00Z"],
            )
            .unwrap();
        let image_id = db.connection().last_insert_rowid() as u32;

        // Create collection
        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["Remove Test Collection", "static"],
            )
            .unwrap();
        let col_id = db.connection().last_insert_rowid() as u32;

        // Link
        db.connection()
            .execute(
                "INSERT INTO collection_images (collection_id, image_id, sort_order) VALUES (?, ?, ?)",
                [col_id, image_id, 0u32],
            )
            .unwrap();

        // Remove image from collection
        db.execute_transaction(|tx| {
            tx.execute(
                "DELETE FROM collection_images WHERE collection_id = ? AND image_id = ?",
                [col_id, image_id],
            )?;
            Ok(())
        })
        .unwrap();

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM collection_images WHERE collection_id = ? AND image_id = ?",
                [col_id, image_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "Image-collection link should be removed");

        // Image itself should still exist
        let img_count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images WHERE id = ?",
                [image_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(img_count, 1, "Image should not be deleted");
    }

    // --- Phase 3.2: Tests for get_collection_images ---

    #[test]
    fn test_get_collection_images_empty() {
        let db = setup_test_db();

        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["Empty Collection", "static"],
            )
            .unwrap();
        let col_id = db.connection().last_insert_rowid() as u32;

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images i
                 INNER JOIN collection_images ci ON i.id = ci.image_id
                 WHERE ci.collection_id = ?",
                [col_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "Empty collection should return no images");
    }

    #[test]
    fn test_get_collection_images_with_data() {
        let db = setup_test_db();

        // Create 2 images
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
                ["hash_gi_1", "img1.CR3", "CR3", "2026-01-01T00:00:00Z"],
            )
            .unwrap();
        let img1 = db.connection().last_insert_rowid() as u32;

        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
                ["hash_gi_2", "img2.RAF", "RAF", "2026-01-02T00:00:00Z"],
            )
            .unwrap();
        let img2 = db.connection().last_insert_rowid() as u32;

        // Create collection
        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                ["Test Collection GI", "static"],
            )
            .unwrap();
        let col_id = db.connection().last_insert_rowid() as u32;

        // Link both images
        db.connection()
            .execute(
                "INSERT INTO collection_images (collection_id, image_id, sort_order) VALUES (?, ?, ?)",
                [col_id, img1, 0u32],
            )
            .unwrap();
        db.connection()
            .execute(
                "INSERT INTO collection_images (collection_id, image_id, sort_order) VALUES (?, ?, ?)",
                [col_id, img2, 1u32],
            )
            .unwrap();

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images i
                 INNER JOIN collection_images ci ON i.id = ci.image_id
                 WHERE ci.collection_id = ?",
                [col_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 2, "Collection should contain 2 images");
    }
}
