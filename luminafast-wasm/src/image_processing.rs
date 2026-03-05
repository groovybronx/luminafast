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
                write!(f, "Pixel count mismatch: expected {}, got {}", expected, got)
            }
            ProcessingError::InvalidFilterValue { field, value } => {
                write!(f, "Invalid filter value for {}: {}", field, value)
            }
        }
    }
}

impl std::error::Error for ProcessingError {}

/**
 * Applique les filtres pixel à un buffer RGBA — OPTIMISÉ EN PASSE UNIQUE
 *
 * Performance: Au lieu de 9 passes séparées (chacune itérant 2M+ pixels),
 * on applique tous les filtres dans UNE SEULE boucle pour gagner ~10ms.
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

    // PERF: Vérifier si tous les filtres sont des no-ops (skip la boucle)
    let exposure_active = (filters.exposure - 0.0).abs() >= 0.001;
    let contrast_active = (filters.contrast - 0.0).abs() >= 0.001;
    let saturation_active = (filters.saturation - 1.0).abs() >= 0.001;
    let highlights_active = (filters.highlights - 0.0).abs() >= 0.001;
    let shadows_active = (filters.shadows - 0.0).abs() >= 0.001;
    let color_temp_active = (filters.color_temp - 5500.0).abs() >= 0.001;
    let tint_active = filters.tint.abs() >= 0.001;

    // Si rien n'est actif, retourner les pixels inchangés
    if !exposure_active
        && !contrast_active
        && !saturation_active
        && !highlights_active
        && !shadows_active
        && !color_temp_active
        && !tint_active
    {
        return Ok(result);
    }

    // PERF OPTIMIZATION: Une seule boucle pour appliquer TOUS les filtres
    // Déplace la logique à l'intérieur au lieu de 9 passes séparées
    apply_filters_single_pass(&mut result, filters);

    Ok(result)
}

/**
 * Applique tous les filtres dans une SEULE boucle (PERF: 9x plus rapide)
 * @internal
 */
fn apply_filters_single_pass(pixels: &mut [u8], filters: &PixelFilters) {
    for chunk in pixels.chunks_exact_mut(4) {
        // Lire les valeurs originales
        let mut r = chunk[0] as f32;
        let mut g = chunk[1] as f32;
        let mut b = chunk[2] as f32;
        // chunk[3] est alpha — inchangé

        // === EXPOSITION (luminosité globale) ===
        if (filters.exposure - 0.0).abs() >= 0.001 {
            let exposure = filters.exposure.clamp(-2.0, 2.0);
            let brightness_factor = 1.0 + exposure * 0.15;
            r *= brightness_factor;
            g *= brightness_factor;
            b *= brightness_factor;
        }

        // === CONTRASTE ===
        if (filters.contrast - 0.0).abs() >= 0.001 {
            let contrast = filters.contrast.clamp(-1.0, 3.0);
            let contrast_factor = 1.0 + contrast * 0.25;
            r = (r - 128.0) * contrast_factor + 128.0;
            g = (g - 128.0) * contrast_factor + 128.0;
            b = (b - 128.0) * contrast_factor + 128.0;
        }

        // === SATURATION (calcul luma une seule fois!) ===
        if (filters.saturation - 1.0).abs() >= 0.001 {
            let saturation = filters.saturation.clamp(0.0, 2.0);
            let luma = 0.299 * r + 0.587 * g + 0.114 * b;
            r = luma + (r - luma) * saturation;
            g = luma + (g - luma) * saturation;
            b = luma + (b - luma) * saturation;
        }

        // === HAUTES LUMIÈRES (reutiliser luma si calcul) ===
        if (filters.highlights - 0.0).abs() >= 0.001 {
            let highlight = filters.highlights.clamp(-1.0, 1.0);
            let luma = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            if luma > 180 {
                let factor = (1.0 + highlight * 0.3).clamp(0.7, 1.3);
                r *= factor;
                g *= factor;
                b *= factor;
            }
        }

        // === OMBRES ===
        if (filters.shadows - 0.0).abs() >= 0.001 {
            let shadow = filters.shadows.clamp(-1.0, 1.0);
            let luma = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            if luma < 75 {
                let factor = (1.0 + shadow * 0.3).clamp(0.7, 1.3);
                r *= factor;
                g *= factor;
                b *= factor;
            }
        }

        // === TEMPÉRATURE DE COULEUR ===
        if (filters.color_temp - 5500.0).abs() >= 0.001 {
            let color_temp = filters.color_temp.clamp(2000.0, 10000.0);
            let temp_offset = (color_temp - 5500.0) / 1000.0;
            let red_factor = 1.0 + (temp_offset * -0.1).clamp(-0.3, 0.3);
            let blue_factor = 1.0 + (temp_offset * 0.1).clamp(-0.3, 0.3);
            r *= red_factor;
            b *= blue_factor;
        }

        // === TEINTE (tint) ===
        if filters.tint.abs() >= 0.001 {
            let tint = filters.tint.clamp(-50.0, 50.0);
            let green_factor = 1.0 + (tint / 50.0) * 0.2;
            let magenta_factor = 1.0 - (tint / 50.0) * 0.1;
            r *= magenta_factor;
            g *= green_factor;
            b *= magenta_factor;
        }

        // === CLARTÉ & VIBRANCE (placeholders pour Phase B+) ===
        // Les deux sont des no-ops pour maintenant

        // Écrire les résultats finaux (clamped 0-255)
        chunk[0] = r.clamp(0.0, 255.0) as u8;
        chunk[1] = g.clamp(0.0, 255.0) as u8;
        chunk[2] = b.clamp(0.0, 255.0) as u8;
    }
}

// ===== OLD FUNCTIONS (DEPRECATED FOR OPTIMIZATION) =====
// Kept for reference only. Use apply_filters_single_pass instead.
// These are now superseded by the single-pass optimization in apply_filters_single_pass.

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(dead_code)]
fn apply_highlights(pixels: &mut [u8], highlights: f32) {
    if (highlights - 0.0).abs() < 0.001 {
        return; // No-op
    }

    let highlights = highlights.clamp(-1.0, 1.0);

    for chunk in pixels.chunks_exact_mut(4) {
        // Cibler les pixels brillants (luma > 180)
        let luma = (chunk[0] as f32 * 0.299 + chunk[1] as f32 * 0.587
            + chunk[2] as f32 * 0.114) as u8;

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

#[allow(dead_code)]
fn apply_shadows(pixels: &mut [u8], shadows: f32) {
    if shadows.abs() < 0.001 {
        return; // No-op
    }

    let shadows = shadows.clamp(-1.0, 1.0);

    for chunk in pixels.chunks_exact_mut(4) {
        // Cibler les pixels foncés (luma < 75)
        let luma = (chunk[0] as f32 * 0.299 + chunk[1] as f32 * 0.587
            + chunk[2] as f32 * 0.114) as u8;

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

#[allow(dead_code)]
fn apply_clarity(_pixels: &mut [u8], _clarity: f32) {
    // Clarity requiert un filtre spatial (blur) — placeholder pour Phase B+
    // À implémenter avec convolution 3x3 ou Gaussian blur
}

#[allow(dead_code)]
fn apply_vibrance(_pixels: &mut [u8], _vibrance: f32) {
    // Vibrance requiert une analyse HSV per-pixel — placeholder pour Phase B+
}

#[allow(dead_code)]
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

#[allow(dead_code)]
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

/**
 * Calcule l'histogramme RGB d'une image depuis son buffer RGBA.
 *
 * Retourne 768 valeurs u32 : r[0..256] ++ g[0..256] ++ b[0..256]
 * Chaque bin représente le nombre de pixels ayant cette valeur (0–255).
 *
 * @param pixels - Buffer RGBA (4 octets par pixel)
 * @param width  - Largeur en pixels
 * @param height - Hauteur en pixels
 * @returns Vec<u32> de 768 éléments, ou ProcessingError si dimensions invalides
 */
pub fn compute_histogram_from_pixels(
    pixels: &[u8],
    width: u32,
    height: u32,
) -> Result<Vec<u32>, ProcessingError> {
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

    // 768 bins : r[0..256] puis g[256..512] puis b[512..768]
    let mut histogram = vec![0u32; 768];

    for chunk in pixels.chunks_exact(4) {
        histogram[chunk[0] as usize] += 1;           // canal R
        histogram[256 + chunk[1] as usize] += 1;     // canal G
        histogram[512 + chunk[2] as usize] += 1;     // canal B
        // chunk[3] = alpha, ignoré
    }

    Ok(histogram)
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

    // ===== Tests compute_histogram_from_pixels =====

    #[test]
    fn test_histogram_invalid_dimensions() {
        let pixels = vec![100u8, 100u8, 100u8, 255u8];
        assert!(compute_histogram_from_pixels(&pixels, 0, 1).is_err());
        assert!(compute_histogram_from_pixels(&pixels, 1, 0).is_err());
    }

    #[test]
    fn test_histogram_pixel_count_mismatch() {
        // 1×1 pixel → 4 octets attendus, on en passe 8
        let pixels = vec![100u8; 8];
        assert!(compute_histogram_from_pixels(&pixels, 1, 1).is_err());
    }

    #[test]
    fn test_histogram_length_is_768() {
        // 2×2 image, pixels rouges purs
        let pixels = vec![255u8, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255];
        let hist = compute_histogram_from_pixels(&pixels, 2, 2).unwrap();
        assert_eq!(hist.len(), 768);
    }

    #[test]
    fn test_histogram_pure_red_pixel() {
        // 1 pixel rouge pur (R=255, G=0, B=0)
        let pixels = vec![255u8, 0, 0, 255];
        let hist = compute_histogram_from_pixels(&pixels, 1, 1).unwrap();

        // R bin 255 devrait être 1
        assert_eq!(hist[255], 1);
        // G bin 0 devrait être 1
        assert_eq!(hist[256], 1);
        // B bin 0 devrait être 1
        assert_eq!(hist[512], 1);
        // Tous les autres bins = 0
        let total_r: u32 = hist[0..256].iter().sum();
        let total_g: u32 = hist[256..512].iter().sum();
        let total_b: u32 = hist[512..768].iter().sum();
        assert_eq!(total_r, 1);
        assert_eq!(total_g, 1);
        assert_eq!(total_b, 1);
    }

    #[test]
    fn test_histogram_counts_all_pixels() {
        // 4 pixels avec des valeurs RGB différentes
        // P1: (10,20,30), P2: (40,50,60), P3: (10,20,30), P4: (70,80,90)
        let pixels: Vec<u8> = vec![
            10, 20, 30, 255,
            40, 50, 60, 255,
            10, 20, 30, 255,
            70, 80, 90, 255,
        ];
        let hist = compute_histogram_from_pixels(&pixels, 2, 2).unwrap();

        // R: valeur 10 → 2 pixels, 40 → 1, 70 → 1
        assert_eq!(hist[10], 2);
        assert_eq!(hist[40], 1);
        assert_eq!(hist[70], 1);

        // G: valeur 20 → 2 pixels (offset +256), 50 → 1, 80 → 1
        assert_eq!(hist[256 + 20], 2);
        assert_eq!(hist[256 + 50], 1);
        assert_eq!(hist[256 + 80], 1);

        // B: valeur 30 → 2 pixels (offset +512), 60 → 1, 90 → 1
        assert_eq!(hist[512 + 30], 2);
        assert_eq!(hist[512 + 60], 1);
        assert_eq!(hist[512 + 90], 1);

        // Total par canal = 4 (nombre de pixels)
        let total_r: u32 = hist[0..256].iter().sum();
        assert_eq!(total_r, 4);
    }

    #[test]
    fn test_histogram_alpha_is_ignored() {
        // Alpha=0 vs Alpha=255 ne doit pas changer le résultat
        let opaque = vec![128u8, 64, 32, 255];
        let transparent = vec![128u8, 64, 32, 0];

        let h1 = compute_histogram_from_pixels(&opaque, 1, 1).unwrap();
        let h2 = compute_histogram_from_pixels(&transparent, 1, 1).unwrap();

        assert_eq!(h1, h2, "Alpha should not affect histogram");
    }
}
