/**
 * LuminaFast WASM Library — Pixel Processing
 *
 * Crate séparée zero-dependency desktop pour compilation WebAssembly.
 * Le moteur algorithmique est fourni par `luminafast-image-core`.
 */

// Réexports publics depuis le core partagé (contrat unifié backend/WASM)
pub use luminafast_image_core::{
    apply_filters, compute_histogram_from_pixels, PixelFilters, ProcessingError,
};

use wasm_bindgen::prelude::*;

/// Wrapper WASM pour PixelFilters
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct PixelFiltersWasm {
    pub exposure: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub highlights: f32,
    pub shadows: f32,
    pub clarity: f32,
    pub vibrance: f32,
    pub color_temp: f32,
    pub tint: f32,
}

#[wasm_bindgen]
impl PixelFiltersWasm {
    #[wasm_bindgen(constructor)]
    pub fn new(
        exposure: f32,
        contrast: f32,
        saturation: f32,
        highlights: f32,
        shadows: f32,
        clarity: f32,
        vibrance: f32,
        color_temp: f32,
        tint: f32,
    ) -> PixelFiltersWasm {
        PixelFiltersWasm {
            exposure,
            contrast,
            saturation,
            highlights,
            shadows,
            clarity,
            vibrance,
            color_temp,
            tint,
        }
    }

    /// Applique tous les filtres pixel
    #[wasm_bindgen]
    pub fn apply_filters(
        &self,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) -> Result<Vec<u8>, JsValue> {
        let filters = PixelFilters {
            exposure: self.exposure,
            contrast: self.contrast,
            saturation: self.saturation,
            highlights: self.highlights,
            shadows: self.shadows,
            clarity: self.clarity,
            vibrance: self.vibrance,
            color_temp: self.color_temp,
            tint: self.tint,
        };

        apply_filters(pixels, width, height, &filters)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

/// Calcule l'histogramme RGB d'une image RGBA.
///
/// Retourne un Uint32Array de 768 valeurs : r[0..256] ++ g[0..256] ++ b[0..256].
/// Chaque bin = nombre de pixels avec cette valeur pour ce canal.
///
/// @param pixels - Buffer RGBA (ImageData.data — Uint8ClampedArray ou &[u8])
/// @param width  - Largeur en pixels
/// @param height - Hauteur en pixels
#[wasm_bindgen]
pub fn compute_histogram(pixels: &[u8], width: u32, height: u32) -> Result<Vec<u32>, JsValue> {
    compute_histogram_from_pixels(pixels, width, height)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pixel_filters_wasm_apply_filters_keeps_noop_pixels() {
        let filters = PixelFiltersWasm::new(0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 5500.0, 0.0);
        let pixels = vec![100_u8, 150_u8, 200_u8, 255_u8];

        let result = filters
            .apply_filters(&pixels, 1, 1)
            .expect("WASM wrapper should apply core filters without error");

        assert_eq!(result, pixels);
    }

    #[test]
    fn compute_histogram_wrapper_returns_768_bins() {
        let pixels = vec![255_u8, 0_u8, 0_u8, 255_u8];

        let histogram =
            compute_histogram(&pixels, 1, 1).expect("WASM wrapper should return core histogram");

        assert_eq!(histogram.len(), 768);
        assert_eq!(histogram[255], 1);
        assert_eq!(histogram[256], 1);
        assert_eq!(histogram[512], 1);
    }
}
