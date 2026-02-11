use crate::database::{DatabasePool, DatabaseError, DatabaseResult};
use crate::models::*;
use rusqlite::params;
use serde_json::Value;
use std::path::PathBuf;
use tauri::State;
use chrono::{DateTime, Utc};

/// Application state containing the database connection pool
pub struct AppState {
    pub db: DatabasePool,
}

/// Initialize the database
#[tauri::command]
pub async fn init_database(state: State<'_, AppState>) -> DatabaseResult<()> {
    state.db.initialize()
}

/// Get all images with optional pagination
#[tauri::command]
pub async fn get_images(
    page: Option<u32>,
    per_page: Option<u32>,
    state: State<'_, AppState>,
) -> SerializableResult<Vec<Image>> {
    let mut db = state.db.lock().unwrap();
    let result = get_images_internal(&mut db, page, per_page);
    SerializableResult::from(result)
}

/// Internal implementation for get_images
fn get_images_internal(
    db: &mut Database,
    page: Option<u32>,
    per_page: Option<u32>,
) -> DatabaseResult<Vec<Image>> {
    
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(100).min(1000); // Limit to 1000 max
    let offset = page * per_page;
    
    let mut stmt = db.connection().prepare(
        "SELECT id, filename, filepath, file_hash, file_size, 
                captured_at, created_at, updated_at, exif_data,
                rating, flag, color_label, edit_data, edit_version,
                is_synced, sync_revision
         FROM images 
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?"
    ).map_err(|e| e.to_string())?;
    
    let images_iter = stmt.query_map([per_page, offset], |row| {
        let exif_data: Option<String> = row.get(8)?;
        let edit_data: Option<String> = row.get(11)?;
        let flag: Option<String> = row.get(9)?;
        let color_label: Option<String> = row.get(10)?;
        
        Ok(Image {
            id: Some(row.get(0)?),
            filename: row.get(1)?,
            filepath: row.get(2)?,
            file_hash: row.get(3)?,
            file_size: row.get(4)?,
            captured_at: row.get::<_, Option<String>>(5)?
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                .unwrap()
                .with_timezone(&Utc),
            exif_data: exif_data.and_then(|s| serde_json::from_str(&s).ok()),
            rating: row.get(8)?,
            flag: flag.and_then(|f| match f.as_str() {
                "pick" => Some(ImageFlag::Pick),
                "reject" => Some(ImageFlag::Reject),
                _ => None,
            }),
            color_label: color_label.and_then(|c| match c.as_str() {
                "red" => Some(ColorLabel::Red),
                "yellow" => Some(ColorLabel::Yellow),
                "green" => Some(ColorLabel::Green),
                "blue" => Some(ColorLabel::Blue),
                "purple" => Some(ColorLabel::Purple),
                _ => None,
            }),
            edit_data: edit_data.and_then(|s| serde_json::from_str(&s).ok()),
            edit_version: row.get(12)?,
            is_synced: row.get(13)?,
            sync_revision: row.get(14)?,
        })
    })?;
    
    let mut images = Vec::new();
    for image in images_iter {
        images.push(image?);
    }
    
    Ok(images)
}

/// Get a single image by ID
#[tauri::command]
pub async fn get_image(id: i64, state: State<'_, AppState>) -> SerializableResult<Image> {
    let mut db = state.db.lock().unwrap();
    let result = get_image_internal(&mut db, id);
    SerializableResult::from(result)
}

/// Internal implementation for get_image
fn get_image_internal(db: &mut Database, id: i64) -> DatabaseResult<Image> {
    
    let mut stmt = db.connection().prepare(
        "SELECT id, filename, filepath, file_hash, file_size, 
                captured_at, created_at, updated_at, exif_data,
                rating, flag, color_label, edit_data, edit_version,
                is_synced, sync_revision
         FROM images 
         WHERE id = ?"
    )?;
    
    let image = stmt.query_row([id], |row| {
        let exif_data: Option<String> = row.get(9)?;
        let edit_data: Option<String> = row.get(12)?;
        let flag: Option<String> = row.get(10)?;
        let color_label: Option<String> = row.get(11)?;
        
        Ok(Image {
            id: Some(row.get(0)?),
            filename: row.get(1)?,
            filepath: row.get(2)?,
            file_hash: row.get(3)?,
            file_size: row.get(4)?,
            captured_at: row.get::<_, Option<String>>(5)?
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                .unwrap()
                .with_timezone(&Utc),
            exif_data: exif_data.and_then(|s| serde_json::from_str(&s).ok()),
            rating: row.get(8)?,
            flag: flag.and_then(|f| match f.as_str() {
                "pick" => Some(ImageFlag::Pick),
                "reject" => Some(ImageFlag::Reject),
                _ => None,
            }),
            color_label: color_label.and_then(|c| match c.as_str() {
                "red" => Some(ColorLabel::Red),
                "yellow" => Some(ColorLabel::Yellow),
                "green" => Some(ColorLabel::Green),
                "blue" => Some(ColorLabel::Blue),
                "purple" => Some(ColorLabel::Purple),
                _ => None,
            }),
            edit_data: edit_data.and_then(|s| serde_json::from_str(&s).ok()),
            edit_version: row.get(13)?,
            is_synced: row.get(14)?,
            sync_revision: row.get(15)?,
        })
    })?;
    
    Ok(image)
}

/// Add new images to the database
#[tauri::command]
pub async fn add_images(
    new_images: Vec<NewImage>,
    state: State<'_, AppState>,
) -> SerializableResult<Vec<i64>> {
    let mut db = state.db.lock().unwrap();
    let result = add_images_internal(&mut db, new_images);
    SerializableResult::from(result)
}

/// Internal implementation for add_images
fn add_images_internal(db: &mut Database, new_images: Vec<NewImage>) -> DatabaseResult<Vec<i64>> {
    let tx = db.connection().transaction()?;
    
    let mut inserted_ids = Vec::new();
    
    for new_image in new_images {
        let exif_json = new_image.exif_data
            .as_ref()
            .and_then(|e| serde_json::to_string(e).ok());
        
        let captured_at_str = new_image.captured_at
            .map(|dt| dt.to_rfc3339());
        
        let now = Utc::now();
        
        let result = tx.execute(
            "INSERT INTO images 
             (filename, filepath, file_hash, file_size, captured_at, 
              created_at, updated_at, exif_data, rating, is_synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, FALSE)",
            params![
                new_image.filename,
                new_image.filepath,
                new_image.file_hash,
                new_image.file_size,
                captured_at_str,
                now.to_rfc3339(),
                now.to_rfc3339(),
                exif_json,
            ],
        )?;
        
        if result == 1 {
            inserted_ids.push(tx.last_insert_rowid());
        }
    }
    
    tx.commit()?;
    Ok(inserted_ids)
}

/// Update an image
#[tauri::command]
pub async fn update_image(
    id: i64,
    update: ImageUpdate,
    state: State<'_, AppState>,
) -> SerializableResult<()> {
    let mut db = state.db.lock().unwrap();
    let result = update_image_internal(&mut db, id, update);
    SerializableResult::from(result)
}

/// Internal implementation for update_image
fn update_image_internal(db: &mut Database, id: i64, update: ImageUpdate) -> DatabaseResult<()> {
    // Build dynamic UPDATE query based on provided fields
    let mut updates = Vec::new();
    let mut params = Vec::new();
    
    if let Some(rating) = update.rating {
        updates.push("rating = ?");
        params.push(rating.to_string());
    }
    
    if let Some(flag) = update.flag {
        updates.push("flag = ?");
        params.push(flag.map(|f| match f {
            ImageFlag::Pick => "pick".to_string(),
            ImageFlag::Reject => "reject".to_string(),
        }).unwrap_or_else(|| "NULL".to_string()));
    }
    
    if let Some(color_label) = update.color_label {
        updates.push("color_label = ?");
        params.push(color_label.map(|c| match c {
            ColorLabel::Red => "red".to_string(),
            ColorLabel::Yellow => "yellow".to_string(),
            ColorLabel::Green => "green".to_string(),
            ColorLabel::Blue => "blue".to_string(),
            ColorLabel::Purple => "purple".to_string(),
        }).unwrap_or_else(|| "NULL".to_string()));
    }
    
    if let Some(edit_data) = update.edit_data {
        updates.push("edit_data = ?");
        updates.push("edit_version = edit_version + 1");
        params.push(serde_json::to_string(&edit_data)?);
    }
    
    if let Some(is_synced) = update.is_synced {
        updates.push("is_synced = ?");
        params.push(if is_synced { "1" } else { "0" }.to_string());
    }
    
    if let Some(sync_revision) = update.sync_revision {
        updates.push("sync_revision = ?");
        params.push(sync_revision.unwrap_or_else(|| "NULL".to_string()));
    }
    
    if updates.is_empty() {
        return Ok(()); // No updates to apply
    }
    
    updates.push("updated_at = ?");
    params.push(Utc::now().to_rfc3339());
    
    let query = format!(
        "UPDATE images SET {} WHERE id = ?",
        updates.join(", ")
    );
    
    params.push(id.to_string());
    
    let mut stmt = db.connection().prepare(&query)?;
    stmt.execute(rusqlite::params_from_iter(params))?;
    
    Ok(())
}

/// Get all collections
#[tauri::command]
pub async fn get_collections(state: State<'_, AppState>) -> SerializableResult<Vec<Collection>> {
    let mut db = state.db.lock().unwrap();
    let result = get_collections_internal(&mut db);
    SerializableResult::from(result)
}

/// Internal implementation for get_collections
fn get_collections_internal(db: &mut Database) -> DatabaseResult<Vec<Collection>> {
    let mut stmt = db.connection().prepare(
        "SELECT id, name, type, parent_id, query, sort_order, created_at, updated_at
         FROM collections 
         ORDER BY sort_order, name"
    )?;
    
    let collections_iter = stmt.query_map([], |row| {
        let query_json: Option<String> = row.get(4)?;
        let collection_type: String = row.get(2)?;
        
        Ok(Collection {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            collection_type: match collection_type.as_str() {
                "folder" => CollectionType::Folder,
                "smart" => CollectionType::Smart,
                "quick" => CollectionType::Quick,
                _ => CollectionType::Folder, // Default fallback
            },
            parent_id: row.get(3)?,
            query: query_json.and_then(|q| serde_json::from_str(&q).ok()),
            sort_order: row.get(5)?,
            created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                .unwrap()
                .with_timezone(&Utc),
        })
    })?;
    
    let mut collections = Vec::new();
    for collection in collections_iter {
        collections.push(collection?);
    }
    
    Ok(collections)
}

/// Get images in a collection
#[tauri::command]
pub async fn get_collection_images(
    collection_id: i64,
    state: State<'_, AppState>,
) -> SerializableResult<Vec<Image>> {
    let mut db = state.db.lock().unwrap();
    let result = get_collection_images_internal(&mut db, collection_id);
    SerializableResult::from(result)
}

/// Internal implementation for get_collection_images
fn get_collection_images_internal(db: &mut Database, collection_id: i64) -> DatabaseResult<Vec<Image>> {
    let mut stmt = db.connection().prepare(
        "SELECT i.id, i.filename, i.filepath, i.file_hash, i.file_size, 
                i.captured_at, i.created_at, i.updated_at, i.exif_data,
                i.rating, i.flag, i.color_label, i.edit_data, i.edit_version,
                i.is_synced, i.sync_revision
         FROM images i
         JOIN collection_images ci ON i.id = ci.image_id
         WHERE ci.collection_id = ?
         ORDER BY ci.added_at DESC"
    )?;
    
    let images_iter = stmt.query_map([collection_id], |row| {
        let exif_data: Option<String> = row.get(9)?;
        let edit_data: Option<String> = row.get(12)?;
        let flag: Option<String> = row.get(10)?;
        let color_label: Option<String> = row.get(11)?;
        
        Ok(Image {
            id: Some(row.get(0)?),
            filename: row.get(1)?,
            filepath: row.get(2)?,
            file_hash: row.get(3)?,
            file_size: row.get(4)?,
            captured_at: row.get::<_, Option<String>>(5)?
                .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                .unwrap()
                .with_timezone(&Utc),
            exif_data: exif_data.and_then(|s| serde_json::from_str(&s).ok()),
            rating: row.get(8)?,
            flag: flag.and_then(|f| match f.as_str() {
                "pick" => Some(ImageFlag::Pick),
                "reject" => Some(ImageFlag::Reject),
                _ => None,
            }),
            color_label: color_label.and_then(|c| match c.as_str() {
                "red" => Some(ColorLabel::Red),
                "yellow" => Some(ColorLabel::Yellow),
                "green" => Some(ColorLabel::Green),
                "blue" => Some(ColorLabel::Blue),
                "purple" => Some(ColorLabel::Purple),
                _ => None,
            }),
            edit_data: edit_data.and_then(|s| serde_json::from_str(&s).ok()),
            edit_version: row.get(13)?,
            is_synced: row.get(14)?,
            sync_revision: row.get(15)?,
        })
    })?;
    
    let mut images = Vec::new();
    for image in images_iter {
        images.push(image?);
    }
    
    Ok(images)
}
