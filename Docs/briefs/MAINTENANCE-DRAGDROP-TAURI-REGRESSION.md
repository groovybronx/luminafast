# Maintenance — Régression Drag & Drop Collections + BatchBar Sélection Vide

> **Statut** : ✅ **Complétée**
> **Date** : 2026-02-25
> **Agent** : GitHub Copilot (Claude Sonnet 4.6)
> **Branche** : `develop` (hotfix critique appliqué directement — régression bloquante post-merge)

---

## Contexte

Suite à l'introduction de la fonctionnalité `LazyLoadedImageCard` et du Drag & Drop collections (Phase 3.2b), deux régressions critiques ont été détectées qui rendaient entièrement inopérants :

1. **L'ajout d'images dans une collection** (depuis le Drag & Drop ET depuis la BatchBar)
2. **La détection visuelle de survol** des items collection lors du Drag & Drop

---

## Régression #1 — Paramètres Tauri camelCase → snake_case

### Symptôme

Toute opération de collection (create, delete, rename, add/remove images, get images…) échoue silencieusement. Aucune erreur visible, mais la DB n'est jamais mise à jour.

### Cause Racine

Le commit `b37e79e` avait modifié les paramètres `invoke()` dans `catalogService.ts` pour utiliser `snake_case` (`collection_id`, `image_ids`…) en croyant corriger une erreur. Cependant, **Tauri v2 `#[tauri::command]` convertit automatiquement camelCase → snake_case** entre le frontend JS et Rust. En envoyant déjà du snake_case, les clés JSON ne correspondaient plus aux paramètres attendus par Rust → échec silencieux IPC.

**Preuve** : la branche `phase/3.5-recherche-filtrage` utilisait camelCase et fonctionnait. Le code Rust n'avait pas changé.

### Correction Structurelle

Rétablir camelCase pour tous les appels `invoke()` de `catalogService.ts` :
- `create_collection` → `{ name, collectionType, parentId }`
- `add_images_to_collection` → `{ collectionId, imageIds }`
- `delete_collection` → `{ collectionId }`
- `rename_collection` → `{ collectionId, name }`
- `remove_images_from_collection` → `{ collectionId, imageIds }`
- `get_collection_images` → `{ collectionId }`
- `create_smart_collection` → `{ name, smartQuery, parentId }`

Tests mis à jour pour refléter le comportement attendu.

**Commit** : `c151bf5`

---

## Régression #2 — BatchBar envoie 0 images + Drag & Drop ne détecte pas la sidebar

### Symptôme A — BatchBar

L'ArchitectureMonitor affiche `Added 0 image(s) to "collection"` lors d'un ajout via la BatchBar, quelle que soit la sélection.

### Cause Racine A

`BatchBar.tsx` appelait `useCatalogStore(state => state.getSelectionArray)()` qui retourne toujours `[]`. La **sélection avait été migrée vers `uiStore`** lors de la Phase 3.1 Maintenance (Checkpoint 1), mais `catalogStore` conservait encore l'ancienne interface vide pour compatibilité. `BatchBar` n'a jamais été mis à jour lors de cette migration.

### Correction A

Remplacer l'import `useCatalogStore` par `useUiStore(state => state.selection)` dans `BatchBar.tsx`.

### Symptôme B — Drag & Drop

La zone de survol des collections dans `LeftSidebar` n'est visuellement jamais activée (pas de highlight bleu), rendant le drop non fonctionnel.

### Cause Racine B

`CollectionItem` utilisait un `dragCounterRef` incrémental pour détecter enter/leave sur les éléments enfants (boutons). Quand le curseur passait d'un enfant vers le parent, `dragleave` bubblait vers le parent et décrémentait le compteur à 0, déclenchant `onDragLeave()` prématurément — le curseur était toujours dans la zone de drop.

### Correction B

Remplacer le `dragCounterRef` par `e.relatedTarget` / `container.contains(related)` dans `handleDragLeave`. Cette approche ne se trompe jamais : elle vérifie si la nouvelle cible est dans le conteneur, indépendamment des événements enfants.

**Commit** : `c703555`

---

## Périmètre

### ✅ Corrigé dans cette maintenance
- `src/services/catalogService.ts` — tous les `invoke()` collection en camelCase
- `src/services/__tests__/catalogService.test.ts` — assertions mises à jour
- `src/components/shared/BatchBar.tsx` — lecture sélection depuis `uiStore`
- `src/components/layout/LeftSidebar.tsx` — `handleDragLeave` robuste + suppression debug logs
- `src/components/library/LazyLoadedImageCard.tsx` — suppression `console.warn` de debug

### ❌ Hors périmètre
- Modification du comportement fonctionnel (aucune nouvelle feature)
- Tests d'intégration drag & drop (reporter à phase future)

---

## Règle Architecturale Établie

> **Tauri v2 `#[tauri::command]` convertit automatiquement camelCase (JS) → snake_case (Rust).**
> Tout appel `invoke()` frontend DOIT utiliser camelCase, pas snake_case.
> Les DTOs TypeScript (`types/dto.ts`) restent en snake_case car ils représentent directement la réponse Rust sérialisée.

---

## Résultats

| Métrique | Valeur |
|----------|--------|
| Tests avant | 551/551 ✅ |
| Tests après | 551/551 ✅ |
| Régressions introduites | 0 |
| TypeScript strict | ✅ 0 erreurs |
| ESLint | ✅ 0 warnings |
