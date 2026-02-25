use crate::database::Database;
/// Tauri commands pour le pipeline de rendu d'images.
/// Expose les fonctionnalités de calcul de CSS filters au frontend.
use crate::services::edit_sourcing::EditSourcingService;
use crate::services::render_pipeline::{EditParameters, RenderPipelineService};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::State;

/// Application state containing the database connection
pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

/// DTO retourné par compute_css_filters
/// Contient la chaîne CSS filter calculée et l'horodatage du calcul.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterStringDTO {
    #[serde(rename = "cssFilter")]
    pub css_filter: String,

    #[serde(rename = "computedAt")]
    pub computed_at: String,
}

/// DTO retourné par get_render_info
/// Contient les métadonnées de rendu (dimension, format, orientation).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderInfoDTO {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub orientation: u32,
}

/// Calcule la chaîne CSS filter pour une image basée sur son état d'édition courant.
///
/// # Arguments
///
/// * `image_id` - ID de l'image dans la base de données
/// * `state` - Application state contenant la connexion à la base de données
///
/// # Retours
///
/// Retourne une structure FilterStringDTO contenant :
/// - `css_filter` : Chaîne CSS filter (ex: "brightness(1.2) contrast(1.1) saturate(0.9)")
/// - `computed_at` : Horodatage ISO 8601 du moment du calcul
///
/// # Erreurs
///
/// Retourne une chaîne d'erreur si :
/// - L'image n'existe pas en DB
/// - L'appel à get_current_edit_state échoue
/// - Le calcul du CSS filter échoue
///
#[tauri::command]
pub async fn compute_css_filters(
    image_id: i64,
    state: State<'_, AppState>,
) -> Result<FilterStringDTO, String> {
    // Valider l'ID image
    if image_id <= 0 {
        return Err("Invalid image_id: must be > 0".to_string());
    }

    // Charger l'état d'édition courant depuis Phase 4.1
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("Database lock failed: {}", e))?;

    let edit_state_dto = EditSourcingService::get_current_edit_state(&mut db_guard, image_id)
        .map_err(|e| format!("Failed to load edit state: {}", e))?;

    // Transformer le Map<String, f64> en EditParameters struct
    let edit_params = map_state_to_edit_parameters(&edit_state_dto.state);

    // Calculer la chaîne CSS filter
    let css_filter = RenderPipelineService::compute_css_filter_string(&edit_params)
        .map_err(|e| format!("Filter computation failed: {}", e))?;

    // Retourner le DTO avec horodatage courant
    let computed_at = chrono::Local::now().to_rfc3339();

    Ok(FilterStringDTO {
        css_filter,
        computed_at,
    })
}

/// Récupère les métadonnées de rendu pour une image.
///
/// # Arguments
///
/// * `image_id` - ID de l'image
/// * `state` - Application state contenant la connexion à la base de données
///
/// # Retours
///
/// Retourne une structure RenderInfoDTO contenant les métadonnées de l'image :
/// - width : Largeur en pixels
/// - height : Hauteur en pixels
/// - format : Type de format ('jpeg', 'png', 'webp', etc.)
/// - orientation : Convention EXIF orientation (1-8)
///
/// # Erreurs
///
/// Retourne une chaîne d'erreur si l'image n'existe pas.
///
#[tauri::command]
pub async fn get_render_info(
    image_id: i64,
    state: State<'_, AppState>,
) -> Result<RenderInfoDTO, String> {
    if image_id <= 0 {
        return Err("Invalid image_id: must be > 0".to_string());
    }

    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("Database lock failed: {}", e))?;

    // Query la table images pour obtenir width, height et extraire le format du filename
    let info = db_guard
        .connection()
        .query_row(
            "SELECT width, height, filename FROM images WHERE id = ?",
            [image_id],
            |row: &rusqlite::Row| {
                let width: u32 = row.get(0)?;
                let height: u32 = row.get(1)?;
                let filename: String = row.get(2)?;

                // Extraire le format du filename (extension)
                let format = extract_format(&filename);

                Ok((width, height, format))
            },
        )
        .map_err(|e| format!("Image not found: {}", e))?;

    Ok(RenderInfoDTO {
        width: info.0,
        height: info.1,
        format: info.2,
        orientation: 1, // Default EXIF orientation (no rotation)
    })
}

/// Transforme le Map<String, f64> retourné par EditStateDTO en EditParameters
/// pour la compatibilité avec le service RenderPipelineService.
fn map_state_to_edit_parameters(state: &std::collections::HashMap<String, f64>) -> EditParameters {
    EditParameters {
        exposure: state.get("exposureValue").copied().unwrap_or(0.0),
        contrast: state.get("contrastValue").copied().unwrap_or(0.0),
        saturation: state.get("saturationValue").copied().unwrap_or(0.0),
        clarity: state.get("clarityValue").copied().unwrap_or(0.0),
        vibrance: state.get("vibranceValue").copied().unwrap_or(0.0),
        temperature: state.get("temperatureValue").copied().unwrap_or(0.0),
        tint: state.get("tintValue").copied().unwrap_or(0.0),
        highlights: state.get("highlightsValue").copied().unwrap_or(0.0),
        shadows: state.get("shadowsValue").copied().unwrap_or(0.0),
        whites: state.get("whitesValue").copied().unwrap_or(0.0),
        blacks: state.get("blacksValue").copied().unwrap_or(0.0),
        vignetting: state.get("vignettingValue").copied().unwrap_or(0.0),
        sharpness: state.get("sharpnessValue").copied().unwrap_or(0.0),
        noise_reduction: state.get("noiseReductionValue").copied().unwrap_or(0.0),
    }
}

/// Extrait le format (extension) d'un nom de fichier.
fn extract_format(filename: &str) -> String {
    if let Some(pos) = filename.rfind('.') {
        filename[pos + 1..].to_lowercase()
    } else {
        "unknown".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_format_jpeg() {
        assert_eq!(extract_format("photo.jpg"), "jpg");
        assert_eq!(extract_format("image.JPEG"), "jpeg");
    }

    #[test]
    fn test_extract_format_png() {
        assert_eq!(extract_format("screenshot.png"), "png");
    }

    #[test]
    fn test_extract_format_no_extension() {
        assert_eq!(extract_format("image"), "unknown");
    }

    #[test]
    fn test_map_state_empty() {
        let state = std::collections::HashMap::new();
        let params = map_state_to_edit_parameters(&state);
        assert_eq!(params.exposure, 0.0);
        assert_eq!(params.contrast, 0.0);
    }

    #[test]
    fn test_map_state_with_values() {
        let mut state = std::collections::HashMap::new();
        state.insert("exposureValue".to_string(), 0.5);
        state.insert("contrastValue".to_string(), 0.2);

        let params = map_state_to_edit_parameters(&state);
        assert_eq!(params.exposure, 0.5);
        assert_eq!(params.contrast, 0.2);
        assert_eq!(params.vibrance, 0.0); // Devrait avoir une valeur par défaut
    }
}
