# LuminaFast WASM Module

**Crate séparée pour compilation WebAssembly du moteur de traitement d'images pixel.**

## Raison d'Être

Cette crate est **intentionnellement séparée** de `src-tauri/` pour éviter les conflits de dépendances entre :

- Desktop targets (`x86_64-apple-darwin`, `x86_64-pc-windows-msvc`) → utilisent `uuid`, `tauri`, `rusqlite`
- WASM target (`wasm32-unknown-unknown`) → zéro dépendances desktop, seulement `wasm-bindgen`

## Contenu

- `src/lib.rs` : Wrapper wasm-bindgen exposant `PixelFiltersWasm` class
- `src/image_processing.rs` : Copie du module `src-tauri/src/services/image_processing.rs`

## Compilation

```bash
# Depuis la racine du projet
./scripts/build-wasm.sh

# Ou manuellement depuis luminafast-wasm/
wasm-pack build --target web --release
```

### Configuration wasm-opt

Le fichier `Cargo.toml` configure automatiquement wasm-opt avec les flags modern features WASM :

- `--enable-bulk-memory` : Operations mémoire efficaces (memory.copy)
- `--enable-nontrapping-float-to-int` : Conversions float→int saturées
- `--enable-sign-ext` : Extension de signe
- `--enable-simd` : Operations SIMD

## Output

Après compilation, les fichiers générés dans `pkg/` sont copiés vers `src/wasm/` :

```
src/wasm/
├── luminafast_wasm_bg.wasm   (19KB) — Module WASM optimisé
├── luminafast_wasm.js         (11KB) — Wrapper wasm-bindgen ES module
├── luminafast_wasm.d.ts       (3.6KB) — Type definitions TypeScript
└── luminafast_wasm_bg.wasm.d.ts
```

## Usage (Frontend)

Le module est importé dynamiquement par `src/services/wasmRenderingService.ts` :

```typescript
// Chargement automatique
await loadWasmModule();

// Utilisation
const filters = new PixelFiltersWasm(
  exposure,
  contrast,
  saturation,
  highlights,
  shadows,
  clarity,
  vibrance,
  colorTemp,
  tint,
);
const processed = filters.apply_filters(pixels, width, height);
```

## Tests

Les tests sont dans `src-tauri/src/services/image_processing.rs` (5 tests unitaires).
Le wrapper TypeScript est testé dans `src/services/__tests__/wasmRenderingService.test.ts` (18 tests).

## Maintenance

⚠️ **Ce module est une COPIE du code `src-tauri/src/services/image_processing.rs`**.
Toute modification des algorithmes pixel doit être **synchronisée manuellement** dans les deux endroits :

1. `src-tauri/src/services/image_processing.rs` (source de vérité, tests)
2. `luminafast-wasm/src/image_processing.rs` (copie WASM)

## CI/CD

Le module WASM doit être recompilé avant chaque build de production :

```bash
npm run build:wasm  # Alias pour ./scripts/build-wasm.sh
npm run build       # Build Vite frontend (inclut src/wasm/)
```
