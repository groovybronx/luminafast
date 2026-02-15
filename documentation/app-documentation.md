---
layout: documentation
title: Documentation Application
description: Documentation technique complète de LuminaFast
next:
  title: Changelog
  url: /documentation/changelog.html
---

# LuminaFast — Documentation de l'Application

> **Ce document est la source de vérité sur l'état actuel de l'application.**
> Il DOIT être mis à jour après chaque sous-phase pour rester cohérent avec le code.
>
> **Dernière mise à jour** : 2026-02-13 (Phase 1.3 Préparation) — État : Application Tauri avec Build Errors Corrigés, Tests 216/216 passant

## Décisions Projet (validées par le propriétaire)

- **Phase 8 (Cloud/Sync)** : Reportée post-lancement
- **Plateforme MVP** : macOS-first (Windows/Linux secondaire)
- **Formats RAW prioritaires** : Canon (.CR3), Fuji (.RAF), Sony (.ARW)

---

## Vue d'Ensemble

**LuminaFast** est une application de gestion d'actifs numériques photographiques (Digital Asset Management) moderne avec des optimisations avancées (DuckDB, BLAKE3, Event Sourcing).

### État actuel : Application Tauri avec Build Errors Corrigés
Toutes les erreurs de build et de tests Rust sont corrigées. 216/216 tests passent (0 échec). Les modèles discovery/ingestion sont synchronisés, la concurrence est Sync-safe, et l'architecture serde custom (Phase 1.4) est préservée. Les 7 commandes CRUD restent fonctionnelles, avec en plus les corrections structurelles pour préparer la Phase 1.3 (Service BLAKE3).

### Objectif : Application Tauri autonome commercialisable
Desktop natif (macOS, Windows, Linux) avec édition paramétrique non-destructive, catalogue SQLite, et gestion de bibliothèques photographiques massives.

---

## Stack Technique Actuelle

| Couche | Technologie | Version | Statut |
|--------|-------------|---------|--------|
| Framework frontend | React | 19.2.0 | ✅ En place |
| Bundler | Vite | 7.3.1 | ✅ En place |
| Styling | TailwindCSS | 4.1.18 | ✅ En place |
| Icônes | Lucide React | 0.563.0 | ✅ En place |
| Langage | TypeScript (TSX) | strict | ✅ Complété (Phase 0.1) |
| Shell natif | Tauri v2 | 2.10.2 | ✅ Complété (Phase 0.2) |
| Backend | Rust | stable | ✅ Complété (Phase 0.2) |
| State management | Zustand | 5.0.11 | ✅ Complété (Phase 0.4) |
| Linting | ESLint + TypeScript | 9.39.1 | ✅ Complété (Phase 0.5) |
| Tests | Vitest + jsdom | 4.0.18 | ✅ Complété (Phase 0.5) |
| CI/CD | GitHub Actions | — | ✅ Complété (Phase 0.5) |
| DB transactionnelle | SQLite | rusqlite 0.31.0 | ✅ Complété (Phase 1.1) |
| DB analytique | DuckDB | — | ⬜ Non installé (Phase 6.2) |
| Hashing | BLAKE3 | — | ✅ Complété (Phase 1.3) |

---

## Architecture des Fichiers

```
LuminaFast/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Pipeline CI/CD GitHub Actions
├── .rustfmt.toml                     # Configuration Rust formatting
├── clippy.toml                       # Configuration Clippy linting
├── rust-toolchain.toml                # Configuration toolchain Rust
├── Docs/
│   ├── archives/
│   │   ├── architecture-analysis.md   # Analyse architecture systèmes DAM
│   │   └── recommendations.md      # Stack moderne recommandée
│   ├── AI_INSTRUCTIONS.md          # Directives pour agents IA
│   ├── CHANGELOG.md                # Suivi d'avancement par sous-phase
│   ├── TESTING_STRATEGY.md         # Stratégie de tests
│   ├── GOVERNANCE.md               # Règles de gouvernance
│   └── APP_DOCUMENTATION.md        # Ce fichier
├── public/
│   └── vite.svg
├── src/
│   ├── App.tsx                     # Orchestrateur (152 lignes, pas de useState)
│   ├── main.tsx                    # Point d'entrée React
│   ├── vite-env.d.ts               # Déclarations d'environnement Vite
│   ├── index.css                   # Styles globaux + TailwindCSS
│   ├── stores/                     # Stores Zustand (state management)
│   │   ├── index.ts                # Re-export central
│   │   ├── catalogStore.ts         # Images, sélection, filtres
│   │   ├── uiStore.ts              # UI (vues, sidebars, modals)
│   │   ├── editStore.ts            # Événements, edits, historique
│   │   └── systemStore.ts          # Logs, import, état système
│   ├── lib/                        # Utilitaires et données mock
│   │   ├── helpers.ts              # safeID()
│   │   └── mockData.ts             # generateImages, INITIAL_IMAGES, MockEvent
│   ├── services/                   # Services TypeScript (Phase 1.2)
│   │   ├── catalogService.ts       # Wrapper Tauri avec gestion d'erreurs
│   │   ├── hashingService.ts       # Service BLAKE3 wrapper
│   │   ├── discoveryService.ts     # Service discovery wrapper
│   │   └── filesystemService.ts    # Service filesystem wrapper
│   ├── types/                      # Types TypeScript du domaine
│   │   ├── index.ts                # Re-export central
│   │   ├── image.ts                # CatalogImage, ExifData, EditState
│   │   ├── collection.ts           # Collection, SmartQuery
│   │   ├── events.ts               # CatalogEvent, EventType
│   │   ├── ui.ts                   # ActiveView, LogEntry
│   │   ├── dto.ts                  # DTOs Tauri (Phase 1.2)
│   │   ├── hashing.ts              # Types BLAKE3
│   │   ├── discovery.ts            # Types discovery
│   │   └── filesystem.ts           # Types filesystem
│   ├── components/
│   │   ├── layout/                 # Structure de la page
│   │   │   ├── TopNav.tsx          # Navigation supérieure
│   │   │   ├── LeftSidebar.tsx     # Catalogue, collections, folders
│   │   │   ├── RightSidebar.tsx    # Panneau droit (orchestrateur)
│   │   │   ├── Toolbar.tsx         # Mode, recherche, taille
│   │   │   └── Filmstrip.tsx       # Bande défilante
│   │   ├── library/                # Mode bibliothèque
│   │   │   └── GridView.tsx        # Grille d'images
│   │   ├── develop/                # Mode développement
│   │   │   ├── DevelopView.tsx     # Vue développement + avant/après
│   │   │   ├── DevelopSliders.tsx  # Sliders de réglage
│   │   │   └── HistoryPanel.tsx    # Historique des events
│   │   ├── metadata/               # Métadonnées et EXIF
│   │   │   ├── Histogram.tsx       # Histogramme
│   │   │   ├── ExifGrid.tsx        # Grille EXIF compacte
│   │   │   └── MetadataPanel.tsx   # Fiche technique + tags
│   │   └── shared/                 # Composants partagés
│   │       ├── GlobalStyles.tsx    # Styles CSS inline
│   │       ├── ArchitectureMonitor.tsx # Console monitoring
│   │       ├── ImportModal.tsx     # Modal d'import
│   │       └── SearchBar.tsx        # Barre de recherche
│   └── hooks/                       # Hooks React personnalisés
│       └── useKeyboardShortcuts.ts # Raccourcis clavier
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
│   │   ├── commands/                 # Commandes Tauri CRUD (Phase 1.2)
│   │   │   ├── catalog.rs           # 7 commandes CRUD avec validation
│   │   │   ├── hashing.rs           # 8 commandes BLAKE3
│   │   │   ├── discovery.rs         # Commandes discovery/ingestion
│   │   │   ├── filesystem.rs        # 15 commandes filesystem
│   │   │   └── mod.rs               # Export des commandes
│   │   ├── models/                   # Types Rust du domaine
│   │   │   ├── catalog.rs           # Image, Collection, Folder, etc.
│   │   │   ├── dto.rs                # DTOs Tauri avec serde (Phase 1.2)
│   │   │   ├── hashing.rs           # Types BLAKE3
│   │   │   ├── discovery.rs         # Types discovery
│   │   │   ├── filesystem.rs        # Types filesystem
│   │   │   └── mod.rs               # Export des modèles
│   │   ├── services/                 # Services Rust
│   │   │   ├── blake3.rs            # Service BLAKE3
│   │   │   ├── discovery.rs         # Service discovery
│   │   │   ├── ingestion.rs         # Service ingestion
│   │   │   └── filesystem.rs        # Service filesystem
│   │   └── migrations/               # Scripts de migration SQL
│   │       └── 001_initial.sql      # Schéma complet du catalogue
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

## Composants UI

Les composants ont été décomposés en Phase 0.3. Chaque composant est dans son propre fichier avec des props typées.

### Composants (après décomposition Phase 0.3)

| Composant | Fichier | Lignes | Description |
|-----------|---------|--------|-------------|
| `App` | `src/App.tsx` | 152 | Orchestrateur pur (stores Zustand, callbacks) |
| `GlobalStyles` | `shared/GlobalStyles.tsx` | 16 | Styles CSS inline |
| `ArchitectureMonitor` | `shared/ArchitectureMonitor.tsx` | 54 | Console monitoring système |
| `ImportModal` | `shared/ImportModal.tsx` | 68 | Modal d'import avec progression |
| `BatchBar` | `shared/BatchBar.tsx` | 32 | Actions batch sur sélection |
| `KeyboardOverlay` | `shared/KeyboardOverlay.tsx` | 9 | Indicateurs raccourcis |
| `TopNav` | `layout/TopNav.tsx` | 29 | Navigation supérieure |
| `LeftSidebar` | `layout/LeftSidebar.tsx` | 64 | Catalogue, collections, folders |
| `RightSidebar` | `layout/RightSidebar.tsx` | 36 | Panneau droit (orchestrateur) |
| `Toolbar` | `layout/Toolbar.tsx` | 54 | Mode, recherche, taille thumbnails |
| `Filmstrip` | `layout/Filmstrip.tsx` | 36 | Bande défilante |
| `GridView` | `library/GridView.tsx` | 46 | Grille d'images responsive |
| `DevelopView` | `develop/DevelopView.tsx` | 38 | Image + mode avant/après |
| `DevelopSliders` | `develop/DevelopSliders.tsx` | 37 | Sliders de réglage |
| `HistoryPanel` | `develop/HistoryPanel.tsx` | 25 | Historique des events |
| `Histogram` | `metadata/Histogram.tsx` | 18 | Histogramme simulé |
| `ExifGrid` | `metadata/ExifGrid.tsx` | 17 | Grille EXIF compacte |
| `MetadataPanel` | `metadata/MetadataPanel.tsx` | 76 | Fiche technique + tags |

### Stores Zustand (Phase 0.4)

| Store | Fichier | État géré | Actions principales |
|-------|---------|-----------|-------------------|
| `catalogStore` | `stores/catalogStore.ts` | images[], sélection (Set), filterText, activeImageId | setImages, toggleSelection, setFilterText, getFilteredImages |
| `uiStore` | `stores/uiStore.ts` | activeView, sidebars, thumbnailSize, modals | setActiveView, toggleLeftSidebar, setThumbnailSize |
| `editStore` | `stores/editStore.ts` | eventLog[], currentEdits, historyIndex | addEvent, setCurrentEdits, updateEdit, undo/redo (préparés) |
| `systemStore` | `stores/systemStore.ts` | logs[], importState, appReady | addLog, setImportState, setAppReady |

---

## Base de Données SQLite

> ✅ **Implémenté en Phase 1.1** — Schéma complet avec 9 tables et migrations fonctionnelles

### Schéma du Catalogue

**Tables principales** :
- `images` : Table pivot avec BLAKE3 hash, métadonnées de base
- `folders` : Structure hiérarchique des dossiers importés
- `exif_metadata` : Métadonnées EXIF complètes (ISO, ouverture, objectif, GPS)
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

### Configuration SQLite

**PRAGMA optimisés** :
- `journal_mode = WAL` : Concurrency optimale pour lectures/écritures simultanées
- `synchronous = NORMAL` : Équilibre performance/sécurité des données
- `cache_size = -20000` : Cache 20MB en mémoire pour performance
- `page_size = 4096` : Taille de page optimisée pour les métadonnées images
- `temp_store = memory` : Tables temporaires en RAM
- `foreign_keys = ON` : Contraintes référentielles activées

### Système de Migrations

- **Automatique** : Migration `001_initial` appliquée au démarrage
- **Idempotent** : Les migrations peuvent être réappliquées sans erreur
- **Tracking** : Table `migrations` enregistre les versions appliquées
- **Tests** : 11 tests unitaires valident le système complet

---

## Service BLAKE3

> ✅ **Implémenté en Phase 1.3** - Service de hachage haute performance

### Architecture du Service

**Composants principaux** :
- `Blake3Service` : Service singleton avec streaming et cache
- `HashResult` : Résultats avec métadonnées (temps, taille, hash)
- `DuplicateDetector` : Détection de doublons par hash
- `ProgressCallback` : Callbacks pour progression UI

**Performance cibles** :
- <100ms pour hash de 50MB RAW
- Support streaming pour fichiers >100MB
- Cache LRU pour éviter rehash
- Parallélisation multi-cœurs

### Types Unifiés

**Sérialisation serde custom** :
- `PathBuf` ↔ `String` : Chemins cross-platform
- `DateTime<Utc>` ↔ `String` : Timestamps ISO 8601
- `Duration` ↔ `String` : Durées formatées
- `Vec<u8>` ↔ `String` : Données binaires (hex)

### Commandes Tauri

**8 commandes exposées** :
- `hash_file` : Hachage simple fichier
- `hash_batch` : Hachage batch avec progression
- `detect_duplicates` : Détection doublons
- `get_hash_cache_stats` : Statistiques cache
- `clear_hash_cache` : Vidage cache
- `verify_file_integrity` : Vérification intégrité
- `benchmark_hashing` : Benchmarks performance
- `get_supported_formats` : Formats supportés

---

## Service Filesystem

> ✅ **Implémenté en Phase 1.4** - Service complet de gestion du système de fichiers

### Architecture du Service

**Composants principaux** :
- `FilesystemService` : Service singleton avec gestion d'état async
- `FileWatcher` : Watchers avec debounce et filtres
- `FileLock` : Système de verrous partagés/exclusifs
- `EventQueue` : Queue d'événements avec traitement batch

**Performance cibles** :
- <10ms détection d'événements filesystem
- <1ms acquisition/libération de verrous
- Support de milliers de watchers simultanés

### Commandes Tauri

**15 commandes exposées** :
- `start_watcher` / `stop_watcher` : Gestion des watchers
- `acquire_lock` / `release_lock` / `is_file_locked` : Gestion des verrous
- `get_pending_events` / `clear_events` : Gestion des événements
- `get_filesystem_state` / `get_active_locks` / `list_active_watchers` : État du service
- `get_file_metadata` / `get_directory_contents` : Opérations fichiers/dossiers
- `create_directory` / `delete_file` : Opérations de base

---

## Tests et Qualité

### Framework de tests : Vitest avec jsdom
- **216 tests unitaires** au total (stores + types + services)
- **Coverage** : 98.93% (bien au-dessus des 80% requis)
- **Types de tests** :
  - Tests stores (4) : catalogStore, uiStore, editStore, systemStore
  - Tests types (4) : validation des interfaces TypeScript
  - Tests services (3) : catalogService, hashingService, discoveryService, filesystemService
  - Tests Rust (26) : base de données, modèles, services

### Pipeline CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`)
- **Frontend** : Type checking, linting, tests, build
- **Backend** : Formatting, clippy, build, tests
- **Integration** : Build Tauri complet
- **Security** : Audit des dépendances (Node.js + Rust)
- **Déclenchement** : Push sur main/develop/phase/*, PRs

---

## Scripts de Développement

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
```

---

## Fonctionnalités Actuelles

| Fonctionnalité | Statut | Connectée à un backend ? | Phase cible |
|----------------|--------|--------------------------|-------------|
| Affichage grille d'images | 🟡 Mock | Non (picsum.photos) | 3.1 |
| Sélection simple/multiple | 🟡 Mock | Oui (Zustand) | 0.4 |
| Notation (0-5 étoiles) | 🟡 Mock | Oui (Zustand) | 5.3 |
| Flagging (pick/reject) | 🟡 Mock | Oui (Zustand) | 5.3 |
| Import de fichiers | 🟡 Mock | Oui (discoveryService) | 2.1-2.4 |
| Recherche/filtrage | 🟡 Mock | Non (filter JS local) | 3.5 |
| Smart Collections | 🟡 Mock | Non (liens statiques) | 3.3 |
| Sliders de développement | 🟡 Mock | Non (CSS filters) | 4.2 |
| Histogramme | 🟡 Mock | Non (Math.sin) | 5.1 |
| EXIF display | 🟡 Mock | Non (données générées) | 5.1 |
| Tags/mots-clés | 🟡 Mock | Oui (Zustand) | 5.2 |
| Historique d'events | 🟡 Mock | Oui (Zustand) | 4.3 |
| Avant/Après | 🟡 Mock | Non (CSS filters) | 4.4 |
| Filmstrip | 🟡 Mock | Non (picsum.photos) | 3.1 |
| Batch operations | 🟡 Mock | Oui (Zustand) | 3.2 |
| Raccourcis clavier | 🟡 Mock | Non (event listeners) | 7.4 |
| Monitoring système | 🟡 Mock | Oui (systemStore) | 7.1 |
| Hachage BLAKE3 | ✅ Fonctionnel | Oui (hashingService) | 1.3 |
| Service filesystem | ✅ Fonctionnel | Oui (filesystemService) | 1.4 |
| Discovery fichiers | ✅ Fonctionnel | Oui (discoveryService) | 2.1 |

**Légende** :
- 🟡 Mock = Interface visible mais données simulées
- ✅ Fonctionnel = Fonctionne réellement (même sans backend)
- ⬜ Non implémenté = Pas encore dans le code

---

## Raccourcis Clavier

| Touche | Action | Implémenté ? |
|--------|--------|-------------|
| `G` | Vue Bibliothèque (grille) | ✅ |
| `D` | Vue Développement | ✅ |
| `1-5` | Attribuer une note | ✅ (mock) |
| `0` | Supprimer la note | ✅ (mock) |
| `P` | Flag "pick" | ✅ (mock) |
| `X` | Flag "reject" | ✅ (mock) |
| `U` | Supprimer le flag | ✅ (mock) |
| `Shift+clic` | Sélection multiple | ✅ (mock) |
| `Cmd+clic` | Sélection multiple | ✅ (mock) |
| Double-clic | Ouvrir en mode Develop | ✅ |

---

## Dépendances

### Production (Frontend)
| Package | Version | Usage |
|---------|---------|-------|
| `react` | ^19.2.0 | Framework UI |
| `react-dom` | ^19.2.0 | Rendu DOM |
| `lucide-react` | ^0.563.0 | Icônes SVG |
| `zustand` | ^5.0.11 | State management |
| `@tauri-apps/api` | ^2.10.1 | API Tauri frontend |

### Production (Backend)
| Crate | Version | Usage |
|-------|---------|-------|
| `tauri` | ^2.9.1 | Framework desktop |
| `tauri-plugin-log` | ^2 | Logging système |
| `tauri-plugin-fs` | ^2 | Accès fichiers |
| `tauri-plugin-dialog` | ^2 | Dialogues système |
| `tauri-plugin-shell` | ^2 | Commandes système |
| `serde` | ^1.0 | Sérialisation JSON |
| `rusqlite` | ^0.31.0 | Base de données SQLite |
| `blake3` | ^1.5 | Hachage cryptographique |
| `rayon` | ^1.10 | Parallélisation |
| `tokio` | ^1.40 | Runtime async |
| `chrono` | ^0.4.38 | Dates et timestamps |
| `thiserror` | ^1.0 | Gestion d'erreurs |

---

## Prochaines Étapes

1. **Phase 2.2** : Harvesting Métadonnées EXIF/IPTC
2. **Phase 2.3** : Génération de Previews multi-niveaux
3. **Phase 2.4** : UI d'Import connectée
4. **Phase 3.1** : Grille d'images réelle avec thumbnails locaux

Pour plus de détails sur les phases à venir, consultez la [roadmap complète](/features/roadmap.html).
