/**
 * WASM Image Processor — Interfaced for web consumption
 * Utilise wasm-bindgen pour exposition TypeScript
 *
 * À compiler avec: wasm-pack build --target web
 */

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::services::image_processing::{apply_filters as apply_filters_lib, PixelFilters};

/// Structure WASM des filtres (mirroir pour wasm-bindgen)
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct PixelFilters {
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
impl PixelFilters {
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
    ) -> PixelFilters {
        PixelFilters {
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
}

/**
 * Applique les filtres pixel à un buffer RGBA (interface WASM)
 *
 * @param pixels_ptr - Pointeur vers buffer RGBA en mémoire WASM
 * @param width - Largeur en pixels
 * @param height - Hauteur en pixels
 * @param filters - Filtre état
 * @returns Nouvelle longueur du buffer (should equal input)
 * @throws Si les dimensions ou pixel count sont invalides
 */
#[wasm_bindgen]
pub fn apply_filters_wasm(
    pixels: &[u8],
    width: u32,
    height: u32,
    exposure: f32,
    contrast: f32,
    saturation: f32,
    highlights: f32,
    shadows: f32,
    clarity: f32,
    vibrance: f32,
    color_temp: f32,
    tint: f32,
) -> Result<Vec<u8>, JsValue> {
    let filters = PixelFilters {
        exposure,
        contrast,
        saturation,
        highlights,
        shadows,
        clarity,
        vibrance,
        color_temp,
        tint,
    };

    apply_filters_lib(pixels, width, height, &filters)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/**
 * Initialisation du module WASM
 * Appelé une seule fois au démarrage pour les setup globaux
 */
#[wasm_bindgen(start)]
pub fn init_wasm() {
    // Placeholder pour initialisation future (panic hooks, logging, etc.)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_pixel_filters_creation() {
        let filters = PixelFilters::new(0.5, 0.3, 1.2, 0.0, 0.0, 0.0, 0.0, 5500.0, 0.0);
        assert_eq!(filters.exposure, 0.5);
        assert_eq!(filters.contrast, 0.3);
    }

    #[test]
    fn test_apply_filters_wasm() {
        let pixels = vec![100u8, 100u8, 100u8, 255u8]; // RGBA
        let result = apply_filters_wasm(&pixels, 1, 1, 0.5, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 5500.0, 0.0);
        assert!(result.is_ok());

        let result_pixels = result.unwrap();
        assert_eq!(result_pixels.len(), 4);
        assert!(result_pixels[0] > 100); // exposure=0.5 should brighten
        assert_eq!(result_pixels[3], 255); // Alpha unchanged
    }

    #[test]
    fn test_apply_filters_wasm_invalid_dimensions() {
        let pixels = vec![];
        let result = apply_filters_wasm(&pixels, 0, 0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 5500.0, 0.0);
        assert!(result.is_err());
    }
}
