# Phase M1.1 - Initialisation Crate Core Image

> **Statut** : ⬜ En attente
> **Duree estimee** : 1 jour

## Objectif

Creer la crate `luminafast-image-core` qui contient exclusivement la logique metier image partagee entre WASM et backend.

## Perimetre

### Inclus dans cette phase

- Creation crate Rust dediee
- Modules `lib.rs`, `errors.rs`, `filters.rs`, `histogram.rs`
- Struct `PixelFilters` et erreurs `ProcessingError`
- Setup tests unitaires de base

### Exclus ou reporte intentionnellement

- Portage complet des algorithmes
- Integration wrappers WASM/backend

### Reporte a partir M1.2

- Migration de la logique complete

## Dependances

### Phases

- M0.3 completee

### Ressources externes

- Cargo

### Test Infrastructure

- Rust test framework

## Fichiers

### A creer

- `luminafast-image-core/Cargo.toml`
- `luminafast-image-core/src/lib.rs`
- `luminafast-image-core/src/errors.rs`
- `luminafast-image-core/src/filters.rs`
- `luminafast-image-core/src/histogram.rs`

### A modifier

- `luminafast-wasm/Cargo.toml`
- `src-tauri/Cargo.toml`

## Interfaces Publiques

```rust
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

pub fn apply_filters(
    pixels: &[u8],
    width: u32,
    height: u32,
    filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError>;

pub fn compute_histogram_from_pixels(
    pixels: &[u8],
    width: u32,
    height: u32,
) -> Result<Vec<u32>, ProcessingError>;
```

## Contraintes Techniques

- Pas de dependances `tauri`
- Pas de dependances `wasm-bindgen`
- Pas de `unwrap()` en production

## Architecture Cible

- Crate logique pure consommee par wrappers externes

## Dependances Externes

- `thiserror` (si utile)

## Checkpoints

- [ ] Checkpoint 1: crate compile
- [ ] Checkpoint 2: tests de base passent
- [ ] Checkpoint 3: API publique exposee

## Pieges et Risques

- Incompatibilite cible WASM
- Couplage accidentel avec I/O

## Solutions Preventives

- Limiter aux modules de calcul purs
- Revue dependances stricte

## Documentation Attendue

- Entree changelog M1.1
- MAJ architecture dans APP_DOCUMENTATION

## Criteres de Completion

- [ ] `cargo check` crate core OK
- [ ] tests unitaires initiaux OK
- [ ] API de base validee
