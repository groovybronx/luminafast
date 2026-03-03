# WASM Integration Audit — LuminaFast Phase 4.2

**Date** : 2026-03-03
**Objectif** : Analyser l'état réel de l'intégration WASM et identifier les blocages avant continuation

---

## 1. État Global Résumé

| Aspect                                           | État      | Statut      | Impact                                    |
| ------------------------------------------------ | --------- | ----------- | ----------------------------------------- |
| **Crate WASM (luminafast-wasm)**                 | Existe    | ✅ Compilé  | Produit fichiers JS/TS/WASM corrects      |
| **Fichiers compilés (src/wasm/)**                | Existe    | ✅ Présents | À jour (Feb 28 03:58)                     |
| **Service TypeScript (wasmRenderingService.ts)** | Existe    | ✅ Complet  | 289 LOC, tests inclus, jamais appelé      |
| **Composant React (PreviewRenderer.tsx)**        | Existe    | ✅ Complet  | 152 LOC, prop useWasm ignorée             |
| **Intégration complète**                         | Existence | ❌ BRISÉE   | Récepteurs jamais connectés aux émetteurs |
| **Code mort (src-tauri/src/wasm/)**              | Existe    | 🔴 MORT     | 3 fichiers inutilisés, jamais importés    |
| **Code mort (src-tauri/lib-wasm.rs)**            | Existe    | 🔴 MORT     | Résidu d'ancienne tentative               |
| **Code ambigu (src-tauri/wasm-lib/)**            | Existe    | 🟡 UNKN     | Créé session précédente, non intégré      |

---

## état Détaillé par Catégorie

### A. WASM Production (✅ Existe et Fonctionne)

#### 1. **Crate `/luminafast-wasm/`** (FONCTIONNEL)

**Structure** :

```
luminafast-wasm/
├── Cargo.toml — Config wasm-pack, dépendances minimales
├── src/
│   ├── lib.rs — Wrapper wasm-bindgen (PixelFiltersWasm class)
│   └── image_processing.rs — 408 LOC, 9 filtres complets
├── pkg/ — Artefacts compilés (généré par wasm-pack)
└── target/ — Cache Rust build
```

**Analyse** :

✅ **Code qualité** :

- Excellent: RGB→HSL→RGB color space conversions
- Exposure: 2^exposure multiplication
- Saturation: Modification S dans l'espace HSL (réaliste)
- Highlights/Shadows: Courbes par luminance (> 0.5 / < 0.5)
- Clarity, Vibrance, ColorTemp, Tint: tous implémentés
- Tests Rust: 3 unit tests présents

✅ **Compilation** :

- Cargo.toml: `crate-type = ["cdylib"]` correct
- Config wasm-opt optimale: bulk-memory, nontrapping-float, sign-ext, SIMD
- Dernière compilation: 28 Feb 03:58

✅ **Dépendances** :

- `serde` (v1.0) avec derive
- `wasm-bindgen` (v0.2)
- `web-sys` (v0.3) avec ImageData, Canvas, CanvasRenderingContext2d
- `js-sys` (v0.3)
- ⚠️ ZÉRO dépendances problématiques (pas de uuid)

#### 2. **Fichiers Compilés: `/src/wasm/`** (✅ PRÉSENTS)

```
src/wasm/
├── luminafast_wasm.js (11 KB) — ES Module wrapper généré
├── luminafast_wasm.d.ts (3.6 KB) — Types TypeScript
├── luminafast_wasm_bg.wasm (19 KB) — Binaire WebAssembly
├── luminafast_wasm_bg.wasm.d.ts — Types binaires
└── package.json — Metadata npm
```

**Dates** :

- `.wasm` (binaire): Feb 26 02:03
- `.js` wrapper: Feb 28 03:58 (récent)

**Fonctionnalité TypeScript** :

```typescript
// Classe générée par wasm-bindgen
class PixelFiltersWasm {
  constructor(
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
  apply_filters(pixels: Uint8Array, width: number, height: number): Uint8Array;
}
```

✅ **Les fichiers sont corrects et compilés**

---

### B. Intégration TypeScript (✅ Existe, ❌ Inutilisée)

#### 1. **Service wasmRenderingService.ts** (289 LOC)

**Fonctions exportées** :

- `loadWasmModule()` — Import dynamique + initialisation
- `hasWasmSupport()` — Vérif si WASM chargé
- `renderWithWasm()` — Canvas + pixel processing (JAMAIS APPELÉ)
- `supportsWebAssembly()` — Détecte support navigateur
- `measureWasmLatency()` — Benchmark
- `resetWasmModule()` — Pour tests

**État du code** :
✅ Bien écrit, pas d'erreurs TypeScript
❌ Jamais appelé depuis aucun composant
❌ loadWasmModule() jamais exécutée

**Problème clé** :

```typescript
// Ligne 111-120: La signature est correcte...
export async function renderWithWasm(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  _filters: PixelFilterState,
  width: number,
  height: number,
): Promise<void> {
  // Mais cette fonction n'est jamais appelée!
}
```

#### 2. **Tests wasmRenderingService.test.ts** (5 test suites)

✅ Structure correcte :

- Test loadWasmModule gracefully
- Test hasWasmSupport states
- Test renderWithWasm fallback
- Canvas context handling
- Filter state propagation
- Performance benchmarking

❌ Tests ne s'exécutent jamais (mock de WASM non-chargé)

**Verdict** : Code de haute qualité, jamais invoqué.

---

### C. Composant React PreviewRenderer.tsx (152 LOC)

**Signature** :

```typescript
interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean; // ← Phase B toggle (JAMAIS UTILISÉ)
}
```

**Implémentation actuellement** :

1. Charge les événements via `CatalogService.getEditEvents(imageId)`
2. Convertit en `CSSFilterState` via `eventsToCSSFilters(events)`
3. Applique les CSS au `<img>` via `applyCSSFilters(imgRef.current, filters)`
4. ✅ Phase A fonctionne entièrement

**Problème Phase B** :

```typescript
export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  imageId,
  previewUrl,
  className = '',
  isSelected = false,
  useWasm: _useWasm = false,  // ← Renommé avec underscore = "ignoré volontairement"
}) => {
  // Ligne 43: useWasm argument est DÉSACTIVÉ intentionnellement
  // Pas de code pour:
  // - Créer <canvas>
  // - Appeler wasmRenderingService.loadWasmModule()
  // - Appeler wasmRenderingService.renderWithWasm()
```

**Où useWasm est appelé** :

- `DevelopView.tsx` (ligne 27 & 48) : **jamais passé** → défaut à undefined/false
- `LazyLoadedImageCard.tsx` (ligne 116) : **jamais passé** → défaut à undefined/false

**Verdict** : Composant Phase A 100% fonctionnel. Phase B not started (intentionallement).

---

### D. Code Mort / Abandonné

#### 1. **src-tauri/src/wasm/ Directory** (🔴 MORT)

```
src-tauri/src/wasm/
├── mod.rs — Organiseur (5 LOC)
├── image_processor.rs — Tentative WASM interface (136 LOC)
└── utils.rs — Utilities (tests 2 suites)
```

**Analyse** :

- ❌ Module n'est **jamais importé** dans `src-tauri/src/lib.rs`
- ❌ Pas de `mod wasm;` dans lib.rs
- ❌ Fichiers existent mais inutilisés
- Contenu: Duplication partielle d'image_processing algos

**Preuve** :

```rust
// src-tauri/src/lib.rs
mod commands;
mod database;
mod models;
pub mod services;
// ← NO "mod wasm;" here!
```

**Verdict** : Code mort à supprimer.

#### 2. **src-tauri/src/lib-wasm.rs** (🔴 MORT)

- 92 LOC
- Tentative d'avoir deux entry points: `lib.rs` + `lib-wasm.rs`
- ❌ Jamais compilé (seul lib.rs est considéré par Cargo)
- ❌ Résidu de stratégie ancienne

**Verdict** : Code mort à supprimer.

#### 3. **src-tauri/wasm-lib/** (🟡 AMBIGÜ)

```
src-tauri/wasm-lib/
├── Cargo.toml — Config cdylib simple
└── src/lib.rs — Pixel processing module ~300 LOC
```

**Contexte** :

- Créé dans session précédente pour "éviter uuid dependency issues"
- Idée: isolated WASM project dans src-tauri/, non dans workspace root
- ❌ Projet `luminafast-wasm` existe déjà à la racine
- ❌ Duplication de code (image_processing exists 2x)
- ❌ Non intégré au build
- ❌ Tentative de compilation échouée (uuid issue non résolu)

**Verdict** : Duplication non-nécessaire. Doit être consolidé avec `/luminafast-wasm/`.

---

### E. Dépendances et Configuration Build

#### Vite Config (vite.config.ts)

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ✅ Pas de config nécessaire pour .wasm
  // vite traite les imports dynamiques automatiquement
});
```

**État** :
✅ Vite 5+ support automatique pour wasm-bindgen
✅ Import dynamique `import('@/wasm/...')` fonctionne
✅ Pas de modification requise

#### build.rs (Tauri)

```rust
// src-tauri/build.rs
fn main() {
    if std::env::var("PROFILE").unwrap_or_default() == "release" {
        println!("cargo:warning=Building WASM module for production...");
        // wasm-pack build commande lancée ici
    }
    tauri_build::build()
}
```

**État** :
✅ Essaye de compiler WASM en release mode
✅ May produire outputs mais lecture depuis wrong directory?

**Problème potentiel** :

- build.rs cherche à compiler `/luminafast-wasm/` via `wasm-pack build`
- Sortie attendue: `luminafast-wasm/pkg/`
- Mais `/src/wasm/` apparaît contenir les fichiers (copy fait ?)

---

### F. Flux d'Exécution (ce qui MANQUE)

#### Ce qui fonctionne:

```
Image Slider (DevelopSliders.tsx)
    ↓ (onValueChange)
App.tsx:217 (// Phase 4.2-2: Update editStore)
    ↓ (editStore.appendEdit())
EditStore (Zustand)
    ↓
PreviewRenderer (subscription via editEventsForImage)
    ↓
renderingService.eventsToCSSFilters()
    ↓
applyCSSFilters() → <img style="filter: brightness(...)">
    ✅ Rendu visible
```

#### Ce qui NE fonctionne PAS (Phase B):

```
WASM Module
    × (jamais loadWasmModule() appelée)
PixelFiltersWasm class
    × (jamais instanciée)
renderWithWasm()
    × (jamais appelée)
Canvas
    × (jamais créé dans PreviewRenderer)
Pixel buffer
    × (jamais alloué/traité)
```

**Raison** : useWasm prop jamais passé à true, donc aucun code WASM n'exécute.

---

## 2. Problèmes Identifiés (Classés par Criticité)

### 🔴 CRITIQUE (Bloque Phase B)

#### Problème C1: Flux WASM jamais invoqué

**Description** : Module WASM complet + service TypeScript existent, mais aucun composant n'appelle WASM.

**Evidence** :

- PreviewRenderer.tsx reçoit `useWasm: _useWasm = false`
- DevelopView.tsx jamais passe useWasm=true
- LazyLoadedImageCard.tsx jamais passe useWasm=true
- wasmRenderingService.renderWithWasm() jamais appelée depuis nulle part

**Impact** : Phase B code dead, WASM jamais s'exécute

**Solution** :

1. Modifier PreviewRenderer pour créer `<canvas>` si useWasm=true
2. Passer useWasm=true depuis parents appropriés
3. Appeler wasmRenderingService.renderWithWasm() quand canvas prêt

**Fichiers affectés** :

- src/components/library/PreviewRenderer.tsx (modifier)
- src/components/develop/DevelopView.tsx (modifier)
- src/components/library/LazyLoadedImageCard.tsx (modifier)

---

#### Problème C2: src-tauri/wasm-lib/ crée duplication inutile

**Description** : Session précédente a créé `/src-tauri/wasm-lib/` comme "isolated WASM project", mais `/luminafast-wasm/` existe déjà.

**Issue** :

- Deux projets WASM distincts
- Code dupliqué: image_processing logic
- wasm-lib jamais intégré à build
- Confusion sur quelle crate utiliser

**Impact** : Maintenance complexité, confusion architecturale

**Solution** : Supprimer src-tauri/wasm-lib/, utiliser luminafast-wasm/ uniquement

---

### 🟠 MAJEUR (Nuirait à production)

#### Problème M1: Code Mort Non-Supprimé

**Description** : Trois fichiers/modules Rust existent mais ne sont jamais compilés/utilisés.

**Inventaire** :

1. `/src-tauri/src/wasm/` (3 fichiers)
   - mod.rs
   - image_processor.rs (136 LOC)
   - utils.rs
2. `/src-tauri/src/lib-wasm.rs` (92 LOC)

**Impact** :

- Confusion pour futurs contributeurs
- Maintenance technique
- Possible régression si quelqu'un les utilise accidentellement

**Solution** : Supprimer files/directories

---

#### Problème M2: Vite/Build Config incomplet

**Description** : Pas de configuration explicite dans vite.config.ts pour servir les fichiers WASM.

**Risque** :

- Import dynamique `import('@/wasm/luminafast_wasm.js')` peut échouer au runtime
- Vite 5+ traite .wasm automatiquement, mais pas garanti

**Solution** : Ajouter configuration expilicit pour wasm assets dans vite.config.ts

---

### 🟡 MINEUR (Incohérence documentaire/style)

#### Problème m1: Prop useWasm Ignorée Convention

**Description** : PreviewRenderer reçoit useWasm mais le renomme en `_useWasm` (underscore convention pour "unused").

**Code** :

```typescript
useWasm: _useWasm = false,  // Phase B will use this
```

**Style** : Inhabituel pour React props (confus pour lecteurs)

**Solution** : Renommer en `useWasm`, implémenter logique conditionnelle appropriée

---

#### Problème m2: Comments Non-Actualisés

**Description** : Commentaires disent "Phase B will use this" mais Phase B n'est pas implémentée.

**Exemples** :

- PreviewRenderer.tsx ligne 18
- PreviewRenderer.tsx ligne 38

**Solution** : Actualiser comments selon implementation réelle

---

## 3. Diagramme de l'État Actuel

```
┌─────────────────────────────────────────────────────────────────┐
│                   INTÉGRATION WASM STATE DIAGRAM               │
└─────────────────────────────────────────────────────────────────┘

Données Edge:
┌──────────────────┐
│  Edit Events     │
│  (EditStore)     │
└────────┬─────────┘
         │
         ├─→ renderingService ──→ CSSFilterState ──→ <img style="filter">
         │   (eventsToCSSFilters)     ↓ (applyCSSFilters)  ✅ WORKS
         │
         └─→ [BLOCKED] Should also flow to:
             wasmRenderingService
                ├─ loadWasmModule()       [NOT CALLED]
                ├─ renderWithWasm()       [NOT CALLED]
                └─ Canvas + PixelFilters  [NOT CREATED]

                     ↓ (if implemented)
                WASM Module (luminafast-wasm)
                ├─ PixelFiltersWasm       [EXISTS, UNUSED]
                ├─ apply_filters()        [EXISTS, UNUSED]
                └─ Pixel Processing Logic [EXISTS, UNUSED]
                     ↓ (would produce)
                HTML Canvas Buffer        [NOT RENDERED]

Code Organization:
┌──────────────────────────┐
│ luminafast-wasm/         │ ✅ Complet
├─ Cargo.toml             │
├─ src/lib.rs             │ ✅ Wrapper WASM
├─ src/image_processing   │ ✅ 9 filtres
└─ pkg/                   │ ✅ Compilé
└─ luminafast_wasm.js     │ ✅ ES Module
   luminafast_wasm.wasm   │ ✅ Binaire
   luminafast_wasm.d.ts   │ ✅ Types TS

DEAD CODE:
├─ src-tauri/src/wasm/    │ 🔴 Jamais importée
│  ├─ image_processor.rs  │
│  └─ utils.rs            │
├─ src-tauri/src/lib-wasm.rs │ 🔴 Jamais compilé
└─ src-tauri/wasm-lib/    │ 🟡 Dupplique luminafast-wasm

React Components:
├─ PreviewRenderer.tsx    │ ✅ Existe, useWasm ignored
├─ DevelopView.tsx        │ ✅ Existe, nunca passe useWasm
└─ LazyLoadedImageCard    │ ✅ Existe, nunca passe useWasm

Services:
├─ renderingService.ts    │ ✅ CSS Phase works
└─ wasmRenderingService   │ ✅ Exists, never called
```

---

## 4. Plan de Correction — Recommandations

### Phase 1️⃣ : Cleanup & Simplification (30 min)

**Objectif** : Supprimer code mort, éviter confusion

**Actions** :

1. **Supprimer src-tauri/src/wasm/** entièrement

   ```bash
   rm -rf src-tauri/src/wasm/
   ```

2. **Supprimer src-tauri/src/lib-wasm.rs**

   ```bash
   rm src-tauri/src/lib-wasm.rs
   ```

3. **Supprimer src-tauri/wasm-lib/** (ou le fusionner avec luminafast-wasm si contient du code unique)

   ```bash
   rm -rf src-tauri/wasm-lib/
   ```

4. **Verifier** : Aucune référence à ces modules
   ```bash
   grep -r "mod wasm" src-tauri/src/
   grep -r "lib-wasm" . --include="*.rs"
   ```

**Tests** : Tous les tests doivent toujours passer

---

### Phase 2️⃣ : Intégration PreviewRenderer → WASM (2-3 heures)

**Objectif** : Connecter le flux React → WASM

**Actions** :

1. **Modifier PreviewRenderer.tsx** pour implémenter Phase B:
   - Créer `<canvas>` ref quand `useWasm=true`
   - Appeler `loadWasmModule()` au mount
   - Appeler `renderWithWasm()` quand events changent
   - Fallback à CSS si WASM non-disponible

2. **Modifier DevelopView.tsx** :
   - Passer `useWasm={true}` aux deux PreviewRenderer

3. **Modifier LazyLoadedImageCard.tsx** :
   - Passer `useWasm={true}` au PreviewRenderer

4. **Vérifier flow complète** :
   Edit Slider → EditStore → PreviewRenderer → wasmRenderingService → Canvas

**Tests** : Écrire tests d'intégration PreviewRenderer + WASM

---

### Phase 3️⃣ : Vérification & Benchmarking (1-2 heures)

**Objectif** : Valider la performance <16ms/frame

**Actions** :

1. **Vérifier** wasmRenderingService.measureWasmLatency
2. **Benchmark** sur preview 1440px
3. **Documenter** résultats dans APP_DOCUMENTATION.md

**Tests** : Performance tests

---

### Phase 4️⃣ : Documentation & CHANGELOG (30 min)

**Actions** :

1. Mettre à jour `Docs/APP_DOCUMENTATION.md` Section 18 (Système de Rendu)
2. Ajouter entrée `Docs/CHANGELOG.md` pour Phase 4.2

**Tests** : Cohérence documentation ↔ code

---

## 5. Ordre d'Exécution Recommandé

```
┌─ Phase 1: Cleanup ────────────────────────────────────────────────────┐
│  1. Supprimer src-tauri/src/wasm/                                     │
│  2. Supprimer src-tauri/src/lib-wasm.rs                               │
│  3. Supprimer src-tauri/wasm-lib/ (ou fusionner si code unique)       │
│  Tests: npm test → 567/567 PASS (no regressions)                      │
└────────────────────────────────────────────────────────────────────────┘
                            ↓
┌─ Phase 2: Integration ────────────────────────────────────────────────┐
│  1. PreviewRenderer.tsx:                                              │
│     - Ajouter useWasm implementation (canvas creation)                │
│     - loadWasmModule() call                                           │
│     - renderWithWasm() call when filters change                       │
│     - Fallback logic                                                  │
│  2. DevelopView.tsx: passer useWasm={true}                            │
│  3. LazyLoadedImageCard.tsx: passer useWasm={true}                    │
│  Tests: npm test + visual inspection                                  │
└────────────────────────────────────────────────────────────────────────┘
                            ↓
┌─ Phase 3: Perf Check ─────────────────────────────────────────────────┐
│  1. measureWasmLatency() test                                          │
│  2. Benchmark 1440px preview                                          │
│  3. Verify <16ms/frame                                                │
│  Tests: Custom performance test                                       │
└────────────────────────────────────────────────────────────────────────┘
                            ↓
┌─ Phase 4: Docs & Commit ──────────────────────────────────────────────┐
│  1. Update APP_DOCUMENTATION.md                                       │
│  2. Update CHANGELOG.md with Phase 4.2 completion                     │
│  3. Final test: npm test → 567/567 PASS                               │
│  4. Commit with detailed message                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Validation Checklist (Avant Merge)

- [ ] Tous les tests passent: `npm test` → 567/567 ✅
- [ ] Type checking: `tsc --noEmit` → 0 errors ✅
- [ ] Code dead supprimé: Gresp wasm/ → no results ✅
- [ ] PreviewRenderer Phase B implémenté ✅
- [ ] DevelopView utilise useWasm=true ✅
- [ ] LazyLoadedImageCard utilise useWasm=true ✅
- [ ] measureWasmLatency < 16ms/frame ✅
- [ ] Fallback CSS works if WASM unavailable ✅
- [ ] APP_DOCUMENTATION.md updated ✅
- [ ] CHANGELOG.md updated ✅

---

## 7. Fichiers à Créer/Modifier

### À Supprimer

- `src-tauri/src/wasm/` (entire directory)
- `src-tauri/src/lib-wasm.rs`
- `src-tauri/wasm-lib/` (entire directory)

### À Modifier

- `src/components/library/PreviewRenderer.tsx` — Implémenter Phase B
- `src/components/develop/DevelopView.tsx` — Passer useWasm=true
- `src/components/library/LazyLoadedImageCard.tsx` — Pass useWasm=true
- `Docs/APP_DOCUMENTATION.md` — Section 18 actualiser
- `Docs/CHANGELOG.md` — Ajouter Phase 4.2 completion entry

### Aucun nouveau fichier requis

(Tous les fichiers WASM nécessaires existent déjà et fonctionnent)

---

## 8. Estimation

| Phase     | Activité                  | Temps  | Total      |
| --------- | ------------------------- | ------ | ---------- |
| 1         | Cleanup                   | 30 min | **30 min** |
| 2         | PreviewRenderer impl      | 1.5 h  | **2 h**    |
| 2         | Modify DevelopView + Card | 30 min |            |
| 3         | Perf testing              | 1 h    | **1 h**    |
| 4         | Docs + Commit             | 30 min | **30 min** |
| **TOTAL** |                           |        | **4 h**    |

---

## Conclusion

**État actuel** : Phase 4.2 est 70% implémentée (Phase A fonctionnelle, Phase B code written mais non-connecté).

**Blocages** : Aucun blocage technique. Le code WASM existe et fonctionne, il n'est jamais invoqué.

**Solution** : Connexion du flux React → WASM sans modification du code Rust/WASM.

**Risque** : Faible (code mort à supprimer, pas de changements complexes).

**Prochaine étape** : Approuver ce plan et démarrer Phase 1 (Cleanup).
