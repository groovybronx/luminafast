# Phase 0.4 — State Management (Zustand)

## Objectif

Remplacer tous les `useState` de `App.tsx` par des stores Zustand centralisés. Créer quatre stores : catalogStore, uiStore, editStore, systemStore. App.tsx devient un orchestrateur pur sans état local.

## Dépendances

- Phase 0.1 (Migration TypeScript) ✅
- Phase 0.2 (Scaffolding Tauri v2) ✅
- Phase 0.3 (Décomposition Modulaire Frontend) ✅

## Fichiers à créer

- `src/stores/catalogStore.ts` — images[], selection[], filterText, activeImageId
- `src/stores/uiStore.ts` — activeView, sidebarOpen, thumbnailSize, rightSidebarTab
- `src/stores/editStore.ts` — eventLog[], currentEdits, historyIndex
- `src/stores/systemStore.ts` — logs[], importState, appReady
- `src/stores/index.ts` — Re-export de tous les stores

## Fichiers à modifier

- `src/App.tsx` — Supprimer tous les useState, utiliser les stores
- `package.json` — Ajouter dépendance `zustand`

## Interfaces à respecter

Les stores doivent utiliser les types existants dans `src/types/` :

- `CatalogImage[]` pour images
- `ActiveView` pour activeView
- `CatalogEvent[]` pour eventLog
- `LogEntry[]` pour logs
- Toutes les autres interfaces existantes

## Stores à implémenter

### catalogStore

```typescript
interface CatalogStore {
  // État
  images: CatalogImage[];
  selection: Set<number>; // IDs des images sélectionnées
  filterText: string;
  activeImageId: number | null;

  // Actions
  setImages: (images: CatalogImage[]) => void;
  addImages: (images: CatalogImage[]) => void;
  toggleSelection: (id: number) => void;
  clearSelection: () => void;
  setFilterText: (text: string) => void;
  setActiveImage: (id: number | null) => void;
  getSelectedImages: () => CatalogImage[];
  getActiveImage: () => CatalogImage | null;
}
```

### uiStore

```typescript
interface UiStore {
  // État
  activeView: ActiveView;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  thumbnailSize: number; // 120-240px
  rightSidebarTab: 'develop' | 'metadata' | 'history';

  // Actions
  setActiveView: (view: ActiveView) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setThumbnailSize: (size: number) => void;
  setRightSidebarTab: (tab: 'develop' | 'metadata' | 'history') => void;
}
```

### editStore

```typescript
interface EditStore {
  // État
  eventLog: CatalogEvent[];
  currentEdits: Record<string, number>; // param -> valeur
  historyIndex: number; // position dans l'historique

  // Actions
  addEvent: (event: CatalogEvent) => void;
  setCurrentEdits: (edits: Record<string, number>) => void;
  updateEdit: (param: string, value: number) => void;
  resetEdits: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}
```

### systemStore

```typescript
interface SystemStore {
  // État
  logs: LogEntry[];
  importState: {
    isImporting: boolean;
    progress: number;
    currentFile: string;
  };
  appReady: boolean;

  // Actions
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setImportState: (state: Partial<typeof importState>) => void;
  setAppReady: (ready: boolean) => void;
}
```

## Critères de validation

1. `tsc --noEmit` passe sans erreur
2. `npm run build` produit un build valide
3. App.tsx ne contient plus aucun `useState`
4. Tous les états sont gérés par les stores Zustand
5. L'application fonctionne identiquement (aucune régression)
6. Les stores sont correctement typés avec les interfaces existantes

## Notes

- Utiliser `create` de Zustand avec TypeScript
- Préfixer tous les setters avec `set` (ex: `setImages`)
- Utiliser `Set<number>` pour la sélection (plus performant que array)
- Les computed getters (getSelectedImages, getActiveImage) utilisent `get()`
- Phase préparatoire pour Phase 1 (backend Rust) — les stores seront connectés aux commandes Tauri

## Contexte architectural

Cette phase élimine le props drilling de la Phase 0.3 et prépare l'architecture pour la connexion au backend Rust en Phase 1. Les stores serviront de couche d'abstraction entre l'UI et les commandes Tauri.
