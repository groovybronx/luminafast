# Phase 3.2 — Collections Statiques (CRUD)

## Objectif

Implémenter le CRUD complet des collections statiques : créer, renommer, supprimer, vider, et filtrer les images par collection. Connecter la sidebar gauche aux données réelles du catalogue SQLite via un store Zustand dédié.

## État Actuel (pré-3.2)

### ✅ Déjà implémenté (Backend)

- `create_collection(name, collection_type, parent_id)` → Rust + `CollectionDTO`
- `get_collections()` → retourne toutes les collections avec `image_count`
- `add_images_to_collection(collection_id, image_ids)` → table `collection_images`
- Schéma SQLite : tables `collections` + `collection_images` (001_initial.sql)
- `CollectionDTO` dans `src/types/dto.ts`
- Types `Collection`, `SmartQuery` dans `src/types/collection.ts`

### ✅ Déjà implémenté (Frontend Service)

- `CatalogService.createCollection()` → invoke `create_collection`
- `CatalogService.addImagesToCollection()` → invoke `add_images_to_collection`
- `CatalogService.getCollections()` → invoke `get_collections`

### ⚠️ À implémenter

1. **Backend** : 4 commandes manquantes (`delete_collection`, `rename_collection`, `remove_images_from_collection`, `get_collection_images`)
2. **Frontend** : Store Zustand `collectionStore` inexistant
3. **Frontend** : `LeftSidebar` affiche des collections hardcodées/mockées
4. **Frontend** : Aucun filtre par collection dans `App.tsx`
5. **Frontend** : Aucun service pour les 4 nouvelles commandes

---

## Périmètre de la Phase 3.2

### 1. Backend Rust — 4 nouvelles commandes Tauri

#### `delete_collection(collection_id: u32) → CommandResult<()>`

- Vérifier que la collection existe
- Transaction : supprimer `collection_images` puis `collections`
- Retourner erreur si collection introuvable

#### `rename_collection(collection_id: u32, name: String) → CommandResult<()>`

- Valider que `name` n'est pas vide
- UPDATE collections SET name = ? WHERE id = ?
- Retourner erreur si collection introuvable (0 lignes affectées)

#### `remove_images_from_collection(collection_id: u32, image_ids: Vec<u32>) → CommandResult<()>`

- Vérifier que la collection existe
- Transaction : DELETE FROM collection_images WHERE collection_id = ? AND image_id IN (...)
- Idempotent (ne pas échouer si l'image n'est pas dans la collection)

#### `get_collection_images(collection_id: u32) → CommandResult<Vec<ImageDTO>>`

- Vérifier que la collection existe
- INNER JOIN collection_images ON i.id = ci.image_id WHERE ci.collection_id = ?
- LEFT JOIN image_state + exif_metadata (même structure que `get_all_images`)
- ORDER BY ci.sort_order ASC, i.imported_at DESC

### 2. Backend : Enregistrement dans lib.rs

Ajouter les 4 nouvelles commandes dans `tauri::generate_handler![]`

### 3. Frontend : `src/stores/collectionStore.ts` (nouveau)

```typescript
interface CollectionStore {
  collections: CollectionDTO[];
  activeCollectionId: number | null;
  activeCollectionImageIds: number[] | null; // null = toutes les images
  isLoading: boolean;
  error: string | null;

  // Actions async
  loadCollections: () => Promise<void>;
  createCollection: (name: string, parentId?: number) => Promise<CollectionDTO>;
  deleteCollection: (id: number) => Promise<void>;
  renameCollection: (id: number, name: string) => Promise<void>;
  addImagesToCollection: (collectionId: number, imageIds: number[]) => Promise<void>;
  removeImagesFromCollection: (collectionId: number, imageIds: number[]) => Promise<void>;
  setActiveCollection: (id: number | null) => Promise<void>; // charge les images IDs
  clearActiveCollection: () => void;
}
```

### 4. Frontend : Update `src/services/catalogService.ts`

Ajouter les 4 méthodes manquantes :

- `deleteCollection(id: number): Promise<void>`
- `renameCollection(id: number, name: string): Promise<void>`
- `removeImagesFromCollection(collectionId: number, imageIds: number[]): Promise<void>`
- `getCollectionImages(collectionId: number): Promise<ImageDTO[]>`

### 5. Frontend : Update `src/stores/index.ts`

Exporter `useCollectionStore`.

### 6. Frontend : Update `src/components/layout/LeftSidebar.tsx`

- Initialiser les collections au montage via `collectionStore.loadCollections()`
- Afficher les vraies collections depuis `collectionStore.collections`
- Icône `+` : input inline pour créer une collection (Enter ou bouton Valider)
- Click sur collection : `setActiveCollection(id)` + `onSetFilterText('')`
- Click "Toutes les photos" : `clearActiveCollection()` + `onSetFilterText('')`
- Bouton trash sur chaque collection : `deleteCollection(id)`
- Indicateur visuel pour la collection active (bg + texte en blanc)

### 7. Frontend : Update `src/App.tsx`

- Importer `useCollectionStore`
- Modifier `filteredImages` : si `activeCollectionImageIds !== null`, filtrer d'abord par IDs de collection, puis appliquer `filterText`
- Conserver le comportement existant quand aucune collection n'est active

---

## Livrables Techniques

### Fichiers créés

- `src/stores/collectionStore.ts`
- `src/stores/__tests__/collectionStore.test.ts`

### Fichiers modifiés

- `src-tauri/src/commands/catalog.rs` — 4 nouvelles commandes + tests unitaires
- `src-tauri/src/lib.rs` — enregistrement des 4 commandes
- `src/services/catalogService.ts` — 4 nouvelles méthodes + test d'extension
- `src/services/__tests__/catalogService.test.ts` — tests collection methods
- `src/stores/index.ts` — export `useCollectionStore`
- `src/components/layout/LeftSidebar.tsx` — collections réelles + CRUD UI
- `src/App.tsx` — filtrage par collection active

---

## Tests Requis

### Backend Rust (`src-tauri/src/commands/catalog.rs`)

- `test_delete_collection_success` : créer puis supprimer, vérifier 0 lignes
- `test_delete_collection_not_found` : erreur si ID inexistant
- `test_delete_collection_cascades_images` : vérifier que collection_images est nettoyée
- `test_rename_collection_success` : vérifier le nouveau nom
- `test_rename_collection_empty_name` : erreur si nom vide
- `test_rename_collection_not_found` : erreur si ID inexistant
- `test_remove_images_from_collection` : vérifier suppression des liens
- `test_get_collection_images_empty` : liste vide pour collection vide
- `test_get_collection_images_with_data` : vérifier images retournées

### Frontend (`src/stores/__tests__/collectionStore.test.ts`)

- `should initialize with empty state`
- `should load collections` (mock CatalogService)
- `should create a collection` (mock CatalogService)
- `should delete a collection and update list`
- `should rename a collection`
- `should set active collection and store image IDs`
- `should clear active collection`

### Frontend (`src/services/__tests__/catalogService.test.ts`)

- Extension du fichier existant avec les méthodes collection

---

## Critères de Validation

- [x] `cargo check` passe sans erreur — 0 erreur, 3 warnings (dead_code pre-existants) ✅
- [x] `cargo test` : tous les tests Rust passent (existants + nouveaux) — 127/127 ✅
- [x] `tsc --noEmit` passe sans erreur — 0 erreur ✅
- [x] `npm test` : tous les tests frontend passent (existants + nouveaux) — 455/455 ✅
- [x] Les collections SQLite s'affichent dans la sidebar gauche ✅
- [x] Créer une collection depuis la sidebar l'ajoute à SQLite et la liste ✅
- [x] Supprimer une collection la retire de SQLite et de la liste ✅
- [x] Sélectionner une collection filtre la grille d'images ✅
- [x] "Toutes les photos" réinitialise le filtre collection ✅
- [x] Ajouter les images sélectionnées à une collection fonctionne ✅
- [x] Renommer une collection met à jour SQLite et la liste ✅

---

## Dépendances

**Sous-phases complétées (prérequis)** :

- ✅ Phase 1.1 : Schéma SQLite (collections + collection_images)
- ✅ Phase 1.2 : Tauri Commands (create_collection, get_collections, add_images_to_collection)
- ✅ Phase 2.4 : UI d'Import Connectée
- ✅ Phase 3.1 : Grille d'Images Réelle

**Fichiers clés à consulter** :

- `Docs/archives/Lightroomtechnique.md` : Architecture collections Lightroom
- `src-tauri/src/commands/catalog.rs` : Commandes existantes
- `src/services/catalogService.ts` : Service existant
- `src/stores/catalogStore.ts` : Pattern du store pour s'aligner

---

## Hors Périmètre (Phase 3.2)

- Collections intelligentes (Smart Collections) → Phase 3.3
- Glisser-déposer vers collection → Phase 3.4+
- Arborescence de collections (sets de collections) → Phase 3.5
- Rating/Flagging persistants → Phase 5.3
