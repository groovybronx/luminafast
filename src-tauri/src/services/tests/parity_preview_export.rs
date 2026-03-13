use crate::models::event::{Event, EventPayload, EventType, TargetType};
use crate::services::event_sourcing::EventStore;
use crate::services::export_pipeline::{export_image_with_edits, ExportFormat, ExportRequest};
use chrono::Utc;
use image::RgbaImage;
use luminafast_image_core::{apply_filters, PixelFilters};
use rusqlite::{params, Connection};
use serde_json::json;
use std::path::Path;
use tempfile::tempdir;

const PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD: f64 = 2.0;

#[derive(Clone)]
struct ParityPreset {
    name: &'static str,
    width: u32,
    height: u32,
    source_pixels: Vec<u8>,
    exposure: f64,
    contrast: f64,
    saturation: f64,
    highlights: f64,
    shadows: f64,
    clarity: f64,
    vibrance: f64,
    color_temp: f64,
    tint: f64,
}

impl ParityPreset {
    fn full_patch(&self) -> serde_json::Value {
        json!({
            "exposure": self.exposure,
            "contrast": self.contrast,
            "saturation": self.saturation,
            "highlights": self.highlights,
            "shadows": self.shadows,
            "clarity": self.clarity,
            "vibrance": self.vibrance,
            "colorTemp": self.color_temp,
            "tint": self.tint
        })
    }

    fn patch_without_exposure(&self) -> serde_json::Value {
        json!({
            "contrast": self.contrast,
            "saturation": self.saturation,
            "highlights": self.highlights,
            "shadows": self.shadows,
            "clarity": self.clarity,
            "vibrance": self.vibrance,
            "colorTemp": self.color_temp,
            "tint": self.tint
        })
    }

    fn to_preview_filters(&self) -> PixelFilters {
        PixelFilters {
            exposure: (self.exposure / 50.0) as f32,
            contrast: (self.contrast / 50.0) as f32,
            saturation: (1.0 + self.saturation / 100.0) as f32,
            highlights: (self.highlights / 100.0) as f32,
            shadows: (self.shadows / 100.0) as f32,
            clarity: (self.clarity / 100.0) as f32,
            vibrance: (self.vibrance / 100.0) as f32,
            color_temp: self.color_temp as f32,
            tint: (self.tint / 2.0) as f32,
        }
    }
}

fn parity_presets() -> Vec<ParityPreset> {
    vec![
        ParityPreset {
            name: "low_light",
            width: 3,
            height: 2,
            source_pixels: vec![
                12, 15, 18, 255, 20, 18, 14, 255, 28, 22, 19, 255, 16, 20, 24, 255, 24, 25, 21,
                255, 32, 30, 26, 255,
            ],
            exposure: 35.0,
            contrast: 10.0,
            saturation: 12.0,
            highlights: -20.0,
            shadows: 65.0,
            clarity: 15.0,
            vibrance: 18.0,
            color_temp: 5600.0,
            tint: 5.0,
        },
        ParityPreset {
            name: "highlights",
            width: 3,
            height: 2,
            source_pixels: vec![
                220, 210, 200, 255, 235, 228, 215, 255, 245, 240, 232, 255, 210, 205, 198, 255,
                230, 220, 210, 255, 250, 246, 238, 255,
            ],
            exposure: -12.0,
            contrast: 8.0,
            saturation: -5.0,
            highlights: -72.0,
            shadows: 18.0,
            clarity: 10.0,
            vibrance: 8.0,
            color_temp: 5200.0,
            tint: -6.0,
        },
        ParityPreset {
            name: "high_contrast",
            width: 3,
            height: 2,
            source_pixels: vec![
                8, 8, 8, 255, 250, 250, 250, 255, 30, 32, 28, 255, 225, 220, 215, 255, 45, 40, 35,
                255, 245, 240, 235, 255,
            ],
            exposure: 5.0,
            contrast: 45.0,
            saturation: 18.0,
            highlights: -35.0,
            shadows: 35.0,
            clarity: 45.0,
            vibrance: 22.0,
            color_temp: 5400.0,
            tint: 2.0,
        },
        ParityPreset {
            name: "skin_warm",
            width: 3,
            height: 2,
            source_pixels: vec![
                172, 126, 108, 255, 186, 140, 122, 255, 160, 116, 98, 255, 194, 148, 128, 255, 180,
                134, 114, 255, 168, 122, 102, 255,
            ],
            exposure: 8.0,
            contrast: -4.0,
            saturation: 14.0,
            highlights: -10.0,
            shadows: 12.0,
            clarity: 8.0,
            vibrance: 26.0,
            color_temp: 6400.0,
            tint: 14.0,
        },
        ParityPreset {
            name: "mixed_interior_exterior",
            width: 3,
            height: 2,
            source_pixels: vec![
                62, 78, 98, 255, 118, 130, 146, 255, 188, 178, 162, 255, 42, 52, 70, 255, 138, 146,
                152, 255, 214, 202, 188, 255,
            ],
            exposure: 12.0,
            contrast: 14.0,
            saturation: 10.0,
            highlights: -28.0,
            shadows: 28.0,
            clarity: 20.0,
            vibrance: 16.0,
            color_temp: 5750.0,
            tint: 3.0,
        },
    ]
}

fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("open in-memory sqlite");

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
    )
    .expect("create export parity schema");

    conn
}

fn write_source_image(path: &Path, width: u32, height: u32, rgba_pixels: &[u8]) {
    let image = RgbaImage::from_raw(width, height, rgba_pixels.to_vec())
        .expect("build source rgba buffer for parity test");
    image.save(path).expect("save source image");
}

fn insert_image_with_source(conn: &Connection, image_id: i64, hash: &str, source_path: &Path) {
    conn.execute(
        "INSERT INTO images (id, blake3_hash) VALUES (?1, ?2)",
        params![image_id, hash],
    )
    .expect("insert images row");

    conn.execute(
        "INSERT INTO ingestion_file_status (blake3_hash, file_path, updated_at)
         VALUES (?1, ?2, ?3)",
        params![
            hash,
            source_path.to_string_lossy().to_string(),
            Utc::now().to_rfc3339()
        ],
    )
    .expect("insert ingestion path row");
}

fn append_edit_event(
    conn: &Connection,
    event_id: &str,
    image_id: i64,
    timestamp: i64,
    edits: serde_json::Value,
) {
    let event = Event {
        id: event_id.to_string(),
        timestamp,
        event_type: EventType::EditApplied,
        payload: EventPayload::Generic(json!({ "edits": edits })),
        target_type: TargetType::Image,
        target_id: image_id,
        user_id: None,
        created_at: Utc::now(),
    };

    EventStore::new(conn)
        .append_event(&event)
        .expect("append edit event for parity test");
}

fn insert_snapshot_seed(
    conn: &Connection,
    image_id: i64,
    snapshot_event_id: &str,
    snapshot_exposure: f64,
) {
    let snapshot_data = json!([
        {
            "id": snapshot_event_id,
            "eventType": "edit_applied",
            "payload": {
                "edits": {
                    "exposure": snapshot_exposure
                }
            }
        }
    ])
    .to_string();

    conn.execute(
        "INSERT INTO edit_snapshots (image_id, name, snapshot_data, event_ids, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            image_id,
            format!("snap-{}", image_id),
            snapshot_data,
            json!([snapshot_event_id]).to_string(),
            Utc::now().to_rfc3339(),
        ],
    )
    .expect("insert snapshot seed");
}

fn render_preview_reference(preset: &ParityPreset) -> Vec<u8> {
    let filters = preset.to_preview_filters();

    apply_filters(&preset.source_pixels, preset.width, preset.height, &filters)
        .expect("render preview reference from shared core")
}

fn compute_mean_absolute_rgb_delta(actual: &[u8], expected: &[u8]) -> f64 {
    assert_eq!(actual.len(), expected.len(), "buffer length mismatch");

    let mut sum = 0.0_f64;
    let mut channels = 0_usize;

    for index in (0..actual.len()).step_by(4) {
        sum += (actual[index] as f64 - expected[index] as f64).abs();
        sum += (actual[index + 1] as f64 - expected[index + 1] as f64).abs();
        sum += (actual[index + 2] as f64 - expected[index + 2] as f64).abs();
        channels += 3;
    }

    sum / channels as f64
}

fn run_export_for_preset(
    conn: &Connection,
    image_id: i64,
    preset: &ParityPreset,
    use_snapshot_seed: bool,
) -> Vec<u8> {
    let temp_dir = tempdir().expect("create parity temp directory");
    let source_path = temp_dir.path().join(format!("{}-source.png", preset.name));
    let output_path = temp_dir.path().join(format!("{}-export.tiff", preset.name));

    write_source_image(
        &source_path,
        preset.width,
        preset.height,
        &preset.source_pixels,
    );
    insert_image_with_source(conn, image_id, &format!("hash-{}", image_id), &source_path);

    if use_snapshot_seed {
        let snapshot_event_id = format!("evt-{}-snap", image_id);
        insert_snapshot_seed(conn, image_id, &snapshot_event_id, preset.exposure);

        append_edit_event(
            conn,
            &snapshot_event_id,
            image_id,
            (image_id * 10) + 1,
            json!({ "exposure": preset.exposure }),
        );
        append_edit_event(
            conn,
            &format!("evt-{}-tail", image_id),
            image_id,
            (image_id * 10) + 2,
            preset.patch_without_exposure(),
        );
    } else {
        append_edit_event(
            conn,
            &format!("evt-{}-full", image_id),
            image_id,
            image_id * 10,
            preset.full_patch(),
        );
    }

    let request = ExportRequest {
        image_id,
        output_path: output_path.clone(),
        format: ExportFormat::Tiff,
    };

    let result = export_image_with_edits(conn, &request).expect("export image for parity test");
    assert_eq!(result.format, "tiff");
    assert_eq!(result.width, preset.width);
    assert_eq!(result.height, preset.height);

    image::open(output_path)
        .expect("open exported tiff")
        .to_rgba8()
        .into_raw()
}

#[test]
fn test_preview_export_parity_with_events_only() {
    let conn = setup_test_db();

    for (index, preset) in parity_presets().iter().enumerate() {
        let image_id = (index as i64) + 1;
        let expected_preview = render_preview_reference(preset);
        let exported_buffer = run_export_for_preset(&conn, image_id, preset, false);

        let mean_delta = compute_mean_absolute_rgb_delta(&exported_buffer, &expected_preview);

        assert!(
            mean_delta <= PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD,
            "Preset '{}' exceeded parity threshold: delta={} > {}",
            preset.name,
            mean_delta,
            PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD
        );
    }
}

#[test]
fn test_preview_export_parity_with_snapshot_seed() {
    let conn = setup_test_db();

    for (index, preset) in parity_presets().iter().enumerate() {
        let image_id = (index as i64) + 101;
        let expected_preview = render_preview_reference(preset);
        let exported_buffer = run_export_for_preset(&conn, image_id, preset, true);

        let mean_delta = compute_mean_absolute_rgb_delta(&exported_buffer, &expected_preview);

        assert!(
            mean_delta <= PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD,
            "Preset '{}' (snapshot path) exceeded parity threshold: delta={} > {}",
            preset.name,
            mean_delta,
            PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD
        );
    }
}
