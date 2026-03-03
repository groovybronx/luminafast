# MAINTENANCE — Phase 4.2-B WASM Implementation (Complete)

> **Statut** : 🔄 **En cours**
> **Durée estimée** : 2-3 jours (B.1 + B.2 + B.3)
> **Dates** : Démarrage 2026-03-03

## Objectif

Terminer l'implémentation Phase B du pipeline de rendu images en intégrant le module WASM existant avec les filtres pixel réel (courbes, balance des blancs, clarté, vignetage) et l'appliquer aux previews en temps réel via HTML5 Canvas.

## Périmètre

### ✅ Inclus dans cette maintenance

#### B.1 — Vérification & Configuration WASM Build

- Compiler le module WASM avec `wasm-pack build --target web`
- Vérifier que `luminafast_wasm.js` et `luminafast_wasm_bg.wasm` sont produits dans `/src/wasm/`
- Tester l'import dynamique dans `wasmRenderingService.ts`
- Configurer Vite pour servir les fichiers `.wasm` (asset handling)
- Créer test unitaire pour `loadWasmModule()` et vérifier le chargement réussit

#### B.2 — Intégration PreviewRenderer + Canvas Rendering

- Modifier `PreviewRenderer.tsx` pour :
  - Accepter `useWasm={true}` (toggle WASM vs CSS fallback)
  - Créer un `<canvas>` élément en plus de `<img>` pour WASM rendering
  - Au chargement : appeler `wasmRenderingService.renderWithWasm()` si `useWasm=true`
  - Afficher le canvas au lieu de l'image si WASM available
  - Fallback gracieux sur CSS filters si WASM indisponible
- Tester que les conteneurs lazy-loaded images utilisent `useWasm={true}` par défaut
- Tests unitaires : PreviewRenderer avec/sans WASM support

#### B.3 — Validation Performance & Tests

- Tests d'intégration : EDIT slider → WASM apply → Canvas display (4 filtres minimum)
- Benchmark latence : confirmer <16ms par frame (60fps) sur preview 1440x size
- Tests de non-régression CSS Phase A : assurer fallback fonctionne si WASM non-disponible
- Tests edge cases : résolution image extrême (4K+), buffer memory limits

### ❌ Exclus intentionnellement

- Optimisation SIMD avancée (reporter à 6.4)
- GPU rendering via WebGL (reporter à phase 6+)
- Traitement RAW natif (rester sur previews Standard)
- Cache de rendus pré-calculés (reporter à 6.1)

## Dépendances

### Phases

- Phase 4.1 ✅ (Event Sourcing Engine)
- Phase 4.2-A ✅ (CSS Filters + Event Sourcing interactif)

### Ressources Externes

- `wasm-pack` crate pour build WASM
- `image` crate Rust (déjà dans Cargo.toml)
- `wasm-bindgen` (déjà dans Cargo.toml)

## Fichiers

### À créer

- `src/components/library/__tests__/PreviewRenderer.wasm.test.tsx` — Tests WASM integration

### À modifier

- `src-tauri/Cargo.toml` — Vérifier `[dependencies]` inclut `wasm-bindgen` feature
- `src-tauri/build.rs` — Ajouter logique compilation WASM (si absent)
- `Vite.config.ts` — Configurer asset handling pour `.wasm` files
- `src/components/library/PreviewRenderer.tsx` — Ajouter canvas + WASM call
- `src/services/wasmRenderingService.ts` — Vérifier complétude + tests
- `Docs/APP_DOCUMENTATION.md` — Mettre à jour section "Système de Rendu"

## Interfaces Publiques

### Existantes (Rust services/image_processing.rs)

```rust
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
    filters: &PixelFilters,
) -> Result<Vec<u8>, ProcessingError>;
```

### Existantes (TypeScript wasmRenderingService.ts)

```typescript
export async function loadWasmModule(): Promise<void>;
export function hasWasmSupport(): boolean;
export async function renderWithWasm(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  filters: PixelFilterState,
): Promise<void>;
```

### À créer/modifier (PreviewRenderer)

```typescript
export interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean; // Toggle WASM vs CSS (default: true)
}
```

## Critères de Validation

### B.1 — WASM Build & Configuration

- [ ] `wasm-pack build --target web` compiles sans erreurs
- [ ] Fichiers `luminafast_wasm.js` et `luminafast_wasm_bg.wasm` existent dans `/src/wasm/`
- [ ] `loadWasmModule()` retourne sans erreur en développement
- [ ] Unit test : `test_load_wasm_module` ✅ PASS
- [ ] Vite asset handling configured pour `.wasm`
- [ ] `tsc --noEmit` : 0 erreurs

### B.2 — PreviewRenderer Integration

- [ ] `PreviewRenderer.tsx` a un `<canvas>` élément
- [ ] `useWasm={true}` par défaut dans les images lazy-loaded
- [ ] Appelle `wasmRenderingService.renderWithWasm()` si `useWasm=true` et WASM available
- [ ] Fallback gracieux à CSS filters si WASM non-disponible
- [ ] Canvas affiche les filtres pixel (au moins exposure + contrast + saturation)
- [ ] Unit tests PreviewRenderer WASM : 3+ test cases ✅
- [ ] Intégration test : EDIT slider → WASM apply → visual change ✅

### B.3 — Performance & Non-Régression

- [ ] Latence WASM <16ms/frame sur preview 1440px (60fps benchmark)
- [ ] Fallback CSS : 100% des tests Phase A continuent à passer
- [ ] Edge cases :
  - [ ] 4K+ images handled correctly
  - [ ] Invalid pixel buffers rejected
  - [ ] Memory cleanup on unmount
- [ ] Tests codebase : 567+ (all phases) ✅

## Architecture Cible

### Flux de Rendu avec WASM (Phase B)

```
User Change EDIT slider
  ↓
DevelopSliders.tsx → onDispatchEvent('EDIT')
  ↓
App.tsx dispatchEvent()
  ↓
CatalogService.appendEvent() [Tauri] ✅ Phase 4.2-A
  ↓
EditStore notified
  ↓
PreviewRenderer subscription triggered
  ↓
IF useWasm=true AND hasWasmSupport():
    ↓
    loadImage → canvas
    ↓
    wasmRenderingService.renderWithWasm()
      ↓
      WASM apply_filters_wasm()
      ↓
      ImageData pixels processed
    ↓
    ctx.putImageData() on canvas
    ↓
    Display canvas (WASM-filtered image)
ELSE:
    ↓
    applyCSSFilters() [FallBack]
    ↓
    Display <img> with CSS style
```

## Tâches par Sous-Phase

### Sous-Phase B.1 — WASM Build Configuration (0.5 jour)

**Entrée** : Phase 4.2-A terminée (tests renderingService passent ✅)
**Sortie** : WASM compilé, module chargeable en développement

1. Lancer `wasm-pack build --target web` dans `/src-tauri/`
   - Vérifier zéro erreurs Rust
   - Vérifier zéro warnings Clippy
2. Vérifier les outputs dans `/src/wasm/`:
   - `luminafast_wasm.js`
   - `luminafast_wasm_bg.wasm`
   - `luminafast_wasm.d.ts`
3. Configurer Vite pour servir `.wasm` comme assets (vite.config.ts)
4. Écrire test unitaire pour `loadWasmModule()`
5. Tester en DEV : `npm run dev` + check console pour "[WASM] Module chargé"

**Validation** :

- `npm test wasmRenderingService` → test_load_wasm_module ✅
- Zéro erreurs TypeScript

---

### Sous-Phase B.2 — PreviewRenderer Canvas + WASM Integration (1.5 jour)

**Entrée** : B.1 réussie, WASM chargeable
**Sortie** : PreviewRenderer peut afficher via canvas + WASM filters

1. Modifier `PreviewRenderer.tsx` :
   - Ajouter état local `canvasRef` pour élément `<canvas>`
   - Modifier `useEffect` loadFilters pour :
     - SI `useWasm=true` ET `hasWasmSupport()` :
       - Charger image dans canvas
       - Appeler `wasmRenderingService.renderWithWasm(canvas, previewUrl, filters)`
       - Afficher canvas
     - SINON :
       - Appliquer CSS filters comme avant
       - Afficher `<img>`

2. Écrire tests unitaires (3+ test cases) :
   - test_wasm_rendering_when_available
   - test_fallback_to_css_when_wasm_unavailable
   - test_canvas_displays_correctly

3. Intégration test (prévoir mocking Tauri) :
   - Vérifier EDIT slider → canvas update

**Validation** :

- `npm test -- PreviewRenderer.wasm.test.tsx` → 3+ tests ✅
- Aucune régression sur tests CSS Phase A
- `tsc --noEmit` : 0 erreurs

---

### Sous-Phase B.3 — Performance & Final Validation (1 jour)

**Entrée** : B.2 réussie
**Sortie** : Phase 4.2-B entièrement conforme

1. Benchmark performance :
   - Mesurer latence WASM sur preview 1440px (target <16ms/frame)
   - Mesurer CSS fallback latence (should be <5ms)

2. Tests de non-régression :
   - Lancer `npm test -- --run` : 567/567 tests ✅
   - Lancer `cargo test --release` : x/x tests ✅

3. Tests edge cases :
   - 4K+ images (8000x6000+)
   - Invalid pixel buffers
   - Memory cleanup on unmount

4. Mettre à jour documentation :
   - `APP_DOCUMENTATION.md` section "Système de Rendu"
   - Documenter fallback behavior
   - Ajouter benchmark results

**Validation** :

- Latence <16ms ✅
- 567/567 tests passent ✅
- APP_DOCUMENTATION synchronized ✅

## Notes Techniques

### WASM Compilation

```bash
cd src-tauri
wasm-pack build --target web --release
# Outputs:
# - src/wasm/luminafast_wasm.js (ES module wrapper)
# - src/wasm/luminafast_wasm_bg.wasm (binary module)
# - src/wasm/luminafast_wasm.d.ts (TypeScript definitions)
```

### Vite Configuration (vite.config.ts)

```typescript
// Ensure .wasm files are handled as assets
export default {
  ...
  assetsInclude: ['**/*.wasm'],
  ...
}
```

### WASM Module Lifecycle

```typescript
// Before use: must load module
await loadWasmModule();

// Check availability
if (hasWasmSupport()) {
  // WASM available, can use renderWithWasm()
  await renderWithWasm(canvas, imageUrl, filters);
} else {
  // Fallback to CSS
  applyCSSFilters(imgElement, filters);
}
```

## Dépendances Bloquantes

- ✅ Phase 4.1 (Event Sourcing)
- ✅ Phase 4.2-A (CSS Filters + Persistence)

## Successeurs

- Phase 4.3 (Historique & Snapshots)
- Phase 5.1 (Panneau EXIF)
- Phase 6.1 (Cache Pixel)

---

**Brief créé par** : Master-Validator Agent
**Date** : 2026-03-03
**Type** : Maintenance — Complete Phase 4.2-B WASM Implementation
