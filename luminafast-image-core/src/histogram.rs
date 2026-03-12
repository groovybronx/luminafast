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

        let histogram = compute_histogram_from_pixels(&pixels, 2, 1).expect("valid input");

        assert_eq!(histogram.len(), 768);
        assert_eq!(histogram[255], 1); // R=255
        assert_eq!(histogram[256 + 255], 1); // G=255
        assert_eq!(histogram[512], 2); // B=0 appears twice
    }
}
