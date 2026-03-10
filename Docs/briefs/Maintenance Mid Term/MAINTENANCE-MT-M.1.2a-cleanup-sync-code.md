# Phase M.1.2a — Cleanup Sync Code in Other Modules

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 2-3 jours
> **Priorité** : P2 (Moyenne)
> **Dépendance** : Phase M.1.2 complétée

## Objectif

Balayer codebase Rust pour identifier et remplacer les appels `std::fs` restants dans contextes non-async (tests, utils, non-critical paths), garantissant cohérence stylée et éliminer dépendances legacy.

## Périmètre

### ✅ Inclus dans cette phase

- Audit complet des fichiers Rust pour `std::fs` usages
- Remplacement `std::fs` → `tokio::fs` dans fichiers async-compatible
- Adaptation code teste (peut rester std::fs si approprié)
- Documentation des décisions par-cas (pourquoi std::fs conservé si cas)
- Validation aucune régression

### ❌ Exclus ou reporté intentionnellement

- Refactoring global error handling (out of scope)
- Migration entire test suite vers async (too large, selective seulement)

## Dépendances

### Phases

- Phase M.1.2 ✅ (core discovery/preview migrated)

## Fichiers

### À modifier

- Various Rust files identified in audit (list after analysis)

## Checkpoints

- [ ] **Checkpoint 1** : Audit complète des std::fs usages
- [ ] **Checkpoint 2** : Code compile (`cargo check` ✅)
- [ ] **Checkpoint 3** : Tests passent
- [ ] **Checkpoint 4** : Grep std::fs returns only justified cases

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅
- [ ] Tests Rust passent

### Integration

- [ ] Tests M.1.1, M.1.2 passent
- [ ] CHANGELOG mis à jour
