use crate::errors::ProcessingError;

#[derive(Debug, Clone, Copy)]
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

impl Default for PixelFilters {
    fn default() -> Self {
        Self {
            exposure: 0.0,
            contrast: 0.0,
            saturation: 1.0,
            highlights: 0.0,
            shadows: 0.0,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: 5500.0,
            tint: 0.0,
        }
    }
}

fn expected_rgba_len(width: u32, height: u32) -> Option<usize> {
    (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
}

pub fn apply_filters(
    pixels: &[u8],
    width: u32,
    height: u32,
    _filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError> {
    if width == 0 || height == 0 {
        return Err(ProcessingError::InvalidDimensions { width, height });
    }

    let expected = expected_rgba_len(width, height)
        .ok_or(ProcessingError::InvalidDimensions { width, height })?;

    if pixels.len() != expected {
        return Err(ProcessingError::InvalidPixelCount {
            expected,
            got: pixels.len(),
        });
    }

    Ok(pixels.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_filters_are_neutral() {
        let filters = PixelFilters::default();
        assert_eq!(filters.exposure, 0.0);
        assert_eq!(filters.contrast, 0.0);
        assert_eq!(filters.saturation, 1.0);
        assert_eq!(filters.color_temp, 5500.0);
    }

    #[test]
    fn apply_filters_returns_copy_when_input_valid() {
        let pixels = vec![10_u8, 20_u8, 30_u8, 255_u8];
        let filters = PixelFilters::default();

        let result = apply_filters(&pixels, 1, 1, &filters).expect("valid input");

        assert_eq!(result, pixels);
    }

    #[test]
    fn apply_filters_rejects_invalid_dimensions() {
        let pixels = vec![];
        let filters = PixelFilters::default();

        let result = apply_filters(&pixels, 0, 1, &filters);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidDimensions {
                width: 0,
                height: 1
            })
        ));
    }

    #[test]
    fn apply_filters_rejects_invalid_pixel_count() {
        let pixels = vec![1_u8, 2_u8, 3_u8];
        let filters = PixelFilters::default();

        let result = apply_filters(&pixels, 1, 1, &filters);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidPixelCount {
                expected: 4,
                got: 3
            })
        ));
    }
}
