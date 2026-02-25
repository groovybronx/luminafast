# Phase 4.2 — Pipeline de Rendu Image

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 2-3 jours

---

## Objectif

Implémenter un pipeline de rendu temps réel qui applique les éditions (stockées via Event Sourcing en Phase 4.1) sur les previews Standard via CSS filters. Les sliders du Develop panel modifient les édits en DB (Phase 4.1), et le pipeline réapplique automatiquement les styles à l'image affichée avec une latence <16ms par frame.

---

## Périmètre

### ✅ Inclus dans cette phase

**Phase A (immédiate) — CSS Filters Natifs**

- Service Rust : `src-tauri/src/services/render_pipeline.rs`
  - `compute_css_filter_string(edits: EditState) -> String` → génère `filter: blur(...) brightness(...) ...`
  - `get_render_hints(image_id) → RenderHintsDTO` → cache des hints de rendu (format, dimensions)
  - Gestion d'erreur explicite (`Result<T, String>`)

- Commandes Tauri dans `src-tauri/src/commands/render.rs` :
  - `compute_css_filters(image_id: u32) → Result<FilterStringDTO, String>`
  - `get_render_info(image_id: u32) → Result<RenderInfoDTO, String>`

- Types Rust :
  - `FilterStringDTO { css_filter: String }`
  - `RenderInfoDTO { width: u32, height: u32, format: String }`

- Frontend Service : `src/services/renderService.ts`
  - `computeCSSFilters(imageId: number)` → Promise<{cssFilter: string}>
  - Cache local avec invalidation intelligente (sur changement edits)

- Frontend Component : Modifier `src/components/develop/DevelopView.tsx`
  - Connecter les sliders changeOnChange: `onSliderChange` → appliquer edits (Phase 4.1) → recompute filters
  - Appliquer `style={{ filter: cssFilterString }}` à l'image du canvas/preview
  - Performance: Debounce sliders à 60fps (~16ms)

- Image Reference : `src/components/library/ImageReference.tsx` (preview + metadata container)
  - Prop `cssFilter?: string` appliquée au style
  - Affichage temps réel du filter CSS sans modification du DOM

- Tests Rust :
  - `src-tauri/src/services/__tests__/render_pipeline.rs` (ou `src-tauri/tests/render_pipeline_integration.rs`)
  - Tester `compute_css_filter_string` avec divers EditStates
  - Tester limites (edits invalides, saturation >100, etc.)

- Tests TS :
  - `src/services/__tests__/renderService.test.ts` — mock Tauri invoke, tester cache
  - `src/stores/__tests__/editStore.test.ts` — ajouter tests `onSliderChange` → filter recomputation

### ✅ Implémentations clés du pipeline

1. **Slider → Edit → Render** (boucle 60fps)
   - User change Exposure slider
   - `editStore.applyEdit('EXPOSURE', {value: 0.5, ...})`
   - Backend persiste en DB (via Phase 4.1 `apply_edit_event`)
   - Frontend recompute filters: `renderService.computeCSSFilters(imageId)`
   - CSS filter appliqué: `style={{ filter: 'brightness(1.5) ...' }}`

2. **Cache Invalidation**
   - Frontend cache local (Map<imageId, cssFilterString>)
   - Invalider au changement d'edit ou undo/redo
   - Pas de recompute inutile si edits identiques

3. **Performance Budget**
   - Slider change → rerendercompute <16ms
   - Debounce à 60fps (16.67ms min interval)
   - Pas d'animation pendant ingestion/scan

### ❌ Exclus intentionnellement

- **WASM pixel-level rendering** (Phase 4.2B future) — Courbes de tons, balance des blancs complexe, clarté/texture, histogramme dynamique
- **Historique visuel avec timeline** (Phase 4.3) — Snapshots nommés, time-travel UI
- **Split-view / Comparaison avant/après** (Phase 4.4)
- **Vignetage avancé** (post-Phase 4.2A) — Pour Phase 4.2B avec pixel shaders
- **Modification du RAW original** — Éditions toujours appliquées au preview Standard, jamais au fichier source

### 📋 Reporté à Phase 4.2B ou future

- Courbes de tons (tone mapping)
- Balance des blancs (température/tint)
- Clarté / Texture (high-pass sharpening)
- Histogramme calculé dynamiquement
- Vignetage logarithmique
- → Tous ces éléments nécessitent WASM ou Canvas manipulation pixel-level

---

## Dépendances

### Phases

- **Phase 4.1** ✅ — Event Sourcing (edits persistés, `get_current_edit_state`)
- **Phase 3.1** ✅ — Grille images (image_id, preview URI)
- **Phase 2.3** ✅ — Génération de Previews (Standard preview disponible)
- **Phase 3.5** ✅ — Non-régression (tout précédent)

### Ressources Externes

- CSS Filter API (native, tous les navigateurs modernes et Chromium Tauri)
- Phase 4.1 Types : `EditStateDTO`, `EditEventDTO` from `src/types/edit.ts`

### Test Infrastructure

- Vitest déjà configuré ✅
- Tauri mock disponible ✅
- Rust test framework (native `#[test]`) ✅

---

## Fichiers à Créer/Modifier

### À créer

- **`src-tauri/src/services/render_pipeline.rs`** — Logique CSS filter computation + hints de rendu. Expose:
  - `compute_css_filter_string(edits: &EditState) -> String`
  - `get_render_hints(image_id: u32, db: &DatabaseConnection) -> Result<RenderHints, String>`
  - Gestion des cas limites (edits invalides, clipping)

- **`src-tauri/src/commands/render.rs`** — Tauri commands pour le frontend
  - `compute_css_filters(image_id: u32) → Result<FilterStringDTO, String>`
  - `get_render_info(image_id: u32) → Result<RenderInfoDTO, String>`
  - Appel à `edit_sourcing.rs:get_current_edit_state()`

- **`src/services/renderService.ts`** — Wrappeur TypeScript
  - `computeCSSFilters(imageId: number): Promise<{ cssFilter: string }>`
  - Cache local Map avec invalidation
  - Retry logic sur erreur Tauri

- **`src/services/__tests__/renderService.test.ts`** — Tests TS
  - Mock `invoke('compute_css_filters', ...)`
  - Test cache hit/miss
  - Test error handling

- **`src-tauri/tests/render_pipeline_integration.rs`** — Tests intégration Rust
  - Tester compute avec differents EditStates
  - Tester limites (saturation >100, contrast <-1, etc.)

### À modifier

- **`src/components/develop/DevelopView.tsx`** — Connecter pipeline
  - `const cssFilter = await renderService.computeCSSFilters(selectedImageId)`
  - Appliquer à l'image preview: `<img style={{ filter: cssFilter }} />`
  - Debounce slider changes (useDebounce, 16.67ms)
  - Affiche preview temps réel en bas

- **`src/components/develop/SliderPanel.tsx`** — Intégrer edit + render
  - Chaque slider: `onChange → editStore.applyEdit(...) → recompute filters`
  - States intermédiaires <16ms (optimistic UI)

- **`src/components/library/ImageReference.tsx`** — Support filter CSS
  - Nouvelle prop optionelle `cssFilter?: string`
  - Appliquer au style: `style={{ filter: cssFilter }}`

- **`src/stores/editStore.ts`** — Observer pour recompute
  - Après `applyEdit`, trigger `renderService.invalidateCache(imageId)`
  - Après undo/redo, recompute filters

- **`src-tauri/Cargo.toml`** — Pas de nouvelles dépendances (rusqlite, serde déjà présentes) ✅

- **`Docs/APP_DOCUMENTATION.md`** — Section "4. Pipeline Rendering"
  - Architecture diagram: Image → EditState → CSS Filter String → DOM
  - Liste des 10+ CSS filters supportés et mappage aux edits
  - Performance budget explanation

- **`Docs/CHANGELOG.md`** — Nouvelle entrée après complétion

---

## Interfaces Publiques

### Tauri Commands

```rust
// src-tauri/src/commands/render.rs

#[tauri::command]
pub async fn compute_css_filters(image_id: u32, db: tauri::State<'_, DbConn>)
  -> Result<FilterStringDTO, String>;

#[tauri::command]
pub async fn get_render_info(image_id: u32)
  -> Result<RenderInfoDTO, String>;
```

### TypeScript DTOs

```typescript
// src/types/render.ts (nouveau)

export interface FilterStringDTO {
  cssFilter: string; // ex: "brightness(1.2) contrast(1.1) saturate(0.9)"
  computedAt: string; // ISO timestamp
}

export interface RenderInfoDTO {
  width: number;
  height: number;
  format: string; // 'jpeg', 'png', 'webp'
  orientation: number; // EXIF orientation 1-8
}
```

### Service

```typescript
// src/services/renderService.ts

export interface RenderCache {
  imageId: number;
  cssFilter: string;
  editStateHash: string; // Hash des edits pour invalidation
  cachedAt: number;
}

export const renderService = {
  computeCSSFilters(imageId: number): Promise<{ cssFilter: string }>,
  invalidateCache(imageId: number): void,
};
```

### EditState Format

De Phase 4.1, l'`EditStateDTO` contient:
```typescript
{
  imageId: number;
  exposureValue: number;      // -2.0 à +2.0
  contrastValue: number;      // -1.0 à +2.0
  saturationValue: number;    // -1.0 à +2.0
  clarityValue: number;       // -1.0 à +1.0
  vibranceValue: number;      // -1.0 à +1.0
  temperatureValue: number;   // -50 à +50 (Kelvin offset)
  tintValue: number;          // -50 à +50
  highlightsValue: number;    // -1.0 à +1.0
  shadowsValue: number;       // -1.0 à +1.0
  vignettingValue: number;    // 0.0 à 1.0
  // ... autres

  appliedAt: string;
  lastModifiedAt: string;
}
```

Mapping CSS Filter:
```typescript
// Simplifié (Phase A) — CSS-only approximations
const filterString = `
  brightness(${1 + exposure})           // exposure → brightness
  contrast(${1 + contrast})             // contrast
  saturate(${1 + saturation})           // saturation
  opacity(${100}%)                      // placeholder for shadows/highlights future
`;
// Phase 4.2B: WASM pour clarité, température, vignetage avancé
```

---

## Contraintes Techniques

### Rust Backend

- **Error Handling** : Toujours `Result<T, String>`, pas de `unwrap()`
- **Input Validation** : Vérifier imageId > 0, edits dans les bonnes ranges
- **Performance** : `compute_css_filter_string` <1ms (pas de DB call)
- **Database** : `get_current_edit_state()` de Phase 4.1, avec timeout 100ms

### TypeScript Frontend

- **Strict Mode** : `"strict": true` ✅
- **No `any`** : Utiliser types `FilterStringDTO`, `RenderInfoDTO`
- **Performance** : Debounce sliders à 60fps, cache valide jusqu'à prochaine édition
- **Memory** : Cache limité (pas plus de 100 entrées, évict LRU)
- **Error Handling** : Try/catch sur `invoke()`, afficher toast si erreur Tauri

### DOM & CSS

- **Pas de modification du RAW** — Filter CSS appliqué uniquement au DOM (préview), jamais au fichier
- **Hardware Acceleration** : CSS filters utilisent GPU natif (pas de JS pixel manipulation)
- **Fallback** : Si filter CSS non supporté (rare), afficher preview sans filter

---

## Architecture Cible

### Flux de Données

```
User moves Exposure slider
  ↓
DevelopView.onSliderChange(value)
  ↓
editStore.applyEdit('EXPOSURE', {value, ...})
  ↓
Backend: edit_sourcing.apply_edit_event() → INSERT into edit_events
  ↓
Frontend: renderService.invalidateCache(imageId)
  ↓
renderService.computeCSSFilters(imageId)
  ↓
Rust: get_current_edit_state(imageId) → EditStateDTO
  ↓
Rust: compute_css_filter_string(edits) → "brightness(1.2) contrast(...)"
  ↓
Frontend: <img style={{ filter: cssFilterString }} />
  ↓
CSS GPU acceleration: render avec filter appliqué <16ms
  ↓
User sees filtered preview instantly
```

### Cache Strategy

```
Local Cache Map (frontend):
  Map<imageId, { cssFilter, editStateHash, cachedAt }>

Invalidation Triggers:
  - editStore.applyEdit() → invalidateCache
  - editStore.undo() → invalidateCache
  - editStore.redo() → invalidateCache
  - editStore.reset() → invalidateCache

  Validation Check:
  - Before returning cache, hash current edits
  - If hash !== stored hash → recompute (cache miss)
```

### Performance Budget

| Operation | Budget | Implementation |
|-----------|--------|-----------------|
| Slider change → filter applied | <16ms | Debounce 60fps + cache |
| `compute_css_filter_string` Rust | <1ms | Pure function, no DB |
| Network roundtrip Tauri IPC | <5ms | Local daemon |
| DOM update | <10ms | Atomic style change |

---

## Dépendances Externes

### Rust (`src-tauri/Cargo.toml`)

- `rusqlite` (déjà présent) ✅ — DB query `get_current_edit_state`
- `serde` / `serde_json` (déjà présents) ✅ — Serialize DTOs
- **Nouvelles** : Aucune pour Phase 4.2A

### TypeScript (`package.json`)

- `@tanstack/react-query` (optionnel futur) — Refactor cache plus tard
- **Nouvelles** : Aucune pour Phase 4.2A

### System

- Aucune dépendance C/Rust système (CSS filters natifs Chromium)

---

## Checkpoints

- [ ] **Checkpoint 1** : `src-tauri/src/services/render_pipeline.rs` compile (`cargo check`)
- [ ] **Checkpoint 2** : `src-tauri/src/commands/render.rs` + `invoke()` wrappers fonctionnent
- [ ] **Checkpoint 3** : Service TS `renderService.ts` avec cache et tests unitaires ✅
- [ ] **Checkpoint 4** : DevelopView sliders connectés → recompute filters → preview filtré ✅
- [ ] **Checkpoint 5** : Performance <16ms/frame bench, slider smooth 60fps
- [ ] **Checkpoint 6** : Tests Rust coverage ≥80%, Tests TS coverage ≥70%
- [ ] **Checkpoint 7** : Tous tests précédents passent (Phase 0→4.1, non-régression)
- [ ] **Checkpoint 8** : APP_DOCUMENTATION et CHANGELOG mis à jour ✅

---

## Pièges & Risques Connus

### Pièges Courants

1. **Cache invalidation timing** — Si edits updated mais cache pas invalidé → affiche ancien filter
   - **Solution** : Subscribe à editStore changes, invalidate immédiatement après `applyEdit()`

2. **Debounce trop agressif** — 16ms trop court, slider laggy
   - **Solution** : Optimistic UI (appliquer filter immédiatement), recompute en background après 50ms

3. **EditState not loaded** — Appliquer filter sur image sans edits → crashe backend
   - **Solution** : Toujours charger `get_current_edit_state()` (Phase 4.1), default empty edits

4. **CSS filter clipping** — Saturation >1.0 ou contrast >2.0 crée artifacts
   - **Solution** : Valider ranges frontend + backend, clamp values dans `compute_css_filter_string`

5. **Performance regression** — Too many recomputes per second
   - **Solution** : Profile avec DevTools, debounce slider à 60fps max, cache agressivement

### Risques Potentiels

- **Memory leak** : Cache non-nettoyé si grid virtualisée, 10K+ images → Map grandit infini
  - **Mitigation** : LRU eviction, max 100 cached entries, release on gallery unload

- **DB lock contention** : Chaque slider → DB query `get_current_edit_state`
  - **Mitigation** : Phase 4.1 uses snapshots (rebuilt every 20 events), front-end cache 500ms TTL

- **CSS browser compatibility** : `filter: backdrop-filter` non supporté Safari <15
  - **Mitigation** : Feature detection, fallback graceful (afficher preview sans filter)

### Solutions Préventives

1. Profile slider performance avec Chrome DevTools (Performance tab)
2. Bench `compute_css_filter_string` avec 1000 different EditStates → <1ms
3. Test cache avec rapid image selection → no memory growth
4. Validate DB lock behavior with concurrent edits (Phase 4.1 lockfile)

---

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| 4 | 4.2 | Pipeline de Rendu Image (CSS Filters) | ✅ Complétée | YYYY-MM-DD | Copilot |

**Details (Phase 4.2 — Pipeline Rendering)**:

**Changements clés**:
- Service Rust `render_pipeline.rs` : `compute_css_filter_string()` + `get_render_hints()`
- Commandes Tauri : `compute_css_filters(image_id)`, `get_render_info(image_id)`
- Service TS `renderService.ts` : wrappeur + cache intelligent
- DevelopView connecté : sliders → edits → filters → preview temps réel
- Performance : <16ms/frame @ 60fps (debounce)

**Tests** :
- Rust integration tests : mapping edits ↔ CSS filters, limites respectées
- TS unit tests : cache hits/misses, error handling, debounce

**Fichiers** :
- Créés : `src-tauri/src/services/render_pipeline.rs`, `src-tauri/src/commands/render.rs`, `src/services/renderService.ts`, `src/types/render.ts`
- Modifiés : `DevelopView.tsx`, `SliderPanel.tsx`, `ImageReference.tsx`, `editStore.ts`, `APP_DOCUMENTATION.md`

**Non-régression** : Tous tests Phase 0→4.1 ✅ (185 Rust + 399 TS)
```

### APP_DOCUMENTATION.md Sections to Update

**Add new section** (after "3. Architecture des Fichiers"):

```markdown
## 4. Pipeline de Rendu Image

### Vue d'ensemble

Le pipeline de rendu applique les édits (sourced en Phase 4.1) sur les previews via CSS filters natifs.

**Architecture** :
```
Image (DB) → EditState (reload) → CSS Filter String (compute) → DOM style applié → Preview filtré
```

### CSS Filters Supportés (Phase 4.2A)

| Edit Type | CSS Filter | Range | Exemple |
|-----------|-----------|-------|---------|
| Exposure | `brightness(x)` | 0.0-2.0 (default 1.0) | `brightness(1.2)` |
| Contrast | `contrast(x)` | 0.0-2.0 (default 1.0) | `contrast(1.1)` |
| Saturation | `saturate(x)` | 0.0-2.0 (default 1.0) | `saturate(0.9)` |
| Clarity _(Phase 4.2B)_ | WASM blur-based | -1.0 to +1.0 | _Future_ |
| Vignetage _(Phase 4.2B)_ | WASM radial-gradient | 0.0-1.0 | _Future_ |

### Performance

- Computation : `compute_css_filter_string()` <1ms (pure)
- DOM update : CSS GPU accelerated, <10ms
- End-to-end : <16ms @ 60fps

### Cache Strategy

Frontend maintains LRU cache (max 100 entries, TTL ∞ until edit change).

**Invalidation** : On `applyEdit()`, `undo()`, or `redo()`.
```

---

## Critères de Complétion

### Architecture & Design
- [ ] Brief approuvé, périmètre A (CSS filters) vs B (WASM) clair
- [ ] Interfaces DTOs finalisées (`FilterStringDTO`, `RenderInfoDTO`)
- [ ] Cache strategy documentée (LRU, invalidation triggers)

### Backend (Rust)

- [ ] `cargo check` ✅ (0 compilation errors)
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] `compute_css_filter_string()` handles all EditState fields correctly
- [ ] `get_current_edit_state()` integration with Phase 4.1 ✅
- [ ] Rust integration tests pass (mapping edits → CSS, edge cases)
- [ ] No `unwrap()`, all `Result<T, E>` paths handled
- [ ] Test coverage ≥80%

### Frontend (TypeScript)

- [ ] `tsc --noEmit` ✅ (0 type errors)
- [ ] `npm run lint` ✅
- [ ] `renderService.ts` cache logic correct (hit/miss/invalidate)
- [ ] `DevelopView.tsx` sliders connected → filter recompute workflow
- [ ] Debounce working (60fps max, <16ms latency)
- [ ] All sliders updating preview in real-time
- [ ] TS tests pass: 70%+ coverage
- [ ] No `any` types

### Integration

- [ ] Tauri IPC working (invoke commands callable from Frontend)
- [ ] Data flow: slider → edit → filter → preview ✅
- [ ] EditStore + renderService cache synchronized
- [ ] ImageReference supports `cssFilter` prop
- [ ] Undo/redo preserves filter state correctly

### Non-Regression

- [ ] All Phase 0.1→4.1 tests pass ✅
  - Rust: 185 tests
  - TypeScript: 399 tests
- [ ] No visual regressions in existing components
- [ ] Gallery grid still performant (virtualization unaffected)
- [ ] Import / discovery unaffected

### Documentation & Deployment

- [ ] `APP_DOCUMENTATION.md` updated (Section 4)
- [ ] `CHANGELOG.md` entry added
- [ ] Brief marked ✅ Complétée
- [ ] Code compiles on macOS, Windows, Linux (CI green)

---

## Ressources Additionnelles

- **Phase 4.1** : `Docs/briefs/PHASE-4.1.md` (Event Sourcing, structures `EditStateDTO`)
- **CSS Filter Specs** : https://developer.mozilla.org/en-US/docs/Web/CSS/filter
- **Render Performance** : Chrome DevTools Performance profiler
- **Frontend AGENTS** : `src/AGENTS.md` (React patterns, Zustand, testing)
- **Backend AGENTS** : `src-tauri/AGENTS.md` (Rust error handling, Tauri patterns)
