# Phase M0.1 - Cadrage Root Cause

> **Statut** : ⬜ En attente
> **Duree estimee** : 0.5 jour

## Objectif

Formaliser le symptome, la cause racine et la correction structurelle de la duplication WASM/backend. Figer un perimetre clair pour toute la migration.

## Perimetre

### Inclus dans cette phase

- Audit ecart `src-tauri/src/services/image_processing.rs` vs `luminafast-wasm/src/image_processing.rs`
- Raison technique de la divergence
- Decision cible: crate partagee `luminafast-image-core`
- Definition IN/OUT de la migration

### Exclus ou reporte intentionnellement

- Refactor de code
- Modifications API frontend/backend
- Ajout de nouveaux filtres image

### Reporte a partir M0.2/M0.3

- Baseline qualite/perf detaillee
- Generation des briefs operationnels

## Dependances

### Phases

- Aucune

### Ressources Externes

- Aucune

### Test Infrastructure

- Non requise pour cette sous-phase

## Fichiers

### A creer

- `Docs/Maintenance WASM/BRIEF-M0.1-CADRAGE-ROOT-CAUSE.md`

### A modifier

- `Docs/Maintenance WASM/PLAN_COMPLET_MIGRATION_WASM_CORE.md`

## Interfaces Publiques

- Aucune interface code a exposer

## Contraintes Techniques

- Ne pas modifier le code de production
- Justifier la cause racine en 2-3 phrases concretes
- Definir un scope sans ambiguite

## Architecture Cible

- Decision d architecture documentee vers une crate partagee
- Flux cible valide: WASM wrapper -> core <- backend export

## Dependances Externes

- Aucune

## Checkpoints

- [ ] Checkpoint 1: symptome documente
- [ ] Checkpoint 2: cause racine documentee
- [ ] Checkpoint 3: correction structurelle cible validee
- [ ] Checkpoint 4: perimetre IN/OUT fige

## Pieges et Risques

### Pieges Courants

- Cadrage trop large (scope creep)
- Definition de cible trop vague

### Risques Potentiels

- Brief non actionnable pour agent
- Decision non alignee roadmap export/RAW

### Solutions Preventives

- Delimitation stricte du perimetre
- Validation explicite de l architecture cible

## Documentation Attendue

- Mise a jour du plan global de migration

## Criteres de Completion

- [ ] Root cause explicite validee
- [ ] Scope clair et non ambigu
- [ ] Decision cible crate partagee formalisee
