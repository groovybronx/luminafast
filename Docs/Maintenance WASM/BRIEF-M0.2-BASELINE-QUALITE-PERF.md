# Phase M0.2 - Baseline Qualite et Performance

> **Statut** : ✅ Completee
> **Duree estimee** : 0.5 jour

## Objectif

Capturer un etat initial mesurable avant migration pour comparer objectivement les resultats apres adoption du core partage.

## Perimetre

### Inclus dans cette phase

- Etat initial des tests TS et Rust
- Mesure latence preview WASM sur cas representatifs
- Definition dataset de reference pour parite
- Definition seuils de regression acceptables

### Exclus ou reporte intentionnellement

- Optimisation de performance
- Modification algorithmes image

### Reporte a partir M2.3/M3.3

- Verification parite finale preview/export

## Dependances

### Phases

- M0.1 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Vitest
- Rust test framework

## Fichiers

### A creer

- `Docs/Maintenance WASM/BASELINE-WASM-EXPORT-2026-03.md`

### A modifier

- `Docs/Maintenance WASM/PLAN_COMPLET_MIGRATION_WASM_CORE.md`

## Interfaces Publiques

- Aucune nouvelle interface publique

## Contraintes Techniques

- Mesures reproductibles (commandes, machine, parametres)
- Seuils explicites pour toute comparaison future

## Architecture Cible

- Baseline exploitable pour M2.3 (WASM) et M3.3 (preview/export)

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: baseline tests capturee
- [x] Checkpoint 2: baseline latence capturee
- [x] Checkpoint 3: dataset reference valide
- [x] Checkpoint 4: seuils de regression valides

## Pieges et Risques

- Baseline non reproductible
- Mesures faussees par setup non stable

## Solutions Preventives

- Script de mesure unique
- Parametres de test figes

## Documentation Attendue

- Rapport baseline dans `Docs/Maintenance WASM/BASELINE-WASM-EXPORT-2026-03.md`

## Criteres de Completion

- [x] Baseline tests disponible
- [x] Baseline perf disponible
- [x] Seuils de regression approuves
