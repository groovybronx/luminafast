use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String, // UUID
    pub timestamp: i64, // Unix timestamp
    pub event_type: EventType,
    pub payload: EventPayload,
    pub target_type: TargetType,
    pub target_id: i64,
    pub user_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    ImageAdded,
    ImageUpdated,
    ImageDeleted,
    RatingChanged,
    FlagChanged,
    ColorLabelChanged,
    TagAdded,
    TagRemoved,
    EditApplied,
    CollectionCreated,
    CollectionUpdated,
    CollectionDeleted,
    ImageAddedToCollection,
    ImageRemovedFromCollection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EventPayload {
    ImageAdded(ImageAddedPayload),
    ImageUpdated(ImageUpdatedPayload),
    RatingChanged(RatingChangedPayload),
    FlagChanged(FlagChangedPayload),
    ColorLabelChanged(ColorLabelChangedPayload),
    TagAdded(TagAddedPayload),
    TagRemoved(TagRemovedPayload),
    EditApplied(EditAppliedPayload),
    CollectionCreated(CollectionCreatedPayload),
    ImageAddedToCollection(ImageAddedToCollectionPayload),
    ImageRemovedFromCollection(ImageRemovedFromCollectionPayload),
    Generic(serde_json::Value),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageAddedPayload {
    pub image_id: i64,
    pub filename: String,
    pub file_hash: String,
    pub captured_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageUpdatedPayload {
    pub image_id: i64,
    pub changed_fields: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatingChangedPayload {
    pub image_id: i64,
    pub old_rating: i32,
    pub new_rating: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagChangedPayload {
    pub image_id: i64,
    pub old_flag: Option<String>,
    pub new_flag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorLabelChangedPayload {
    pub image_id: i64,
    pub old_label: Option<String>,
    pub new_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagAddedPayload {
    pub image_id: i64,
    pub tag_id: i64,
    pub tag_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagRemovedPayload {
    pub image_id: i64,
    pub tag_id: i64,
    pub tag_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditAppliedPayload {
    pub image_id: i64,
    pub edit_type: String,
    pub old_value: Option<serde_json::Value>,
    pub new_value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionCreatedPayload {
    pub collection_id: i64,
    pub collection_name: String,
    pub collection_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageAddedToCollectionPayload {
    pub image_id: i64,
    pub collection_id: i64,
    pub collection_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageRemovedFromCollectionPayload {
    pub image_id: i64,
    pub collection_id: i64,
    pub collection_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TargetType {
    Image,
    Collection,
    Tag,
}

/// New event for insertion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewEvent {
    pub event_type: EventType,
    pub payload: EventPayload,
    pub target_type: TargetType,
    pub target_id: i64,
    pub user_id: Option<String>,
}

impl NewEvent {
    pub fn new(
        event_type: EventType,
        payload: EventPayload,
        target_type: TargetType,
        target_id: i64,
    ) -> Self {
        Self {
            event_type,
            payload,
            target_type,
            target_id,
            user_id: None, // Future: multi-user support
        }
    }
    
    pub fn with_user(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }
    
    /// Convert to Event with generated ID and timestamps
    pub fn to_event(self) -> Event {
        let now = Utc::now();
        Event {
            id: Uuid::new_v4().to_string(),
            timestamp: now.timestamp(),
            event_type: self.event_type,
            payload: self.payload,
            target_type: self.target_type,
            target_id: self.target_id,
            user_id: self.user_id,
            created_at: now,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::image::ImageFlag;
    
    #[test]
    fn test_event_serialization() {
        let event = Event {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().timestamp(),
            event_type: EventType::RatingChanged,
            payload: EventPayload::RatingChanged(RatingChangedPayload {
                image_id: 1,
                old_rating: 3,
                new_rating: 5,
            }),
            target_type: TargetType::Image,
            target_id: 1,
            user_id: None,
            created_at: Utc::now(),
        };
        
        let json = serde_json::to_string(&event).unwrap();
        let deserialized: Event = serde_json::from_str(&json).unwrap();
        
        assert_eq!(event.target_id, deserialized.target_id);
        assert_eq!(event.event_type, deserialized.event_type);
    }
    
    #[test]
    fn test_new_event_creation() {
        let new_event = NewEvent::new(
            EventType::FlagChanged,
            EventPayload::FlagChanged(FlagChangedPayload {
                image_id: 1,
                old_flag: None,
                new_flag: Some("pick".to_string()),
            }),
            TargetType::Image,
            1,
        );
        
        let event = new_event.to_event();
        
        assert!(!event.id.is_empty());
        assert!(event.timestamp > 0);
        assert_eq!(event.target_id, 1);
        assert_eq!(event.event_type, EventType::FlagChanged);
    }
}
