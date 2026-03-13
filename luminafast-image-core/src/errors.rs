use thiserror::Error;

/// Public error contract for image processing operations.
#[derive(Debug, Error)]
pub enum ProcessingError {
    /// Width or height is zero, or dimensions overflow expected buffer size.
    #[error("Invalid image dimensions: {width}x{height}")]
    InvalidDimensions { width: u32, height: u32 },

    /// RGBA byte length does not match width * height * 4.
    #[error("Pixel count mismatch: expected {expected}, got {got}")]
    InvalidPixelCount { expected: usize, got: usize },

    /// Reserved for explicit filter validation errors.
    #[error("Invalid filter value for {field}: {value}")]
    InvalidFilterValue { field: String, value: f32 },

    /// RAW decoder failed to produce a valid linear RGB buffer.
    #[error("RAW decode error: {message}")]
    RawDecodeError { message: String },
}
