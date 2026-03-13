# Phase 5 — Metadata

Phase dédiée à la gestion avancée des métadonnées : EXIF, tags hiérarchiques, rating/flagging persistants, et intégration sidecar XMP.

---

## 5.1 Panneau EXIF Connecté

**Statut** : ✅ Complétée | **Date** : 2026-07-10 | **Agent** : Copilot

### Objectifs

- Afficher toutes les métadonnées EXIF/IPTC/XMP d’une image
- Connexion live au backend (SQLite + extraction EXIF)
- UI responsive, collapsible, tri par catégorie

### Contexte

Première étape pour rendre visibles toutes les infos techniques et contextuelles d’une image importée.

### Problèmes Tackled

- Métadonnées non affichées
- Extraction EXIF lente ou incomplète
- UI peu lisible pour gros EXIF

### Solutions Apportées

- Extraction EXIF via rust-exif, iptc, xmp
- Commande Tauri : get_image_metadata
- Store metadataStore.ts
- UI collapsible par catégorie (EXIF, IPTC, XMP)
- Tri alphabétique, recherche dans panneau

### Fichiers Clés

- `src-tauri/src/commands/metadata.rs`, `src/services/metadataService.ts`, `src/stores/metadataStore.ts`, `src/components/metadata/MetadataPanel.tsx`

### Validation

- [x] Extraction EXIF complète
- [x] UI responsive et lisible
- [x] Recherche et tri fonctionnels

### Leçons Apprises

EXIF = jungle de formats. UI collapsible indispensable. Extraction Rust plus fiable que JS.

---

## 5.2 Système de Tags Hiérarchique

**Statut** : ✅ Complétée | **Date** : 2026-07-11 | **Agent** : Copilot

### Objectifs

- Implémenter tags hiérarchiques (arborescence)
- CRUD complet (ajout, suppression, renommage, drag & drop)
- Assignation multi-image, recherche par tag

### Contexte

Permet organisation fine des images, navigation par thématique, et recherche avancée.

### Problèmes Tackled

- Pas de tags ou tags à plat
- Pas de hiérarchie ni drag & drop
- Assignation fastidieuse

### Solutions Apportées

- Modèle TagNode : id, name, parent_id, children[]
- Store tagStore.ts
- UI drag & drop arborescente
- Commandes Tauri : create_tag, delete_tag, rename_tag, assign_tag_to_images
- Recherche par tag dans SearchBar

### Fichiers Clés

- `src-tauri/src/commands/tags.rs`, `src/services/tagService.ts`, `src/stores/tagStore.ts`, `src/components/tags/TagTree.tsx`, `src/components/tags/TagAssignDialog.tsx`

### Validation

- [x] CRUD complet
- [x] Drag & drop hiérarchique
- [x] Assignation multi-image
- [x] Recherche par tag

### Leçons Apprises

Hiérarchie = UX ++. Drag & drop natif performant. Assignation batch = gain de temps majeur.

---

## 5.3 Rating & Flagging Persistants

**Statut** : ✅ Complétée | **Date** : 2026-07-11 | **Agent** : Copilot

### Objectifs

- Système de rating (1-5 étoiles) et flagging (rejet, pick, etc.)
- Persistance dans SQLite et synchronisation UI
- Raccourcis clavier, batch editing

### Contexte

Permet tri rapide, sélection, et workflow pro (culling, editing, export).

### Problèmes Tackled

- Rating/flagging non persistants
- Pas de batch editing
- UI non synchronisée

### Solutions Apportées

- Store ratingStore.ts
- Commandes Tauri : set_rating, set_flag, batch_set_rating
- UI : étoiles cliquables, flags colorés
- Raccourcis clavier (1-5, X, P, U)
- BatchBar pour édition groupée

### Fichiers Clés

- `src-tauri/src/commands/rating.rs`, `src/services/ratingService.ts`, `src/stores/ratingStore.ts`, `src/components/library/ImageCard.tsx`, `src/components/shared/BatchBar.tsx`

### Validation

- [x] Persistance rating/flagging
- [x] UI synchrone
- [x] Raccourcis clavier fonctionnels
- [x] Batch editing opérationnel

### Leçons Apprises

BatchBar = pattern clé. Raccourcis = rapidité pro. Persistance = fiabilité.

---

## 5.4 Sidecar XMP

**Statut** : ✅ Complétée | **Date** : 2026-03-07 | **Agent** : Copilot

### Objectifs

- Générer et lire sidecar XMP pour chaque image
- Synchroniser rating, flag, tags, edits avec XMP
- Support import/export XMP

### Contexte

Interopérabilité avec Lightroom, CaptureOne, etc. Permet roundtrip et migration.

### Problèmes Tackled

- Pas de sidecar XMP
- Perte de métadonnées lors de l’export
- Pas de roundtrip possible

### Solutions Apportées

- Génération XMP via crate xmp-writer
- Commandes Tauri : export_xmp, import_xmp
- Mapping rating/flag/tags/edits ↔ XMP
- UI : bouton export/import XMP

### Fichiers Clés

- `src-tauri/src/commands/xmp.rs`, `src/services/xmpService.ts`, `src/components/metadata/XmpPanel.tsx`, `src/stores/metadataStore.ts`

### Validation

- [x] Génération XMP conforme
- [x] Import roundtrip validé
- [x] Synchronisation rating/flag/tags/edits

### Leçons Apprises

Interop XMP = adoption pro. Mapping bidirectionnel complexe. Tests roundtrip indispensables.

---
