use crate::database::Database;
use serde_json::Value;

/// Service de recherche avancée : requêtes SQL générées depuis les filtres JSON frontend
/// Supporte les champs : iso, star, camera, lens, date, etc.
pub struct SearchService;

/// Structure pour les résultats bruts de la BD
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub id: u32,
    pub filename: String,
    pub blake3_hash: String,
    pub rating: Option<u8>,
    pub flag: Option<String>,
}

impl SearchService {
    /// Parse un filtre JSON et le convertit en clause SQL WHERE
    /// Ex: {"field":"iso","operator":">","value":3200} → "iso > 3200"
    pub fn build_where_clause(filters: &[Value]) -> Result<String, String> {
        let mut clauses = Vec::new();

        for filter in filters {
            let field = filter
                .get("field")
                .and_then(|f| f.as_str())
                .ok_or("Champ de filtre invalide")?;
            let operator = filter
                .get("operator")
                .and_then(|o| o.as_str())
                .ok_or("Opérateur de filtre invalide")?;
            let value = filter.get("value").ok_or("Valeur de filtre invalide")?;

            let clause = match field {
                "iso" => {
                    if let Some(iso_val) = value.as_i64() {
                        match operator {
                            ">" => format!("e.iso > {}", iso_val),
                            ">=" => format!("e.iso >= {}", iso_val),
                            "<" => format!("e.iso < {}", iso_val),
                            "<=" => format!("e.iso <= {}", iso_val),
                            "=" | ":" => format!("e.iso = {}", iso_val),
                            _ => return Err(format!("Opérateur invalide pour iso: {}", operator)),
                        }
                    } else {
                        return Err("Valeur ISO invalide".to_string());
                    }
                }
                "star" => {
                    if let Some(star_val) = value.as_i64() {
                        // rating est un champ u8
                        let star_u8 = star_val as u8;
                        match operator {
                            ":" | "=" => format!("i.rating = {}", star_u8),
                            ">" => format!("i.rating > {}", star_u8),
                            ">=" => format!("i.rating >= {}", star_u8),
                            "<" => format!("i.rating < {}", star_u8),
                            "<=" => format!("i.rating <= {}", star_u8),
                            _ => return Err(format!("Opérateur invalide pour star: {}", operator)),
                        }
                    } else {
                        return Err("Valeur star invalide".to_string());
                    }
                }
                "camera" => {
                    if let Some(camera_str) = value.as_str() {
                        let escaped = camera_str.replace('\'', "''");
                        format!(
                            "(e.camera_make LIKE '%{}%' OR e.camera_model LIKE '%{}%')",
                            escaped, escaped
                        )
                    } else {
                        return Err("Valeur camera invalide".to_string());
                    }
                }
                "lens" => {
                    if let Some(lens_str) = value.as_str() {
                        let escaped = lens_str.replace('\'', "''");
                        format!("e.lens LIKE '%{}%'", escaped)
                    } else {
                        return Err("Valeur lens invalide".to_string());
                    }
                }
                _ => return Err(format!("Champ de recherche non supporté: {}", field)),
            };

            clauses.push(clause);
        }

        Ok(clauses.join(" AND "))
    }

    /// Effectue une recherche sur le catalogue
    /// Combine la recherche texte libre sur filename avec les filtres structurés
    pub fn search(
        db: &mut Database,
        text: &str,
        filters: &[Value],
    ) -> Result<Vec<SearchResult>, String> {
        let conn = db.connection();

        let mut query = "SELECT id, filename, blake3_hash, rating, flag ".to_string();
        query.push_str("FROM images WHERE 1=1");
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Ajouter filtre texte libre si présent (sécurisé avec paramètre lié)
        if !text.is_empty() {
            query.push_str(" AND (filename LIKE ?)");
            params.push(Box::new(format!("%{}%", text)));
        }

        // Ajouter les filtres structurés
        let where_clause = Self::build_where_clause(filters)?;
        if !where_clause.is_empty() {
            query.push_str(&format!(" AND ({})", where_clause));
        }

        query.push_str(" LIMIT 1000");

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| format!("Erreur SQL prepare: {}", e))?;

        // Convertir params en slice de references
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let results: Vec<SearchResult> = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(SearchResult {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    blake3_hash: row.get(2)?,
                    rating: row.get(3)?,
                    flag: row.get(4)?,
                })
            })
            .map_err(|e| format!("Erreur SQL query_map: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Erreur collection résultats: {}", e))?;

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_build_where_clause_iso_greater_than() {
        let filters = vec![json!({"field": "iso", "operator": ">", "value": 3200})];
        let clause = SearchService::build_where_clause(&filters).unwrap();
        assert!(clause.contains("e.iso > 3200"));
    }

    #[test]
    fn test_build_where_clause_star_equals() {
        let filters = vec![json!({"field": "star", "operator": "=", "value": 4})];
        let clause = SearchService::build_where_clause(&filters).unwrap();
        assert!(clause.contains("i.rating = 4"));
    }

    #[test]
    fn test_build_where_clause_multiple_filters() {
        let filters = vec![
            json!({"field": "iso", "operator": ">", "value": 1600}),
            json!({"field": "star", "operator": ">=", "value": 3}),
        ];
        let clause = SearchService::build_where_clause(&filters).unwrap();
        assert!(clause.contains("e.iso > 1600"));
        assert!(clause.contains("i.rating >= 3"));
        assert!(clause.contains("AND"));
    }

    #[test]
    fn test_build_where_clause_camera_like() {
        let filters = vec![json!({"field": "camera", "operator": ":", "value": "gfx"})];
        let clause = SearchService::build_where_clause(&filters).unwrap();
        assert!(clause.contains("LIKE '%gfx%'"));
    }

    #[test]
    fn test_build_where_clause_invalid_field() {
        let filters = vec![json!({"field": "invalid_field", "operator": "=", "value": "test"})];
        let result = SearchService::build_where_clause(&filters);
        assert!(result.is_err());
    }

    #[test]
    fn test_build_where_clause_empty_filters() {
        let filters = vec![];
        let clause = SearchService::build_where_clause(&filters).unwrap();
        assert_eq!(clause, "");
    }
}
