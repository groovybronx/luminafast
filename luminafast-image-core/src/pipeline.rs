use crate::errors::ProcessingError;
use crate::raw_decoder::{LinearImage, RawDecoder};

pub trait ImagePipelineStep {
    fn apply(&self, pixels: &mut [u8], width: u32, height: u32) -> Result<(), ProcessingError>;
}

#[derive(Default)]
pub struct ImagePipeline {
    steps: Vec<Box<dyn ImagePipelineStep>>,
}

impl ImagePipeline {
    pub fn new() -> Self {
        Self { steps: Vec::new() }
    }

    pub fn with_step(mut self, step: impl ImagePipelineStep + 'static) -> Self {
        self.steps.push(Box::new(step));
        self
    }

    pub fn add_step(&mut self, step: impl ImagePipelineStep + 'static) {
        self.steps.push(Box::new(step));
    }

    pub fn is_empty(&self) -> bool {
        self.steps.is_empty()
    }

    pub fn execute(
        &self,
        pixels: &mut [u8],
        width: u32,
        height: u32,
    ) -> Result<(), ProcessingError> {
        validate_rgba_input(pixels, width, height)?;

        for step in &self.steps {
            step.apply(pixels, width, height)?;
        }

        Ok(())
    }

    pub fn execute_on_linear_image(
        &self,
        linear_image: &LinearImage,
    ) -> Result<Vec<u8>, ProcessingError> {
        let (mut rgba_pixels, width, height) = linear_image_to_rgba8(linear_image)?;
        self.execute(&mut rgba_pixels, width, height)?;
        Ok(rgba_pixels)
    }
}

pub(crate) fn expected_rgba_len(width: u32, height: u32) -> Option<usize> {
    (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
}

pub fn validate_rgba_input(pixels: &[u8], width: u32, height: u32) -> Result<(), ProcessingError> {
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

    Ok(())
}

pub fn decode_raw_to_rgba8(
    decoder: &dyn RawDecoder,
    input: &[u8],
) -> Result<(Vec<u8>, u32, u32), ProcessingError> {
    let linear_image = decoder.decode_to_linear_rgb(input)?;
    linear_image_to_rgba8(&linear_image)
}

fn linear_image_to_rgba8(
    linear_image: &LinearImage,
) -> Result<(Vec<u8>, u32, u32), ProcessingError> {
    let width = linear_image.width;
    let height = linear_image.height;

    if width == 0 || height == 0 {
        return Err(ProcessingError::InvalidDimensions { width, height });
    }

    let expected_rgb = (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(3))
        .ok_or(ProcessingError::InvalidDimensions { width, height })?;

    if linear_image.pixels_rgb_f32.len() != expected_rgb {
        return Err(ProcessingError::InvalidPixelCount {
            expected: expected_rgb,
            got: linear_image.pixels_rgb_f32.len(),
        });
    }

    let mut rgba = Vec::with_capacity(
        (width as usize)
            .checked_mul(height as usize)
            .and_then(|px| px.checked_mul(4))
            .ok_or(ProcessingError::InvalidDimensions { width, height })?,
    );

    for (index, rgb) in linear_image.pixels_rgb_f32.chunks_exact(3).enumerate() {
        for (channel, sample) in rgb.iter().enumerate() {
            if !sample.is_finite() {
                return Err(ProcessingError::InvalidFilterValue {
                    field: format!("pixels_rgb_f32[{}]", index * 3 + channel),
                    value: *sample,
                });
            }
            rgba.push((sample.clamp(0.0, 1.0) * 255.0).round() as u8);
        }

        rgba.push(255_u8);
    }

    Ok((rgba, width, height))
}

#[cfg(test)]
mod tests {
    use super::*;

    struct SetChannelStep {
        channel: usize,
        value: u8,
    }

    impl ImagePipelineStep for SetChannelStep {
        fn apply(
            &self,
            pixels: &mut [u8],
            _width: u32,
            _height: u32,
        ) -> Result<(), ProcessingError> {
            for chunk in pixels.chunks_exact_mut(4) {
                chunk[self.channel] = self.value;
            }

            Ok(())
        }
    }

    struct AddRedStep {
        delta: u8,
    }

    impl ImagePipelineStep for AddRedStep {
        fn apply(
            &self,
            pixels: &mut [u8],
            _width: u32,
            _height: u32,
        ) -> Result<(), ProcessingError> {
            for chunk in pixels.chunks_exact_mut(4) {
                chunk[0] = chunk[0].saturating_add(self.delta);
            }

            Ok(())
        }
    }

    struct FailingStep;

    struct MockRawDecoder;

    impl ImagePipelineStep for FailingStep {
        fn apply(
            &self,
            _pixels: &mut [u8],
            _width: u32,
            _height: u32,
        ) -> Result<(), ProcessingError> {
            Err(ProcessingError::InvalidFilterValue {
                field: "test".to_string(),
                value: 1.0,
            })
        }
    }

    impl RawDecoder for MockRawDecoder {
        fn decode_to_linear_rgb(&self, input: &[u8]) -> Result<LinearImage, ProcessingError> {
            if input.is_empty() {
                return Err(ProcessingError::RawDecodeError {
                    message: "empty input".to_string(),
                });
            }

            LinearImage::new(1, 1, vec![1.0, 0.5, 0.0])
        }
    }

    #[test]
    fn pipeline_executes_steps_in_order() {
        let mut pixels = vec![10_u8, 0_u8, 0_u8, 255_u8];
        let pipeline = ImagePipeline::new()
            .with_step(SetChannelStep {
                channel: 0,
                value: 42,
            })
            .with_step(AddRedStep { delta: 5 });

        pipeline.execute(&mut pixels, 1, 1).unwrap();

        assert_eq!(pixels, vec![47_u8, 0_u8, 0_u8, 255_u8]);
    }

    #[test]
    fn pipeline_rejects_invalid_dimensions() {
        let mut pixels = vec![];
        let pipeline = ImagePipeline::new();

        let result = pipeline.execute(&mut pixels, 0, 1);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidDimensions {
                width: 0,
                height: 1
            })
        ));
    }

    #[test]
    fn pipeline_rejects_invalid_pixel_count() {
        let mut pixels = vec![1_u8, 2_u8, 3_u8];
        let pipeline = ImagePipeline::new();

        let result = pipeline.execute(&mut pixels, 1, 1);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidPixelCount {
                expected: 4,
                got: 3
            })
        ));
    }

    #[test]
    fn pipeline_propagates_step_error() {
        let mut pixels = vec![10_u8, 20_u8, 30_u8, 255_u8];
        let pipeline = ImagePipeline::new().with_step(FailingStep);

        let result = pipeline.execute(&mut pixels, 1, 1);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidFilterValue { field, value }) if field == "test" && value == 1.0
        ));
    }

    #[test]
    fn decode_raw_to_rgba8_converts_linear_samples() {
        let (rgba, width, height) = decode_raw_to_rgba8(&MockRawDecoder, &[1, 2, 3]).unwrap();

        assert_eq!(width, 1);
        assert_eq!(height, 1);
        assert_eq!(rgba, vec![255, 128, 0, 255]);
    }

    #[test]
    fn pipeline_executes_on_linear_image_input() {
        let linear = LinearImage::new(1, 1, vec![0.2, 0.2, 0.2]).unwrap();
        let pipeline = ImagePipeline::new().with_step(AddRedStep { delta: 10 });

        let result = pipeline.execute_on_linear_image(&linear).unwrap();

        assert_eq!(result, vec![61, 51, 51, 255]);
    }
}
