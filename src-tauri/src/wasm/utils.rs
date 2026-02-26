/**
 * WASM Utilities — Memory management et format conversions
 */

/**
 * Convertit un buffer RGBA en ImageData array (pour Canvas.putImageData)
 * @param rgba_buffer - Buffer RGBA [R, G, B, A, R, G, B, A, ...]
 * @returns Tableau identique (RGBA est déjà le format ImageData)
 */
pub fn rgba_to_image_data(rgba_buffer: &[u8]) -> Vec<u8> {
    rgba_buffer.to_vec()
}

/**
 * Convertit un ImageData array en buffer RGBA
 * (ImageData.data est déjà RGBA)
 * @param image_data - Données ImageData
 * @returns Buffer RGBA
 */
pub fn image_data_to_rgba(image_data: &[u8]) -> Vec<u8> {
    image_data.to_vec()
}

/**
 * Détecte si WASM est disponible dans l'environnement d'exécution
 * Basé sur les capacités du navigateur
 */
#[cfg(target_arch = "wasm32")]
pub fn is_wasm_available() -> bool {
    true
}

#[cfg(not(target_arch = "wasm32"))]
pub fn is_wasm_available() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rgba_to_image_data_identity() {
        let input = vec![255u8, 128u8, 64u8, 255u8];
        let output = rgba_to_image_data(&input);
        assert_eq!(output, input);
    }

    #[test]
    fn test_image_data_to_rgba_identity() {
        let input = vec![100u8, 150u8, 200u8, 255u8];
        let output = image_data_to_rgba(&input);
        assert_eq!(output, input);
    }
}
