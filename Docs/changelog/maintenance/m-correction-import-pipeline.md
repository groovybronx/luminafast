# Maintenance : Correction Pipeline Import (DB + SQL + Init)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/correction-import-pipeline`
**Type** : Maintenance (correction)

## Résumé

**Cause racine** : Pipeline import comportait des erreurs SQL et d'initialisation.

**Solution** : Correction SQL, refactorisation pipeline, tests init.

## Fichiers modifiés

- `src-tauri/src/services/import.rs` — correction SQL
- `src-tauri/src/services/init.rs` — tests init

## Critères de validation

- [x] Pipeline import fonctionne
- [x] Tests backend passent (12/12 ✅)
