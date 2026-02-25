use crate::models::event::Event;
use chrono::{Utc, DateTime};
use rusqlite::{params, Connection, Result as SqlResult};

pub struct EventStore<'a> {
    pub conn: &'a Connection,
}

impl<'a> EventStore<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn append_event(&self, event: &Event) -> SqlResult<()> {
        let sql = r#"
            INSERT INTO events (
                id, timestamp, event_type, payload, target_type, target_id, user_id, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#;
        self.conn.execute(
            sql,
            params![
                event.id,
                event.timestamp,
                serde_json::to_string(&event.event_type).unwrap(),
                serde_json::to_string(&event.payload).unwrap(),
                serde_json::to_string(&event.target_type).unwrap(),
                event.target_id,
                event.user_id,
                event.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_events(&self) -> SqlResult<Vec<Event>> {
        let mut stmt = self.conn.prepare("SELECT id, timestamp, event_type, payload, target_type, target_id, user_id, created_at FROM events ORDER BY timestamp ASC")?;
        let rows = stmt.query_map([], |row| {
            let event_type: String = row.get(2)?;
            let payload: String = row.get(3)?;
            let target_type: String = row.get(4)?;
            Ok(Event {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                event_type: serde_json::from_str(&event_type).unwrap(),
                payload: serde_json::from_str(&payload).unwrap(),
                target_type: serde_json::from_str(&target_type).unwrap(),
                target_id: row.get(5)?,
                user_id: row.get(6).ok(),
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?).unwrap().with_timezone(&Utc),
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::event::{Event, EventType, EventPayload, TargetType, ImageAddedPayload};
    use uuid::Uuid;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(r#"
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
        "#).unwrap();
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
}
