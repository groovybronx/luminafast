/**
 * LuminaFast WASM Library
 * Exposes ONLY pixel processing functions for web consumption
 * Compiled with: wasm-pack build --lib
 */

pub mod services {
    pub mod image_processing;
}

// Re-export pour WASM
pub use services::image_processing::{apply_filters, PixelFilters, ProcessingError};

// WASM module wrapper
#[cfg(target_arch = "wasm32")]
pub mod wasm_bindgen {
    use super::*;
    use wasm_bindgen::prelude::*;

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

            super::apply_filters(pixels, width, height, &filters)
                .map_err(|e| JsValue::from_str(&e.to_string()))
        }
    }
}
