use crate::errors::ProcessingError;

const LINEAR_RGB_CHANNELS: usize = 3;

fn expected_linear_rgb_len(width: u32, height: u32) -> Option<usize> {
    (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(LINEAR_RGB_CHANNELS))
}

#[derive(Debug, Clone, PartialEq)]
pub struct LinearImage {
    pub width: u32,
    pub height: u32,
    pub pixels_rgb_f32: Vec<f32>,
}

impl LinearImage {
    pub fn new(width: u32, height: u32, pixels_rgb_f32: Vec<f32>) -> Result<Self, ProcessingError> {
        if width == 0 || height == 0 {
            return Err(ProcessingError::InvalidDimensions { width, height });
        }

        let expected = expected_linear_rgb_len(width, height)
            .ok_or(ProcessingError::InvalidDimensions { width, height })?;

        if pixels_rgb_f32.len() != expected {
            return Err(ProcessingError::InvalidPixelCount {
                expected,
                got: pixels_rgb_f32.len(),
            });
        }

        for (index, sample) in pixels_rgb_f32.iter().enumerate() {
            if !sample.is_finite() {
                return Err(ProcessingError::InvalidFilterValue {
                    field: format!("pixels_rgb_f32[{index}]"),
                    value: *sample,
                });
            }
        }

        Ok(Self {
            width,
            height,
            pixels_rgb_f32,
        })
    }
}

pub trait RawDecoder {
    fn decode_to_linear_rgb(&self, input: &[u8]) -> Result<LinearImage, ProcessingError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn linear_image_rejects_invalid_dimensions() {
        let result = LinearImage::new(0, 1, vec![]);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidDimensions {
                width: 0,
                height: 1
            })
        ));
    }

    #[test]
    fn linear_image_rejects_invalid_pixel_count() {
        let result = LinearImage::new(1, 1, vec![0.1, 0.2]);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidPixelCount {
                expected: 3,
                got: 2
            })
        ));
    }

    #[test]
    fn linear_image_rejects_non_finite_samples() {
        let result = LinearImage::new(1, 1, vec![f32::NAN, 0.0, 1.0]);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidFilterValue { field, .. }) if field == "pixels_rgb_f32[0]"
        ));
    }
}
