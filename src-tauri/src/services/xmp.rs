//! Service XMP pour LuminaFast — Phase 5.4
//! Lecture et écriture de fichiers sidecar `.xmp` conformes au standard Adobe XMP.
//!
//! Format supporté :
//! - `xmp:Rating`          → note 0-5
//! - `xmp:Label`           → flag ("Pick", "Reject")
//! - `dc:subject`          → tags plats (rdf:Bag)
//! - `lr:hierarchicalSubject` → tags hiérarchiques Lightroom (rdf:Bag, ex: "Lieu/France/Paris")

use quick_xml::events::{BytesEnd, BytesStart, BytesText, Event};
use quick_xml::reader::Reader;
use quick_xml::writer::Writer;
use std::io::Cursor;
use std::path::{Path, PathBuf};

/// Données extraites / à écrire dans un fichier XMP
#[derive(Debug, Clone, PartialEq)]
pub struct XmpData {
    /// Note de 0 à 5 (xmp:Rating)
    pub rating: Option<u8>,
    /// Flag de curation : "Pick", "Reject" ou None (xmp:Label)
    pub flag: Option<String>,
    /// Tags plats (dc:subject rdf:Bag)
    pub tags: Vec<String>,
    /// Tags hiérarchiques Lightroom (lr:hierarchicalSubject, ex: "Lieu/France/Paris")
    pub hierarchical_subjects: Vec<String>,
}

impl Default for XmpData {
    fn default() -> Self {
        Self {
            rating: None,
            flag: None,
            tags: Vec::new(),
            hierarchical_subjects: Vec::new(),
        }
    }
}

/// Construit le chemin du fichier sidecar `.xmp` à partir du chemin de l'image.
///
/// Convention Adobe/Lightroom : remplacer l'extension par `.xmp`.
/// Ex: `/path/to/IMG_001.RAF` → `/path/to/IMG_001.xmp`
pub fn build_xmp_path(image_path: &str) -> PathBuf {
    Path::new(image_path).with_extension("xmp")
}

/// Lit et parse un fichier `.xmp` existant.
///
/// Retourne `XmpData::default()` si le fichier est introuvable (non une erreur).
/// Retourne `Err` uniquement sur une erreur de lecture fichier.
pub fn read_xmp(xmp_path: &Path) -> Result<XmpData, String> {
    if !xmp_path.exists() {
        return Ok(XmpData::default());
    }

    let content = std::fs::read_to_string(xmp_path)
        .map_err(|e| format!("Cannot read XMP file {:?}: {}", xmp_path, e))?;

    parse_xmp_content(&content)
}

/// Écrit les données XMP dans un fichier `.xmp`.
///
/// Le fichier est réécrit entièrement à chaque appel (format simple, non incrémental).
pub fn write_xmp(xmp_path: &Path, data: &XmpData) -> Result<(), String> {
    let content = build_xmp_content(data);
    std::fs::write(xmp_path, content)
        .map_err(|e| format!("Cannot write XMP file {:?}: {}", xmp_path, e))
}

/// Parse le contenu XML XMP et extrait les champs supportés.
fn parse_xmp_content(content: &str) -> Result<XmpData, String> {
    let mut data = XmpData::default();
    let mut reader = Reader::from_str(content);
    reader.config_mut().trim_text(true);

    // État de l'automate de lecture
    let mut current_element: Option<XmpElement> = None;
    let mut in_bag = false;

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) => {
                let raw = std::str::from_utf8(e.name().into_inner()).unwrap_or("");
                let (prefix, name) =
                    raw.split_once(':').unwrap_or(("", raw));

                match (prefix, name) {
                    ("xmp", "Rating") => current_element = Some(XmpElement::Rating),
                    ("xmp", "Label") => current_element = Some(XmpElement::Label),
                    ("dc", "subject") => current_element = Some(XmpElement::DcSubject),
                    ("lr", "hierarchicalSubject") => {
                        current_element = Some(XmpElement::HierarchicalSubject)
                    }
                    ("rdf", "Bag") => in_bag = true,
                    ("rdf", "li") if in_bag => {
                        // La valeur sera lue dans l'événement Text
                    }
                    // rdf:Description peut contenir xmp:Rating etc. comme attributs
                    ("rdf", "Description") => {
                        for attr_result in e.attributes() {
                            if let Ok(attr) = attr_result {
                                let raw_key = std::str::from_utf8(attr.key.into_inner())
                                    .unwrap_or("");
                                let (attr_prefix, attr_name) =
                                    raw_key.split_once(':').unwrap_or(("", raw_key));
                                let val = attr
                                    .decode_and_unescape_value(reader.decoder())
                                    .unwrap_or_default()
                                    .to_string();

                                match (attr_prefix, attr_name) {
                                    ("xmp", "Rating") => {
                                        data.rating = val.parse::<u8>().ok();
                                    }
                                    ("xmp", "Label") => {
                                        if !val.is_empty() {
                                            data.flag = Some(val);
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Empty(ref e)) => {
                // Éléments auto-fermants : rdf:Description peut avoir xmp:Rating/Label en attributs
                let raw = std::str::from_utf8(e.name().into_inner()).unwrap_or("");
                if let ("rdf", "Description") = raw.split_once(':').unwrap_or(("", raw)) {
                    for attr_result in e.attributes() {
                        if let Ok(attr) = attr_result {
                            let raw_key =
                                std::str::from_utf8(attr.key.into_inner()).unwrap_or("");
                            let (attr_prefix, attr_name) =
                                raw_key.split_once(':').unwrap_or(("", raw_key));
                            let val = attr
                                .decode_and_unescape_value(reader.decoder())
                                .unwrap_or_default()
                                .to_string();

                            match (attr_prefix, attr_name) {
                                ("xmp", "Rating") => {
                                    data.rating = val.parse::<u8>().ok();
                                }
                                ("xmp", "Label") => {
                                    if !val.is_empty() {
                                        data.flag = Some(val);
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let raw = std::str::from_utf8(e.name().into_inner()).unwrap_or("");
                let (prefix, name) = raw.split_once(':').unwrap_or(("", raw));

                match (prefix, name) {
                    ("xmp", "Rating") | ("xmp", "Label") => current_element = None,
                    ("dc", "subject") | ("lr", "hierarchicalSubject") => {
                        current_element = None;
                        in_bag = false;
                    }
                    ("rdf", "Bag") => in_bag = false,
                    _ => {}
                }
            }
            Ok(Event::Text(ref e)) => {
                let text = e
                    .unescape()
                    .unwrap_or_default()
                    .trim()
                    .to_string();

                if text.is_empty() {
                    continue;
                }

                match &current_element {
                    Some(XmpElement::Rating) => {
                        data.rating = text.parse::<u8>().ok();
                    }
                    Some(XmpElement::Label) => {
                        data.flag = Some(text);
                    }
                    Some(XmpElement::DcSubject) if in_bag => {
                        data.tags.push(text);
                    }
                    Some(XmpElement::HierarchicalSubject) if in_bag => {
                        data.hierarchical_subjects.push(text);
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XMP parse error: {}", e)),
            _ => {}
        }
    }

    Ok(data)
}

/// Génère le contenu XML XMP complet à partir des données.
fn build_xmp_content(data: &XmpData) -> String {
    let mut writer = Writer::new_with_indent(Cursor::new(Vec::new()), b' ', 2);

    // <?xml version="1.0" encoding="UTF-8"?>
    writer
        .write_event(Event::Decl(quick_xml::events::BytesDecl::new(
            "1.0",
            Some("UTF-8"),
            None,
        )))
        .unwrap_or(());

    // <x:xmpmeta>
    let mut xmpmeta = BytesStart::new("x:xmpmeta");
    xmpmeta.push_attribute(("xmlns:x", "adobe:ns:meta/"));
    xmpmeta.push_attribute(("x:xmptk", "LuminaFast 1.0"));
    writer.write_event(Event::Start(xmpmeta)).unwrap_or(());

    // <rdf:RDF>
    let mut rdf_rdf = BytesStart::new("rdf:RDF");
    rdf_rdf.push_attribute(("xmlns:rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#"));
    writer.write_event(Event::Start(rdf_rdf)).unwrap_or(());

    // <rdf:Description>
    let mut desc = BytesStart::new("rdf:Description");
    desc.push_attribute(("rdf:about", ""));
    desc.push_attribute(("xmlns:xmp", "http://ns.adobe.com/xap/1.0/"));
    desc.push_attribute(("xmlns:dc", "http://purl.org/dc/elements/1.1/"));
    desc.push_attribute(("xmlns:lr", "http://ns.adobe.com/lightroom/1.0/"));
    writer.write_event(Event::Start(desc)).unwrap_or(());

    // <xmp:Rating>
    if let Some(rating) = data.rating {
        writer
            .write_event(Event::Start(BytesStart::new("xmp:Rating")))
            .unwrap_or(());
        writer
            .write_event(Event::Text(BytesText::new(&rating.to_string())))
            .unwrap_or(());
        writer
            .write_event(Event::End(BytesEnd::new("xmp:Rating")))
            .unwrap_or(());
    }

    // <xmp:Label> (flag)
    if let Some(ref flag) = data.flag {
        let label = flag_to_xmp_label(flag);
        if !label.is_empty() {
            writer
                .write_event(Event::Start(BytesStart::new("xmp:Label")))
                .unwrap_or(());
            writer
                .write_event(Event::Text(BytesText::new(label)))
                .unwrap_or(());
            writer
                .write_event(Event::End(BytesEnd::new("xmp:Label")))
                .unwrap_or(());
        }
    }

    // <dc:subject> tags plats
    if !data.tags.is_empty() {
        writer
            .write_event(Event::Start(BytesStart::new("dc:subject")))
            .unwrap_or(());
        writer
            .write_event(Event::Start(BytesStart::new("rdf:Bag")))
            .unwrap_or(());
        for tag in &data.tags {
            writer
                .write_event(Event::Start(BytesStart::new("rdf:li")))
                .unwrap_or(());
            writer
                .write_event(Event::Text(BytesText::new(tag)))
                .unwrap_or(());
            writer
                .write_event(Event::End(BytesEnd::new("rdf:li")))
                .unwrap_or(());
        }
        writer
            .write_event(Event::End(BytesEnd::new("rdf:Bag")))
            .unwrap_or(());
        writer
            .write_event(Event::End(BytesEnd::new("dc:subject")))
            .unwrap_or(());
    }

    // <lr:hierarchicalSubject>
    if !data.hierarchical_subjects.is_empty() {
        writer
            .write_event(Event::Start(BytesStart::new("lr:hierarchicalSubject")))
            .unwrap_or(());
        writer
            .write_event(Event::Start(BytesStart::new("rdf:Bag")))
            .unwrap_or(());
        for subject in &data.hierarchical_subjects {
            writer
                .write_event(Event::Start(BytesStart::new("rdf:li")))
                .unwrap_or(());
            writer
                .write_event(Event::Text(BytesText::new(subject)))
                .unwrap_or(());
            writer
                .write_event(Event::End(BytesEnd::new("rdf:li")))
                .unwrap_or(());
        }
        writer
            .write_event(Event::End(BytesEnd::new("rdf:Bag")))
            .unwrap_or(());
        writer
            .write_event(Event::End(BytesEnd::new("lr:hierarchicalSubject")))
            .unwrap_or(());
    }

    writer
        .write_event(Event::End(BytesEnd::new("rdf:Description")))
        .unwrap_or(());
    writer
        .write_event(Event::End(BytesEnd::new("rdf:RDF")))
        .unwrap_or(());
    writer
        .write_event(Event::End(BytesEnd::new("x:xmpmeta")))
        .unwrap_or(());

    String::from_utf8(writer.into_inner().into_inner())
        .unwrap_or_else(|_| String::from("<!-- XMP encoding error -->"))
}

/// Convertit un flag LuminaFast en label XMP Adobe.
fn flag_to_xmp_label(flag: &str) -> &str {
    match flag.to_lowercase().as_str() {
        "pick" => "Pick",
        "reject" => "Reject",
        _ => "",
    }
}

/// Convertit un label XMP Adobe en flag LuminaFast.
pub fn xmp_label_to_flag(label: &str) -> Option<String> {
    match label {
        "Pick" => Some("pick".to_string()),
        "Reject" => Some("reject".to_string()),
        _ => None,
    }
}

/// Éléments XMP suivis pendant le parsing
#[derive(Debug, PartialEq)]
enum XmpElement {
    Rating,
    Label,
        DcSubject,
    HierarchicalSubject,
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires
// ─────────────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    // ── build_xmp_path ────────────────────────────────────────────────────────

    #[test]
    fn test_build_xmp_path_replaces_extension() {
        let path = build_xmp_path("/path/to/IMG_001.RAF");
        assert_eq!(path, PathBuf::from("/path/to/IMG_001.xmp"));
    }

    #[test]
    fn test_build_xmp_path_jpeg() {
        let path = build_xmp_path("/Users/test/photo.jpg");
        assert_eq!(path, PathBuf::from("/Users/test/photo.xmp"));
    }

    #[test]
    fn test_build_xmp_path_no_extension() {
        let path = build_xmp_path("/path/to/imagefile");
        assert_eq!(path, PathBuf::from("/path/to/imagefile.xmp"));
    }

    // ── flag_to_xmp_label / xmp_label_to_flag ────────────────────────────────

    #[test]
    fn test_flag_to_xmp_label_pick() {
        assert_eq!(flag_to_xmp_label("pick"), "Pick");
    }

    #[test]
    fn test_flag_to_xmp_label_reject() {
        assert_eq!(flag_to_xmp_label("reject"), "Reject");
    }

    #[test]
    fn test_flag_to_xmp_label_unknown() {
        assert_eq!(flag_to_xmp_label("unknown"), "");
    }

    #[test]
    fn test_xmp_label_to_flag_pick() {
        assert_eq!(xmp_label_to_flag("Pick"), Some("pick".to_string()));
    }

    #[test]
    fn test_xmp_label_to_flag_reject() {
        assert_eq!(xmp_label_to_flag("Reject"), Some("reject".to_string()));
    }

    #[test]
    fn test_xmp_label_to_flag_empty() {
        assert_eq!(xmp_label_to_flag(""), None);
    }

    // ── build_xmp_content / parse_xmp_content (round-trip) ───────────────────

    #[test]
    fn test_round_trip_full_data() {
        let original = XmpData {
            rating: Some(4),
            flag: Some("pick".to_string()),
            tags: vec!["paysage".to_string(), "portrait".to_string()],
            hierarchical_subjects: vec!["Lieu/France/Paris".to_string()],
        };

        let xml = build_xmp_content(&original);
        let parsed = parse_xmp_content(&xml).expect("parse should succeed");

        assert_eq!(parsed.rating, Some(4));
        assert_eq!(parsed.flag, Some("Pick".to_string())); // XMP label casing
        assert!(parsed.tags.contains(&"paysage".to_string()));
        assert!(parsed.tags.contains(&"portrait".to_string()));
        assert!(parsed
            .hierarchical_subjects
            .contains(&"Lieu/France/Paris".to_string()));
    }

    #[test]
    fn test_round_trip_minimal_data() {
        let original = XmpData {
            rating: Some(0),
            flag: None,
            tags: vec![],
            hierarchical_subjects: vec![],
        };

        let xml = build_xmp_content(&original);
        let parsed = parse_xmp_content(&xml).expect("parse should succeed");

        assert_eq!(parsed.rating, Some(0));
        assert_eq!(parsed.flag, None);
        assert!(parsed.tags.is_empty());
    }

    #[test]
    fn test_round_trip_no_rating() {
        let original = XmpData {
            rating: None,
            flag: Some("reject".to_string()),
            tags: vec!["nature".to_string()],
            hierarchical_subjects: vec![],
        };

        let xml = build_xmp_content(&original);
        let parsed = parse_xmp_content(&xml).expect("parse should succeed");

        assert_eq!(parsed.rating, None);
        assert_eq!(parsed.flag, Some("Reject".to_string()));
        assert_eq!(parsed.tags, vec!["nature".to_string()]);
    }

    #[test]
    fn test_xmp_content_contains_adobe_namespaces() {
        let data = XmpData::default();
        let xml = build_xmp_content(&data);

        assert!(xml.contains("adobe:ns:meta/"));
        assert!(xml.contains("http://www.w3.org/1999/02/22-rdf-syntax-ns#"));
        assert!(xml.contains("http://ns.adobe.com/xap/1.0/"));
        assert!(xml.contains("http://purl.org/dc/elements/1.1/"));
        assert!(xml.contains("http://ns.adobe.com/lightroom/1.0/"));
    }

    // ── read_xmp / write_xmp (fichier réel) ───────────────────────────────────

    #[test]
    fn test_write_then_read_xmp_file() {
        let tmp = NamedTempFile::new().expect("tempfile");
        let xmp_path = tmp.path().with_extension("xmp");

        let original = XmpData {
            rating: Some(3),
            flag: Some("pick".to_string()),
            tags: vec!["test_tag".to_string()],
            hierarchical_subjects: vec!["Animaux/Oiseaux".to_string()],
        };

        write_xmp(&xmp_path, &original).expect("write_xmp should succeed");
        let parsed = read_xmp(&xmp_path).expect("read_xmp should succeed");

        assert_eq!(parsed.rating, Some(3));
        assert_eq!(parsed.tags, vec!["test_tag".to_string()]);
        assert_eq!(
            parsed.hierarchical_subjects,
            vec!["Animaux/Oiseaux".to_string()]
        );
    }

    #[test]
    fn test_read_xmp_missing_file_returns_default() {
        let path = Path::new("/nonexistent/path/image.xmp");
        let result = read_xmp(path).expect("should not error on missing file");
        assert_eq!(result, XmpData::default());
    }

    #[test]
    fn test_parse_xmp_from_lightroom_style() {
        // Format minimal tel que Lightroom le génère (Rating comme attribut)
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmp:Rating="5"
      xmp:Label="Pick"/>
  </rdf:RDF>
</x:xmpmeta>"#;

        let parsed = parse_xmp_content(xml).expect("parse should succeed");
        assert_eq!(parsed.rating, Some(5));
        assert_eq!(parsed.flag, Some("Pick".to_string()));
    }
}
