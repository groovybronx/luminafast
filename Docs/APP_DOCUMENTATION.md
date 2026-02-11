# LuminaFast — Documentation de l'Application

> **Ce document est la source de vérité sur l'état actuel de l'application.**
> Il DOIT être mis à jour après chaque sous-phase pour rester cohérent avec le code.
>
> **Dernière mise à jour** : 2026-02-11 (Phase 0.4) — État : Prototype / Mockup (TypeScript + Tauri + Zustand)
>
> ### Décisions Projet (validées par le propriétaire)
> - **Phase 8 (Cloud/Sync)** : Reportée post-lancement
> - **Plateforme MVP** : macOS-first (Windows/Linux secondaire)
> - **Formats RAW prioritaires** : Canon (.CR3), Fuji (.RAF), Sony (.ARW)

---

## 1. Vue d'Ensemble

**LuminaFast** est une application de gestion d'actifs numériques photographiques (Digital Asset Management) inspirée de l'architecture d'Adobe Lightroom Classic, avec des optimisations modernes (DuckDB, BLAKE3, Event Sourcing).

### État actuel : 🟡 Prototype / Mockup
L'application est actuellement un mockup React avec des données simulées. Aucune fonctionnalité n'est connectée à un backend réel.

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
| DB transactionnelle | SQLite | — | ⬜ Non installé (Phase 1.1) |
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
│   ├── types/                      # Types TypeScript du domaine
│   │   ├── index.ts                # Re-export central
│   │   ├── image.ts                # CatalogImage, ExifData, EditState
│   │   ├── collection.ts           # Collection, SmartQuery
│   │   ├── events.ts               # CatalogEvent, EventType
│   │   └── ui.ts                   # ActiveView, LogEntry
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
│   │       ├── BatchBar.tsx        # Actions batch
│   │       └── KeyboardOverlay.tsx # Raccourcis clavier
│   ├── test/                        # Configuration et utilitaires de tests
│   │   ├── setup.ts                 # Setup global Vitest
│   │   └── storeUtils.ts             # Utilitaires pour tests Zustand
│   └── assets/
│       └── react.svg
├── src-tauri/
│   ├── Cargo.toml                  # Dépendances Rust
│   ├── tauri.conf.json             # Config Tauri (fenêtre, CSP, build)
│   ├── build.rs                    # Script de build Tauri
│   ├── capabilities/
│   │   └── default.json            # Permissions (fs, dialog, shell)
│   ├── src/
│   │   ├── main.rs                 # Point d'entrée Rust
│   │   └── lib.rs                  # Module library + plugins
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

---

## 9. Configuration

### Vite (`vite.config.js`)
- Plugins : `@vitejs/plugin-react` + `@tailwindcss/vite`
- Pas de configuration custom (défaut Vite)

### ESLint (`eslint.config.js`)
- Configuration standard Vite + React

### TailwindCSS
- Importé via `@import "tailwindcss"` dans `index.css`
- Pas de `tailwind.config.js` (utilise la config v4 auto-detect)

---

## 10. Schéma de Base de Données

> ⬜ **Non implémenté** — Prévu en Phase 1.1
>
> Le schéma cible est défini dans le plan de développement principal.
> Cette section sera mise à jour lors de l'implémentation de la Phase 1.1.

---

## 11. Outils de Qualité et CI/CD

### 11.1 — Linting et Formatting

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

### 11.2 — Tests et Coverage

**Framework de tests** : Vitest avec jsdom
- **65 tests unitaires** couvrant tous les stores Zustand et les types
- **Coverage** : 98.93% (bien au-dessus des 80% requis)
- **Types de tests** :
  - Tests stores : catalogStore, uiStore, editStore, systemStore
  - Tests types : validation des interfaces TypeScript
- **Commandes** : `npm test`, `npm run test:ci`

### 11.3 — Pipeline CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`)
- **Frontend** : Type checking, linting, tests, build
- **Backend** : Formatting, clippy, build, tests
- **Integration** : Build Tauri complet
- **Security** : Audit des dépendances (Node.js + Rust)
- **Déclenchement** : Push sur main/develop/phase/*, PRs

### 11.4 — Scripts de Développement

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
npm run tauri:dev       # Développement Tauri
npm run build:tauri    # Build Tauri production
```

---

## 12. API / Commandes Tauri

> ⬜ **Non implémenté** — Prévu en Phase 1.2
>
> Les commandes cibles sont définies dans le plan de développement principal.
> Cette section sera mise à jour lors de l'implémentation de la Phase 1.2.

---

## 13. Historique des Modifications de ce Document

| Date | Sous-Phase | Nature de la modification |
|------|-----------|--------------------------|
| 2026-02-11 | Pré-développement | Création initiale — état du mockup documenté |
| 2026-02-11 | Phase 0.1 | Migration TypeScript, ajout types/, mise à jour stack |
| 2026-02-11 | Phase 0.2 | Intégration Tauri v2, plugins fs/dialog/shell, src-tauri/ |
| 2026-02-11 | Phase 0.3 | Décomposition modulaire : 17 composants + 2 modules utilitaires |
| 2026-02-11 | Phase 0.4 | State Management Zustand : 4 stores, élimination props drilling |
| 2026-02-11 | Phase 0.5 | Pipeline CI & Linting : ESLint, Clippy, GitHub Actions, coverage 98.93% |
