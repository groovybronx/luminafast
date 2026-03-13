# Phase M4.1 - Architecture Pipeline RAW-Ready

> **Statut** : ✅ Completee
> **Duree estimee** : 1 jour

## Objectif

Preparer le moteur core pour l evolution RAW en separant clairement les etapes du pipeline image.

## Perimetre

### Inclus dans cette phase

- Decoupage pipeline explicite (input -> transform -> output)
- Interfaces internes extensibles
- Tests unitaires pipeline non-RAW

### Exclus ou reporte intentionnellement

- Decodeur RAW reel
- Optimisations SIMD avancees

### Reporte a partir M4.2

- Abstraction decodeur RAW

## Dependances

### Phases

- M3.3 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Rust unit tests

## Fichiers

### A creer

- `luminafast-image-core/src/pipeline.rs`

### A modifier

- `luminafast-image-core/src/lib.rs`
- `luminafast-image-core/src/filters.rs`

## Interfaces Publiques

```rust
pub trait ImagePipelineStep {
    fn apply(&self, pixels: &mut [u8], width: u32, height: u32) -> Result<(), ProcessingError>;
}
```

## Contraintes Techniques

- Compatibilite API core v1 maintenue
- Couplage faible entre etapes

## Architecture Cible

- Pipeline compose extensible pour futures etapes RAW

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: architecture pipeline codee
- [x] Checkpoint 2: tests unitaires pipeline verts
- [x] Checkpoint 3: compat API v1 preservee

## Pieges et Risques

- Sur-architecture precoce

## Solutions Preventives

- MVP pipeline simple et extensible

## Documentation Attendue

- MAJ architecture core image dans APP_DOCUMENTATION

## Criteres de Completion

- [x] Pipeline interne extensible valide
- [x] Non-regression core verifiee
