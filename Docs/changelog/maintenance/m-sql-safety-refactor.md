# Maintenance : SQL Safety & Refactorisation `get_folder_images`

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/sql-safety-refactor`
**Type** : Maintenance (sécurité)

## Résumé

**Cause racine** : Failles SQL dans `get_folder_images`.

**Solution** : Refactorisation SQL, validation sécurité.

## Fichiers modifiés

- `src-tauri/src/services/folder_images.rs` — refactorisation SQL
- `src-tauri/src/services/folder_images.test.rs` — tests sécurité

## Critères de validation

- [x] SQL sécurisé
- [x] Tests backend passent (12/12 ✅)
