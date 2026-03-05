# Phase 4.2 — Pipeline de Rendu Image

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 3-4 jours (Phase A + Phase B)
> **Dates** : Démarrage 2026-02-26

## Objectif

Implémenter le pipeline de rendu des images en deux étapes : Phase A via CSS filters (exposure, contrast, saturation) et Phase B via WASM + `image` crate pour traitement pixel réel (courbes, balance des blancs, clarté, vignetage). Le système appliquera les transformations sauvegardées dans Event Sourcing sur les previews Standard, en temps réel avec latence <16ms par frame.

## Périmètre

### ✅ Inclus dans cette phase

#### Phase A (Immédiate)

- CSS filters backend (exposure, contrast, saturation) mappés aux événements Event Sourcing
- Composant `PreviewRenderer.tsx` : application des CSS filters au preview affichée
- Service `renderingService.ts` : conversion des edit events → CSS transforms
- Intégration Event Store : lire les events et recalculer le state visuel
- Tests unitaires pour chaque filtre (exposition, contraste, saturation)

#### Phase B (WASM + Pixel Real)

- WASM module complet avec `image` crate Rust (compilation `wasm-bindgen`, allocation mémoire optimisée)
- Filtres pixel réel : courbes de tons, balance des blancs (temp/tint), hautes lumières/ombres, clarté/texture, vignetage
- Canvas-based rendering : application des pixels traités via HTML5 Canvas
- Fallback CSS pour perf si WASM non-disponible
- Benchmarks confirmé : latence <16ms par frame sur preview 1440px (60fps)
- Intégration event-to-pixel flow : EditStore → WASM → Canvas → display

### ❌ Exclus intentionnellement

- Développement du Develop Slider Panel visuel (reporté à 4.3)
- Traitement du RAW natif (rester sur previews Standard)
- Cache de rendus pré-calculés (reporté à 6.1)
- Optimisation SIMD avancée (reporter à 6.4)
- Profiling avancé / GPU rendering (reporter à phase 6+)

### 📋 Reporté de 4.1

- Aucun

## Dépendances

### Phases

- Phase 4.1 ✅ complétée (Event Sourcing Engine)

### Ressources Externes

- `wasm-bindgen` crate pour WASM (Phase B)
- `image` crate Rust (Phase B via WASM)
- HTML Canvas API pour rendu pixel (Phase B)

## Fichiers

### À créer

#### Phase A

- `src/services/renderingService.ts` — Conversion edit events → CSS transforms + tests
- `src/components/library/PreviewRenderer.tsx` — Composant affichant image avec CSS filters appliqués
- `src/types/rendering.ts` — Interfaces: `CSSFilterState`, `RenderContext`
- `src/services/__tests__/renderingService.test.ts` — Tests unitaires pour chaque filtre
- `src/components/library/__tests__/PreviewRenderer.test.tsx` — Tests du composant

#### Phase B

- `src-tauri/src/services/image_processing.rs` — Module Rust pour pixel operations (courbes, balance, clarté, vignetage, ombres/lumières)
- `src-tauri/src/wasm/mod.rs` — Organiseur des modules WASM
- `src-tauri/src/wasm/image_processor.rs` — Module WASM avec `wasm-bindgen`, exposition des filtres pixel
- `src-tauri/src/wasm/utils.rs` — Utilitaires WASM (allocation, conversion formats pixels)
- `src-tauri/Cargo.toml` modifications : ajout `wasm-bindgen`, `web-sys`, `image` comme dépendances
- `src/services/wasmRenderingService.ts` — Wrapper TypeScript pour invocation WASM (fallback to CSS)
- `build.rs` modifications : configuration WASM compilation
- Tests Rust : `src-tauri/src/services/__tests__/image_processing.test.rs` (algo pixel)
- Tests WASM integration : `src/services/__tests__/wasmRenderingService.test.ts`

### À modifier

- `src/services/catalogService.ts` — Ajouter méthode `getEditEvents(imageId)` wrappant Tauri
- `src/stores/editStore.ts` — S'intégrer avec Event Sourcing, exposer `getAppliedEdits(imageId)`
- `src/components/library/ThumbnailCard.tsx` — Utiliser `PreviewRenderer` au lieu d'un `<img>` brut
- `src-tauri/src/services/mod.rs` — Ajouter module `image_processing` + `wasm` (Phase B)
- `src-tauri/Cargo.toml` — Ajouter dépendances : `wasm-bindgen`, `web-sys`, `image` (Phase B)
- `src-tauri/build.rs` — Ajouter configuration pour compilation WASM (Phase B)
- `Docs/APP_DOCUMENTATION.md` — Section "Système de Rendu" avec architecture complète
- `Docs/CHANGELOG.md` — Entrée phase 4.2

## Interfaces Publiques

### TypeScript Services

```typescript
// renderingService.ts (Phase A)
export interface CSSFilterState {
  exposure: number; // -2.0 à +2.0
  contrast: number; // -1.0 à +3.0
  saturation: number; // 0.0 à 2.0
}

export interface PixelFilterState extends CSSFilterState {
  highlights: number; // -1.0 à +1.0 (Phase B)
  shadows: number; // -1.0 à +1.0 (Phase B)
  clarity: number; // -100 à +100 (Phase B)
  vibrance: number; // -100 à +100 (Phase B)
  colorTemp: number; // 2000K à 10000K (Phase B)
  tint: number; // -50 à +50 (Phase B)
  curves?: CurvePoint[]; // Tone curves (Phase B)
}

export function eventsToCSSFilters(events: EditEvent[]): CSSFilterState;

export function applyCSSFilters(imageElement: HTMLImageElement, filters: CSSFilterState): void;

export function calculateFilterLatency(): number; // mesuré en ms

// wasmRenderingService.ts (Phase B)
export async function loadWasmModule(): Promise<WasmModule>;
export async function renderWithWasm(
  imageData: ImageData,
  filters: PixelFilterState,
): Promise<ImageData>;
export function hasWasmSupport(): boolean;
```

### React Component

```typescript
// PreviewRenderer.tsx
export interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean; // Phase B toggle
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  imageId,
  previewUrl,
  className,
  isSelected,
  useWasm = false,
}) => {
  // Phase A: Lire events depuis editStore
  // Phase B: Si useWasm=true, utiliser WASM sinon fallback CSS
  // Convertir en filters + appliquer
  // Re-render on event changes
};
```

### Rust Backend

```rust
// image_processing.rs (Phase B)
pub struct PixelFilters {
    pub exposure: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub highlights: f32,
    pub shadows: f32,
    pub clarity: f32,
    pub vibrance: f32,
    pub color_temp: f32,
    pub tint: f32,
}

pub fn apply_filters(
    pixels: &[u8],
    width: u32,
    height: u32,
    filters: &PixelFilters
) -> Result<Vec<u8>, ProcessingError>;
```

### Tauri Command (via catalogService)

```rust
#[tauri::command]
pub fn get_edit_events(image_id: i64) -> Result<Vec<EditEvent>, String>;
```

## Contraintes Techniques

### TypeScript Frontend

- Strict mode (`"strict": true`)
- Pas de `any` — utiliser `unknown` + type guards
- CSS filters implémentés via `filter` CSS standard (w3c.github.io/filters) pour Phase A
- Canvas API pour Phase B (HTML5 standard)
- Props interfaces (suffixe `Props`)
- Gestion d'erreur: try/catch ou Promise.catch()
- Performance: chaque re-render <16ms (mesurable via performance.now())
- Détection WASM support : fallback graceux si non-disponible

### Rust Backend

- JAMAIS de `unwrap()` — utiliser `Result<T, E>` systématiquement
- Valider inputs (tailles image, pixel ranges 0-255, filter ranges)
- Utiliser `thiserror` pour custom errors
- WASM module : `wasm-bindgen` pour exposition TypeScript
- Canvas pixels : format RGBA u8 standardisé
- Allocation mémoire WASM : utiliser `wasm_bindgen::prelude::*` pour memory safety

### Testing

#### Phase A

- Tests units : `renderingService.test.ts` pour chaque filtre CSS
- Tests components : `PreviewRenderer.test.tsx` (rendu + CSS appliqué)
- Bench latency : <16ms confirmé par test
- Coverage min: 80%

#### Phase B

- Tests Rust pour chaque algorithme pixel : `image_processing.test.rs`
- Integration test TypeScript → WASM invocation et result validation
- Bench : WASM rendu <16ms sur preview 1440px (pixels RGBA)
- WASM memory: pas de leak (verificare à chaque invoca)
- Canvas ImageData round-trip test (read → compute → write → verify)

## Architecture Cible

### Flux de Rendu Phase A (CSS Filters)

```
EditStore (Zustand)
  ↓
[userEdits = [events...]]
  ↓
PreviewRenderer.tsx (ThumbnailCard)
  ↓
renderingService.eventsToCSSFilters()
  ↓
applyCSSFilters(imgElement)
  ↓
<img style={{ filter: "..." }} />
  ↓
Display with CSS transforms (native, <1ms)
```

### Flux de Rendu Phase B (WASM + Canvas)

```
EditStore (Zustand)
  ↓
[userEdits = [events...]]
  ↓
PreviewRenderer.tsx (useWasm=true)
  ↓
wasmRenderingService.renderWithWasm()
  ↓
WASM Module (Rust + wasm-bindgen)
  ↓
Pixel operations (courbes, balance, clarté, vignetage, ombres/lumières)
  ↓
Canvas.getContext('2d').putImageData()
  ↓
Display via Canvas (pixel-perfect, <16ms)
  ↓
Fallback: Si WASM unavailable → Phase A CSS filters
```

### CSS Filter Expression (Phase A)

```javascript
// Pseudocode
const cssFilter = `
  brightness(${1 + exposure * 0.3})
  contrast(${1 + contrast * 0.5})
  saturate(${saturation})
`;
image.style.filter = cssFilter;
```

### WASM Architecture (Phase B)

```
src-tauri/
├── src/
│   ├── services/
│   │   └── image_processing.rs
│   │       └── apply_filters(pixels, width, height, filters) → Result<Vec<u8>>
│   └── wasm/
│       ├── mod.rs (organizeur)
│       ├── image_processor.rs (#[wasm_bindgen] pub fn apply_filters_wasm(...))
│       └── utils.rs (alloc, pixel format conversions)
│
├── Cargo.toml
│   └── [wasm-bindgen, web-sys, image, ...]
│
└── build.rs
    └── WASM compilation target web
```

## Dépendances Externes

### TypeScript (`package.json`)

- Aucune nouvelle dépendance pour Phase A (CSS standard)
- Phase B : WASM module sera généré via `wasm-pack` (CLI tool, pas npm dep)

### Rust (`Cargo.toml`)

#### Phase A

- Aucune dépendance supplémentaire

#### Phase B

- `image` crate = "0.24" — Traitement pixel, format conversions
- `wasm-bindgen` = "0.2" — Exposition WASM à TypeScript
- `web-sys` = "0.3" — Canvas API FFI
- `js-sys` = "0.3" — Interop JS runtime

### System

- `wasm-pack` (CLI) — compilateur WASM (installé via `curl https://rustwasm.org/wasm-pack/installer.sh -sSf | sh`)

## Checkpoints de Validation

### Phase A (CSS Filters)

- [ ] **Checkpoint 1** : Code TypeScript compile sans erreur (`tsc --noEmit`)
- [ ] **Checkpoint 2** : Rust backend compile (`cargo check`)
- [ ] **Checkpoint 3** : Tests CSS filters passent (`npm run test -- renderingService`)
- [ ] **Checkpoint 4** : Latence <16ms mesurée sur 1440px preview (Phase A) via performance benchmark
- [ ] **Checkpoint 5** : `PreviewRenderer` intégré dans `ThumbnailCard`, affiche preview avec edits appliqués
- [ ] **Checkpoint 6** : Intégration Event Sourcing fonctionnelle (read events → render)

### Phase B (WASM + Pixel Processing)

- [ ] **Checkpoint 7** : WASM module Rust compile (`wasm-pack build --target web`)
- [ ] **Checkpoint 8** : Pixel filter algorithms testés en Rust (`cargo test --lib image_processing`)
- [ ] **Checkpoint 9** : WASM invocation TokenScript fonctionne, fallback CSS auto-activé si WASM unavailable
- [ ] **Checkpoint 10** : Canvas rendering bench : <16ms pour preview 1440px
- [ ] **Checkpoint 11** : Memory test : no WASM leaks (repeated invocations, GC monitoring)
- [ ] **Checkpoint 12** : Integration test TS→WASM→Canvas→verify pixels

### Global Phase 4.2

- [ ] **Checkpoint 13** : Tous les tests passent (TypeScript + Rust)
  - `npm run test` → ✅ (all tests)
  - `cargo test --all` → ✅
- [ ] **Checkpoint 14** : Non-régression phases 1-4.1 : 100% ✅
- [ ] **Checkpoint 15** : CHANGELOG + APP_DOCUMENTATION mises à jour

## Notes Architecturales

### Performance Budget

#### Phase A (CSS Filters)

- CSS filters latency: **<1ms** (native browser rendering)
- ThumbnailCard re-render on event: **<50ms** (asynchronous via Zustand subscription)

#### Phase B (WASM + Canvas)

- WASM initialization : **<100ms** (one-time on app load)
- WASM pixel processing: **<16ms** pour preview 1440px (60fps target)
- Canvas putImageData: **<5ms** (GPU upload)
- Image data copy (CPU→WASM→CPU): **<8ms** max

### Fallback Strategy (Phase B)

Si WASM non-compilé ou dans un browser incompatible :

- Basculer automatiquement sur CSS filters (qualité dégradée mais fonctionnel)
- Avertir l'utilisateur avec une notification (`system.addLog()`)
- Log du fallback pour debugging (`[WARN] WASM unavailable, using CSS filters fallback`)
- Toggle manuel dans settings futur (no regression)

### Snapshot Building (via Event Sourcing)

L'editStore lira les events via Event Sourcing et les rejouerait pour chaque rendu. Les snapshots (4.1) seront re-utilisés ici pour perf :

1. Load snapshot (last N events)
2. Replay remaining events
3. Convert to filters (CSS or WASM)
4. Render

### Memory Management (WASM)

- Image data buffer : alloué une seule fois au init
- Reuse buffer across frames (per-image cache LRU)
- No permanent allocations in pixel loop
- Test : 100 successive renderings = no memory growth

## Prochaine Phase

Phase 4.3 — Historique & Snapshots UI (connexion du Develop Panel à PreviewRenderer)
