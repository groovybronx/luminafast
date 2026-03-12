//! Legacy compatibility module for backend image processing.
//!
//! Since M3.1, backend processing must use the shared core crate
//! (`luminafast-image-core`) to guarantee parity with WASM preview.

pub use luminafast_image_core::{PixelFilters, ProcessingError};

#[deprecated(
    note = "Use services::export_rendering::render_pixels_for_export for backend export rendering"
)]
pub fn apply_filters(
    pixels: &[u8],
    width: u32,
    height: u32,
    filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError> {
    luminafast_image_core::apply_filters(pixels, width, height, filters)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[allow(deprecated)]
    #[test]
    fn test_apply_filters_delegates_to_core() {
        let pixels = vec![100_u8, 100_u8, 100_u8, 255_u8];
        let filters = PixelFilters {
            exposure: 1.0,
            ..PixelFilters::default()
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        assert!(result[0] > 100);
        assert_eq!(result[3], 255);
    }

    #[allow(deprecated)]
    #[test]
    fn test_apply_filters_keeps_core_error_contract() {
        let pixels = vec![];
        let filters = PixelFilters::default();

        let result = apply_filters(&pixels, 0, 0, &filters);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidDimensions {
                width: 0,
                height: 0
            })
        ));
    }
}
