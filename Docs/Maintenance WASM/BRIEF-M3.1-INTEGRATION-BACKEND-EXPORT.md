# Phase M3.1 - Integration Backend Export sur Core

> **Statut** : ✅ Completee
> **Duree estimee** : 1 jour

## Objectif

Brancher `src-tauri` sur `luminafast-image-core` pour utiliser le meme moteur que WASM lors des exports.

## Perimetre

### Inclus dans cette phase

- Ajout dependency core dans backend
- Raccord des services export backend au core
- Retrait des usages actifs de la copie backend

### Exclus ou reporte intentionnellement

- Support RAW avance
- Refonte produit complete du module export

### Reporte a partir M3.2

- Pipeline export non destructif complet

## Dependances

### Phases

- M1.3 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Rust unit/integration tests

## Fichiers

### A modifier

- `src-tauri/Cargo.toml`
- `src-tauri/src/services/mod.rs`
- `src-tauri/src/services/image_processing.rs` (deprecation)
- `src-tauri/src/commands/*` (points export)

### A creer

- `src-tauri/src/services/export_rendering.rs` (si absent)

## Interfaces Publiques

```rust
#[tauri::command]
pub fn export_image_edited(...) -> Result<ExportResultDTO, String>;
```

## Contraintes Techniques

- Compatibilite commandes publiques
- Gestion erreurs explicite via Result

## Architecture Cible

- Backend export appelle le core uniquement

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: build backend vert
- [x] Checkpoint 2: tests export unitaires verts
- [x] Checkpoint 3: usages copie backend supprimes

## Pieges et Risques

- Points d entree export non raccordes

## Solutions Preventives

- Tests integration commande -> service

## Documentation Attendue

- MAJ section export backend dans APP_DOCUMENTATION

## Criteres de Completion

- [x] `cargo check` backend OK
- [x] Tests export cibles OK
