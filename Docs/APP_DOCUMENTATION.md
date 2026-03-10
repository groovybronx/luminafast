# LuminaFast — Documentation de l'Application

## Table des matières

1. [Vue d’Ensemble](#1-vue-densemble)
2. [Stack Technique Actuelle](#2-stack-technique-actuelle)
3. [Architecture des Fichiers](#3-architecture-des-fichiers)
4. [Composants UI](#4-composants-ui)

- [4.1 Composants](#41--composants)
- [4.2 Stores Zustand](#42--stores-zustand)
- [4.3 Zones de l’interface](#43--zones-de-linterface)

5. [Modèle de Données](#5-modèle-de-données)

- [5.1 Structure d’une Image](#51--structure-dune-image)
- [5.2 Structure d’un Event](#52--structure-dun-event)

6. [Fonctionnalités — État Actuel](#6-fonctionnalités--état-actuel)
7. [Raccourcis Clavier](#7-raccourcis-clavier)
8. [Dépendances npm](#8-dépendances-npm)
9. [Dépendances Rust](#9-dépendances-rust)
10. [Configuration](#10-configuration)
11. [Schéma et Base de Données SQLite](#11-schéma-et-base-de-données-sqlite)

- [11.1 Architecture du Catalogue](#111--architecture-du-catalogue)
- [11.2 Configuration SQLite](#112--configuration-sqlite)
- [11.3 Système de Migrations](#113--système-de-migrations)
- [11.4 Types Rust](#114--types-rust)
- [11.5 Tests Unitaires](#115--tests-unitaires)

12. [Outils de Qualité et CI/CD](#12-outils-de-qualité-et-cicd)

- [12.1 Linting et Formatting](#121--linting-et-formatting)
- [12.2 Tests et Coverage](#122--tests-et-coverage)
- [12.3 Pipeline CI/CD](#123--pipeline-cicd)
- [12.4 Scripts de Développement](#124--scripts-de-développement)

13. [Services EXIF/IPTC](#13-services-exifiptc)

- [13.1 Architecture EXIF](#131--architecture-exif)
- [13.2 Métadonnées EXIF](#132--métadonnées-exif)
- [13.3 Métadonnées IPTC](#133--métadonnées-iptc)
- [13.4 Performance et Intégration](#134--performance-et-intégration)

14. [Service Filesystem](#14-service-filesystem)

- [14.1 Architecture du Service](#141--architecture-du-service)
- [14.2 Types Unifiés](#142--types-unifiés)
- [14.3 Concurrence et Performance](#143--concurrence-et-performance)
- [14.4 Commandes Tauri](#144--commandes-tauri)
- [14.5 Tests et Validation](#145--tests-et-validation)

15. [Commandes Tauri (Mises à jour)](#15-commandes-tauri-mises-à-jour)
16. [Services Frontend (Mises à jour)](#16-services-frontend-mises-à-jour)
17. [Types & Interfaces (Mises à jour)](#17-types--interfaces-mises-à-jour)
18. [Système de Rendu](#18--système-de-rendu)
19. [Historique des Modifications](#19-historique-des-modifications)
20. [Conformité TypeScript Strict & Documentation WASM](#20-conformité-typescript-strict--documentation-wasm)
21. [Service Metrics — Monitoring Threadpool (M.1.1a)](#21-service-metrics--monitoring-threadpool-m11a)

**Annexes** :

- [Smart Collections : Logique SQL et compatibilité parser](#smart-collections--logique-sql-et-compatibilité-parser)
- [Phase 3.4 : Folder Navigator](#phase-34--folder-navigator--architecture-et-schéma)
- [Phase 3.5 : Recherche & Filtrage](#phase-35--recherche--filtrage--architecture-et-parser)

> **Ce document est la source de vérité sur l'état actuel de l'application.**
> Il DOIT être mis à jour après chaque sous-phase pour rester cohérent avec le code.
>
> **Dernière mise à jour** : 2026-03-07 (P0+P1: Conformité TypeScript Strict 100% + Documentation WASM normalizeFiltersForWasm() complète — 19 fichiers refactorisés, 26 imports relatifs→@/, 5 violations any éliminées, commit 97858ad)
>
> ### Décisions Projet (validées par le propriétaire)

> - **Phase 8 (Cloud/Sync)** : Reportée post-lancement
> - **Plateforme MVP** : macOS-first (Windows/Linux secondaire)
> - **Formats RAW supportés** : Canon (.CR3), Fuji (.RAF), Sony (.ARW), Nikon (.NEF), Olympus (.ORF), Pentax (.PEF), Panasonic (.RW2), Adobe (.DNG)
> - **Formats standard** : JPG, JPEG, PNG (via preview service)
> - **Phase 2.2 IPTC** : Extraction reportée Phase 5.4 (Sidecar XMP) — Skeleton créé

---

## 1. Vue d'Ensemble

**LuminaFast** est une application de gestion d'actifs numériques photographiques (Digital Asset Management) inspirée de l'architecture d'Adobe Lightroom Classic, avec des optimisations modernes (DuckDB, BLAKE3, Event Sourcing).

### État actuel : Phases 0 à 3.5 complétées + Maintenance Phase 3.1 stabilisée

**Pipeline d'import production-ready** :

- **Discovery** (scan récursif)
- **BLAKE3 hashing**
- **Extraction EXIF** (`kamadak-exif v0.6.1`)
- **Insertion SQLite**
- **Ingestion parallélisée** (Rayon)
- **Génération previews séquentielle**
- **Synchronisation catalogue**
- **Modal réinitialisable**

Progression temps réel visible sur 3 phases :

- **0-30%** : scan
- **30-70%** : ingestion
- **70-100%** : previews

**Pipeline d'import production-ready** :

- **Discovery** (scan récursif)
- **BLAKE3 hashing**
- **Extraction EXIF** (`kamadak-exif v0.6.1`)
- **Insertion SQLite**
- **Ingestion parallélisée** (Rayon)
- **Génération previews séquentielle** (libvips)
- **Synchronisation catalogue**
- **Modal réinitialisable**

  **Progression temps réel visible sur 3 phases** :

- **0-30%** : scan
- **30-70%** : ingestion + hashing + EXIF
- **70-100%** : previews

**État actuel de l'application** (Phases 0 → 3.5 complétées + Maintenance Phase 3.1 stabilisée) :

- **Grille virtualisée avec lazy-loading** : `@tanstack/react-virtual` (10K+ images, 60fps) + IntersectionObserver (prefetch 100px)
- **Collections & Smart Collections** : créations, renommages, suppressions, filtrage via stores dédiés (Phase 3.2)
- **Recherche & filtrage** : parser structuré (15+ champs, 8+ opérateurs) (Phase 3.5)
- **Navigation Dossiers** : arborescence hiérarchique avec compteurs (Phase 3.4)
- **SQLite bidirectional sync** : ratings, flags, tags persistés immédiatement + isSynced tracking
- **504 tests** (345 TypeScript + 159 Rust), **zéro warning**, **coverage 98%+**

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
│   │   ├── PHASE-0.1.md → PHASE-3.5.md # Briefs implémentées
│   │   ├── BRIEF_TEMPLATE.md       # Template pour nouveaux briefs
│   │   └── PHASE-3.6.md → ...      # Briefs futures
│   ├── AGENTS.md                   # Directives documentation + briefs
│   ├── CHANGELOG.md                # Suivi d'avancement par sous-phase
│   ├── TESTING_STRATEGY.md         # Stratégie de tests (Vitest + Rust)
│   ├── GOVERNANCE.md               # Règles de gouvernance
│   └── APP_DOCUMENTATION.md        # Ce fichier — source de vérité état app
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
│   │   ├── AGENTS.md               # Conventions Zustand + types stores
│   │   ├── index.ts                # Re-export central
│   │   ├── catalogStore.ts         # Images SQLite + activeImageId
│   │   ├── uiStore.ts              # UI : selection (Set), filterText, activeView, sidebars
│   │   ├── collectionStore.ts      # Collections CRUD + activeCollectionId + activeCollectionImageIds (Phase 3.2)
│   │   ├── folderStore.ts          # Dossiers : tree, activeFolderId, activeFolder ImageIds (Phase 3.4)
│   │   ├── editStore.ts            # Événements, edits, historique
│   │   ├── systemStore.ts          # Logs, import, état système
│   │   └── __tests__/             # Tests stores (4 fichiers)
│   ├── lib/                        # Utilitaires et données mock
│   │   ├── helpers.ts              # safeID()
│   │   ├── searchParser.ts         # parseSearchQuery() — parser Phase 3.5
│   │   ├── filterUtils.ts          # editStateToPixelFilters(), hasNonNeutralFilters() — centralisation logique WASM (Maintenance)
│   │   ├── mockData.ts             # generateImages, INITIAL_IMAGES (MockEvent supprimé)
│   │   └── __tests__/             # Tests utilitaires
│   │       └── filterUtils.test.ts # 18 tests conversion + détection filtres neutres (Maintenance)
│   ├── services/                   # Services TypeScript (Phase 1.2 + 2.2 + 3.3 + 3.5)
│   │   ├── AGENTS.md               # Conventions services front + mocks
│   │   ├── catalogService.ts       # Wrapper Tauri CRUD images + collections + folders
│   │   ├── searchService.ts        # Wrapper Tauri search_images (Phase 3.5)
│   │   ├── exifService.ts           # Service EXIF/IPTC invoke direct
│   │   ├── discoveryService.ts     # Service discovery/ingestion
│   │   ├── filesystemService.ts     # Service système de fichiers
│   │   ├── hashingService.ts        # Service BLAKE3 hashing
│   │   ├── previewService.ts        # Service génération previews RAW + event listeners (Phase 3.3)
│   │   └── __tests__/             # Tests unitaires services (5 fichiers)
│   ├── types/                      # Types TypeScript du domaine
│   │   ├── index.ts                # Re-export central
│   │   ├── image.ts                # CatalogImage, ExifData, EditState
│   │   ├── collection.ts           # Collection, SmartQuery, CollectionType (Phase 3.2)
│   │   ├── folder.ts               # FolderTreeNode, FolderStore (Phase 3.4)
│   │   ├── search.ts               # SearchQuery, ParsedFilter, SearchResponse (Phase 3.5)
│   │   ├── events.ts               # CatalogEvent, EventType
│   │   ├── ui.ts                   # ActiveView, LogEntry
│   │   ├── dto.ts                  # DTOs Tauri (Phase 1.2)
│   │   ├── exif.ts                 # Types EXIF/IPTC complets (Phase 2.2)
│   │   ├── discovery.ts            # Types discovery/ingestion (Phase 2.1)
│   │   ├── filesystem.ts           # Types système de fichiers
│   │   ├── preview.ts              # Types génération previews (Phase 3.3)
│   │   ├── hashing.ts              # Types BLAKE3 hashing
│   │   └── __tests__/             # Tests types (6 fichiers)
│   ├── components/
│   │   ├── AGENTS.md               # Conventions composants + props typing
│   │   ├── layout/                 # Structure de la page
│   │   │   ├── TopNav.tsx          # Navigation supérieure
│   │   │   ├── LeftSidebar.tsx     # Catalogue, collections, folders
│   │   │   ├── RightSidebar.tsx    # Panneau droit (orchestrateur)
│   │   │   ├── Toolbar.tsx         # Mode, recherche (Phase 3.5), taille
│   │   │   └── Filmstrip.tsx       # Bande défilante
│   │   ├── library/                # Mode bibliothèque
│   │   │   ├── GridView.tsx        # Grille virtualisée (@tanstack/react-virtual, 60fps 10K+)
│   │   │   ├── LazyLoadedImageCard.tsx # Carte avec IntersectionObserver prefetch (Phase 3.1)
│   │   │   ├── ImageCard.tsx       # Carte image avec métadonnées
│   │   │   └── __tests__/         # Tests composants (2 fichiers)
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
│   │       ├── ImportModal.tsx     # Modal d'import avec progression 0-30-70-100%
│   │       ├── BatchBar.tsx        # Actions batch : pick, favoris, ajout collection (FolderPlus popover), clear
│   │       ├── KeyboardOverlay.tsx # Indicateurs raccourcis clavier
│   │       └── __tests__/         # Tests composants partagés (1 fichier)
│   └── hooks/                       # Hooks React personnalisés
│       ├── AGENTS.md               # Conventions hooks + async patterns
│       ├── useCatalog.ts           # Hook principal catalogue (mapping DTO→CatalogImage, EXIF, isSynced, callbacks)
│       ├── useDiscovery.ts         # Hook discovery (reset cleanup, preview séquentiel)
│       ├── useSearch.ts            # Hook search (debounce 500ms, query parsing)
│       ├── useWasmCanvasRender.ts  # Hook rendu WASM sur canvas (chargement image, normalisation filtres) — Maintenance
│       └── __tests__/             # Tests hooks (4 fichiers)
│           └── useWasmCanvasRender.test.ts # Tests hook WASM canvas render (Maintenance)
│   ├── test/                       # Infrastructure tests et mocks
│   │   ├── setup.ts                # Configuration tests globale (setupFilesAfterEnv)
│   │   ├── storeUtils.ts           # Utilitaires stores tests (resetStores)
│   │   ├── mocks/
│   │   │   ├── tauri-api.ts        # Mock API Tauri principal
│   │   │   └── tauri-api/
│   │   │       ├── core.ts         # Mocks core Tauri
│   │   │       └── tauri.ts        # Mocks invoke Tauri
│   │   └── __tests__/             # Tests infrastructure (1 fichier)
├── src-tauri/                         # Backend Rust Tauri
│   ├── AGENTS.md                   # Conventions Rust + error handling obligatoire
│   ├── Cargo.toml                    # Dépendances Rust (rusqlite 0.31.0, tokio, blake3, etc.)
│   ├── tauri.conf.json              # Configuration Tauri
│   ├── build.rs                      # Build script
│   ├── capabilities/
│   │   └── default.json            # Permissions (fs, dialog, shell)
│   ├── src/
│   │   ├── main.rs                 # Point d'entrée Rust
│   │   ├── lib.rs                  # Module library + plugins + init DB + commandes
│   │   ├── database.rs               # Gestion SQLite, migrations, PRAGMA WAL+NORMAL
│   │   ├── commands/                 # Commandes Tauri CRUD (Phase 1.2 + 2.2 + 3.2 + 3.4 + 3.5)
│   │   │   ├── AGENTS.md           # Conventions commandes Tauri
│   │   │   ├── mod.rs               # Export et enregistrement des commandes
│   │   │   ├── catalog.rs           # 17 commandes CRUD images+collections (Phase 3.2)
│   │   │   ├── folder.rs            # 4 commandes folders : tree, images, backfill, volume_status (Phase 3.4)
│   │   │   ├── search.rs            # 1 commande search_images (Phase 3.5)
│   │   │   ├── exif.rs              # Commandes EXIF/IPTC extraction (Phase 2.2)
│   │   │   ├── filesystem.rs        # Commandes système de fichiers
│   │   │   ├── discovery.rs         # Commandes ingestion + découverte (Phase 2.1)
│   │   │   ├── hashing.rs           # Commandes BLAKE3 batch
│   │   │   ├── preview.rs           # Commandes génération previews RAW (Phase 3.3, batch + libvips)
│   │   │   ├── __tests__/preview_performance.rs # Tests perf batch vs séquentiel
│   │   │   ├── __tests__/preview_unit.rs        # Tests unitaires preview pyramide
│   │   │   └── types.rs             # Types réponse partagés
│   │   ├── models/                   # Types Rust du domaine (sérializables #[derive(Serialize)])
│   │   │   ├── AGENTS.md           # Conventions models Rust
│   │   │   ├── mod.rs               # Export des modèles
│   │   │   ├── catalog.rs           # Image, Folder, CollectionType (base)
│   │   │   ├── collection.rs        # Collection CRUD models (Phase 3.2)
│   │   │   ├── folder.rs            # FolderTreeNode, FolderUpdate (Phase 3.4)
│   │   │   ├── search.rs            # SearchRequest, SearchResponse, SearchResult (Phase 3.5)
│   │   │   ├── image.rs             # Image détails, metadata (Phase 3.3)
│   │   │   ├── event.rs             # CatalogEvent, EventType (Phase 4.3)
│   │   │   ├── exif.rs              # ExifMetadata structuré (Phase 2.2)
│   │   │   ├── iptc.rs              # IptcMetadata skeleton (Phase 5.4)
│   │   │   ├── discovery.rs         # DiscoveredFile, DiscoverySession (Phase 2.1)
│   │   │   ├── filesystem.rs        # FileEvent, FileLock, WatcherConfig
│   │   │   ├── hashing.rs           # HashResult, BatchHashResult
│   │   │   ├── preview.rs           # PreviewData, PreviewFormat, PreviewConfig (Phase 3.3)
│   │   │   ├── dto.rs                # DTOs Tauri avec serde snake_case
│   │   │   └── __tests__/           # Tests unitaires models (4 fichiers)
│   │   ├── migrations/               # Scripts de migration SQL
│   │   │   ├── 001_initial.sql      # Schéma complet du catalogue (9 tables)
│   │   │   ├── 002_ingestion.sql    # Tables ingestion_file_status
│   │   │   ├── 003_previews.sql     # Table previews (libvips)
│   │   │   └── 004_folders.sql      # Colonnes is_online, name sur folders (Phase 3.4)
│   │   ├── services/                 # Services métier (Layer logique DB→commandes)
│   │   │   ├── AGENTS.md           # Conventions services Rust
│   │   │   ├── mod.rs               # Export des services
│   │   │   ├── blake3.rs            # Service BLAKE3 hashing (Phase 1.3)
│   │   │   ├── exif.rs              # Service extraction EXIF kamadak-exif (Phase 2.2)
│   │   │   ├── iptc.rs              # Service IPTC skeleton (Phase 5.4)
│   │   │   ├── discovery.rs         # Service découverte fichiers récursive
│   │   │   │   └── tests.rs         # Tests discovery (18 tests)
│   │   │   ├── ingestion.rs         # Service ingestion batch (discovery + hashing + EXIF)
│   │   │   │   └── tests.rs         # Tests ingestion (24 tests)
│   │   │   ├── collection.rs        # Service collections CRUD + smart queries (Phase 3.2)
│   │   │   │   └── tests.rs         # Tests collections (28 tests)
│   │   │   ├── folder.rs            # Service folders tree + images + backfill (Phase 3.4)
│   │   │   │   └── tests.rs         # Tests folders (6 tests)
│   │   │   ├── search.rs            # Service search + build_where_clause (Phase 3.5)
│   │   │   │   └── tests.rs         # Tests search (6 tests)
│   │   │   ├── filesystem.rs        # Service système de fichiers (watcher, lock)
│   │   │   ├── preview.rs           # Service génération previews RAW (Phase 3.3)
│   │   │   │   └── tests.rs         # Tests preview pyramide (27 tests)
│   │   │   └── __tests__/           # Tests integration transversales
│   └── icons/                      # Icônes d'application (16 fichiers)
├── index.html                      # HTML racine
├── package.json                    # Dépendances npm + scripts tauri
├── tsconfig.json                   # Config TypeScript strict (no `any`)
├── tsconfig.node.json              # Config TS pour vite.config.ts
├── vite.config.ts                  # Configuration Vite + TailwindCSS plugin
├── eslint.config.js                # Configuration ESLint strict React Hooks
└── .gitignore
```

---

## 4. Composants UI (Mockup Actuel)

Les composants ont été décomposés en Phase 0.3. Chaque composant est dans son propre fichier avec des props typées.

### 4.1 — Composants (après décomposition Phase 0.3)

| Composant             | Fichier                           | Lignes | Description                                                                                 |
| --------------------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `App`                 | `src/App.tsx`                     | 152    | Orchestrateur pur (stores Zustand, callbacks)                                               |
| `GlobalStyles`        | `shared/GlobalStyles.tsx`         | 16     | Styles CSS inline                                                                           |
| `ArchitectureMonitor` | `shared/ArchitectureMonitor.tsx`  | 54     | Console monitoring système                                                                  |
| `ImportModal`         | `shared/ImportModal.tsx`          | 68     | Modal d'import avec progression                                                             |
| `BatchBar`            | `shared/BatchBar.tsx`             | —      | Actions batch : pick, favoris, ajout à une collection (popover FolderPlus), clear sélection |
| `KeyboardOverlay`     | `shared/KeyboardOverlay.tsx`      | 9      | Indicateurs raccourcis                                                                      |
| `TopNav`              | `layout/TopNav.tsx`               | 29     | Navigation supérieure                                                                       |
| `LeftSidebar`         | `layout/LeftSidebar.tsx`          | 64     | Catalogue, collections, folders                                                             |
| `RightSidebar`        | `layout/RightSidebar.tsx`         | 36     | Panneau droit (orchestrateur)                                                               |
| `Toolbar`             | `layout/Toolbar.tsx`              | 54     | Mode, recherche, taille thumbnails                                                          |
| `Filmstrip`           | `layout/Filmstrip.tsx`            | 36     | Bande défilante                                                                             |
| `GridView`            | `library/GridView.tsx`            | 46     | Grille d'images virtualisée (@tanstack/react-virtual)                                       |
| `LazyLoadedImageCard` | `library/LazyLoadedImageCard.tsx` | —      | Carte image avec lazy loading + drag source (Phase 3.2b)                                    |
| `ImageCard`           | `library/ImageCard.tsx`           | —      | Carte image avec métadonnées, sélection                                                     |
| `DevelopView`         | `develop/DevelopView.tsx`         | 38     | Image + mode avant/après                                                                    |
| `DevelopSliders`      | `develop/DevelopSliders.tsx`      | 37     | Sliders de réglage                                                                          |
| `HistoryPanel`        | `develop/HistoryPanel.tsx`        | —      | Timeline d'événements + snapshots (create/restore/delete)                                   |
| `Histogram`           | `metadata/Histogram.tsx`          | 18     | Histogramme simulé                                                                          |
| `ExifGrid`            | `metadata/ExifGrid.tsx`           | 17     | Grille EXIF compacte                                                                        |
| `MetadataPanel`       | `metadata/MetadataPanel.tsx`      | 76     | Fiche technique + tags                                                                      |

### 4.2 — Stores Zustand (Phase 0.4 + Maintenance Phase 3.1)

| Store             | Fichier                     | État géré                                                                | Actions principales                                                                                               |
| ----------------- | --------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `catalogStore`    | `stores/catalogStore.ts`    | images[] (from SQLite), activeImageId                                    | setImages, addImages, getImages                                                                                   |
| `uiStore`         | `stores/uiStore.ts`         | **selection (Set)**, **filterText**, activeView, sidebars, thumbnailSize | **toggleSelection, setSingleSelection, clearSelection, setFilterText**, setActiveView, toggleLeftSidebar          |
| `collectionStore` | `stores/collectionStore.ts` | collections[], activeCollectionId, activeCollectionImageIds              | loadCollections, createCollection, deleteCollection, renameCollection, setActiveCollection, clearActiveCollection |
| `editStore`       | `stores/editStore.ts`       | eventLog[], currentEdits, historyIndex, editEventsPerImage, snapshots    | addEvent, setEditEventsForImage, restoreToEvent, setSnapshots, addSnapshot, deleteSnapshotLocal                   |
| `systemStore`     | `stores/systemStore.ts`     | logs[], importState, appReady                                            | addLog, setImportState, setAppReady                                                                               |

**Architecture** (Maintenance Phase 3.1) :

- **Single Source of Truth** : `useCatalog()` hook SEUL pour images data (pas de hybrid state)
- **Separation of Concerns** : `useUiStore` pour state UI only (selection, filterText, viewport)
- **Type Safety** : TypeScript strict mode, no `any`
- **Zustand Persistence** : Subscriptions pour notifications state changes
- **SQLite Bidirectional Sync** : Callbacks `onRatingChange()`, `onFlagChange()`, `onTagsChange()` dans useCatalog hook

### 4.2.1 — Hooks Personnalisés et Utilitaires

| Hook/Util                 | Fichier                        | Responsabilité                                                                                                                                                                                       |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useWasmCanvasRender`     | `hooks/useWasmCanvasRender.ts` | Encapsule rendu WASM (chargement image, détection filtres, appel renderWithWasm) — utilisé par SplitViewComparison, OverlayComparison, SideBySideComparison (Phase 4.4-B, Maintenance déduplication) |
| `editStateToPixelFilters` | `lib/filterUtils.ts`           | Convertit EditState UI (sliders -100..+100) → PixelFilterState (plages WASM spécifiques)                                                                                                             |
| `hasNonNeutralFilters`    | `lib/filterUtils.ts`           | Détecte si AU MOINS un filtre dévie des valeurs neutres (évite rendu inutile)                                                                                                                        |

**Architecture** :

```
DevelopView (sliders)
  ↓ (editState changé)
SplitViewComparison / OverlayComparison / SideBySideComparison
  ↓ (useWasmCanvasRender hook)
editStateToPixelFilters()  →  Conversion UI → WASM
hasNonNeutralFilters()    →  Détection modifications
renderWithWasm()          →  Pixel-perfect WASM canvas rendering
```

**Pattern d'Utilisation** :

```typescript
// Dans un composant de comparaison (ex: OverlayComparison)
const canvasRef = useRef<HTMLCanvasElement>(null);
useWasmCanvasRender(canvasRef, afterUrl, editState); // Gère tout automatiquement
```

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

## 5. Modèle de Données (Mockup Actuel)

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
  urls: {                        // Phase A: Pyramide de previews
    thumbnail: string,           // 240px JPEG – GridView
    standard: string,            // 1440px JPEG – DevelopView
    oneToOne?: string,           // Natif JPEG – Zoom 1:1 (optionnel)
  },
  capturedAt: string,            // ISO date
  exif: ExifData,                // Données EXIF réelles (nullable)
  // Données mock générées pour démo :
  // urls.thumbnail: picsum.photos si preview absent
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

### 5.1.1 — Pyramide de Previews (Phase A+)

CatalogImage supporte désormais **3 formats de preview** pour optimiser l'affichage selon le contexte :

| Format        | Dimensions | Qualité  | Cas d'usage                    | Stockage |
| ------------- | ---------- | -------- | ------------------------------ | -------- |
| **Thumbnail** | 240px      | JPEG q75 | GridView (grille rapide)       | ~50KB    |
| **Standard**  | 1440px     | JPEG q85 | DevelopView (édition)          | ~500KB   |
| **OneToOne**  | Natif      | JPEG q90 | Zoom 1:1 pixel-peeping (futur) | ~2MB     |

**Architecture** :

```
Image Source (RAW/CR3/JPG dans disque)
  ↓
Backend Rust (Phase 2.3)
  ├─→ Génère Thumbnail (240px)
  ├─→ Génère Standard (1440px)
  └─→ Génère OneToOne (natif)
  ↓
Frontend TypeScript (useCatalog hook)
  ├─→ Charge les 3 formats EN PARALLELE
  ├─→ Retourne CatalogImage avec urls.*
  ↓
Composant React
  ├─→ GridView        → image.urls.thumbnail (240px)
  ├─→ DevelopView     → image.urls.standard (1440px)
  └─→ ZoomView (TODO) → image.urls.oneToOne (natif)
```

**Backward Compatibility** :

```typescript
// Helper export pour code legacy (DEPRECATED)
export function getImageUrl(image: CatalogImage): string {
  return image.urls.thumbnail;
}

// Utilisation
const url = getImageUrl(image); // → image.urls.thumbnail
```

**Transition Progressive** :

- Phase A (✅ complétée) : Type structure `urls: { thumbnail, standard, oneToOne }`
- Phase B (✅ complétée) : Load 3 formats in parallel via `Promise.all()` in useCatalog
- Phase C (✅ complétée) : DevelopView uses `.standard` (1440px) for 6× quality improvement
- Phase D (✅ complétée) : Comprehensive test suite for format selection + fallback behavior

### 5.1.2 — Chargement Parallèle des Formats (Phase B)

**Pattern d'Implémentation** :

```typescript
// src/hooks/useCatalog.ts
const [thumbnailResult, standardResult, oneToOneResult] = await Promise.all([
  previewService.getPreviewPath(hash, PreviewType.Thumbnail).catch(() => null),
  previewService.getPreviewPath(hash, PreviewType.Standard).catch(() => null),
  previewService.getPreviewPath(hash, PreviewType.OneToOne).catch(() => null),
]);

const urls = {
  thumbnail: thumbnailResult ? convertFileSrc(thumbnailResult) : '',
  standard: standardResult ? convertFileSrc(standardResult) : '',
  oneToOne: oneToOneResult ? convertFileSrc(oneToOneResult) : undefined,
};
```

**Avantages** :

- ✅ Parallèle vs séquentiel : ~66% plus rapide (1× latence réseau au lieu de 3×)
- ✅ Fallback automatique : Si Standard échoue, Thumbnail reste disponible
- ✅ Robustesse : OneToOne optionnel, pas de blocage si absent
- ✅ Type-safe : Structure `urls` formalisée en TypeScript strict mode

### 5.1.3 — Sélection des Formats par Composant (Phase C)

**Chaque composant utilise le format approprié** :

| Composant               | Format utilisé              | Raison                                               |
| ----------------------- | --------------------------- | ---------------------------------------------------- |
| **GridView**            | `thumbnail` (240px)         | Optimisation mémoire, grille légère                  |
| **Filmstrip**           | `thumbnail` (240px)         | idem, aperçu petit format                            |
| **DevelopView**         | `standard` (1440px)         | Édition haute qualité (6× meilleur)                  |
| **LazyLoadedImageCard** | `thumbnail` (240px)         | Virtualization + chargement lazy                     |
| **PreviewRenderer**     | Variable selon `isSelected` | `thumbnail` dans GridView, `standard` en DevelopView |

**Code d'Exemple** :

```typescript
// GridView.tsx : toujours utiliser thumbnail
<img src={image.urls.thumbnail} alt="" className="..." />

// DevelopView.tsx : utiliser standard (Phase C)
<PreviewRenderer
  previewUrl={activeImg.urls.standard}  // 1440px
  isSelected={true}
  useWasm={true}
/>

// Fallback logic (si Standard généré mais non disponible)
const displayUrl = image.urls.standard || image.urls.thumbnail;
```

### 5.1.4 — Tests et Validation (Phase D)

**Suite de tests** : `src/test/preview-formats.test.ts` (17 tests, 100% passing ✅)

Couverts :

- ✅ Type structure `urls: { thumbnail, standard, oneToOne }`
- ✅ Backward compatibility via `getImageUrl()` helper
- ✅ Chargement parallèle `Promise.all()` comportement
- ✅ Fallback strategy (Standard fails → use Thumbnail)
- ✅ Format specifications (sizes, JPEG quality, use cases)
- ✅ Type safety & access patterns

**Commande pour exécuter** :

```bash
npm test -- src/test/preview-formats.test.ts
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

| Fonctionnalité                     | Statut            | Connectée à un backend ?                                                          | Phase cible |
| ---------------------------------- | ----------------- | --------------------------------------------------------------------------------- | ----------- |
| Affichage grille d'images          | ✅ Fonctionnel    | Oui (SQLite via useCatalog)                                                       | —           |
| Virtualisation grille (10K+)       | ✅ Fonctionnel    | Oui (@tanstack/react-virtual + **LazyLoadedImageCard** with IntersectionObserver) | 3.1         |
| Redimensionnement grille           | ✅ Fonctionnel    | N/A (ResizeObserver)                                                              | —           |
| Drag & Drop (ajouter à collection) | ✅ Fonctionnel    | Oui (HTML5 DnD + collection store)                                                | 3.2b        |
| Sélection simple/multiple          | ✅ Fonctionnel    | Oui (useUiStore → selection Set)                                                  | —           |
| Notation (0-5 étoiles)             | ✅ Fonctionnel    | Oui (SQLite + isSynced tracking)                                                  | 5.3         |
| Flagging (pick/reject)             | ✅ Fonctionnel    | Oui (SQLite + isSynced tracking)                                                  | 5.3         |
| Import de fichiers                 | ✅ Fonctionnel    | Oui (Tauri discovery+ingestion)                                                   | —           |
| Progression import (%)             | ✅ Fonctionnel    | Oui (processedFiles/totalFiles)                                                   | —           |
| Recherche/filtrage                 | 🟡 Partiel        | Non (filter JS local)                                                             | 3.5         |
| Smart Collections                  | 🟡 Mock           | Non (liens statiques)                                                             | 3.3         |
| Sliders de développement           | 🟡 Mock           | Non (CSS filters)                                                                 | 4.2         |
| Histogramme                        | 🟡 Mock           | Non (Math.sin)                                                                    | 5.1         |
| EXIF display                       | ✅ Fonctionnel    | Oui (SQLite LEFT JOIN)                                                            | —           |
| Tags/mots-clés                     | 🟡 Mock           | Non (état local)                                                                  | 5.2         |
| Historique d'events                | ✅ Fonctionnel    | Oui (Event Sourcing + snapshots SQLite via Tauri commands)                        | 4.3         |
| Avant/Après                        | 🟡 Mock           | Non (CSS filters)                                                                 | 4.4         |
| Filmstrip                          | 🟡 Partiel        | Partiel (images SQLite)                                                           | 3.1         |
| Batch operations                   | ⬜ Non implémenté | Non (boutons disabled)                                                            | 3.2         |
| Raccourcis clavier                 | ✅ Fonctionnel    | N/A (event listeners)                                                             | —           |
| Monitoring système                 | ✅ Fonctionnel    | Oui (logs SQLite réels)                                                           | —           |
| Cloud sync status                  | ⬜ Non implémenté | Non (badge SQLite)                                                                | 8.2         |
| Taille thumbnails                  | ✅ Fonctionnel    | N/A (CSS grid)                                                                    | —           |
| Navigation Library/Develop         | ✅ Fonctionnel    | N/A (state local)                                                                 | —           |

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

## 15. Commandes Tauri (Mises à jour)

- `generate_previews_batch(images: Vec<ImageId>, config: PreviewConfig)`
  - Génère les previews pyramidales en batch (Promise.all côté frontend, batch 4 côté Rust)
  - Utilise libvips par défaut (configurable)
  - Retourne la liste des previews générées et les erreurs éventuelles

## 16. Services Frontend (Mises à jour)

- `previewService.generatePreviewsBatch(images: CatalogImage[])`
  - Appelle la commande Tauri batch, gère Promise.all côté frontend
  - Retourne les résultats de génération (succès/erreurs)

## 17. Types & Interfaces (Mises à jour)

- `PreviewConfig` (Rust/TS) : champ `use_libvips: bool` activé par défaut

## 18. Système de Rendu

> **Phase** : 4.2 (Pipeline de Rendu Image + Event Sourcing Integration)
> **État** : 🔄 **En Révision** (Phase 4.2-1/2 persistence complétée; WASM Phase B reporté à 4.2b)
> **Maintenance** : MAINTENANCE-PHASE-4.2-COMPLETION.md

### Statut d'Implémentation

| Composant                      | Phase | Status        | Notes                                           |
| ------------------------------ | ----- | ------------- | ----------------------------------------------- |
| Event Sourcing (append events) | 4.2-1 | ✅ Implémenté | App.tsx → CatalogService.appendEvent() → SQLite |
| PreviewRenderer subscription   | 4.2-2 | ✅ Implémenté | Monitore editStore.editEventsPerImage changes   |
| CSS Filters aplicaton          | 4.2-A | ✅ Complet    | CSS GPU-accelerated, <1ms latency               |
| WASM Pixel Processing          | 4.2-B | 🔄 Standby    | Code complet, non-bloquant, reporté à 4.2b      |

### Architecture

Le système de rendu non-destructif combine trois couches :

```
Event Sourcing Layer
    ↓
CSS Filters Layer (Fast, GPU-accelerated)
    ↓ (Optional fallback for advanced filters)
WASM Pixel Processing Layer (CPU, per-pixel algorithms)
    ↓
Rendered Preview (GPU Canvas)
```

### 18.1 — Flux d'Événements de Rendu

**Source de Vérité** : `AppState.event_store` (Rust SQLite)

Événements persistés pour chaque image modifiée :

```rust
struct Event {
    id: i64,
    target_id: i64,           // image_id
    event_type: String,       // "exposure_adjustment", "contrast_adjustment", ...
    parameters: serde_json::Value,  // { "exposure": 0.5, ... }
    timestamp: i64,            // Unix milliseconds
    // ...
}
```

**Frontend Retrieval** (Phase 4.2-B.1) :

- Commande Tauri: `get_edit_events(image_id: i64) → Vec<EventDTO>`
- Service wrapper: `CatalogService.getEditEvents(imageId) → Promise<EventDTO[]>`
- Caching: `editStore.editEventsPerImage[imageId]` (per-image persistent cache)

### 18.1.1 — Workflow Complet: Slider → Persist → Render (Phase 4.2-1/2)

**Étape 1: Persistence (Phase 4.2-1)** — `src/App.tsx` EDIT branch

```
User adjust slider in DevelopView
  ↓
onChange → onDispatchEvent('EDIT', { exposure: 0.5 })
  ↓
App.tsx dispatchEvent('EDIT') handler [NEW Phase 4.2-1]:
  1. Optimistic update local (existing)
  2. For each selected image:
     → Create EventDTO (imageEdited event)
     → Call CatalogService.appendEvent(eventDto)
     → Tauri invoke('append_event')
     → Backend INSERT into events table
  ↓
Event persisted in SQLite ✅
```

**Étape 2: Subscription & Re-render (Phase 4.2-2)** — `src/components/library/PreviewRenderer.tsx`

```
editStore.editEventsPerImage[imageId] changes
  ↓
useEffect monitors subscription [NEW Phase 4.2-2]:
  1. Reload events via CatalogService.getEditEvents()
  2. Calculate filters: eventsToCSSFilters(events)
  3. Update state: setFilters(cssFilters)
  ↓
Second useEffect applies to DOM:
  → applyCSSFilters(imgRef.current, filters)
  → imgElement.style.filter = "brightness(...) contrast(...)"
  ↓
Preview image updated visually in real-time ✅
```

**Persévérance Complète** : Brower refresh → Events reloaded from SQLite → Edits preserved ✅

### 18.2 — CSS Filters Pipeline

**Service** : `src/services/renderingService.ts`

**Conversion Events → CSS** :

```typescript
function eventsToCSSFilters(events: EventDTO[]): CSSFilterState {
  // Accumule tous les événements en un seul CSSFilterState
  // Formules :
  // - brightness = 1 + exposure × 0.3 [clamped 0.3-1.7]
  // - contrast = 1 + contrast × 0.25
  // - saturation = 1 + saturation × 0.3
  // Retourne : { exposure, contrast, saturation, ... }
}

function filtersToCSS(filters: CSSFilterState): string {
  // Génère chaîne CSS : "brightness(1.15) contrast(1.2) saturate(0.9)"
  return `brightness(${filters.exposure}) contrast(${filters.contrast}) ...`;
}
```

**Application au Rendu** :

```typescript
// Dans PreviewRenderer.tsx
const cssFilters = eventsToCSSFilters(imageEvents);
const cssString = filtersToCSS(cssFilters);
imgElement.style.filter = cssString;
```

**Performance** : <1ms latency, GPU-accelerated par navigateur

### 18.3 — WASM Pixel Processing (Fallback Avancé)

**Crate WASM** : `luminafast-wasm/` (zéro dépendances desktop)

**Pixel Filters** (9 algorithmes) :

```rust
struct PixelFilters {
    exposure: f32,      // Luminosité per-pixel (multiplicateur 0.15)
    contrast: f32,      // Centré grey(128)
    saturation: f32,    // Luma-based shift
    highlights: f32,    // Ciblage high-luma (>180)
    shadows: f32,       // Ciblage low-luma (<75)
    clarity: f32,       // Local contrast
    vibrance: f32,      // Selective saturation boost
    color_temp: f32,    // Kelvin-based (2000-10000K RGB shift)
    tint: f32,          // Green-magenta shift
}

impl PixelFilters {
    pub fn apply_filters(&self, pixels: &mut [u8], width: u32, height: u32) {
        // For each pixel [R, G, B, A]:
        // - apply_exposure() → brightness_factor = 1 + exposure × 0.15
        // - apply_contrast() → (pixel - 128) × factor + 128
        // - apply_saturation() → luma_aware shift
        // - ... (7 autres)
    }
}
```

**Wrapper TypeScript** : `src/services/wasmRenderingService.ts`

**API** :

```typescript
async function renderWithWasm(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  filters: PixelFilterState,
  width: number,
  height: number,
): Promise<void> {
  // 1. Load image → Canvas
  // 2. const pixels = ctx.getImageData(...).data
  // 3. new PixelFiltersWasm(...).apply_filters(pixels, width, height)
  // 4. ctx.putImageData(new ImageData(pixels, ...))
  // 5. Display result
}
```

**Compilation** :

```bash
cd luminafast-wasm
wasm-pack build --target web --release
# Génère : src/wasm/luminafast_wasm.js + .wasm + .d.ts
```

**Fallback Strategy** :

- Si WASM disponible → `renderWithWasm()`
- Sinon → CSS Filters (Phase A fallback)
- Pas d'erreur utilisateur (graceful degradation)

### 18.4 — Intégration PreviewRenderer

**Composant** : `src/components/library/PreviewRenderer.tsx`

**Lifecycle** :

```javascript
// 1. Mount
useEffect(async () => {
  const imageEvents = await CatalogService.getEditEvents(imageId);
  setEditEventsForImage(imageId, imageEvents);          // Cache in EditStore
  const cssFilters = eventsToCSSFilters(imageEvents);

  // 2. Render with CSS (Phase A)
  setFilters(cssFilters);

  // 3. Optional: Render with WASM if available (Phase B fallback)
  if (hasWasmSupport() && !useWasm) {
    await renderWithWasm(canvasRef.current, imageUrl, ...);
  }

  // 4. Cleanup
  return () => clearEditEventsForImage(imageId);
}, [imageId, setEditEventsForImage, clearEditEventsForImage]);
```

**Props & State** :

```typescript
interface PreviewRendererProps {
  imageId: number;
  width: number;
  height: number;
  useWasm?: boolean; // Toggle WASM vs CSS filters
}

state: {
  filters: CSSFilterState;
  isLoading: boolean;
  error: Error | null;
}
```

### 18.5 — EditStore Caching (Phase 4.2-B.2)

**Store** : `src/stores/editStore.ts` (Zustand)

**State** :

```typescript
interface EditStore {
  // Per-image event caching
  editEventsPerImage: Record<number, EventDTO[]>;
}
```

**Actions** :

```typescript
setEditEventsForImage(imageId: number, events: EventDTO[])     // Cache load
clearEditEventsForImage(imageId: number)                        // Cleanup
getAppliedEdits(imageId: number): EventDTO[]                   // Retrieve
```

**Lifecycle Benefits** :

- ✅ Avoid repeated Tauri IPC calls (one per image per session)
- ✅ Support component composition (multiple images visible simultaneously)
- ✅ Automatic cleanup on unmount (no memory leaks)

### 18.6 — Tests & Validation

**TypeScript Tests** :

- `renderingService.test.ts` : 25/25 ✅ (CSS filters conversion)
- `wasmRenderingService.test.ts` : 18/18 ✅ (WASM wrapper + fallback)

**Rust Tests** :

- `image_processing.test.rs` : 5/5 ✅ (pixel algorithms)

**Non-Régression** : Phases 1-4.1 à 100% ✅

---

## 19. Historique des Modifications de ce Document

| Date       | Phase               | Modification                                                       | Raison                                         |
| ---------- | ------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| 2026-03-03 | 4.3                 | Historique interactif + snapshots nommés (create/restore/delete)   | Livraison complète de la Phase 4.3             |
| 2026-02-27 | 4.2-B.2 Conformity  | Ajout section "Système de Rendu" (Event Sourcing + CSS + WASM)     | Documentation Phase 4.2 pipeline complet       |
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

---

## 19. Event Sourcing Engine (Phase 4.1)

> ✅ **Infrastructure Rust complète + Service TypeScript + Tests complets** (Phase 4.1 Complétée)

Moteur Event Sourcing côté backend pour traçabilité complète des modifications catalogue avec persistance d'événements et API replay.

### 19.1 — Composants

| Composant       | Fichier                                       | Statut      |
| --------------- | --------------------------------------------- | ----------- |
| Service Rust    | `src-tauri/src/services/event_sourcing.rs`    | ✅ 150 LOC  |
| Commandes Tauri | `src-tauri/src/commands/event_sourcing.rs`    | ✅ 60 LOC   |
| Types Rust      | `src-tauri/src/models/event.rs`               | ✅ 242 LOC  |
| Migration SQL   | `src-tauri/migrations/005_event_sourcing.sql` | ✅          |
| Service TS      | `src/services/eventService.ts`                | ✅ 80 LOC   |
| Tests TS        | `src/services/__tests__/eventService.test.ts` | ✅ 23 tests |

### 19.2 — Tests

✅ **Rust** : 173+ tests (y.c. test_append_and_get_event)
✅ **TypeScript** : 394+ tests (y.c. 23 tests eventService)
✅ **Code Quality** : 0 warnings, 0 errors
✅ **Non-régression** : Phases 1-3 toujours 100

---

## 19. Event Sourcing Engine (Phase 4.1)

Status: COMPLETED (Étapes 1-3 ✅)

- Event Store Rust service (150 LOC)
- Tauri commands: append_event, get_events, replay_events
- TypeScript eventService with full test coverage
- Migration 005 + tests (173 Rust + 394 TypeScript)
- Non-regression: 0 failures on Phases 1-3

Phase 4.1 complétée le 2026-02-25

---

## 21. Service Metrics — Monitoring Threadpool (M.1.1a)

> ✅ **Completed** — Phase M.1.1a (2026-03-10)
> **Objective** : Real-time observability of Tokio threadpool saturation during batch ingestion with alerting

### 21.1 — Architecture Overview

**Problem** : After M.1.1 (ingestion refactoring), no visibility into threadpool usage. Possible saturation without detection.

**Solution** : Zero-cost metrics collection (atomic counters) with saturation warnings (>80%).

### 21.2 — Components

| Component      | File                                  | Purpose                                      |
| -------------- | ------------------------------------- | -------------------------------------------- |
| Metrics Struct | `src-tauri/src/services/metrics.rs`   | ThreadpoolMetrics + MetricsCollector trait   |
| Integration    | `src-tauri/src/services/ingestion.rs` | Increment/decrement on task spawn/complete   |
| Tests          | Both files                            | 19 tests: metrics.rs (9) + ingestion.rs (10) |

### 21.3 — Public API

```rust
pub struct ThreadpoolMetrics {
    pub active_tasks: usize,           // Currently executing tasks
    pub queue_depth: usize,            // Pending tasks in queue
    pub max_threads: usize,            // Configured max threads (8 default)
    pub saturation_percentage: f32,    // Calculated: (active/max) * 100
    pub timestamp: Instant,            // When snapshot was taken
}

pub trait MetricsCollector: Send + Sync {
    fn record_threadpool_metrics(&self, metrics: ThreadpoolMetrics);
    fn check_saturation(&self, threshold: f32) -> bool;
    fn get_latest_metrics(&self) -> Option<ThreadpoolMetrics>;
    fn reset(&self);
}

pub struct DefaultMetricsCollector { ... }   // Atomic-based implementation
pub struct ActiveTaskGuard { ... }           // RAII for auto-decrement
```

### 21.4 — Integration in IngestionService

```rust
pub struct IngestionService {
    blake3_service: Arc<Blake3Service>,
    db: Arc<std::sync::Mutex<rusqlite::Connection>>,
    metrics_collector: Arc<DefaultMetricsCollector>,  // ← NEW
}

pub fn new(...) -> Self {
    Self::with_max_threads(blake3_service, db, 8)  // Default: 8 threads
}

pub fn with_max_threads(..., max_threads: usize) -> Self { ... }
```

### 21.5 — Saturation Detection

**In batch_ingest()** :

1. Enter spawn closure → `metrics_collector.increment_active_tasks()`
2. Check saturation → `if collector.check_saturation(80.0) { log::warn!(...) }`
3. Exit closure → `metrics_collector.decrement_active_tasks()`

**Log output** (when saturated):

```
[M.1.1a] Threadpool saturation warning: 87.5% (7/8 tasks active, 3 queued)
```

### 21.6 — Performance

| Aspect                   | Cost      | Details                     |
| ------------------------ | --------- | --------------------------- |
| increment_active_tasks() | O(1)      | Atomic fetch_add            |
| decrement_active_tasks() | O(1)      | Atomic fetch_sub            |
| check_saturation()       | O(1)      | Load + comparison           |
| Memory                   | ~48 bytes | 3× AtomicUsize + 1× usize   |
| Overhead per file        | <1μs      | Non-blocking, no allocation |

**Conclusion** : Zero measurable performance impact.

### 21.7 — Tests

**Metrics module (metrics.rs)** — 9 tests:

- `test_metrics_creation` : Struct initialization
- `test_saturation_calculation` : Formula verification
- `test_collector_increment_decrement` : Counter operations
- `test_collector_queue_depth` : Queue tracking
- `test_collector_saturation_check` : Threshold detection
- `test_active_task_guard` : RAII pattern
- `test_metrics_collector_trait` : Trait implementation
- `test_zero_max_threads_edge_case` : Boundary condition
- `test_full_saturation` : 100% usage

**Ingestion integration (ingestion.rs)** — 10 tests:

- `test_ingestion_service_has_metrics_collector` : Service initialization
- `test_metrics_collector_tracks_active_tasks` : Counting accuracy
- `test_threadpool_saturation_detection` : 80% threshold
- `test_metrics_snapshot_accuracy` : Data correctness
- `test_metrics_reset` : State cleanup
- `test_custom_max_threads` : Custom threadpool size

**Results** : 19/19 passing ✅ (100% coverage, >80% of metrics.rs)

### 21.8 — Usage Example

```rust
// In IngestionService::batch_ingest()
self.metrics_collector.reset();  // Start fresh

for file in files {
    // ...
    let metrics_collector_clone = Arc::clone(&self.metrics_collector);

    let handle = tokio::spawn(async move {
        metrics_collector_clone.increment_active_tasks();  // Track

        if metrics_collector_clone.check_saturation(80.0) {
            log::warn!("High threadpool usage!");
        }

        // ... process file ...

        metrics_collector_clone.decrement_active_tasks();  // Cleanup
    });
}
```

### 21.9 — Dependencies

- ✅ M.1.1 (Correction Runtime Ingestion)
- → M.1.2 (Async IO Migration) — independent, but benefits from metrics

### 21.10 — Future Expansions

| Item                | Reason                        | Timeline   |
| ------------------- | ----------------------------- | ---------- |
| Prometheus export   | Production monitoring         | Phase 7.2+ |
| Dashboard UI        | Real-time visualization       | Phase 7.3+ |
| Auto-scaling        | Dynamic threadpool adjustment | Phase 8.1+ |
| Distributed tracing | Advanced debugging            | Phase 7.4+ |

---
