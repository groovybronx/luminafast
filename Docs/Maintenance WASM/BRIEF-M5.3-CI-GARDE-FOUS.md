# Phase M5.3 - CI Garde-Fous

> **Statut** : ✅ Complétée (2026-03-13)
> **Duree estimee** : 0.5 jour

## Objectif

Ajouter des garde-fous CI qui bloquent toute reintroduction de duplication et preservent la parite preview/export.

## Perimetre

### Inclus dans cette phase

- Script de detection source unique
- Job CI build wasm + backend + tests cibles
- Job CI de parite preview/export

### Exclus ou reporte intentionnellement

- Refonte globale du pipeline CI

### Reporte a partir maintenance CI future

- Optimisation duree pipeline

## Dependances

### Phases

- M5.2 completee

### Ressources externes

- Workflows GitHub Actions

### Test Infrastructure

- Scripts shell + tests existants

## Fichiers

### A creer

- `scripts/check-single-source-image-core.sh`

### A modifier

- `.github/workflows/*` (workflow principal)
- `scripts/test-workflow.sh` (si requis)

## Interfaces Publiques

- Aucune

## Contraintes Techniques

- Echec CI si duplication detectee
- Timeouts conformes conventions repo

## Architecture Cible

- Protection automatique de l'architecture

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: guard script detecte cas de doublon
- [x] Checkpoint 2: workflow execute nouveaux jobs
- [x] Checkpoint 3: CI verte sur etat conforme

## Pieges et Risques

- Faux positifs du script
- Jobs trop longs

## Solutions Preventives

- Script minimaliste et explicite
- Scope de tests cible

## Documentation Attendue

- MAJ APP_DOCUMENTATION section CI

## Criteres de Completion

- [x] Guard duplication actif
- [x] Job parite actif
- [x] Pipeline stable
