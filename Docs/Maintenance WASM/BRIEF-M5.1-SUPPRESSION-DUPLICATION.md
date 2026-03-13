# Phase M5.1 - Suppression de la Duplication Legacy

> **Statut** : ✅ Completee (2026-03-13)
> **Duree estimee** : 0.5 jour

## Objectif

Supprimer proprement les anciennes copies algorithmiques et etablir definitivement une source unique dans `luminafast-image-core`.

## Perimetre

### Inclus dans cette phase

- Identification usages residuels
- Suppression/deprecation des copies legacy
- Verification compile + tests

### Exclus ou reporte intentionnellement

- Evolution fonctionnelle du moteur

### Reporte a partir M5.2

- Synchronisation documentation finale

## Dependances

### Phases

- M2.3 completee
- M3.3 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Tests Rust/TS existants

## Fichiers

### A modifier

- `src-tauri/src/services/mod.rs`
- `luminafast-wasm/src/lib.rs`

### A supprimer (si valide)

- `src-tauri/src/services/image_processing.rs`
- `luminafast-wasm/src/image_processing.rs`

## Interfaces Publiques

- Interfaces externes inchangees

## Contraintes Techniques

- Suppression conditionnee a l'absence d'usages
- Non-regression obligatoire

## Architecture Cible

- Un seul moteur algorithmique actif

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: usages residuels = 0
- [x] Checkpoint 2: build wasm/backend OK
- [x] Checkpoint 3: tests non-regression OK

## Pieges et Risques

- Reference residuelle oubliee
- Suppression prematuree

## Solutions Preventives

- Recherche symbolique exhaustive
- Etapes de deprecation explicites

## Documentation Attendue

- Entree changelog suppression duplication

## Criteres de Completion

- [x] Duplication retiree
- [x] Builds et tests verts
