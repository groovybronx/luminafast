# LuminaFast — Documentation de l'Application

> **Ce document est la source de vérité sur l'état actuel de l'application.**
> Il DOIT être mis à jour après chaque sous-phase pour rester cohérent avec le code.
>
> **Dernière mise à jour** : 2026-02-12 (Phase 1.2) — État : Application Tauri avec CRUD Commands (TypeScript + Tauri + Zustand + SQLite + API Frontend-Backend)
>
> ### Décisions Projet (validées par le propriétaire)
> - **Phase 8 (Cloud/Sync)** : Reportée post-lancement
> - **Plateforme MVP** : macOS-first (Windows/Linux secondaire)
> - **Formats RAW prioritaires** : Canon (.CR3), Fuji (.RAF), Sony (.ARW)

---

## 1. Vue d'Ensemble

**LuminaFast** est une application de gestion d'actifs numériques photographiques (Digital Asset Management) inspirée de l'architecture d'Adobe Lightroom Classic, avec des optimisations modernes (DuckDB, BLAKE3, Event Sourcing).

### État actuel : Application Tauri avec CRUD Commands
L'application expose 7 commandes Tauri CRUD entièrement fonctionnelles. La base de données SQLite est opérationnelle, les DTOs sont implémentés, et la communication frontend-backend est établie via `__TAURI_INTERNALS__.invoke`. Le service TypeScript wrapper gère les erreurs et fallbacks.

### Objectif : Application Tauri autonome commercialisable
Desktop natif (macOS, Windows, Linux) avec édition paramétrique non-destructive, catalogue SQLite, et gestion de bibliothèques photographiques massives.

---

## 2. Stack Technique Actuelle

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
| Hashing | BLAKE3 | — | ⬜ Non installé (Phase 1.3) |

---

## 3. Architecture des Fichiers (État Actuel)

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
│   │   ├── Lightroomtechnique.md   # Analyse architecture Lightroom Classic
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
│   │   └── catalogService.ts       # Wrapper Tauri avec gestion d'erreurs
│   ├── types/                      # Types TypeScript du domaine
│   │   ├── index.ts                # Re-export central
│   │   ├── image.ts                # CatalogImage, ExifData, EditState
│   │   ├── collection.ts           # Collection, SmartQuery
│   │   ├── events.ts               # CatalogEvent, EventType
│   │   ├── ui.ts                   # ActiveView, LogEntry
│   │   └── dto.ts                  # DTOs Tauri (Phase 1.2)
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
│   │   │   └── mod.rs               # Export des commandes
│   │   ├── models/                   # Types Rust du domaine
│   │   │   ├── catalog.rs           # Image, Collection, Folder, etc.
│   │   │   ├── dto.rs                # DTOs Tauri avec serde (Phase 1.2)
│   │   │   └── mod.rs               # Export des modèles
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

## 4. Composants UI (Mockup Actuel)

Les composants ont été décomposés en Phase 0.3. Chaque composant est dans son propre fichier avec des props typées.

### 4.1 — Composants (après décomposition Phase 0.3)

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

### 4.2 — Stores Zustand (Phase 0.4)

| Store | Fichier | État géré | Actions principales |
|-------|---------|-----------|-------------------|
| `catalogStore` | `stores/catalogStore.ts` | images[], selection (Set), filterText, activeImageId | setImages, toggleSelection, setFilterText, getFilteredImages |
| `uiStore` | `stores/uiStore.ts` | activeView, sidebars, thumbnailSize, modals | setActiveView, toggleLeftSidebar, setThumbnailSize |
| `editStore` | `stores/editStore.ts` | eventLog[], currentEdits, historyIndex | addEvent, setCurrentEdits, updateEdit, undo/redo (préparés) |
| `systemStore` | `stores/systemStore.ts` | logs[], importState, appReady | addLog, setImportState, setAppReady |

**Architecture** : Les stores éliminent le props drilling et préparent la connexion aux commandes Tauri (Phase 1).

### 4.3 — Zones de l'interface

| Zone | Position | Fonctionnalités mockées |
|------|----------|------------------------|
| **TopNav** | Haut | Logo, navigation (Bibliothèque, Développement, Cartes, Impression), status PouchDB |
| **LeftSidebar** | Gauche (264px) | Catalogue, Smart Collections, Folders, bouton Import |
| **Toolbar** | Haut du canvas central | Mode grille/develop, barre de recherche, slider taille thumbnails |
| **GridView** | Centre (mode library) | Grille d'images responsive, sélection, rating, flags |
| **DevelopView** | Centre (mode develop) | Image plein écran, mode avant/après |
| **BatchBar** | Overlay central bas | Actions batch sur sélection multiple |
| **Filmstrip** | Bas (128px) | Bande défilante horizontale de toutes les images |
| **RightSidebar** | Droite (320px) | Histogramme, EXIF, sliders de développement OU métadonnées/tags |
| **ArchitectureMonitor** | Overlay bas-droite | Console système temps réel |
| **KeyboardOverlay** | Overlay bas-gauche | Indicateurs de raccourcis clavier |

---

## 5. Modèle de Données (Mockup Actuel)

### 5.1 — Structure d'une Image (mock)

```typescript
// Structure actuelle dans generateImages() — MOCK, pas encore typée
{
  id: number,                    // ID séquentiel
  hash: string,                  // Faux hash "b3-XXXX-af92"
  filename: string,              // "RAW_PRO_XXXX.RAF"
  url: string,                   // picsum.photos (externe)
  capturedAt: string,            // ISO date
  exif: {
    iso: number,                 // [160, 400, 800, 1600, 3200, 6400, 12800]
    fstop: number,               // [1.2, 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16]
    shutter: string,             // "1/500", "1/2000", etc.
    lens: string,                // "56mm f/1.2", etc.
    camera: string,              // "Fujifilm X-T5", etc.
    location: string             // "Paris, France", etc.
  },
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

### 5.2 — Structure d'un Event (mock)
```typescript
{
  id: string,         // safeID() — random string
  timestamp: number,  // Date.now()
  type: string,       // 'RATING', 'FLAG', 'EDIT', 'ADD_TAG'
  payload: any,       // Valeur de l'event
  targets: number[]   // IDs des images concernées
}
```

---

## 6. Fonctionnalités — État Actuel

| Fonctionnalité | Statut | Connectée à un backend ? | Phase cible |
|----------------|--------|--------------------------|-------------|
| Affichage grille d'images | 🟡 Mock | Non (picsum.photos) | 3.1 |
| Sélection simple/multiple | 🟡 Mock | Non (useState) | 0.4 |
| Notation (0-5 étoiles) | 🟡 Mock | Non (état local) | 5.3 |
| Flagging (pick/reject) | 🟡 Mock | Non (état local) | 5.3 |
| Import de fichiers | 🟡 Mock | Non (faux timer) | 2.1-2.4 |
| Recherche/filtrage | 🟡 Mock | Non (filter JS local) | 3.5 |
| Smart Collections | 🟡 Mock | Non (liens statiques) | 3.3 |
| Sliders de développement | 🟡 Mock | Non (CSS filters) | 4.2 |
| Histogramme | 🟡 Mock | Non (Math.sin) | 5.1 |
| EXIF display | 🟡 Mock | Non (données générées) | 5.1 |
| Tags/mots-clés | 🟡 Mock | Non (état local) | 5.2 |
| Historique d'events | 🟡 Mock | Non (état local) | 4.3 |
| Avant/Après | 🟡 Mock | Non (CSS filters) | 4.4 |
| Filmstrip | 🟡 Mock | Non (picsum.photos) | 3.1 |
| Batch operations | 🟡 Mock | Non (état local) | 3.2 |
| Raccourcis clavier | 🟡 Mock | Non (event listeners) | 7.4 |
| Monitoring système | 🟡 Mock | Non (faux logs) | 7.1 |
| Cloud sync status | 🟡 Mock | Non (label statique) | 8.2 |
| Taille thumbnails | ✅ Fonctionnel | N/A (CSS grid) | — |
| Navigation Library/Develop | ✅ Fonctionnel | N/A (state local) | — |

**Légende** :
- 🟡 Mock = Interface visible mais données simulées
- ✅ Fonctionnel = Fonctionne réellement (même sans backend)
- ⬜ Non implémenté = Pas encore dans le code

---

## 7. Raccourcis Clavier (Mockup)

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

## 8. Dépendances npm Actuelles

### Production
| Package | Version | Usage |
|---------|---------|-------|
| `react` | ^19.2.0 | Framework UI |
| `react-dom` | ^19.2.0 | Rendu DOM |
| `lucide-react` | ^0.563.0 | Icônes SVG |

### Développement
| Package | Version | Usage |
|---------|---------|-------|
| `vite` | ^7.3.1 | Bundler |
| `@vitejs/plugin-react` | ^5.1.1 | Plugin React pour Vite |
| `tailwindcss` | ^4.1.18 | Utilitaires CSS |
| `@tailwindcss/vite` | ^4.1.18 | Plugin TailwindCSS pour Vite |
| `postcss` | ^8.5.6 | Post-processeur CSS |
| `eslint` | ^9.39.1 | Linter |
| `eslint-plugin-react-hooks` | ^7.0.1 | Règles hooks React |
| `eslint-plugin-react-refresh` | ^0.4.24 | React Fast Refresh |
| `globals` | ^16.5.0 | Globales ESLint |
| `@types/react` | ^19.2.7 | Types React (non utilisés — JS) |
| `@types/react-dom` | ^19.2.3 | Types ReactDOM (non utilisés — JS) |
| `typescript` | ^5.6.3 | TypeScript strict |
| `typescript-eslint` | ^8.55.0 | ESLint pour TypeScript |
| `@testing-library/react` | ^16.1.0 | Tests React |
| `@vitest/coverage-v8` | ^1.6.0 | Coverage tests |
| `vitest` | ^2.1.8 | Framework de tests |
| `jsdom` | ^25.0.1 | Environnement DOM tests |
| `zustand` | ^5.0.2 | State management |
| `@tauri-apps/api` | ^2.2.0 | API Tauri frontend |
| `@tauri-apps/plugin-fs` | ^2.2.0 | Plugin filesystem |
| `@tauri-apps/plugin-dialog` | ^2.2.0 | Plugin dialogues |
| `@tauri-apps/plugin-shell` | ^2.2.0 | Plugin shell |

---

## 9. Dépendances Rust Actuelles

### Production
| Crate | Version | Usage |
|-------|---------|-------|
| `tauri` | ^2.9.1 | Framework desktop |
| `tauri-plugin-log` | ^2 | Logging système |
| `tauri-plugin-fs` | ^2 | Accès fichiers |
| `tauri-plugin-dialog` | ^2 | Dialogues système |
| `tauri-plugin-shell` | ^2 | Commandes système |
| `serde` | ^1.0 | Sérialisation JSON |
| `serde_json` | ^1.0 | JSON parsing/writing |
| `rusqlite` | ^0.31.0 | Base de données SQLite |
| `thiserror` | ^1.0 | Gestion d'erreurs |
| `chrono` | ^0.4.38 | Dates et timestamps |
| `blake3` | ^1.5 | Hachage cryptographique |
| `rayon` | ^1.10 | Parallélisation |
| `tokio` | ^1.40 | Runtime async |

### Développement
| Crate | Version | Usage |
|-------|---------|-------|
| `tauri-build` | ^2.5.1 | Build system |
| `tempfile` | ^3.0 | Fichiers temporaires tests |

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

- **Automatique** : Migration `001_initial` appliquée au démarrage
- **Idempotent** : Les migrations peuvent être réappliquées sans erreur
- **Tracking** : Table `migrations` enregistre les versions appliquées
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

**Framework de tests** : Vitest avec jsdom
- **115 tests unitaires** au total (stores + types + services)
- **Coverage** : 98.93% (bien au-dessus des 80% requis)
- **Types de tests** :
  - Tests stores (4) : catalogStore, uiStore, editStore, systemStore
  - Tests types (2) : validation des interfaces TypeScript et hashing
  - Tests services (2) : hashingService avec Tauri commands et fallbacks
  - Tests Rust (11) : base de données, modèles, et hashing service
- **Commandes** : `npm test`, `npm run test:ci`, `npm run rust:test`

### 12.3 — Pipeline CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`)
- **Frontend** : Type checking, linting, tests, build
- **Backend** : Formatting, clippy, build, tests
- **Integration** : Build Tauri complet
- **Security** : Audit des dépendances (Node.js + Rust)
- **Déclenchement** : Push sur main/develop/phase/*, PRs

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

**Modèles sérialisables** (`src-tauri/src/models/catalog.rs`) :
- `Image`, `Folder`, `ExifMetadata`, `Collection`
- `CollectionType`, `ImageFlag`, `ColorLabel`
- `NewImage`, `NewFolder`, `NewExifMetadata` (pour insertion)
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

## 13. Service Filesystem

> ✅ **Implémenté en Phase 1.4** - Service complet de gestion du système de fichiers avec watchers et locks

### 13.1 — Architecture du Service

**Composants principaux** :
- `FilesystemService` : Service singleton avec gestion d'état async
- `FileWatcher` : Watchers de fichiers avec debounce et filtres
- `FileLock` : Système de verrous partagés/exclusifs
- `EventQueue` : Queue d'événements avec traitement batch

**Performance cibles** :
- <10ms détection d'événements filesystem
- <1ms acquisition/libération de verrous
- Support de milliers de watchers simultanés

### 13.2 — Types Unifiés

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

| Date | Phase | Modification | Raison |
|------|-------|------------|--------|
| 2026-02-13 | 1.4 | Ajout section Service Filesystem complète | Implémentation Phase 1.4 terminée |
| 2026-02-13 | 1.3 | Mise à jour complète après Phase 1.3 (BLAKE3) | Synchronisation documentation avec état actuel |
| 2026-02-12 | 1.2 | Ajout section API/Commandes Tauri complète | Implémentation Phase 1.2 terminée |
| 2026-02-11 | 1.1 | Ajout section Base de Données SQLite complète | Implémentation Phase 1.1 terminée |
| 2026-02-11 | 1.1 | Mise à jour stack technique et architecture fichiers | Ajout src-tauri avec SQLite |
| 2026-02-11 | 1.1 | Ajout scripts Rust dans section développement | Scripts npm pour tests Rust |
| 2026-02-11 | 0.5 | Mise à jour après complétion Phase 0.5 | CI/CD implémenté et fonctionnel |

| Date | Sous-Phase | Nature de la modification |
|------|-----------|--------------------------|
| 2026-02-13 | Phase 1.4 | Implémentation Service Filesystem complet (watchers, locks, événements) |
| 2026-02-12 | Phase 1.2 | Implémentation CRUD Commands Tauri + DTOs + Service wrapper |
| 2026-02-11 | Pré-développement | Création initiale — état du mockup documenté |
| 2026-02-11 | Phase 0.1 | Migration TypeScript, ajout types/, mise à jour stack |
| 2026-02-11 | Phase 0.2 | Intégration Tauri v2, plugins fs/dialog/shell, src-tauri/ |
| 2026-02-11 | Phase 0.3 | Décomposition modulaire : 17 composants + 2 modules utilitaires |
| 2026-02-11 | Phase 0.4 | State Management Zustand : 4 stores, élimination props drilling |
| 2026-02-11 | Phase 0.5 | Pipeline CI & Linting : ESLint, Clippy, GitHub Actions, coverage 98.93% |
