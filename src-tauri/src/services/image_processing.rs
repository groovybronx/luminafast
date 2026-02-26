/**
 * Service Image Processing — Phase B (Pixel Operations)
 * Logique de traitement pixel pour filtres avancés
 * Utilisé par le module WASM pour canvas rendering
 */
use std::fmt;

#[derive(Debug, Clone, Copy)]
pub struct PixelFilters {
    pub exposure: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub highlights: f32,
    pub shadows: f32,
    pub clarity: f32,
    pub vibrance: f32,
    pub color_temp: f32,
    pub tint: f32,
}

#[derive(Debug)]
pub enum ProcessingError {
    InvalidDimensions { width: u32, height: u32 },
    InvalidPixelCount { expected: usize, got: usize },
    InvalidFilterValue { field: String, value: f32 },
}

impl fmt::Display for ProcessingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProcessingError::InvalidDimensions { width, height } => {
                write!(f, "Invalid image dimensions: {}x{}", width, height)
            }
            ProcessingError::InvalidPixelCount { expected, got } => {
                write!(
                    f,
                    "Pixel count mismatch: expected {}, got {}",
                    expected, got
                )
            }
            ProcessingError::InvalidFilterValue { field, value } => {
                write!(f, "Invalid filter value for {}: {}", field, value)
            }
        }
    }
}

impl std::error::Error for ProcessingError {}

/**
 * Applique les filtres pixel à un buffer RGBA
 *
 * @param pixels - Buffer RGBA (4 octets par pixel: R, G, B, A)
 * @param width - Largeur en pixels
 * @param height - Hauteur en pixels
 * @param filters - État des filtres
 * @returns Nouveau buffer de pixels avec filtres appliqués
 */
pub fn apply_filters(
    pixels: &[u8],
    width: u32,
    height: u32,
    filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError> {
    // Valider les dimensions
    if width == 0 || height == 0 {
        return Err(ProcessingError::InvalidDimensions { width, height });
    }

    let expected_len = (width as usize) * (height as usize) * 4;
    if pixels.len() != expected_len {
        return Err(ProcessingError::InvalidPixelCount {
            expected: expected_len,
            got: pixels.len(),
        });
    }

    // Copier les pixels
    let mut result = pixels.to_vec();

    // Appliquer les filtres
    apply_exposure(&mut result, filters.exposure);
    apply_contrast(&mut result, filters.contrast);
    apply_saturation(&mut result, filters.saturation);
    apply_highlights(&mut result, filters.highlights);
    apply_shadows(&mut result, filters.shadows);
    apply_clarity(&mut result, filters.clarity);
    apply_vibrance(&mut result, filters.vibrance);
    apply_color_temp(&mut result, filters.color_temp);
    apply_tint(&mut result, filters.tint);

    Ok(result)
}

/**
 * Applique l'ajustement d'exposition (luminosité globale)
 */
fn apply_exposure(pixels: &mut [u8], exposure: f32) {
    if (exposure - 0.0).abs() < 0.001 {
        return; // No-op
    }

    // Clamper l'exposition à [-2, 2] et convertir à facteur de luminosité
    let exposure = exposure.clamp(-2.0, 2.0);
    let brightness_factor = 1.0 + exposure * 0.15;

    for chunk in pixels.chunks_exact_mut(4) {
        // RGBA
        let r = (chunk[0] as f32) * brightness_factor;
        let g = (chunk[1] as f32) * brightness_factor;
        let b = (chunk[2] as f32) * brightness_factor;

        chunk[0] = r.clamp(0.0, 255.0) as u8;
        chunk[1] = g.clamp(0.0, 255.0) as u8;
        chunk[2] = b.clamp(0.0, 255.0) as u8;
        // Alpha unchanged
    }
}

/**
 * Applique l'ajustement de contraste
 */
fn apply_contrast(pixels: &mut [u8], contrast: f32) {
    if (contrast - 0.0).abs() < 0.001 {
        return; // No-op
    }

    let contrast = contrast.clamp(-1.0, 3.0);
    let contrast_factor = 1.0 + contrast * 0.25;

    for chunk in pixels.chunks_exact_mut(4) {
        // Centre sur 128 (mid-gray)
        let r = (chunk[0] as f32 - 128.0) * contrast_factor + 128.0;
        let g = (chunk[1] as f32 - 128.0) * contrast_factor + 128.0;
        let b = (chunk[2] as f32 - 128.0) * contrast_factor + 128.0;

        chunk[0] = r.clamp(0.0, 255.0) as u8;
        chunk[1] = g.clamp(0.0, 255.0) as u8;
        chunk[2] = b.clamp(0.0, 255.0) as u8;
    }
}

/**
 * Applique la saturation (colorfulness)
 * saturation = 0 : complètement désaturé (B&W)
 * saturation = 1 : aucun changement
 * saturation > 1 : plus saturé
 */
fn apply_saturation(pixels: &mut [u8], saturation: f32) {
    if (saturation - 1.0).abs() < 0.001 {
        return; // No-op
    }

    let saturation = saturation.clamp(0.0, 2.0);

    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;

        // Convertir RGB en luma pour la luminance
        let luma = 0.299 * r + 0.587 * g + 0.114 * b;

        // Interpoler entre gray (luma) et color original
        let new_r = luma + (r - luma) * saturation;
        let new_g = luma + (g - luma) * saturation;
        let new_b = luma + (b - luma) * saturation;

        chunk[0] = new_r.clamp(0.0, 255.0) as u8;
        chunk[1] = new_g.clamp(0.0, 255.0) as u8;
        chunk[2] = new_b.clamp(0.0, 255.0) as u8;
    }
}

/**
 * Applique l'ajustement de hautes lumières
 */
fn apply_highlights(pixels: &mut [u8], highlights: f32) {
    if (highlights - 0.0).abs() < 0.001 {
        return; // No-op
    }

    let highlights = highlights.clamp(-1.0, 1.0);

    for chunk in pixels.chunks_exact_mut(4) {
        // Cibler les pixels brillants (luma > 180)
        let luma =
            (chunk[0] as f32 * 0.299 + chunk[1] as f32 * 0.587 + chunk[2] as f32 * 0.114) as u8;

        if luma > 180 {
            let factor = (1.0 + highlights * 0.3).clamp(0.7, 1.3);
            let r = (chunk[0] as f32) * factor;
            let g = (chunk[1] as f32) * factor;
            let b = (chunk[2] as f32) * factor;

            chunk[0] = r.clamp(0.0, 255.0) as u8;
            chunk[1] = g.clamp(0.0, 255.0) as u8;
            chunk[2] = b.clamp(0.0, 255.0) as u8;
        }
    }
}

/**
 * Applique l'ajustement d'ombres
 */
fn apply_shadows(pixels: &mut [u8], shadows: f32) {
    if shadows.abs() < 0.001 {
        return; // No-op
    }

    let shadows = shadows.clamp(-1.0, 1.0);

    for chunk in pixels.chunks_exact_mut(4) {
        // Cibler les pixels foncés (luma < 75)
        let luma =
            (chunk[0] as f32 * 0.299 + chunk[1] as f32 * 0.587 + chunk[2] as f32 * 0.114) as u8;

        if luma < 75 {
            let factor = (1.0 + shadows * 0.3).clamp(0.7, 1.3);
            let r = chunk[0] as f32 * factor;
            let g = chunk[1] as f32 * factor;
            let b = chunk[2] as f32 * factor;

            chunk[0] = r.clamp(0.0, 255.0) as u8;
            chunk[1] = g.clamp(0.0, 255.0) as u8;
            chunk[2] = b.clamp(0.0, 255.0) as u8;
        }
    }
}

/**
 * Applique la clarté (local contrast)
 */
fn apply_clarity(_pixels: &mut [u8], _clarity: f32) {
    // Clarity requiert un filtre spatial (blur) — placeholder pour Phase B+
    // À implémenter avec convolution 3x3 ou Gaussian blur
}

/**
 * Applique la vibrance (saturation intelligente)
 */
fn apply_vibrance(_pixels: &mut [u8], _vibrance: f32) {
    // Vibrance requiert une analyse HSV per-pixel — placeholder pour Phase B+
}

/**
 * Applique la balance température de couleur (color temp)
 */
fn apply_color_temp(pixels: &mut [u8], color_temp: f32) {
    if (color_temp - 5500.0).abs() < 0.001 {
        return; // No-op (neutral)
    }

    // Clamper à plages réalistes
    let color_temp = color_temp.clamp(2000.0, 10000.0);

    // Calculer les facteurs reds/blues
    // Température chaude (< 5500K) : ajouter du rouge, réduire le bleu
    // Température froide (> 5500K) : ajouter du bleu, réduire le rouge
    let temp_offset = (color_temp - 5500.0) / 1000.0;
    let red_factor = 1.0 + (temp_offset * -0.1).clamp(-0.3, 0.3);
    let blue_factor = 1.0 + (temp_offset * 0.1).clamp(-0.3, 0.3);

    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f32 * red_factor;
        let b = chunk[2] as f32 * blue_factor;

        chunk[0] = r.clamp(0.0, 255.0) as u8;
        chunk[2] = b.clamp(0.0, 255.0) as u8;
        // Green unchanged
    }
}

/**
 * Applique la teinte de couleur (tint)
 */
fn apply_tint(pixels: &mut [u8], tint: f32) {
    if tint.abs() < 0.001 {
        return; // No-op
    }

    let tint = tint.clamp(-50.0, 50.0);

    // Tint positif : ajouter du vert
    // Tint négatif : ajouter du magenta
    let green_factor = 1.0 + (tint / 50.0) * 0.2;
    let magenta_factor = 1.0 - (tint / 50.0) * 0.1;

    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f32 * magenta_factor;
        let g = chunk[1] as f32 * green_factor;
        let b = chunk[2] as f32 * magenta_factor;

        chunk[0] = r.clamp(0.0, 255.0) as u8;
        chunk[1] = g.clamp(0.0, 255.0) as u8;
        chunk[2] = b.clamp(0.0, 255.0) as u8;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_exposure_brighten() {
        let pixels = vec![100u8, 100u8, 100u8, 255u8]; // RGBA
        let filters = PixelFilters {
            exposure: 1.0,
            contrast: 0.0,
            saturation: 1.0,
            highlights: 0.0,
            shadows: 0.0,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: 5500.0,
            tint: 0.0,
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        // exposure=1.0 → brightness_factor ≈ 1.15
        // 100 * 1.15 ≈ 115
        assert!(result[0] > 100);
        assert_eq!(result[3], 255); // Alpha unchanged
    }

    #[test]
    fn test_apply_saturation_desaturate() {
        // Pixel avec couleur: R=255, G=128, B=64
        let pixels = vec![255u8, 128u8, 64u8, 255u8];
        let filters = PixelFilters {
            exposure: 0.0,
            contrast: 0.0,
            saturation: 0.0, // Complètement désaturé
            highlights: 0.0,
            shadows: 0.0,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: 5500.0,
            tint: 0.0,
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        // Tous les canaux devraient être égaux (grayscale)
        let gray_value = result[0];
        assert_eq!(result[0], result[1]);
        assert_eq!(result[1], result[2]);
        assert!(gray_value > 0 && gray_value < 255);
    }

    #[test]
    fn test_invalid_dimensions() {
        let pixels = vec![];
        let filters = PixelFilters {
            exposure: 0.0,
            contrast: 0.0,
            saturation: 1.0,
            highlights: 0.0,
            shadows: 0.0,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: 5500.0,
            tint: 0.0,
        };

        let result = apply_filters(&pixels, 0, 0, &filters);
        assert!(result.is_err());
    }

    #[test]
    fn test_pixel_count_mismatch() {
        let pixels = vec![100u8, 100u8, 100u8]; // 3 bytes, not 4
        let filters = PixelFilters {
            exposure: 0.0,
            contrast: 0.0,
            saturation: 1.0,
            highlights: 0.0,
            shadows: 0.0,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: 5500.0,
            tint: 0.0,
        };

        let result = apply_filters(&pixels, 1, 1, &filters);
        assert!(result.is_err());
    }

    #[test]
    fn test_apply_filters_idempotent_with_zero_exposure() {
        let pixels = vec![100u8, 150u8, 200u8, 255u8];
        let filters = PixelFilters {
            exposure: 0.0,
            contrast: 0.0,
            saturation: 1.0,
            highlights: 0.0,
            shadows: 0.0,
            clarity: 0.0,
            vibrance: 0.0,
            color_temp: 5500.0,
            tint: 0.0,
        };

        let result = apply_filters(&pixels, 1, 1, &filters).unwrap();

        // Avec tous les filtres à zéro, les pixels devraient rester inchangés
        assert_eq!(result[0..3], pixels[0..3]);
    }
}
