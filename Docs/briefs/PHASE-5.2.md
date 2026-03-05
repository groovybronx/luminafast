# Phase 5.2 — Système de Tags Hiérarchique

> **Statut** : ⬜ **En attente**
> **Durée libre**
> **Dépendances** : Phase 5.1 ✅
> **Créé le** : 2026-03-05

---

## Objectif

Implémenter un système complet de tags hiérarchiques (parent/enfant, ex: `Lieu > France > Paris`) permettant de créer, modifier, supprimer des tags, de les assigner en batch à des images, et de les rechercher via auto-complétion. Les tables `tags` et `image_tags` sont déjà présentes dans le schéma SQLite (migration 001_initial.sql) — aucune migration supplémentaire n'est requise.

---

## Périmètre

### ✅ Inclus dans cette phase

- **Commandes Tauri backend** (Rust) :
  - `create_tag(name, parent_id?)` → `TagDTO`
  - `get_all_tags()` → `Vec<TagDTO>` (arbre complet)
  - `rename_tag(id, new_name)` → `()`
  - `delete_tag(id)` → `()` (suppression récursive enfants + image_tags)
  - `add_tags_to_images(image_ids, tag_ids)` → `()` (batch)
  - `remove_tags_from_images(image_ids, tag_ids)` → `()` (batch)
  - `get_image_tags(image_id)` → `Vec<TagDTO>`

- **Service frontend** (`tagService.ts`) wrappant les invoke() Tauri

- **Store Zustand** (`tagStore.ts`) :
  - `tags: TagNode[]` (arbre hiérarchique en mémoire)
  - `loadTags()` → charge depuis Tauri
  - `createTag()`, `renameTag()`, `deleteTag()`
  - `addTagsToImages()`, `removeTagsFromImages()`
  - `getTagsByImageId()` (sélecteur dérivé)

- **Composant `TagsPanel`** (`src/components/metadata/TagsPanel.tsx`) :
  - Liste hiérarchique des tags (indentation par niveau)
  - Input avec auto-complétion pour créer/assigner un tag
  - Actions inline : renommer, supprimer (icônes)
  - Indicateur du nombre d'images par tag

- **Intégration `RightSidebar`** :
  - Ajouter section "Tags" après le panneau EXIF
  - Transmet `imageId` (selection active) + batch (si plusieurs images sélectionnées)

- **Intégration Event Sourcing** :
  - Émettre `ADD_TAG` / `REMOVE_TAG` dans `editStore` lors de chaque modification

- **Tests unitaires + intégration** pour tous les livrables

### ❌ Exclus intentionnellement

- Affichage des tags dans la `GridView` (Phase 5.3+)
- Filtre avancé par tags dans la SearchBar (Phase 5.3)
- Export des tags vers XMP sidecar (Phase 5.4)
- Fusion de tags (merge) — reportée pour cause de complexité UX (future phase)
- Persistance de l'état de l'arbre déplié/replié entre sessions

### 📋 Reporté

- Recherche full-text FTS5 sur les tags (Phase 6.4)
- Tag hiérarchique visible dans la grille (Phase 5.3 — Rating & Flagging)

---

## Dépendances

### Phases

- Phase 1.1 ✅ — Tables `tags` + `image_tags` présentes dans `001_initial.sql`
- Phase 2.1 ✅ — Images ingérées et présentes en base
- Phase 5.1 ✅ — `RightSidebar` connecté à `imageId` actif

### Ressources Existantes

- Tables SQLite : `tags (id, name, parent_id)` + `image_tags (image_id, tag_id)` — déjà disponibles
- Index SQLite : `idx_tags_name`, `idx_tags_parent_id` — déjà présents
- Type `EventType` → `ADD_TAG | REMOVE_TAG` déjà défini dans `src/types/events.ts`
- `CatalogImage.state.tags: string[]` déjà présent dans `src/types/image.ts`
- `RightSidebar.tsx` — injecte déjà `imageId` + `previewUrl`

### Test Infrastructure

- Vitest + Testing Library installés ✅
- Mock `@tauri-apps/api/core` existant ✅
- Rust test framework prêt ✅

---

## Fichiers

### À créer

- `src-tauri/src/commands/tags.rs` — 7 commandes Tauri + tests unitaires intégrés
- `src/types/tag.ts` — Interfaces `TagDTO`, `TagNode` (arbre), `CreateTagDTO`
- `src/services/tagService.ts` — Wrapping invoke() Tauri pour toutes les commandes tags
- `src/stores/tagStore.ts` — Store Zustand tags (arbre hiérarchique + actions)
- `src/components/metadata/TagsPanel.tsx` — UI tags avec auto-complétion et hiérarchie
- `src/components/metadata/__tests__/TagsPanel.test.tsx` — Tests du composant
- `src/services/__tests__/tagService.test.ts` — Tests du service
- `src/stores/__tests__/tagStore.test.ts` — Tests du store

### À modifier

- `src-tauri/src/commands/mod.rs` — Re-exporter `tags::*`
- `src-tauri/src/lib.rs` — Enregistrer les 7 commandes dans Tauri (`.invoke_handler(...)`)
- `src/components/layout/RightSidebar.tsx` — Ajouter `<TagsPanel>` section après EXIF
- `src/stores/index.ts` — Exporter `tagStore`

---

## Interfaces Publiques

### Tauri Commands (Rust → camelCase frontend)

```rust
#[tauri::command]
pub async fn create_tag(state: State<'_, AppState>, name: String, parent_id: Option<u32>) -> CommandResult<TagDTO>;

#[tauri::command]
pub async fn get_all_tags(state: State<'_, AppState>) -> CommandResult<Vec<TagDTO>>;

#[tauri::command]
pub async fn rename_tag(state: State<'_, AppState>, id: u32, new_name: String) -> CommandResult<()>;

#[tauri::command]
pub async fn delete_tag(state: State<'_, AppState>, id: u32) -> CommandResult<()>;

#[tauri::command]
pub async fn add_tags_to_images(state: State<'_, AppState>, image_ids: Vec<u32>, tag_ids: Vec<u32>) -> CommandResult<()>;

#[tauri::command]
pub async fn remove_tags_from_images(state: State<'_, AppState>, image_ids: Vec<u32>, tag_ids: Vec<u32>) -> CommandResult<()>;

#[tauri::command]
pub async fn get_image_tags(state: State<'_, AppState>, image_id: u32) -> CommandResult<Vec<TagDTO>>;
```

### TypeScript DTOs

```typescript
// src/types/tag.ts
export interface TagDTO {
  id: number;
  name: string;
  parentId: number | null;
  imageCount: number;
}

export interface TagNode extends TagDTO {
  children: TagNode[];
}

export interface CreateTagPayload {
  name: string;
  parentId?: number;
}
```

### Store Actions

```typescript
// Dans tagStore
loadTags: () => Promise<void>;
createTag: (name: string, parentId?: number) => Promise<TagNode>;
renameTag: (id: number, newName: string) => Promise<void>;
deleteTag: (id: number) => Promise<void>;
addTagsToImages: (imageIds: number[], tagIds: number[]) => Promise<void>;
removeTagsFromImages: (imageIds: number[], tagIds: number[]) => Promise<void>;
getTagsForImage: (imageId: number) => TagNode[];
flatTags: TagNode[]; // version aplatie pour auto-complétion
```

---

## Contraintes Techniques

### Rust Backend

- JAMAIS de `unwrap()` — `Result<T, E>` systématiquement
- `delete_tag` doit supprimer en cascade : enfants récursifs + toutes les lignes `image_tags` correspondantes
- `add_tags_to_images` utilise `INSERT OR IGNORE` pour éviter les doublons de la table pivot
- Noms de tags : longueur max 100 chars, pas de `/` (séparateur hiérarchique réservé)
- `parent_id` validé en DB (FK existante) — pas de cycle autorisé (tag ne peut pas être son propre parent)
- Tauri v2 : paramètres frontend en **camelCase** → auto-convertis en snake_case côté Rust

### TypeScript Frontend

- Strict mode (`"strict": true`) — pas de `any`
- `TagNode` construit en mémoire depuis la liste plate `TagDTO[]` dans le store
- Auto-complétion sur `flatTags` (liste aplatie) → filtrage côté frontend, pas de requête Rust à chaque frappe
- Gestion erreur : `try/catch` dans le service, propagation avec message utilisateur dans le store

### Database

- Pas de nouvelle migration (tables déjà présentes)
- `image_tags` utilise `INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)`

---

## Architecture Cible

### Schéma DB (déjà présent — migration 001_initial.sql)

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES tags(id)
);

CREATE TABLE image_tags (
    image_id INTEGER REFERENCES images(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (image_id, tag_id)
);
```

### Flux de Données

```
User tape un tag dans TagsPanel
  ↓
tagStore.addTagsToImages([imageId], [tagId])
  ↓
tagService.addTagsToImages(imageIds, tagIds) → invoke('add_tags_to_images', { imageIds, tagIds })
  ↓
Rust: INSERT OR IGNORE INTO image_tags …
  ↓
editStore.appendEvent({ type: 'ADD_TAG', value: tagName })  ← Event Sourcing
  ↓
tagStore re-charge getTagsForImage → UI mise à jour
```

### Construction de l'arbre TagNode

```typescript
// tagStore.ts
function buildTree(flat: TagDTO[]): TagNode[] {
  const map = new Map<number, TagNode>();
  flat.forEach((t) => map.set(t.id, { ...t, children: [] }));
  const roots: TagNode[] = [];
  map.forEach((node) => {
    if (node.parentId == null) {
      roots.push(node);
    } else {
      map.get(node.parentId)?.children.push(node);
    }
  });
  return roots;
}
```

---

## Critère de Validation (Plan de développement)

> « Tag hiérarchique créé, appliqué à 10 images, recherchable »

- ✅ Créer un tag `Lieu`, puis un enfant `France`, puis `Paris`
- ✅ Assigner `Paris` à plusieurs images (batch depuis sélection)
- ✅ Auto-complétion "Par" propose `Paris`
- ✅ `get_image_tags(imageId)` retourne le tag `Paris` avec son `parentId`
- ✅ Supprimer `France` supprime aussi `Paris` + toutes les associations image_tags

---

## Tests Attendus

### Rust (src-tauri/src/commands/tags.rs)

- `test_create_tag_root` — créé sans parent
- `test_create_tag_child` — créé avec parent_id existant
- `test_create_tag_duplicate_name` — erreur attendue (UNIQUE constraint)
- `test_rename_tag` — nom modifié en DB
- `test_delete_tag_cascades_children` — suppression récursive validée
- `test_add_tags_to_images_batch` — plusieurs images, insert or ignore
- `test_remove_tags_from_images` — lignes supprimées de image_tags
- `test_get_image_tags` — retourne la bonne liste

### TypeScript

- `tagStore.test.ts` — `loadTags`, actions CRUD, `getTagsForImage`
- `tagService.test.ts` — mock invoke() pour chaque commande
- `TagsPanel.test.tsx` — render, input auto-complétion, actions rename/delete
