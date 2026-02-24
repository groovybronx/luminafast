# LuminaFast Agents — Frontend (TypeScript/React)

> **Directives spécialisées pour la couche Frontend.**
> Lisez d'abord `AGENTS.md` racine pour les règles absolues globales.

---

## 1. Conventions TypeScript Strictes

### 1.1 — Types & Interfaces

- **Strict mode obligatoire** : `tsconfig.json` a `"strict": true`
- **Pas de `any`** — utiliser `unknown` + type guards si nécessaire
- **Imports absolus** : alias `@/` pour accéder à `src/`

```typescript
// ✅ BON
import { Image } from '@/types/image';
import { useCatalogStore } from '@/stores/catalogStore';

// ❌ MAUVAIS
import { Image } from '../../../types/image';
import type { any } from 'typescript';
```

### 1.2 — Composants React

- **Un composant = un fichier** (sauf très petits helpers)
- **Props typées avec interface suffixe `Props`**
- **Pas de logique métier** dans les composants — déléguer aux stores/services

```typescript
// ✅ BON
interface GridViewProps {
  images: Image[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function GridView({ images, selectedIds, onSelect, isLoading = false }: GridViewProps) {
  // Logique métier dans useCatalogStore, pas ici
  const { filterText } = useCatalogStore();
  return (/* JSX */);
}

// ❌ MAUVAIS
export function GridView(props: any) {
  const [filtered, setFiltered] = useState([]); // État métier → store
}
```

### 1.3 — Nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichier composant | PascalCase | `GridView.tsx` |
| Fichier hook | camelCase | `useCatalog.ts` |
| Fichier service | camelCase | `catalogService.ts` |
| Fonction/variable | camelCase | `handleImageClick()` |
| Type/Interface | PascalCase | `ImageDTO`, `GridViewProps` |
| Constante | SCREAMING_SNAKE_CASE | `MAX_IMAGE_SIZE`, `THUMBNAIL_WIDTH` |

---

## 2. Gestion d'État (Zustand)

### 2.1 — Structure des Stores

Chaque store dans `src/stores/` représente un **domaine métier** :

- `catalogStore.ts` — Images, sélection, filtres
- `collectionStore.ts` — Collections CRUD
- `uiStore.ts` — État UI (vues, sidebars, modals)
- `editStore.ts` — Événements, édits, historique
- `systemStore.ts` — Logs, import progress

### 2.2 — Exemple de Store

```typescript
// ✅ BON
import { create } from 'zustand';
import type { Image } from '@/types/image';

interface CatalogState {
  images: Image[];
  selectedIds: Set<string>;
  filterText: string;

  // Actions
  setImages: (images: Image[]) => void;
  toggleSelect: (id: string) => void;
  setFilterText: (text: string) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  images: [],
  selectedIds: new Set(),
  filterText: '',

  setImages: (images) => set({ images }),
  toggleSelect: (id) => set((state) => ({
    selectedIds: new Set([...state.selectedIds, id])
  })),
  setFilterText: (text) => set({ filterText: text }),
}));
```

---

## 3. Services Tauri (Invokation Backend)

### 3.1 — Gestion d'Erreurs Obligatoire

```typescript
// ✅ BON
async function getImages(filter?: string): Promise<Image[]> {
  try {
    return await invoke<Image[]>('get_all_images', { filter });
  } catch (error) {
    console.error('Failed to fetch images:', error);
    throw new Error(`Image fetch failed: ${String(error)}`);
  }
}

// ❌ MAUVAIS
async function getImages() {
  return await invoke('get_all_images'); // Pas d'error handling
}
```

### 3.2 — Nommage des Commandes

Commande Rust → Fonction TS wrapper (snake_case → camelCase) :

```typescript
// Rust: #[tauri::command] fn get_all_images(...)
// TS wrapper:
export async function getImages(filter?: string): Promise<Image[]> {
  return invoke<Image[]>('get_all_images', { filter });
}
```

### 3.3 — Arguments invoke

Les arguments sont passés en **camelCase** (même si la Rust command utilise snake_case) :

```typescript
// ✅ BON
await invoke('create_collection', {
  collectionType: 'static',
  parentId: null,
  name: 'My Collection'
});

// ❌ MAUVAIS
await invoke('create_collection', {
  collection_type: 'static' // snake_case invalide
});
```

---

## 4. Tests (Vitest + Testing Library)

### 4.1 — Structure des Fichiers de Tests

```
src/
├── components/
│   ├── library/
│   │   ├── GridView.tsx
│   │   └── __tests__/
│   │       └── GridView.test.tsx
├── stores/
│   ├── catalogStore.ts
│   └── __tests__/
│       └── catalogStore.test.ts
├── services/
│   ├── catalogService.ts
│   └── __tests__/
│       └── catalogService.test.ts
```

### 4.2 — Exemple de Test

```typescript
// src/stores/__tests__/catalogStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCatalogStore } from '../catalogStore';

describe('catalogStore', () => {
  beforeEach(() => {
    useCatalogStore.setState({
      images: [],
      selectedIds: new Set(),
      filterText: ''
    });
  });

  it('adds images to catalog', () => {
    const { result } = renderHook(() => useCatalogStore());
    const mockImages = [{ id: '1', filename: 'test.jpg' }];

    act(() => {
      result.current.setImages(mockImages);
    });

    expect(result.current.images).toHaveLength(1);
  });
});
```

### 4.3 — Couverture Minimale

- **70% couverture de lignes** pour frontend
- **Tous les stores** doivent avoir des tests d'action
- **Tous les services** doivent avoir des tests d'appel (mock de `invoke`)
- **Composants critiques** (GridView, Modals) doivent avoir des tests

---

## 5. Intégration avec le Backend

### 5.1 — DTO vs Types Internes

```typescript
// Types côté frontend (src/types/)
export interface Image {
  id: string;
  filename: string;
  width: number;
  height: number;
}

// DTO du backend (ce qu'on reçoit de Rust)
export interface ImageDTO {
  id: string;
  filename: string;
  width: number;
  height: number;
  blake3_hash: string;      // snake_case du backend
  captured_at: string;      // ISO date string
}

// Mapping
function mapImageDTOToImage(dto: ImageDTO): Image {
  return {
    id: dto.id,
    filename: dto.filename,
    width: dto.width,
    height: dto.height
  };
}
```

### 5.2 — Session Tracking (Conventions d'API)

Les services doivent utiliser les méthodes de session **réelles** du backend, pas d'approximations :

```typescript
// ✅ BON — utilise les vraies sessions
async function getImportProgress(sessionId: string) {
  const session = await invoke<ImportSession>('get_import_session', { sessionId });
  return {
    phase: session.current_phase,
    progress: session.progress_percent,
    duration: session.elapsed_ms
  };
}

// ❌ MAUVAIS — approximation avec Date.now()
let startTime = Date.now();
setInterval(() => {
  console.log('Elapsed:', Date.now() - startTime);
}, 1000);
```

---

## 6. Logging Conditionnel

Voir `src/services/previewService.ts` pour le pattern établi :

```typescript
export class PreviewService {
  private static logDev(message: string) {
    if (import.meta.env.DEV) {
      console.log(`[Preview] ${message}`);
    }
  }

  async generateThumbnail(imagePath: string) {
    this.logDev(`Generating thumbnail for ${imagePath}`);
    // ...
  }
}
```

---

## 7. Dépendances Autorisées

| Package | Version | Justification |
|---------|---------|--------------|
| react | 19.2.0 | Framework frontend |
| zustand | 5.0.11 | State management |
| @tanstack/react-virtual | latest | Virtualisation grille |
| tailwindcss | 4.1.18 | Styling |
| lucide-react | 0.563.0 | Icones |
| vitest | 4.0.18+ | Tests |
| @testing-library/react | latest | Test utils |

**Aucune autre dépendance** sans approbation propriétaire.

---

## 8. Lien avec AGENTS Globals

Pour les **règles absolues** (plan, tests, intégrité), voir : `AGENTS.md` racine.

Pour l'**architecture générale**, voir : `Docs/APP_DOCUMENTATION.md`

Pour la **stratégie de tests**, voir : `Docs/TESTING_STRATEGY.md`
