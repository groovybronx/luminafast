use serde::{Deserialize, Serialize};
use std::error::Error;

/// Rule for a smart query filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartQueryRule {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

/// Smart query with rules and combinator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartQuery {
    pub rules: Vec<SmartQueryRule>,
    pub combinator: String, // "AND" or "OR"
}

/// Parse smart query JSON and return SQL WHERE clause
///
/// # Arguments
/// * `json` - JSON string of SmartQuery structure
///
/// # Returns
/// SQL WHERE clause (without WHERE keyword)
///
/// # Example
/// ```
/// let json = r#"{"rules":[{"field":"rating","operator":">=","value":3}],"combinator":"AND"}"#;
/// let sql = luminafast_lib::services::smart_query_parser::parse_smart_query(json).unwrap();
/// assert!(sql.contains("image_state.rating"));
/// ```
pub fn parse_smart_query(json: &str) -> Result<String, Box<dyn Error>> {
    let query: SmartQuery = serde_json::from_str(json)?;

    if query.rules.is_empty() {
        return Err("No rules in smart query".into());
    }

    let clauses: Result<Vec<String>, Box<dyn Error>> = query
        .rules
        .iter()
        .map(|rule| build_sql_clause(rule))
        .collect();

    let clauses = clauses?;
    let joiner = match query.combinator.to_uppercase().as_str() {
        "OR" => " OR ",
        _ => " AND ",
    };

    Ok(format!("({})", clauses.join(joiner)))
}

/// Build SQL clause for a single rule
fn build_sql_clause(rule: &SmartQueryRule) -> Result<String, Box<dyn Error>> {
    let operator = rule.operator.to_lowercase();
    let field = rule.field.to_lowercase();

    match field.as_str() {
        // Numeric fields
        "rating" => build_numeric_clause("image_state.rating", &operator, &rule.value),
        "iso" => build_numeric_clause("exif_metadata.iso", &operator, &rule.value),
        "aperture" => build_numeric_clause("exif_metadata.aperture", &operator, &rule.value),
        "focal_length" => {
            build_numeric_clause("exif_metadata.focal_length", &operator, &rule.value)
        }

        // String fields
        "camera_make" => build_string_clause("exif_metadata.camera_make", &operator, &rule.value),
        "camera_model" => build_string_clause("exif_metadata.camera_model", &operator, &rule.value),
        "lens" => build_string_clause("exif_metadata.lens", &operator, &rule.value),
        "filename" => build_string_clause("images.filename", &operator, &rule.value),

        // Enum fields (flag, color_label)
        "flag" => build_enum_clause("image_state.flag", &operator, &rule.value),
        "color_label" => build_enum_clause("image_state.color_label", &operator, &rule.value),

        _ => Err(format!("Unsupported field: {}", field).into()),
    }
}

/// Build SQL clause for numeric fields
fn build_numeric_clause(
    field: &str,
    operator: &str,
    value: &serde_json::Value,
) -> Result<String, Box<dyn Error>> {
    let num = value.as_f64().ok_or("Invalid numeric value")?;

    match operator {
        "=" | "==" | "eq" => Ok(format!("{} = {}", field, num)),
        "!=" | "<>" | "ne" => Ok(format!("{} != {}", field, num)),
        ">" | "gt" => Ok(format!("{} > {}", field, num)),
        ">=" | "gte" => Ok(format!("{} >= {}", field, num)),
        "<" | "lt" => Ok(format!("{} < {}", field, num)),
        "<=" | "lte" => Ok(format!("{} <= {}", field, num)),
        _ => Err(format!("Unsupported operator for numeric field: {}", operator).into()),
    }
}

/// Build SQL clause for string fields
fn build_string_clause(
    field: &str,
    operator: &str,
    value: &serde_json::Value,
) -> Result<String, Box<dyn Error>> {
    let str_val = value.as_str().ok_or("Invalid string value")?;

    // Escape single quotes
    let escaped = str_val.replace("'", "''");

    match operator {
        "=" | "==" | "eq" => Ok(format!("{} = '{}'", field, escaped)),
        "!=" | "<>" | "ne" => Ok(format!("{} != '{}'", field, escaped)),
        // Pour LIKE, ne pas échapper _ et % - les laisser comme wildcards SQL standard
        // L'échappement des quotes simples suffit pour la sécurité SQL
        "contains" => Ok(format!("{} LIKE '%{}%'", field, escaped)),
        "not_contains" => Ok(format!("{} NOT LIKE '%{}%'", field, escaped)),
        "starts_with" => Ok(format!("{} LIKE '{}%'", field, escaped)),
        "ends_with" => Ok(format!("{} LIKE '%{}'", field, escaped)),
        _ => Err(format!("Unsupported operator for string field: {}", operator).into()),
    }
}

/// Build SQL clause for enum fields (flag, color_label)
fn build_enum_clause(
    field: &str,
    operator: &str,
    value: &serde_json::Value,
) -> Result<String, Box<dyn Error>> {
    let str_val = value.as_str().ok_or("Invalid enum value")?;

    // Validate flag values
    if field.contains("flag") && !["pick", "reject"].contains(&str_val) {
        return Err(format!(
            "Invalid flag value: {}. Must be 'pick' or 'reject'",
            str_val
        )
        .into());
    }

    let escaped = str_val.replace("'", "''");

    match operator {
        "=" | "==" | "eq" => Ok(format!("{} = '{}'", field, escaped)),
        "!=" | "<>" | "ne" => Ok(format!("{} != '{}'", field, escaped)),
        _ => Err(format!("Unsupported operator for enum field: {}", operator).into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_smart_query_rating_ge() {
        let json = r#"{"rules":[{"field":"rating","operator":">=","value":3}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("image_state.rating >= 3"));
        assert!(sql.contains("(") && sql.contains(")"));
    }

    #[test]
    fn test_parse_smart_query_iso_gt() {
        let json = r#"{"rules":[{"field":"iso","operator":">","value":1600}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("exif_metadata.iso > 1600"));
    }

    #[test]
    fn test_parse_smart_query_and_combinator() {
        let json = r#"{"rules":[{"field":"rating","operator":">=","value":3},{"field":"iso","operator":">","value":1600}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains(" AND "));
        assert!(sql.contains("image_state.rating >= 3"));
        assert!(sql.contains("exif_metadata.iso > 1600"));
    }

    #[test]
    fn test_parse_smart_query_or_combinator() {
        let json = r#"{"rules":[{"field":"rating","operator":"=","value":5},{"field":"iso","operator":">","value":3200}],"combinator":"OR"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains(" OR "));
        assert!(sql.contains("image_state.rating = 5"));
        assert!(sql.contains("exif_metadata.iso > 3200"));
    }

    #[test]
    fn test_parse_smart_query_camera_contains() {
        let json = r#"{"rules":[{"field":"camera_make","operator":"contains","value":"Canon"}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("exif_metadata.camera_make LIKE '%Canon%'"));
    }

    #[test]
    fn test_parse_smart_query_filename_starts_with() {
        let json = r#"{"rules":[{"field":"filename","operator":"starts_with","value":"IMG_"}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("images.filename LIKE 'IMG_%'"));
    }

    #[test]
    fn test_parse_smart_query_flag_pick() {
        let json =
            r#"{"rules":[{"field":"flag","operator":"=","value":"pick"}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("image_state.flag = 'pick'"));
    }

    #[test]
    fn test_parse_smart_query_flag_reject() {
        let json =
            r#"{"rules":[{"field":"flag","operator":"=","value":"reject"}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("image_state.flag = 'reject'"));
    }

    #[test]
    fn test_parse_smart_query_invalid_field() {
        let json = r#"{"rules":[{"field":"invalid_field","operator":"=","value":"test"}],"combinator":"AND"}"#;
        let result = parse_smart_query(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_smart_query_invalid_json() {
        let json = "not valid json";
        let result = parse_smart_query(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_smart_query_empty_rules() {
        let json = r#"{"rules":[],"combinator":"AND"}"#;
        let result = parse_smart_query(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_smart_query_case_insensitive_operators() {
        let json = r#"{"rules":[{"field":"rating","operator":">=","value":3}],"combinator":"and"}"#;
        let sql = parse_smart_query(json).unwrap();
        assert!(sql.contains("image_state.rating >= 3"));
    }

    #[test]
    fn test_parse_smart_query_string_with_quotes() {
        let json = r#"{"rules":[{"field":"camera_make","operator":"=","value":"Canon's Camera"}],"combinator":"AND"}"#;
        let sql = parse_smart_query(json).unwrap();
        // Should escape single quotes
        assert!(sql.contains("Canon''s Camera"));
    }

    #[test]
    fn test_build_numeric_clause_aperture() {
        let rule = SmartQueryRule {
            field: "aperture".to_string(),
            operator: "<=".to_string(),
            value: serde_json::json!(2.8),
        };
        let sql = build_numeric_clause("exif_metadata.aperture", "<=", &rule.value).unwrap();
        assert_eq!(sql, "exif_metadata.aperture <= 2.8");
    }

    #[test]
    fn test_build_numeric_clause_invalid_value() {
        let rule = SmartQueryRule {
            field: "rating".to_string(),
            operator: ">".to_string(),
            value: serde_json::json!("not a number"),
        };
        let result = build_numeric_clause("image_state.rating", ">", &rule.value);
        assert!(result.is_err());
    }

    #[test]
    fn test_build_string_clause_ends_with() {
        let rule = SmartQueryRule {
            field: "filename".to_string(),
            operator: "ends_with".to_string(),
            value: serde_json::json!(".RAF"),
        };
        let sql = build_string_clause("images.filename", "ends_with", &rule.value).unwrap();
        assert_eq!(sql, "images.filename LIKE '%.RAF'");
    }

    #[test]
    fn test_build_enum_clause_invalid_flag() {
        let rule = SmartQueryRule {
            field: "flag".to_string(),
            operator: "=".to_string(),
            value: serde_json::json!("invalid"),
        };
        let result = build_enum_clause("image_state.flag", "=", &rule.value);
        assert!(result.is_err());
    }
}
