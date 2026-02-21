//! Service d'extraction EXIF pour LuminaFast
//! Utilise kamadak-exif pour extraire les métadonnées des fichiers image
//! Conforme aux spécifications de Phase 2.2 du plan de développement

use crate::models::exif::ExifMetadata;
use exif::{Exif, In, Reader, Tag, Value};
use std::fs::File;
use std::io::BufReader;

/// Extrait les métadonnées EXIF d'un fichier image
///
/// # Arguments
/// * `path` - Chemin absolu vers le fichier image
///
/// # Returns
/// * `Ok(ExifMetadata)` - Métadonnées extraites avec succès
/// * `Err(String)` - Erreur lors de l'ouverture du fichier ou du parsing EXIF
///
/// # Exemple
/// ```no_run
/* /// let exif = extract_exif_metadata("/path/to/image.jpg")?;
/// println!("ISO: {:?}, Aperture: {:?}", exif.iso, exif.aperture) */
/// ```
pub fn extract_exif_metadata(path: &str) -> Result<ExifMetadata, String> {
    // Ouvrir le fichier
    let file = File::open(path).map_err(|e| format!("Cannot open file {}: {}", path, e))?;

    let mut bufreader = BufReader::new(&file);

    // Parser les données EXIF
    let exif = Reader::new()
        .read_from_container(&mut bufreader)
        .map_err(|e| format!("EXIF parse error for {}: {}", path, e))?;

    // Extraire tous les champs EXIF requis
    Ok(ExifMetadata {
        iso: get_field_u32(&exif, Tag::PhotographicSensitivity),
        aperture: get_field_f_number(&exif),
        shutter_speed: get_field_shutter_speed_log2(&exif),
        focal_length: get_field_focal_length(&exif),
        lens: get_field_string(&exif, Tag::LensModel),
        camera_make: get_field_string(&exif, Tag::Make),
        camera_model: get_field_string(&exif, Tag::Model),
        gps_lat: get_gps_latitude(&exif),
        gps_lon: get_gps_longitude(&exif),
        color_space: get_color_space(&exif),
    })
}

/// Convertit une vitesse d'obturation en log2(seconds) pour tri SQL efficace
///
/// # Arguments
/// * `numerator` - Numérateur de la fraction (ex: 1 pour 1/125)
/// * `denominator` - Dénominateur de la fraction (ex: 125 pour 1/125)
///
/// # Returns
/// Valeur log2(seconds). Exemples :
/// - 1/125s → log2(1/125) ≈ -6.97
/// - 1s → log2(1) = 0
/// - 30s → log2(30) ≈ 4.91
pub fn shutter_speed_to_log2(numerator: u32, denominator: u32) -> f32 {
    if denominator == 0 {
        return 0.0;
    }
    let seconds = numerator as f32 / denominator as f32;
    seconds.log2()
}

/// Extrait un champ u32 depuis les données EXIF
fn get_field_u32(exif: &Exif, tag: Tag) -> Option<u32> {
    exif.get_field(tag, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Short(ref v) if !v.is_empty() => Some(v[0] as u32),
            Value::Long(ref v) if !v.is_empty() => Some(v[0]),
            _ => None,
        })
}

/// Extrait le f-number (aperture) depuis les données EXIF
fn get_field_f_number(exif: &Exif) -> Option<f32> {
    exif.get_field(Tag::FNumber, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Rational(ref v) if !v.is_empty() => {
                let ratio = v[0];
                if ratio.denom != 0 {
                    Some(ratio.num as f32 / ratio.denom as f32)
                } else {
                    None
                }
            }
            _ => None,
        })
}

/// Extrait la vitesse d'obturation en log2(seconds)
fn get_field_shutter_speed_log2(exif: &Exif) -> Option<f32> {
    // ExposureTime en secondes (fraction)
    exif.get_field(Tag::ExposureTime, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Rational(ref v) if !v.is_empty() => {
                let ratio = v[0];
                if ratio.denom != 0 {
                    Some(shutter_speed_to_log2(ratio.num, ratio.denom))
                } else {
                    None
                }
            }
            _ => None,
        })
}

/// Extrait la focale en mm
fn get_field_focal_length(exif: &Exif) -> Option<f32> {
    exif.get_field(Tag::FocalLength, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Rational(ref v) if !v.is_empty() => {
                let ratio = v[0];
                if ratio.denom != 0 {
                    Some(ratio.num as f32 / ratio.denom as f32)
                } else {
                    None
                }
            }
            _ => None,
        })
}

/// Extrait un champ string depuis les données EXIF
fn get_field_string(exif: &Exif, tag: Tag) -> Option<String> {
    exif.get_field(tag, In::PRIMARY)
        .map(|field| {
            let display = field.display_value().to_string();
            display
        })
        .filter(|s: &String| !s.is_empty())
}

/// Extrait la latitude GPS en degrés décimaux
fn get_gps_latitude(exif: &Exif) -> Option<f64> {
    let lat_ref = exif
        .get_field(Tag::GPSLatitudeRef, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Ascii(ref v) if !v.is_empty() => String::from_utf8(v[0].clone()).ok(),
            _ => None,
        })?;

    let lat = exif
        .get_field(Tag::GPSLatitude, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Rational(ref v) if v.len() >= 3 => {
                let degrees = v[0].num as f64 / v[0].denom as f64;
                let minutes = v[1].num as f64 / v[1].denom as f64;
                let seconds = v[2].num as f64 / v[2].denom as f64;
                let decimal = degrees + minutes / 60.0 + seconds / 3600.0;
                Some(if lat_ref == "S" { -decimal } else { decimal })
            }
            _ => None,
        });

    lat
}

/// Extrait la longitude GPS en degrés décimaux
fn get_gps_longitude(exif: &Exif) -> Option<f64> {
    let lon_ref =
        exif.get_field(Tag::GPSLongitudeRef, In::PRIMARY)
            .and_then(|field| match field.value {
                Value::Ascii(ref v) if !v.is_empty() => String::from_utf8(v[0].clone()).ok(),
                _ => None,
            })?;

    let lon = exif
        .get_field(Tag::GPSLongitude, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Rational(ref v) if v.len() >= 3 => {
                let degrees = v[0].num as f64 / v[0].denom as f64;
                let minutes = v[1].num as f64 / v[1].denom as f64;
                let seconds = v[2].num as f64 / v[2].denom as f64;
                let decimal = degrees + minutes / 60.0 + seconds / 3600.0;
                Some(if lon_ref == "W" { -decimal } else { decimal })
            }
            _ => None,
        });

    lon
}

/// Extrait l'espace colorimétrique
fn get_color_space(exif: &Exif) -> Option<String> {
    exif.get_field(Tag::ColorSpace, In::PRIMARY)
        .and_then(|field| match field.value {
            Value::Short(ref v) if !v.is_empty() => match v[0] {
                1 => Some("sRGB".to_string()),
                65535 => Some("Uncalibrated".to_string()),
                _ => Some(format!("Unknown({})", v[0])),
            },
            _ => None,
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shutter_speed_log2_conversion() {
        // 1/125s → log2(1/125) ≈ -6.97
        let result = shutter_speed_to_log2(1, 125);
        assert!(
            (result + 6.97).abs() < 0.01,
            "Expected ~-6.97, got {}",
            result
        );

        // 1s → log2(1) = 0
        assert_eq!(shutter_speed_to_log2(1, 1), 0.0);

        // 30s → log2(30) ≈ 4.91
        let result = shutter_speed_to_log2(30, 1);
        assert!(
            (result - 4.91).abs() < 0.01,
            "Expected ~4.91, got {}",
            result
        );

        // Edge case: denominator zero
        assert_eq!(shutter_speed_to_log2(1, 0), 0.0);
    }

    #[test]
    fn test_extract_exif_from_nonexistent_file() {
        let result = extract_exif_metadata("/nonexistent/file.jpg");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot open file"));
    }
}
