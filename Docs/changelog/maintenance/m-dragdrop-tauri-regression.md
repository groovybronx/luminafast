# Maintenance : Régression BatchBar sélection vide + Drag & Drop détection collection

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/dragdrop-tauri-regression`
**Type** : Maintenance (correction régression)

## Résumé

**Cause racine** : Régression lors du passage camelCase → snake_case sur IPC Tauri, provoquant une perte de sélection et une détection incorrecte des collections.

**Solution** : Correction du mapping IPC, ajout de tests de sélection vide et drag&drop.

## Fichiers modifiés

- `src-tauri/src/commands/collections.rs` — mapping corrigé
- `src/components/BatchBar.tsx` — tests sélection vide
- `src/components/DragDropCollection.tsx` — tests drag&drop

## Critères de validation

- [x] Sélection vide gérée
- [x] Drag & Drop fonctionne
- [x] Tests frontend passent (68/68 ✅)
