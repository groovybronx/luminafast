# Phase M1.2 - Portage des Algorithmes vers le Core

> **Statut** : ✅ Completee
> **Duree estimee** : 1 jour

## Objectif

Migrer les algorithmes pixel vers `luminafast-image-core` en prenant la version la plus complete comme reference.

## Perimetre

### Inclus dans cette phase

- Portage `apply_filters` (passe unique)
- Portage histogramme RGB (768 bins)
- Validation dimensions et taille buffer
- Tests unitaires fonctionnels et limites

### Exclus ou reporte intentionnellement

- Ajout nouveaux filtres
- Changement des ranges metier

### Reporte a partir M1.3

- Gel du contrat API

## Dependances

### Phases

- M1.1 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Rust tests

## Fichiers

### A modifier

- `luminafast-image-core/src/filters.rs`
- `luminafast-image-core/src/histogram.rs`
- `luminafast-image-core/src/errors.rs`

### A verifier

- `luminafast-wasm/src/image_processing.rs`
- `src-tauri/src/services/image_processing.rs`

## Interfaces Publiques

- Signatures de M1.1 conservees

## Contraintes Techniques

- Resultats deterministes
- Alpha preservee
- Validation input stricte

## Architecture Cible

- Tous les calculs centralises dans le core

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: parite fonctionnelle atteinte
- [x] Checkpoint 2: histogramme valide
- [x] Checkpoint 3: tests limites OK

## Pieges et Risques

- Regression visuelle silencieuse
- Divergence de formule entre versions

## Solutions Preventives

- Tests golden inputs
- Comparaison sortie byte-a-byte sur cas deterministes

## Documentation Attendue

- Note de migration algo dans changelog

## Criteres de Completion

- [x] Tests core complets verts
- [x] Aucun comportement perdu vs reference
