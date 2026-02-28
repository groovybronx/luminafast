use crate::models::event::Event;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::fmt;

#[derive(Debug)]
pub enum EventStoreError {
    Database(rusqlite::Error),
    Serialization(serde_json::Error),
    Deserialization(serde_json::Error),
    DateParsing(chrono::ParseError),
}

impl fmt::Display for EventStoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EventStoreError::Database(e) => write!(f, "Database error: {}", e),
            EventStoreError::Serialization(e) => write!(f, "Serialization error: {}", e),
            EventStoreError::Deserialization(e) => write!(f, "Deserialization error: {}", e),
            EventStoreError::DateParsing(e) => write!(f, "Date parsing error: {}", e),
        }
    }
}

impl std::error::Error for EventStoreError {}

impl From<rusqlite::Error> for EventStoreError {
    fn from(err: rusqlite::Error) -> Self {
        EventStoreError::Database(err)
    }
}

impl From<serde_json::Error> for EventStoreError {
    fn from(err: serde_json::Error) -> Self {
        EventStoreError::Serialization(err)
    }
}

pub struct EventStore<'a> {
    pub conn: &'a Connection,
}

impl<'a> EventStore<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn append_event(&self, event: &Event) -> Result<(), EventStoreError> {
        let sql = r#"
            INSERT INTO events (
                id, timestamp, event_type, payload, target_type, target_id, user_id, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#;
        let event_type_str = serde_json::to_string(&event.event_type)?;
        let payload_str = serde_json::to_string(&event.payload)?;
        let target_type_str = serde_json::to_string(&event.target_type)?;

        self.conn.execute(
            sql,
            params![
                event.id,
                event.timestamp,
                event_type_str,
                payload_str,
                target_type_str,
                event.target_id,
                event.user_id,
                event.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_events(&self) -> Result<Vec<Event>, EventStoreError> {
        let mut stmt = self.conn.prepare("SELECT id, timestamp, event_type, payload, target_type, target_id, user_id, created_at FROM events ORDER BY timestamp ASC")?;
        let rows = stmt.query_map([], |row| {
            let event_type: String = row.get(2)?;
            let payload: String = row.get(3)?;
            let target_type: String = row.get(4)?;
            let created_at_str: String = row.get(7)?;
            Ok((
                event_type,
                payload,
                target_type,
                created_at_str,
                row.get(0)?,
                row.get(1)?,
                row.get(5)?,
                row.get::<_, Option<String>>(6)?,
            ))
        })?;

        let mut events = Vec::new();
        for row_result in rows {
            let (
                event_type_str,
                payload_str,
                target_type_str,
                created_at_str,
                id,
                timestamp,
                target_id,
                user_id,
            ) = row_result?;

            let event_type: crate::models::event::EventType =
                serde_json::from_str(&event_type_str).map_err(EventStoreError::Deserialization)?;
            let payload: crate::models::event::EventPayload =
                serde_json::from_str(&payload_str).map_err(EventStoreError::Deserialization)?;
            let target_type: crate::models::event::TargetType =
                serde_json::from_str(&target_type_str).map_err(EventStoreError::Deserialization)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map_err(EventStoreError::DateParsing)?
                .with_timezone(&Utc);

            events.push(Event {
                id,
                timestamp,
                event_type,
                payload,
                target_type,
                target_id,
                user_id,
                created_at,
            });
        }

        Ok(events)
    }

    pub fn get_events_for_target(
        &self,
        target_type: crate::models::event::TargetType,
        target_id: i64,
    ) -> Result<Vec<Event>, EventStoreError> {
        let target_type_str = serde_json::to_string(&target_type)?;
        let mut stmt = self.conn.prepare(
            "SELECT id, timestamp, event_type, payload, target_type, target_id, user_id, created_at \
             FROM events \
             WHERE target_type = ?1 AND target_id = ?2 \
             ORDER BY timestamp ASC",
        )?;
        let rows = stmt.query_map(params![target_type_str, target_id], |row| {
            let event_type: String = row.get(2)?;
            let payload: String = row.get(3)?;
            let target_type: String = row.get(4)?;
            let created_at_str: String = row.get(7)?;
            Ok((
                event_type,
                payload,
                target_type,
                created_at_str,
                row.get(0)?,
                row.get(1)?,
                row.get(5)?,
                row.get::<_, Option<String>>(6)?,
            ))
        })?;

        let mut events = Vec::new();
        for row_result in rows {
            let (
                event_type_str,
                payload_str,
                target_type_str,
                created_at_str,
                id,
                timestamp,
                target_id,
                user_id,
            ) = row_result?;

            let event_type: crate::models::event::EventType =
                serde_json::from_str(&event_type_str).map_err(EventStoreError::Deserialization)?;
            let payload: crate::models::event::EventPayload =
                serde_json::from_str(&payload_str).map_err(EventStoreError::Deserialization)?;
            let target_type: crate::models::event::TargetType =
                serde_json::from_str(&target_type_str).map_err(EventStoreError::Deserialization)?;
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map_err(EventStoreError::DateParsing)?
                .with_timezone(&Utc);

            events.push(Event {
                id,
                timestamp,
                event_type,
                payload,
                target_type,
                target_id,
                user_id,
                created_at,
            });
        }

        Ok(events)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::event::{Event, EventPayload, EventType, ImageAddedPayload, TargetType};
    use uuid::Uuid;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
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
        "#,
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_append_and_get_event() {
        let conn = setup_db();
        let store = EventStore::new(&conn);
        let event = Event {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().timestamp(),
            event_type: EventType::ImageAdded,
            payload: EventPayload::ImageAdded(ImageAddedPayload {
                image_id: 1,
                filename: "test.jpg".to_string(),
                file_hash: "abc123".to_string(),
                captured_at: None,
            }),
            target_type: TargetType::Image,
            target_id: 1,
            user_id: Some("user1".to_string()),
            created_at: Utc::now(),
        };
        store.append_event(&event).unwrap();
        let events = store.get_events().unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_type, EventType::ImageAdded);
    }

    #[test]
    fn test_get_events_for_target_filters() {
        let conn = setup_db();
        let store = EventStore::new(&conn);
        let event = Event {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().timestamp(),
            event_type: EventType::ImageAdded,
            payload: EventPayload::ImageAdded(ImageAddedPayload {
                image_id: 7,
                filename: "test.jpg".to_string(),
                file_hash: "abc123".to_string(),
                captured_at: None,
            }),
            target_type: TargetType::Image,
            target_id: 7,
            user_id: None,
            created_at: Utc::now(),
        };

        store.append_event(&event).unwrap();

        let events = store.get_events_for_target(TargetType::Image, 7).unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].target_id, 7);
    }
}
