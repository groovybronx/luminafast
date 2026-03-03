use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Snapshot of an edit state at a specific point in time
/// Contains all events up to that point, allowing time-travel restoration
#[derive(Debug, Clone)]
pub struct Snapshot {
    pub id: i64,
    pub image_id: i64,
    pub name: String,
    pub event_ids: Vec<String>,
    pub created_at: DateTime<Utc>,
}

/// Data transfer object for Snapshot (JSON serializable)
/// Sent from Rust backend to TypeScript frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDTO {
    pub id: i64,
    pub image_id: i64,
    pub name: String,
    pub snapshot_data: String, // JSON serialized events (for audit trail)
    pub event_ids: Vec<String>,
    pub created_at: String, // RFC3339 format
}

impl Snapshot {
    /// Create a new Snapshot
    pub fn new(
        id: i64,
        image_id: i64,
        name: String,
        event_ids: Vec<String>,
        created_at: DateTime<Utc>,
    ) -> Self {
        Self {
            id,
            image_id,
            name,
            event_ids,
            created_at,
        }
    }

    /// Convert to DTO for serialization
    pub fn to_dto(&self, snapshot_data: String) -> SnapshotDTO {
        SnapshotDTO {
            id: self.id,
            image_id: self.image_id,
            name: self.name.clone(),
            snapshot_data,
            event_ids: self.event_ids.clone(),
            created_at: self.created_at.to_rfc3339(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snapshot_creation() {
        let now = Utc::now();
        let snapshot = Snapshot::new(
            1,
            100,
            "Before color grading".to_string(),
            vec!["evt-1".to_string(), "evt-2".to_string()],
            now,
        );

        assert_eq!(snapshot.id, 1);
        assert_eq!(snapshot.image_id, 100);
        assert_eq!(snapshot.name, "Before color grading");
        assert_eq!(snapshot.event_ids.len(), 2);
    }

    #[test]
    fn test_snapshot_to_dto() {
        let now = Utc::now();
        let snapshot = Snapshot::new(
            1,
            100,
            "Test snapshot".to_string(),
            vec!["evt-1".to_string()],
            now,
        );

        let snapshot_data =
            r#"[{"eventType":"ExposureAdjusted","payload":{"value":20}}]"#.to_string();
        let dto = snapshot.to_dto(snapshot_data.clone());

        assert_eq!(dto.id, 1);
        assert_eq!(dto.image_id, 100);
        assert_eq!(dto.name, "Test snapshot");
        assert_eq!(dto.snapshot_data, snapshot_data);
        assert_eq!(dto.event_ids.len(), 1);
    }

    #[test]
    fn test_snapshot_dto_serialization() {
        let dto = SnapshotDTO {
            id: 1,
            image_id: 100,
            name: "Test".to_string(),
            snapshot_data: "[]".to_string(),
            event_ids: vec!["evt-1".to_string()],
            created_at: "2026-03-03T12:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&dto).expect("Failed to serialize");
        let deserialized: SnapshotDTO = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(deserialized.id, dto.id);
        assert_eq!(deserialized.image_id, dto.image_id);
        assert_eq!(deserialized.name, dto.name);
    }
}
