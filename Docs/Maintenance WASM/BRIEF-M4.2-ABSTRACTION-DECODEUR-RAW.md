# Phase M4.2 - Abstraction Decodeur RAW

> **Statut** : ⬜ En attente
> **Duree estimee** : 1 jour

## Objectif

Definir une abstraction decodeur RAW permettant d'integrer des decodeurs concrets sans coupler le core a une implementation unique.

## Perimetre

### Inclus dans cette phase

- Trait/interface decodeur RAW
- Type intermediaire image lineaire
- Mock decodeur pour tests de contrat

### Exclus ou reporte intentionnellement

- Support complet multi-vendor
- Integration UI/UX RAW

### Reporte a partir M4.3

- Validation pilote avec formats reels

## Dependances

### Phases

- M4.1 completee

### Ressources externes

- Aucune obligatoire

### Test Infrastructure

- Rust tests de contrat

## Fichiers

### A creer

- `luminafast-image-core/src/raw_decoder.rs`
- `luminafast-image-core/tests/raw_decoder_contract.rs`

### A modifier

- `luminafast-image-core/src/lib.rs`
- `luminafast-image-core/src/pipeline.rs`

## Interfaces Publiques

```rust
pub struct LinearImage {
    pub width: u32,
    pub height: u32,
    pub pixels_rgb_f32: Vec<f32>,
}

pub trait RawDecoder {
    fn decode_to_linear_rgb(&self, input: &[u8]) -> Result<LinearImage, ProcessingError>;
}
```

## Contraintes Techniques

- Contrat independant de toute crate vendor
- Erreurs explicites

## Architecture Cible

- Core compatible extension decodeurs

## Dependances Externes

- Aucune imposee

## Checkpoints

- [ ] Checkpoint 1: trait decodeur defini
- [ ] Checkpoint 2: mock decodeur passe tests
- [ ] Checkpoint 3: pipeline compile avec abstraction

## Pieges et Risques

- Interface trop specifique a un format
- Surface API trop large

## Solutions Preventives

- Contrat minimal
- Cas de test generiques

## Documentation Attendue

- Contrat decodeur RAW documente dans APP_DOCUMENTATION

## Criteres de Completion

- [ ] Abstraction decodeur validee
- [ ] Tests de contrat verts
