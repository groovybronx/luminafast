use crate::database::Database;
use crate::database::DatabaseError;
use crate::models::dto::*;
use std::sync::{Arc, Mutex};
use tauri::State;

/// Application state containing the database connection
pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}
/// Commande Tauri pour backfill des images sans folder_id
#[tauri::command]
#[allow(dead_code)] // Called by frontend via Tauri IPC, not by unit tests
pub async fn backfill_images_folder_id(
    state: tauri::State<'_, crate::AppState>,
) -> Result<u32, String> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;
    let transaction = db_guard
        .transaction_conn()
        .transaction()
        .map_err(|e| format!("Transaction error: {}", e))?;
    let mut updated_count = 0u32;

    // Créer un service ingestion avec une connexion in_memory (utilisée uniquement pour get_or_create_folder_id)
    let ingestion_service = crate::services::ingestion::IngestionService::new(
        crate::services::blake3::Blake3Service::new(crate::models::hashing::HashConfig::default())
            .into(),
        std::sync::Arc::new(std::sync::Mutex::new(
            rusqlite::Connection::open_in_memory()
                .map_err(|e| format!("Memory DB error: {}", e))?,
        )),
    );

    // Sélectionner toutes les images sans folder_id, joinées avec ingestion_file_status pour récupérer le full file_path
    {
        let mut stmt = transaction
            .prepare(
                "SELECT i.id, ifs.file_path
             FROM images i
             LEFT JOIN ingestion_file_status ifs ON i.blake3_hash = ifs.blake3_hash
             WHERE i.folder_id IS NULL AND ifs.file_path IS NOT NULL",
            )
            .map_err(|e| format!("Prepare error: {}", e))?;

        let images_iter = stmt
            .query_map([], |row| {
                let id: u32 = row.get(0)?;
                let file_path: String = row.get(1)?;
                Ok((id, file_path))
            })
            .map_err(|e| format!("Query error: {}", e))?;

        for img_res in images_iter {
            let (id, file_path) = img_res.map_err(|e| format!("Row error: {}", e))?;
            // Appeler get_or_create_folder_id avec le full file_path (la fonction en extrait le parent)
            let folder_id_opt = ingestion_service
                .get_or_create_folder_id(&transaction, &file_path)
                .map_err(|e| format!("Folder error: {}", e))?;
            if let Some(folder_id) = folder_id_opt {
                transaction
                    .execute(
                        "UPDATE images SET folder_id = ? WHERE id = ?",
                        rusqlite::params![folder_id, id],
                    )
                    .map_err(|e| format!("Update error: {}", e))?;
                updated_count += 1;
            }
        }
    }
    transaction
        .commit()
        .map_err(|e| format!("Commit error: {}", e))?;
    Ok(updated_count)
}

/// Get all images with optional filtering
#[tauri::command]
pub async fn get_all_images(
    filter: Option<ImageFilter>,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    let mut db = state
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
    let mut db = state
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
    let mut db = state
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
    let mut db = state
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
    let mut db = state
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
    let mut db = state
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

    let mut db = state
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

// --- Phase 3.3: Smart Collections Commands ---

/// Create a new smart collection with a query
#[tauri::command]
pub async fn create_smart_collection(
    name: String,
    smart_query: String,
    parent_id: Option<u32>,
    state: State<'_, AppState>,
) -> CommandResult<CollectionDTO> {
    // Validate collection name
    if name.trim().is_empty() {
        return Err("Collection name cannot be empty".to_string());
    }

    // Validate smart_query is valid JSON
    let _parsed: serde_json::Value = serde_json::from_str(&smart_query)
        .map_err(|e| format!("Invalid smart_query JSON: {}", e))?;
    // Additionally validate that smart_query is structurally supported by the backend
    if let Err(e) = crate::services::smart_query_parser::parse_smart_query(&smart_query) {
        return Err(format!("Invalid smart_query structure: {}", e));
    }
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let result = if let Some(parent_id) = parent_id {
        db.connection().execute(
            "INSERT INTO collections (name, type, parent_id, smart_query) VALUES (?, ?, ?, ?)",
            rusqlite::params![name, "smart", parent_id, smart_query],
        )
    } else {
        db.connection().execute(
            "INSERT INTO collections (name, type, smart_query) VALUES (?, ?, ?)",
            rusqlite::params![name, "smart", smart_query],
        )
    };

    match result {
        Ok(_) => {
            let id = db.connection().last_insert_rowid() as u32;

            // Get image count for this smart collection
            let image_count = get_smart_collection_image_count(&mut db, id).unwrap_or(0);

            Ok(CollectionDTO {
                id,
                name: db
                    .connection()
                    .query_row("SELECT name FROM collections WHERE id = ?", [id], |row| {
                        row.get(0)
                    })
                    .map_err(|e| format!("Failed to retrieve collection name: {}", e))?,
                collection_type: "smart".to_string(),
                parent_id,
                image_count,
            })
        }
        Err(e) => Err(format!("Failed to create smart collection: {}", e)),
    }
}

/// Get results for a smart collection's query
#[tauri::command]
pub async fn get_smart_collection_results(
    collection_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Get the collection and verify it's smart type
    let (smart_query, col_type): (String, String) = db
        .connection()
        .query_row(
            "SELECT smart_query, type FROM collections WHERE id = ?",
            [collection_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Collection not found or has no smart_query".to_string())?;

    if col_type != "smart" {
        return Err(format!(
            "Collection {} is not a smart collection (type: {})",
            collection_id, col_type
        ));
    }

    // Parse the smart query to SQL
    let where_clause = crate::services::smart_query_parser::parse_smart_query(&smart_query)
        .map_err(|e| format!("Failed to parse smart query: {}", e))?;

    // Build the SQL query dynamically (sans alias pour compatibilité parser)
    let query_str = format!(
        "SELECT images.id, images.blake3_hash, images.filename, images.extension,
                images.width, images.height, images.file_size_bytes, images.orientation,
                images.captured_at, images.imported_at, images.folder_id,
                image_state.rating, image_state.flag, image_state.color_label,
                exif_metadata.iso, exif_metadata.aperture, exif_metadata.shutter_speed, exif_metadata.focal_length,
                exif_metadata.lens, exif_metadata.camera_make, exif_metadata.camera_model
         FROM images
         LEFT JOIN image_state ON images.id = image_state.image_id
         LEFT JOIN exif_metadata ON images.id = exif_metadata.image_id
         WHERE {}
         ORDER BY images.imported_at DESC",
        where_clause
    );

    let mut stmt = db
        .connection()
        .prepare(&query_str)
        .map_err(|e| format!("Database error: {}", e))?;

    let images_iter = stmt
        .query_map([], |row| {
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

/// Update a smart collection's query
#[tauri::command]
pub async fn update_smart_collection(
    collection_id: u32,
    smart_query: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    // Validate smart_query is valid JSON
    let _parsed: serde_json::Value = serde_json::from_str(&smart_query)
        .map_err(|e| format!("Invalid smart_query JSON: {}", e))?;

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Verify collection exists and is smart type
    let col_type: String = db
        .connection()
        .query_row(
            "SELECT type FROM collections WHERE id = ?",
            [collection_id],
            |row| row.get(0),
        )
        .map_err(|_| "Collection not found".to_string())?;

    if col_type != "smart" {
        return Err(format!(
            "Collection {} is not a smart collection (type: {})",
            collection_id, col_type
        ));
    }

    let rows_affected = db
        .connection()
        .execute(
            "UPDATE collections SET smart_query = ? WHERE id = ?",
            rusqlite::params![smart_query, collection_id],
        )
        .map_err(|e| format!("Database error: {}", e))?;

    if rows_affected == 0 {
        return Err("Collection not found".to_string());
    }

    Ok(())
}

/// Helper: Get image count for a smart collection
fn get_smart_collection_image_count(
    db: &mut crate::database::Database,
    collection_id: u32,
) -> Result<u32, String> {
    let smart_query: String = db
        .connection()
        .query_row(
            "SELECT smart_query FROM collections WHERE id = ?",
            [collection_id],
            |row| row.get(0),
        )
        .map_err(|_| "Collection not found".to_string())?;

    let where_clause = crate::services::smart_query_parser::parse_smart_query(&smart_query)
        .map_err(|e| format!("Failed to parse smart query: {}", e))?;

    let query_str = format!(
        "SELECT COUNT(*) FROM images
         LEFT JOIN image_state ON images.id = image_state.image_id
         LEFT JOIN exif_metadata ON images.id = exif_metadata.image_id
         WHERE {}",
        where_clause
    );

    let count: i64 = db
        .connection()
        .query_row(&query_str, [], |row| row.get(0))
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(count as u32)
}

/// Get folder tree hierarchy with image counts
#[tauri::command]
pub async fn get_folder_tree(state: State<'_, AppState>) -> CommandResult<Vec<FolderTreeNode>> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Fetch all folders with their direct image counts
    let mut stmt = db
        .connection()
        .prepare(
            "SELECT f.id, f.name, f.path, f.volume_name, f.is_online,
                    COALESCE((SELECT COUNT(*) FROM images WHERE folder_id = f.id), 0) as image_count
             FROM folders f
             ORDER BY f.path",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let folder_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, u32>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, bool>(4)?,
                row.get::<_, u32>(5)?,
            ))
        })
        .map_err(|e| format!("Failed to query folders: {}", e))?;

    let mut folders: Vec<(u32, String, String, String, bool, u32)> = Vec::new();
    for row in folder_rows {
        folders.push(row.map_err(|e| format!("Failed to read row: {}", e))?);
    }

    // Build a map of folders by their paths
    let mut folder_map: std::collections::HashMap<String, FolderTreeNode> =
        std::collections::HashMap::new();

    for (id, name, path, volume_name, is_online, image_count) in folders.iter() {
        folder_map.insert(
            path.clone(),
            FolderTreeNode {
                id: *id,
                name: name.clone(),
                path: path.clone(),
                volume_name: volume_name.clone(),
                is_online: *is_online,
                image_count: *image_count,
                total_image_count: *image_count,
                children: Vec::new(),
            },
        );
    }

    // Build tree hierarchy - process from deepest paths to root
    let mut sorted_paths: Vec<String> = folder_map.keys().cloned().collect();
    sorted_paths.sort_by_key(|p| std::cmp::Reverse(p.len()));

    for path in sorted_paths {
        let parent_path = std::path::Path::new(&path)
            .parent()
            .and_then(|p| p.to_str())
            .map(|s| s.to_string());

        if let Some(p_path) = parent_path {
            if folder_map.contains_key(&p_path) && p_path != path {
                if let Some(node) = folder_map.remove(&path) {
                    if let Some(parent) = folder_map.get_mut(&p_path) {
                        parent.total_image_count += node.total_image_count;
                        parent.children.push(node);
                    } else {
                        folder_map.insert(path, node);
                    }
                }
            }
        }
    }

    let mut root_folders: Vec<FolderTreeNode> = folder_map.into_values().collect();
    root_folders.sort_by(|a, b| a.path.cmp(&b.path));

    // Calculate total counts recursively
    fn calculate_total_counts(node: &mut FolderTreeNode) {
        let mut total = node.image_count;
        for child in &mut node.children {
            calculate_total_counts(child);
            total += child.total_image_count;
        }
        node.total_image_count = total;
    }

    for node in &mut root_folders {
        calculate_total_counts(node);
    }

    // Filter out empty folders
    fn filter_empty_folders(nodes: Vec<FolderTreeNode>) -> Vec<FolderTreeNode> {
        nodes
            .into_iter()
            .filter_map(|mut node| {
                node.children = filter_empty_folders(node.children);
                if node.total_image_count > 0 {
                    Some(node)
                } else {
                    None
                }
            })
            .collect()
    }

    let result = filter_empty_folders(root_folders);
    Ok(result)
}

/// Get images from a specific folder
#[tauri::command]
pub async fn get_folder_images(
    folder_id: u32,
    recursive: bool,
    state: State<'_, AppState>,
) -> CommandResult<Vec<ImageDTO>> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let folder_path = if recursive {
        let path: String = db
            .connection()
            .query_row(
                "SELECT path FROM folders WHERE id = ?",
                [folder_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Folder not found: {}", e))?;
        Some(path)
    } else {
        None
    };

    let query = if folder_path.is_some() {
        "SELECT i.id, i.blake3_hash, i.filename, i.extension, i.width, i.height,
                s.rating, s.flag, i.captured_at, i.imported_at,
                e.iso, e.aperture, e.shutter_speed, e.focal_length, e.lens,
                e.camera_make, e.camera_model
         FROM images i
         LEFT JOIN image_state s ON i.id = s.image_id
         LEFT JOIN exif_metadata e ON i.id = e.image_id
         INNER JOIN folders f ON i.folder_id = f.id
         WHERE f.path = ? OR f.path LIKE ?
         ORDER BY i.filename"
    } else {
        "SELECT i.id, i.blake3_hash, i.filename, i.extension, i.width, i.height,
                s.rating, s.flag, i.captured_at, i.imported_at,
                e.iso, e.aperture, e.shutter_speed, e.focal_length, e.lens,
                e.camera_make, e.camera_model
         FROM images i
         LEFT JOIN image_state s ON i.id = s.image_id
         LEFT JOIN exif_metadata e ON i.id = e.image_id
         WHERE i.folder_id = ?
         ORDER BY i.filename"
    };

    let mut stmt = db
        .connection()
        .prepare(query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    // Helper closure to map row to ImageDTO
    fn map_image_row(row: &rusqlite::Row) -> rusqlite::Result<ImageDTO> {
        Ok(ImageDTO {
            id: row.get(0)?,
            blake3_hash: row.get(1)?,
            filename: row.get(2)?,
            extension: row.get(3)?,
            width: row.get(4)?,
            height: row.get(5)?,
            rating: row.get(6)?,
            flag: row.get(7)?,
            captured_at: row.get(8)?,
            imported_at: row.get(9)?,
            iso: row.get(10)?,
            aperture: row.get(11)?,
            shutter_speed: row.get(12)?,
            focal_length: row.get(13)?,
            lens: row.get(14)?,
            camera_make: row.get(15)?,
            camera_model: row.get(16)?,
        })
    }

    let image_iter = if let Some(path) = folder_path {
        // Proper boundary check: match exact path OR descendants with '/' separator
        // This prevents matching /Root2 when searching for /Root
        let path_exact = path.clone();
        let path_descendants = format!("{}/% ", path.trim_end_matches('/'));
        stmt.query_map(
            rusqlite::params![path_exact, path_descendants],
            map_image_row,
        )
        .map_err(|e| format!("Failed to query images: {}", e))?
    } else {
        stmt.query_map(rusqlite::params![folder_id], map_image_row)
            .map_err(|e| format!("Failed to query images: {}", e))?
    };

    let mut images = Vec::new();
    for image_result in image_iter {
        images.push(image_result.map_err(|e| format!("Failed to read image: {}", e))?);
    }

    Ok(images)
}

/// Update the online status of a volume
#[tauri::command]
pub async fn update_volume_status(
    volume_name: String,
    is_online: bool,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    db.connection()
        .execute(
            "UPDATE folders SET is_online = ? WHERE volume_name = ?",
            rusqlite::params![is_online, volume_name],
        )
        .map_err(|e| format!("Failed to update volume status: {}", e))?;

    Ok(())
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
    fn test_update_image_state_null_values() {
        let mut db = setup_test_db();

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
        let mut db = setup_test_db();
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
        let mut db = setup_test_db();

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
        let mut db = setup_test_db();
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
        let mut db = setup_test_db();

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
        let mut db = setup_test_db();

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

    // --- Phase 3.3: Tests for Smart Collections ---

    #[test]
    fn test_create_smart_collection_success() {
        let mut db = setup_test_db();

        // Create some test images with EXIF data
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
                ["hash_sc_1", "img1.CR3", "CR3", "2026-01-01T00:00:00Z"],
            )
            .unwrap();
        let img1 = db.connection().last_insert_rowid() as u32;

        // Add EXIF data
        db.connection()
            .execute(
                "INSERT INTO exif_metadata (image_id, iso, aperture, focal_length) VALUES (?, ?, ?, ?)",
                rusqlite::params![img1, 3200, 2.8, 50.0],
            )
            .unwrap();

        // Add image state with high rating
        db.connection()
            .execute(
                "INSERT INTO image_state (image_id, rating) VALUES (?, ?)",
                [img1, 5],
            )
            .unwrap();

        // Create smart collection query
        let query = r#"{"rules":[{"field":"rating","operator":">=","value":4},{"field":"iso","operator":">","value":1600}],"combinator":"AND"}"#;

        let result = db.connection().execute(
            "INSERT INTO collections (name, type, smart_query) VALUES (?, ?, ?)",
            rusqlite::params!["High ISO Quality Photos", "smart", query],
        );

        assert!(result.is_ok());
        let collection_id = db.connection().last_insert_rowid() as u32;

        // Verify collection was created
        let (name, col_type, stored_query): (String, String, String) = db
            .connection()
            .query_row(
                "SELECT name, type, smart_query FROM collections WHERE id = ?",
                [collection_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();

        assert_eq!(name, "High ISO Quality Photos");
        assert_eq!(col_type, "smart");
        assert_eq!(stored_query, query);
    }

    #[test]
    fn test_create_smart_collection_invalid_json() {
        let mut db = setup_test_db();
        let invalid_query = "{ invalid json }";

        let result = db.connection().execute(
            "INSERT INTO collections (name, type, smart_query) VALUES (?, ?, ?)",
            rusqlite::params!["Invalid Collection", "smart", invalid_query],
        );

        // SQLite doesn't validate JSON automatically, so this would succeed
        // The validation happens in the Tauri command handler
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_smart_collection_results_filters_correctly() {
        let mut db = setup_test_db();

        // Create multiple test images with different ratings and ISO
        for i in 1..=5 {
            let hash = format!("hash_smart_{}", i);
            db.connection()
                .execute(
                    "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, ?, ?)",
                    rusqlite::params![hash, format!("img{}.CR3", i), "CR3", "2026-01-01T00:00:00Z"],
                )
                .unwrap();
            let img_id = db.connection().last_insert_rowid() as u32;

            // Add EXIF: alternating ISO values
            let iso = if i % 2 == 0 { 3200 } else { 400 };
            db.connection()
                .execute(
                    "INSERT INTO exif_metadata (image_id, iso) VALUES (?, ?)",
                    rusqlite::params![img_id, iso],
                )
                .unwrap();

            // Add image state: alternating ratings
            let rating = if i % 2 == 0 { 5 } else { 2 };
            db.connection()
                .execute(
                    "INSERT INTO image_state (image_id, rating) VALUES (?, ?)",
                    rusqlite::params![img_id, rating],
                )
                .unwrap();
        }

        // Create smart collection: Rating >= 4 AND ISO > 1600
        let query = r#"{"rules":[{"field":"rating","operator":">=","value":4},{"field":"iso","operator":">","value":1600}],"combinator":"AND"}"#;

        db.connection()
            .execute(
                "INSERT INTO collections (name, type, smart_query) VALUES (?, ?, ?)",
                rusqlite::params!["Test Smart Collection", "smart", query],
            )
            .unwrap();
        let _col_id = db.connection().last_insert_rowid() as u32;

        // Execute query through parser
        let where_clause = crate::services::smart_query_parser::parse_smart_query(query).unwrap();
        let sql = format!(
            "SELECT COUNT(*) FROM images
             LEFT JOIN image_state ON images.id = image_state.image_id
             LEFT JOIN exif_metadata ON images.id = exif_metadata.image_id
             WHERE {}",
            where_clause
        );

        let count: i64 = db
            .connection()
            .query_row(&sql, [], |row| row.get(0))
            .unwrap();

        // Should match images 2, 4 (rating >= 4 AND iso > 1600)
        assert_eq!(count, 2, "Should find 2 images matching the criteria");
    }

    #[test]
    fn test_get_smart_collection_results_wrong_type() {
        let mut db = setup_test_db();

        // Create a STATIC collection (not smart)
        db.connection()
            .execute(
                "INSERT INTO collections (name, type) VALUES (?, ?)",
                rusqlite::params!["Static Collection", "static"],
            )
            .unwrap();
        let col_id = db.connection().last_insert_rowid() as u32;

        // Try to get results as if it was a smart collection
        let col_type: String = db
            .connection()
            .query_row(
                "SELECT type FROM collections WHERE id = ?",
                [col_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(col_type, "static");
    }

    #[test]
    fn test_update_smart_collection_success() {
        let mut db = setup_test_db();

        // Create initial smart collection
        let initial_query =
            r#"{"rules":[{"field":"rating","operator":">=","value":3}],"combinator":"AND"}"#;
        db.connection()
            .execute(
                "INSERT INTO collections (name, type, smart_query) VALUES (?, ?, ?)",
                rusqlite::params!["Test Collection", "smart", initial_query],
            )
            .unwrap();
        let col_id = db.connection().last_insert_rowid() as u32;

        // Update the query
        let new_query =
            r#"{"rules":[{"field":"rating","operator":">=","value":5}],"combinator":"AND"}"#;
        let result = db.connection().execute(
            "UPDATE collections SET smart_query = ? WHERE id = ?",
            rusqlite::params![new_query, col_id],
        );

        assert!(result.is_ok());

        // Verify the update
        let stored_query: String = db
            .connection()
            .query_row(
                "SELECT smart_query FROM collections WHERE id = ?",
                [col_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(stored_query, new_query);
    }

    #[test]
    fn test_smart_query_parser_or_combinator() {
        let query = r#"{"rules":[{"field":"rating","operator":"=","value":5},{"field":"iso","operator":">","value":3200}],"combinator":"OR"}"#;
        let result = crate::services::smart_query_parser::parse_smart_query(query);
        assert!(result.is_ok());
        let sql = result.unwrap();
        assert!(sql.contains(" OR "));
        assert!(sql.contains("image_state.rating = 5"));
        assert!(sql.contains("exif_metadata.iso > 3200"));
    }

    #[test]
    fn test_smart_query_parser_aperture() {
        let query =
            r#"{"rules":[{"field":"aperture","operator":"<=","value":2.8}],"combinator":"AND"}"#;
        let result = crate::services::smart_query_parser::parse_smart_query(query);
        assert!(result.is_ok());
        let sql = result.unwrap();
        assert!(sql.contains("exif_metadata.aperture <= 2.8"));
    }

    #[test]
    fn test_smart_query_parser_focal_length() {
        let query =
            r#"{"rules":[{"field":"focal_length","operator":">=","value":50}],"combinator":"AND"}"#;
        let result = crate::services::smart_query_parser::parse_smart_query(query);
        assert!(result.is_ok());
        let sql = result.unwrap();
        assert!(sql.contains("exif_metadata.focal_length >= 50"));
    }

    #[test]
    fn test_smart_query_parser_camera_model_contains() {
        let query = r#"{"rules":[{"field":"camera_model","operator":"contains","value":"EOS"}],"combinator":"AND"}"#;
        let result = crate::services::smart_query_parser::parse_smart_query(query);
        assert!(result.is_ok());
        let sql = result.unwrap();
        assert!(sql.contains("exif_metadata.camera_model LIKE '%EOS%'"));
    }

    #[test]
    fn test_update_volume_status_online() {
        let mut db = setup_test_db();

        // Créer un dossier avec un volume
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["TestFolder", "/test/path", "WORK_SSD", false],
            )
            .unwrap();

        // Mettre à jour le statut à online
        db.connection()
            .execute(
                "UPDATE folders SET is_online = ? WHERE volume_name = ?",
                rusqlite::params![true, "WORK_SSD"],
            )
            .unwrap();

        // Vérifier le statut
        let is_online: bool = db
            .connection()
            .query_row(
                "SELECT is_online FROM folders WHERE volume_name = ?",
                ["WORK_SSD"],
                |row| row.get(0),
            )
            .unwrap();

        assert!(is_online);
    }

    #[test]
    fn test_update_volume_status_offline() {
        let mut db = setup_test_db();

        // Créer un dossier avec un volume online
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["TestFolder", "/test/path", "WORK_SSD", true],
            )
            .unwrap();

        // Mettre à jour le statut à offline
        db.connection()
            .execute(
                "UPDATE folders SET is_online = ? WHERE volume_name = ?",
                rusqlite::params![false, "WORK_SSD"],
            )
            .unwrap();

        // Vérifier le statut
        let is_online: bool = db
            .connection()
            .query_row(
                "SELECT is_online FROM folders WHERE volume_name = ?",
                ["WORK_SSD"],
                |row| row.get(0),
            )
            .unwrap();

        assert!(!is_online);
    }

    #[test]
    fn test_get_folder_tree_empty() {
        let mut db = setup_test_db();

        // Vérifier qu'il n'y a pas de dossiers
        let mut stmt = db
            .connection()
            .prepare("SELECT COUNT(*) FROM folders")
            .unwrap();

        let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_get_folder_tree_with_images() {
        let mut db = setup_test_db();

        // Créer un dossier
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Photos2024", "/volumes/SSD/Photos2024", "SSD_PRIMARY", true],
            )
            .unwrap();
        let folder_id = db.connection().last_insert_rowid();

        // Créer des images dans ce dossier
        for i in 0..5 {
            db.connection()
                .execute(
                    "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, ?)",
                    rusqlite::params![
                        format!("hash_{}", i),
                        format!("IMG_{:04}.CR3", i),
                        "CR3",
                        "2024-01-01T00:00:00Z",
                        folder_id
                    ],
                )
                .unwrap();
        }

        // Vérifier le comptage d'images
        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images WHERE folder_id = ?",
                [folder_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 5);
    }

    #[test]
    fn test_get_folder_images_direct() {
        let mut db = setup_test_db();

        // Créer un dossier parent et un sous-dossier
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Parent", "/volumes/SSD/Parent", "SSD", true],
            )
            .unwrap();
        let parent_folder_id = db.connection().last_insert_rowid();

        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Child", "/volumes/SSD/Parent/Child", "SSD", true],
            )
            .unwrap();
        let child_folder_id = db.connection().last_insert_rowid();

        // Images dans le parent
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params!["hash_parent", "parent.CR3", "CR3", "2024-01-01T00:00:00Z", parent_folder_id],
            )
            .unwrap();

        // Images dans le child
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params!["hash_child", "child.CR3", "CR3", "2024-01-01T00:00:00Z", child_folder_id],
            )
            .unwrap();

        // Récupérer uniquement les images directes du parent
        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images WHERE folder_id = ?",
                [parent_folder_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 1);
    }

    #[test]
    fn test_get_folder_images_recursive() {
        let mut db = setup_test_db();

        // Créer une hiérarchie de dossiers
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Root", "/volumes/SSD/Root", "SSD", true],
            )
            .unwrap();
        let root_id = db.connection().last_insert_rowid();

        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Sub", "/volumes/SSD/Root/Sub", "SSD", true],
            )
            .unwrap();
        let sub_id = db.connection().last_insert_rowid();

        // Images dans root et sub
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params!["hash_root", "root.RAF", "RAF", "2024-01-01T00:00:00Z", root_id],
            )
            .unwrap();

        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params!["hash_sub", "sub.RAF", "RAF", "2024-01-01T00:00:00Z", sub_id],
            )
            .unwrap();

        // Test récursif : récupérer toutes les images commençant par le path Root
        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images i
                 INNER JOIN folders f ON i.folder_id = f.id
                 WHERE f.path LIKE '/volumes/SSD/Root%'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 2);
    }

    #[test]
    fn test_backfill_images_folder_id_success() {
        let mut db = setup_test_db();

        // Créer un dossier
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Photos", "/volumes/SSD/Photos", "SSD", true],
            )
            .unwrap();
        let folder_id = db.connection().last_insert_rowid();

        // Créer une image sans folder_id
        let hash = "hash_backfill_test_1";
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, NULL)",
                rusqlite::params![hash, "test1.CR3", "CR3", "2024-01-01T00:00:00Z"],
            )
            .unwrap();
        let image_id = db.connection().last_insert_rowid() as u32;

        // Créer un ingestion_file_status avec le full file_path
        db.connection()
            .execute(
                "INSERT INTO ingestion_sessions (id, status) VALUES (?, ?)",
                rusqlite::params!["session_backfill", "completed"],
            )
            .unwrap();

        db.connection()
            .execute(
                "INSERT INTO ingestion_file_status (session_id, file_path, blake3_hash, status) VALUES (?, ?, ?, ?)",
                rusqlite::params!["session_backfill", "/volumes/SSD/Photos/test1.CR3", hash, "ingested"],
            )
            .unwrap();

        // Simuler le backfill: SELECT avec LEFT JOIN (scoped statement)
        let mut count = 0;
        {
            let mut stmt = db
                .connection()
                .prepare(
                    "SELECT i.id, ifs.file_path
                     FROM images i
                     LEFT JOIN ingestion_file_status ifs ON i.blake3_hash = ifs.blake3_hash
                     WHERE i.folder_id IS NULL AND ifs.file_path IS NOT NULL",
                )
                .unwrap();

            let images_iter = stmt
                .query_map([], |row| {
                    let id: u32 = row.get(0)?;
                    let file_path: String = row.get(1)?;
                    Ok((id, file_path))
                })
                .unwrap();

            for img_res in images_iter {
                let (id, _file_path) = img_res.unwrap();
                // Vérifier que nous trouvons l'image correctement
                assert_eq!(id, image_id);
                count += 1;
            }
        } // Statement scoped et dropped ici

        assert_eq!(count, 1, "Should find exactly 1 image without folder_id");

        // Simuler l'UPDATE
        db.connection()
            .execute(
                "UPDATE images SET folder_id = ? WHERE id = ?",
                rusqlite::params![folder_id, image_id],
            )
            .unwrap();

        // Vérifier que l'UPDATE a fonctionné
        let updated_folder_id: i64 = db
            .connection()
            .query_row(
                "SELECT folder_id FROM images WHERE id = ?",
                [image_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(
            updated_folder_id, folder_id,
            "Image should now have a folder_id"
        );
    }

    #[test]
    fn test_backfill_images_folder_id_empty() {
        let mut db = setup_test_db();

        // Créer une image AVEC folder_id (donc pas candidat pour backfill)
        db.connection()
            .execute(
                "INSERT INTO folders (name, path, volume_name, is_online) VALUES (?, ?, ?, ?)",
                rusqlite::params!["Photos", "/volumes/SSD/Photos", "SSD", true],
            )
            .unwrap();
        let folder_id = db.connection().last_insert_rowid();

        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at, folder_id) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params!["hash_filled", "already_filled.CR3", "CR3", "2024-01-01T00:00:00Z", folder_id],
            )
            .unwrap();

        // Vérifier qu'il n'y a PAS d'images sans folder_id
        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM images WHERE folder_id IS NULL",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 0, "Should have no images without folder_id");

        // Simuler le backfill query : doit retourner 0 images
        let mut stmt = db
            .connection()
            .prepare(
                "SELECT i.id, ifs.file_path
                 FROM images i
                 LEFT JOIN ingestion_file_status ifs ON i.blake3_hash = ifs.blake3_hash
                 WHERE i.folder_id IS NULL AND ifs.file_path IS NOT NULL",
            )
            .unwrap();

        let backfill_count = stmt
            .query_map([], |row| {
                let id: u32 = row.get(0)?;
                let file_path: String = row.get(1)?;
                Ok((id, file_path))
            })
            .unwrap()
            .count();

        assert_eq!(
            backfill_count, 0,
            "Backfill should find no images to process"
        );
    }
}
