# Phase M.3.2a — LeftSidebar Refactor (Extract Components)

> **Statut** : ⬜ **En attente**
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

- `src/components/LeftSidebar.tsx` — Use extracted components
- Create new component files in `src/components/sidebar/` subdirectory

## Checkpoints

- [ ] **Checkpoint 1** : Components extracted
- [ ] **Checkpoint 2** : Props interfaces defined
- [ ] **Checkpoint 3** : Tests pass (≥70% coverage)
- [ ] **Checkpoint 4** : No regression behavior

## Critères de Complétion

### Frontend

- [ ] `tsc --noEmit` ✅
- [ ] `npm run lint` ✅
- [ ] Tests Vitest pass (coverage ≥70%)
- [ ] No `any` types

### Integration

- [ ] Tests M.3.2 passent
- [ ] CHANGELOG mis à jour
