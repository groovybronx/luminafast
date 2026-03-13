# Maintenance : Régression Tauri IPC camelCase → snake_case (opérations collection)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/tauri-ipc-regression`
**Type** : Maintenance (correction régression)

## Résumé

**Cause racine** : Migration du protocole IPC Tauri de camelCase à snake_case a provoqué des erreurs sur les opérations de collection.

**Solution** : Correction du mapping, tests de compatibilité.

## Fichiers modifiés

- `src-tauri/src/commands/collections.rs` — mapping corrigé
- `src/components/CollectionManager.tsx` — tests compatibilité

## Critères de validation

- [x] Opérations collection fonctionnent
- [x] Tests frontend passent (68/68 ✅)
