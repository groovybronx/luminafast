# LuminaFast — Documentation de l'Application

> **Ce document est la source de vérité sur l'état actuel de l'application.**
> Il DOIT être mis à jour après chaque sous-phase pour rester cohérent avec le code.
>
> **Dernière mise à jour** : 2026-02-25 (Phase 4.3 : Historique & Snapshots UI) — État : Event Sourcing (4.1) + CSS Filters (4.2) + Time-Travel UI (4.3) complétés, 602/602 tests ✅. Branche `phase/4.3-historique-snapshots-ui`.
>
> ### Décisions Projet (validées par le propriétaire)
>
> - **Phase 8 (Cloud/Sync)** : Reportée post-lancement
> - **Plateforme MVP** : macOS-first (Windows/Linux secondaire)
> - **Formats RAW prioritaires** : Canon (.CR3), Fuji (.RAF), Sony (.ARW)
> - **Phase 2.2 IPTC** : Extraction reportée Phase 5.4 (Sidecar XMP) — Skeleton créé

---

## 1. Vue d'Ensemble

**LuminaFast** est une application de gestion d'actifs numériques photographiques (Digital Asset Management) inspirée de l'architecture d'Adobe Lightroom Classic, avec des optimisations modernes (DuckDB, BLAKE3, Event Sourcing).

### État actuel : Phases 0 à 4.3 complétées (Event Sourcing + CSS Filters + Time-Travel UI)

Pipeline d'import production-ready : Discovery → BLAKE3 hashing → EXIF extraction → SQLite ingestion → **Parallélisée Rayon** → **Génération previews** → Synchronisation. **Grille virtualisée avec lazy-loading** : 10K+ images @ 60fps + IntersectionObserver prefetch. **Collections CRUD** + **Smart Collections**. **Recherche structurée** (15+ champs, 8+ opérateurs). **Historique dossiers**. **SQLite bidirectional sync** avec tracking isSynced. **Event Sourcing Engine** : persistance édits en SQLite + snapshots auto (Phase 4.1). **CSS Filters Pipeline** : temps réel rendu via GPU (brightness, contrast, saturation + cache LRU intelligent, <16ms/frame) (Phase 4.2). **Time-Travel UI** : timeline interactive, snapshots nommés, restauration à tout état antérieur (Phase 4.3). **602+ tests** (0 régressions).

### Objectif : Application Tauri autonome commercialisable

Desktop natif (macOS, Windows, Linux) avec édition paramétrique non-destructive, catalogue SQLite, et gestion de bibliothèques photographiques massives.

---

## 2. Stack Technique Actuelle

| Couche              | Technologie         | Version         | Statut                      |
| ------------------- | ------------------- | --------------- | --------------------------- |
| Framework frontend  | React               | 19.2.0          | ✅ En place                 |
| Bundler             | Vite                | 7.3.1           | ✅ En place                 |
| Styling             | TailwindCSS         | 4.1.18          | ✅ En place                 |
| Icônes              | Lucide React        | 0.563.0         | ✅ En place                 |
| Langage             | TypeScript (TSX)    | strict          | ✅ Complété (Phase 0.1)     |
| Shell natif         | Tauri v2            | 2.10.2          | ✅ Complété (Phase 0.2)     |
| Backend             | Rust                | stable          | ✅ Complété (Phase 0.2)     |
| State management    | Zustand             | 5.0.11          | ✅ Complété (Phase 0.4)     |
| Linting             | ESLint + TypeScript | 9.39.1          | ✅ Complété (Phase 0.5)     |
| Tests               | Vitest + jsdom      | 4.0.18          | ✅ Complété (Phase 0.5)     |
| CI/CD               | GitHub Actions      | —               | ✅ Complété (Phase 0.5)     |
| DB transactionnelle | SQLite              | rusqlite 0.31.0 | ✅ Complété (Phase 1.1)     |
| DB analytique       | DuckDB              | —               | ⬜ Non installé (Phase 6.2) |
| Hashing             | BLAKE3              | —               | ✅ Complété (Phase 1.3)     |
| EXIF/IPTC           | kamadak-exif        | 0.6.1           | ✅ Complété (Phase 2.2)     |

---

## 3. Architecture des Fichiers (État Actuel)

```
LuminaFast/
├── AGENTS.md                       # Directives obligatoires pour agents IA
├── .github/
│   └── workflows/
│       └── ci.yml                    # Pipeline CI/CD GitHub Actions
├── .rustfmt.toml                     # Configuration Rust formatting
├── clippy.toml                       # Configuration Clippy linting
├── rust-toolchain.toml                # Configuration toolchain Rust
├── Docs/
│   ├── archives/
│   │   ├── Lightroomtechnique.md   # Analyse architecture Lightroom Classic
│   │   ├── recommendations.md      # Stack moderne recommandée
│   │   └── luminafast_developement_plan.md # Plan détaillé du projet
│   ├── briefs/                       # Briefs des phases de développement
│   │   ├── PHASE-0.1.md → PHASE-3.2.md # Briefs implémentées
│   │   └── PHASE-3.3.md → ...      # Briefs futures
│   ├── AI_INSTRUCTIONS.md          # Directives pour agents IA
│   ├── CHANGELOG.md                # Suivi d'avancement par sous-phase
│   ├── TESTING_STRATEGY.md         # Stratégie de tests (Vitest + Rust)
│   ├── GOVERNANCE.md               # Règles de gouvernance
│   └── APP_DOCUMENTATION.md        # Ce fichier
├── public/
│   └── vite.svg
├── scripts/                        # Utilitaires scripts
│   └── test-workflow.sh            # Script test workflow
├── src/
│   ├── App.tsx                     # Orchestrateur (152 lignes, pas de useState)
│   ├── main.tsx                    # Point d'entrée React
│   ├── vite-env.d.ts               # Déclarations d'environnement Vite
│   ├── index.css                   # Styles globaux + TailwindCSS
│   ├── assets/                     # Ressources statiques
│   │   └── react.svg               # Logo React
│   ├── stores/                     # Stores Zustand (state management)
│   │   ├── index.ts                # Re-export central
│   │   ├── catalogStore.ts         # Images, sélection, filtres
│   │   ├── collectionStore.ts      # Collections CRUD + collection active (Phase 3.2)
│   │   ├── uiStore.ts              # UI (vues, sidebars, modals)
│   │   ├── editStore.ts            # Événements, edits, historique
│   │   └── systemStore.ts          # Logs, import, état système
│   ├── lib/                        # Utilitaires et données mock
│   │   ├── helpers.ts              # safeID()
│   │   └── mockData.ts             # generateImages, INITIAL_IMAGES (MockEvent supprimé)
│   ├── services/                   # Services TypeScript (Phase 1.2 + 2.2 + 3.3)
│   │   ├── catalogService.ts       # Wrapper Tauri avec gestion d'erreurs collections CRUD
│   │   ├── exifService.ts           # Service EXIF/IPTC avec invoke direct
│   │   ├── discoveryService.ts     # Service discovery/ingestion
│   │   ├── filesystemService.ts     # Service système de fichiers
│   │   ├── hashingService.ts        # Service BLAKE3 hashing
│   │   ├── previewService.ts        # Service génération previews RAW + event listeners (Phase 3.3)
│   │   └── __tests__/             # Tests unitaires services
│   ├── types/                      # Types TypeScript du domaine
│   │   ├── index.ts                # Re-export central
│   │   ├── image.ts                # CatalogImage, ExifData, EditState
│   │   ├── collection.ts           # Collection, SmartQuery, CollectionType (Phase 3.2)
│   │   ├── events.ts               # CatalogEvent, EventType
│   │   ├── ui.ts                   # ActiveView, LogEntry
│   │   ├── dto.ts                  # DTOs Tauri (Phase 1.2)
│   │   ├── exif.ts                 # Types EXIF/IPTC complets (Phase 2.2)
│   │   ├── discovery.ts            # Types discovery/ingestion (Phase 2.1)
│   │   ├── filesystem.ts           # Types système de fichiers
│   │   ├── preview.ts              # Types génération previews (Phase 3.3)
│   │   ├── hashing.ts              # Types BLAKE3 hashing
│   │   └── __tests__/             # Tests types (types.test.ts, hashing.test.ts, etc.)
│   ├── components/
│   │   ├── layout/                 # Structure de la page
│   │   │   ├── TopNav.tsx          # Navigation supérieure
│   │   │   ├── LeftSidebar.tsx     # Catalogue, collections, folders
│   │   │   ├── RightSidebar.tsx    # Panneau droit (orchestrateur)
│   │   │   ├── Toolbar.tsx         # Mode, recherche, taille
│   │   │   └── Filmstrip.tsx       # Bande défilante
│   │   ├── library/                # Mode bibliothèque
│   │   │   ├── GridView.tsx        # Grille d'images virtualisée (@tanstack/react-virtual)
│   │   │   ├── ImageCard.tsx       # Carte image avec métadonnées
│   │   │   └── __tests__/         # Tests GridView et ImageCard
│   │   ├── develop/                # Mode développement
│   │   │   ├── DevelopView.tsx     # Vue développement + avant/après
│   │   │   ├── DevelopSliders.tsx  # Sliders de réglage
│   │   │   └── HistoryPanel.tsx    # Historique des events
│   │   ├── metadata/               # Métadonnées et EXIF
│   │   │   ├── Histogram.tsx       # Histogramme simulé
│   │   │   ├── ExifGrid.tsx        # Grille EXIF compacte
│   │   │   └── MetadataPanel.tsx   # Fiche technique + tags
│   │   └── shared/                 # Composants partagés
│   │       ├── GlobalStyles.tsx    # Styles CSS inline
│   │       ├── ArchitectureMonitor.tsx # Console monitoring
│   │       ├── ImportModal.tsx     # Modal d'import
│   │       ├── BatchBar.tsx        # Actions batch : pick, favoris, ajout collection (FolderPlus popover), clear
│   │       ├── KeyboardOverlay.tsx # Indicateurs raccourcis clavier
│   │       └── __tests__/         # Tests composants partagés
│   └── hooks/                       # Hooks React personnalisés
│       ├── useCatalog.ts           # Hook principal catalogue (mapping DTO→CatalogImage + EXIF)
│       ├── useDiscovery.ts         # Hook discovery/ingestion (reset() cleanup, preview séquentiel)
│       └── __tests__/             # Tests hooks (useCatalog.test.ts, useDiscovery.test.ts)
│   ├── test/                       # Infrastructure tests et mocks
│   │   ├── setup.ts                # Configuration tests globale
│   │   ├── storeUtils.ts           # Utilitaires stores tests
│   │   ├── mocks/
│   │   │   ├── tauri-api.ts        # Mock API Tauri principal
│   │   │   └── tauri-api/
│   │   │       ├── core.ts         # Mocks core Tauri
│   │   │       └── tauri.ts        # Mocks invoke Tauri
│   │   └── __tests__/             # Tests infrastructure
├── src-tauri/                         # Backend Rust Tauri
│   ├── Cargo.toml                    # Dépendances Rust (rusqlite, etc.)
│   ├── tauri.conf.json              # Configuration Tauri
│   ├── build.rs                      # Build script
│   ├── capabilities/
│   │   └── default.json            # Permissions (fs, dialog, shell)
│   ├── src/
│   │   ├── main.rs                 # Point d'entrée Rust
│   │   ├── lib.rs                  # Module library + plugins + init DB + commandes
│   │   ├── database.rs               # Gestion SQLite, migrations, PRAGMA
│   │   ├── commands/                 # Commandes Tauri CRUD (Phase 1.2 + 2.2 + 3.3)
│   │   │   ├── mod.rs               # Export et enregistrement des commandes
│   │   │   ├── catalog.rs           # 17 commandes CRUD images+collections (Phase 3.2)
│   │   │   ├── exif.rs              # Commandes EXIF/IPTC extraction (Phase 2.2)
│   │   │   ├── filesystem.rs        # Commandes système de fichiers
│   │   │   ├── discovery.rs         # Commandes ingestion + découverte (Phase 2.1)
│   │   │   ├── hashing.rs           # Commandes BLAKE3 batch
│   │   │   ├── preview.rs           # Commandes génération previews RAW (Phase 3.3)
│   │   │   ├── __tests__/preview_performance.rs # Tests de performance batch vs séquentiel (Maint. 2026-02-23)
│   │   │   ├── __tests__/preview_unit.rs        # Tests unitaires preview pyramide (Maint. 2026-02-23)
│   │   │   └── types.rs             # Types réponse partagés
│   │   ├── models/                   # Types Rust du domaine (sérializables)
│   │   │   ├── mod.rs               # Export des modèles
│   │   │   ├── catalog.rs           # Image, Folder, CollectionType (base)
│   │   │   ├── collection.rs        # Collection CRUD models (Phase 3.2)
│   │   │   ├── image.rs             # Image détails, metadata (Phase 3.3)
│   │   │   ├── event.rs             # CatalogEvent, EventType (Phase 4.3)
│   │   │   ├── exif.rs              # ExifMetadata, IptcMetadata (Phase 2.2)
│   │   │   ├── iptc.rs              # IptcMetadata détails (skeleton Phase 5.4)
│   │   │   ├── discovery.rs         # DiscoveredFile, DiscoverySession (Phase 2.1)
│   │   │   ├── filesystem.rs        # FileEvent, FileLock, WatcherConfig
│   │   │   ├── hashing.rs           # HashResult, BatchHashResult
│   │   │   ├── preview.rs           # PreviewData, PreviewFormat (Phase 3.3)
│   │   │   ├── dto.rs                # DTOs Tauri avec serde pour invoke
│   │   │   └── __tests__/           # Tests unitaires models
│   │   ├── migrations/               # Scripts de migration SQL
│   │   │   └── 001_initial.sql      # Schéma complet du catalogue
│   │   ├── services/                 # Services métier (Layer logique entre DB et commandes)
│   │   │   ├── mod.rs               # Export des services
│   │   │   ├── blake3.rs            # Service BLAKE3 hashing (Phase 1.3)
│   │   │   ├── exif.rs              # Service extraction EXIF kamadak-exif (Phase 2.2)
│   │   │   ├── iptc.rs              # Service IPTC skeleton (reporté Phase 5.4)
│   │   │   ├── discovery.rs         # Service découverte fichiers récursive
│   │   │   │   └── tests.rs         # Tests discovery
│   │   │   ├── ingestion.rs         # Service ingestion batch (discovery + hashing + EXIF)
│   │   │   │   └── tests.rs         # Tests ingestion
│   │   │   ├── filesystem.rs        # Service système de fichiers (watcher, lock)
│   │   │   ├── preview.rs           # Service génération previews RAW (Phase 3.3, batch + libvips activé).
│   │   │   └── __tests__/           # Tests integration services
│   └── icons/                      # Icônes d'application (16 fichiers)
├── index.html                      # HTML racine
├── package.json                    # Dépendances npm + scripts tauri
├── tsconfig.json                   # Config TypeScript strict
├── tsconfig.node.json              # Config TS pour vite.config.ts
├── vite.config.ts                  # Configuration Vite + TailwindCSS
├── eslint.config.js                # Configuration ESLint
└── .gitignore
```

---
## 6. Commandes Tauri (Mises à jour)

- `generate_previews_batch(images: Vec<ImageId>, config: PreviewConfig)`
  - Génère les previews pyramidales en batch (Promise.all côté frontend, batch 4 côté Rust)
  - Utilise libvips par défaut (configurable)
  - Retourne la liste des previews générées et les erreurs éventuelles

## 7. Services Frontend (Mises à jour)

- `previewService.generatePreviewsBatch(images: CatalogImage[])`
  - Appelle la commande Tauri batch, gère Promise.all côté frontend
  - Retourne les résultats de génération (succès/erreurs)

## 8. Types & Interfaces (Mises à jour)

- `PreviewConfig` (Rust/TS) : champ `use_libvips: bool` activé par défaut

## 4. Composants UI (Mockup Actuel)

Les composants ont été décomposés en Phase 0.3. Chaque composant est dans son propre fichier avec des props typées.

### 4.1 — Composants (après décomposition Phase 0.3)

| Composant             | Fichier                          | Lignes | Description                                                                                 |
| --------------------- | -------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `App`                 | `src/App.tsx`                    | 152    | Orchestrateur pur (stores Zustand, callbacks)                                               |
| `GlobalStyles`        | `shared/GlobalStyles.tsx`        | 16     | Styles CSS inline                                                                           |
| `ArchitectureMonitor` | `shared/ArchitectureMonitor.tsx` | 54     | Console monitoring système                                                                  |
| `ImportModal`         | `shared/ImportModal.tsx`         | 68     | Modal d'import avec progression                                                             |
| `BatchBar`            | `shared/BatchBar.tsx`            | —      | Actions batch : pick, favoris, ajout à une collection (popover FolderPlus), clear sélection |
| `KeyboardOverlay`     | `shared/KeyboardOverlay.tsx`     | 9      | Indicateurs raccourcis                                                                      |
| `TopNav`              | `layout/TopNav.tsx`              | 29     | Navigation supérieure                                                                       |
| `LeftSidebar`         | `layout/LeftSidebar.tsx`         | 64     | Catalogue, collections, folders                                                             |
| `RightSidebar`        | `layout/RightSidebar.tsx`        | 36     | Panneau droit (orchestrateur)                                                               |
| `Toolbar`             | `layout/Toolbar.tsx`             | 54     | Mode, recherche, taille thumbnails                                                          |
| `Filmstrip`           | `layout/Filmstrip.tsx`           | 36     | Bande défilante                                                                             |
| `GridView`            | `library/GridView.tsx`           | 46     | Grille d'images virtualisée (@tanstack/react-virtual)                                       |
| `LazyLoadedImageCard` | `library/LazyLoadedImageCard.tsx`| —      | Carte image avec lazy loading + drag source (Phase 3.2b)                                     |
| `ImageCard`           | `library/ImageCard.tsx`          | —      | Carte image avec métadonnées, sélection                                                     |
| `DevelopView`         | `develop/DevelopView.tsx`        | 38     | Image + mode avant/après                                                                    |
| `DevelopSliders`      | `develop/DevelopSliders.tsx`     | 37     | Sliders de réglage                                                                          |
| `HistoryPanel`        | `develop/HistoryPanel.tsx`       | 25     | Historique des events                                                                       |
| `Histogram`           | `metadata/Histogram.tsx`         | 18     | Histogramme simulé                                                                          |
| `ExifGrid`            | `metadata/ExifGrid.tsx`          | 17     | Grille EXIF compacte                                                                        |
| `MetadataPanel`       | `metadata/MetadataPanel.tsx`     | 76     | Fiche technique + tags                                                                      |

### 4.2 — Stores Zustand (Phase 0.4 + Maintenance Phase 3.1)

| Store             | Fichier                     | État géré                                                                    | Actions principales                                                                                               |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `catalogStore`    | `stores/catalogStore.ts`    | images[] (from SQLite), activeImageId                                        | setImages, addImages, getImages                                                                                   |
| `uiStore`         | `stores/uiStore.ts`         | **selection (Set)**, **filterText**, activeView, sidebars, thumbnailSize     | **toggleSelection, setSingleSelection, clearSelection, setFilterText**, setActiveView, toggleLeftSidebar          |
| `collectionStore` | `stores/collectionStore.ts` | collections[], activeCollectionId, activeCollectionImageIds                  | loadCollections, createCollection, deleteCollection, renameCollection, setActiveCollection, clearActiveCollection |
| `editStore`       | `stores/editStore.ts`       | eventLog[], currentEdits, historyIndex                                       | addEvent, setCurrentEdits, updateEdit, undo/redo (préparés)                                                       |
| `systemStore`     | `stores/systemStore.ts`     | logs[], importState, appReady                                                | addLog, setImportState, setAppReady                                                                               |

**Architecture** (Maintenance Phase 3.1) :
- **Single Source of Truth** : `useCatalog()` hook SEUL pour images data (pas de hybrid state)
- **Separation of Concerns** : `useUiStore` pour state UI only (selection, filterText, viewport)
- **Type Safety** : TypeScript strict mode, no `any`
- **Zustand Persistence** : Subscriptions pour notifications state changes
- **SQLite Bidirectional Sync** : Callbacks `onRatingChange()`, `onFlagChange()`, `onTagsChange()` dans useCatalog hook

### 4.3 — Zones de l'interface

| Zone                    | Position               | Fonctionnalités mockées                                                          |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| **TopNav**              | Haut                   | Logo, navigation (Bibliothèque, Développement, Cartes, Impression), badge SQLite |
| **LeftSidebar**         | Gauche (264px)         | Catalogue, Smart Collections, Folders, bouton Import                             |
| **Toolbar**             | Haut du canvas central | Mode grille/develop, barre de recherche, slider taille thumbnails                |
| **GridView**            | Centre (mode library)  | Grille d'images responsive, sélection, rating, flags                             |
| **DevelopView**         | Centre (mode develop)  | Image plein écran, mode avant/après                                              |
| **BatchBar**            | Overlay central bas    | Actions batch sur sélection multiple                                             |
| **Filmstrip**           | Bas (128px)            | Bande défilante horizontale de toutes les images                                 |
| **RightSidebar**        | Droite (320px)         | Histogramme, EXIF, sliders de développement OU métadonnées/tags                  |
| **ArchitectureMonitor** | Overlay bas-droite     | Console système temps réel                                                       |
| **KeyboardOverlay**     | Overlay bas-gauche     | Indicateurs de raccourcis clavier                                                |

---

## 4. Pipeline de Rendu Image (Phase 4.2)

### Vue d'ensemble

Le pipeline de rendu applique les édits (sourced en Phase 4.1) sur les previews Standard via CSS filters natifs. Les opérations de rendu sont effectuées côté client (GPU CSS acceleration) sans modification du RAW original. Chaque changement de slider dans le Develop panel déclenche :
1. Modification EditState en DB (Phase 4.1)
2. Invalidation cache du pipeline
3. Recompute CSS filter string via `compute_css_filters(image_id)`
4. Application immédiate du style CSS (GPU-accelerated)

### Architecture du Pipeline

```
Image dans Grille (mode develop)
  ↓
Slider interaction utilisateur (ex: brightness +20)
  ↓
editStore.applyEdit(imageId, 'exposure', 1.2)
  ↓
Tauri invoke: renderService.computeCSSFilters(imageId)
  ↓
Rust: render_pipeline.rs::compute_css_filter_string()
  - Fetch EditState depuis edit_sourcing.rs
  - Map edits → CSS filter functions
  - Return: "brightness(1.2) contrast(1.1) saturate(0.9)"
  ↓
Frontend: Cache invalidation (Map<imageId, filterString>)
  ↓
DOM mutation: <img style={{ filter: "brightness(1.2) ..." }} />
  ↓
CSS GPU Acceleration (native Chromium webkit)
  ↓
Preview Rendu temps réel
```

### CSS Filters Supportés (Phase 4.2A)

| Edit Type | CSS Property | Range | Exemple |
|-----------|-----------|-------|---------|
| **Exposure** | `brightness(x)` | 0.0-10.0 (default 1.0) | `brightness(1.2)` |
| **Contrast** | `contrast(x)` | 0.0-5.0 (default 1.0) | `contrast(1.1)` |
| **Saturation** | `saturate(x)` | 0.0-3.0 (default 1.0) | `saturate(0.9)` |
| **Vibrance** | Contributes to `saturate` | -1.0..+1.0 (default 0.0) | `saturate(1.05)` |
| _(Phase 4.2B — WASM)_ | Clarity, Temperature, Tint, Vignetage | _Future_ | _Future_ |

### Cache Strategy — Frontend

```
Local Cache (Map<imageId, FilterString>):
  - Max 100 entries (LRU eviction)
  - TTL: ∞ until edit change
  - Validation: Hash current edits before returning cached value

Invalidation Triggers:
  - editStore.applyEdit() → invalidate(imageId)
  - editStore.undo() → invalidate all affected images
  - editStore.redo() → invalidate all affected images
  - editStore.reset() → invalidate(imageId)
  - New image selected → loadRenderInfo(imageId)

Optimization:
  - Debounce slider changes to 60fps (≤16ms between recomputes)
  - Avoid cache thrashing with hash validation
  - Preload render info when image thumbnail appears (IntersectionObserver)
```

### Performance Budget

| Operation | Target | Implementation |
|-----------|--------|-----------------|
| Slider change → filter applied | <16ms | Debounce 60fps + cache |
| `compute_css_filter_string()` | <1ms | Pure function, no DB lookup (FAST PATH) |
| Tauri IPC roundtrip | <5ms | Local daemon, no network |
| DOM CSS paint | <10ms | Single style property change |
| **Total frame time** | **<60fps (16.67ms)** | ✅ Consistently achieved |

### Services & Components

**Rust Backend** (`src-tauri/src/`):
- `services/render_pipeline.rs` : `compute_css_filter_string(edits: EditState) → String`
- `commands/render.rs` :
  - `compute_css_filters(image_id: i32) → FilterStringDTO`
  - `get_render_info(image_id: i32) → RenderInfoDTO`

**TypeScript Frontend** (`src/`):
- `services/renderService.ts` : Wrappeur + LRU cache (max 100 entries) + error handling
- `types/render.ts` : DTOs `FilterStringDTO`, `RenderInfoDTO`, `RenderCache`
- `components/develop/DevelopView.tsx` : Affiche preview avec filter appliqué
- `components/develop/SliderPanel.tsx` : Sliders déclenche cache invalidation + recompute
- `stores/editStore.ts` : Observer pattern — `applyEdit()` invalide cache

### Limitations Phase 4.2A — CSS Filters Approximatifs

**Impossible sans WASM/Canvas** :
- **Clarity/Sharpness** : Nécessite high-pass filtering (WASM Phase 4.2B avec image crate)
- **Temperature/Tint** (white balance) : Nécessite pixel manipulation (WASM Phase 4.2B)
- **Vignetage** : Nécessite canvas gradient ou image compositing
- **Highlights/Shadows** : Simplifiés via opacity (Phase 4.2B avec curbes de tons)

**Actuellement approximés** :
- HSL rotation pour temperature/tint (≠ white balance réelle)
- Opacity masking pour highlights/shadows (≠ tone mapping)

### Roadmap Phase 4.2B (Future - WASM)

**Implémentation WASM** pour traitement pixel réel :
- WASM module avec crate `image` pour pixel manipulation
- Courbes de tons (tone mapping non-linéaire)
- Balance des blancs précise (RGB channel scaling)
- Clarté / Texture (high-pass sharpening convolution)
- Vignetage logarithmique (radial gradient)
- Histogramme calculé dynamiquement en WASM

---

## 5. Historique & Snapshots UI (Phase 4.3)

### Vue d'ensemble

Phase 4.3 implémente une interface time-travel complète pour l'éditeur non-destructif basé sur Event Sourcing (Phase 4.1). Les utilisateurs visualisent une chronologie des édits, créent des snapshots nommés et restaurent à tout moment antérieur sans perte d'information.

### Architecture Time-Travel

**Backend Rust** (`HistoryService` — `src-tauri/src/services/history_service.rs`):
- **get_event_timeline(image_id, limit?)** → `Vec<EditEventDTO>` — Récupère les N derniers événements d'édition avec timestamps
- **create_snapshot(image_id, name, description?)** → `SnapshotDTO` — Sérialise EditStateDTO courant en JSON, persiste en DB avec métadonnées
- **get_snapshots(image_id)** → `Vec<SnapshotDTO>` — Liste tous snapshots nommés pour une image (supports multiple snapshots per image via UNIQUE(image_id, name))
- **restore_to_event(image_id, event_id)** → `EditStateDTO` — Marque les édits post-event comme `is_undone=1`, rejoue timeline via EditSourcingService
- **restore_to_snapshot(snapshot_id)** → `EditStateDTO` — Charge snapshot JSON depuis DB, reset timeline courant, retourne state restauré
- **delete_snapshot(snapshot_id)** → `()` — Supprime un snapshot nommé
- **count_events_since_import(image_id)** → `i64` — Utile UI: affiche "5 edits since import"

**Error Handling** : Custom `HistoryError` enum (thiserror) avec 4 variants:
- `InvalidEventState(e)` — EditSourcingService replay failed
- `InvalidSnapshot` — Snapshot not found
- `DatabaseError(msg)` — SQLite error
- `JsonError(msg)` — JSON serialization failed

**Database** (`006_edit_snapshots.sql`):
```sql
CREATE TABLE edit_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- User-friendly snapshot name
  description TEXT,                             -- Optional user description
  event_count INTEGER NOT NULL,                 -- # of active events in snapshot
  snapshot_state TEXT NOT NULL,                 -- JSON EditStateDTO serialized
  created_at TEXT DEFAULT (datetime('now')),    -- ISO timestamp
  UNIQUE(image_id, name)                        -- No duplicate snapshot names per image
);
CREATE INDEX idx_snapshots_image ON edit_snapshots(image_id);
CREATE INDEX idx_snapshots_created ON edit_snapshots(created_at);
```

**Frontend Components**:
- **HistoryPanel.tsx** — Interactive timeline UI:
  - Baseline "Import state" (origin of timeline)
  - Chronological list of edit events with type icons and timestamps
  - Named snapshots displayed inline within timeline
  - Click event → restore to that point (marks later edits undone)
  - Click snapshot → restore to that snapshot (replaces entire state)
  - "Create Snapshot" button → prompts for name/description
  - "Reset to Import" button with confirmation dialog
- **historyService.ts** — Wrapper Tauri with:
  - LRU cache (Map<imageId, events>) max 100 entries
  - Cache invalidation triggered by editStore edits
  - Error handling and type conversion (Tauri Result → TypeScript Promise)
- **types/history.ts**:
  ```typescript
  export interface EditEventDTO {
    id: i32;
    event_type: EditEventType;
    payload: EditPayload;
    timestamp: string;
    is_cancelled: bool;
  }

  export interface SnapshotDTO {
    id: i32;
    image_id: i32;
    name: string;
    description?: string;
    event_count: i32;
    created_at: string;
  }
  ```

**editStore Integration**:
- New action `replaceAllEdits(newState: EditStateDTO)` — Replaces entire edit state (used for snapshot restoration)
- Existing actions `applyEdit()`, `undo()`, `redo()` trigger `historyService.invalidateCache(imageId)`
- After restoration, editStore state updated → UI reflects new edits (sliders, preview)

### Timeline Behavior

**User Interactions**:
1. Select image in GridView
2. HistoryPanel loads timeline via `get_event_timeline(image_id)`
3. User clicks event in timeline → `restore_to_event(image_id, event_id)`
   - EditSourcingService marks post-event edits `is_undone=1`
   - Replays events up to that point
   - Returns EditStateDTO
   - editStore updates with new state
   - UI sliders, preview refresh
4. User clicks "Create Snapshot" → Dialog prompts name/description
   - Calls `create_snapshot(image_id, name, description)`
   - Snapshot immediately visible in timeline
5. User clicks snapshot → `restore_to_snapshot(snapshot_id)`
   - Loads snapshot JSON from DB
   - Calls `editStore.replaceAllEdits(state)`
   - UI updates
6. User clicks "Reset to Import" → Confirmation dialog
   - Calls `restore_to_event(image_id, 0)` or equivalent
   - Timeline reverts to original import state

### Performance Characteristics

| Operation | Latency | Implementation |
|-----------|---------|-----------------|
| Load timeline (50 events) | <100ms | Cached query + LRU cache |
| Create snapshot | <50ms | JSON serialize + INSERT |
| Restore to event | <200ms | DB transaction + replay |
| Restore to snapshot | <100ms | JSON deserialize + state update |
| Timeline UI render | <50ms | React re-render (virtualized list) |

### Cache Strategy

- **LRU Cache** : Map<imageId, events[]> max 100 entries
- **TTL** : Infinite until next edit on that image
- **Invalidation** : Triggered by editStore.applyEdit(), undo(), redo(), reset()
- **Warm-up** : Preload when image selected (IntersectionObserver friendly)

### Files Created (Phase 4.3)

- `src-tauri/src/services/history_service.rs` (335 lines) — Core logic
- `src-tauri/src/commands/history.rs` (113 lines) — Tauri IPC bridge
- `src-tauri/migrations/006_edit_snapshots.sql` (23 lines) — DB schema
- `src/components/develop/HistoryPanel.tsx` — Interactive UI
- `src/services/historyService.ts` — Frontend wrapper + cache
- `src/types/history.ts` — TypeScript types+interfaces
- `Docs/briefs/PHASE-4.3.md` — Complete specification

### Files Modified (Phase 4.3)

- `src-tauri/src/lib.rs` → 7 history commands registered in invoke_handler
- `src-tauri/src/commands/mod.rs` → `pub mod history;`
- `src-tauri/src/services/mod.rs` → `pub mod history_service;`
- `src/stores/editStore.ts` → `replaceAllEdits()` action + cache invalidation on applyEdit/undo/redo

---

## 6. Modèle de Données (Mockup Actuel)

### 5.1 — Structure d'une Image (TypeScript — `CatalogImage`)

```typescript
// Types réels dans src/types/image.ts
export interface ExifData {
  iso?: number;           // Sensibilité ISO
  aperture?: number;      // Ouverture (ex: 2.8)
  shutterSpeed?: string;  // Formatée : "1/500" ou "2.5s" (>=1s)
  focalLength?: number;   // Longueur focale mm
  lens?: string;          // Modèle objectif
  cameraMake?: string;    // Fabricant appareil
  cameraModel?: string;   // Modèle appareil
  gpsLat?: number;        // Latitude décimale
  gpsLon?: number;        // Longitude décimale
  colorSpace?: string;    // Espace colorimérique
}

// Structure CatalogImage (mappée depuis ImageDTO via useCatalog)
{
  id: number,                    // ID SQLite
  hash: string,                  // BLAKE3 hash réel
  filename: string,              // Nom de fichier réel
  url: string,                   // Chemin preview local
  capturedAt: string,            // ISO date
  exif: ExifData,                // Données EXIF réelles (nullable)
  // Données mock générées pour démo :
  // url: picsum.photos si preview absent
  exif_mock: {                   // NOTE: mockData.ts uniquement en dev
    iso: number,                 // [160, 400, 800, 1600, 3200, 6400, 12800]
    aperture: number,            // [1.2, 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16]
    shutterSpeed: string,        // "1/500", "1/2000", etc.
    lens: string,                // "56mm f/1.2", etc.
    cameraModel: string,         // "Fujifilm X-T5", etc.
  },
// NOTE: location: string SUPPRIMÉ (n'existait que dans le mock)
  state: {
    rating: number,              // 0-5 (aléatoire)
    flag: 'pick' | 'reject' | null,
    edits: {
      exposure: number,          // -100 à 100
      contrast: number,
      highlights: number,
      shadows: number,
      temp: number,              // 5500 (fixe)
      tint: number,
      vibrance: number,
      saturation: number,
      clarity: number
    },
    isSynced: boolean,           // Aléatoire
    revision: string,            // "vX.0.1-b3"
    tags: string[]               // ['Portrait', 'Studio', 'Flash'], etc.
  },
  sizeOnDisk: string             // "XX.X MB" (aléatoire)
}
```

### 5.2 — Structure d'un Event (`CatalogEvent`)

```typescript
// src/types/events.ts — type réel (MockEvent supprimé)
export interface CatalogEvent {
  id: string; // safeID() — random string
  timestamp: number; // Date.now()
  type: EventType; // EventType enum strictement typé
  payload: EventPayload; // Payload typé par type d'event
  targets: number[]; // IDs des images concernées
}
// MockEvent (src/lib/mockData.ts) a été supprimé — plus utilisé nulle part
```

---

## 6. Fonctionnalités — État Actuel

| Fonctionnalité               | Statut            | Connectée à un backend ?        | Phase cible |
| ---------------------------- | ----------------- | ------------------------------- | ----------- |
| Affichage grille d'images    | ✅ Fonctionnel    | Oui (SQLite via useCatalog)     | —           |
| Virtualisation grille (10K+) | ✅ Fonctionnel    | Oui (@tanstack/react-virtual + **LazyLoadedImageCard** with IntersectionObserver) | 3.1 |
| Redimensionnement grille     | ✅ Fonctionnel    | N/A (ResizeObserver)            | —           |
| Drag & Drop (ajouter à collection) | ✅ Fonctionnel | Oui (HTML5 DnD + collection store) | 3.2b      |
| Sélection simple/multiple    | ✅ Fonctionnel    | Oui (useUiStore → selection Set)     | —           |
| Notation (0-5 étoiles)       | ✅ Fonctionnel  | Oui (SQLite + isSynced tracking) | 5.3         |
| Flagging (pick/reject)       | ✅ Fonctionnel  | Oui (SQLite + isSynced tracking) | 5.3         |
| Import de fichiers           | ✅ Fonctionnel    | Oui (Tauri discovery+ingestion) | —           |
| Progression import (%)       | ✅ Fonctionnel    | Oui (processedFiles/totalFiles) | —           |
| Recherche/filtrage           | 🟡 Partiel        | Non (filter JS local)           | 3.5         |
| Smart Collections            | 🟡 Mock           | Non (liens statiques)           | 3.3         |
| Sliders de développement     | 🟡 Mock           | Non (CSS filters)               | 4.2         |
| Histogramme                  | 🟡 Mock           | Non (Math.sin)                  | 5.1         |
| EXIF display                 | ✅ Fonctionnel    | Oui (SQLite LEFT JOIN)          | —           |
| Tags/mots-clés               | 🟡 Mock           | Non (état local)                | 5.2         |
| Historique d'events          | 🟡 Partiel        | Non (CatalogEvent typé)         | 4.3         |
| Avant/Après                  | 🟡 Mock           | Non (CSS filters)               | 4.4         |
| Filmstrip                    | 🟡 Partiel        | Partiel (images SQLite)         | 3.1         |
| Batch operations             | ⬜ Non implémenté | Non (boutons disabled)          | 3.2         |
| Raccourcis clavier           | ✅ Fonctionnel    | N/A (event listeners)           | —           |
| Monitoring système           | ✅ Fonctionnel    | Oui (logs SQLite réels)         | —           |
| Cloud sync status            | ⬜ Non implémenté | Non (badge SQLite)              | 8.2         |
| Taille thumbnails            | ✅ Fonctionnel    | N/A (CSS grid)                  | —           |
| Navigation Library/Develop   | ✅ Fonctionnel    | N/A (state local)               | —           |

**Légende** :

- 🟡 Mock = Interface visible mais données simulées
- ✅ Fonctionnel = Fonctionne réellement (même sans backend)
- ⬜ Non implémenté = Pas encore dans le code

---


## 7. Raccourcis Clavier (Mockup)

| Touche       | Action                    | Implémenté ? |
| ------------ | ------------------------- | ------------ |
| `G`          | Vue Bibliothèque (grille) | ✅           |
| `D`          | Vue Développement         | ✅           |
| `1-5`        | Attribuer une note        | ✅ (mock)    |
| `0`          | Supprimer la note         | ✅ (mock)    |
| `P`          | Flag "pick"               | ✅ (mock)    |
| `X`          | Flag "reject"             | ✅ (mock)    |
| `U`          | Supprimer le flag         | ✅ (mock)    |
| `Shift+clic` | Sélection multiple        | ✅ (mock)    |
| `Cmd+clic`   | Sélection multiple        | ✅ (mock)    |
| Double-clic  | Ouvrir en mode Develop    | ✅           |

---

## 8. Dépendances npm Actuelles

### Production

| Package        | Version  | Usage        |
| -------------- | -------- | ------------ |
| `react`        | ^19.2.0  | Framework UI |
| `react-dom`    | ^19.2.0  | Rendu DOM    |
| `lucide-react` | ^0.563.0 | Icônes SVG   |

### Développement

| Package                       | Version | Usage                              |
| ----------------------------- | ------- | ---------------------------------- |
| `vite`                        | ^7.3.1  | Bundler                            |
| `@vitejs/plugin-react`        | ^5.1.1  | Plugin React pour Vite             |
| `tailwindcss`                 | ^4.1.18 | Utilitaires CSS                    |
| `@tailwindcss/vite`           | ^4.1.18 | Plugin TailwindCSS pour Vite       |
| `postcss`                     | ^8.5.6  | Post-processeur CSS                |
| `eslint`                      | ^9.39.1 | Linter                             |
| `eslint-plugin-react-hooks`   | ^7.0.1  | Règles hooks React                 |
| `eslint-plugin-react-refresh` | ^0.4.24 | React Fast Refresh                 |
| `globals`                     | ^16.5.0 | Globales ESLint                    |
| `@types/react`                | ^19.2.7 | Types React (non utilisés — JS)    |
| `@types/react-dom`            | ^19.2.3 | Types ReactDOM (non utilisés — JS) |
| `typescript`                  | ^5.6.3  | TypeScript strict                  |
| `typescript-eslint`           | ^8.55.0 | ESLint pour TypeScript             |
| `@testing-library/react`      | ^16.1.0 | Tests React                        |
| `@vitest/coverage-v8`         | ^1.6.0  | Coverage tests                     |
| `vitest`                      | ^2.1.8  | Framework de tests                 |
| `jsdom`                       | ^25.0.1 | Environnement DOM tests            |
| `zustand`                     | ^5.0.2  | State management                   |
| `@tauri-apps/api`             | ^2.2.0  | API Tauri frontend                 |
| `@tauri-apps/plugin-fs`       | ^2.2.0  | Plugin filesystem                  |
| `@tauri-apps/plugin-dialog`   | ^2.2.0  | Plugin dialogues                   |
| `@tauri-apps/plugin-shell`    | ^2.2.0  | Plugin shell                       |

---

## 9. Dépendances Rust Actuelles

### Production

| Crate                 | Version | Usage                   |
| --------------------- | ------- | ----------------------- |
| `tauri`               | ^2.9.1  | Framework desktop       |
| `tauri-plugin-log`    | ^2      | Logging système         |
| `tauri-plugin-fs`     | ^2      | Accès fichiers          |
| `tauri-plugin-dialog` | ^2      | Dialogues système       |
| `tauri-plugin-shell`  | ^2      | Commandes système       |
| `serde`               | ^1.0    | Sérialisation JSON      |
| `serde_json`          | ^1.0    | JSON parsing/writing    |
| `rusqlite`            | ^0.31.0 | Base de données SQLite  |
| `thiserror`           | ^1.0    | Gestion d'erreurs       |
| `chrono`              | ^0.4.38 | Dates et timestamps     |
| `blake3`              | ^1.5    | Hachage cryptographique |
| `rayon`               | ^1.10   | Parallélisation         |
| `tokio`               | ^1.40   | Runtime async           |

### Développement

| Crate         | Version | Usage                      |
| ------------- | ------- | -------------------------- |
| `tauri-build` | ^2.5.1  | Build system               |
| `tempfile`    | ^3.0    | Fichiers temporaires tests |

---

## 10. Configuration

### Vite (`vite.config.js`)

- Plugins : `@vitejs/plugin-react` + `@tailwindcss/vite`
- Pas de configuration custom (défaut Vite)

### ESLint (`eslint.config.js`)

- Configuration standard Vite + React

### TailwindCSS

- Importé via `@import "tailwindcss"` dans `index.css`
- Pas de `tailwind.config.js` (utilise la config v4 auto-detect)

---

## 11. Schéma de Base de Données

> ✅ **Implémenté en Phase 1.1** — Schéma complet avec 9 tables et migrations automatiques

### 11.1 — Architecture du Catalogue

**Tables principales** :

- `images` : Table pivot avec BLAKE3 hash, métadonnées de base (filename, path, filesize)
- `folders` : Structure hiérarchique des dossiers (parent_id, path, name)
- `exif_metadata` : Métadonnées EXIF complètes (camera, lens, settings, dates)
- `collections` : Collections statiques/smart/quick avec requêtes JSON
- `collection_images` : Relation many-to-many avec ordre manuel
- `image_state` : Rating, flags, color labels par image
- `tags` + `image_tags` : Système de tags hiérarchique
- `migrations` : Tracking des migrations appliquées

**Index stratégiques** :

- Index sur `images.blake3_hash` (déduplication)
- Index sur `images.filename`, `folders.path`, `collections.type`
- Index sur `image_state.rating`, `image_state.flag`

### 11.2 — Configuration SQLite

**PRAGMA optimisés** :

- `journal_mode = WAL` : Concurrency optimale pour lectures/écritures simultanées
- `synchronous = NORMAL` : Équilibre performance/sécurité
- `cache_size = -20000` : Cache 20MB en mémoire
- `page_size = 4096` : Taille de page optimisée
- `temp_store = memory` : Tables temporaires en RAM
- `foreign_keys = ON` : Contraintes référentielles activées

### 11.3 — Système de Migrations

- **Automatique** : Migrations `001_initial`, `002_ingestion`, `003_previews` appliquées au démarrage via `execute_batch()`
- **Idempotent** : Les migrations peuvent être réappliquées sans erreur
- **Tracking** : Table `migrations` enregistre les versions appliquées
- **Migration 003** : Table `previews` désormais activée (corrigée via BLOC 1)
- **Tests** : 11 tests unitaires valident le système complet

---

## 12. Outils de Qualité et CI/CD

### 12.1 — Linting et Formatting

**Frontend (TypeScript/React)**

- **ESLint** : Configuration étendue avec règles TypeScript strictes
  - Interdiction de `any` et `non-null assertion`
  - Règles React Hooks (exhaustive-deps)
  - Formatage automatique avec `lint:fix`
- **Commandes** : `npm run lint`, `npm run lint:fix`

**Backend (Rust)**

- **Clippy** : Linting statique avec règles de qualité
  - Détection de code non sécurisé
  - Règles de performance et complexité
  - Configuration adaptée au projet
- **rustfmt** : Formatting automatique du code Rust
- **Commandes** : `cargo clippy`, `cargo fmt`

### 12.2 — Tests et Coverage

**Framework de tests** : Vitest + jsdom (TypeScript) + Rust built-in

- **504 tests au total** : 345 TypeScript + 159 Rust ✅
- **Tests TypeScript (345)** :
  - Tests stores (4 fichiers) : catalogStore, uiStore, editStore, systemStore
  - Tests types (6 fichiers) : validation interfaces, DTO, hashing, preview, events
  - Tests services (5 fichiers) : catalogService, exifService, discoveryService, filesystemService, hashingService
  - Tests composants (8+ fichiers) : GridView, ImageCard, ImportModal, etc.
  - Tests hooks (2 fichiers) : `useCatalog.test.ts`, `useDiscovery.test.ts` (reset, progress)
- **Tests Rust (159)** : Database (11), Discovery (18), Ingestion (24), Collections (28), EXIF (18), Preview (27), Filesystem (16), Hashing (17)
- **Commandes** : `npm test`, `npm run test:ci`, `npm run rust:test`

### 12.3 — Pipeline CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`)

- **Frontend** : Type checking, linting, tests, build
- **Backend** : Formatting, clippy, build, tests
- **Integration** : Build Tauri complet
- **Security** : Audit des dépendances (Node.js + Rust)
- **Déclenchement** : Push sur main/develop/phase/\*, PRs

### 12.4 — Scripts de Développement

```bash
# Frontend
npm run dev              # Serveur de développement
npm run build           # Build production
npm run type-check      # Vérification TypeScript
npm run lint           # Linting ESLint
npm run lint:fix       # Auto-correction linting
npm run test           # Tests interactifs
npm run test:ci        # Tests avec coverage

# Tauri
npm run tauri:dev         # Développement Tauri
npm run tauri:build       # Build production
npm run rust:test         # Tests unitaires Rust
npm run rust:check         # Vérification compilation Rust
npm run rust:build        # Build compilation Rust
npm run tauri:dev       # Développement Tauri
npm run build:tauri    # Build Tauri production
```

---

## 12. Base de Données SQLite

> ✅ **Implémenté en Phase 1.1** — Schéma complet et migrations fonctionnelles

### 12.1 — Schéma du Catalogue

**Tables principales** :

- `images` : Table pivot avec BLAKE3 hash, métadonnées de base
- `folders` : Structure hiérarchique des dossiers importés
- `exif_metadata` : Métadonnées EXIF complètes (ISO, ouverture, objectif, GPS)
- `iptc_metadata` : Métadonnées IPTC (copyright, keywords, description) - Phase 2.2
- `collections` : Collections statiques/smart/quick avec requêtes JSON
- `collection_images` : Relation many-to-many avec ordre de tri
- `image_state` : Rating (0-5), flags (pick/reject), color labels
- `tags` + `image_tags` : Système de tags hiérarchique
- `migrations` : Tracking des migrations appliquées

**Index stratégiques** :

- Index sur `blake3_hash` (détection doublons)
- Index sur `filename`, `captured_at`, `imported_at`
- Index sur `folders.path`, `collections.type`
- Index sur `image_state.rating`, `image_state.flag`

### 12.2 — Configuration SQLite

**PRAGMA optimisés** :

- `journal_mode = WAL` : Concurrency optimale pour lectures/écritures simultanées
- `synchronous = NORMAL` : Équilibre performance/sécurité des données
- `cache_size = -20000` : Cache 20MB en mémoire pour performance
- `page_size = 4096` : Taille de page optimisée pour les métadonnées images
- `temp_store = memory` : Tables temporaires en RAM
- `foreign_keys = ON` : Contraintes référentielles activées

### 12.3 — Système de Migrations

- **Automatique** : Migration `001_initial` appliquée au démarrage
- **Idempotent** : Les migrations peuvent être réappliquées sans erreur
- **Tracking** : Table `migrations` enregistre les versions appliquées
- **Tests** : 11 tests unitaires valident le système complet

### 12.4 — Types Rust

**Modèles sérialisables** (`src-tauri/src/models/`) :

- `catalog.rs` : `Image`, `Folder`, `Collection`, `CollectionType`
- `exif.rs` : `ExifMetadata`, `IptcMetadata`, `ExtractionConfig` (Phase 2.2)
- `discovery.rs` : `DiscoveredFile`, `DiscoverySession` (Phase 2.1)
- `filesystem.rs` : `FileEvent`, `FileLock`, `WatcherConfig`
- `hashing.rs` : `HashResult`, `BatchHashResult`
- DTOs pour insertion : `NewImage`, `NewExifMetadata`, `NewIptcMetadata`
- Support complet `serde::Serialize/Deserialize`

### 12.5 — Tests Unitaires

**11 tests Rust** (100% passants) :

- Tests de création et initialisation de la base de données
- Tests de migration et idempotence
- Tests CRUD basiques (insertion, requête)
- Tests de contraintes de clés étrangères
- Tests de validation d'index
- Tests de sérialisation des types

---

## 14. Services EXIF/IPTC

> ✅ **EXIF complet en Phase 2.2** (kamadak-exif v0.6.1) | ⚠️ **IPTC skeleton** (reporté Phase 5.4)

### 14.1 — Architecture EXIF (Implémenté)

**Service `services/exif.rs` (258 lignes)** :

- `extract_exif_metadata()` : Fonction principale kamadak-exif Reader
- 9 fonctions helper : extraction champs individuels, conversions GPS/log2
- Result<ExifMetadata, String> : Gestion d'erreurs explicite
- Tests unitaires (2) : shutter_speed_to_log2, error handling

**Intégration pipeline ingestion** :

- Extraction automatique pendant batch_ingest()
- Fallback filename-based si extraction échoue
- Transaction atomique : images + exif_metadata + image_state

**Formats supportés** :

- RAW : `.CR3`, `.RAF`, `.ARW`, `.NEF`, `.ORF`, `.PEF`, `.RW2`, `.DNG`
- Standard : `.JPG`, `.JPEG`
- Compatibilité : kamadak-exif v0.6.1 (pure Rust)

### 14.2 — Métadonnées EXIF (10 champs)

**ExifMetadata struct (synchronisé SQL)** :

```rust
pub struct ExifMetadata {
    pub iso: Option<u16>,                // Sensibilité ISO
    pub aperture: Option<f64>,           // Ouverture (f-number)
    pub shutter_speed: Option<f64>,      // ⚠️ log2(secondes) pour tri SQL
    pub focal_length: Option<f64>,       // Longueur focale (mm)
    pub lens: Option<String>,            // Modèle objectif
    pub camera_make: Option<String>,     // Fabricant appareil
    pub camera_model: Option<String>,    // Modèle appareil
    pub gps_latitude: Option<f64>,       // Latitude décimale (DMS→decimal)
    pub gps_longitude: Option<f64>,      // Longitude décimale (DMS→decimal)
    pub color_space: Option<String>,     // Espace colorimérique (sRGB, AdobeRGB)
}
```

**Conversions spéciales** :

- **Shutter speed → log2** : 1/125s devient -6.97 pour `ORDER BY shutter_speed` SQL
- **GPS DMS → décimal** : 48°51'29.52"N → 48.858200 (compatibilité mapping APIs)
- **Extraction robuste** : Gestion des champs manquants, valeurs NULL par défaut

### 14.3 — Métadonnées IPTC (Skeleton seulement)

**Service `services/iptc.rs` (68 lignes)** :

- `IptcMetadata` struct (4 champs) : copyright, keywords, description, author
- `extract_iptc()` : Fonction stub retournant données vides
- Tests (2) : Validation struct, empty extraction

**Statut** : ⚠️ **Non implémenté** — Reporté Phase 5.4 (Sidecar XMP)

- kamadak-exif ne supporte pas IPTC/XMP nativement
- Options futures : img-parts crate (pure Rust) ou rexiv2 (binding C++)
- Impact : Non bloquant pour Phase 3.1 — EXIF suffit pour UI Grid

### 14.4 — Performance et Intégration

**Performance mesurée** :

- ✅ Extraction EXIF : <50ms par fichier (target atteint)
- ✅ Batch ingestion : Aucun ralentissement mesurable
- ✅ Memory usage : Stable (pas de leak détecté)

**Intégration ingestion** :

```rust
// Dans services/ingestion.rs ligne 73-97
let exif_data = match exif::extract_exif_metadata(&file_path) {
    Ok(exif) => exif,
    Err(e) => {
        eprintln!("EXIF extraction failed: {}, using fallback", e);
        extract_basic_exif(&file_path, &_filename)
    }
};
// Insertion atomique avec transaction SQLite
```

**Fallback filename-based** :

- Détection extension + patterns filename (Fuji RAF, Canon CR3, etc.)
- Valeurs par défaut si extraction EXIF échoue
- Toujours une insertion réussie garantie

**Commandes Tauri** :

- `extract_exif(file_path: String)` : Extraction single file
- `extract_exif_batch(file_paths: Vec<String>)` : Batch avec Vec<Result>

**Tests** :

- ✅ 2 tests services::exif (log2 conversion, error handling)
- ✅ 2 tests services::iptc (struct validation, empty data)
- ✅ 17 tests services::ingestion (EXIF integration, fallback, atomicity)

---

## 15. Service Filesystem

> ✅ **Implémenté en Phase 1.4** - Service complet de gestion du système de fichiers avec watchers et locks

### 15.1 — Architecture du Service

**Composants principaux** :

- `FilesystemService` : Service singleton avec gestion d'état async
- `FileWatcher` : Watchers de fichiers avec debounce et filtres
- `FileLock` : Système de verrous partagés/exclusifs
- `EventQueue` : Queue d'événements avec traitement batch

**Performance cibles** :

- <10ms détection d'événements filesystem
- <1ms acquisition/libération de verrous
- Support de milliers de watchers simultanés

### 15.2 — Types Unifiés

**Sérialisation serde custom** :

- `PathBuf` ↔ `String` : Chemins de fichiers cross-platform
- `DateTime<Utc>` ↔ `String` : Timestamps ISO 8601
- `Duration` ↔ `String` : Durées formatées
- `Uuid` ↔ `String` : Identifiants uniques

**Types principaux** :

- `FileEvent` : Événements filesystem (created, modified, deleted, etc.)
- `FileLock` : Verrous avec timeout et héritage
- `WatcherConfig` : Configuration des watchers (filtres, debounce, récursivité)
- `FilesystemState` : État global du service

### 13.3 — Concurrence et Performance

**tokio::sync::RwLock** :

- Lecture concurrente autorisée pour les opérations non-mutantes
- Écriture exclusive pour les modifications d'état
- Pas de deadlocks avec les patterns async/await

**Batch processing** :

- Événements groupés par batch (configurable 50-1000)
- Debounce configurable (100ms-5s)
- Processing async pour ne pas bloquer le thread principal

### 13.4 — Commandes Tauri

**15 commandes exposées** :

- `start_watcher` / `stop_watcher` : Gestion des watchers
- `acquire_lock` / `release_lock` / `is_file_locked` : Gestion des verrous
- `get_pending_events` / `clear_events` : Gestion des événements
- `get_filesystem_state` / `get_active_locks` / `list_active_watchers` : État du service
- `get_file_metadata` / `get_directory_contents` : Opérations fichiers/dossiers
- `create_directory` / `delete_file` : Opérations de base

### 13.5 — Tests et Validation

**Tests Rust (26 unitaires)** :

- Tests du service filesystem avec mocks
- Tests des commandes Tauri
- Tests de concurrence et performance
- Tests de gestion d'erreurs

**Tests TypeScript (75 lignes)** :

- Tests des types filesystem
- Tests du wrapper service
- Mocks Vitest pour Tauri API

---

## 14. Historique des Modifications de ce Document

| Date       | Phase               | Modification                                                       | Raison                                         |
| ---------- | ------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| 2026-02-23 | Maintenance SQL     | Refactorisation `get_folder_images()` pour sécurité et performance | Élimination conversions u32→String inutiles    |
| 2026-02-23 | Maintenance Qualité | Résolution 4 notes bloquantes Review Copilot (PR #20)              | Error handling, volume_name, SQL LIKE, Zustand |
| 2026-02-13 | 1.4                 | Ajout section Service Filesystem complète                          | Implémentation Phase 1.4 terminée              |
| 2026-02-13 | 1.3                 | Mise à jour complète après Phase 1.3 (BLAKE3)                      | Synchronisation documentation avec état actuel |
| 2026-02-12 | 1.2                 | Ajout section API/Commandes Tauri complète                         | Implémentation Phase 1.2 terminée              |
| 2026-02-11 | 1.1                 | Ajout section Base de Données SQLite complète                      | Implémentation Phase 1.1 terminée              |
| 2026-02-11 | 1.1                 | Mise à jour stack technique et architecture fichiers               | Ajout src-tauri avec SQLite                    |
| 2026-02-11 | 1.1                 | Ajout scripts Rust dans section développement                      | Scripts npm pour tests Rust                    |
| 2026-02-11 | 0.5                 | Mise à jour après complétion Phase 0.5                             | CI/CD implémenté et fonctionnel                |

| Date       | Sous-Phase            | Nature de la modification                                                            |
| ---------- | --------------------- | ------------------------------------------------------------------------------------ |
| 2026-02-21 | Corrections critiques | Pipeline EXIF E2E, ResizeObserver, CatalogEvent, logs SQLite réels, 10 bugs corrigés |
| 2026-02-20 | Phase 3.1             | Grille virtualisée @tanstack/react-virtual, 60fps sur 10K+ images                    |
| 2026-02-20 | Phase 2.4             | UI Import connectée au backend Tauri                                                 |
| 2026-02-20 | Phase 2.2             | Extraction EXIF réelle kamadak-exif, 10 champs                                       |
| 2026-02-20 | Phase 2.1             | Service Discovery & Ingestion Rust                                                   |
| 2026-02-13 | Phase 1.4             | Implémentation Service Filesystem complet (watchers, locks, événements)              |
| 2026-02-12 | Phase 1.2             | Implémentation CRUD Commands Tauri + DTOs + Service wrapper                          |
| 2026-02-11 | Pré-développement     | Création initiale — état du mockup documenté                                         |
| 2026-02-11 | Phase 0.1             | Migration TypeScript, ajout types/, mise à jour stack                                |
| 2026-02-11 | Phase 0.2             | Intégration Tauri v2, plugins fs/dialog/shell, src-tauri/                            |
| 2026-02-11 | Phase 0.3             | Décomposition modulaire : 17 composants + 2 modules utilitaires                      |
| 2026-02-11 | Phase 0.4             | State Management Zustand : 4 stores, élimination props drilling                      |
| 2026-02-11 | Phase 0.5             | Pipeline CI & Linting : ESLint, Clippy, GitHub Actions, coverage 98.93%              |

## Smart Collections : Logique SQL et compatibilité parser

La commande Tauri `get_smart_collection_results` génère désormais une requête SQL sans alias pour garantir la compatibilité avec le parser `smart_query_parser`. Les noms de tables utilisés dans la clause WHERE sont toujours explicites (`images`, `image_state`, `exif_metadata`).

### Exemple de requête générée :

SELECT images.id, images.blake3_hash, images.filename, images.extension,
images.width, images.height, images.file_size_bytes, images.orientation,
images.captured_at, images.imported_at, images.folder_id,
image_state.rating, image_state.flag, image_state.color_label,
exif_metadata.iso, exif_metadata.aperture, exif_metadata.shutter_speed, exif_metadata.focal_length,
exif_metadata.lens, exif_metadata.camera_make, exif_metadata.camera_model
FROM images
LEFT JOIN image_state ON images.id = image_state.image_id
LEFT JOIN exif_metadata ON images.id = exif_metadata.image_id
WHERE <clause dynamique générée par smart_query_parser>
ORDER BY images.imported_at DESC

### Mapping DTO TypeScript/Rust

Le mapping des champs EXIF, rating, flag, etc. est synchronisé entre Rust et TypeScript. Les tests unitaires valident le filtrage dynamique des smart collections.

### Tests

## Les tests unitaires Rust et TypeScript pour le filtrage des smart collections sont présents et passants (voir CHANGELOG).

## Phase 3.4 : Folder Navigator — Architecture et Schéma

### Migration 004 : Colonnes `is_online` et `name` sur `folders`

```sql
ALTER TABLE folders ADD COLUMN is_online BOOLEAN DEFAULT 1 NOT NULL;
ALTER TABLE folders ADD COLUMN name TEXT;
```

Ces colonnes permettent de tracker le statut en ligne des volumes externes et de stocker le nom du volume pour le regroupement dans l'arborescence.

### DTO `FolderTreeNode`

**⚠️ CONVENTION PROJET** : Les DTOs utilisent **snake_case** (pas camelCase) côté Rust ET TypeScript pour éviter le mapping. La sérialisation serde par défaut produit du snake_case.

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderTreeNode {
    pub id: u32,
    pub name: String,
    pub path: String,
    pub volume_name: String,
    pub is_online: bool,
    pub image_count: u32,
    pub total_image_count: u32,
    pub children: Vec<FolderTreeNode>,
}
```

```typescript
export interface FolderTreeNode {
  id: number;
  name: string;
  path: string;
  volume_name: string; // ⚠️ snake_case
  is_online: boolean;
  image_count: number;
  total_image_count: number;
  children: FolderTreeNode[];
}
```

### Commandes Tauri — Phase 3.4

#### `backfill_images_folder_id() → Result<u32, String>`

💡 **Nouvelle commande Phase 3.4** : Backfill structural pour images héritées sans `folder_id`.

Sélectionne **TOUTES** les images avec `folder_id IS NULL` via LEFT JOIN avec `ingestion_file_status` (récupère le full `file_path`), les traite en transaction :

1. Utilise LEFT JOIN avec `ingestion_file_status` pour récupérer le full `file_path`
2. Appelle `IngestionService::get_or_create_folder_id()` avec le full path (réutilise Phase 2.1)
3. Exécute `UPDATE images SET folder_id = ? WHERE id = ?` en masse
4. Retourne le nombre d'images mises à jour (u32)

**Signature** :

```rust
#[tauri::command]
pub async fn backfill_images_folder_id(state: State<'_, AppState>) -> Result<u32, String>
```

**SQL interne** :

```sql
SELECT i.id, ifs.file_path
FROM images i
LEFT JOIN ingestion_file_status ifs ON i.blake3_hash = ifs.blake3_hash
WHERE i.folder_id IS NULL AND ifs.file_path IS NOT NULL
```

**Usage** : Backend command exposée au frontend. À intégrer dans UI "Import → Backfill" si images héritées détectées (ex: après upgrade depuis v0).

#### `get_folder_tree() → CommandResult<Vec<FolderTreeNode>>`

Retourne l'arborescence hiérarchique groupée par volumes. Requête SQL récursive (CTE) pour construire l'arbre, compteurs d'images direct et récursif, filtrage des dossiers vides.

#### `get_folder_images(folder_id: u32, recursive: bool) → CommandResult<Vec<ImageDTO>>`

Retourne les images d'un dossier spécifique. Si `recursive=true`, utilise une CTE récursive pour inclure les sous-dossiers. Retourne un JOIN complet (images + image_state + exif_metadata) dans le même format que `get_all_images`.

#### `update_volume_status(volume_name: String, is_online: bool) → CommandResult<()>`

Met à jour le statut en ligne d'un volume. UPDATE SET `is_online` = ? WHERE `name` = ?. Sera utilisé par le file watcher (Phase 5+).

### Services TypeScript — `catalogService.ts`

```typescript
static async getFolderTree(): Promise<FolderTreeNode[]> {
  return invoke('get_folder_tree');
}

static async getFolderImages(folderId: number, recursive: boolean): Promise<ImageDTO[]> {
  return invoke('get_folder_images', { folderId, recursive });
}

static async updateVolumeStatus(volumeName: string, isOnline: boolean): Promise<void> {
  return invoke('update_volume_status', { volumeName, isOnline });
}
```

### Store Zustand — `folderStore.ts`

```typescript
interface FolderStore {
  folderTree: FolderTreeNode[];
  activeFolderId: number | null;
  activeFolderImageIds: number[] | null;
  expandedFolderIds: Set<number>;
  isLoading: boolean;
  error: string | null;

  loadFolderTree: () => Promise<void>;
  setActiveFolder: (id: number, recursive: boolean) => Promise<void>;
  clearActiveFolder: () => void;
  toggleFolderExpanded: (id: number) => void;
  checkVolumeStatus: () => Promise<void>;
}
```

**État-clé** : `activeFolderImageIds` contient les IDs des images du dossier actif. Cet état est utilisé dans `App.tsx` pour filtrer `filteredImages`.

### Logique de filtrage dans `App.tsx`

Priorité de filtrage (ordre de précédence) :

1. **Collection active** (`activeCollectionId != null`) → filtre par `collectionImages`
2. **Dossier actif** (`activeFolderImageIds != null` ET pas de collection) → filtre par `activeFolderImageIds`
3. **Recherche textuelle** (`searchQuery`) → appliquée après filtrage collection/dossier

```typescript
const filteredImages = useMemo(() => {
  let images = allImages;

  // Priority 1: Filter by collection
  if (activeCollectionId && collectionImages) {
    images = collectionImages;
  }
  // Priority 2: Filter by folder (only if no collection active)
  else if (activeFolderImageIds !== null) {
    const folderIdSet = new Set(activeFolderImageIds);
    images = allImages.filter((img) => folderIdSet.has(img.id));
  }

  // Then apply search filter
  if (searchQuery) {
    images = images.filter((img) => img.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  return images;
}, [allImages, activeCollectionId, collectionImages, activeFolderImageIds, searchQuery]);
```

### Composant `FolderTree.tsx`

- Arborescence récursive avec `ChevronRight`/`ChevronDown` pour expand/collapse
- Icônes `Folder` colorées selon `isOnline` (bleu si en ligne, gris si hors ligne)
- Compteurs d'images affichés (`imageCount` / `totalImageCount`)
- Click handler appelle `setActiveFolder(id, true)` avec `recursive=true` par défaut
- Intégré dans `LeftSidebar` dans une nouvelle section "Dossiers"

### Tests

**Backend (6 nouveaux tests)** :

- `test_get_folder_tree_with_images` : Arborescence avec images
- `test_get_folder_images_direct` : Images direct folder only
- `test_get_folder_images_recursive` : Images avec sous-dossiers
- `test_update_volume_status_online` : Statut online
- `test_update_volume_status_offline` : Statut offline
- `test_get_folder_tree_empty` : Arborescence vide

**Frontend (6 nouveaux tests)** :

- Initialize with default values
- Load folder tree
- Set active folder and load images
- Clear active folder
- Toggle folder expansion
- Handle load error

**Total : 504 tests passent (345 frontend + 159 backend)**

---

## Phase 3.5 : Recherche & Filtrage — Architecture et Parser

### Parser Côté Frontend : `parseSearchQuery()`

Convertit la syntaxe naturelle en JSON structuré. Exemple :

**Entrée** : `"iso:>3200 star:4"`
**Sortie** :

```typescript
{
  text: "",
  filters: [
    { field: "iso", operator: ">", value: "3200" },
    { field: "star", operator: "=", value: "4" }
  ]
}
```

**Champs supportés** :

- `iso` (numérique) — ISO sensitivity
- `aperture` (numérique) — f-stop
- `shutter_speed` (numérique) — shutter speed
- `focal_length` (numérique) — focal length
- `lens` (texte) — lens model
- `camera` (texte) — camera model
- `star` (numérique, 1-5) — rating
- `flag` (texte: pick/reject) — flag status

**Opérateurs supportés** :

- `=` — exact match (implicite pour texte : `camera:canon` = `camera:=canon`)
- `>` — greater than (numérique)
- `<` — less than (numérique)
- `>=` — greater or equal (numérique)
- `<=` — less or equal (numérique)
- `:` — LIKE search (texte) — `camera:canon` → `camera LIKE '%canon%'`

**Implémentation** :

- Fichier : `src/lib/searchParser.ts`
- Regex : `/([a-zA-Z_]+)\s*(:)\s*(>=|<=|>|<|=)?\s*([^\s]+)/g`
- Tests : 6 tests unitaires dans `src/lib/__tests__/searchParser.test.ts`

### Composant Frontend : `SearchBar.tsx`

```typescript
interface SearchBarProps {
  onSearch: (query: SearchQuery) => void;
}
```

- Input avec onChange event
- **Debounce 500ms** : évite surcharge serveur sur typing rapide
- Appelle `onSearch()` seulement quand utilisateur arrête de taper
- `useCallback()` + `useState()` pour gestion débounce
- Import de `parseSearchQuery` pour conversion syntaxe
- Intégré dans `Toolbar.tsx` à la place de la barre de recherche mockée

### Service Frontend : `searchService.ts`

```typescript
export const performSearch = async (query: SearchQuery): Promise<SearchResponse> => {
  return invoke<SearchResponse>('search_images', {
    text: query.text,
    filters: query.filters,
  });
};
```

- Wrapper Tauri IPC
- Accepte `SearchQuery` en entrée
- Retourne `SearchResponse` (results + total count)

### DTO TypeScript

```typescript
// src/types/search.ts
export interface ParsedFilter {
  field: string;
  operator: string; // "=", ">", "<", ">=", "<=", ":"
  value: string;
}

export interface SearchQuery {
  text: string;
  filters: ParsedFilter[];
}

export interface SearchResult {
  id: number;
  filename: string;
  blake3_hash: string;
  rating?: number;
  flag?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}
```

### Commande Tauri — Phase 3.5

#### `search_images(request: SearchRequest) → CommandResult<SearchResponseDTO>`

🆕 **Nouvelle commande Phase 3.5** : Recherche unifiée avec filtres dynamiques.

**Signature** :

```rust
#[tauri::command]
pub async fn search_images(
    request: SearchRequest,
    state: State<'_, AppState>,
) -> Result<SearchResponseDTO, String>
```

**Input DTO** :

```rust
#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub text: String,
    pub filters: Vec<serde_json::Value>, // [{field, operator, value}]
}
```

**Output DTO** :

```rust
#[derive(Debug, Serialize)]
pub struct SearchResponseDTO {
    pub results: Vec<SearchResultDTO>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct SearchResultDTO {
    pub id: u32,
    pub filename: String,
    pub blake3_hash: String,
    pub rating: Option<i32>,
    pub flag: Option<String>,
}
```

**SQL interne** :

```sql
SELECT i.id, i.filename, i.blake3_hash, s.rating, s.flag
FROM images i
LEFT JOIN image_state s ON i.id = s.image_id
LEFT JOIN exif_metadata e ON i.id = e.image_id
WHERE 1=1
  AND (i.filename LIKE '%text%')  -- filtre texte libre
  AND (e.iso > 3200 AND s.rating >= 4)  -- filtres structurés générés
ORDER BY i.imported_at DESC
LIMIT 1000
```

### Service Rust : `SearchService`

**Fichier** : `src-tauri/src/services/search.rs`

Deux méthodes principales :

#### `SearchService::search()`

```rust
pub fn search(
    db: &mut Database,
    text: &str,
    filters: &[Value],
) -> Result<Vec<SearchResult>, String>
```

- Accepte : text libre + filters JSON array
- Retourne : Vec<SearchResult> (max 1000)
- Utilise `build_where_clause()` pour générer dynamiquement la clause WHERE

#### `SearchService::build_where_clause()`

```rust
pub fn build_where_clause(filters: &[Value]) -> Result<String, String>
```

- Accepte : filters JSON array `[{field, operator, value}, ...]`
- Retourne : String de clause WHERE construite
- Validation : champs et opérateurs autorisés
- Exemples générées :
  - `e.iso > 3200`
  - `i.rating >= 4`
  - `e.lens LIKE '%tamron%'`
  - Conditions jointes avec AND

**Mapping champs → colonnes** :
| Champ | Colonne SQL | Table |
|-------|-------------|-------|
| iso | e.iso | exif_metadata |
| aperture | e.aperture | exif_metadata |
| shutter_speed | e.shutter_speed | exif_metadata |
| focal_length | e.focal_length | exif_metadata |
| lens | e.lens | exif_metadata |
| camera | e.camera_make, e.camera_model | exif_metadata |
| star | i.rating | image_state |
| flag | i.flag | image_state |

**Tests** (6 tests unitaires) :

- `test_build_where_clause_iso_greater_than` : Valide clause EXIF > opérateur
- `test_build_where_clause_star_equals` : Valide clause rating =
- `test_build_where_clause_multiple_filters` : Validation AND chaîning
- `test_build_where_clause_camera_like` : Validation LIKE pour texte
- `test_build_where_clause_invalid_field` : Rejet champs invalides
- `test_build_where_clause_empty_filters` : Clause vide quand pas de filtre

**Impl** : `src-tauri/src/services/search.rs` (87 lignes code + 130 lignes tests)
**Commands** : `src-tauri/src/commands/search.rs` (27 lignes)

### Pipeline Complet Frontend → Backend

1. Utilisateur tape dans SearchBar
2. Debounce 500ms déclenche `onSearch()`
3. `parseSearchQuery()` parse: `"iso:>3200"` → `{field: "iso", operator: ">", value: "3200"}`
4. `performSearch(query)` invoke Tauri command `search_images`
5. Backend `search_images()` appelle `SearchService::search()`
6. `build_where_clause()` génère : `e.iso > 3200`
7. SQL combine texte + WHERE structuré
8. Résultats retournés en `SearchResponse`
9. Frontend met à jour grille d'images

### Tests

**Backend (6 tests)** :

- Tous les tests passent : `cargo test search::` ✅

**Frontend (2 tests)** :

- SearchBar component + integration tests
- parseSearchQuery parser tests (6 tests spécifiques)

**Total** : 363/363 tests (357 TypeScript + 6 Rust)
