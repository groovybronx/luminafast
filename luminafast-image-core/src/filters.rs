use crate::errors::ProcessingError;
use crate::pipeline::{validate_rgba_input, ImagePipeline, ImagePipelineStep};

pub const EPSILON: f32 = 0.001;
pub const EXPOSURE_MIN: f32 = -2.0;
pub const EXPOSURE_MAX: f32 = 2.0;
pub const EXPOSURE_NOOP: f32 = 0.0;
pub const CONTRAST_MIN: f32 = -1.0;
pub const CONTRAST_MAX: f32 = 3.0;
pub const CONTRAST_NOOP: f32 = 0.0;
pub const SATURATION_MIN: f32 = 0.0;
pub const SATURATION_MAX: f32 = 2.0;
pub const SATURATION_NOOP: f32 = 1.0;
pub const HIGHLIGHTS_MIN: f32 = -1.0;
pub const HIGHLIGHTS_MAX: f32 = 1.0;
pub const HIGHLIGHTS_NOOP: f32 = 0.0;
pub const SHADOWS_MIN: f32 = -1.0;
pub const SHADOWS_MAX: f32 = 1.0;
pub const SHADOWS_NOOP: f32 = 0.0;
pub const COLOR_TEMP_MIN: f32 = 2000.0;
pub const COLOR_TEMP_MAX: f32 = 10000.0;
pub const COLOR_TEMP_NOOP: f32 = 5500.0;
pub const TINT_MIN: f32 = -50.0;
pub const TINT_MAX: f32 = 50.0;
pub const TINT_NOOP: f32 = 0.0;

#[derive(Debug, Clone, Copy)]
pub struct PixelFilters {
    /// Exposure range: [-2.0, 2.0], no-op: 0.0.
    pub exposure: f32,
    /// Contrast range: [-1.0, 3.0], no-op: 0.0.
    pub contrast: f32,
    /// Saturation range: [0.0, 2.0], no-op: 1.0.
    pub saturation: f32,
    /// Highlights range: [-1.0, 1.0], no-op: 0.0.
    pub highlights: f32,
    /// Shadows range: [-1.0, 1.0], no-op: 0.0.
    pub shadows: f32,
    /// Reserved in v1, no-op for algorithm.
    pub clarity: f32,
    /// Reserved in v1, no-op for algorithm.
    pub vibrance: f32,
    /// Color temperature range: [2000.0, 10000.0], no-op: 5500.0.
    pub color_temp: f32,
    /// Tint range: [-50.0, 50.0], no-op: 0.0.
    pub tint: f32,
}

impl Default for PixelFilters {
    fn default() -> Self {
        Self {
            exposure: EXPOSURE_NOOP,
            contrast: CONTRAST_NOOP,
            saturation: SATURATION_NOOP,
            highlights: HIGHLIGHTS_NOOP,
            shadows: SHADOWS_NOOP,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: COLOR_TEMP_NOOP,
            tint: TINT_NOOP,
        }
    }
}

#[derive(Clone, Copy)]
struct FilterTransformStep {
    filters: PixelFilters,
}

impl FilterTransformStep {
    fn new(filters: PixelFilters) -> Self {
        Self { filters }
    }
}

impl ImagePipelineStep for FilterTransformStep {
    fn apply(&self, pixels: &mut [u8], _width: u32, _height: u32) -> Result<(), ProcessingError> {
        apply_filters_single_pass(pixels, &self.filters);
        Ok(())
    }
}

fn apply_filters_single_pass(pixels: &mut [u8], filters: &PixelFilters) {
    for chunk in pixels.chunks_exact_mut(4) {
        let mut r = chunk[0] as f32;
        let mut g = chunk[1] as f32;
        let mut b = chunk[2] as f32;

        if (filters.exposure - EXPOSURE_NOOP).abs() >= EPSILON {
            let exposure = filters.exposure.clamp(EXPOSURE_MIN, EXPOSURE_MAX);
            let brightness_factor = 1.0 + exposure * 0.15;
            r *= brightness_factor;
            g *= brightness_factor;
            b *= brightness_factor;
        }

        if (filters.contrast - CONTRAST_NOOP).abs() >= EPSILON {
            let contrast = filters.contrast.clamp(CONTRAST_MIN, CONTRAST_MAX);
            let contrast_factor = 1.0 + contrast * 0.25;
            r = (r - 128.0) * contrast_factor + 128.0;
            g = (g - 128.0) * contrast_factor + 128.0;
            b = (b - 128.0) * contrast_factor + 128.0;
        }

        if (filters.saturation - SATURATION_NOOP).abs() >= EPSILON {
            let saturation = filters.saturation.clamp(SATURATION_MIN, SATURATION_MAX);
            let luma = 0.299 * r + 0.587 * g + 0.114 * b;
            r = luma + (r - luma) * saturation;
            g = luma + (g - luma) * saturation;
            b = luma + (b - luma) * saturation;
        }

        if (filters.highlights - HIGHLIGHTS_NOOP).abs() >= EPSILON {
            let highlight = filters.highlights.clamp(HIGHLIGHTS_MIN, HIGHLIGHTS_MAX);
            let luma = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            if luma > 180 {
                let factor = (1.0 + highlight * 0.3).clamp(0.7, 1.3);
                r *= factor;
                g *= factor;
                b *= factor;
            }
        }

        if (filters.shadows - SHADOWS_NOOP).abs() >= EPSILON {
            let shadow = filters.shadows.clamp(SHADOWS_MIN, SHADOWS_MAX);
            let luma = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            if luma < 75 {
                let factor = (1.0 + shadow * 0.3).clamp(0.7, 1.3);
                r *= factor;
                g *= factor;
                b *= factor;
            }
        }

        if (filters.color_temp - COLOR_TEMP_NOOP).abs() >= EPSILON {
            let color_temp = filters.color_temp.clamp(COLOR_TEMP_MIN, COLOR_TEMP_MAX);
            let temp_offset = (color_temp - COLOR_TEMP_NOOP) / 1000.0;
            let red_factor = 1.0 + (temp_offset * -0.1).clamp(-0.3, 0.3);
            let blue_factor = 1.0 + (temp_offset * 0.1).clamp(-0.3, 0.3);
            r *= red_factor;
            b *= blue_factor;
        }

        if (filters.tint - TINT_NOOP).abs() >= EPSILON {
            let tint = filters.tint.clamp(TINT_MIN, TINT_MAX);
            let green_factor = 1.0 + (tint / 50.0) * 0.2;
            let magenta_factor = 1.0 - (tint / 50.0) * 0.1;
            r *= magenta_factor;
            g *= green_factor;
            b *= magenta_factor;
        }

        chunk[0] = r.clamp(0.0, 255.0) as u8;
        chunk[1] = g.clamp(0.0, 255.0) as u8;
        chunk[2] = b.clamp(0.0, 255.0) as u8;
    }
}

pub fn apply_filters(
    pixels: &[u8],
    width: u32,
    height: u32,
    filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError> {
    validate_rgba_input(pixels, width, height)?;

    let mut result = pixels.to_vec();

    let exposure_active = (filters.exposure - EXPOSURE_NOOP).abs() >= EPSILON;
    let contrast_active = (filters.contrast - CONTRAST_NOOP).abs() >= EPSILON;
    let saturation_active = (filters.saturation - SATURATION_NOOP).abs() >= EPSILON;
    let highlights_active = (filters.highlights - HIGHLIGHTS_NOOP).abs() >= EPSILON;
    let shadows_active = (filters.shadows - SHADOWS_NOOP).abs() >= EPSILON;
    let color_temp_active = (filters.color_temp - COLOR_TEMP_NOOP).abs() >= EPSILON;
    let tint_active = (filters.tint - TINT_NOOP).abs() >= EPSILON;

    if !exposure_active
        && !contrast_active
        && !saturation_active
        && !highlights_active
        && !shadows_active
        && !color_temp_active
        && !tint_active
    {
        return Ok(result);
    }

    let pipeline = ImagePipeline::new().with_step(FilterTransformStep::new(*filters));
    debug_assert!(!pipeline.is_empty());
    pipeline.execute(&mut result, width, height)?;

    Ok(result)
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
    fn apply_filters_returns_copy_when_input_is_noop() {
        let pixels = vec![100_u8, 150_u8, 200_u8, 255_u8];
        let filters = PixelFilters::default();

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

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

    #[test]
    fn apply_filters_exposure_brightens_pixel() {
        let pixels = vec![100_u8, 100_u8, 100_u8, 255_u8];
        let filters = PixelFilters {
            exposure: 1.0,
            ..PixelFilters::default()
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        assert!(result[0] > 100);
        assert!(result[1] > 100);
        assert!(result[2] > 100);
        assert_eq!(result[3], 255);
    }

    #[test]
    fn apply_filters_saturation_zero_makes_grayscale() {
        let pixels = vec![255_u8, 128_u8, 64_u8, 255_u8];
        let filters = PixelFilters {
            saturation: 0.0,
            ..PixelFilters::default()
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        assert_eq!(result[0], result[1]);
        assert_eq!(result[1], result[2]);
        assert_eq!(result[3], 255);
    }

    #[test]
    fn apply_filters_preserves_alpha_channel() {
        let pixels = vec![20_u8, 40_u8, 80_u8, 7_u8];
        let filters = PixelFilters {
            exposure: 1.5,
            contrast: 1.0,
            saturation: 1.3,
            ..PixelFilters::default()
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        assert_eq!(result[3], 7);
    }
}
