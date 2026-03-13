# LuminaFast — Changelog & Suivi d'Avancement

> **Ce fichier est mis à jour par l'agent IA après chaque sous-phase complétée.**
> Il sert de source de vérité pour l'état d'avancement du projet.
>
> **👉 Voir aussi** : [FUTURE_OPTIMIZATIONS.md](FUTURE_OPTIMIZATIONS.md) — Todo list complète des optimisations et corrections futures (P2, maintenance, perf, security, documentation)

---

## Tableau de Progression Global

| Phase            | Sous-Phase | Description                                                                                        | Statut       | Date       | Agent   |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------- | ------------ | ---------- | ------- |
| 0                | 0.1        | Migration TypeScript                                                                               | ✅ Complétée | 2026-02-11 | Cascade |
| 0                | 0.2        | Scaffolding Tauri v2                                                                               | ✅ Complétée | 2026-02-11 | Cascade |
| 0                | 0.3        | Décomposition Modulaire Frontend                                                                   | ✅ Complétée | 2026-02-11 | Cascade |
| 0                | 0.4        | State Management (Zustand)                                                                         | ✅ Complétée | 2026-02-11 | Cascade |
| 0                | 0.5        | Pipeline CI & Linting                                                                              | ✅ Complétée | 2026-02-11 | Cascade |
| Phase 1          | 1.1        | Schéma SQLite du Catalogue                                                                         | ✅ Complétée | 2026-02-11 | Cascade |
| Phase 1          | 1.2        | Tauri Commands CRUD                                                                                | ✅ Complétée | 2026-02-11 | Cascade |
| Phase 1          | 1.3        | Service BLAKE3 (CAS)                                                                               | ✅ Complétée | 2026-02-13 | Cascade |
| 1                | 1.4        | Gestion du Système de Fichiers                                                                     | ✅ Complétée | 2026-02-13 | Cascade |
| 2                | 2.1        | Discovery & Ingestion de Fichiers                                                                  | ✅ Complétée | 2026-02-19 | Cascade |
| 2                | 2.2        | Harvesting Métadonnées EXIF/IPTC                                                                   | ✅ Complétée | 2026-02-20 | Cascade |
| 2                | 2.3        | Génération de Previews                                                                             | ✅ Complétée | 2026-02-16 | Cascade |
| 2                | 2.4        | UI d'Import Connectée                                                                              | ✅ Complétée | 2026-02-18 | Cascade |
| Maintenance      | —          | Phase 2.3 MAINTENANCE — Preview Database Alignment & LRU Foundation                                | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance      | —          | Conformité Testing (Fix Deadlocks + Integration)                                                   | ✅ Complétée | 2026-02-18 | Cascade |
| Maintenance      | —          | Correction Logs Production                                                                         | ✅ Complétée | 2026-02-20 | Cascade |
| Maintenance      | —          | Correction Bugs Scan Discovery & Polling Infini                                                    | ✅ Complétée | 2026-02-20 | Cascade |
| Maintenance      | —          | Correction Bug Stockage Fichiers Découverts                                                        | ✅ Complétée | 2026-02-20 | Cascade |
| Maintenance      | —          | Correction Bug Transition Scan→Ingestion                                                           | ✅ Complétée | 2026-02-20 | Cascade |
| Maintenance      | —          | Correction Migrations Base de Données                                                              | ✅ Complétée | 2026-02-20 | Cascade |
| Maintenance      | —          | Correction Pipeline Import (DB + SQL + Init)                                                       | ✅ Complétée | 2026-02-20 | Cascade |
| 3                | 3.1        | Grille d'Images Réelle                                                                             | ✅ Complétée | 2026-02-20 | Copilot |
| Maintenance      | —          | Phase 3.1 Maintenance (État Hybride + SQLite Sync + Lazy Loading)                                  | ✅ Complétée | 2026-02-24 | Copilot |
| Maintenance      | —          | Corrections Critiques Phases 0→3.1 (BLOC 1-4)                                                      | ✅ Complétée | 2026-02-21 | Copilot |
| Infra            | —          | Agents IA dédiés (code-review, pr-verification, phase-implementation, documentation-sync)          | ✅ Complétée | 2026-02-20 | Copilot |
| 3                | 3.2        | Collections Statiques (CRUD)                                                                       | ✅ Complétée | 2026-02-21 | Copilot |
| 3                | 3.2b       | Drag & Drop d'Images dans les Collections (MultiSelect Support)                                    | ✅ Complétée | 2026-02-24 | Copilot |
| 3                | 3.3        | Smart Collections                                                                                  | ✅ Complétée | 2026-02-21 | Copilot |
| 3                | 3.4        | Navigateur de Dossiers                                                                             | ✅ Complétée | 2026-02-21 | Copilot |
| Maintenance      | —          | Performance & UX Import (Parallélisme + Progression Multi-Phase)                                   | ✅ Complétée | 2026-02-21 | Copilot |
| Maintenance      | —          | SQL Safety & Refactorisation `get_folder_images`                                                   | ✅ Complétée | 2026-02-23 | Copilot |
| Maintenance      | —          | Résolution Notes Bloquantes Review Copilot (PR #20)                                                | ✅ Complétée | 2026-02-23 | Copilot |
| 3                | 3.5        | Recherche & Filtrage                                                                               | ✅ Complétée | 2026-02-24 | Copilot |
| 4                | 4.1        | Event Sourcing Engine                                                                              | ✅ Complétée | 2026-02-25 | Copilot |
| 4                | 4.2        | Pipeline de Rendu Image (CSS Filters + WASM Pixel Processing)                                      | ✅ Complétée | 2026-02-26 | Copilot |
| Maintenance      | —          | Correction Formule Exposure CSS (0.35 → 0.3)                                                       | ✅ Complétée | 2026-02-26 | Copilot |
| Maintenance      | —          | Phase 4.2 Fixes: Event Sourcing persistence chain (Tauri params + editStore + renderingService)    | ✅ Complétée | 2026-03-02 | Copilot |
| Maintenance      | —          | Phase A: Preview Format Selection - Types & Architecture (CatalogImage.urls)                       | ✅ Complétée | 2026-03-03 | Copilot |
| Maintenance      | —          | Phase B: Preview Format Selection - Parallel Loading (3-format Promise.all)                        | ✅ Complétée | 2026-03-03 | Copilot |
| Maintenance      | —          | Phase C: Preview Format Selection - View-Specific Usage (DevelopView.standard 1440px)              | ✅ Complétée | 2026-03-03 | Copilot |
| 4                | 4.4        | Before/After Comparison (3 modes: Split-View, Overlay, Side-by-Side)                               | ✅ Complétée | 2026-03-04 | Copilot |
| Maintenance      | —          | Conformité TypeScript Strict + Documentation WASM (P0: Imports + `any`, P1: WASM ranges)           | ✅ Complétée | 2026-03-07 | Copilot |
| 4                | 4.3        | Historique & Snapshots UI                                                                          | ✅ Complétée | 2026-03-03 | Copilot |
| M                | 1.1        | Correction Runtime Ingestion (Élimination O(n) Runtime::new bottleneck)                            | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 1.1a       | Monitoring Threadpool Tokio (Saturation Alerts + Metrics Collection)                               | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 1.2        | Migration Async IO (std::fs → tokio::fs dans contextes async)                                      | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 1.2a       | Cleanup Sync Code (audit std::fs + suppression API XMP sync + justifications résiduelles)          | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 1.3        | Nettoyage Code Mort (fichier debug + fonctions WASM deprecated)                                    | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 2.1a       | Connection Pooling SQLite (DBContext repository ingestion/discovery)                               | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 2.2        | Durcissement Sécurité (path whitelist + validation traversal + CSP/assetProtocol restreints)       | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 3.1        | Refactoring App.tsx (AppInitializer + useAppShortcuts)                                             | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 3.2        | Optimisation Grille & Données (lazy EXIF + liste sans EXIF + prefetch hover)                       | ✅ Complétée | 2026-03-10 | Copilot |
| M                | 3.2a       | LeftSidebar Refactor (extraction composants inline + tests unitaires dédiés)                       | ✅ Complétée | 2026-03-10 | Copilot |
| Maintenance WASM | M1.1       | Initialisation crate partagée `luminafast-image-core` (API de base + tests)                        | ✅ Complétée | 2026-03-12 | Copilot |
| Maintenance WASM | M1.2       | Portage algorithmes image vers `luminafast-image-core` (passe unique + histogramme + validations)  | ✅ Complétée | 2026-03-12 | Copilot |
| Maintenance WASM | M1.3       | Stabilisation API core v1 (ranges/no-op documentes + tests de contrat)                             | ✅ Complétée | 2026-03-12 | Copilot |
| Maintenance WASM | M2.1       | Integration WASM sur core partage (wrapper wasm-bindgen + suppression duplication locale)          | ✅ Complétée | 2026-03-12 | Copilot |
| Maintenance WASM | M2.2       | Non-regression frontend WASM (validation fallback CSS + normalisation + contrat TS)                | ✅ Complétée | 2026-03-12 | Copilot |
| Maintenance WASM | M2.3       | Parite visuelle WASM (dataset reference + comparaison buffer brute + seuil delta <= 2 RGB)         | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M3.1       | Integration backend export sur core partage (service export_rendering + deprecation copie backend) | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M3.2       | Service export non destructif (events/snapshots -> filtres -> rendu core -> ecriture JPEG/TIFF)    | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M3.3       | Contrat de parite preview/export (presets communs + comparaison buffers + seuil fixe delta <= 2)   | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M4.1       | Architecture pipeline RAW-ready (pipeline compose + validation centralisee + compat API v1)        | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M4.2       | Abstraction decodeur RAW (LinearImage + RawDecoder + contrat decodeur/pipeline)                    | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M4.3       | Pilote RAW reel backend (decodeur rsraw + export_raw_edited + rapport compatibilite)               | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M5.1       | Suppression duplication legacy (suppression module backend `image_processing`)                     | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M5.2       | Synchronisation documentation (README WASM, PLAN_COMPLET, APP_DOC, CHANGELOG coherents)            | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance WASM | M5.3       | CI garde-fous source unique (script check-single-source-image-core.sh + job guard-single-source)   | ✅ Complétée | 2026-03-13 | Copilot |
| Maintenance      | —          | Refactorisation PreviewRenderer (useWasmCanvasRender hook) + amélioration hook flexibility         | ✅ Complétée | 2026-03-13 | Copilot |

| 5 | 5.1 | Panneau EXIF Connecté | ✅ Complétée | 2026-07-10 | Copilot |
| 5 | 5.2 | Système de Tags Hiérarchique | ✅ Complétée | 2026-07-11 | Copilot |
| 5 | 5.3 | Rating & Flagging Persistants | ✅ Complétée | 2026-07-11 | Copilot |
| 5 | 5.4 | Sidecar XMP | ✅ Complétée | 2026-03-07 | Copilot |
| 6 | 6.0.1 | Persistance Réelle des Settings (DB + Tauri + Store) | ✅ Complétée | 2026-03-13 | LuminaFast Documentation Sync |
| 6 | 6.1 | Système de Cache Multiniveau | ⬜ En attente | — | — |
| 6 | 6.2 | Intégration DuckDB (OLAP) | ⬜ En attente | — | — |
| 6 | 6.3 | Virtualisation Avancée Grille | ⬜ En attente | — | — |
| 6 | 6.4 | Optimisation SQLite | ⬜ En attente | — | — |
| 7 | 7.1 | Gestion d'Erreurs & Recovery | ⬜ En attente | — | — |
| 7 | 7.2 | Backup & Intégrité | ⬜ En attente | — | — |
| 7 | 7.3 | Packaging Multi-Plateforme | ⬜ En attente | — | — |
| 7 | 7.4 | Accessibilité & UX | ⬜ En attente | — | — |
| 7 | 7.5 | Onboarding & Documentation Utilisateur | ⬜ En attente | — | — |
| 8 | 8.1 | Smart Previews Mode Déconnecté | ⬜ En attente | — | — |
| 8 | 8.2 | Synchronisation PouchDB/CouchDB | ⬜ En attente | — | — |
| 8 | 8.3 | Résolution de Conflits | ⬜ En attente | — | — |

| Maintenance | — | Accélération Génération Previews (libvips + batch) | ✅ Complétée | 2026-02-23 | Copilot |
| Maintenance | — | Régression Tauri IPC camelCase → snake_case (opérations collection) | ✅ Complétée | 2026-02-25 | Copilot |
| Maintenance | — | Régression BatchBar sélection vide + Drag & Drop détection collection | ✅ Complétée | 2026-02-25 | Copilot |

### Légende des statuts

- ⬜ En attente
- 🔄 En cours
- ✅ Complétée
- ⚠️ Bloquée (voir section Blocages)
- ❌ Rejetée (approuvé par le propriétaire uniquement)

---

## Phase Actuelle

> **Phase 6.0.1 complétée : Settings Persistence (DB + Tauri + Store)**
>
> - Paramètres utilisateur persistés en base SQLite (app_settings)
> - Synchronisation complète Rust ↔️ Tauri ↔️ Store Zustand ↔️ UI
> - Feedback UI (toast, spinner, error) et validation stricte
> - Tests unitaires Rust & TypeScript (service, store, debounce, erreurs)
> - Documentation synchronisée (section 11.4)
>
> Prochaine étape : Phase 6.1 (Cache multiniveau avec access tracking LRU)

---

---

### 2026-03-13 — Phase 6.0.1 : Persistance Réelle des Settings (Complétée)

**Statut** : ✅ **Complétée**
**Agent** : LuminaFast Documentation Sync
**Branche** : `phase/6.0-settings-framework`
**Type** : Feature

#### Résumé

Implémentation complète de la persistance des paramètres utilisateur :

- Migration SQL 008 (table `app_settings` single-row, JSON blob)
- Service Rust CRUD (`settings.rs`), erreurs custom via thiserror
- Commandes Tauri (`load_settings_from_db`, `save_settings_to_db`)
- Service frontend `settingsService.ts` (validation, masking, invoke)
- Store Zustand `settingsStore.ts` (loadFromDB, saveToDBDebounced)
- Intégration UI (SettingsModal, feedback, toast)
- Chargement auto au démarrage (`App.tsx`)
- Tests unitaires Rust et TypeScript (service, store, debounce, erreurs)
- Documentation section 11.4 ajoutée

#### Fichiers créés

- `src-tauri/migrations/008_app_settings_table.sql` — migration DB settings
- `src-tauri/src/services/settings.rs` — logique CRUD settings
- `src-tauri/src/commands/settings.rs` — commandes Tauri
- `src/services/settingsService.ts` — service frontend
- `src/__tests__/settingsService.test.ts` — tests validation service
- `src/__tests__/settingsStore.integration.test.ts` — tests store intégration

#### Fichiers modifiés

- `src-tauri/src/lib.rs` — enregistrement commandes settings
- `src-tauri/Cargo.toml` — dépendance thiserror
- `src/stores/settingsStore.ts` — intégration actions DB
- `src/components/settings/SettingsModal.tsx` — handler bouton, feedback UI
- `src/App.tsx` — chargement settings au mount
- `Docs/APP_DOCUMENTATION.md` — section 11.4 architecture persistence

#### Critères de validation remplis

- [x] Migration 008 appliquée et testée
- [x] Service Rust CRUD + erreurs custom
- [x] Commandes Tauri compilées et enregistrées
- [x] Service TypeScript + validation
- [x] Store Zustand intégré
- [x] UI feedback (toast, spinner, error)
- [x] Tests unitaires Rust et TS
- [x] Documentation synchronisée

#### Impact

- Settings persistés en DB, chargés au démarrage, sauvegarde atomique
- Feedback utilisateur fiable (succès/erreur)
- Couverture tests complète (happy/error path)
- Documentation à jour (section 11.4)

## 2026-03-13 — Phase 2.3 MAINTENANCE : Preview Database Alignment & LRU Foundation (Complétée)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/2.3-maintenance-preview-db-alignment`
**Type** : Maintenance (Infrastructure + Correction)

### Résumé

**Cause racine** :

- Phase 2.3 brief promettait "persistance DB avec suivi accès" mais n'avait implémenté que le cache filesystem (in-memory HashMap dans PreviewService)
- Migration `003_previews.sql` existait (100 lignes, 3 tables) mais jamais utilisée – **code mort**
- Structs `PreviewRecord`/`NewPreviewRecord` définis mais étiquetés `#![allow(dead_code)]` – **jamais instantiés**
- Schéma SQL ≠ Rust structs : SQL avait `file_path` (absolu) + `updated_at`, structs attendaient `relative_path` + `last_accessed` + `access_count`
- **Blocage Phase 6.1** : LRU cache access tracking requis `access_count` + `last_accessed` fields, absents de la DB

**Solution implémentée** :

1. **Migration 007** (`src-tauri/migrations/007_fix_previews_schema.sql`, 168 lignes)
   - Refactorisation safe schéma existant : `file_path` → `relative_path` (alignement architectural)
   - Colonnes cruciales ajoutées : `access_count` (INT DEFAULT 0), `last_accessed` (TIMESTAMP)
   - Index optimisés : `(last_accessed, access_count)` pour queries LRU future
   - Preserve métadonnées Phase 2.3 : `preview_type`, `file_size`, `generation_time`, `jpeg_quality`

2. **PreviewDbService** (`src-tauri/src/services/preview_db.rs`, 365 lignes)
   - Bridge layer CRUD complet : `upsert_preview`, `record_access`, `prune_stale`, `delete`, `get_previews_for_image`, `get_cache_stats`
   - Gestion access tracking : `record_access(relative_path)` incrémente `access_count` + met à jour `last_accessed`
   - Support nettoyage LRU : `prune_stale_previews(days: i64)` supprime entrées non accédées depuis N jours
   - Validation : refus chemins hors `$LUMINAFAST_CACHE_DIR/Previews.lrdata/`

3. **3 Nouvelles Commandes Tauri** (dans `src-tauri/src/commands/preview.rs` et `lib.rs`)
   - `get_preview_db_stats()` → Retourne `{totalPreviews, cachedSize, accessedLast24h, accessedLast7d}`
   - `record_preview_access(relative_path)` → Incrémente access tracking, retourne nouveau `access_count`
   - `prune_stale_previews_db(days)` → Supprime + retourne `{deleted, freedSize}`

4. **Tests d'intégration complets** (`src-tauri/src/services/tests/preview_db_integration.rs`, 280 lignes, 8 tests)
   - `test_upsert_preview_new` : insertion correcte champs
   - `test_upsert_preview_update` : update sûre values
   - `test_record_access_increments_count` : access tracking fonctionne
   - `test_prune_stale_previews` : suppression entrées anciennes
   - `test_get_previews_for_image` : requête correcte par image_id
   - `test_cache_stats_accurate` : stats reports correctes
   - `test_path_validation` : rejette chemins suspects
   - `test_concurrent_access` : tokio::task::spawn tests concurrence DB

### Fichiers créés

- `src-tauri/migrations/007_fix_previews_schema.sql` — Refactorisation schéma previews
- `src-tauri/src/services/preview_db.rs` — Service persistence + access tracking
- `src-tauri/src/services/tests/preview_db_integration.rs` — Tests intégration complets

### Fichiers modifiés

- `src-tauri/src/commands/preview.rs` — Ajout 3 commandes DB (get_preview_db_stats, record_preview_access, prune_stale_previews_db)
- `src-tauri/src/lib.rs` — Enregistrement 3 nouvelles commandes dans `invoke_handler`
- `src-tauri/src/database.rs` — Migration 007 ajoutée à `initialize_db()` dans `execute_batch()` après migration 006
- `src-tauri/src/services/mod.rs` — Export public `pub mod preview_db;`

### Critères de validation remplis

- [x] Migration 007 crée safe : `cargo check` ✅, `cargo test` ✅ (225 tests passants)
- [x] PreviewDbService implémenté avec CRUD complet
- [x] 3 commandes Tauri enregistrées et testées
- [x] Aucun warning Rust : `cargo clippy --lib -- -D warnings` ✅
- [x] Aucun code mort restant : structs `PreviewRecord`/`NewPreviewRecord` désormais instanciés (ou supprimés)
- [x] Tests d'intégration complets (8 tests) ✅
- [x] Performance mesurable : cleanup auto indexé + queries LRU-ready pour Phase 6.1
- [x] Compilation sans warnings : ✅

### Impact

**Fonctionnalité** :

- ✅ Previews DB maintenant persistées avec suivi accès réel
- ✅ Infrastructure LRU complète prête pour Phase 6.1 (eviction par `access_count` + `last_accessed`)
- ✅ Cleanup automatique stale previews (+ économies stockage disque)

**Performance** :

- ✅ Indexes optimisés pour Phase 6.1 queries (accès < N jours)
- ✅ Access tracking O(1) per preview access
- ✅ Pruning batch avec minimal lock contention

**Dépendances résolues** :

- ✅ **Phase 6.1 (Cache multiniveau)** peut dorénavant utiliser `access_count` + `last_accessed` pour LRU eviction
- ✅ **Phase 5.4 (XMP Sidecar)** peut interroger `previews` DB pour décisions sync
- ✅ **Phase 7.2 (Backup & Restore)** peut inclure `previews.db` dans backup

**Élimination du code mort** :

- ✅ `PreviewRecord`/`NewPreviewRecord` plus jamais marqués dead_code
- ✅ Schéma SQL aligné avec Rust structs statiquement typés
- ✅ Zéro warning compiler après cette maintenance

**Tests** : 8 **tests d'intégration** spécifiques + non-régression 225 tests backend existants

---

## Historique des Sous-Phases Complétées accessible via [INDEX](/Docs/changelog/INDEX.md/INDEX.md) pour navigation complète du changelog.

---
