# Phase 3.1 — Maintenance : Complétion Grille d'Images

## 1. Entête

| Champ             | Valeur                                  |
| ----------------- | --------------------------------------- |
| **Phase**         | 3.1 Maintenance                         |
| **Type**          | Bug Fix + Feature Completion            |
| **Branche**       | `phase/3.1-maintenance-grid-completion` |
| **Durée estimée** | 4-5 heures                              |
| **Agent**         | Frontend + Backend                      |
| **Date création** | 2026-02-24                              |

---

## 2. Objectif

Compléter et corriger la Phase 3.1 après audit du code. La phase était marquée "Complétée" mais manquait des fonctionnalités critiques:

- **Hybridation d'état** : App.tsx utilise simultanément `useCatalog()` ET `useCatalogStore()` → fuite de données
- **Pas de synchronisation SQLite** : Ratings/flags/tags modifiés ne sont pas sauvegardés en base
- **Pas de lazy loading** : Aucun IntersectionObserver pour charger previews à la demande
- **Tests non-production** : Données hardcodées au lieu de vraies données SQLite

---

## 3. Périmètre

### ✅ IN (inclus dans cette maintenance)

1. **Centraliser state management** : Éliminer `useCatalogStore` de App.tsx, utiliser `useCatalog()` uniquement
2. **Écriture SQLite bidirectionnelle** : Ratings, flags, tags → base de données via `UpdateImageCommand`
3. **Lazy loading previews** : IntersectionObserver pour charger thumbnails à la demande (bonus: skip si scroll trop rapide)
4. **Améliorer tests** : Tests d'intégration réels avec catalogue SQLite (au lieu de mocks complets)
5. **Gérer state sync** : Affichage du flag `isSynced` ✅ une fois DB confirmée

### ❌ OUT (pas dans cette phase)

- Blur-hash placeholders (optionnel pour v1, faire plus tard)
- Raccourcis clavier persistants (Phase 5.3)
- Tri avancé (rating/date/ISO) — déjà fonctionnel basic
- Smart Collections UI (Phase 3.3)

### 🟡 Reporté (après 3.1)

- Optimisation cache preview (LRU en RAM)
- Monitoring telemetry pour performances de scroll
- A/B testing virtualisation vs react-virtuoso

---

## 4. Dépendances

**Phases préalables** (doivent être ✅) :

- ✅ Phase 1.1 : Schéma SQLite avec images table
- ✅ Phase 1.2 : Tauri Commands CRUD
- ✅ Phase 2.1 : Discovery & Ingestion
- ✅ Phase 2.3 : Génération des Previews
- ✅ Phase 2.4 : UI d'Import Connectée
- ✅ Phase 3.1 : Grille virtualisée (en cours de correction)

**Ressources externes** :

- `src/services/catalogService.ts` : `UpdateImageCommand` (DOIT EXISTER ou créer)
- `src/hooks/useCatalog.ts` : Hook hook source de vérité
- `src-tauri/src/commands/catalog.rs` : Endpoint update_image

---

## 5. Fichiers Affectés

| Fichier                                              | Type        | Détail                                                             |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| `src/App.tsx`                                        | 🔄 REFACTOR | Remplacer `useCatalogStore` par `useCatalog()` ONLY                |
| `src/components/library/GridView.tsx`                | 🔄 REFACTOR | Ajouter lazy loading IntersectionObserver                          |
| `src/services/catalogService.ts`                     | ✏️ ADD      | Ajouter `updateImage()` (écriture SQLite)                          |
| `src/hooks/useCatalog.ts`                            | ✏️ ADD      | Ajouter callbacks `onRatingChange`, `onFlagChange`, `onTagsChange` |
| `src/stores/catalogStore.ts`                         | 🔄 REFACTOR | Simplifie: uniquement state local, pas BDD                         |
| `src-tauri/src/commands/catalog.rs`                  | ✏️ ADD      | Ajouter ou étendre `update_image` command                          |
| `src/components/library/__tests__/GridView.test.tsx` | 🔄 REFACTOR | Adapter mocks pour vraies queries SQLite                           |
| `src/hooks/__tests__/useCatalog.test.ts`             | ✏️ ADD      | Tests intégration avec catalogService                              |

---

## 6. Interfaces & Types

### Contexte App.tsx Requis

```typescript
// AVANT (❌ hybride state)
const { images, refreshCatalog } = useCatalog(); // SQLite
const { setImages, toggleSelection } = useCatalogStore(); // Local

// APRÈS (✅ seul source de vérité)
const {
  images,
  isLoading,
  error,
  refreshCatalog,
  syncAfterImport,
  onRatingChange, // → SQLite
  onFlagChange, // → SQLite
  onTagsChange, // → SQLite
} = useCatalog();

// State local SEULEMENT UI (selection, activeView, etc.)
const { toggleSelection, setSingleSelection } = useUiStore();
```

### Extension UseCatalogReturn

```typescript
export interface UseCatalogReturn {
  // Existing
  images: CatalogImage[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  refreshCatalog: (filter?: ImageFilter) => Promise<void>;
  syncAfterImport: () => Promise<void>;
  clearError: () => void;
  imageCount: number;
  hasImages: boolean;

  // NEW: Update handlers (write to SQLite)
  onRatingChange: (imageId: number, rating: number) => Promise<void>;
  onFlagChange: (imageId: number, flag: FlagType | null) => Promise<void>;
  onTagsChange: (imageId: number, tags: string[]) => Promise<void>;
}
```

### CatalogService.updateImage()

```typescript
export async function updateImage(
  imageId: number,
  updates: {
    rating?: number;
    flag?: FlagType | null;
    tags?: string[];
    edits?: Partial<EditState>;
  },
): Promise<ImageDTO> {
  // Invoke Tauri command
  return invoke('update_image', {
    image_id: imageId,
    updates,
  });
}
```

### Lazy Loading Config (GridView)

```typescript
interface ImageCardProps {
  image: CatalogImage;
  isVisible: boolean; // From IntersectionObserver
  isLoading?: boolean;
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
  onSetActiveView: (view: ActiveView) => void;
}
```

---

## 7. Contraintes Techniques

### Non-Négociables

1. **Aucun data leak** : Les modifications (rating/flag/tags) DOIVENT arriver en SQLite, pas rester locales
2. **Pas d'état hybride** : Une seule source de vérité pour les images (pas `useCatalog()` + `useCatalogStore()` simultanément)
3. **Tests réels** : Aucun mock complet de `useCatalog()` ; les tests doivent utiliser le vrai service
4. **Transactions** : Si update multi-images, utiliser transaction SQLite Rust
5. **Error handling** : Si écriture SQLite échoue, afficher erreur à l'utilisateur + retry
6. **Performance** : Lazy loading doit skip requête si scroll > 300px/sec (anti-thrashing)

### TypeScript Strict

```typescript
// ❌ INTERDIT dans le refactoring
const images: any[] = []; // no any
const store = useCatalogStore(); // ne pas importer depuis App.tsx
updateImage(imageId, null as unknown); // no unknown casts
```

---

## 8. Architecture Cible

```
App.tsx (data fetching + event dispatch)
  │
  ├─ useCatalog() ◄──── SOURCE OF TRUTH (SQLite)
  │    │
  │    ├─ refreshCatalog() ←─ Charger depuis SQLite
  │    ├─ onRatingChange() ──→ Écrire en SQLite
  │    ├─ onFlagChange() ────→ Écrire en SQLite
  │    └─ onTagsChange() ────→ Écrire en SQLite
  │
  ├─ useUiStore() ◄──── UI STATE ONLY (selection, view, sidebar)
  │
  └─ GridView
       │
       ├─ useVirtualizer() ──→ Virtualisation rows
       │
       └─ LazyLoadedImageCard
            │
            ├─ IntersectionObserver ──→ Décider si charger preview
            ├─ onRatingChange() ──────→ App.tsx → useCatalog()
            ├─ onFlagChange() ────────→ App.tsx → useCatalog()
            └─ preview (lazy loaded ou skeleton)

DATABASE (SQLite via Rust)
  │
  ├─ images (CRUD)
  ├─ exif (READ)
  └─ previews (READ)
```

---

## 9. Dépendances Externes

### NPM (déjà présentes)

- `@tanstack/react-virtual@^3.13.18` ✅
- `react@19.2.0` ✅
- `zustand@5.0.11` ✅

### NPM (optionnel bonus)

- `framer-motion` — pour animations lazy load (optionnel)

### Rust (back-end)

- `rusqlite` ✅ (déjà utilisé)
- `serde` ✅
- `tokio` ✅ (async)

### Tauri Commands

- Vérifier que `update_image` existe en `src-tauri/src/commands/catalog.rs`
- Si absent, créer avec signature :
  ```rust
  #[tauri::command]
  pub fn update_image(image_id: i32, updates: UpdateImagePayload) -> Result<ImageDTO> { ... }
  ```

---

## 10. Checkpoints de Validation

### ✅ Checkpoint 1 : Correction Hybrid State (1h)

- [ ] App.tsx supprime tous imports `useCatalogStore(setImages, toggleSelection, ...)`
- [ ] App.tsx utilise SEUL **`useCatalog()`** pour images data
- [ ] useUiStore() utilisé SEULEMENT pour `toggleSelection`, `activeView`, sidebar
- [ ] Tests passent : `npm run test src/App.tsx`

### ✅ Checkpoint 2 : Écriture SQLite (1.5h)

- [ ] `CatalogService.updateImage()` implémentée et testée
- [ ] `onRatingChange()` écrit en SQLite via Tauri
- [ ] `onFlagChange()` écrit en SQLite via Tauri
- [ ] `onTagsChange()` écrit en SQLite via Tauri
- [ ] Vérifier isSynced flag = false avant écriture, true après
- [ ] Tests unitaires : `npm run test src/services/catalogService.test.ts`

### ✅ Checkpoint 3 : Lazy Loading (1h)

- [ ] `LazyLoadedImageCard` component créé avec IntersectionObserver
- [ ] Préview charge seulement quand visible dans viewport
- [ ] Skip chargement si scroll trop rapide (> 300px/sec)
- [ ] Placeholder (skeleton ou couleur) en attente de preview
- [ ] Performance test : scroll smooth sur 1000 images

### ✅ Checkpoint 4 : Tests Réels (1h)

- [ ] `GridView.test.tsx` utilise vraie `useCatalog()` (mock service, pas mock hook)
- [ ] `useCatalog.test.ts` teste intégration `catalogService.updateImage()`
- [ ] Tests d'intégration : import → affichage → modification → vérifier SQLite
- [ ] Tous tests passent : `npm run test` (504 tests)

### ✅ Checkpoint 5 : Non-Régression (final)

- [ ] Aucun test Phase 3.1-3.3 ne régresse
- [ ] CHANGELOG mis à jour
- [ ] APP_DOCUMENTATION.md reflète les changements
- [ ] Pre-commit hook passe ✅

---

## 11. Pièges & Solutions

### Piège 1 : Data Race (mise à jour en attente)

**Problème** : Utilisateur modifie rating, avant que SQLite confirme, modifie flag → état incohérent

**Solution** :

- Utiliser `isSynced: false` dès modification locale
- Batcher les updates : n'envoyer que delta après 1sec d'inactivité
- Afficher spinner/badge "saving..." pendant écriture

### Piège 2 : IntersectionObserver Leak

**Problème** : Observer continue à tracker après unmount → memory leak

**Solution** :

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(...);
  // ... setup
  return () => observer.disconnect(); // ← OBLIGATOIRE
}, []);
```

### Piège 3 : Scroll Thrashing

**Problème** : Rapid scrolling → 1000 requêtes preview simultanées

**Solution** :

- Throttle observable callback : debounce 300ms
- Skip if scroll velocity > 300px/sec
- Canceller requêtes xhr en suspension

### Piège 4 : Tests vs Production Data

**Problème** : Tests passent localement mais fail en CI (mocks vs vraies queries)

**Solution** :

- Ne pas mocker `useCatalog()` complètement
- Mocker seulement `CatalogService.getAllImages()` pour retourner fixtures
- Garder interaction réelle avec Zustand store

### Piège 5 : State Mutation

**Problème** : Modifier `images[0].state.rating` directement → Zustand ne détecte pas changement

**Solution** :

```typescript
// ❌ WRONG
images[0].state.rating = 5;

// ✅ CORRECT
setImages(
  images.map((img) => (img.id === id ? { ...img, state: { ...img.state, rating: 5 } } : img)),
);
```

---

## 12. Documentation Attendue

### CHANGELOG.md

Nouvelle entrée :

```markdown
### 2026-02-24 — Phase 3.1 Maintenance : Complétion Grille (Branche: phase/3.1-maintenance-grid-completion)

**Objet** : Corriger Phase 3.1 qui manquait 4 composants critiques (audit code)

**Corrections apportées** :

1. ✅ **Hybridation d'état centralisée** : App.tsx n'utilise plus `useCatalogStore()` direct
   - Source unique : `useCatalog()` de SQLite
   - useUiStore() réservé à UI state (selection, view)
   - Fichier: src/App.tsx (lines X-Y)

2. ✅ **Synchronisation bidirectionnelle SQLite** :
   - onRatingChange() → UPDATE images SET rating
   - onFlagChange() → UPDATE images SET flag
   - onTagsChange() → UPDATE images SET tags
   - Implémentation: src/services/catalogService.ts (updateImage)

3. ✅ **Lazy loading IntersectionObserver** :
   - Charger previews seulement quand visible
   - Skip si scroll > 300px/sec (anti-thrashing)
   - Component: src/components/library/LazyLoadedImageCard.tsx

4. ✅ **Tests intégration réels** :
   - GridView.test.tsx utilise vraie useCatalog (mock service layer)
   - Suppression des mocks complets de données
   - New: useCatalog.test.ts pour integration tests

**Commits** :

- phase(3.1-maint): centralizer App.tsx state via useCatalog
- phase(3.1-maint): add bidirectionnal SQLite sync (update_image)
- phase(3.1-maint): implement lazy loading IntersectionObserver
- phase(3.1-maint): refactor tests pour vraies données

**Stats** :

- src/App.tsx : -120 lines, +80 lines
- src/services/catalogService.ts : +45 lines
- src/components/library/LazyLoadedImageCard.tsx : +120 lines (new)
- Tests passants : 504/504 ✅
```

### APP_DOCUMENTATION.md

Mettre à jour section "Grille d'Images" :

```markdown
| GridView | library/GridView.tsx | Virtualization + lazy loading | ✅ Fonctionnel (Phase 3.1 complétée) |
| State Management | stores/ + useCatalog | Zustand + SQLite sync bidirectional | ✅ Source unique depuis SQLite |
| Lazy Loading | LazyLoadedImageCard.tsx | IntersectionObserver | ✅ Charge previews à la demande |
```

---

## 13. Critères de Complétion

### ✅ Tous les points DOIVENT être vrais pour merge

- [x] Aucun import `useCatalogStore` dans App.tsx (sauf pour localStorage optional)
- [x] `CatalogService.updateImage()` écrit en SQLite (testée)
- [x] IntersectionObserver lazy loading implémenté et fluide
- [x] Tests passent : `npm run test` (tous 504)
- [x] Aucune régression Phase 3.1-3.3
- [x] CHANGELOG + APP_DOCUMENTATION mis à jour
- [x] Pre-commit hook ✅
- [x] Branche `phase/3.1-maintenance-grid-completion` propre
- [x] Revue Code + approbation avant merge sur develop

---

## Notes Supplémentaires

### Performance Budget

- Virtualisation : déjà à 60fps ✅
- Lazy loading : +2-3ms par observable (acceptable)
- SQLite write : ~50ms pour batch update (async, ok)

### Testing Strategy

```
Unit Tests (80%):
  - catalogService.updateImage()
  - useCatalog hooks (rating/flag/tags)
  - LazyLoadedImageCard render + observer

Integration Tests (15%):
  - App.tsx + useCatalog + GridView flow
  - Import → refresh → modify → verify SQLite

E2E Tests (5%):
  - User scenario: import photos → rate → check DB
```

---

**Date création** : 2026-02-24  
**Agent assigné** : Frontend + Backend  
**Status initial** : 📋 À faire
