//! Backend export rendering service (M3.1).
//!
//! This module is the backend entry point for edited export rendering and
//! delegates pixel algorithms to the shared core crate.

use luminafast_image_core::{apply_filters, PixelFilters, ProcessingError};

/// Renders an edited RGBA pixel buffer for export using the shared core engine.
pub fn render_pixels_for_export(
    pixels: &[u8],
    width: u32,
    height: u32,
    filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError> {
    apply_filters(pixels, width, height, filters)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_pixels_for_export_applies_filters() {
        let pixels = vec![100_u8, 100_u8, 100_u8, 255_u8];
        let filters = PixelFilters {
            exposure: 1.0,
            ..PixelFilters::default()
        };

        let result = render_pixels_for_export(&pixels, 1, 1, &filters).unwrap();

        assert!(result[0] > 100);
        assert!(result[1] > 100);
        assert!(result[2] > 100);
        assert_eq!(result[3], 255);
    }

    #[test]
    fn test_render_pixels_for_export_rejects_invalid_dimensions() {
        let pixels = vec![];
        let filters = PixelFilters::default();

        let result = render_pixels_for_export(&pixels, 0, 0, &filters);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidDimensions {
                width: 0,
                height: 0,
            })
        ));
    }
}
