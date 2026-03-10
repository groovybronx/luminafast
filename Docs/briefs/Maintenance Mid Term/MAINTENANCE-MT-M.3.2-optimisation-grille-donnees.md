# Phase M.3.2 — Optimisation Grille & Données

> **Statut** : 🔄 **En cours** (démarrée le 2026-03-10)
> **Durée estimée** : 3-4 jours
> **Priorité** : P2 (Moyenne)

## Objectif

Optimiser requête `get_all_images` avec lazy loading EXIF, vérifier virtualisation robuste GridView et réduire empreinte mémoire frontend pour fluidifier interface avec 5000+ images.

## Périmètre

### ✅ Inclus dans cette phase

- Refactoring backend `get_all_images` : implement lazy loading EXIF (charger seulement si nécessaire)
- Vérification/optimisation virtualisation GridView : ensure efficace avec large datasets
- Responsive scrolling tests avec 5000+ images
- Tests de performance : mémoire, CPU usage
- Lazy-loading EXIF metadata on-demand (au hover ou click)

### ❌ Exclus ou reporté intentionnellement

- Refactoring LeftSidebar extraction composants inline (reporté à phase **M.3.2a** — brief dédié `MAINTENANCE-MT-M.3.2a-leftsidebar-refactor.md`)
- Optimisation algorithmes render (EXIF parsing, etc.) — out of scope
- Caching stratégies avancée (future maintenance)

## Dépendances

### Phases

- Phase M.1.x ✅ (async backend ready)
- Phase M.3.1 ✅ (App.tsx refactored, foundation solid)

### Ressources Externes

- @tanstack/react-virtual (déjà présent probablement, virtualisation)
- React Query ou SWR (optional, si nécessaire caching)

### Test Infrastructure

- Vitest + React Testing Library
- Performance benchmarks (optional)

## Fichiers

### À créer

- `src/services/imageDataService.ts` — Service pour lazy-load EXIF (nouveau)
- `src/hooks/useLazyImageMeta.ts` — Hook pour charger metadata on-demand

### À modifier

- `src-tauri/src/commands/catalog.rs` — `get_all_images` retourner EXIF optionnel
- `src/components/GridView.tsx` — Utiliser virtualisation optimale, lazy-load EXIF au hover
- `src/stores/catalogStore.ts` — Adapter pour données sans EXIF par défaut

## Interfaces Publiques

### Tauri Commands (updated)

```rust
#[tauri::command]
pub async fn get_all_images(catalog_dir: String, include_exif: bool) -> Result<Vec<ImageBrief>, String>;

#[tauri::command]
pub async fn get_image_exif(image_path: String) -> Result<ExifData, String>;
```

### TypeScript DTOs

```typescript
interface ImageBrief {
  id: number;
  filename: string;
  path: string;
  size: u64;
  // EXIF excluded by default
}

interface ImageFull extends ImageBrief {
  exif: ExifData;
}

interface ExifData {
  cameraModel?: string;
  isoSpeed?: number;
  exposureTime?: string;
  // ... more fields
}
```

### Custom Hook

```typescript
function useLazyImageMeta(
  imagePath: string,
  enabled: boolean = false,
): {
  data?: ExifData;
  loading: boolean;
  error?: string;
};
```

## Contraintes Techniques

### TypeScript Frontend

- ✅ Strict mode enabled
- ✅ Pas de `any`
- ✅ Virtualisation must handle 5000+ items smoothly (60 FPS target)
- ✅ Memory usage < 100MB avec 5000 images (sans EXIF chargés)
- ✅ Lazy-load EXIF only when needed (hover or detailed view)

### Rust Backend

- ✅ `get_all_images` return quick (aucun parsing EXIF)
- ✅ `get_image_exif` call séparé, async
- ✅ Aucun `unwrap()` — proper error handling

## Architecture Cible

### Data Loading Strategy

```
BEFORE (problème):
  get_all_images()
    for each image:
      load + parse EXIF  // 🔴 SLOW, chargé inutilement
    return all with EXIF

APRÈS (optimisé):
  get_all_images()
    for each image:
      return brief (no EXIF)  // ✅ FAST

  When user hovers/clicks:
    get_image_exif(path)  // Async, on-demand load
    cache locally
```

### GridView Virtualisation

```
Visible items: ~20-40 (depends on viewport)
Rendered items: ~50-60 (overscan buffer)
Total dataset: 5000+ items
Memory: Only rendered items in DOM (~5-10 MB)
```

## Dépendances Externes

### TypeScript (`package.json`)

- @tanstack/react-virtual (virtualisation, check version)
- react = "^18.x" (déjà présent)

### Rust (`Cargo.toml`)

- No new dependencies (exif parsing may already exist)

## Checkpoints

- [x] **Checkpoint 1** : `get_all_images` refactorisé retourne brief data quickly
- [x] **Checkpoint 2** : GridView virtualisation tested avec 5000 images
- [x] **Checkpoint 3** : Lazy-load EXIF hook implemented et functional
- [ ] **Checkpoint 4** : Performance benchmarks (memory < 100MB, FPS ≥ 60)
- [x] **Checkpoint 5** : Tests passent (non-régression + new performance tests)

## Pièges & Risques

### Pièges Courants

- Virtualisation library version mismatch (React 18 compatibility)
- EXIF lazy-load race conditions (multiple simultaneous requests)
- Memory não freed quando items scrolled out (cache cleanup)
- GridView key prop missing/wrong (causes re-renders)

### Risques Potentiels

- Performance still slow if EXIF parsing é expensive (optimize parsing if needed)
- Virtualisation breaks on window resize (test responsive)
- Lazy-load causes UI flicker if slow network (add loading state)

### Solutions Préventives

- Benchmark with 10K images (stress test)
- Debounce EXIF requests on hover (max 1 request/100ms)
- Cache EXIF locally (zustand store)
- Test responsive behavior (resize viewport frequently)
- Monitor memory usage with DevTools

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description                                               | Statut       | Date       | Agent   |
| ----- | ---------- | --------------------------------------------------------- | ------------ | ---------- | ------- |
| M     | 3.2        | Optimisation Grille & Données (lazy EXIF, virtualisation) | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.3.2)**:

- Fichiers créés: `imageDataService.ts`, `useLazyImageMeta.ts`
- Fichiers modifiés: `catalog.rs`, `GridView.tsx`, `catalogStore.ts`
- Tests créés: `GridView.performance.test.tsx`, `useLazyImageMeta.test.ts`
- Performance: Memory usage 5000 images: BEFORE XXX MB → AFTER YYY MB
- EXIF loading: On-demand via lazy-load hook (zero overhead default)
- Virtualisation: Verified smooth avec 5000+ items
```

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — Update GridView, catalogStore
- Section "4. Performance & Optimisation" — Document lazy-load strategy + benchmarks
- Section "5. Data Loading" — Explain get_all_images + get_image_exif pattern

## Critères de Complétion

### Frontend

- [x] `tsc --noEmit` ✅
- [x] `npm run lint` ✅
- [x] Tests Vitest ciblés M.3.2 passent
- [ ] GridView smooth avec 5000 images (60 FPS benchmark)
- [ ] Memory usage < 100MB (measured with DevTools)
- [x] Lazy EXIF loading works (hover prefetch + chargement async côté panneau droit)

### Backend

- [x] `cargo check` ✅
- [x] `cargo clippy` ✅ (0 warnings)
- [x] `get_all_images` response ~100ms (baseline, no EXIF parsing) — benchmark test 5000 rows: `brief=211us`
- [x] `get_image_exif` response ~200ms per image — benchmark test: `avg=2us/query` (1000 itérations)

### Integration

- [x] Tests ciblés non-régression passent (frontend lazy/meta + backend compile/lint)
- [ ] User can interact with 5000 images library smoothly
- [x] CHANGELOG et APP_DOCUMENTATION mis à jour
- [x] Code compile sans warning

## Mesures Récentes (2026-03-10)

- `cargo test benchmark_get_all_images_queries_with_5000_rows -- --nocapture`
  - `M3.2 benchmark (5000 rows): brief=211us (0ms), with_exif=147us (0ms)`
- `cargo test benchmark_get_image_exif_query_latency -- --nocapture`
  - `M3.2 benchmark get_image_exif: total=2414us, avg=2us per query`
- `runTests` frontend ciblés
  - `src/components/library/__tests__/GridView.performance.test.tsx` ✅
  - `src/hooks/__tests__/useLazyImageMeta.test.ts` ✅

### Points Restants Avant Clôture M.3.2

- Validation UX manuelle en situation réelle (scroll + interactions sur bibliothèque 5000 images)
- Mesure mémoire/FPS en environnement app (DevTools/runtime) pour confirmer critères frontend finaux
