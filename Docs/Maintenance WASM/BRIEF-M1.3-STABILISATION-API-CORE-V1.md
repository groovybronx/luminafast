# Phase M1.3 - Stabilisation API Core v1

> **Statut** : ⬜ En attente
> **Duree estimee** : 0.5 jour

## Objectif

Geler le contrat API de `luminafast-image-core` avant integration WASM et backend.

## Perimetre

### Inclus dans cette phase

- Stabilisation signatures publiques
- Documentation ranges/no-op values
- Tests de contrat API

### Exclus ou reporte intentionnellement

- Evolution fonctionnelle

### Reporte a partir M2/M3

- Integration wrappers

## Dependances

### Phases

- M1.2 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Rust tests

## Fichiers

### A modifier

- `luminafast-image-core/src/lib.rs`
- `luminafast-image-core/src/filters.rs`
- `luminafast-image-core/src/errors.rs`

### A creer

- `luminafast-image-core/tests/api_contract.rs`

## Interfaces Publiques

```rust
pub struct PixelFilters;
pub enum ProcessingError;
pub fn apply_filters(...);
pub fn compute_histogram_from_pixels(...);
```

## Contraintes Techniques

- Breaking changes interdits apres cette phase
- Contrat clair pour cibles WASM et backend

## Architecture Cible

- API unique stable pour tous les consommateurs

## Dependances Externes

- Aucune

## Checkpoints

- [ ] Checkpoint 1: signatures gelees
- [ ] Checkpoint 2: tests de contrat verts
- [ ] Checkpoint 3: doc API a jour

## Pieges et Risques

- Ambiguite ranges
- Contrat incomplet

## Solutions Preventives

- Table de ranges explicite
- Tests de bornes et no-op

## Documentation Attendue

- MAJ APP_DOCUMENTATION section moteur image

## Criteres de Completion

- [ ] API v1 stable validee
- [ ] Tests de contrat OK
- [ ] M2 et M3 debloques
