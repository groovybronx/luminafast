# Phase 3.4 — Navigateur de Dossiers (Folder Navigator)

## Objectif

Implémenter une arborescence des dossiers dans la sidebar gauche, affichant les volumes/dossiers réels importés avec compteurs d'images par dossier et indicateurs de disponibilité en ligne/hors ligne.

## État Actuel (pré-3.4)

### ✅ Déjà implémenté

- Tables SQLite `folders` + `images.folder_id` avec FOREIGN KEY (Phase 1.1)
- Discovery & ingestion récursive (Phase 2.1) — fichiers importés avec `folder_id`
- Collections statiques CRUD (Phase 3.2)
- Smart Collections (Phase 3.3)
- LeftSidebar structure existante avec Collections

### ✅ Implémenté (Phase 3.4)

1. ✅ **Backend** : Command `get_folder_tree()` retournant hiérarchie complète avec counts
2. ✅ **Backend** : Command `get_folder_images(folder_id)` (filtrage par dossier)
3. ✅ **Backend** : Command `update_volume_status(volume_name, is_online)` (détection en ligne/hors ligne)
4. ✅ **Frontend** : Service methods pour wrapper les commandes
5. ✅ **Frontend** : Store `folderStore` pour gérer l'état du navigateur de dossiers
6. ✅ **Frontend** : UI dans LeftSidebar : nouvel onglet/section "Dossiers" avec arborescence interactive
7. ✅ **Frontend** : Filtrage par dossier dans `App.tsx` (similaire à collections)
8. ✅ **Backend** : Fix critique — Ingestion popule automatiquement la table `folders`

### ⚠️ Action Restante

- **Backfill** : Images existantes avec `folder_id=NULL` ne sont pas liées aux dossiers (voir section "État d'Implémentation" ci-dessous)

---

## Périmètre de la Phase 3.4

### 1. Backend Rust — Nouvelles commandes Tauri

#### `get_folder_tree() → CommandResult<Vec<FolderTreeNode>>`

Type résultat :

```rust
pub struct FolderTreeNode {
    pub id: u32,
    pub name: String,
    pub path: String,
    pub volume_name: String,
    pub is_online: bool,
    pub image_count: u32,           // images directement dans ce dossier
    pub total_image_count: u32,     // images récursives (ce dossier + enfants)
    pub children: Vec<FolderTreeNode>,
}
```

- Requête SQL : SELECT `folders.id, name, path, volume_name, (SELECT COUNT(*) FROM images WHERE folder_id = folders.id) as count`
- Construit récursivement l'arborescence en Rust (structure parent-enfant)
- Retourne uniquement les dossiers qui contiennent au moins 1 image (ou qui ont des enfants avec images)

#### `get_folder_images(folder_id: u32, recursive: bool) → CommandResult<Vec<ImageDTO>>`

- Si `recursive=true` : retourne images de ce dossier ET tous les sous-dossiers
- Si `recursive=false` : images de ce dossier uniquement
- Même structure `ImageDTO` que `get_all_images` (LEFT JOIN exif_metadata + image_state)
- ORDER BY `filename` ASC

#### `update_volume_status(volume_name: String, is_online: bool) → CommandResult<()>`

- UPDATE `folders` SET `is_online` = ? WHERE `volume_name` = ?
- Utilisé lors de la scan/découverte pour marquer les volumes hors ligne

### 2. Backend : Nouveau champ `folders` table

Ajouter colonne `is_online` à la table `folders` (migration 004) :

```sql
ALTER TABLE folders ADD COLUMN is_online BOOLEAN DEFAULT 1;
```

### 3. Front Frontend : `src/services/catalogService.ts`

Ajouter 3 méthodes :

```typescript
getFolderTree(): Promise<FolderTreeNode[]>
getFolderImages(folderId: number, recursive: boolean): Promise<ImageDTO[]>
updateVolumeStatus(volumeName: string, isOnline: boolean): Promise<void>
```

### 4. Frontend : `src/types/folder.ts` (nouveau)

**⚠️ CONVENTION PROJET** : Les DTOs utilisent **snake_case** (pas camelCase) pour correspondre à la sérialisation Rust par défaut (voir `ImageDTO`, `CollectionDTO`, etc.)

```typescript
export interface FolderTreeNode {
  id: number;
  name: string;
  path: string;
  volume_name: string; // ⚠️ snake_case
  is_online: boolean; // ⚠️ snake_case
  image_count: number; // ⚠️ snake_case
  total_image_count: number; // ⚠️ snake_case
  children: FolderTreeNode[];
}

export interface FolderFilter {
  folder_id: number | null; // ⚠️ snake_case
  recursive: boolean;
}
```

### 5. Frontend : `src/stores/folderStore.ts` (nouveau)

```typescript
interface FolderStore {
  folderTree: FolderTreeNode[];
  activeFolderId: number | null;
  activeFolderImageIds: number[] | null;
  expandedFolderIds: Set<number>; // pour l'arborescence UI
  isLoading: boolean;
  error: string | null;

  // Actions async
  loadFolderTree: () => Promise<void>;
  setActiveFolder: (id: number, recursive: boolean) => Promise<void>;
  clearActiveFolder: () => void;
  toggleFolderExpanded: (id: number) => void;
  checkVolumeStatus: () => Promise<void>; // scan volumes en ligne/hors ligne
}
```

### 6. Frontend : `src/stores/index.ts`

Exporter `useFolderStore`.

### 7. Frontend : Update `src/components/layout/LeftSidebar.tsx`

Ajouter un nouvel onglet/section "Dossiers" (après Collections) :

- Arborescence récursive des dossiers via `folderTree`
- Icône dossier avec compteur d'images : "Documents (42 images)"
- Icône disque pour les volumes avec statut en ligne/hors ligne 🟢 / 🟡
- Click sur dossier : `setActiveFolder(id, recursive=true)`
- Flèche expands/collapse : `toggleFolderExpanded(id)`
- Indent visual basé sur profondeur (similaire à Finder macOS)
- Filtrage parallèle : si dossier actif + filtre texte, combiner les deux

### 8. Frontend : Update `src/App.tsx`

- Importer `useFolderStore`
- Priorité filtrage : `collection > folder > text search`
- Si `activeFolderId !== null` : charger images du dossier (recursive), puis appliquer collection et texte
- Conserver l'ordre de priorité : collections avant folders

---

## Livrables Techniques

### Fichiers créés

- `src/types/folder.ts`
- `src/stores/folderStore.ts`
- `src/stores/__tests__/folderStore.test.ts`
- Migration SQL `004_add_folder_online_status.sql`

### Fichiers modifiés

- `src-tauri/src/commands/catalog.rs` — 3 nouvelles commandes + tests
- `src-tauri/src/lib.rs` — enregistrement 3 commandes
- `src-tauri/src/models/dto.rs` — ajouter `FolderTreeNode` DTO
- `src/services/catalogService.ts` — 3 nouvelles méthodes
- `src/services/__tests__/catalogService.test.ts` — tests folder methods
- `src/stores/index.ts` — export `useFolderStore`
- `src/components/layout/LeftSidebar.tsx` — nouvel onglet/section Dossiers
- `src/App.tsx` — filtrage par folder + priorité

---

## Tests Requis

### Backend Rust

- `test_get_folder_tree_structure` : vérifier hiérarchie complète
- `test_get_folder_tree_counts_correct` : vérifier image_count et total_image_count
- `test_get_folder_tree_filters_empty_folders` : dossiers sans images exclus
- `test_get_folder_images_direct` : images du dossier uniquement
- `test_get_folder_images_recursive` : images + descendants
- `test_update_volume_status_online` : marquer volume en ligne
- `test_update_volume_status_offline` : marquer volume hors ligne

### Frontend

- `src/stores/__tests__/folderStore.test.ts` (12+ tests) :
  - `should initialize with empty tree`
  - `should load folder tree`
  - `should set active folder and load images`
  - `should get folder recursive images`
  - `should toggle folder expansion state`
  - `should clear active folder`

---

## Dépendances & Blocages

### Dépendances

- ✅ Phase 1.1 (schéma `folders` + FK)
- ✅ Phase 2.1 (ingestion réelle avec `folder_id`)
- ✅ Phase 3.2 (Collections CRUD — patterns similaires)

### Pas de blocages identifiés

---

## Contexte Architectural

### Schéma Filtrage Multi-Niveaux

L'app doit supporter :

1. **Filtre par collection** : `where image_id IN (select image_id from collection_images where collection_id = ?)`
2. **Filtre par dossier** : `where folder_id IN (folder_id, child_ids...)` si recursive
3. **Filtre texte** : `where filename LIKE '%query%'`

Ordre d'application (priorité descendante) :

- **Collection active** (exclut tout le reste)
- **Folder active** (peut être combinée avec collection)
- **Search/filter text** (le plus spécifique)

### Gestion des Volumes Hors Ligne

- Volumes monitorés par file watcher (Phase 1.4)
- Statut persiste dans DB (`folders.is_online`)
- UI affiche 🟢 online / 🟡 offline avec visual feedback (opacity-50)
- Images de dossiers hors ligne restent accessibles (en cache/preview)

---

## État d'Implémentation

### ✅ Complété (21 février 2026)

**Backend :**

- Migration 004 : Colonnes `is_online` et `name` ajoutées à la table `folders`
- 3 commandes Tauri implémentées dans `src-tauri/src/commands/catalog.rs` :
  - `get_folder_tree()` : Retourne hiérarchie complète avec compteurs
  - `get_folder_images(folder_id, recursive)` : Filtrage par dossier
  - `update_volume_status(volume_name, is_online)` : Gestion statut volumes
- 6 tests unitaires backend ajoutés (tous passants)
- **Fix critique** : `IngestionService.get_or_create_folder_id()` implémenté pour peupler automatiquement la table `folders` lors de l'ingestion

**Frontend :**

- Types `folder.ts` créés avec convention **snake_case** (volume_name, is_online, etc.)
- Store `folderStore.ts` avec gestion état (tree, active folder, expanded state)
- Service `catalogService.ts` : 3 méthodes wrapper des commandes
- Composant `FolderTree.tsx` dans LeftSidebar avec arborescence récursive
- Filtrage par dossier intégré dans `App.tsx` (priorité collections > folders > texte)
- 6 tests unitaires frontend ajoutés (tous passants)

**Tests :**

- ✅ 159 tests backend passants (cargo test --lib)
- ✅ 345+ tests frontend passants (npm run test:run)

### ⚠️ Problème Restant : Images Existantes Sans folder_id

**Contexte :**
Les images importées avant l'implémentation de `get_or_create_folder_id()` (Phase 2.1) ont `folder_id=NULL` car le service d'ingestion ne créait pas d'enregistrements dans la table `folders`.

**Impact :**

- `get_folder_tree()` retourne un tableau vide pour ces images
- Le navigateur de dossiers ne les affiche pas
- Les nouveaux fichiers importés seront correctement liés

**Solutions Possibles :**

1. **Réimporter** : Supprimer et réimporter les images concernées (simple mais destructif)
2. **Script de backfill** : Créer une migration ou commande Tauri qui :
   - Parcourt toutes les images avec `folder_id=NULL`
   - Extrait le chemin du dossier depuis `images.filename` (si le chemin complet est stocké)
   - Appelle `get_or_create_folder_id()` pour chaque image
   - Met à jour `images.folder_id`

**Action Requise :**
Choisir et implémenter une stratégie de backfill avant de marquer la Phase 3.4 comme ✅ complète.

---

## Critères de Validation Finaux

- [x] `cargo check` : 0 erreurs
- [x] `cargo test --lib` : Nouveaux tests + tous les anciens passants (159 tests)
- [x] `tsc --noEmit` : 0 erreurs
- [x] `npm run test:run` : 345+ tests frontend passants
- [ ] **LeftSidebar affiche arborescence dossiers complète avec compteurs** (bloqué par backfill)
- [ ] **Click dossier → filtrage images en temps réel** (non testé en conditions réelles)
- [ ] **Volumes en ligne/hors ligne affordés visuellement** (non testé en conditions réelles)
- [x] Aucun `any` TypeScript ajouté
- [x] Aucun `unwrap()` Rust en production
- [ ] **Images existantes liées à leurs dossiers** (backfill requis)
