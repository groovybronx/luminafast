# Phase 3.2c — Reorder Images au sein d'une Collection

## Objectif

Implémenter le réordering interactif des images au sein d'une collection via drag & drop. Permettre aux utilisateurs de réarranger l'ordre des images dans une collection statique via glissement entre éléments de la grille, avec une persistance immédiate dans SQLite via la colonne `sort_order` de `collection_images`.

---

## État Actuel (pré-3.2c)

### ✅ Déjà implémenté

- Phase 3.2b : Drag & drop complet pour **ajout** d'images aux collections
- Phase 3.2 : Collections CRUD fonctionnelles (créer, supprimer, renommer)
- Phase 3.1 : GridView virtualisée avec sélection multi-select
- Base de données : Colonne `collection_images.sort_order` existante (défaut 0)
- Service `CatalogService.addImagesToCollection()` fonctionnel
- Types `DragImage` et handlers `onDragStart/onDrop` établis

### ❌ À implémenter

1. **Backend** : Commande Tauri `update_collection_images_order(collection_id, image_ids_ordered)`
2. **Backend** : Logique transaction pour UPDATE sort_order en masse
3. **Frontend** : Détection du **mode reorder** (drag **au sein** d'une collection active)
4. **Frontend** : Feedback visuel d'insertion (ligne guide, drop indicator)
5. **Frontend** : Optimisme UI (update local avant confirmation backend)
6. **Tests** : Vérifier le reordering, les collisions sort_order, la persistance
7. **Tests** : Vérifier que reorder ne s'active que sur une collection active

---

## Périmètre de la Phase 3.2c

### 1. Backend Rust — Nouvelle Commande Tauri

#### `update_collection_images_order(collection_id: u32, image_ids_ordered: Vec<u32>) → CommandResult<()>`

**Responsabilités:**

- Vérifier que la collection existe
- Vérifier que TOUTES les images en `image_ids_ordered` appartiennent à cette collection
- Vérifier que la collection est de type `'static'` (pas smart/quick)
- Transaction SQL atomique :
  ```sql
  BEGIN TRANSACTION;
  UPDATE collection_images 
  SET sort_order = ? 
  WHERE collection_id = ? AND image_id = ?;
  -- Répéter pour chaque image avec sort_order = index (0, 1, 2, ...)
  COMMIT;
  ```
- Retourner erreur si transaction échoue

**Paramètres** :

```rust
#[tauri::command]
pub fn update_collection_images_order(
    collection_id: u32,
    image_ids_ordered: Vec<u32>,
) -> Result<(), String>
```

**Validations** :

- Collection exists: `SELECT COUNT(*) FROM collections WHERE id = ?`
- Collection type is 'static': `SELECT type FROM collections WHERE id = ?`
- All images in collection: `SELECT COUNT(*) FROM collection_images WHERE collection_id = ? AND image_id IN (...)`
- Length match: `image_ids_ordered.len()` vs count from DB

**Cas d'erreur** :

```
"Collection {id} not found" — HTTP 404
"Collection {id} is not static (type: {type})" — HTTP 400
"Image(s) not in collection" — HTTP 400
"Failed to update order: {db_error}" — HTTP 500
```

### 2. Backend : Enregistrement dans lib.rs

Ajouter `update_collection_images_order` dans `tauri::generate_handler![]`

### 3. Frontend : `src/services/catalogService.ts` (extension)

Ajouter une méthode :

```typescript
async updateCollectionImagesOrder(
  collectionId: number,
  imageIdsOrdered: number[]
): Promise<void> {
  return await invoke<void>('update_collection_images_order', {
    collectionId,
    imageIdsOrdered,
  });
}
```

**Logique** :

- Wrapper simple autour de la commande Tauri
- Pas de gestion d'erreur locale (propager à l'appelant)
- Test d'extension pour catalogService

### 4. Frontend : Détection Mode Reorder (GridView)

#### Conditions pour activer le reorder

1. `activeCollectionId !== null` (une collection est active)
2. Collection type === `'static'` (pas smart/quick)
3. Drag source est une image `data-drop-mode="reorder"`
4. Drag target est une autre image de la même collection

#### Modification `src/components/library/LazyLoadedImageCard.tsx`

Ajouter flag au drag data :

```typescript
const handleDragStart = (e: React.DragEvent) => {
  const ids = isSelected ? selectedImageIds : [image.id];
  const data: DragImage = {
    type: 'image',
    ids,
    dropMode: activeCollectionId 
      ? 'reorder'  // Au sein d'une collection
      : 'add',     // En dehors (ajouter à collection)
  };
  e.dataTransfer.effectAllowed = dropMode === 'reorder' ? 'move' : 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify(data));
  e.dataTransfer.setData('text/plain', `${ids.length} image(s)`);
};
```

**Update `src/types/dragdrop.ts`** :

```typescript
export interface DragImage {
  type: 'image';
  ids: number[];
  dropMode?: 'add' | 'reorder';  // Nouveau flag
}
```

#### Modification `src/components/library/GridView.tsx`

Ajouter zone drop **entre** les images (drop indicator) :

```typescript
// État local
const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);

// Handler pour drop sur GridView
const handleDropOnGrid = async (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setDropInsertIndex(null);

  const jsonStr = e.dataTransfer.getData('application/json');
  const data: DragImage = JSON.parse(jsonStr);

  if (
    data.type === 'image' &&
    data.dropMode === 'reorder' &&
    activeCollectionId !== null &&
    dropInsertIndex !== null
  ) {
    // Réordering au sein de la collection
    try {
      // Récupérer l'ordre actuel (activeCollectionImageIds)
      const currentOrder = [...(activeCollectionImageIds || [])];
      
      // Retirer les images en cours de drag
      const draggingIds = new Set(data.ids);
      const remainder = currentOrder.filter(id => !draggingIds.has(id));
      
      // Insérer à la bonne position
      const newOrder = [
        ...remainder.slice(0, dropInsertIndex),
        ...data.ids,
        ...remainder.slice(dropInsertIndex),
      ];

      // Update optimiste UI
      setActiveCollectionImageIds(newOrder);

      // Backend
      await updateCollectionImagesOrder(activeCollectionId, newOrder);
      
      // Toast de confirmation
      logDev(`✓ ${data.ids.length} image(s) réordonnées`);
    } catch (err) {
      // Rollback optimiste
      logDev('Reorder failed:', err);
      // Recharger l'ordre initial depuis le store
      await setActiveCollection(activeCollectionId);
    }
  }
};

// Handler drag over pour calculer insert index
const handleDragOverGrid = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // Calculer la position relative du curseur dans la grille
  // → déterminer l'index d'insertion (complexe avec virtualisation)
  // Pour MVP : utiliser drop sur une image = insert avant celle-ci
};

// Rendu : bande d'insertion visuelle
if (dropInsertIndex !== null) {
  <div className="absolute h-1 bg-blue-500 w-full left-0" style={{
    top: `${dropInsertIndex * ITEM_HEIGHT}px`
  }} />
}
```

### 5. Frontend : Drop Indicator Visual

#### Modification `src/types/dragdrop.ts`

```typescript
export interface DragDropState {
  isDragging: boolean;
  dropMode: 'add' | 'reorder';
  dropInsertIndex: number | null;
  dragSourceCollectionId?: number;
}
```

#### Feedback visuel

**Pendant le drag reorder :**
- Ligne pointillée bleue positionnée avant l'image cible
- Curseur change à `cursor-move` (vs `cursor-grab` pour add)
- Image source devient semi-transparente (opacity 0.5)
- Image cible reçoit une bordure d'insertion (2px bleu)

**Couleurs:**
- Reorder mode: `border-blue-600 bg-blue-50`
- Add mode (sidebar): `border-blue-400 bg-blue-500/30`

### 6. Frontend : Store Updates (Zustand)

#### Modification `src/stores/collectionStore.ts`

Ajouter une action :

```typescript
interface CollectionStore {
  // ... existant
  
  // Nouvelle action async
  updateCollectionImagesOrder: (
    collectionId: number,
    imageIdsOrdered: number[]
  ) => Promise<void>;
}

// Implémentation
updateCollectionImagesOrder: async (collectionId, imageIdsOrdered) => {
  try {
    set({ isLoading: true, error: null });
    await CatalogService.updateCollectionImagesOrder(collectionId, imageIdsOrdered);
    
    // Update local state
    set((state) => {
      if (state.activeCollectionId === collectionId) {
        return {
          ...state,
          activeCollectionImageIds: imageIdsOrdered,
        };
      }
      return state;
    });
  } catch (err) {
    set({ error: (err as Error).message });
    throw err;
  } finally {
    set({ isLoading: false });
  }
},
```

### 7. Contraintes & Cas Limites

| Cas                               | Comportement                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Reorder avec image sélectionnée   | Drag toute la sélection, insert comme bloc                                    |
| Reorder smart collection          | Refuser silencieusement (filter immédiatement)                                 |
| Reorder au-delà des limites       | Clone à la fin (max index = collection_images.len() - 1)                      |
| Reorder même image 2x (duplicata) | Ignorer duplicata (utiliser Set pour les IDs)                                |
| Reorder + Backend error           | Rollback optimiste via `setActiveCollection(id)` pour recharger l'ordre DB    |
| Reorder 1000+ images              | OK (transaction SQL batch)                                                     |
| Drag source !== drag target       | Si dropMode='reorder' mais image pas dans collection → refuser silencieusement |
| Collection devient vide            | Finir avec `sort_order` = vide (pas d'impact)                                 |

---

## Livrables Techniques

### Fichiers créés

- `src/components/library/__tests__/GridViewReorder.test.tsx` — Tests reordering dans la grille

### Fichiers modifiés

- `src-tauri/src/commands/catalog.rs` — Nouvelle commande `update_collection_images_order` + tests unitaires
- `src-tauri/src/lib.rs` — Enregistrer la commande dans `generate_handler![]`
- `src/types/dragdrop.ts` — Ajouter `dropMode` et état reorder
- `src/services/catalogService.ts` — Nouveau method `updateCollectionImagesOrder()` + test extension
- `src/components/library/LazyLoadedImageCard.tsx` — Ajouter `dropMode` flag au drag data
- `src/components/library/GridView.tsx` — Handler drop reorder + drop indicator visuel
- `src/stores/collectionStore.ts` — Nouvelle action async `updateCollectionImagesOrder()`
- `src/components/library/__tests__/GridViewDragDrop.test.tsx` — Étendre avec tests reorder

---

## Tests Requis

### Backend Rust (`src-tauri/src/commands/catalog.rs`)

```rust
#[cfg(test)]
mod tests {
  #[test]
  fn test_update_collection_images_order_success() {
    // Créer collection
    // Ajouter 3 images
    // Changer l'ordre via update_collection_images_order
    // Vérifier que sort_order en DB = [0, 1, 2] pour le nouvel ordre
  }

  #[test]
  fn test_update_collection_images_order_not_found() {
    // Appeler avec collection_id invalide
    // Vérifier erreur "Collection X not found"
  }

  #[test]
  fn test_update_collection_images_order_wrong_type() {
    // Créer smart collection
    // Essayer de réordonner
    // Vérifier erreur "is not static"
  }

  #[test]
  fn test_update_collection_images_order_partial_images() {
    // Créer collection avec 5 images
    // Essayer update avec seulement 3 (2 manquantes)
    // Vérifier que seules les 3 spécifiées restent
    // (Question: faut-il supprimer les images non listées ou les laisser?)
    // → Clarifier le spec : reorder DOIT inclure TOUTES les images de la collection
  }

  #[test]
  fn test_update_collection_images_order_idempotent() {
    // Appeler deux fois avec le même ordre
    // Vérifier pas d'erreur (transaction réussie les deux fois)
  }

  #[test]
  fn test_update_collection_images_order_reverses() {
    // Créer collection avec images ID=[1,2,3]
    // Appeler avec order=[3,2,1]
    // Vérifier que getCollectionImages retourne dans nouvel ordre
  }
}
```

### Frontend (`src/components/library/__tests__/GridViewReorder.test.tsx`)

```typescript
describe('GridView Reorder', () => {
  // Tests reordering au sein d'une collection
  
  it('should set dropMode="reorder" when activeCollectionId is set', async () => {
    // Rendre GridView avec activeCollectionId = 1
    // Simuler drag d'une image
    // Vérifier que dragData.dropMode === 'reorder'
  });

  it('should set dropMode="add" when no activeCollectionId', async () => {
    // Rendre GridView avec activeCollectionId = null
    // Simuler drag d'une image
    // Vérifier que dragData.dropMode === 'add'
  });

  it('should handle drop on grid to reorder', async () => {
    // Rendre avec activeCollectionId=1, activeCollectionImageIds=[1,2,3]
    // Simuler drag de image 1, drop avant image 3
    // Vérifier que l'ordre local devient [2,1,3]
  });

  it('should update sort_order on backend after reorder', async () => {
    // Simuler reorder, attendre promise
    // Mocking CatalogService.updateCollectionImagesOrder
    // Vérifier que la fonction est appelée avec le nouvel ordre
  });

  it('should rollback optimistic update on error', async () => {
    // Simuler reorder qui échoue au backend
    // Mock CatalogService.updateCollectionImagesOrder pour rejeter
    // Vérifier que l'ordre revient au précédent via setActiveCollection()
  });

  it('should not reorder when collection is smart', async () => {
    // Créer mock de collection smart
    // Essayer drag & drop
    // Vérifier que handleDropOnGrid silencieusement ignore
  });

  it('should reorder multi-select as block', async () => {
    // Sélectionner images [1, 2]
    // Drag image 1
    // Vérifier que [1, 2] sont draggées ensemble (pas séparées)
  });
});
```

### Integration (`src/stores/__tests__/collectionStore.test.ts`)

```typescript
it('should update collection images order', async () => {
  // Dans le store test
  // Appeler updateCollectionImagesOrder(1, [3, 2, 1])
  // Mock CatalogService
  // Vérifier que activeCollectionImageIds devient [3, 2, 1]
});

it('should propagate backend error to error state', async () => {
  // Mock service qui échoue
  // Appeler updateCollectionImagesOrder
  // Vérifier que store.error contient le message d'erreur
});
```

---

## Critères de Validation

- [ ] `cargo check` passe sans erreur
- [ ] `cargo test` : tous les tests passent (existants + nouveaux reorder)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm test` : tous les tests frontend passent
- [ ] Reordering fonctionne dans la grille (UI responsive)
- [ ] L'ordre persiste après refresh (vérifier SQLite)
- [ ] Reordering n'est activé que pour collections statiques
- [ ] Drop indicator visuel montre la position d'insertion
- [ ] Multi-select reorder maintient l'ordre relatif du groupe
- [ ] Erreur backend déclenche rollback optimiste et toast d'erreur

---

## Dépendances

**Sous-phases complétées (prérequis)** :

- ✅ Phase 3.2 : Collections CRUD
- ✅ Phase 3.2b : Drag & Drop d'ajout d'images
- ✅ Phase 3.1 : GridView virtualisée avec sélection

**Ressources Externes** :

- `collection_images.sort_order` colonne SQL (déjà en place)
- `DragImage` interface + drag handlers (Phase 3.2b)

**Fichiers clés à consulter** :

- `src-tauri/src/commands/catalog.rs` : Pattern des commandes existantes
- `src/components/library/GridView.tsx` : Context du drag & drop 3.2b
- `src/stores/collectionStore.ts` : Pattern du store pour sync
- `src-tauri/migrations/001_initial.sql` : Schema avec sort_order

---

## Architecture Cible

### Flux Reorder

```
Grille d'images active
    ↓
User drag image 1 (activeCollectionId ≠ null)
    ↓
onDragStart : set dropMode='reorder'
    ↓
User release sur image 3
    ↓
onDrop : calculateInsertIndex()
    ↓
Grid state : newOrder = [image 2, image 1, image 3]
    ↓
[Optimistic] UI update : GridView renderavec nouvel ordre
    ↓
updateCollectionImagesOrder(1, [2, 1, 3])
    ↓
Backend : UPDATE collection_images SET sort_order WHERE...
    ↓
Frontend : Toast ✓ ou Toast ✗ + rollback
```

### Hiérarchie des Modifications

1. **DB Schema** : Rien (sort_order existe)
2. **Backend** : +1 commande, +tests
3. **Frontend Service** : +1 method
4. **Frontend Types** : Update DragImage
5. **Frontend Components** : GridView + LazyLoadedImageCard
6. **Frontend Store** : +1 action async
7. **Tests** : +tests intégration backend + frontend

---

## Notes Techniques

### Calcul de l'Insert Index (complexité)

Avec grille virtualisée, déterminer la position d'insertion est complexe :

**Option 1 (Simple)** : Drag **sur une image** = insert avant celle-ci
- ✅ Facile à implémenter
- ✅ Feedback drag over simple
- ❌ Moins précis (pas de "gap" entre images)

**Option 2 (Complet)** : Drag entre les images = drop indicator visualisé
- ✅ UX Lightroom-like
- ❌ Nécessite calcul géométrique (clientY, offsetTop, virtualisation)

**Recommandé** : Commencer par Option 1 (MVP), escalader à Option 2 en Maintenance si feedback utilisateur.

### Virtualisation & Sort Order

```typescript
// GET collection images returns ordered par sort_order
SELECT image_id 
FROM collection_images 
WHERE collection_id = ? 
ORDER BY sort_order ASC, imported_at DESC;
```

La virtualisation affiche les images dans l'ordre retourné par la DB (sortiées par sort_order). Pas de souci de performance.

### Idempotence & Transactions

```sql
BEGIN TRANSACTION;
-- Vider les sort_order existants pour cette collection
DELETE FROM collection_images WHERE collection_id = ?;

-- Re-insérer dans le nouvel ordre
INSERT INTO collection_images (collection_id, image_id, sort_order)
VALUES (?, ?, 0), (?, ?, 1), ...;

COMMIT;
```

Alternative (Update par UUID) si on veut éviter DELETE/INSERT :

```sql
BEGIN TRANSACTION;
UPDATE collection_images 
SET sort_order = CASE image_id 
  WHEN 1 THEN 0
  WHEN 3 THEN 1
  WHEN 2 THEN 2
END
WHERE collection_id = ?;
COMMIT;
```

**Choix** : Option 2 (UPDATE CASE) pour éviter perte de données si erreur partielle.

---

## Questions Ouvertes

1. **Reorder + suppression images** : Si user drag image 1, puis supprime image 3 pendant le drag, quel comportement ?
   - → Rejeter drop si image pas dans collection (vérifier avant confirm)
   
2. **Reorder + ajout images** : Si user drag vers une collection qui est désormais vide ?
   - → OK, reorder revient au INSERT normal
   
3. **Reorder performance** : 10K+ images, transaction UPDATE CASE très longue ?
   - → Test de benchmark requis avant production
   
4. **Undo/Redo** : Phase 3.2c inclut-elle undo pour reorder ?
   - → Non (reporté Phase 4.3 Historique)

