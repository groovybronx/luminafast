# Phase M.3.2a — LeftSidebar Refactor (Extract Components)

> **Statut** : ✅ **Complétée** (2026-03-10)
> **Durée estimée** : 1-2 jours
> **Priorité** : P2 (Moyenne)
> **Dépendance** : Phase M.3.2 complétée

## Objectif

Extraire composants inline de LeftSidebar en composants React séparés et réutilisables, réduisant la complexity du composant et améliorant testabilité.

## Périmètre

### ✅ Inclus dans cette phase

- Identifier composants inline dans LeftSidebar
- Extraction en fichiers `.tsx` séparés
- Props interfaces pour chaque composant
- Tests unitaires extraits composants
- Documentation composants structure

### ❌ Exclus ou reporté intentionnellement

- Refactoring global styles (out of scope)
- Animation/transition enhancements (feature, reporté)

## Dépendances

### Phases

- Phase M.3.2 ✅ (GridView optimized, foundation ready)

## Fichiers

### À modify

- `src/components/layout/LeftSidebar.tsx` — migrate vers composants extraits
- `src/components/sidebar/NewCollectionInput.tsx` — formulaire création collection
- `src/components/sidebar/CollectionItem.tsx` — item collection statique (rename/delete/drop)
- `src/components/sidebar/SmartCollectionItem.tsx` — item smart collection
- `src/components/sidebar/QuickFilters.tsx` — section filtres rapides (rating/flag)
- `src/components/sidebar/__tests__/*` — tests unitaires composants extraits

## Checkpoints

- [x] **Checkpoint 1** : Components extracted
- [x] **Checkpoint 2** : Props interfaces defined
- [x] **Checkpoint 3** : Tests pass (≥70% coverage)
- [x] **Checkpoint 4** : No regression behavior

## Critères de Complétion

### Frontend

- [x] `tsc --noEmit` ✅
- [x] `npm run lint` ✅
- [x] Tests Vitest pass (coverage ≥70%)
- [x] No `any` types

### Integration

- [x] Tests M.3.2 passent
- [x] CHANGELOG mis à jour

## Validation Exécutée (2026-03-10)

- `npm run type-check` ✅
- `npm run lint` ✅
- `runTests` LeftSidebar + nouveaux composants sidebar ✅ (20 tests passants)
- `runTests` M.3.2 ciblés ✅
  - `src/hooks/__tests__/useLazyImageMeta.test.ts` (2)
  - `src/components/library/__tests__/GridView.performance.test.tsx` (1)
- Couverture ciblée composant extrait:
  - `CollectionItem.tsx` : `74.73%` (mode coverage)
  - `NewCollectionInput.tsx` : `92.59%` (mode coverage)
