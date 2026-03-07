# PHASE 5.4 — Sidecar XMP (Lecture/Écriture)

## 1. Objectif

Implémenter la lecture/écriture de fichiers sidecar `.xmp` conformes au standard Adobe XMP.
Les métadonnées (rating, flag, tags hiérarchiques) peuvent être exportées vers `.xmp` pour interopérabilité avec Lightroom, DarkTable, etc., et importées depuis des `.xmp` existants à la (ré)ingestion.

## 2. Fichiers à créer/modifier

### Backend Rust

| Fichier                         | Action                                                |
| ------------------------------- | ----------------------------------------------------- |
| `src-tauri/Cargo.toml`          | Ajouter `quick-xml = "0.37"`                          |
| `src-tauri/src/services/xmp.rs` | **Créer** — Service XMP (read/write/parse/build)      |
| `src-tauri/src/services/mod.rs` | Ajouter `pub mod xmp;`                                |
| `src-tauri/src/commands/xmp.rs` | **Créer** — Commandes Tauri XMP                       |
| `src-tauri/src/commands/mod.rs` | Ajouter `pub mod xmp;`                                |
| `src-tauri/src/lib.rs`          | Enregistrer les 4 commandes XMP dans `invoke_handler` |

### Frontend

| Fichier                                               | Action                                             |
| ----------------------------------------------------- | -------------------------------------------------- |
| `src/services/xmpService.ts`                          | **Créer** — Wrappers `invoke()` pour commandes XMP |
| `src/components/metadata/XmpPanel.tsx`                | **Créer** — UI pour export/import XMP              |
| `src/components/metadata/__tests__/XmpPanel.test.tsx` | **Créer** — Tests composant                        |
| `src/components/layout/RightSidebar.tsx`              | Modifier — Intégrer XmpPanel                       |

## 3. Dépendances

- ✅ Phase 5.1 (EXIF connecté)
- ✅ Phase 5.2 (Tags hiérarchiques — structure DB `tags` + `image_tags`)
- ✅ Phase 5.3 (Rating/Flag persistants — `image_state.rating`, `image_state.flag`)

## 4. Interfaces & Structures

### Rust — `XmpData`

```rust
pub struct XmpData {
    pub rating: Option<u8>,                   // xmp:Rating (0-5)
    pub flag: Option<String>,                 // xmp:Label ("Pick", "Reject", "")
    pub tags: Vec<String>,                    // dc:subject bag (tags plats)
    pub hierarchical_subjects: Vec<String>,   // lr:hierarchicalSubject (ex: "Lieu/France/Paris")
}
```

### Rust — Commandes Tauri

```rust
export_image_xmp(image_id: u32, image_path: String) -> Result<String, String>
import_image_xmp(image_id: u32, xmp_path: String) -> Result<XmpImportResultDTO, String>
get_xmp_status(image_path: String) -> Result<XmpStatusDTO, String>
```

### TypeScript — `XmpService`

```typescript
XmpService.exportImageXmp(imageId: number, imagePath: string): Promise<string>
XmpService.importImageXmp(imageId: number, xmpPath: string): Promise<XmpImportResult>
XmpService.getXmpStatus(imagePath: string): Promise<XmpStatus>
```

## 5. Format XMP (standard Adobe)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="LuminaFast 1.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:lr="http://ns.adobe.com/lightroom/1.0/">
      <xmp:Rating>4</xmp:Rating>
      <xmp:Label>Pick</xmp:Label>
      <dc:subject>
        <rdf:Bag>
          <rdf:li>paysage</rdf:li>
        </rdf:Bag>
      </dc:subject>
      <lr:hierarchicalSubject>
        <rdf:Bag>
          <rdf:li>Lieu/France/Paris</rdf:li>
        </rdf:Bag>
      </lr:hierarchicalSubject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
```

- `xmp:Label` : "Pick" pour flag=pick, "Reject" pour flag=reject, absent sinon
- `lr:hierarchicalSubject` : chemin construit à partir de l'arborescence parent/enfant des tags

## 6. Chemin sidecar

`/path/to/IMG_001.RAF` → `/path/to/IMG_001.xmp`
Règle : remplacer l'extension par `.xmp` (convention Adobe/Lightroom).

## 7. Critères de validation

- [ ] Export XMP d'une image avec rating=4, flag=pick, tags=["paysage"] → fichier `.xmp` lisible par Lightroom
- [ ] Import XMP existant → rating/flag/tags mis à jour en DB
- [ ] `get_xmp_status` retourne `exists: false` si le `.xmp` n'existe pas
- [ ] XmpPanel affiche le bouton "Exporter XMP" et l'état du sidecar
- [ ] Tests Rust : `write_xmp` → `read_xmp` → données identiques (round-trip)
- [ ] Tests Vitest : rendu XmpPanel, appels service mockés

## 8. Contexte architectural

- Les tags hiérarchiques sont dans la table `tags` (avec `parent_id`) et `image_tags`
- Le rating/flag est dans `image_state` (rating INTEGER 0-5, flag TEXT 'pick'/'reject'/NULL)
- Standard XMP : https://developer.adobe.com/xmp/docs/
- `quick-xml` v0.37 : événements SAX pour parsing, écriture via `Writer`
