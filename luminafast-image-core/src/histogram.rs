use crate::errors::ProcessingError;

fn expected_rgba_len(width: u32, height: u32) -> Option<usize> {
    (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
}

pub fn compute_histogram_from_pixels(
    pixels: &[u8],
    width: u32,
    height: u32,
) -> Result<Vec<u32>, ProcessingError> {
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

    let mut histogram = vec![0_u32; 768];

    for chunk in pixels.chunks_exact(4) {
        histogram[chunk[0] as usize] += 1;
        histogram[256 + chunk[1] as usize] += 1;
        histogram[512 + chunk[2] as usize] += 1;
    }

    Ok(histogram)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn histogram_rejects_invalid_dimensions() {
        let pixels = vec![];
        let result = compute_histogram_from_pixels(&pixels, 0, 1);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidDimensions {
                width: 0,
                height: 1
            })
        ));
    }

    #[test]
    fn histogram_rejects_invalid_pixel_count() {
        let pixels = vec![255_u8, 0_u8, 0_u8];
        let result = compute_histogram_from_pixels(&pixels, 1, 1);

        assert!(matches!(
            result,
            Err(ProcessingError::InvalidPixelCount {
                expected: 4,
                got: 3
            })
        ));
    }

    #[test]
    fn histogram_returns_768_bins_and_counts_pixels() {
        let pixels = vec![
            255_u8, 0_u8, 0_u8, 255_u8, // red
            0_u8, 255_u8, 0_u8, 255_u8, // green
        ];

        let histogram = compute_histogram_from_pixels(&pixels, 2, 1).unwrap();

        assert_eq!(histogram.len(), 768);
        assert_eq!(histogram[255], 1); // R=255
        assert_eq!(histogram[256 + 255], 1); // G=255
        assert_eq!(histogram[512], 2); // B=0 appears twice
    }

    #[test]
    fn histogram_counts_all_pixels_per_channel() {
        let pixels: Vec<u8> = vec![
            10, 20, 30, 255, 40, 50, 60, 255, 10, 20, 30, 255, 70, 80, 90, 255,
        ];

        let histogram = compute_histogram_from_pixels(&pixels, 2, 2).unwrap();

        assert_eq!(histogram[10], 2);
        assert_eq!(histogram[40], 1);
        assert_eq!(histogram[70], 1);

        assert_eq!(histogram[256 + 20], 2);
        assert_eq!(histogram[256 + 50], 1);
        assert_eq!(histogram[256 + 80], 1);

        assert_eq!(histogram[512 + 30], 2);
        assert_eq!(histogram[512 + 60], 1);
        assert_eq!(histogram[512 + 90], 1);

        let total_r: u32 = histogram[0..256].iter().sum();
        let total_g: u32 = histogram[256..512].iter().sum();
        let total_b: u32 = histogram[512..768].iter().sum();

        assert_eq!(total_r, 4);
        assert_eq!(total_g, 4);
        assert_eq!(total_b, 4);
    }

    #[test]
    fn histogram_ignores_alpha_channel() {
        let opaque = vec![128_u8, 64, 32, 255];
        let transparent = vec![128_u8, 64, 32, 0];

        let h1 = compute_histogram_from_pixels(&opaque, 1, 1).unwrap();
        let h2 = compute_histogram_from_pixels(&transparent, 1, 1).unwrap();

        assert_eq!(h1, h2);
    }
}
