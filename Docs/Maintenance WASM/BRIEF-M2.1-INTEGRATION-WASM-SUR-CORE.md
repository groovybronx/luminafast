# Phase M2.1 - Integration WASM sur Core Partage

> **Statut** : ✅ Completee (2026-03-12)
> **Duree estimee** : 1 jour

## Objectif

Brancher `luminafast-wasm` sur `luminafast-image-core` pour eliminer la duplication de logique algorithmique.

## Perimetre

### Inclus dans cette phase

- Ajout de la dependance path vers `luminafast-image-core`
- Suppression de la logique algorithmique locale dupliquee
- Conservation du wrapper `wasm-bindgen` (API JS stable)

### Exclus ou reporte intentionnellement

- Changement API TypeScript publique
- Refonte UX frontend

### Reporte a partir M2.2/M2.3

- Validation non-regression frontend
- Validation parite visuelle

## Dependances

### Phases

- M1.3 completee

### Ressources externes

- wasm-pack

### Test Infrastructure

- Tests Rust WASM
- Vitest pour le service TS

## Fichiers

### A modifier

- `luminafast-wasm/Cargo.toml`
- `luminafast-wasm/src/lib.rs`
- `luminafast-wasm/src/image_processing.rs` (deprecation/suppression)

### A verifier

- `src/services/wasmRenderingService.ts`

## Interfaces Publiques

```rust
#[wasm_bindgen]
pub struct PixelFiltersWasm { ... }

#[wasm_bindgen]
pub fn compute_histogram(...)
```

## Contraintes Techniques

- Compatibilite API JS/TS strictement preservee
- Aucune regression de ranges
- Gestion erreurs explicite

## Architecture Cible

- Crate WASM = wrapper
- Crate core = logique

## Dependances Externes

- Aucune nouvelle obligatoire

## Checkpoints

- [x] Checkpoint 1: `wasm-pack build` OK
- [x] Checkpoint 2: import dynamique frontend OK
- [x] Checkpoint 3: tests wrappers OK

## Pieges et Risques

- Rupture de signature wasm-bindgen
- Erreurs de linkage path dependency

## Solutions Preventives

- Tests de contrat TS
- Verification runtime de chargement module

## Documentation Attendue

- MAJ architecture WASM dans APP_DOCUMENTATION

## Criteres de Completion

- [x] Build WASM vert
- [x] Tests wrappers verts
- [x] Duplication WASM retiree
