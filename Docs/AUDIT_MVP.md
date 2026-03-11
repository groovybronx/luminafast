# Audit MVP — LuminaFast

**Date** : 2025-07-12
**Agent** : Master-Validator (Audit Complet)
**Branche** : courante (develop)
**Source de vérité** : Code réel (fichiers Rust, TypeScript, migrations SQL, CI/CD)

---

## 1. Résumé Exécutif

### État Global MVP

| Métrique | Valeur |
|---|---|
| **Phases MVP couvertes** (0→5 + Maintenance) | **26 / 26 sous-phases principales** |
| **Phases post-MVP** (6→8) | **0 / 15 sous-phases** |
| **Complétion MVP (phases 0-5)** | **~92 %** (code présent, quelques gaps ponctuels) |
| **Complétion Plan complet (0-8)** | **~55 %** (phases 6-8 non démarrées) |
| **Fichiers Rust backend** | 70+ fichiers (commands, services, models, migrations) |
| **Fichiers TypeScript frontend** | 130+ fichiers (components, stores, services, hooks, types) |
| **Tests TypeScript (Vitest)** | ~550+ tests identifiés (56 fichiers de test) |
| **Tests Rust** | 100+ tests identifiés (30+ fichiers avec #[test]) |
| **CI/CD** | Partiellement conforme (Linux only, pas macOS/Windows) |

### Verdict MVP

L'application LuminaFast a atteint un niveau de complétion **MVP fonctionnel** sur les phases 0 à 5. Le backend Rust est robuste (catalog SQLite, BLAKE3, discovery/ingestion, previews, event sourcing, tags, XMP). Le frontend React/Tauri couvre les vues Library et Develop avec les fonctionnalités essentielles. Les phases 6 à 8 (DuckDB, multi-plateforme, accessibilité, sync) sont entièrement absentes — elles sont prévues pour une version commerciale complète.

**Gaps critiques identifiés** :
1. 🔴 Artefact WASM non compilé dans `public/` → rendu pixel avancé inopérant en prod jusqu'au `npm run wasm:build`
2. 🟠 CI/CD Linux-only (Phase 0.5 exigeait macOS + Windows + Linux)
3. 🟡 `src/App.jsx.old` (fichier mort non supprimé)
4. 🟡 Pas de commande Tauri `batch_update_image_state` — le BatchBar effectue des appels en boucle

---

## 2. Tableau de Bord par Phase

| Phase | Titre | Statut | Score | Fichiers clés | Commentaire |
|---|---|---|---|---|---|
| **0.1** | Migration TypeScript | ✅ COMPLET | 100% | `src/types/*.ts`, `tsconfig.json` | Tous types créés, strict mode actif |
| **0.2** | Scaffolding Tauri v2 | ✅ COMPLET | 100% | `src-tauri/Cargo.toml`, `tauri.conf.json`, `lib.rs` | Plugins fs/dialog/shell présents |
| **0.3** | Décomposition Modulaire | ✅ COMPLET | 95% | `src/components/**`, `src/stores/`, `src/services/` | App.tsx = 438 lignes (réduit depuis 703), tous composants extraits |
| **0.4** | State Management Zustand | ✅ COMPLET | 100% | `src/stores/{catalogStore,uiStore,editStore,systemStore,folderStore,collectionStore,tagStore}.ts` | 7 stores + tests unitaires |
| **0.5** | Pipeline CI & Linting | ⚠️ PARTIEL | 70% | `.github/workflows/ci.yml`, `eslint.config.js` | ESLint+Clippy+hooks OK, mais CI Linux-only (macOS/Windows absents) |
| **1.1** | Schéma SQLite | ✅ COMPLET | 100% | `src-tauri/migrations/001-006_*.sql` | 6 migrations, toutes tables du plan présentes |
| **1.2** | Tauri Commands CRUD | ✅ COMPLET | 100% | `src-tauri/src/commands/catalog.rs`, `src/services/catalogService.ts` | 17 commandes Tauri exposées, service TS wrappé |
| **1.3** | Service BLAKE3 | ✅ COMPLET | 100% | `src-tauri/src/commands/hashing.rs`, `src-tauri/src/services/blake3.rs` | 8 commandes hashing, crate blake3=1.5, detect_duplicates |
| **1.4** | Gestion Filesystem | ✅ COMPLET | 100% | `src-tauri/src/commands/filesystem.rs`, `src-tauri/src/services/filesystem.rs` | 19 commandes, notify watcher, locks, permissions |
| **2.1** | Discovery & Ingestion | ✅ COMPLET | 100% | `src-tauri/src/services/{discovery,ingestion}.rs`, `src-tauri/src/commands/discovery.rs` | 13 commandes, pipeline parallèle Rayon, 7 tests Rust |
| **2.2** | EXIF/IPTC Harvesting | ✅ COMPLET | 100% | `src-tauri/src/services/{exif,iptc}.rs`, `src/services/exifService.ts` | kamadak-exif v0.6.1, IPTC via iptc.rs, tests |
| **2.3** | Génération Previews | ✅ COMPLET | 100% | `src-tauri/src/services/preview.rs`, `src-tauri/src/commands/preview.rs` | Pyramide 3 niveaux (thumb/standard/1:1), image crate, 10 commandes |
| **2.4** | UI d'Import Connectée | ✅ COMPLET | 100% | `src/components/shared/ImportModal.tsx`, `src/services/discoveryService.ts` | Dialog natif, progress multi-étapes, résumé post-import |
| **3.1** | Grille d'Images Réelle | ✅ COMPLET | 100% | `src/components/library/GridView.tsx`, `src/hooks/useCatalog.ts`, `src/components/library/LazyLoadedImageCard.tsx` | Virtualisation @tanstack/react-virtual, lazy loading |
| **3.2** | Collections Statiques CRUD | ✅ COMPLET | 100% | `src/stores/collectionStore.ts`, `src/components/sidebar/{CollectionItem,NewCollectionInput}.tsx` | create/rename/delete/getImages, tests |
| **3.2b** | Drag & Drop MultiSelect | ✅ COMPLET | 100% | `src/components/library/LazyLoadedImageCard.tsx`, `src/components/layout/LeftSidebar.tsx` | Drag-to-collection, batch ops, tests dédiés |
| **3.3** | Smart Collections | ✅ COMPLET | 100% | `src/components/library/SmartCollectionBuilder.tsx`, `src-tauri/src/services/smart_query_parser.rs` | Builder UI, parser JSON→SQL, 5 commandes Tauri |
| **3.4** | Navigateur de Dossiers | ✅ COMPLET | 100% | `src/components/library/FolderTree.tsx`, `src/stores/folderStore.ts` | Arborescence, compteurs, statut volume |
| **3.5** | Recherche & Filtrage | ✅ COMPLET | 100% | `src/components/library/SearchBar.tsx`, `src/lib/searchParser.ts`, `src-tauri/src/services/search.rs` | Parser syntaxe avancée, commande search_images Tauri |
| **4.1** | Event Sourcing Engine | ✅ COMPLET | 100% | `src-tauri/src/services/event_sourcing.rs`, `src-tauri/migrations/005_event_sourcing.sql`, `src/services/eventService.ts` | 4 commandes Tauri, 14 variants EventType, 1 test Rust |
| **4.2** | Pipeline Rendu Image | ⚠️ PARTIEL | 80% | `src/services/renderingService.ts`, `src/services/wasmRenderingService.ts`, `luminafast-wasm/src/` | CSS Phase A ✅, WASM Phase B ✅ code présent MAIS artefact .wasm absent de public/ |
| **4.3** | Historique & Snapshots | ✅ COMPLET | 100% | `src/components/develop/HistoryPanel.tsx`, `src/components/develop/SnapshotModal.tsx`, `src-tauri/src/services/snapshot_service.rs`, `src-tauri/migrations/006_snapshots.sql` | 5 commandes Tauri snapshots, migration 006, 5 tests Rust |
| **4.4** | Before/After Comparison | ✅ COMPLET | 100% | `src/components/develop/{BeforeAfterComparison,SplitViewComparison,OverlayComparison,SideBySideComparison}.tsx` | 3 modes implémentés, 6 fichiers de test, intégré dans DevelopView |
| **5.1** | Panneau EXIF Connecté | ✅ COMPLET | 100% | `src/components/metadata/{ExifGrid,Histogram}.tsx`, `src/hooks/useExif.ts`, `luminafast-wasm/src/image_processing.rs` | Histogramme WASM (compute_histogram), useExif hook, RightSidebar |
| **5.2** | Tags Hiérarchiques | ✅ COMPLET | 100% | `src/components/metadata/TagsPanel.tsx`, `src/stores/tagStore.ts`, `src-tauri/src/commands/tags.rs` | 7 commandes Tauri, TagsPanel, tagStore, tagService, 13 tests Rust |
| **5.3** | Rating & Flagging | ✅ COMPLET | 90% | `src/components/sidebar/QuickFilters.tsx`, `src/components/shared/BatchBar.tsx`, `src/stores/uiStore.ts` | update_image_state (single), QuickFilters UI, BatchBar rating/flag UI — pas de `batch_update_image_state` Tauri dédié |
| **5.4** | Sidecar XMP | ✅ COMPLET | 100% | `src-tauri/src/services/xmp.rs` (522 LOC), `src/services/xmpService.ts`, `src/components/metadata/XmpPanel.tsx` | 3 commandes Tauri, format Adobe, 16 tests Rust, 13 tests TS |
| **M.1.1** | Fix Runtime Ingestion | ✅ COMPLET | 100% | `src-tauri/src/services/ingestion.rs` | Élimination Runtime::new() en loop |
| **M.1.1a** | Monitoring Threadpool | ✅ COMPLET | 100% | `src-tauri/src/services/metrics.rs`, `src-tauri/src/commands/metrics.rs` | ThreadpoolMetrics struct, get_threadpool_metrics + simulate_threadpool_load |
| **M.1.2** | Migration Async IO | ✅ COMPLET | 100% | `src-tauri/src/services/` | tokio::fs utilisé, tokio = 1.40 dans Cargo.toml |
| **M.1.2a** | Cleanup Sync Code | ✅ COMPLET | 100% | Audit std::fs supprimé | Services async cohérents |
| **M.1.3** | Nettoyage Code Mort | ⚠️ PARTIEL | 80% | `src/App.jsx.old` | Fichier App.jsx.old toujours présent dans src/ |
| **M.2.1a** | Connection Pooling SQLite | ✅ COMPLET | 100% | `src-tauri/src/types/db_context.rs`, `Cargo.toml` (r2d2, r2d2_sqlite) | Pool r2d2 actif, métriques DbPoolMetrics |
| **M.2.2** | Durcissement Sécurité | ✅ COMPLET | 100% | `src-tauri/src/services/security.rs` | Path traversal prevention, whitelist, is_path_traversal_attempt(), initialize_security_context() appelé dans lib.rs |
| **M.3.1** | Refactoring App.tsx | ✅ COMPLET | 100% | `src/components/AppInitializer.tsx`, `src/hooks/useAppShortcuts.ts` | AppInitializer extrait, useAppShortcuts hook, tests dédiés |
| **M.3.2** | Optimisation Grille | ✅ COMPLET | 100% | `src/hooks/useLazyImageMeta.ts`, `src/components/library/LazyLoadedImageCard.tsx` | Lazy EXIF load, hover prefetch |
| **M.3.2a** | LeftSidebar Refactor | ✅ COMPLET | 100% | `src/components/sidebar/{CollectionItem,SmartCollectionItem,QuickFilters,NewCollectionInput}.tsx` | Composants inline extraits, tests unitaires dédiés |
| **6.1** | Cache Multiniveau | ❌ ABSENT | 0% | — | Non démarré |
| **6.2** | Intégration DuckDB | ❌ ABSENT | 0% | — | Ni dépendance ni code |
| **6.3** | Virtualisation Avancée | ❌ ABSENT | 0% | — | @tanstack/react-virtual présent (base), pas de virtualisation multi-colonnes avancée |
| **6.4** | Optimisation SQLite avancée | ❌ ABSENT | 0% | — | Non démarré (WAL basique déjà présent) |
| **7.1** | Gestion d'Erreurs & Recovery | ❌ ABSENT | 0% | — | Non démarré |
| **7.2** | Backup & Intégrité | ❌ ABSENT | 0% | — | Non démarré |
| **7.3** | Packaging Multi-Plateforme | ❌ ABSENT | 0% | — | Tauri build config présent mais CI Linux-only |
| **7.4** | Accessibilité & UX | ❌ ABSENT | 0% | — | Non démarré |
| **7.5** | Onboarding & Docs Utilisateur | ❌ ABSENT | 0% | — | Non démarré |
| **8.1** | Smart Previews Déconnecté | ❌ ABSENT | 0% | — | Non démarré |
| **8.2** | Sync PouchDB/CouchDB | ❌ ABSENT | 0% | — | Non démarré |
| **8.3** | Résolution Conflits | ❌ ABSENT | 0% | — | Non démarré |

---

## 3. Analyse Détaillée par Phase

### Phase 0 — Fondations & Scaffolding

#### 0.1 Migration TypeScript ✅ COMPLET
- **Implémenté** : `src/types/` contient 16 fichiers de types (`image.ts`, `collection.ts`, `discovery.ts`, `events.ts`, `rendering.ts`, `xmp.ts`, `tag.ts`, etc.). `tsconfig.json` avec mode strict. Tous fichiers `.tsx`.
- **Manque** : Rien de notable.
- **Tests** : `src/types/__tests__/` — 4 fichiers de tests de types (`discovery.test.ts`, `filesystem.test.ts`, `hashing.test.ts`, `types.test.ts`).

#### 0.2 Scaffolding Tauri v2 ✅ COMPLET
- **Implémenté** : `src-tauri/Cargo.toml` (tauri v2.9.1), `tauri.conf.json`, `build.rs`, plugins tauri-plugin-fs/dialog/shell/log tous enregistrés dans `lib.rs`.
- **Manque** : Rien de notable.
- **Tests** : `src-tauri/capabilities/default.json` (permissions définies).

#### 0.3 Décomposition Modulaire ✅ COMPLET (score 95%)
- **Implémenté** : Architecture décrite (`layout/`, `library/`, `develop/`, `shared/`, `metadata/`, `sidebar/`). `App.tsx` a été réduit de 703 → 438 lignes avec extraction de tous les composants significatifs. `AppInitializer`, `GlobalStyles`, `BatchBar`, etc. extraits.
- **Note** : App.tsx reste à 438 lignes (objectif initial < 150 lignes selon Master-Validator). Il contient encore de la logique d'orchestration significative (callbacks, event dispatch). Ce n'est pas une régression mais un écart par rapport à la vision idéale. La Phase M.3.1 a partiellement adressé cela.
- **Tests** : Aucun test direct de `App.tsx` (composant orchestrateur).

#### 0.4 State Management Zustand ✅ COMPLET
- **Implémenté** : 7 stores Zustand (`catalogStore`, `uiStore`, `editStore`, `systemStore`, `folderStore`, `collectionStore`, `tagStore`) + `src/stores/index.ts` d'exports. App.tsx n'utilise plus de `useState` pour l'état applicatif (seulement `useCallback`, `useMemo`).
- **Tests** : 7 fichiers de tests de stores, tous présents.

#### 0.5 Pipeline CI & Linting ⚠️ PARTIEL (score 70%)
- **Implémenté** : `.github/workflows/ci.yml` — ESLint, type-check, Vitest, Clippy, rustfmt, cargo test. Pre-commit hooks (lint-staged via scripts npm). Path filters intelligents (`dorny/paths-filter`).
- **Manque** : **CI Linux-only**. Tous les jobs utilisent `ubuntu-latest`. Le plan Phase 0.5 exigeait "GitHub Actions : lint → type-check → build Tauri (macOS, Windows, Linux)". Les runners macOS et Windows sont absents de `ci.yml`.
- **Tests** : CI runs Vitest (`npm run test:ci`) et `cargo test`.

---

### Phase 1 — Core Data Layer

#### 1.1 Schéma SQLite ✅ COMPLET
- **Implémenté** : 6 migrations en `src-tauri/migrations/` :
  - `001_initial.sql` : tables `images`, `folders`, `exif_metadata`, `collections`, `collection_images`, `image_state`, `tags`, `image_tags` + tous index — conforme au plan Phase 1.1
  - `002_ingestion_sessions.sql` : sessions d'ingestion
  - `003_previews.sql` : mapping previews
  - `004_add_folder_online_status.sql` : statut volume
  - `005_event_sourcing.sql` : table events (Phase 4.1)
  - `006_snapshots.sql` : table `edit_snapshots` (Phase 4.3)
- **Configuration** : WAL/synchronous/cache_size dans `src-tauri/src/database.rs`
- **Tests** : Tests Rust in `database.rs` (7 tests).

#### 1.2 Tauri Commands CRUD ✅ COMPLET
- **Implémenté** : `src-tauri/src/commands/catalog.rs` (2630 lignes) avec 17 commandes enregistrées dans `lib.rs` : `get_all_images`, `get_collections`, `get_image_detail`, `update_image_state`, `create_collection`, `add_images_to_collection`, `delete_collection`, `rename_collection`, `remove_images_from_collection`, `get_collection_images`, `create_smart_collection`, `get_smart_collection_results`, `update_smart_collection`, `get_folder_tree`, `get_folder_images`, `update_volume_status`, `get_image_exif`.
- **Frontend** : `src/services/catalogService.ts` wrappant tous les `invoke()`.
- **Tests** : `src/services/__tests__/catalogService.test.ts`.

#### 1.3 Service BLAKE3 ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/blake3.rs`, `src-tauri/src/commands/hashing.rs`. 8 commandes : `hash_file`, `hash_files_batch`, `detect_duplicates`, `verify_file_integrity`, `clear_hash_cache`, `get_hash_cache_stats`, `benchmark_hashing`, `scan_directory_for_duplicates`. Crate `blake3 = "1.5"` dans Cargo.toml.
- **Tests** : 13 tests Rust dans `hashing.rs` + `src/services/__tests__/hashingService.test.ts`.

#### 1.4 Gestion Filesystem ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/filesystem.rs`, `src-tauri/src/commands/filesystem.rs`. 19 commandes dont `start_watcher`, `stop_watcher`, `acquire_lock`, `release_lock`, `list_directory`, `move_path`, etc. Crate `notify = "7.0"`.
- **Tests** : Tests Rust dans `filesystem.rs` + `src/services/__tests__/filesystemService.test.ts`.

---

### Phase 2 — Pipeline d'Import

#### 2.1 Discovery & Ingestion ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/{discovery.rs, ingestion.rs}`. 13 commandes Tauri. Pipeline : scan → BLAKE3 → doublons → insertion DB. Progress events. Crate `rayon = "1.10"` pour parallélisme. `src-tauri/src/services/discovery/tests.rs` (7 tests), `src-tauri/src/services/ingestion/tests.rs` (12 tests Rust).
- **Tests** : `src/services/__tests__/discoveryService.test.ts`.

#### 2.2 EXIF/IPTC Harvesting ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/{exif.rs, iptc.rs}`. Extraction complète (ISO, aperture, shutter_speed en log2, focal_length, lens, camera, GPS, color_space). Crate `kamadak-exif = "0.6.1"`. IPTC dans `iptc.rs`. Commande `extract_exif` + `extract_exif_batch`.
- **Tests** : Tests Rust dans `exif.rs` + `src/services/__tests__/exifService.test.ts`.

#### 2.3 Génération Previews ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/preview.rs`. Pyramide 3 niveaux (Thumbnail 240px / Standard 1440px / OneToOne natif). Crate `image = "0.25"`. 10 commandes dont `generate_preview_pyramid`, `generate_previews_with_progress`, `benchmark_preview_generation`.
- **Tests** : Tests Rust dans `preview.rs` + `src/services/__tests__/previewService.test.ts`.

#### 2.4 UI d'Import Connectée ✅ COMPLET
- **Implémenté** : `src/components/shared/ImportModal.tsx` — dialog natif Tauri, scan & preview, options, progress multi-phases, résumé. Service `src/services/discoveryService.ts`.
- **Tests** : `src/components/shared/__tests__/ImportModal.test.tsx`.

---

### Phase 3 — Module Bibliothèque

#### 3.1 Grille d'Images Réelle ✅ COMPLET
- **Implémenté** : `src/components/library/GridView.tsx` utilise `useVirtualizer` de `@tanstack/react-virtual@^3.13.18`. `src/components/library/LazyLoadedImageCard.tsx` avec intersection observer. `src/hooks/useCatalog.ts` pour chargement SQLite. Tris, filtres rating/flag.
- **Tests** : `GridView.test.tsx`, `GridView.performance.test.tsx`, `LazyLoadedImageCard.test.tsx`.

#### 3.2 Collections Statiques CRUD ✅ COMPLET
- **Implémenté** : `src/stores/collectionStore.ts`, composants `CollectionItem.tsx`, `NewCollectionInput.tsx` dans `src/components/sidebar/`. Opérations create/rename/delete/get persistées en SQLite.
- **Tests** : `src/stores/__tests__/collectionStore.test.ts`, tests composants sidebar.

#### 3.2b Drag & Drop ✅ COMPLET
- **Implémenté** : `src/components/library/LazyLoadedImageCard.tsx` (dragstart), `src/components/layout/LeftSidebar.tsx` (drop sur collections). MultiSelect via `uiStore.selection`.
- **Tests** : `src/components/library/__tests__/GridViewDragDrop.test.tsx`, `src/components/layout/__tests__/LeftSidebarDragDrop.test.tsx`.

#### 3.3 Smart Collections ✅ COMPLET
- **Implémenté** : `src/components/library/SmartCollectionBuilder.tsx`, `src-tauri/src/services/smart_query_parser.rs`. Parser JSON → SQL WHERE clause. Résultats via `get_smart_collection_results`.
- **Tests** : `SmartCollectionBuilder.test.tsx`, `src/components/sidebar/__tests__/SmartCollectionItem.test.tsx`.

#### 3.4 Navigateur de Dossiers ✅ COMPLET
- **Implémenté** : `src/components/library/FolderTree.tsx`, `src/stores/folderStore.ts`. Arborescence récursive, compteurs d'images, indicateur volume online/offline.
- **Tests** : `src/stores/__tests__/folderStore.test.ts`, `src/hooks/__tests__/useDiscovery.test.ts`.

#### 3.5 Recherche & Filtrage ✅ COMPLET
- **Implémenté** : `src/components/library/SearchBar.tsx`, `src/lib/searchParser.ts` (parseur syntaxe `star:5`, `iso:>1600`), `src/services/searchService.ts`, `src-tauri/src/services/search.rs`, commande `search_images`.
- **Tests** : `SearchBar.test.tsx`, `src/lib/__tests__/searchParser.test.ts`, `src/services/__tests__/searchService.test.ts`.

---

### Phase 4 — Rendering & Édition

#### 4.1 Event Sourcing Engine ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/event_sourcing.rs`, `src-tauri/src/models/event.rs` (14 variants EventType, EventPayload, TargetType), migration `005_event_sourcing.sql`. 4 commandes : `append_event`, `get_events`, `get_edit_events`, `replay_events`. Frontend : `src/services/eventService.ts`, `src/stores/editStore.ts`.
- **Tests** : 1 test Rust dans `event_sourcing.rs` (minimal) + `src/services/__tests__/eventService.test.ts` + `src/stores/__tests__/editStore.test.ts`.

#### 4.2 Pipeline de Rendu Image ⚠️ PARTIEL (score 80%)
- **Phase A (CSS Filters) ✅** : `src/services/renderingService.ts` — `eventsToCSSFilters()`, `applyCSSFilters()`, `eventsToPixelFilters()`. Normalization eventType (camelCase/snake_case). Fonctionnel.
- **Phase B (WASM Pixel Processing) ✅ code présent** :
  - Crate WASM séparée : `luminafast-wasm/src/{lib.rs, image_processing.rs}` avec `apply_filters()`, `compute_histogram_from_pixels()`, bindings wasm-bindgen
  - Service TS : `src/services/wasmRenderingService.ts` — `loadWasmModule()`, `renderWithWasm()`, `hasWasmSupport()`, fallback gracieux sur CSS
  - Hook : `src/hooks/useWasmCanvasRender.ts`
  - Composant : `src/components/library/PreviewRenderer.tsx` — toggle `useWasm=true` + `<canvas>` + fallback
- **Gap critique** : **Aucun artefact `.wasm` dans `public/`**. `npm run wasm:build` (via wasm-pack) doit être exécuté pour produire `public/luminafast_wasm_bg.wasm` + `public/luminafast_wasm.js`. Sans cet artefact, `wasmRenderingService` tombera systématiquement sur le fallback CSS (mode dégradé). Le fallback est correctement implémenté mais la fonctionnalité WASM ne s'active jamais en production actuelle.
- **Tests** : `src/components/__tests__/PreviewRenderer.test.tsx`, `src/services/__tests__/wasmRenderingService.test.ts`, `src/services/__tests__/renderingService.test.ts`.

#### 4.3 Historique & Snapshots ✅ COMPLET
- **Implémenté** : `src/components/develop/HistoryPanel.tsx` (chargement snapshots, restore, delete), `src/components/develop/SnapshotModal.tsx`, `src-tauri/src/services/snapshot_service.rs`, migration `006_snapshots.sql`. 5 commandes Tauri : `create_snapshot`, `get_snapshots`, `get_snapshot`, `delete_snapshot`, `rename_snapshot`. `src/services/snapshotService.ts`. Intégré dans `RightSidebar.tsx`.
- **Tests** : 5 tests Rust dans `snapshot_service.rs` + `src/services/__tests__/snapshotService.test.ts`, `src/components/develop/__tests__/HistoryPanel.test.tsx`.

#### 4.4 Before/After Comparison ✅ COMPLET
- **Implémenté** : `src/components/develop/BeforeAfterComparison.tsx` (routeur de modes), `SplitViewComparison.tsx`, `OverlayComparison.tsx`, `SideBySideComparison.tsx`. 3 modes fonctionnels. Intégré dans `DevelopView.tsx` via `showBeforeAfter` prop. États dans `uiStore` (`comparisonMode`, `splitViewPosition`, `overlayOpacity`).
- **Tests** : 4 fichiers de tests de comparaison (`BeforeAfterComparison.test.tsx`, `SplitViewComparison.test.tsx`, `OverlayComparison.test.tsx`, `SideBySideComparison.test.tsx`), `DevelopView.integration.test.tsx`.

---

### Phase 5 — Métadonnées & Tags

#### 5.1 Panneau EXIF Connecté ✅ COMPLET
- **Implémenté** : `src/components/metadata/ExifGrid.tsx` (affichage tabulaire), `src/components/metadata/Histogram.tsx` (histogramme WASM via `compute_histogram`), `src/hooks/useExif.ts` (chargement async avec conversion shutter_speed log2→string), `src/hooks/useLazyImageMeta.ts`. Intégré dans `RightSidebar.tsx`. Histogramme WASM dans `luminafast-wasm/src/image_processing.rs` (`compute_histogram_from_pixels`).
- **Tests** : `src/hooks/__tests__/useExif.test.ts` (20 tests), `src/hooks/__tests__/useLazyImageMeta.test.ts`.

#### 5.2 Tags Hiérarchiques ✅ COMPLET
- **Implémenté** : `src-tauri/src/commands/tags.rs` (7 commandes : `create_tag`, `get_all_tags`, `rename_tag`, `delete_tag`, `add_tags_to_images`, `remove_tags_from_images`, `get_image_tags`). `src/components/metadata/TagsPanel.tsx`, `src/stores/tagStore.ts`, `src/services/tagService.ts`. Tags hiérarchiques via `parent_id` (schéma 001_initial.sql table `tags`).
- **Tests** : 13 tests Rust dans `tags.rs` + `src/components/metadata/__tests__/TagsPanel.test.tsx` (11 tests) + `src/stores/__tests__/tagStore.test.ts` (32 tests) + `src/services/__tests__/tagService.test.ts` (20 tests).

#### 5.3 Rating & Flagging ✅ COMPLET (score 90%)
- **Implémenté** :
  - Backend : `update_image_state` dans `catalog.rs` (rating, flag, color_label). Schema `image_state` avec CHECK constraints.
  - Frontend filtres : `src/components/sidebar/QuickFilters.tsx` (filtre rating 1-5 + flag pick/reject), `src/stores/uiStore.ts` (`ratingFilter`, `flagFilter`). Intégré dans `LeftSidebar.tsx`.
  - Badges visuels : `src/components/library/ImageCard.tsx` affiche `image.state?.rating`, LazyLoadedImageCard.
  - Batch : `src/components/shared/BatchBar.tsx` a une section `/* Phase 5.3 — Batch rating compact */` avec UI rating/flag.
- **Gap notable** : Pas de commande Tauri `batch_update_image_state`. Les opérations batch de la BatchBar font des appels `update_image_state` séquentiels ou en boucle côté frontend. Pour des sélections volumineuses, cela représente un goulet de performance (N appels Tauri IPC vs 1 seul). Non bloquant fonctionnellement mais sous-optimal.
- **Tests** : `QuickFilters.test.tsx` (5 tests), `BatchBar.test.tsx` (13 tests).

#### 5.4 Sidecar XMP ✅ COMPLET
- **Implémenté** : `src-tauri/src/services/xmp.rs` (522 LOC) — lecture/écriture XMP, format Adobe (XML namespaces), tags hiérarchiques, compatibilité Lightroom. 3 commandes : `export_image_xmp`, `import_image_xmp`, `get_xmp_status`. `src/services/xmpService.ts`, `src/components/metadata/XmpPanel.tsx`.
- **Tests** : 16 tests Rust (cargo test xmp) + `src/services/__tests__/xmpService.test.ts` (13 tests) + `src/components/metadata/__tests__/XmpPanel.test.tsx`.

---

### Phases Maintenance Mid-Term (M.1.x - M.3.x)

#### M.1.1 / M.1.1a / M.1.2 / M.1.2a — Runtime & Async IO ✅ COMPLET
- `src-tauri/src/services/ingestion.rs` : plus de `Runtime::new()` en boucle (élimination bottleneck O(n))
- `src-tauri/src/services/metrics.rs` + `commands/metrics.rs` : `ThreadpoolMetrics`, commandes `get_threadpool_metrics` + `simulate_threadpool_load` enregistrées dans `lib.rs`
- Tokio v1.40 avec `rt-multi-thread`, `fs`, `io-util`, `macros`

#### M.1.3 — Nettoyage Code Mort ⚠️ PARTIEL
- `src/App.jsx.old` est toujours présent dans le répertoire `src/`. Ce fichier devrait être supprimé.

#### M.2.1a — Connection Pooling ✅ COMPLET
- `Cargo.toml` : `r2d2 = "0.8"`, `r2d2_sqlite = "0.24"`
- `src-tauri/src/types/db_context.rs` : `DbPoolMetrics` struct avec métriques complètes (total_connections, idle, in_use, acquire_count, etc.)

#### M.2.2 — Durcissement Sécurité ✅ COMPLET
- `src-tauri/src/services/security.rs` : `is_path_traversal_attempt()`, `normalize_path()`, `validate_path()`, `initialize_security_context()`, `validate_runtime_path()`
- Appelé dans `lib.rs` ligne 60 au setup
- Tests Rust dans `security.rs`

#### M.3.1 / M.3.2 / M.3.2a ✅ COMPLET
- `AppInitializer.tsx` extrait, `useAppShortcuts.ts` hook isolé
- `useLazyImageMeta.ts` pour lazy EXIF
- Composants sidebar extraits : `CollectionItem`, `SmartCollectionItem`, `QuickFilters`, `NewCollectionInput`

---

### Phases 6-8 — ❌ ABSENTES

Les phases 6 (Performance Avancée), 7 (Production-Ready), et 8 (Mode Déconnecté & Sync) ne sont **pas démarrées**. Aucun code, aucune dépendance, aucune migration n'existe pour :
- DuckDB / OLAP (Phase 6.2)
- Virtualisation avancée multi-colonnes (Phase 6.3)
- Cache multiniveau FlatBuffers (Phase 6.1)
- Packaging multi-plateforme signé (Phase 7.3)
- Accessibilité ARIA/WCAG (Phase 7.4)
- Smart Previews offline (Phase 8.1)
- Sync PouchDB/CouchDB (Phase 8.2)

---

## 4. Gap Analysis

### 🔴 BLOQUANT MVP

| # | Gap | Fichiers concernés | Impact |
|---|---|---|---|
| **B-1** | **Artefact WASM absent de `public/`** | `public/` (vide), `luminafast-wasm/src/` | Le rendu pixel WASM (Phase B) est inopérant. `wasmRenderingService.ts` retombe sur CSS filters (fallback). L'histogramme WASM (`Histogram.tsx`) peut aussi être affecté. Résolution : exécuter `npm run wasm:build` et committer les artefacts, ou les générer dans le pipeline CI. |

### 🟠 IMPORTANT

| # | Gap | Fichiers concernés | Impact |
|---|---|---|---|
| **I-1** | **CI/CD Linux-only** | `.github/workflows/ci.yml` | Phase 0.5 exigeait macOS + Windows + Linux. Seul `ubuntu-latest` est utilisé. Sans CI cross-platform, les régressions spécifiques à macOS/Windows ne sont pas détectées automatiquement. |
| **I-2** | **Pas de `batch_update_image_state` Tauri** | `src-tauri/src/commands/catalog.rs`, `src/components/shared/BatchBar.tsx` | Les opérations batch de rating/flag (Phase 5.3) utilisent `update_image_state` en boucle. Pour 100+ images sélectionnées, cela génère 100+ round-trips IPC. Non bloquant mais impacte les performances pour les grandes sélections. |
| **I-3** | **Event Sourcing tests Rust minimaux** | `src-tauri/src/services/event_sourcing.rs` | Seulement 1 test Rust dans `event_sourcing.rs`. Service critique (backbone de tout le système d'édition) sous-testé côté Rust. Tests TypeScript présents mais pas suffisants pour valider la persistence Rust. |

### 🟡 NICE-TO-HAVE / MINEUR

| # | Gap | Fichiers concernés | Impact |
|---|---|---|---|
| **M-1** | **`src/App.jsx.old` non supprimé** | `src/App.jsx.old` | Fichier mort de l'ancienne version JSX. Confusant pour les agents/développeurs. Phase M.1.3 incomplète. |
| **M-2** | **App.tsx encore volumineux (438 lignes)** | `src/App.tsx` | Après refactoring M.3.1, App.tsx reste à 438 lignes d'orchestration. Contient encore de la logique d'event dispatch significative. Fonctionnel mais plus difficile à maintenir. |
| **M-3** | **DevelopView ne montre pas HistoryPanel inline** | `src/components/develop/DevelopView.tsx` | `HistoryPanel` est dans `RightSidebar`, pas dans `DevelopView` directement. Architectural choice cohérente avec la sidebar droite, mais différent du layout originel du plan. |
| **M-4** | **Phases 6-8 entièrement absentes** | — | Fonctionnalités post-MVP (DuckDB, multi-plateforme complet, offline, sync) non démarrées. Attendu pour versions futures. |

---

## 5. Évaluation MVP

### Ce qui est FONCTIONNEL pour un MVP

| Fonctionnalité | État |
|---|---|
| Import de photos (découverte + ingestion + hachage BLAKE3) | ✅ Opérationnel |
| Catalogue SQLite avec EXIF, rating, flag, tags | ✅ Opérationnel |
| Grille virtualisée avec previews réelles | ✅ Opérationnel |
| Collections statiques + smart collections | ✅ Opérationnel |
| Arborescence de dossiers | ✅ Opérationnel |
| Recherche avancée (`iso:>1600 star:4`) | ✅ Opérationnel |
| Vue Develop avec sliders + CSS filters | ✅ Opérationnel |
| Before/After 3 modes (split/overlay/side-by-side) | ✅ Opérationnel |
| Historique d'édition + Snapshots nommés | ✅ Opérationnel |
| Panneau EXIF + Histogramme (fallback CSS si WASM non buildé) | ✅ Opérationnel |
| Tags hiérarchiques | ✅ Opérationnel |
| Quick Filters rating/flag | ✅ Opérationnel |
| Sidecar XMP (export/import) | ✅ Opérationnel |
| Sécurité path traversal | ✅ Opérationnel |

### Ce qui est ABSENT / BLOQUANT

| Fonctionnalité | État |
|---|---|
| Rendu pixel WASM (traitement avancé highlights/shadows/clarity) | ⚠️ Fallback CSS uniquement (artefact non compilé) |
| CI macOS + Windows | ❌ Linux-only |
| Packaging distributable signé multi-plateforme | ❌ Non implémenté |
| Optimisations avancées (DuckDB, cache multiniveau) | ❌ Phase 6, non démarré |
| Mode déconnecté / sync | ❌ Phase 8, non démarré |

### Ce qui peut être différé (post-MVP)

- Phases 6, 7, 8 complètes (optimisation, production-ready, sync)
- `batch_update_image_state` (optimisation performance, non bloquant)
- CI cross-platform (important pour la commercialisation, pas pour le MVP fonctionnel)

---

## 6. Recommandations

### Ordre de Priorité pour Atteindre MVP Distributable

#### Priorité 1 — Immédiat (résolution bloquant)
1. **Builder et intégrer les artefacts WASM** :
   - Exécuter `npm run wasm:build` (wasm-pack)
   - Committer `public/luminafast_wasm_bg.wasm` + `public/luminafast_wasm.js`
   - Ou : ajouter une étape `wasm:build` dans `ci.yml` avant `npm run build`
   - Vérifier que `wasmRenderingService.ts` charge le bon chemin

#### Priorité 2 — Court terme (qualité / robustesse)
2. **Supprimer `src/App.jsx.old`** : 1 ligne, impact immédiat sur la propreté du codebase
3. **Ajouter des tests Rust pour `event_sourcing.rs`** : service critique, 1 seul test actuel
4. **Ajouter `batch_update_image_state`** dans `catalog.rs` (INSERT OR REPLACE ... WHERE id IN (?)) pour les opérations batch de la BatchBar

#### Priorité 3 — Moyen terme (production-ready)
5. **CI cross-platform** : Ajouter jobs macOS (macos-latest) et Windows (windows-latest) dans `ci.yml` pour les PRs vers `main`
6. **Packaging Tauri multi-plateforme** : Configurer les signataires et bundles pour les 3 plateformes (Phase 7.3)
7. **Gestion d'erreurs & Recovery** (Phase 7.1) : Error boundaries React, retry logic Rust

#### Priorité 4 — Long terme (version commerciale)
8. **DuckDB + OLAP** (Phase 6.2) : Pour catalogues > 100K images
9. **Accessibilité WCAG** (Phase 7.4)
10. **Mode déconnecté + sync** (Phase 8.x)

### Estimation des Phases Restantes pour MVP Distributable

| Étape | Effort estimé |
|---|---|
| Build WASM + CI | 0.5 jour |
| Nettoyage + tests event_sourcing | 1 jour |
| batch_update_image_state | 0.5 jour |
| CI cross-platform | 1 jour |
| Packaging multi-plateforme (Phase 7.3) | 3-5 jours |
| Gestion d'erreurs (Phase 7.1) | 3-5 jours |
| **Total MVP distributable minimal** | **~2 semaines** |

---

## Appendice — Inventaire Technique

### Fichiers Rust présents (`src-tauri/src/`)

```
commands/  → catalog.rs, discovery.rs, event_sourcing.rs, exif.rs, filesystem.rs,
              hashing.rs, metrics.rs, mod.rs, preview.rs, search.rs, snapshots.rs,
              tags.rs, types.rs, xmp.rs
models/    → catalog.rs, collection.rs, discovery.rs, dto.rs, event.rs, exif.rs,
              filesystem.rs, hashing.rs, image.rs, mod.rs, preview.rs, snapshot.rs
services/  → blake3.rs, db_repository.rs, discovery.rs, event_sourcing.rs, exif.rs,
              filesystem.rs, image_processing.rs, ingestion.rs, iptc.rs, metrics.rs,
              preview.rs, search.rs, security.rs, smart_query_parser.rs, snapshot_service.rs,
              xmp.rs
types/     → db_context.rs, mod.rs
database.rs, lib.rs, main.rs
```

### Migrations SQLite (`src-tauri/migrations/`)
- `001_initial.sql` → tables images, folders, exif_metadata, collections, collection_images, image_state, tags, image_tags
- `002_ingestion_sessions.sql` → sessions d'ingestion
- `003_previews.sql` → mapping previews
- `004_add_folder_online_status.sql` → statut volume
- `005_event_sourcing.sql` → table events
- `006_snapshots.sql` → table edit_snapshots

### Fichiers TypeScript (services/stores/hooks)

**Services** : catalogService, discoveryService, eventService, exifService, filesystemService, hashingService, imageDataService, metricsService, previewService, renderingService, searchService, snapshotService, tagService, wasmRenderingService, xmpService

**Stores** : catalogStore, collectionStore, editStore, folderStore, systemStore, tagStore, uiStore

**Hooks** : useAppShortcuts, useCatalog, useDiscovery, useExif, useLazyImageMeta, useWasmCanvasRender

### Dépendances Clés

| Domaine | Dépendance | Version |
|---|---|---|
| Framework | Tauri | 2.9.1 |
| DB | rusqlite (SQLite bundled) | 0.31.0 |
| Hashing | blake3 | 1.5 |
| Async | tokio | 1.40 |
| Pool DB | r2d2 + r2d2_sqlite | 0.8 / 0.24 |
| EXIF | kamadak-exif | 0.6.1 |
| XML/XMP | quick-xml | 0.37 |
| File watch | notify | 7.0 |
| Parallel | rayon | 1.10 |
| Image | image crate | 0.25 |
| WASM | wasm-bindgen | 0.2 |
| Frontend | React + Zustand + @tanstack/react-virtual | 19 / latest / ^3.13 |
| Tests | Vitest + Testing Library | latest |
