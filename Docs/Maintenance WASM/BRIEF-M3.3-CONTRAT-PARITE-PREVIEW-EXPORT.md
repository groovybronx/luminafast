# Phase M3.3 - Contrat de Parite Preview/Export

> **Statut** : ✅ Completee
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

- [x] Checkpoint 1: protocole comparaison valide
- [x] Checkpoint 2: tests parite automatises verts
- [x] Checkpoint 3: seuils documentes

## Pieges et Risques

- Ecarts flottants non significatifs

## Solutions Preventives

- Tolerance numerique explicite
- Cas deterministes

## Documentation Attendue

- Rapport parite preview/export

## Criteres de Completion

- [x] Aucune divergence bloquante
- [x] Suite parite runnable en CI

## Resultat de phase

Contrat M3.3 implemente avec un test backend dedie `src-tauri/src/services/tests/parity_preview_export.rs` qui compare un buffer preview de reference (core partage + normalisation UI) a la sortie export backend TIFF, sur 5 presets communs.

Le test frontend `src/services/__tests__/wasmRenderingService.test.ts` inclut maintenant ces memes presets M3.3 et verrouille la normalisation attendue UI -> core, avec seuil fixe `delta moyen RGB <= 2`.

Validation executee:

- `cd src-tauri && cargo test parity_preview_export` ✅ (2/2)
- `npx vitest run src/services/__tests__/wasmRenderingService.test.ts` ✅ (35/35)
- `npm run type-check` ✅
- `npm run lint` ✅
- `npm run test:ci` ✅ (693/693)
- `cd src-tauri && cargo check` ✅
- `cd src-tauri && cargo clippy --all-targets -- -D warnings` ✅
- `cd src-tauri && cargo test` ✅ (240/240)
