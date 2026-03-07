# LuminaFast — Changelog Archive (Phases 0-4)

> **Archive historique des phases 0 à 4**
> Pour l'état actuel (phases 5+), voir [CHANGELOG.md](CHANGELOG.md)
> Pour la navigation rapide, voir [CHANGELOG_SEARCH_INDEX.md](CHANGELOG_SEARCH_INDEX.md)

---

## Phases 0 — Foundation (2026-02-11)

### Phase 0.1 — Migration TypeScript ✅

| Critère                    | Statut            |
| -------------------------- | ----------------- |
| Compilation `tsc --noEmit` | ✅ 0 erreurs      |
| Tous les composants typés  | ✅ 0 `any`        |
| `npm run build`            | ✅ 233 KB gzipped |

**Livrable** : Migration JSX→TSX complet, types domaine (image.ts, collection.ts, events.ts, ui.ts), configuration TypeScript strict.

---

### Phase 0.2 — Scaffolding Tauri v2 ✅

| Critère                   | Statut              |
| ------------------------- | ------------------- |
| `cargo check`             | ✅ Success          |
| `tauri:dev`               | ✅ Fenêtre 1440×900 |
| Plugins fs, dialog, shell | ✅ Enregistrés      |

**Livrable** : Intégration Tauri v2 complète, configuration fenêtre macOS, dépendances npm (api, plugins).

---

### Phase 0.3 — Décomposition Modulaire Frontend ✅

| Critère          | Statut                    |
| ---------------- | ------------------------- |
| App.tsx          | ✅ 159 LOC (vs 728 avant) |
| Composants créés | ✅ 17 composants + 2 libs |
| `npm run build`  | ✅ 235 KB gzipped         |

**Livrable** : Découpage monolithique → 17 composants (GridView, DevelopView, Sidebars, Toolbar, etc.), réduction App.tsx 728→159 lignes.

**Composants créés** :

- Shared : GlobalStyles, ArchitectureMonitor, ImportModal, BatchBar, KeyboardOverlay
- Layout : TopNav, LeftSidebar, Toolbar, Filmstrip, RightSidebar
- Library : GridView
- Develop : DevelopView, DevelopSliders, HistoryPanel
- Metadata : Histogram, ExifGrid, MetadataPanel

---

### Phase 0.4 — State Management (Zustand) ✅

| Critère          | Statut                                                      |
| ---------------- | ----------------------------------------------------------- |
| Tests            | ✅ 61/61                                                    |
| Stores créés     | ✅ 4 stores (catalogStore, uiStore, editStore, systemStore) |
| App.tsx useState | ✅ 0 (tous migrés)                                          |

**Livrable** : Remplacement complet useState → Zustand (4 stores centralisés), élimination props drilling, isolation tests avec reset beforeEach.

**Bugs corrigés** :

- catalogStore.addImages() : Ajoutait au début au lieu de la fin
- systemStore.addLog() : Logique limitation incorrecte (slice vs concat)

---

### Phase 0.5 — Pipeline CI & Linting ✅

| Critère        | Statut                             |
| -------------- | ---------------------------------- |
| ESLint         | ✅ Config étendue (TS+React+tests) |
| Coverage       | ✅ 98.93% (80% minimum)            |
| GitHub Actions | ✅ Pipeline 4 jobs                 |

**Livrable** : Linting strict (ESLint + TypeScript strict), Rust formatting (rustfmt + Clippy), tests complets (Vitest), CI/CD workflow GitHub Actions.

**Configuration** :

- ESLint : TS/TSX séparé + tests + configs
- Rust : toolchain stable, rustfmt, clippy config
- Coverage : seuils 80% (atteint 98.93%)
- CI : 4 jobs (frontend, backend, intégration, sécurité)

---

## Phase 1 — Backend Core (2026-02-11 à 2026-02-13)

### Phase 1.1 — Schéma SQLite du Catalogue ✅

| Critère                   | Statut                                      |
| ------------------------- | ------------------------------------------- |
| Migration 001_initial.sql | ✅ 9 tables créées                          |
| Tests migration           | ✅ 11/11                                    |
| PRAGMA                    | ✅ WAL, journal_mode=WAL, cache_size=-20000 |

**Livrable** : Schéma SQLite complet avec 9 tables (images, folders, exif_metadata, collections, collection_images, image_state, tags, image_tags, migrations), indices stratégiques, migrations automatiques.

**Tables** :

- `images` : BLAKE3 hash, metadata de base, timestamps
- `folders` : Hiérarchie dossiers avec parent_id
- `exif_metadata` : 10+ champs métadonnées
- `collections` : Statiques et smart (JSON query)
- `collection_images` : M2M avec tri
- `image_state` : Rating, flags, color labels
- `tags` + `image_tags` : Hiérarchique

---

### Phase 1.2 — Tauri Commands CRUD ✅

| Critère     | Statut                                    |
| ----------- | ----------------------------------------- |
| Commands    | ✅ 9 commandes (creat/read/update/delete) |
| Tests Rust  | ✅ Intégrés                               |
| Result<T,E> | ✅ 0 unwrap()                             |

**Livrable** : CRUD complet via Tauri IPC (create_image, get_all_images, update_image, delete_image, etc.), gestion erreurs robuste, transactions atomiques SQLite.

---

### Phase 1.3 — Service BLAKE3 (CAS) ✅

| Critère        | Statut                               |
| -------------- | ------------------------------------ |
| Service BLAKE3 | ✅ Streaming, cache, parallélisation |
| Commands       | ✅ 8 commandes                       |
| Tests          | ✅ 20+ tests TypeScript              |

**Livrable** : Service BLAKE3 haute performance (streaming 64KB chunks), détection doublons 100% accurate, cache Arc<Mutex<HashMap>>, commandes Tauri (hash_file, batch, duplicates, cache stats, integrity check, benchmark).

---

### Phase 1.4 — Gestion du Système de Fichiers ✅

| Critère            | Statut                           |
| ------------------ | -------------------------------- |
| Filesystem Service | ✅ 476 LOC Rust                  |
| Watchers           | ✅ Implémentés (notify crate)    |
| Tests              | ✅ 26 tests Rust + 24 TypeScript |

**Livrable** : Service filesystem avec watchers, locks, événements (FileCreated, Renamed, Modified), commandes Tauri (list_directory, watch, unwatch), typage strict unifié Rust/TypeScript.

---

## Phase 2 — File Ingestion (2026-02-16 à 2026-02-20)

### Phase 2.1 — Discovery & Ingestion de Fichiers ✅

| Critère          | Statut                                  |
| ---------------- | --------------------------------------- |
| DiscoveryService | ✅ Scanning récursif, sessions          |
| IngestionService | ✅ BLAKE3 hash, EXIF basique, DB insert |
| Commands         | ✅ 6 commandes discovery/ingestion      |
| Tests            | ✅ 216 tests totaux                     |

**Livrable** : Services Rust complets pour scanning dossiers (30 fichiers RAF détectés en ~2s), ingestion par lot (batch_ingest avec Rayon parallélisation 8 threads), détection format RAF/CR3/ARW, hachage BLAKE3 atomique, insertion DB avec transactions.

**Architectural Pattern** :

- DiscoverySession avec UUID unique
- Stack d'infos découvertes en HashMap
- Ingestion parallèle par batch (8 threads max)
- Callbacks pour progression UI temps réel

---

### Phase 2.2 — Harvesting Métadonnées EXIF/IPTC ✅

| Critère         | Statut                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| EXIF Extraction | ✅ 10 champs (iso, aperture, shutter, focal, lens, camera, gps, color) |
| Performance     | ✅ <50ms par fichier                                                   |
| IPTC            | ✅ Skeleton (impl Phase 5.4)                                           |

**Livrable** : Service EXIF complet (kamadak-exif 0.6.1), extraction 10 champs optimisée, conversion log2(shutter_speed) pour tri SQL, conversion GPS DMS→décimal, fallback filename-based si extraction échoue, détection intelligente camera make/model par extension + patterns.

**Special Cases** :

- Shutter speed : Stockée en `log2(secondes)` pour `ORDER BY`
- GPS : Conversion DMS (48°51'29.52"N) → décimal (48.858200)
- Camera : Détection par extension (CR3=Canon, RAF=Fuji, ARW=Sony) + patterns

---

### Phase 2.3 — Génération de Previews ✅

| Critère            | Statut                                                  |
| ------------------ | ------------------------------------------------------- |
| Pyramide 3 niveaux | ✅ Thumbnail (120px), Standard (600px), OneToOne (full) |
| Performance        | ✅ <200ms Thumbnail, <500ms Standard                    |
| Cache              | ✅ Hiérarchique par hash prefix                         |
| Tests              | ✅ 20 tests unitaires                                   |

**Livrable** : Service preview complet avec 3 niveaux de résolution, génération pyramidale optimisée, cache structuré par hash BLAKE3 prefix, support formats RAW (rsraw + image crate), commandes Tauri (generate, batch, cache stats).

---

### Phase 2.4 — UI d'Import Connectée ✅

| Critère           | Statut                                                      |
| ----------------- | ----------------------------------------------------------- |
| ImportModal       | ✅ Connectée services réels                                 |
| Hook useDiscovery | ✅ 321 LOC orchestration                                    |
| Progression       | ✅ 3 phases (scan 0-30%, ingestion 30-70%, preview 70-100%) |
| Tests             | ✅ 23 tests unitaires                                       |

**Livrable** : Modal d'import complètement connecté aux services Rust (scan → ingestion → preview), progression multi-phase temps réel, gestion d'erreurs robuste, cleanup listeners.

---

## Phase 3 — Catalogue Navigation (2026-02-20 à 2026-02-24)

### Phase 3.1 — Grille d'Images Réelle ✅

| Critère          | Statut                                  |
| ---------------- | --------------------------------------- |
| Virtualisation   | ✅ @tanstack/react-virtual (overscan=3) |
| Performance      | ✅ 60fps sur 10K+ images                |
| Sizing dynamique | ✅ 120-600px pixel size                 |
| Tests            | ✅ 5 tests (mock virtualizer)           |

**Livrable** : GridView virtualisée haute performance pour afficher catalogues 10K+ images sans lag, calcul dynamique colonnes (srcwidth + gap), aspect ratio 3:2 maintenu, support selection + double-click.

**Architecture** :

- `useVirtualizer` hook (@tanstack/react-virtual)
- Overscan=3 pour smooth scroll
- Position absolute + translateY pour layout virtuel
- ResizeObserver pour responsive columns

---

### Phase 3.1 Maintenance — État Hybride + SQLite Sync ✅

| Critère          | Statut                                        |
| ---------------- | --------------------------------------------- |
| État centralisé  | ✅ `useCatalog()` seul hook data              |
| SQLite Sync Bidi | ✅ onRatingChange/onFlagChange callbacks      |
| Lazy Loading     | ✅ LazyLoadedImageCard + IntersectionObserver |
| Tests            | ✅ 361/361 (4 nouveaux tests)                 |

**Livrable** : Correction complète Phase 3.1 (60% → 100% complétée). Migration sélection de catalogStore vers uiStore, synchronisation bidirectionnelle SQLite pour modifications (ratings, flags), lazy loading previews avec anti-thrashing logic.

---

### Phase 3.2 — Collections Statiques (CRUD) ✅

| Critère       | Statut                                   |
| ------------- | ---------------------------------------- |
| Collections   | ✅ CRUD complet (create, rename, delete) |
| Store Zustand | ✅ collectionStore + 7 actions           |
| LeftSidebar   | ✅ Connectée collections réelles         |
| Tests         | ✅ 29 tests (12 backend, 17 frontend)    |

**Livrable** : Gestion complète collections statiques en SQLite, store Zustand avec actions (loadCollections, createCollection, deleteCollection, renameCollection), LeftSidebar intégrée, filtrage par collection active dans grille.

---

### Phase 3.2b — Drag & Drop Collections ✅

| Critère         | Statut                               |
| --------------- | ------------------------------------ |
| Drag & Drop     | ✅ Images → Collections              |
| MultiSelect     | ✅ Cmd+clic pour sélection multiples |
| Visual Feedback | ✅ Highlight drop zone               |
| Tests           | ✅ 18 tests drag&drop                |

**Livrable** : Support glisser-déposer images vers collections, sélection multiples (Cmd+clic), feedback visuel (drop zone highlight), implémentation native HTML5 (dragstart, dragover, drop).

---

### Phase 3.3 — Smart Collections ✅

| Critère             | Statut                              |
| ------------------- | ----------------------------------- |
| Parser SQL          | ✅ `smart_query_parser` générique   |
| Requêtes dynamiques | ✅ Filtre ISO, aperture, date, etc. |
| Tests               | ✅ 492/492                          |

**Livrable** : Système collections intelligentes avec parser JSON→SQL, support filtres dynamiques (iso>3200, aperture<2.8, date>2025-01-01), requête SQL sans alias pour compatibilité parser.

---

### Phase 3.4 — Navigateur de Dossiers ✅

| Critère       | Statut                        |
| ------------- | ----------------------------- |
| FolderTree    | ✅ Arborescence hiérarchique  |
| Statut volume | ✅ Online/offline tracking    |
| Récursif      | ✅ Images folder + subfolders |
| Tests         | ✅ 504/504 (6 nouveaux tests) |

**Livrable** : Navigation hiérarchique par dossiers, arborescence groupée par volumes, toggle expand/collapse, statut online/offline volumes, comptage images par dossier, support sélection récursive (folder + all subfolders).

---

### Phase 3.5 — Recherche & Filtrage ✅

| Critère   | Statut                             |
| --------- | ---------------------------------- |
| SearchBar | ✅ Parser syntaxe naturelle        |
| Syntaxe   | ✅ `iso:>3200 star:4 camera:canon` |
| Debounce  | ✅ 500ms côté frontend             |
| Tests     | ✅ 363/363 (6 tests backend)       |

**Livrable** : Barre de recherche unifiée avec parser côté client (iso/aperture/shutter/focal/camera/date), génération SQL générique backend, debounce 500ms réduit charge serveur.

---

## Phase 4 — Image Processing (2026-02-25 à 2026-03-04)

### Phase 4.1 — Event Sourcing Engine ✅

| Critère     | Statut                                              |
| ----------- | --------------------------------------------------- |
| Services    | ✅ EventStore (append, get, replay)                 |
| Events      | ✅ 10+ types (image_edit, collection_created, etc.) |
| Persistence | ✅ Table `events` SQLite                            |
| Tests       | ✅ 567/567 (173 Rust + 394 TypeScript)              |

**Livrable** : Event sourcing complet avec EventStore service, API Tauri (append_event, get_events, replay_events), audit trail immuable de toutes modifications, base pour undo/redo Phase 5.

---

### Phase 4.2 — Pipeline de Rendu Image ✅

| Critère     | Statut                               |
| ----------- | ------------------------------------ |
| CSS Filters | ✅ Exposure, clarity, vibrance, etc. |
| WASM Pixel  | ✅ normalizeFiltersForWasm() complet |
| Integration | ✅ EditState → WASM → canvas         |
| Tests       | ✅ 756/756 tests (8 nouveaux)        |

**Livrable** : Pipeline de rendu complet avec CSS filters (fallback rapide) + WASM pixel processing (précision), normalisation paramètres UI (-100..+100) → plages WASM (ex. exposure -2..+2), commandes Rust pour rendu batch.

**Bug corrigé (Phase 4.2 Maintenance)** :

- Formule exposure CSS : 0.35 → 0.3 (correction valeur)
- WASM filter ranges : Documentation exhaustive (50 lignes) pour éviter régressions

---

### Phase 4.2 Maintenance — Preview Format Selection ✅

| Critère    | Statut                                     |
| ---------- | ------------------------------------------ |
| Formats    | ✅ 3 formats Thumbnail, Standard, OneToOne |
| Chargement | ✅ Promise.all parallèle                   |
| Usage      | ✅ DevelopView.standard (1440px)           |

**Livrable** : Architecture CatalogImage.urls avec 3 formats (urls: {thumbnail, standard, oneToOne}), chargement parallèle 3 formats avec Promise.all, sélection dynamique par résolution ecran (DevelopView 1440px→standard).

---

### Phase 4.3 — Historique & Snapshots UI ✅

| Critère  | Statut                                   |
| -------- | ---------------------------------------- |
| Backend  | ✅ Snapshots service + migration 006     |
| Frontend | ✅ SnapshotModal + HistoryPanel refactor |
| Tests    | ✅ 37/37 tests Phase 4.3                 |

**Livrable** : Interface historique avec snapshots périodiques (tous les 100 événements), affichage timeline, restauration edit state antérieurs, intégration Event Sourcing Phase 4.1.

---

### Phase 4.4 — Before/After Comparison ✅

| Critère | Statut                                         |
| ------- | ---------------------------------------------- |
| Modes   | ✅ Split-View, Overlay, Side-by-Side (3 modes) |
| UI      | ✅ Toolbar mode selector, sliders              |
| Store   | ✅ uiStore (comparisonMode, position, opacity) |
| Tests   | ✅ 66 tests composants                         |

**Livrable** : 3 modes comparaison avant/après (split-view draggable separator, overlay avec slider opacité, side-by-side avec zoom/pan), toolbar de sélection mode, intégration complète DevelopView.

---

## Maintenance Records

### Corrections Critiques (2026-02-18 à 2026-02-20)

| Date       | Type                  | Description                                  | Impact                      |
| ---------- | --------------------- | -------------------------------------------- | --------------------------- |
| 2026-02-18 | Testing               | Fix deadlocks Filesystem, réactivation tests | ✅ 425/425 tests            |
| 2026-02-20 | Logs                  | Logs conditionnels (DEV only)                | ✅ Production clean         |
| 2026-02-20 | Discovery             | Polling infini fixed, file storage           | ✅ Scan fonctionne          |
| 2026-02-20 | Migrations            | Table ingestion_sessions créée               | ✅ Ingestion possible       |
| 2026-02-20 | Pipeline              | IngestionService → DB réelle                 | ✅ 30 images RAF ingérées   |
| 2026-02-21 | Performance           | Rayon parallélisation (8× plus rapide)       | ✅ 30s → 3s                 |
| 2026-02-21 | Phase 3.1 Completion  | État hybride → centralisé                    | ✅ 361/361 tests            |
| 2026-02-23 | SQL Safety            | Refactorisation sans alias                   | ✅ Lisibilité +20%          |
| 2026-02-23 | PR #20                | 4 blockers resolved (Gemini review)          | ✅ Code quality             |
| 2026-02-25 | IPC Regression        | camelCase restauré                           | ✅ Collections fonctionnent |
| 2026-03-02 | Phase 4.2 Fixes       | Event sourcing persistence chain             | ✅ Edits persistent         |
| 2026-03-07 | TypeScript Conformity | 26 imports relatifs → @/, 5 `any` éliminés   | ✅ 100% strict mode         |

### Phase-Specific Maintenance

| Phase | Maintenance                                 | Date                   | Impact                           |
| ----- | ------------------------------------------- | ---------------------- | -------------------------------- |
| 3.1   | État Hybride + Lazy Loading                 | 2026-02-24             | ✅ 60% → 100% complète           |
| 4.2   | Exposure formule CSS + WASM documentation   | 2026-02-26, 2026-03-07 | ✅ Slider fonctionnel            |
| 4.2   | Preview Format Selection (Parallel loading) | 2026-03-03             | ✅ Rapide chargement             |
| 6.1   | CacheMetadataService + cache-first          | 2026-07-11             | ✅ Cache infrastructure complète |

---

## Statistics Cumul (Phases 0-4)

| Metric                        | Value                        |
| ----------------------------- | ---------------------------- |
| **LOC Frontend (TypeScript)** | ~5000+                       |
| **LOC Backend (Rust)**        | ~3500+                       |
| **Tests Total**               | 567/567 ✅ (394 TS + 173 RS) |
| **SQL Tables**                | 9                            |
| **Tauri Commands**            | 30+                          |
| **React Components**          | 17 (Phase 0.3)               |
| **Zustand Stores**            | 4                            |
| **CI/CD Jobs**                | 4                            |
| **Phases Complétées**         | 26 (0.1-4.4)                 |

---

## Transition vers Phases 5-6

→ **Voir [CHANGELOG.md](CHANGELOG.md)** pour les phases actuelles (5+)

→ **Voir [CHANGELOG_SEARCH_INDEX.md](CHANGELOG_SEARCH_INDEX.md)** pour navigation rapide

---

> **Archive créée** : 2026-03-07
> **Last Phase** : 4.4
> **Next Phases** : 5.1+ (CHANGELOG.md)
