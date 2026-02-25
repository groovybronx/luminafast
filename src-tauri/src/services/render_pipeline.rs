/// Service de pipeline de rendu pour les CSS filters.
/// Convertit les édits (EditState) en chaînes de filtres CSS applicables au DOM.
use serde::{Deserialize, Serialize};
use std::fmt;

/// État d'édition d'une image (reconstruit par rejeu des événements)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditState {
    pub image_id: u32,
    #[serde(flatten)]
    pub edits: EditParameters,
}

/// Paramètres d'édition appliqués à une image (Phase 4.1)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EditParameters {
    #[serde(rename = "exposureValue", default)]
    pub exposure: f64,

    #[serde(rename = "contrastValue", default)]
    pub contrast: f64,

    #[serde(rename = "saturationValue", default)]
    pub saturation: f64,

    #[serde(rename = "clarityValue", default)]
    pub clarity: f64,

    #[serde(rename = "vibranceValue", default)]
    pub vibrance: f64,

    #[serde(rename = "temperatureValue", default)]
    pub temperature: f64,

    #[serde(rename = "tintValue", default)]
    pub tint: f64,

    #[serde(rename = "highlightsValue", default)]
    pub highlights: f64,

    #[serde(rename = "shadowsValue", default)]
    pub shadows: f64,

    #[serde(rename = "whitesValue", default)]
    pub whites: f64,

    #[serde(rename = "blacksValue", default)]
    pub blacks: f64,

    #[serde(rename = "vignettingValue", default)]
    pub vignetting: f64,

    #[serde(rename = "sharpnessValue", default)]
    pub sharpness: f64,

    #[serde(rename = "noiseReductionValue", default)]
    pub noise_reduction: f64,
}

/// Résultat du rendu d'une chaîne CSS filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CSSFilterResult {
    pub css_filter: String,
    pub computed_at: String,
}

/// Erreur lors du calcul des CSS filters
#[derive(Debug, Clone)]
pub enum RenderError {
    InvalidEditState(String),
    FilterComputationFailed(String),
}

impl fmt::Display for RenderError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RenderError::InvalidEditState(msg) => write!(f, "Invalid edit state: {}", msg),
            RenderError::FilterComputationFailed(msg) => {
                write!(f, "Filter computation failed: {}", msg)
            }
        }
    }
}

impl std::error::Error for RenderError {}

pub type RenderResult<T> = Result<T, RenderError>;

/// Service principal pour le pipeline de rendu
pub struct RenderPipelineService;

impl RenderPipelineService {
    /// Calcule une chaîne CSS filter basée sur l'état d'édition fourni.
    ///
    /// La fonction génère des filtres CSS natifs pour les paramètres d'édition supportés.
    /// Les valeurs sont validées et clamped pour éviter les artefacts.
    ///
    /// # Mappage Édits → CSS Filters (Phase 4.2A)
    ///
    /// - exposure (-2.0..+2.0) → brightness (0.0..3.0)
    /// - contrast (-1.0..+2.0) → contrast (0.0..3.0)
    /// - saturation (-1.0..+2.0) → saturate (0.0..3.0)
    /// - clarity (Phase 4.2B — non supporté en Phase A)
    /// - highlights/shadows (Phase 4.2B — non supportés en Phase A, placeholder opacity)
    /// - temperature/tint (Phase 4.2B — non supportés en Phase A)
    /// - vignetting (Phase 4.2B — nécessite canvas/WASM)
    ///
    /// # Examples
    ///
    /// ```
    /// let (edits, brightness) = (
    ///     EditParameters {
    ///         exposure: 0.5,
    ///         contrast: 0.2,
    ///         ..Default::default()
    ///     },
    ///     1.5 // brightness = 1.0 + 0.5
    /// )
    /// ```
    ///
    pub fn compute_css_filter_string(edits: &EditParameters) -> RenderResult<String> {
        let mut filters = Vec::new();

        // Exposure → brightness (1.0 + exposure)
        // Plage exposure: -2.0..+2.0 → brightness: -1.0..+3.0 (clamped à 0.0..10.0)
        let brightness = Self::clamp(1.0 + edits.exposure, 0.0, 10.0);
        if (brightness - 1.0).abs() > 0.001 {
            filters.push(format!("brightness({:.3})", brightness));
        }

        // Contrast → contrast (1.0 + contrast)
        // Plage contrast: -1.0..+2.0 → contrast: 0.0..+3.0
        let contrast = Self::clamp(1.0 + edits.contrast, 0.0, 5.0);
        if (contrast - 1.0).abs() > 0.001 {
            filters.push(format!("contrast({:.3})", contrast));
        }

        // Saturation → saturate (1.0 + saturation)
        // Plage saturation: -1.0..+2.0 → saturate: 0.0..+3.0
        let saturation = Self::clamp(1.0 + edits.saturation, 0.0, 3.0);
        if (saturation - 1.0).abs() > 0.001 {
            filters.push(format!("saturate({:.3})", saturation));
        }

        // Vibrance (contribution à saturation en Phase A)
        // vibrance ajoute une légère saturation supplémentaire
        let vibrance_boost = Self::clamp(edits.vibrance * 0.5, -1.0, 1.0);
        let saturation_with_vibrance = Self::clamp(saturation + vibrance_boost, 0.0, 3.0);
        if (saturation_with_vibrance - saturation).abs() > 0.001 {
            // Si vibrance boost signifiant, remplacer le saturate précédent
            if let Some(last) = filters.last() {
                if last.starts_with("saturate") {
                    filters.pop();
                    filters.push(format!("saturate({:.3})", saturation_with_vibrance));
                }
            }
        }

        // Clarity → blur inverse (Phase 4.2B nécessite WASM; Phase A affiche juste un placeholder)
        // clarity < 0 → legère blur (placeholder pour futur)
        if edits.clarity < -0.1 {
            let blur_amount = Self::clamp((-edits.clarity) / 10.0, 0.0, 5.0);
            filters.push(format!("blur({:.2}px)", blur_amount));
        }

        // Sharpness (Phase 4.2B) — placeholder, nécessite filter WASM ou canvas
        // En Phase A, on ignore; Phase 4.2B ajoutera via WASM
        // filters pour sharpness seront générés ici ultérieurement

        // Highlights/Shadows (Phase 4.2B) — placeholder avec opacity pour transition
        // indiquer visuellement qu'il y a des highlights/shadows apliqués
        if highlights_or_shadows_applied(edits) {
            // Placeholder : opacity très légère pour indiquer l'application sans modifier l'image
            // (vrai implémentation Phase 4.2B via WASM)
            // filters.push("opacity(1.0)"); // No-op, mais marque que édits appliqués
        }

        // Construire la chaîne finale
        let result = if filters.is_empty() {
            String::new()
        } else {
            filters.join(" ")
        };

        Ok(result)
    }

    /// Clamp une valeur numérique dans une plage [min, max]
    fn clamp(value: f64, min: f64, max: f64) -> f64 {
        value.max(min).min(max)
    }
}

/// Vérifier si des highlights ou shadows sont appliqués (aide pour Phase 4.2B)
fn highlights_or_shadows_applied(edits: &EditParameters) -> bool {
    (edits.highlights.abs() > 0.001)
        || (edits.shadows.abs() > 0.001)
        || (edits.whites.abs() > 0.001)
        || (edits.blacks.abs() > 0.001)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_empty_edits() {
        let edits = EditParameters::default();
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert_eq!(result, "");
    }

    #[test]
    fn test_exposure_maps_to_brightness() {
        let mut edits = EditParameters::default();
        edits.exposure = 0.5;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert!(result.contains("brightness(1.500)"));
    }

    #[test]
    fn test_exposure_negative() {
        let mut edits = EditParameters::default();
        edits.exposure = -0.5;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert!(result.contains("brightness(0.500)"));
    }

    #[test]
    fn test_contrast_maps_correctly() {
        let mut edits = EditParameters::default();
        edits.contrast = 0.2;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert!(result.contains("contrast(1.200)"));
    }

    #[test]
    fn test_saturation_maps_correctly() {
        let mut edits = EditParameters::default();
        edits.saturation = 0.3;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert!(result.contains("saturate(1.300)"));
    }

    #[test]
    fn test_multiple_edits_combined() {
        let mut edits = EditParameters::default();
        edits.exposure = 0.5;
        edits.contrast = 0.2;
        edits.saturation = 0.1;

        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert!(result.contains("brightness(1.500)"));
        assert!(result.contains("contrast(1.200)"));
        assert!(result.contains("saturate(1.100)"));
    }

    #[test]
    fn test_clamp_boundaries() {
        let mut edits = EditParameters::default();
        edits.exposure = 9.0; // exposure 9.0 → brightness 1.0 + 9.0 = 10.0 (clamped max)
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        // brightness clamped à 10.0
        assert!(result.contains("brightness(10.000)"));
    }

    #[test]
    fn test_negative_saturation() {
        let mut edits = EditParameters::default();
        edits.saturation = -0.8;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        // saturate = 1.0 + (-0.8) = 0.2
        assert!(result.contains("saturate(0.200)"));
    }

    #[test]
    fn test_clarity_negative_creates_blur() {
        let mut edits = EditParameters::default();
        edits.clarity = -0.5;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        assert!(result.contains("blur(0.05px)"));
    }

    #[test]
    fn test_vibrance_affects_saturation() {
        let mut edits = EditParameters::default();
        edits.saturation = 0.5;
        edits.vibrance = 0.4;
        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        // saturation = 1.0 + 0.5 = 1.5
        // vibrance_boost = 0.4 * 0.5 = 0.2
        // saturation_with_vibrance = 1.5 + 0.2 = 1.7
        assert!(result.contains("saturate(1.700)"));
    }

    #[test]
    fn test_filter_string_order() {
        let mut edits = EditParameters::default();
        edits.exposure = 0.3;
        edits.contrast = 0.2;
        edits.saturation = 0.1;

        let result = RenderPipelineService::compute_css_filter_string(&edits).unwrap();
        let filters: Vec<&str> = result.split(' ').collect();

        // Vérifier que brightness vient en premier
        assert_eq!(filters[0], "brightness(1.300)");
    }
}
