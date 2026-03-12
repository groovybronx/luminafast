pub mod errors;
pub mod filters;
pub mod histogram;

pub use errors::ProcessingError;
pub use filters::{apply_filters, PixelFilters};
pub use histogram::compute_histogram_from_pixels;
