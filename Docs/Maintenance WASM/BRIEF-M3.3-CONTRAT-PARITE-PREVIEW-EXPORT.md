# Phase M3.3 - Contrat de Parite Preview/Export

> **Statut** : ⬜ En attente
> **Duree estimee** : 1 jour

## Objectif

Garantir la coherence entre preview (WASM) et export (backend) pour les memes parametres d edition.

## Perimetre

### Inclus dans cette phase

- Presets communs de validation
- Comparaison preview buffer vs export buffer
- Seuils de tolerance documentes
- Tests automatises de non-regression

### Exclus ou reporte intentionnellement

- Color management ICC avance
- Pipeline RAW complet

### Reporte a partir M4.1

- Evolution RAW-ready

## Dependances

### Phases

- M2.3 completee
- M3.2 completee

### Ressources externes

- Dataset de reference

### Test Infrastructure

- Tests comparaison backend/WASM

## Fichiers

### A creer

- `Docs/Maintenance WASM/PARITE-PREVIEW-EXPORT.md`
- `src-tauri/src/services/tests/parity_preview_export.rs`

### A modifier

- `src/services/__tests__/wasmRenderingService.test.ts`

## Interfaces Publiques

- Aucune nouvelle interface obligatoire

## Contraintes Techniques

- Formules de normalisation coherentes entre UI/WASM/backend
- Seuil de tolerance fixe

## Architecture Cible

- Contrat de coherence durable et verifiable

## Dependances Externes

- Aucune

## Checkpoints

- [ ] Checkpoint 1: protocole comparaison valide
- [ ] Checkpoint 2: tests parite automatises verts
- [ ] Checkpoint 3: seuils documentes

## Pieges et Risques

- Ecarts flottants non significatifs

## Solutions Preventives

- Tolerance numerique explicite
- Cas deterministes

## Documentation Attendue

- Rapport parite preview/export

## Criteres de Completion

- [ ] Aucune divergence bloquante
- [ ] Suite parite runnable en CI
