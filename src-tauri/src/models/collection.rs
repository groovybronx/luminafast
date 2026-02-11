use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: Option<i64>,
    pub name: String,
    pub collection_type: CollectionType,
    pub parent_id: Option<i64>,
    pub query: Option<SmartQuery>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CollectionType {
    Folder,
    Smart,
    Quick,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartQuery {
    #[serde(rename = "type")]
    pub query_type: SmartQueryType,
    pub conditions: Vec<QueryCondition>,
    pub sort_by: Option<SortField>,
    pub sort_order: Option<SortOrder>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SmartQueryType {
    DateRange,
    Rating,
    Flag,
    Tag,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryCondition {
    pub field: QueryField,
    pub operator: QueryOperator,
    pub value: QueryValue,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QueryField {
    Rating,
    Flag,
    ColorLabel,
    CaptureDate,
    CreateDate,
    Tag,
    FileType,
    Camera,
    Lens,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QueryOperator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    Contains,
    NotContains,
    In,
    NotIn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum QueryValue {
    String(String),
    Number(i32),
    Float(f64),
    Boolean(bool),
    Array(Vec<QueryValue>),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SortField {
    CaptureDate,
    CreateDate,
    Filename,
    Rating,
    FileSize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    Asc,
    Desc,
}

/// New collection for insertion (without id and timestamps)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewCollection {
    pub name: String,
    pub collection_type: CollectionType,
    pub parent_id: Option<i64>,
    pub query: Option<SmartQuery>,
    pub sort_order: i32,
}

/// Collection update payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionUpdate {
    pub name: Option<String>,
    pub parent_id: Option<Option<i64>>,
    pub query: Option<Option<SmartQuery>>,
    pub sort_order: Option<i32>,
}

/// Image-collection relationship
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionImage {
    pub collection_id: i64,
    pub image_id: i64,
    pub added_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_smart_query_serialization() {
        let query = SmartQuery {
            query_type: SmartQueryType::Rating,
            conditions: vec![
                QueryCondition {
                    field: QueryField::Rating,
                    operator: QueryOperator::GreaterThanOrEqual,
                    value: QueryValue::Number(4),
                },
                QueryCondition {
                    field: QueryField::Flag,
                    operator: QueryOperator::Equals,
                    value: QueryValue::String("pick".to_string()),
                },
            ],
            sort_by: Some(SortField::CaptureDate),
            sort_order: Some(SortOrder::Desc),
        };
        
        let json = serde_json::to_string(&query).unwrap();
        let deserialized: SmartQuery = serde_json::from_str(&json).unwrap();
        
        assert_eq!(query.query_type, deserialized.query_type);
        assert_eq!(query.conditions.len(), deserialized.conditions.len());
        assert_eq!(query.sort_by, deserialized.sort_by);
    }
    
    #[test]
    fn test_collection_serialization() {
        let collection = Collection {
            id: Some(1),
            name: "Best Photos".to_string(),
            collection_type: CollectionType::Smart,
            parent_id: None,
            query: Some(SmartQuery {
                query_type: SmartQueryType::Rating,
                conditions: vec![],
                sort_by: None,
                sort_order: None,
            }),
            sort_order: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        
        let json = serde_json::to_string(&collection).unwrap();
        let deserialized: Collection = serde_json::from_str(&json).unwrap();
        
        assert_eq!(collection.name, deserialized.name);
        assert_eq!(collection.collection_type, deserialized.collection_type);
    }
}
