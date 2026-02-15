use crate::database::Database;
use crate::database::DatabaseError;
use crate::error::{AppError, AppResult};
use crate::models::dto::*;
use log::{error, debug};
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
    match get_all_images_impl(filter, &state) {
        Ok(images) => Ok(images),
        Err(e) => {
            error!("Failed to get all images: {}", e);
            Err(e.into())
        }
    }
}

fn get_all_images_impl(
    filter: Option<ImageFilter>,
    state: &State<'_, AppState>,
) -> AppResult<Vec<ImageDTO>> {
    let db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

    let mut query = String::from(
        "SELECT i.id, i.blake3_hash, i.filename, i.extension, 
                i.width, i.height, i.file_size_bytes, i.orientation,
                i.captured_at, i.imported_at, i.folder_id,
                image_state.rating, image_state.flag, image_state.color_label
         FROM images i
         LEFT JOIN image_state image_state ON i.id = image_state.image_id",
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
        .map_err(|e| AppError::Database(format!("Failed to prepare query: {}", e)))?;

    let images_iter = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(ImageDTO {
                id: row.get(0)?,
                blake3_hash: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                rating: row.get(9)?,
                flag: row.get(10)?,
                captured_at: row.get(8)?,
                imported_at: row.get(9)?,
            })
        })
        .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

    let mut images = Vec::new();
    for image in images_iter {
        images.push(image.map_err(|e| AppError::Database(format!("Row error: {}", e)))?);
    }

    debug!("Retrieved {} images", images.len());
    Ok(images)
}

/// Get detailed information for a single image
#[tauri::command]
pub async fn get_image_detail(
    id: u32,
    state: State<'_, AppState>,
) -> CommandResult<ImageDetailDTO> {
    match get_image_detail_impl(id, &state) {
        Ok(detail) => Ok(detail),
        Err(e) => {
            error!("Failed to get image detail for id {}: {}", id, e);
            Err(e.into())
        }
    }
}

fn get_image_detail_impl(
    id: u32,
    state: &State<'_, AppState>,
) -> AppResult<ImageDetailDTO> {
    let db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

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
    .map_err(|e| AppError::Database(format!("Failed to prepare query: {}", e)))?;

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
        .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

    debug!("Retrieved image detail for id {}", id);
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
    match update_image_state_impl(id, rating, flag, &state) {
        Ok(()) => Ok(()),
        Err(e) => {
            error!("Failed to update image state for id {}: {}", id, e);
            Err(e.into())
        }
    }
}

fn update_image_state_impl(
    id: u32,
    rating: Option<u8>,
    flag: Option<String>,
    state: &State<'_, AppState>,
) -> AppResult<()> {
    let db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

    // Check if image exists
    let exists: Result<i32, _> =
        db.connection()
            .query_row("SELECT 1 FROM images WHERE id = ?", [id], |row| row.get(0));

    if exists.is_err() {
        return Err(AppError::Database(format!("Image with id {} not found", id)));
    }

    // Update or insert image_state
    db.connection().execute(
        "INSERT OR REPLACE INTO image_state (image_id, rating, flag)
         VALUES (?, COALESCE(?, (SELECT rating FROM image_state WHERE image_id = ?)), 
                 COALESCE(?, (SELECT flag FROM image_state WHERE image_id = ?)))",
        rusqlite::params![
            id,
            rating.unwrap_or(0),
            id,
            flag.as_deref().unwrap_or("NULL"),
            id
        ],
    )
    .map_err(|e| AppError::Database(format!("Failed to update image state: {}", e)))?;

    debug!("Updated image state for id {}", id);
    Ok(())
}

/// Create a new collection
#[tauri::command]
pub async fn create_collection(
    name: String,
    collectionType: String,
    parent_id: Option<u32>,
    state: State<'_, AppState>,
) -> CommandResult<CollectionDTO> {
    match create_collection_impl(name, collectionType, parent_id, &state) {
        Ok(collection) => Ok(collection),
        Err(e) => {
            error!("Failed to create collection: {}", e);
            Err(e.into())
        }
    }
}

fn create_collection_impl(
    name: String,
    collectionType: String,
    parent_id: Option<u32>,
    state: &State<'_, AppState>,
) -> AppResult<CollectionDTO> {
    let db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

    // Validate collection type
    if !["static", "smart", "quick"].contains(&collectionType.as_str()) {
        return Err(AppError::InvalidInput(
            "Invalid collection type. Must be 'static', 'smart', or 'quick'".to_string()
        ));
    }

    let result = if let Some(parent_id) = parent_id {
        db.connection().execute(
            "INSERT INTO collections (name, type, parent_id) VALUES (?, ?, ?)",
            [name.clone(), collectionType.clone(), parent_id.to_string()],
        )
    } else {
        db.connection().execute(
            "INSERT INTO collections (name, type) VALUES (?, ?)",
            [name.clone(), collectionType.clone()],
        )
    };

    result.map_err(|e| AppError::Database(format!("Failed to create collection: {}", e)))?;

    let id = db.connection().last_insert_rowid() as u32;
    let collection = CollectionDTO {
        id,
        name: db
            .connection()
            .query_row("SELECT name FROM collections WHERE id = ?", [id], |row| {
                row.get(0)
            })
            .map_err(|e| AppError::Database(format!("Failed to retrieve collection name: {}", e)))?,
        collection_type: db
            .connection()
            .query_row("SELECT type FROM collections WHERE id = ?", [id], |row| {
                row.get(0)
            })
            .map_err(|e| AppError::Database(format!("Failed to retrieve collection type: {}", e)))?,
        parent_id,
        image_count: 0, // New collection starts empty
    };

    debug!("Created collection with id {}", id);
    Ok(collection)
}

/// Add images to a collection
#[tauri::command]
pub async fn add_images_to_collection(
    collectionId: u32,
    imageIds: Vec<u32>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    match add_images_to_collection_impl(collectionId, imageIds, &state) {
        Ok(()) => Ok(()),
        Err(e) => {
            error!("Failed to add images to collection {}: {}", collectionId, e);
            Err(e.into())
        }
    }
}

fn add_images_to_collection_impl(
    collectionId: u32,
    imageIds: Vec<u32>,
    state: &State<'_, AppState>,
) -> AppResult<()> {
    let mut db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

    // Verify collection exists first
    let collection_exists: Result<i32, _> = db.connection().query_row(
        "SELECT 1 FROM collections WHERE id = ?",
        [collectionId],
        |row| row.get(0),
    );

    if collection_exists.is_err() {
        return Err(AppError::Database(format!("Collection with id {} not found", collectionId)));
    }

    // Execute transaction
    db.execute_transaction(|tx| {
        for (index, image_id) in imageIds.iter().enumerate() {
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
                [collectionId, *image_id, index as u32],
            )?;
        }
        Ok(())
    }).map_err(|e| AppError::Database(format!("Transaction failed: {}", e)))?;

    debug!("Added {} images to collection {}", imageIds.len(), collectionId);
    Ok(())
}

/// Get all collections
#[tauri::command]
pub async fn get_collections(state: State<'_, AppState>) -> CommandResult<Vec<CollectionDTO>> {
    match get_collections_impl(&state) {
        Ok(collections) => Ok(collections),
        Err(e) => {
            error!("Failed to get collections: {}", e);
            Err(e.into())
        }
    }
}

fn get_collections_impl(
    state: &State<'_, AppState>,
) -> AppResult<Vec<CollectionDTO>> {
    let db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT c.id, c.name, c.type, c.parent_id, COUNT(ci.image_id) as image_count
         FROM collections c
         LEFT JOIN collection_images ci ON c.id = ci.collection_id
         GROUP BY c.id, c.name, c.type, c.parent_id
         ORDER BY c.name",
        )
        .map_err(|e| AppError::Database(format!("Failed to prepare query: {}", e)))?;

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
        .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

    let mut collections = Vec::new();
    for collection in collections_iter {
        collections.push(collection.map_err(|e| AppError::Database(format!("Row error: {}", e)))?);
    }

    debug!("Retrieved {} collections", collections.len());
    Ok(collections)
}

/// Search images with text query
#[tauri::command]
pub async fn search_images(
    query: String,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    match search_images_impl(&query, &state) {
        Ok(images) => Ok(images),
        Err(e) => {
            error!("Failed to search images with query '{}': {}", query, e);
            Err(e.into())
        }
    }
}

fn search_images_impl(
    query: &str,
    state: &State<'_, AppState>,
) -> AppResult<Vec<ImageDTO>> {
    let db = state.db.lock()
        .map_err(|e| AppError::Internal(format!("Database lock poisoned: {}", e)))?;

    let search_pattern = format!("%{}%", query);

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT i.id, i.blake3_hash, i.filename, i.extension, 
                i.width, i.height, i.file_size_bytes, i.orientation,
                i.captured_at, i.imported_at, i.folder_id,
                image_state.rating, image_state.flag, image_state.color_label
         FROM images i
         LEFT JOIN image_state image_state ON i.id = image_state.image_id
         WHERE i.filename LIKE ? OR i.blake3_hash LIKE ?
         ORDER BY i.imported_at DESC",
        )
        .map_err(|e| AppError::Database(format!("Failed to prepare query: {}", e)))?;

    let images_iter = stmt
        .query_map([&search_pattern, &search_pattern], |row| {
            Ok(ImageDTO {
                id: row.get(0)?,
                blake3_hash: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                rating: row.get(9)?,
                flag: row.get(10)?,
                captured_at: row.get(8)?,
                imported_at: row.get(9)?,
            })
        })
        .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

    let mut images = Vec::new();
    for image in images_iter {
        images.push(image.map_err(|e| AppError::Database(format!("Row error: {}", e)))?);
    }

    debug!("Found {} images matching query '{}'", images.len(), query);
    Ok(images)
}

#[cfg(test)]
mod tests {
    use super::*;
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
        let mut db = setup_test_db();

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
        let mut db = setup_test_db();

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
        let mut db = setup_test_db();

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
}
