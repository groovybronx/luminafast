use luminafast_image_core::filters::{
    COLOR_TEMP_MAX, COLOR_TEMP_MIN, COLOR_TEMP_NOOP, CONTRAST_MAX, CONTRAST_MIN, CONTRAST_NOOP,
    EXPOSURE_MAX, EXPOSURE_MIN, EXPOSURE_NOOP, HIGHLIGHTS_MIN, HIGHLIGHTS_NOOP, SATURATION_MIN,
    SATURATION_NOOP, SHADOWS_MAX, SHADOWS_MIN, SHADOWS_NOOP, TINT_MAX, TINT_MIN, TINT_NOOP,
};
use luminafast_image_core::{
    apply_filters, compute_histogram_from_pixels, PixelFilters, ProcessingError,
};

#[test]
fn api_v1_default_values_are_noop() {
    let filters = PixelFilters::default();

    assert_eq!(filters.exposure, EXPOSURE_NOOP);
    assert_eq!(filters.contrast, CONTRAST_NOOP);
    assert_eq!(filters.saturation, SATURATION_NOOP);
    assert_eq!(filters.highlights, HIGHLIGHTS_NOOP);
    assert_eq!(filters.shadows, SHADOWS_NOOP);
    assert_eq!(filters.color_temp, COLOR_TEMP_NOOP);
    assert_eq!(filters.tint, TINT_NOOP);
}

#[test]
fn api_v1_apply_filters_noop_preserves_pixels_and_alpha() {
    let pixels = vec![12_u8, 34_u8, 56_u8, 7_u8, 120_u8, 130_u8, 140_u8, 9_u8];

    let result = apply_filters(&pixels, 2, 1, &PixelFilters::default()).unwrap();

    assert_eq!(result, pixels);
}

#[test]
fn api_v1_apply_filters_clamps_ranges_deterministically() {
    let pixels = vec![90_u8, 120_u8, 180_u8, 33_u8];

    let out_of_range = PixelFilters {
        exposure: 99.0,
        contrast: 99.0,
        saturation: -99.0,
        highlights: -99.0,
        shadows: 99.0,
        clarity: 42.0,
        vibrance: -42.0,
        color_temp: 20000.0,
        tint: 999.0,
    };

    let clamped = PixelFilters {
        exposure: EXPOSURE_MAX,
        contrast: CONTRAST_MAX,
        saturation: SATURATION_MIN,
        highlights: HIGHLIGHTS_MIN,
        shadows: SHADOWS_MAX,
        clarity: 42.0,
        vibrance: -42.0,
        color_temp: COLOR_TEMP_MAX,
        tint: TINT_MAX,
    };

    let result_out_of_range = apply_filters(&pixels, 1, 1, &out_of_range).unwrap();
    let result_clamped = apply_filters(&pixels, 1, 1, &clamped).unwrap();

    assert_eq!(result_out_of_range, result_clamped);

    let lower_out_of_range = PixelFilters {
        exposure: -99.0,
        contrast: -99.0,
        saturation: -99.0,
        highlights: -99.0,
        shadows: -99.0,
        clarity: 0.0,
        vibrance: 0.0,
        color_temp: -1000.0,
        tint: -999.0,
    };

    let lower_clamped = PixelFilters {
        exposure: EXPOSURE_MIN,
        contrast: CONTRAST_MIN,
        saturation: SATURATION_MIN,
        highlights: HIGHLIGHTS_MIN,
        shadows: SHADOWS_MIN,
        clarity: 0.0,
        vibrance: 0.0,
        color_temp: COLOR_TEMP_MIN,
        tint: TINT_MIN,
    };

    let result_lower_out_of_range = apply_filters(&pixels, 1, 1, &lower_out_of_range).unwrap();
    let result_lower_clamped = apply_filters(&pixels, 1, 1, &lower_clamped).unwrap();

    assert_eq!(result_lower_out_of_range, result_lower_clamped);
}

#[test]
fn api_v1_input_validation_is_explicit() {
    let filters = PixelFilters::default();

    let invalid_dims = apply_filters(&[], 0, 1, &filters);
    assert!(matches!(
        invalid_dims,
        Err(ProcessingError::InvalidDimensions {
            width: 0,
            height: 1
        })
    ));

    let invalid_count = apply_filters(&[1_u8, 2_u8, 3_u8], 1, 1, &filters);
    assert!(matches!(
        invalid_count,
        Err(ProcessingError::InvalidPixelCount {
            expected: 4,
            got: 3
        })
    ));
}

#[test]
fn api_v1_histogram_contract_shape_and_totals() {
    let pixels = vec![255_u8, 0_u8, 0_u8, 10_u8, 10_u8, 20_u8, 30_u8, 250_u8];

    let histogram = compute_histogram_from_pixels(&pixels, 2, 1).unwrap();

    assert_eq!(histogram.len(), 768);
    assert_eq!(histogram[255], 1);
    assert_eq!(histogram[10], 1);
    assert_eq!(histogram[256], 1);
    assert_eq!(histogram[256 + 20], 1);
    assert_eq!(histogram[512], 1);
    assert_eq!(histogram[512 + 30], 1);

    let total_r: u32 = histogram[0..256].iter().sum();
    let total_g: u32 = histogram[256..512].iter().sum();
    let total_b: u32 = histogram[512..768].iter().sum();

    assert_eq!(total_r, 2);
    assert_eq!(total_g, 2);
    assert_eq!(total_b, 2);
}
