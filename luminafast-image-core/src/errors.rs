use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProcessingError {
    #[error("Invalid image dimensions: {width}x{height}")]
    InvalidDimensions { width: u32, height: u32 },

    #[error("Pixel count mismatch: expected {expected}, got {got}")]
    InvalidPixelCount { expected: usize, got: usize },
}
