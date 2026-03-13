# Maintenance : Correction Bugs Scan Discovery & Polling Infini

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/correction-scan-discovery`
**Type** : Maintenance (correction)

## Résumé

**Cause racine** : Bugs scan discovery et polling infini.

**Solution** : Correction logique scan, ajout tests polling.

## Fichiers modifiés

- `src-tauri/src/services/discovery.rs` — correction scan
- `src-tauri/src/services/polling.rs` — tests polling

## Critères de validation

- [x] Scan discovery fonctionne
- [x] Polling infini résolu
- [x] Tests backend passent (12/12 ✅)
