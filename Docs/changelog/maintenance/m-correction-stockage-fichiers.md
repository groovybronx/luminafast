# Maintenance : Correction Bug Stockage Fichiers Découverts

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/correction-stockage-fichiers`
**Type** : Maintenance (correction)

## Résumé

**Cause racine** : Stockage fichiers découverts incorrect.

**Solution** : Correction logique stockage, ajout tests.

## Fichiers modifiés

- `src-tauri/src/services/storage.rs` — correction stockage
- `src-tauri/src/services/storage.test.rs` — tests stockage

## Critères de validation

- [x] Stockage fichiers correct
- [x] Tests backend passent (12/12 ✅)
