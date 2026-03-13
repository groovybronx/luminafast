use luminafast_image_core::pipeline::decode_raw_to_rgba8;
use luminafast_image_core::{LinearImage, ProcessingError, RawDecoder};

struct ContractMockDecoder;

impl RawDecoder for ContractMockDecoder {
    fn decode_to_linear_rgb(&self, input: &[u8]) -> Result<LinearImage, ProcessingError> {
        if input.is_empty() {
            return Err(ProcessingError::RawDecodeError {
                message: "empty RAW payload".to_string(),
            });
        }

        LinearImage::new(
            2,
            1,
            vec![
                0.0, 0.5, 1.0, // pixel 1
                0.25, 0.25, 0.25, // pixel 2
            ],
        )
    }
}

struct InvalidMockDecoder;

impl RawDecoder for InvalidMockDecoder {
    fn decode_to_linear_rgb(&self, _input: &[u8]) -> Result<LinearImage, ProcessingError> {
        Ok(LinearImage {
            width: 0,
            height: 1,
            pixels_rgb_f32: vec![],
        })
    }
}

#[test]
fn raw_decoder_contract_returns_valid_linear_image() {
    let decoder = ContractMockDecoder;
    let linear = decoder.decode_to_linear_rgb(&[1, 2, 3]).unwrap();

    assert_eq!(linear.width, 2);
    assert_eq!(linear.height, 1);
    assert_eq!(linear.pixels_rgb_f32.len(), 6);
}

#[test]
fn raw_decoder_contract_exposes_explicit_decode_error() {
    let decoder = ContractMockDecoder;
    let result = decoder.decode_to_linear_rgb(&[]);

    assert!(matches!(
        result,
        Err(ProcessingError::RawDecodeError { message }) if message == "empty RAW payload"
    ));
}

#[test]
fn linear_image_contract_rejects_count_mismatch() {
    let result = LinearImage::new(1, 1, vec![0.0, 1.0]);

    assert!(matches!(
        result,
        Err(ProcessingError::InvalidPixelCount {
            expected: 3,
            got: 2
        })
    ));
}

#[test]
fn pipeline_contract_converts_decoder_output_to_rgba() {
    let decoder = ContractMockDecoder;
    let (rgba, width, height) = decode_raw_to_rgba8(&decoder, &[9]).unwrap();

    assert_eq!(width, 2);
    assert_eq!(height, 1);
    assert_eq!(rgba, vec![0, 128, 255, 255, 64, 64, 64, 255]);
}

#[test]
fn pipeline_contract_rejects_invalid_decoder_dimensions() {
    let decoder = InvalidMockDecoder;
    let result = decode_raw_to_rgba8(&decoder, &[7]);

    assert!(matches!(
        result,
        Err(ProcessingError::InvalidDimensions {
            width: 0,
            height: 1
        })
    ));
}
