# LuminaFast — Plan de Développement Senior : Mockup → Application Tauri Commercialisable

Plan complet de transformation du prototype React/Vite (703 lignes monolithiques) en application desktop Tauri autonome de niveau commercial, découpé en phases optimisées pour des agents IA avec fenêtre de contexte de 200K tokens.

---

## Contexte & État Actuel

- **Stack mockup** : React 19 + Vite 7 + TailwindCSS 4 + Lucide Icons
- **Code** : Un seul fichier `App.jsx` (703 lignes), données mock inline, aucun backend
- **UI validée** : Library grid, Develop sliders, Collections sidebar, Filmstrip, Import modal, EXIF display, Tags, History log, Keyboard shortcuts
- **Architecture cible** (d'après `Docs/`) : SQLite+DuckDB, BLAKE3 CAS, FlatBuffers, Event Sourcing, Preview cache multiniveau

---

## Contraintes pour Agents IA (200K tokens)

Chaque sous-phase est conçue pour :

1. **Tenir dans ~15-25 fichiers** de contexte simultané max
2. **Avoir un périmètre isolé** avec des interfaces claires (types partagés)
3. **Produire un livrable testable** indépendamment
4. **Inclure un fichier BRIEF.md** par sous-phase résumant le contexte nécessaire

---

## PHASE 0 — Fondations & Scaffolding Tauri

> **Objectif** : Passer d'un prototype web à un squelette Tauri fonctionnel avec une architecture modulaire.
> **Durée estimée** : 1-2 semaines

### 0.1 — Migration TypeScript

- Renommer `.jsx` → `.tsx`, ajouter `tsconfig.json` strict
- Créer les types de base dans `src/types/` : `Image`, `ExifData`, `EditState`, `Collection`, `Event`
- Installer `typescript`, `@types/react`, `@types/react-dom`
- **Critère de validation** : `tsc --noEmit` passe sans erreur

### 0.2 — Scaffolding Tauri v2

- `cargo install create-tauri-app` puis init dans le projet existant
- Configurer `src-tauri/` : `Cargo.toml`, `tauri.conf.json`, permissions filesystem
- Ajouter le plugin `tauri-plugin-shell`, `tauri-plugin-fs`, `tauri-plugin-dialog`
- Vérifier le build : `cargo tauri dev` lance l'app dans une fenêtre native
- **Critère de validation** : L'UI mockup s'affiche dans la fenêtre Tauri

### 0.3 — Décomposition Modulaire du Frontend

- Éclater `App.jsx` monolithique en modules :

  ```
  src/
  ├── components/
  │   ├── layout/          # TopNav, LeftSidebar, RightSidebar, Filmstrip
  │   ├── library/         # GridView, ThumbnailCard, BatchBar
  │   ├── develop/         # DevelopView, SliderPanel, HistoryPanel, BeforeAfter
  │   ├── import/          # ImportModal, ProgressBar
  │   └── shared/          # Histogram, ArchitectureMonitor, SearchBar
  ├── stores/              # Zustand stores
  ├── services/            # Tauri command wrappers
  ├── hooks/               # Custom React hooks
  ├── types/               # TypeScript interfaces & enums
  └── lib/                 # Utilitaires purs
  ```

- Chaque composant est un fichier unique avec ses props typées
- **Critère de validation** : L'app fonctionne visuellement à l'identique après décomposition

### 0.4 — State Management (Zustand)

- Installer Zustand, créer les stores :
  - `catalogStore` : images[], selection[], filterText
  - `uiStore` : activeView, sidebarOpen, thumbnailSize
  - `editStore` : eventLog[], currentEdits
  - `systemStore` : logs[], importState
- Migrer tous les `useState` de App.tsx vers les stores
- **Critère de validation** : Tous les états sont dans Zustand, App.tsx ne contient plus de `useState`

### 0.5 — Pipeline CI & Linting

- ESLint strict + Prettier + lint-staged
- GitHub Actions : lint → type-check → build Tauri (macOS, Windows, Linux)
- Husky pre-commit hooks
- **Critère de validation** : Pipeline CI verte sur les 3 plateformes

---

## PHASE 1 — Core Data Layer (Backend Rust)

> **Objectif** : Implémenter le moteur de données en Rust dans `src-tauri/`.
> **Durée estimée** : 2-3 semaines

### 1.1 — Schéma SQLite du Catalogue

- Créer le schéma dans `src-tauri/migrations/` :

  ```sql
  -- Table pivot
  CREATE TABLE images (
    id INTEGER PRIMARY KEY,
    blake3_hash TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    extension TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    orientation INTEGER DEFAULT 0,
    file_size_bytes INTEGER,
    captured_at TEXT,
    imported_at TEXT DEFAULT (datetime('now')),
    folder_id INTEGER REFERENCES folders(id)
  );

  CREATE TABLE folders (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    volume_name TEXT,
    parent_id INTEGER REFERENCES folders(id)
  );

  CREATE TABLE exif_metadata (
    image_id INTEGER PRIMARY KEY REFERENCES images(id),
    iso INTEGER,
    aperture REAL,        -- f-number
    shutter_speed REAL,   -- log2(seconds) pour tri efficace
    focal_length REAL,
    lens TEXT,
    camera_make TEXT,
    camera_model TEXT,
    gps_lat REAL,
    gps_lon REAL,
    color_space TEXT
  );

  CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('static','smart','quick')) DEFAULT 'static',
    parent_id INTEGER REFERENCES collections(id),
    smart_query TEXT,     -- JSON pour smart collections
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE collection_images (
    collection_id INTEGER REFERENCES collections(id),
    image_id INTEGER REFERENCES images(id),
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (collection_id, image_id)
  );

  CREATE TABLE image_state (
    image_id INTEGER PRIMARY KEY REFERENCES images(id),
    rating INTEGER DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
    flag TEXT CHECK(flag IN ('pick','reject',NULL)),
    color_label TEXT
  );

  CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES tags(id)
  );

  CREATE TABLE image_tags (
    image_id INTEGER REFERENCES images(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (image_id, tag_id)
  );
  ```

- Configurer SQLite PRAGMA : `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-20000`, `page_size=4096`
- Utiliser `rusqlite` ou `sqlx` avec migrations embarquées
- **Critère de validation** : Tests unitaires Rust créant et requêtant un catalogue en mémoire

### 1.2 — Tauri Commands CRUD

- Exposer les commandes Rust via `#[tauri::command]` :
  - `get_all_images(filter?)` → Vec<ImageDTO>
  - `get_image_detail(id)` → ImageDetailDTO
  - `update_image_state(id, rating?, flag?)` → Result
  - `create_collection(name, type, parent_id?)` → CollectionDTO
  - `add_images_to_collection(collection_id, image_ids)` → Result
  - `get_collections()` → Vec<CollectionDTO>
  - `search_images(query)` → Vec<ImageDTO>
- Créer les DTOs Rust avec `serde::Serialize/Deserialize`
- Côté frontend : créer `src/services/catalogService.ts` wrappant `invoke()`
- **Critère de validation** : Appels aller-retour Tauri fonctionnels avec données SQLite réelles

### 1.3 — Service BLAKE3 (Content Addressable Storage)

- Implémenter dans `src-tauri/src/hashing.rs` :
  - Hachage parallèle multi-cœurs via `blake3` crate
  - Streaming hash pour gros fichiers RAW (>50MB) sans charger en RAM
  - Détection de doublons à l'import
- Exposer `compute_blake3(path)` comme commande Tauri
- **Critère de validation** : Hash d'un fichier RAW de 50MB en <200ms, détection de doublons fonctionnelle

### 1.4 — Gestion du Système de Fichiers

- Surveiller les volumes/dossiers avec `notify` crate (file watcher)
- Implémenter la résolution de chemins : absolu ↔ relatif au volume
- Détecter les fichiers manquants/déplacés (reconciliation par hash BLAKE3)
- Fichier `.lock` à l'ouverture du catalogue
- **Critère de validation** : L'app détecte un fichier déplacé et le retrouve par hash

---

## PHASE 2 — Pipeline d'Import

> **Objectif** : Remplacer `generateImages()` par un vrai pipeline d'ingestion de fichiers RAW.
> **Durée estimée** : 2 semaines

### 2.1 — Discovery & Ingestion de Fichiers

- Dialog natif Tauri pour sélection de dossier/fichiers
- Scanner récursif avec filtrage par extension (RAF, CR3, NEF, ARW, DNG, JPEG, TIFF)
- Pipeline parallèle : découverte → hachage BLAKE3 → vérification doublons → insertion DB
- Progress reporting via Tauri events (channel)
- **Critère de validation** : Import de 100 fichiers RAW avec barre de progression temps réel

### 2.2 — Harvesting de Métadonnées EXIF/IPTC

- Utiliser `kamadak-exif` ou `rexiv2` en Rust pour extraction
- Extraire : ISO, ouverture, vitesse (stocker en log2), focale, objectif, boîtier, GPS, date
- Stocker dans `exif_metadata` + `image_state` (rating=0, flag=null)
- Extraction IPTC : titre, description, copyright, mots-clés
- **Critère de validation** : Métadonnées EXIF affichées dans le panneau droit pour des fichiers réels

### 2.3 — Génération de Previews (Pyramide d'Images)

- Générer 3 niveaux par image :
  - **Thumbnail** : 240px bord long, JPEG q75 → pour grille
  - **Standard** : 1440px bord long, JPEG q85 → pour affichage plein écran
  - **1:1** : Résolution native, JPEG q90 → pour zoom pixel
- Stockage dans `{catalog_dir}/Previews.lrdata/` avec structure hashée
- Base SQLite secondaire `previews.db` pour le mapping
- Utiliser `image` crate ou `libvips` via FFI pour la performance
- **Critère de validation** : Navigation fluide dans une grille de 500+ images avec previews réelles

### 2.4 — UI d'Import Connectée

- Remplacer le mock `ImportModal` par un vrai workflow :
  1. Sélection de source (dialog natif)
  2. Scan & preview des fichiers trouvés
  3. Options (dossier de destination, détection doublons, génération previews)
  4. Progress multi-étapes avec Tauri event channel
  5. Résumé post-import
- **Critère de validation** : Import end-to-end fonctionnel depuis l'UI

---

## PHASE 3 — Module Bibliothèque

> **Objectif** : Grille d'images connectée au catalogue réel avec collections fonctionnelles.
> **Durée estimée** : 2-3 semaines

### 3.1 — Grille d'Images Réelle

- Remplacer `picsum.photos` par les thumbnails locales (`convertFileSrc()` de Tauri)
- Virtualisation avec `react-virtuoso` ou `@tanstack/virtual` pour 10K+ images
- Lazy loading des thumbnails avec intersection observer
- Tri par date, nom, rating, ISO, etc.
- **Critère de validation** : Scroll fluide (60fps) sur un catalogue de 5000 images

### 3.2 — Collections Statiques (CRUD)

- Créer / renommer / supprimer des collections
- Drag & drop d'images dans les collections
- Ensembles de collections (hiérarchie parent/enfant)
- Quick Collection (sélection temporaire)
- Sidebar gauche affichant l'arbre des collections
- **Critère de validation** : Créer une collection, y ajouter des images, la retrouver au relancement

### 3.3 — Smart Collections (Requêtes Dynamiques)

- UI de construction de règles : champ → opérateur → valeur
  - Ex: "Rating >= 4 AND Camera contains 'GFX' AND Date > 2024-01-01"
- Sérialisation des règles en JSON stocké dans `collections.smart_query`
- Parseur JSON → SQL WHERE clause côté Rust
- Résultats recalculés dynamiquement à l'ouverture
- **Critère de validation** : Smart Collection "ISO > 1600 AND Rating >= 3" retourne les bonnes images

### 3.4 — Navigateur de Dossiers

- Arborescence des dossiers importés dans la sidebar
- Compteur d'images par dossier
- Indicateur de volume en ligne / hors ligne
- Navigation par clic
- **Critère de validation** : L'arborescence reflète les dossiers réels sur disque

### 3.5 — Recherche & Filtrage

- Barre de recherche unifiée avec syntaxe :
  - Texte libre (filename, tags, lieu)
  - Préfixes structurés : `star:5`, `iso:>1600`, `camera:gfx`, `lens:35mm`
- Parseur de requête frontend → commande Tauri → SQL
- Résultats temps réel avec debounce
- **Critère de validation** : Recherche "iso:>3200 star:4" retourne les résultats en <50ms sur 10K images

---

## PHASE 4 — Module Développement (Édition Paramétrique)

> **Objectif** : Système d'édition non-destructive avec Event Sourcing.
> **Durée estimée** : 3-4 semaines

### 4.1 — Event Sourcing Engine

- Schéma SQL :

  ```sql
  CREATE TABLE edit_events (
    id INTEGER PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    event_type TEXT NOT NULL,  -- 'EXPOSURE', 'CONTRAST', 'CROP', etc.
    payload BLOB NOT NULL,     -- FlatBuffer ou JSON binaire
    timestamp TEXT DEFAULT (datetime('now')),
    session_id TEXT
  );

  CREATE TABLE edit_snapshots (
    image_id INTEGER PRIMARY KEY REFERENCES images(id),
    snapshot BLOB NOT NULL,    -- État complet sérialisé
    event_count INTEGER,       -- Nombre d'events depuis dernier snapshot
    updated_at TEXT
  );
  ```

- Logique Rust : `replay_events(image_id)` → état complet
- Snapshot automatique tous les N events pour performance
- **Critère de validation** : Undo/redo de 100 opérations en <10ms

### 4.2 — Pipeline de Rendu Image

- **Phase A (immédiat)** : CSS filters comme dans le mockup actuel (exposure, contrast, saturation)
- **Phase B (évolution)** : WASM module avec `image` crate pour traitement pixel réel
  - Courbes de tons
  - Balance des blancs (temp/tint)
  - Hautes lumières / Ombres
  - Clarté / Texture
  - Vignetage
- Appliquer les edits sur le preview Standard (pas le RAW original)
- **Critère de validation** : Les sliders modifient l'image en temps réel (<16ms par frame)

### 4.3 — Historique & Snapshots UI

- Panneau historique affichant la timeline d'events
- Clic sur un event = restauration à cet état (time travel)
- Bouton "Snapshot" = sauvegarde nommée d'un état
- Bouton "Reset" = retour à l'état d'import
- **Critère de validation** : Navigation dans l'historique avec preview instantanée

### 4.4 — Comparaison Avant/Après

- Mode split-view (déjà mockée) connectée aux vrais edits
- Mode overlay avec slider de transparence
- Mode side-by-side synchronisé (zoom + pan)
- **Critère de validation** : Split view montrant le RAW original vs preview éditée

---

## PHASE 5 — Métadonnées & Organisation

> **Objectif** : Système complet de métadonnées et mots-clés persistant.
> **Durée estimée** : 1-2 semaines

### 5.1 — Panneau EXIF Connecté

- Afficher les vraies données EXIF depuis SQLite
- Histogramme calculé depuis les pixels du preview (via canvas ou WASM)
- Affichage conditionnel selon le type de fichier
- **Critère de validation** : EXIF réel affiché pour chaque image sélectionnée

### 5.2 — Système de Tags Hiérarchique

- Tags avec hiérarchie parent/enfant (ex: Lieu > France > Paris)
- Auto-complétion lors de la saisie
- Application batch sur sélection multiple
- Panneau de gestion des tags (rename, merge, delete)
- **Critère de validation** : Tag hiérarchique créé, appliqué à 10 images, recherchable

### 5.3 — Rating & Flagging Persistants

- Raccourcis clavier (0-5, P, X, U) sauvegardent en SQLite
- Batch operations sur sélection multiple
- Filtres rapides dans la sidebar (par rating, par flag)
- **Critère de validation** : Rating/flag persiste après fermeture/réouverture de l'app

### 5.4 — Sidecar XMP (Lecture/Écriture)

- Lire les XMP existants à l'import
- Écrire les métadonnées modifiées dans des fichiers `.xmp` sidecar
- Option de synchronisation automatique ou manuelle
- Respect du standard XMP d'Adobe pour interopérabilité
- **Critère de validation** : Modifier un rating dans LuminaFast → visible dans un lecteur XMP externe

---

## PHASE 6 — Performance & Optimisation

> **Objectif** : Scalabilité à 100K+ images avec réactivité <100ms.
> **Durée estimée** : 2 semaines

### 6.1 — Système de Cache Multiniveau

- Cache L1 : Thumbnails en mémoire (LRU, max 500 images)
- Cache L2 : Previews standard sur disque (Previews.lrdata)
- Cache L3 : Fichier RAW original (accès sur demande uniquement)
- Invalidation intelligente sur modification d'edit
- **Critère de validation** : Ouverture du catalogue de 50K images en <3s

### 6.2 — Intégration DuckDB (OLAP)

- Synchronisation périodique SQLite → DuckDB (Parquet ou in-memory)
- Requêtes analytiques complexes via DuckDB :
  - Agrégations (photos par mois, par objectif, par lieu)
  - Smart Collections à haute performance
  - Statistiques du catalogue
- Utiliser `duckdb` crate Rust
- **Critère de validation** : Agrégation sur 100K images en <100ms

### 6.3 — Virtualisation Avancée de la Grille

- Scroll virtuel avec recycling de DOM nodes
- Prefetching intelligent (charger N rows ahead)
- Placeholder blur-hash pendant le chargement
- Adaptation dynamique de la qualité selon la vitesse de scroll
- **Critère de validation** : Scroll fluide 60fps sur 100K images

### 6.4 — Optimisation SQLite

- Index composites sur les colonnes fréquemment filtrées
- FTS5 pour recherche full-text sur tags et noms de fichiers
- VACUUM automatique périodique
- PRAGMA `integrity_check` au lancement
- Monitoring des performances de requête (EXPLAIN QUERY PLAN)
- **Critère de validation** : Toute requête catalogue <50ms sur 100K entrées

---

## PHASE 7 — Polish & Qualité Commerciale

> **Objectif** : UX professionnelle, robustesse, packaging multi-plateforme.
> **Durée estimée** : 2-3 semaines

### 7.1 — Gestion d'Erreurs & Recovery

- Error boundaries React pour chaque zone de l'UI
- Logging structuré (Rust `tracing` + frontend `console`)
- Recovery automatique de la DB en cas de crash (WAL checkpoint)
- Notifications utilisateur pour erreurs non-bloquantes
- **Critère de validation** : Crash simulé → relance → aucune perte de données

### 7.2 — Backup & Intégrité

- Backup automatique du catalogue (configurable : quotidien/hebdomadaire)
- Vérification d'intégrité au lancement (`PRAGMA integrity_check`)
- Export du catalogue complet (SQLite + XMP sidecars)
- Restauration depuis backup
- **Critère de validation** : Restauration complète depuis un backup

### 7.3 — Packaging Multi-Plateforme

- Tauri bundler : `.dmg` (macOS), `.msi` (Windows), `.AppImage` (Linux)
- Code signing pour macOS (notarization Apple)
- Auto-updater Tauri intégré
- Splash screen & icône d'application
- **Critère de validation** : Installation propre sur macOS, Windows, Linux

### 7.4 — Accessibilité & UX

- Raccourcis clavier documentés (overlay existant → modal complet)
- Thème clair/sombre
- Responsive panels (redimensionnement des sidebars)
- Drag & drop natif (import de fichiers depuis Finder/Explorer)
- Menus natifs Tauri (File, Edit, View, Help)
- **Critère de validation** : Toutes les actions accessibles au clavier, menus natifs fonctionnels

### 7.5 — Onboarding & Documentation Utilisateur

- Écran de bienvenue au premier lancement
- Création guidée du premier catalogue
- Tooltips contextuels
- Page "About" avec version et licences open-source
- **Critère de validation** : Un utilisateur non-technique peut importer ses photos en <2 min

---

## PHASE 8 — Cloud & Synchronisation (Future)

> **Objectif** : Collaboration multi-appareil. Phase optionnelle post-lancement.
> **Durée estimée** : 4-6 semaines

### 8.1 — Smart Previews pour Mode Déconnecté

- Génération de proxys lossy DNG / HEIC (2560px bord long)
- Stockage séparé dans `SmartPreviews.lrdata/`
- Édition complète sur les Smart Previews sans accès aux originaux
- **Critère de validation** : Modifier une image en mode déconnecté, sync au retour

### 8.2 — Synchronisation PouchDB/CouchDB

- Catalogue local → PouchDB (IndexedDB)
- Serveur distant → CouchDB
- Sync bidirectionnelle des métadonnées et réglages d'édition
- Les fichiers binaires ne sont PAS synchronisés (seulement Smart Previews)
- **Critère de validation** : Modifier un rating sur appareil A → visible sur appareil B en <5s

### 8.3 — Résolution de Conflits

- Détection de conflits de révision (même image éditée sur 2 appareils)
- UI de résolution : choix entre les deux versions ou merge
- Log d'audit de synchronisation
- **Critère de validation** : Conflit simulé → résolution manuelle → état cohérent

---

## Stack Technologique Finale

| Couche                  | Technologie             | Rôle                                |
| ----------------------- | ----------------------- | ----------------------------------- |
| **Shell natif**         | Tauri v2                | Fenêtre native, filesystem, dialogs |
| **Backend**             | Rust                    | Performances critiques, hashing, DB |
| **DB transactionnelle** | SQLite (rusqlite)       | Catalogue, éditions, collections    |
| **DB analytique**       | DuckDB                  | Smart Collections, agrégations      |
| **Hashing**             | BLAKE3                  | Content Addressable Storage         |
| **Frontend**            | React 19 + TypeScript   | Interface utilisateur               |
| **State**               | Zustand                 | Gestion d'état frontend             |
| **Styling**             | TailwindCSS 4           | Design system                       |
| **Icons**               | Lucide React            | Iconographie                        |
| **Virtualisation**      | @tanstack/virtual       | Grilles de 100K+ images             |
| **Image processing**    | `image` crate / libvips | Previews & édition                  |
| **Métadonnées**         | `kamadak-exif` / rexiv2 | Extraction EXIF/IPTC                |
| **Sync (future)**       | PouchDB / CouchDB       | Cloud multi-appareil                |

---

## Convention de Nommage des Branches

```
phase/0.1-typescript-migration
phase/0.2-tauri-scaffolding
phase/1.1-sqlite-schema
...
```

Chaque sous-phase = 1 branche = 1 PR = 1 revue de code.

---

## Structure de Brief par Sous-Phase

Chaque sous-phase doit commencer par la création d'un fichier `Docs/briefs/PHASE-X.Y.md` contenant :

1. **Objectif** (3 lignes max)
2. **Fichiers à créer/modifier** (liste exhaustive)
3. **Dépendances** (quelles sous-phases doivent être terminées)
4. **Interfaces** (types/signatures à respecter)
5. **Critères de validation** (tests à écrire)
6. **Contexte architectural** (extrait des docs pertinents)

Ce brief sert de **prompt principal** pour l'agent IA travaillant sur la sous-phase.
