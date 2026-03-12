use crate::models::event::{EventPayload, EventType};
use crate::services::event_sourcing::{EventStore, EventStoreError};
use crate::services::export_rendering::render_pixels_for_export;
use image::{DynamicImage, ImageFormat, RgbImage, RgbaImage};
use luminafast_image_core::{PixelFilters, ProcessingError};
use rusqlite::{Connection, OptionalExtension};
use serde_json::{Map, Value};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Clone, Copy)]
pub enum ExportFormat {
    Jpeg,
    Tiff,
}

impl ExportFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Jpeg => "jpeg",
            Self::Tiff => "tiff",
        }
    }
}

impl TryFrom<&str> for ExportFormat {
    type Error = ExportPipelineError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.to_lowercase().as_str() {
            "jpeg" | "jpg" => Ok(Self::Jpeg),
            "tiff" | "tif" => Ok(Self::Tiff),
            unsupported => Err(ExportPipelineError::InvalidOutputFormat(
                unsupported.to_string(),
            )),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ExportRequest {
    pub image_id: i64,
    pub output_path: PathBuf,
    pub format: ExportFormat,
}

#[derive(Debug, Clone)]
pub struct ExportResult {
    pub image_id: i64,
    pub output_path: String,
    pub format: String,
    pub width: u32,
    pub height: u32,
    pub applied_edit_events: usize,
    pub used_snapshot: bool,
}

#[derive(Debug, Error)]
pub enum ExportPipelineError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Event store error: {0}")]
    EventStore(#[from] EventStoreError),

    #[error("Image processing error: {0}")]
    Processing(#[from] ProcessingError),

    #[error("Image IO error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image {0} not found in catalog")]
    ImageNotFound(i64),

    #[error("Image {0} has no known source file path")]
    SourcePathUnavailable(i64),

    #[error("Unsupported export format: {0}")]
    InvalidOutputFormat(String),

    #[error("Invalid pixel buffer for {width}x{height}: expected {expected}, got {got}")]
    InvalidPixelBuffer {
        expected: usize,
        got: usize,
        width: u32,
        height: u32,
    },
}

#[derive(Debug, Clone)]
struct EditStateAccumulator {
    exposure: f64,
    contrast: f64,
    highlights: f64,
    shadows: f64,
    temp: f64,
    tint: f64,
    vibrance: f64,
    saturation: f64,
    clarity: f64,
}

impl Default for EditStateAccumulator {
    fn default() -> Self {
        Self {
            exposure: 0.0,
            contrast: 0.0,
            highlights: 0.0,
            shadows: 0.0,
            temp: 5500.0,
            tint: 0.0,
            vibrance: 0.0,
            saturation: 0.0,
            clarity: 0.0,
        }
    }
}

impl EditStateAccumulator {
    fn apply_patch(&mut self, patch: &Map<String, Value>) {
        for (key, value) in patch {
            let Some(v) = value_to_f64(value) else {
                continue;
            };

            match key.as_str() {
                "exposure" => self.exposure = v,
                "contrast" => self.contrast = v,
                "highlights" => self.highlights = v,
                "shadows" => self.shadows = v,
                "temp" | "colorTemp" | "color_temp" => self.temp = v,
                "tint" => self.tint = v,
                "vibrance" => self.vibrance = v,
                "saturation" => self.saturation = v,
                "clarity" => self.clarity = v,
                _ => {}
            }
        }
    }

    fn to_pixel_filters(&self) -> PixelFilters {
        PixelFilters {
            exposure: (self.exposure / 50.0) as f32,
            contrast: (self.contrast / 50.0) as f32,
            saturation: (1.0 + self.saturation / 100.0) as f32,
            highlights: (self.highlights / 100.0) as f32,
            shadows: (self.shadows / 100.0) as f32,
            clarity: (self.clarity / 100.0) as f32,
            vibrance: (self.vibrance / 100.0) as f32,
            color_temp: self.temp as f32,
            tint: (self.tint / 2.0) as f32,
        }
    }
}

struct SnapshotSeed {
    event_ids: HashSet<String>,
    patches: Vec<Map<String, Value>>,
}

pub fn export_image_with_edits(
    conn: &Connection,
    request: &ExportRequest,
) -> Result<ExportResult, ExportPipelineError> {
    let source_path = resolve_source_image_path(conn, request.image_id)?;
    let (filters, applied_edit_events, used_snapshot) =
        resolve_filters_from_history(conn, request.image_id)?;

    let decoded = image::open(&source_path)?;
    let rgba = decoded.to_rgba8();
    let (width, height) = rgba.dimensions();

    let processed_pixels = render_pixels_for_export(rgba.as_raw(), width, height, &filters)?;

    write_export_image(
        &processed_pixels,
        width,
        height,
        &request.output_path,
        request.format,
    )?;

    Ok(ExportResult {
        image_id: request.image_id,
        output_path: request.output_path.to_string_lossy().to_string(),
        format: request.format.as_str().to_string(),
        width,
        height,
        applied_edit_events,
        used_snapshot,
    })
}

fn resolve_source_image_path(
    conn: &Connection,
    image_id: i64,
) -> Result<PathBuf, ExportPipelineError> {
    let image_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM images WHERE id = ?1",
        [image_id],
        |row| row.get(0),
    )?;

    if image_exists == 0 {
        return Err(ExportPipelineError::ImageNotFound(image_id));
    }

    let file_path = conn
        .query_row(
            "SELECT ifs.file_path
             FROM images i
             JOIN ingestion_file_status ifs ON ifs.blake3_hash = i.blake3_hash
             WHERE i.id = ?1 AND ifs.file_path IS NOT NULL
             ORDER BY ifs.id DESC
             LIMIT 1",
            [image_id],
            |row| row.get::<_, String>(0),
        )
        .optional()?;

    match file_path {
        Some(path) => Ok(PathBuf::from(path)),
        None => Err(ExportPipelineError::SourcePathUnavailable(image_id)),
    }
}

fn resolve_filters_from_history(
    conn: &Connection,
    image_id: i64,
) -> Result<(PixelFilters, usize, bool), ExportPipelineError> {
    let mut accumulator = EditStateAccumulator::default();
    let mut applied_count = 0_usize;
    let mut used_snapshot = false;
    let mut snapshot_event_ids = HashSet::new();

    if let Some(seed) = load_latest_snapshot_seed(conn, image_id)? {
        used_snapshot = true;
        snapshot_event_ids = seed.event_ids;

        for patch in seed.patches {
            accumulator.apply_patch(&patch);
            applied_count += 1;
        }
    }

    let store = EventStore::new(conn);
    let events = store.get_events()?;

    for event in events {
        if event.target_id != image_id || event.event_type != EventType::EditApplied {
            continue;
        }

        if snapshot_event_ids.contains(&event.id) {
            continue;
        }

        if let Some(patch) = extract_patch_from_event_payload(&event.payload) {
            accumulator.apply_patch(&patch);
            applied_count += 1;
        }
    }

    Ok((accumulator.to_pixel_filters(), applied_count, used_snapshot))
}

fn load_latest_snapshot_seed(
    conn: &Connection,
    image_id: i64,
) -> Result<Option<SnapshotSeed>, ExportPipelineError> {
    let row = conn
        .query_row(
            "SELECT snapshot_data, event_ids
             FROM edit_snapshots
             WHERE image_id = ?1
             ORDER BY created_at DESC
             LIMIT 1",
            [image_id],
            |row| {
                let snapshot_data: String = row.get(0)?;
                let event_ids_json: String = row.get(1)?;
                Ok((snapshot_data, event_ids_json))
            },
        )
        .optional()?;

    let Some((snapshot_data, event_ids_json)) = row else {
        return Ok(None);
    };

    let event_ids_vec: Vec<String> = serde_json::from_str(&event_ids_json)?;
    let event_ids = event_ids_vec.into_iter().collect::<HashSet<_>>();

    let snapshot_value: Value = serde_json::from_str(&snapshot_data)?;
    let mut patches = Vec::new();

    if let Some(events) = snapshot_value.as_array() {
        for event_value in events {
            let event_type = event_value
                .get("eventType")
                .or_else(|| event_value.get("event_type"))
                .and_then(Value::as_str)
                .map(normalize_event_type);

            if let Some(kind) = event_type {
                if kind != "edit_applied" {
                    continue;
                }
            }

            let payload_or_self = event_value.get("payload").unwrap_or(event_value);
            if let Some(patch) = extract_patch_from_payload_value(payload_or_self) {
                patches.push(patch);
            }
        }
    }

    Ok(Some(SnapshotSeed { event_ids, patches }))
}

fn extract_patch_from_event_payload(payload: &EventPayload) -> Option<Map<String, Value>> {
    match payload {
        EventPayload::EditApplied(edit_payload) => {
            let mut patch = Map::new();
            patch.insert(
                edit_payload.edit_type.clone(),
                edit_payload.new_value.clone(),
            );
            Some(patch)
        }
        EventPayload::Generic(value) => extract_patch_from_payload_value(value),
        _ => None,
    }
}

fn extract_patch_from_payload_value(value: &Value) -> Option<Map<String, Value>> {
    let payload = value.as_object()?;

    if let Some(edits) = payload.get("edits").and_then(Value::as_object) {
        return Some(edits.clone());
    }

    let edit_type = payload
        .get("editType")
        .or_else(|| payload.get("edit_type"))
        .and_then(Value::as_str)?;
    let new_value = payload
        .get("newValue")
        .or_else(|| payload.get("new_value"))?;

    let mut patch = Map::new();
    patch.insert(edit_type.to_string(), new_value.clone());
    Some(patch)
}

fn normalize_event_type(raw: &str) -> String {
    let mut normalized = String::with_capacity(raw.len() + 4);

    for (index, ch) in raw.chars().enumerate() {
        if ch.is_ascii_uppercase() {
            if index > 0 {
                normalized.push('_');
            }
            normalized.push(ch.to_ascii_lowercase());
        } else {
            normalized.push(ch.to_ascii_lowercase());
        }
    }

    normalized
}

fn write_export_image(
    rgba_pixels: &[u8],
    width: u32,
    height: u32,
    output_path: &Path,
    format: ExportFormat,
) -> Result<(), ExportPipelineError> {
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
        .ok_or(ExportPipelineError::InvalidPixelBuffer {
            expected: usize::MAX,
            got: rgba_pixels.len(),
            width,
            height,
        })?;

    if rgba_pixels.len() != expected {
        return Err(ExportPipelineError::InvalidPixelBuffer {
            expected,
            got: rgba_pixels.len(),
            width,
            height,
        });
    }

    if let Some(parent) = output_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }

    match format {
        ExportFormat::Jpeg => {
            let rgba = RgbaImage::from_raw(width, height, rgba_pixels.to_vec()).ok_or(
                ExportPipelineError::InvalidPixelBuffer {
                    expected,
                    got: rgba_pixels.len(),
                    width,
                    height,
                },
            )?;
            let rgb: RgbImage = DynamicImage::ImageRgba8(rgba).to_rgb8();
            rgb.save_with_format(output_path, ImageFormat::Jpeg)?;
        }
        ExportFormat::Tiff => {
            let rgba = RgbaImage::from_raw(width, height, rgba_pixels.to_vec()).ok_or(
                ExportPipelineError::InvalidPixelBuffer {
                    expected,
                    got: rgba_pixels.len(),
                    width,
                    height,
                },
            )?;
            DynamicImage::ImageRgba8(rgba).save_with_format(output_path, ImageFormat::Tiff)?;
        }
    }

    Ok(())
}

fn value_to_f64(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .or_else(|| value.as_i64().map(|v| v as f64))
        .or_else(|| value.as_u64().map(|v| v as f64))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::event::{Event, EventPayload, TargetType};
    use chrono::Utc;
    use std::path::Path;
    use tempfile::tempdir;

    fn must_ok<T, E: std::fmt::Display>(result: Result<T, E>, context: &str) -> T {
        match result {
            Ok(value) => value,
            Err(err) => panic!("{}: {}", context, err),
        }
    }

    fn setup_test_db() -> Connection {
        let conn = must_ok(Connection::open_in_memory(), "open in-memory sqlite");

        must_ok(
            conn.execute_batch(
                r#"
            CREATE TABLE images (
                id INTEGER PRIMARY KEY,
                blake3_hash TEXT NOT NULL UNIQUE
            );

            CREATE TABLE ingestion_file_status (
                id INTEGER PRIMARY KEY,
                blake3_hash TEXT,
                file_path TEXT,
                updated_at TEXT
            );

            CREATE TABLE events (
                id TEXT PRIMARY KEY,
                timestamp INTEGER,
                event_type TEXT,
                payload TEXT,
                target_type TEXT,
                target_id INTEGER,
                user_id TEXT,
                created_at TEXT
            );

            CREATE TABLE edit_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                snapshot_data TEXT NOT NULL,
                event_ids TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            "#,
            ),
            "create export pipeline test schema",
        );

        conn
    }

    fn create_source_image(path: &Path, pixel: [u8; 4]) {
        let Some(image) = RgbaImage::from_raw(1, 1, pixel.to_vec()) else {
            panic!("failed to construct test source image buffer");
        };
        must_ok(image.save(path), "save source image");
    }

    fn insert_image_with_path(conn: &Connection, image_id: i64, hash: &str, image_path: &Path) {
        must_ok(
            conn.execute(
                "INSERT INTO images (id, blake3_hash) VALUES (?1, ?2)",
                rusqlite::params![image_id, hash],
            ),
            "insert test image row",
        );

        must_ok(
            conn.execute(
                "INSERT INTO ingestion_file_status (blake3_hash, file_path, updated_at)
                 VALUES (?1, ?2, ?3)",
                rusqlite::params![
                    hash,
                    image_path.to_string_lossy().to_string(),
                    Utc::now().to_rfc3339()
                ],
            ),
            "insert ingestion file status",
        );
    }

    fn append_edit_event(conn: &Connection, event_id: &str, image_id: i64, edits: Value) {
        let event = Event {
            id: event_id.to_string(),
            timestamp: Utc::now().timestamp_millis(),
            event_type: EventType::EditApplied,
            payload: EventPayload::Generic(serde_json::json!({ "edits": edits })),
            target_type: TargetType::Image,
            target_id: image_id,
            user_id: None,
            created_at: Utc::now(),
        };

        must_ok(
            EventStore::new(conn).append_event(&event),
            "append edit event",
        );
    }

    #[test]
    fn test_export_format_parser_rejects_unsupported() {
        let result = ExportFormat::try_from("png");
        assert!(matches!(
            result,
            Err(ExportPipelineError::InvalidOutputFormat(ref fmt)) if fmt == "png"
        ));
    }

    #[test]
    fn test_export_pipeline_writes_jpeg() {
        let conn = setup_test_db();
        let temp = must_ok(tempdir(), "create temp directory");

        let source_path = temp.path().join("source.png");
        let output_path = temp.path().join("export.jpg");

        create_source_image(&source_path, [100, 100, 100, 255]);
        insert_image_with_path(&conn, 1, "hash-jpeg", &source_path);
        append_edit_event(&conn, "evt-1", 1, serde_json::json!({ "exposure": 50.0 }));

        let request = ExportRequest {
            image_id: 1,
            output_path: output_path.clone(),
            format: ExportFormat::Jpeg,
        };

        let result = must_ok(
            export_image_with_edits(&conn, &request),
            "run jpeg export pipeline",
        );

        assert!(output_path.exists());
        assert_eq!(result.format, "jpeg");
        assert_eq!(result.applied_edit_events, 1);
        assert!(!result.used_snapshot);

        let exported = must_ok(image::open(&output_path), "open exported jpeg").to_rgb8();
        assert!(exported.get_pixel(0, 0)[0] > 100);
    }

    #[test]
    fn test_export_pipeline_uses_snapshot_and_writes_tiff() {
        let conn = setup_test_db();
        let temp = must_ok(tempdir(), "create temp directory");

        let source_path = temp.path().join("source2.png");
        let output_path = temp.path().join("export.tiff");

        create_source_image(&source_path, [110, 110, 110, 255]);
        insert_image_with_path(&conn, 2, "hash-tiff", &source_path);

        must_ok(
            conn.execute(
                "INSERT INTO edit_snapshots (image_id, name, snapshot_data, event_ids, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    2_i64,
                    "snap-1",
                    serde_json::json!([
                        {
                            "id": "evt-snap-1",
                            "eventType": "edit_applied",
                            "payload": {
                                "edits": {
                                    "exposure": 20.0
                                }
                            }
                        }
                    ])
                    .to_string(),
                    serde_json::json!(["evt-snap-1"]).to_string(),
                    Utc::now().to_rfc3339(),
                ],
            ),
            "insert snapshot seed",
        );

        append_edit_event(
            &conn,
            "evt-snap-1",
            2,
            serde_json::json!({ "exposure": 20.0 }),
        );
        append_edit_event(&conn, "evt-2", 2, serde_json::json!({ "contrast": 25.0 }));

        let request = ExportRequest {
            image_id: 2,
            output_path: output_path.clone(),
            format: ExportFormat::Tiff,
        };

        let result = must_ok(
            export_image_with_edits(&conn, &request),
            "run tiff export pipeline",
        );

        assert!(output_path.exists());
        assert_eq!(result.format, "tiff");
        assert!(result.used_snapshot);
        assert_eq!(result.applied_edit_events, 2);
    }
}
