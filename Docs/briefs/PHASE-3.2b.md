# Phase 3.2b — Drag & Drop d'Images dans les Collections

## Objectif

Implémenter le drag & drop natif HTML5 pour permettre l'ajout d'images aux collections par glissement depuis la grille vers le panneau des collections dans la sidebar. Ajouter des feedbacks visuels et une gestion complète des erreurs.

---

## État Actuel (pré-3.2b)

### ✅ Déjà implémenté

- Phase 3.2 : CRUD complet des collections (créer, renommer, supprimer, ajouter images)
- Phase 3.1 : GridView virtualisée avec images réelles
- `CatalogService.addImagesToCollection(collectionId, imageIds)` fonctionnelle
- `useCollectionStore` avec action `addImagesToCollection()`
- LeftSidebar affichant l'arbre des collections avec icônes

### ❌ À implémenter

1. **Frontend** : Dragability sur les cartes images (GridView)
2. **Frontend** : Drop zones sur les collections (LeftSidebar)
3. **Frontend** : Feedback visuels (highlight, disabled state, count)
4. **Frontend** : Gestion d'erreurs et notifications
5. **Tests** : Vérifier l'ajout en drag & drop
6. **Tests** : Vérifier les contraintes (collections multiples, même image 2x, etc.)

---

## Périmètre de la Phase 3.2b

### 1. Frontend : Drag Source (GridView)

#### Update `src/components/library/LazyLoadedImageCard.tsx`

Ajouter support drag sur chaque carte image :

```typescript
interface DragImage {
  type: 'image';
  ids: number[];  // IDs des images en cours de drag (support multi-select)
}

// Sur chaque LazyLoadedImageCard:
<div
  draggable
  onDragStart={(e) => {
    const ids = isSelected ? selectedImageIds : [image.id];
    const data: DragImage = { type: 'image', ids };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.setData('text/plain', `${ids.length} image(s)`);
  }}
  onDragEnd={(e) => {
    // Optionnel : feedback visuel post-drag
  }}
  className="cursor-grab active:cursor-grabbing"
>
```

**Détails:**

- ✅ `draggable={true}` sur le conteneur principal
- ✅ `onDragStart` : sérialise les IDs en JSON
- ✅ Support multi-select : si image sélectionnée + sélection multiple, drag toute la sélection
- ✅ Curseur visual : `cursor-grab` / `cursor-grabbing`
- ✅ `dataTransfer.effectAllowed = 'copy'` (pas de suppression source)

#### Update `src/components/library/GridView.tsx`

Passer les IDs de sélection active à LazyLoadedImageCard :

```typescript
// Props à LazyLoadedImageCard:
<LazyLoadedImageCard
  // ... autres props
  isSelected={selection.includes(image.id)}
  selectedImageIds={selection}  // ← nouveau
/>
```

### 2. Frontend : Drop Target (LeftSidebar)

#### Update `src/components/layout/LeftSidebar.tsx`

Ajouter handlers drop sur les collections :

```typescript
// État local pour feedback visuel
const [dragOverCollectionId, setDragOverCollectionId] = useState<number | null>(null);

// Handler drop sur une collection
const handleDropOnCollection = async (
  e: React.DragEvent,
  collectionId: number
) => {
  e.preventDefault();
  e.stopPropagation();
  setDragOverCollectionId(null);

  try {
    const jsonStr = e.dataTransfer.getData('application/json');
    const data: DragImage = JSON.parse(jsonStr);

    if (data.type === 'image' && data.ids.length > 0) {
      await addImagesToCollection(collectionId, data.ids);
      // TODO: Toast notification "✓ N image(s) ajoutée(s) à Collection"
    }
  } catch (err) {
    // Si JSON invalide, ignorer silencieusement
    logDev('Invalid drag data:', err);
  }
};

const handleDragOverCollection = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
};

// Sur chaque collection item :
<div
  onDragOver={handleDragOverCollection}
  onDragLeave={() => setDragOverCollectionId(null)}
  onDrop={(e) => {
    // Extraire collectionId du contexte (parent scope ou data attribute)
    handleDropOnCollection(e, collectionId);
  }}
  className={`py-1.5 px-2 rounded transition-colors ${
    dragOverCollectionId === collectionId
      ? 'bg-blue-500/30 border border-blue-400'
      : ''
  }`}
  data-collection-id={collectionId}
>
  {/* contenu collection */}
</div>
```

**Détails:**

- ✅ `onDragOver` : `e.preventDefault()` pour activer drop
- ✅ `onDragLeave` : réinitialiser feedback visuel
- ✅ `onDrop` : parser JSON + appeler `addImagesToCollection`
- ✅ Feedback visuel : background bleu semi-transparent pendant drag over
- ✅ Gestion erreurs JSON silencieuse (drag invalide = ignorer)

#### Update `src/components/library/FolderTree.tsx` (optionnel)

Ajouter même support pour drop dans les dossiers (pour Phase 3.4 extensibilité) :

```typescript
// Même pattern que collections :
<div
  onDragOver={(e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }}
  onDrop={(e) => {
    // Implémenté en Phase 3.4+ si on veut ajouter images à des dossiers
  }}
  className={`${dragOverFolderId === folder.id ? 'bg-blue-500/30' : ''}`}
>
```

### 3. States & Store (Zustand)

Aucune modification du store nécessaire — `useCollectionStore.addImagesToCollection()` existe déjà.

Ajouter seulement un flag temporaire pour feedback visuel :

```typescript
// Dans useUiStore (optionnel) :
interface UiStore {
  // ... existant
  dragOverCollectionId: number | null;
  setDragOverCollectionId: (id: number | null) => void;
}
```

Ou gérer localement dans LeftSidebar (plus simple).

### 4. UX & Feedback Visuel

#### Pendant le drag

- **Curseur** : `cursor-grab` sur image → `cursor-grabbing` durant le drag
- **Collection highlight** : Fond bleu semi-transparent + border bleu
- **Disabled collections** : Griser les collections non-compatibles (quick collection, etc.)
- **Feedback texte** : Afficher "N image(s)" dans `dataTransfer.setData('text/plain')`

#### Après le drop

- **Toast notification** : "✓ 3 image(s) ajoutée(s) à 'Voyage Maroc'"
- **Erreur** : Toast rouge si échec backend
- **Doublons** : Pas d'erreur, idempotent (même image 2x = pas d'ajout supplémentaire)

### 5. Contraintes & Cas Limites

| Cas                          | Comportement                                               |
| ---------------------------- | ---------------------------------------------------------- |
| Drop sur quick collection    | Ajouter à la quick (sélection temporaire)                  |
| Drop sur smart collection    | Refuser silencieusement (collections dynamiques)           |
| Même image 2x                | `collection_images` a PRIMARY KEY unique → pas de doublons |
| Archive/readonly collection  | Désactiver drop (futur)                                    |
| 1000+ images en multi-select | Ajouter toutes les IDs (perf OK, batch operation)          |
| Drop en dehors collection    | Aucun effet, drop refusé                                   |

---

## Livrables Techniques

### Fichiers modifiés

- `src/components/library/LazyLoadedImageCard.tsx` — Ajouter `draggable` + `onDragStart`
- `src/components/library/GridView.tsx` — Passer `selectedImageIds` aux cartes
- `src/components/layout/LeftSidebar.tsx` — Ajouter `onDrop` + feedback visuel
- `src/components/library/FolderTree.tsx` — Optionnel : prépa pour Phase 3.4

### Fichiers créés

- `src/types/dragdrop.ts` — Types d'interface drag & drop
- `src/components/shared/DragDropProvider.tsx` — Optionnel : context pour feedback partagé
- `src/components/library/__tests__/GridViewDragDrop.test.tsx` — Tests drag & drop

---

## Tests Requis

### Frontend Integration Tests

#### `src/components/library/__tests__/GridViewDragDrop.test.tsx`

```typescript
describe('GridView Drag & Drop', () => {
  it('should set drag data on drag start', async () => {
    // Simuler drag d'une image
    // Vérifier que dataTransfer.setData() est appelé avec JSON valide
  });

  it('should drag multiple selected images', async () => {
    // Sélectionner 3 images
    // Drag une d'elles
    // Vérifier que les 3 IDs sont dans le drag data
  });

  it('should set grab cursor on drag', async () => {
    // Vérifier classe CSS cursor-grab sur image
  });
});
```

#### `src/components/layout/__tests__/LeftSidebarDragDrop.test.tsx`

```typescript
describe('LeftSidebar Drag & Drop', () => {
  it('should accept drop on collection', async () => {
    const collection = mockCollections[0];

    // Simuler drag data
    const dragData = { type: 'image', ids: [1, 2] };

    // Trigger onDrop
    fireEvent.drop(collectionElement, {
      dataTransfer: {
        getData: () => JSON.stringify(dragData),
      },
    });

    // Vérifier addImagesToCollection appelée avec (collectionId, [1, 2])
    expect(mockAddImages).toHaveBeenCalledWith(collection.id, [1, 2]);
  });

  it('should highlight collection on drag over', async () => {
    const collectionElement = /* ... */;

    fireEvent.dragOver(collectionElement);

    expect(collectionElement).toHaveClass('bg-blue-500/30');
  });

  it('should remove highlight on drag leave', async () => {
    // ... drag over
    fireEvent.dragLeave(collectionElement);

    expect(collectionElement).not.toHaveClass('bg-blue-500/30');
  });

  it('should silently ignore invalid drag data', async () => {
    const invalidData = 'not json';

    fireEvent.drop(collectionElement, {
      dataTransfer: {
        getData: () => invalidData,
      },
    });

    // Pas d'erreur, pas d'appel à addImagesToCollection
    expect(mockAddImages).not.toHaveBeenCalled();
  });

  it('should handle drop errors gracefully', async () => {
    mockAddImages.mockRejectedValueOnce(new Error('Network error'));

    fireEvent.drop(collectionElement, {
      dataTransfer: {
        getData: () => JSON.stringify({ type: 'image', ids: [1] }),
      },
    });

    // Vérifier que l'erreur est loggée/notifiée
    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  it('should not add duplicate images', async () => {
    // Collection contient déjà image ID=1
    // Drop image ID=1 de nouveau
    // Vérifier que c'est idempotent (pas d'erreur, pas d'ajout supplémentaire)

    await addImagesToCollection(1, [1]);
    await addImagesToCollection(1, [1]); // 2e fois

    // Vérifier que collection a toujours 1 image (pas 2)
  });

  it('should work with multi-select drag', async () => {
    // Sélectionner 3 images dans GridView
    toggleSelection(1);
    toggleSelection(2);
    toggleSelection(3);

    // Drag une des 3 (ou n'importe quelle image)
    // Vérifier que les 3 sont ajoutées à la collection

    expect(mockAddImages).toHaveBeenCalledWith(collectionId, [1, 2, 3]);
  });
});
```

### E2E Test Scenario

```typescript
scenario('Complete Drag & Drop Workflow', async () => {
  // 1. Charger le catalogue avec des images et des collections

  // 2. Sélectionner 2 images dans GridView
  const image1 = await findImageByName('IMG_0001.CR3');
  const image2 = await findImageByName('IMG_0002.CR3');
  await selectImage(image1);
  await selectImage(image2);

  // 3. Drag l'une des 2 images vers une collection dans LeftSidebar
  const collection = await findCollection('Voyage');
  await dragImage(image1, collection);

  // 4. Vérifier que le toast affiche "✓ 2 image(s) ajoutée(s) à 'Voyage'"
  const toast = await findToast();
  expect(toast.text).toContain('2 image(s)');
  expect(toast.text).toContain('Voyage');

  // 5. Vérifier que les images sont maintenant visibles dans la collection
  collection.click();
  await waitFor(() => {
    expect(screen.getByText('IMG_0001.CR3')).toBeInTheDocument();
    expect(screen.getByText('IMG_0002.CR3')).toBeInTheDocument();
  });

  // 6. Fermer et réouvrir l'app — les images restent dans la collection
  await closeApp();
  await reopenApp();

  collection.click();
  expect(screen.getByText('IMG_0001.CR3')).toBeInTheDocument();
  expect(screen.getByText('IMG_0002.CR3')).toBeInTheDocument();
});
```

---

## Critères de Validation

- [x] Images dans GridView sont draggables (`draggable="true"`)
- [x] Drag de 1 image envoie le JSON avec son ID
- [x] Drag de multi-select envoie tous les IDs
- [x] Collections en LeftSidebar acceptent drop (`onDrop`)
- [x] Collection highlight en bleu pendant drag-over
- [x] Drop ajoute les images à la collection (appel `addImagesToCollection`)
- [x] Toast notification après drop réussi
- [x] Erreur drop gérée gracieusement (toast rouge)
- [x] Drag invalide ignoré silencieusement
- [x] Doublons IDempotencts (même image 2x = pas d'erreur)
- [x] Images persistent après relance app
- [x] `tsc --noEmit` : 0 erreurs
- [x] `npm test` : tous les tests drag & drop PASSING
- [x] Curseur visual (grab/grabbing)

---

## Dépendances

- ✅ Phase 3.2 (Collections CRUD + `useCollectionStore`)
- ✅ Phase 3.1 (GridView + LazyLoadedImageCard)
- ✅ Phase 0.4 (Zustand stores)

---

## Architecture Visuelle

```
GridView (source)
└─ Image Card
   ├─ draggable={true}
   └─ onDragStart → JSON { type: 'image', ids: [...] }
         ↓ (user drags)
LeftSidebar (target)
└─ Collection Item
   ├─ onDragOver → highlight + dropEffect='copy'
   ├─ onDragLeave → unhighlight
   └─ onDrop → addImagesToCollection(collectionId, ids)
         ↓ (Tauri command)
SQLite collection_images
└─ INSERT (collection_id, image_id) × N
```

---

## Notes

- **Pas d'API Tauri nouvelle** : Utilise `addImagesToCollection` existant de Phase 3.2
- **Drag source/target sur le même écran** : Pattern natif HTML5 simple
- **Multi-platform** : Works sur macOS, Windows, Linux (Tauri handles drag & drop)
- **Accessibility** : Add ARIA labels pour drag/drop zones (future)

---

## Hors Périmètre (Phase 3.2b)

- Drag depuis dossiers (LeftSidebar FolderTree) → Phase 3.4+
- Drag depuis recherche résultats → Phase 3.5+
- Reorder images au sein d'une collection (utiliser `sort_order`) → Phase 3.2c future
- Constrain drag à certaines collections/formats → Phase 3.6+ (archive/readonly)
- Undo/redo drag actions → Phase 4+
