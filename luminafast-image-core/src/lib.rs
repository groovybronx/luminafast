//! LuminaFast image core API v1.
//!
//! This crate is the single source of truth for shared image algorithms used
//! by both WASM preview and backend export pipelines.
//!
//! Stable public contract (v1):
//! - `PixelFilters`: filter state container with documented no-op defaults.
//! - `ProcessingError`: explicit validation errors for dimensions and buffers.
//! - `apply_filters`: deterministic RGBA filtering preserving alpha channel.
//! - `compute_histogram_from_pixels`: RGB histogram over RGBA buffer (768 bins).

pub mod errors;
pub mod filters;
pub mod histogram;
pub mod pipeline;
pub mod raw_decoder;

pub use errors::ProcessingError;
pub use filters::{apply_filters, PixelFilters};
pub use histogram::compute_histogram_from_pixels;
pub use pipeline::{ImagePipeline, ImagePipelineStep};
pub use raw_decoder::{LinearImage, RawDecoder};
