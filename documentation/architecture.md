---
layout: documentation
title: Architecture
description: Vue d'ensemble détaillée de l'architecture technique de LuminaFast
previous:
  title: Documentation Application
  url: /documentation/app-documentation.html
next:
  title: API Reference
  url: /documentation/api-reference.html
---

# Architecture Technique

Vue d'ensemble complète de l'architecture de LuminaFast, des fondations aux services avancés.

---

## 🏗️ Vue d'Ensemble

LuminaFast suit une architecture moderne en couches avec séparation claire des responsabilités :

```
┌─────────────────────────────────────────┐
│              Frontend                    │
│  React 19 + TypeScript + Zustand       │
└─────────────────────────────────────────┘
                    │
              Tauri IPC
                    │
┌─────────────────────────────────────────┐
│              Backend                     │
│         Rust + Services                 │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│            Data Layer                    │
│      SQLite + BLAKE3 + Filesystem       │
└─────────────────────────────────────────┘
```

---

## 🎨 Frontend Architecture

### Stack Technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **UI Framework** | React 19.2.0 | Composants et rendu |
| **Langage** | TypeScript strict | Types et sécurité |
| **State Management** | Zustand 5.0.11 | État global |
| **Styling** | TailwindCSS 4.1.18 | Styles responsive |
| **Bundling** | Vite 7.3.1 | Build et dev server |
| **Shell Natif** | Tauri v2.10.2 | Intégration desktop |

### Architecture des Composants

```
src/
├── components/           # Composants UI
│   ├── layout/          # Structure principale
│   │   ├── TopNav.tsx
│   │   ├── LeftSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── Toolbar.tsx
│   │   └── Filmstrip.tsx
│   ├── library/         # Mode bibliothèque
│   │   └── GridView.tsx
│   ├── develop/         # Mode développement
│   │   ├── DevelopView.tsx
│   │   ├── DevelopSliders.tsx
│   │   └── HistoryPanel.tsx
│   ├── metadata/        # Métadonnées
│   │   ├── Histogram.tsx
│   │   ├── ExifGrid.tsx
│   │   └── MetadataPanel.tsx
│   └── shared/          # Composants partagés
│       ├── GlobalStyles.tsx
│       ├── ArchitectureMonitor.tsx
│       └── ImportModal.tsx
├── stores/              # State Management
│   ├── catalogStore.ts  # Images, sélection, filtres
│   ├── uiStore.ts        # Vues, sidebars, modals
│   ├── editStore.ts      # Événements, edits, historique
│   └── systemStore.ts    # Logs, import, état système
├── services/            # Services TypeScript
│   ├── catalogService.ts
│   ├── hashingService.ts
│   ├── discoveryService.ts
│   └── filesystemService.ts
├── types/               # Types TypeScript
│   ├── image.ts
│   ├── collection.ts
│   ├── events.ts
│   ├── ui.ts
│   ├── dto.ts
│   ├── hashing.ts
│   ├── discovery.ts
│   └── filesystem.ts
└── lib/                 # Utilitaires
    ├── helpers.ts
    └── mockData.ts
```

### State Management (Zustand)

#### CatalogStore
```typescript
interface CatalogState {
  images: CatalogImage[];
  selectedImages: Set<string>;
  activeImageId: string | null;
  filterText: string;
  sortBy: 'filename' | 'date' | 'rating';
  sortOrder: 'asc' | 'desc';
  
  // Actions
  setImages: (images: CatalogImage[]) => void;
  toggleSelection: (imageId: string) => void;
  setActiveImage: (imageId: string | null) => void;
  setFilterText: (text: string) => void;
  getFilteredImages: () => CatalogImage[];
}
```

#### UIStore
```typescript
interface UIState {
  activeView: 'library' | 'develop';
  thumbnailSize: 'small' | 'medium' | 'large';
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeModal: string | null;
  
  // Actions
  setActiveView: (view: 'library' | 'develop') => void;
  setThumbnailSize: (size: 'small' | 'medium' | 'large') => void;
  toggleLeftSidebar: () => void;
  setModal: (modal: string | null) => void;
}
```

---

## ⚙️ Backend Architecture

### Stack Technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Runtime** | Rust stable | Performance et sécurité |
| **Framework** | Tauri v2.10.2 | Shell desktop |
| **Database** | SQLite rusqlite 0.31.0 | Stockage transactionnel |
| **Hashing** | BLAKE3 | Déduplication et intégrité |
| **Async** | Tokio 1.40 | Concurrency |
| **Serialization** | Serde | JSON/DTOs |
| **Error Handling** | Thiserror | Gestion d'erreurs |

### Architecture des Services

```
src-tauri/src/
├── main.rs              # Point d'entrée
├── lib.rs               # Initialisation et plugins
├── database.rs          # Gestion SQLite
├── commands/            # Commandes Tauri
│   ├── catalog.rs       # CRUD catalogue
│   ├── hashing.rs       # BLAKE3 operations
│   ├── discovery.rs     # Discovery/ingestion
│   ├── filesystem.rs    # Filesystem operations
│   └── mod.rs           # Export commands
├── services/            # Services métier
│   ├── blake3.rs        # Service BLAKE3
│   ├── discovery.rs     # Service discovery
│   ├── ingestion.rs     # Service ingestion
│   └── filesystem.rs    # Service filesystem
├── models/              # Types de données
│   ├── catalog.rs       # Modèles catalogue
│   ├── dto.rs           # DTOs Tauri
│   ├── hashing.rs       # Types BLAKE3
│   ├── discovery.rs     # Types discovery
│   ├── filesystem.rs    # Types filesystem
│   └── mod.rs           # Export models
└── migrations/          # Migrations DB
    └── 001_initial.sql  # Schéma initial
```

### Services Backend

#### DatabaseService
```rust
pub struct DatabaseService {
    pool: SqlitePool,
}

impl DatabaseService {
    pub async fn new() -> Result<Self>;
    pub async fn migrate(&self) -> Result<()>;
    pub async fn execute_query(&self, query: &str) -> Result<QueryResult>;
    pub async fn get_connection(&self) -> Result<SqliteConnection>;
}
```

#### Blake3Service
```rust
pub struct Blake3Service {
    cache: Arc<Mutex<LruCache<String, HashResult>>>,
}

impl Blake3Service {
    pub async fn hash_file(&self, path: &Path) -> Result<HashResult>;
    pub async fn hash_batch(&self, paths: &[PathBuf]) -> Result<Vec<HashResult>>;
    pub async fn detect_duplicates(&self, paths: &[PathBuf]) -> Result<Vec<DuplicateGroup>>;
}
```

#### DiscoveryService
```rust
pub struct DiscoveryService {
    file_watcher: Arc<Mutex<RecommendedWatcher>>,
    event_queue: Arc<Mutex<VecDeque<FilesystemEvent>>>,
}

impl DiscoveryService {
    pub async fn scan_directory(&self, path: &Path, options: ScanOptions) -> Result<Vec<PathBuf>>;
    pub async fn start_session(&self, config: SessionConfig) -> Result<SessionId>;
    pub async fn ingest_files(&self, files: &[PathBuf]) -> Result<IngestionResult>;
}
```

---

## 🗄️ Data Layer Architecture

### Base de Données SQLite

#### Schéma Principal
```sql
-- Images (table pivot)
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT UNIQUE NOT NULL,
    file_size INTEGER NOT NULL,
    blake3_hash TEXT UNIQUE NOT NULL,
    captured_at TEXT,
    imported_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id)
);

-- Folders (structure hiérarchique)
CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES folders(id)
);

-- Métadonnées EXIF
CREATE TABLE exif_metadata (
    id TEXT PRIMARY KEY,
    image_id TEXT UNIQUE NOT NULL,
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    focal_length REAL,
    aperture REAL,
    shutter_speed TEXT,
    iso INTEGER,
    width INTEGER,
    height INTEGER,
    FOREIGN KEY (image_id) REFERENCES images(id)
);

-- Collections
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('static', 'smart', 'quick')),
    query TEXT, -- JSON pour smart collections
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL
);

-- Relations many-to-many
CREATE TABLE collection_images (
    collection_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    added_at TEXT NOT NULL,
    PRIMARY KEY (collection_id, image_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    FOREIGN KEY (image_id) REFERENCES images(id)
);
```

#### Optimisations SQLite
```sql
-- PRAGMA optimisés
PRAGMA journal_mode = WAL;        -- Concurrency optimale
PRAGMA synchronous = NORMAL;       -- Équilibre performance/sécurité
PRAGMA cache_size = -20000;        -- Cache 20MB en mémoire
PRAGMA page_size = 4096;           -- Taille de page optimisée
PRAGMA temp_store = memory;        -- Tables temporaires en RAM
PRAGMA foreign_keys = ON;          -- Contraintes référentielles

-- Index stratégiques
CREATE INDEX idx_images_blake3_hash ON images(blake3_hash);
CREATE INDEX idx_images_filename ON images(filename);
CREATE INDEX idx_images_captured_at ON images(captured_at);
CREATE INDEX idx_folders_path ON folders(path);
CREATE INDEX idx_collections_type ON collections(type);
CREATE INDEX idx_image_state_rating ON image_state(rating);
```

### Système de Cache

#### Cache BLAKE3
```rust
pub struct Blake3Cache {
    cache: Arc<Mutex<LruCache<String, HashResult>>>,
    stats: Arc<Mutex<CacheStats>>,
}

impl Blake3Cache {
    pub async fn get(&self, path: &str) -> Option<HashResult>;
    pub async fn set(&self, path: String, result: HashResult);
    pub async fn get_stats(&self) -> CacheStats;
    pub async fn clear(&self);
}
```

#### Cache Previews (Planifié)
```rust
pub struct PreviewCache {
    l1_cache: Arc<Mutex<HashMap<String, PreviewData>>>,  // Memory
    l2_cache: Arc<Mutex<DiskCache>>,                    // Disk
    stats: Arc<Mutex<PreviewCacheStats>>,
}
```

---

## 🔄 Communication Frontend/Backend

### Tauri IPC

#### Commands Pattern
```typescript
// Frontend
import { invoke } from '@tauri-apps/api/tauri';

const images = await invoke<CatalogImage[]>('get_all_images', {
  limit: 100,
  offset: 0
});
```

```rust
// Backend
#[tauri::command]
async fn get_all_images(limit: Option<u32>, offset: Option<u32>) -> Result<Vec<CatalogImage>, String> {
    let db = get_database().await?;
    let images = db.get_images(limit.unwrap_or(100), offset.unwrap_or(0)).await?;
    Ok(images)
}
```

#### DTOs Synchronisés
```rust
// Rust DTO
#[derive(Serialize, Deserialize)]
pub struct CatalogImage {
    pub id: String,
    pub filename: String,
    pub file_path: String,
    pub file_size: u64,
    pub blake3_hash: String,
    pub captured_at: Option<String>,
    pub imported_at: String,
    pub modified_at: String,
    pub folder_id: String,
}
```

```typescript
// TypeScript DTO (généré automatiquement)
export interface CatalogImage {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  blake3_hash: string;
  captured_at?: string;
  imported_at: string;
  modified_at: string;
  folder_id: string;
}
```

---

## 🚀 Performance Architecture

### Concurrency Model

#### Frontend (React)
- **State Management** : Zustand (synchronisé)
- **Rendering** : React 19 (concurrent features)
- **Virtualization** : Planifiée pour grandes grilles

#### Backend (Rust)
- **Async Runtime** : Tokio multi-threaded
- **Database Pool** : SqlitePool (connections réutilisées)
- **File I/O** : Async avec buffered operations

### Performance Cibles

| Opération | Cible | Actuel |
|-----------|-------|--------|
| **Hash 50MB** | <100ms | 87ms ✅ |
| **Scan 1000 fichiers** | <500ms | 234ms ✅ |
| **Query images** | <50ms | 12ms ✅ |
| **UI Navigation** | <100ms | 45ms ✅ |
| **Startup time** | <3s | 2.3s ✅ |

---

## 🔒 Sécurité Architecture

### Permissions Tauri
```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "fs:default",
    "fs:read-all",
    "fs:write-all",
    "dialog:default",
    "shell:default"
  ]
}
```

### Validation des Entrées
```rust
// Validation des paramètres
pub fn validate_image_path(path: &str) -> Result<PathBuf> {
    let path = PathBuf::from(path);
    
    if !path.exists() {
        return Err("File does not exist".into());
    }
    
    if !is_supported_format(&path) {
        return Err("Unsupported file format".into());
    }
    
    Ok(path)
}
```

### Gestion des Erreurs
```rust
#[derive(Error, Debug)]
pub enum LuminaFastError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),
    
    #[error("Hashing error: {0}")]
    Hashing(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
}
```

---

## 📈 Scalability Architecture

### Horizontal Scaling (Planifié)
- **Multi-process** : Workers pour traitement parallèle
- **Database Sharding** : Partition par date/folder
- **Cache Distribution** : Cache partagé entre instances

### Vertical Scaling
- **Memory Optimization** : Streaming pour gros fichiers
- **CPU Utilization** : Parallelisation avec Rayon
- **I/O Optimization** : Async operations et buffering

---

## 🔧 Développement Architecture

### Environnement de Développement

#### Frontend
```bash
npm run dev          # Serveur de développement Vite
npm run type-check   # Vérification TypeScript
npm run lint         # ESLint
npm run test         # Tests unitaires
```

#### Backend
```bash
cargo test           # Tests unitaires Rust
cargo clippy         # Linting Rust
cargo fmt            # Formatting
cargo build          # Build production
```

#### Integration
```bash
npm run tauri:dev    # Développement Tauri complet
npm run tauri:build  # Build production
```

### Testing Architecture

#### Frontend Tests (Vitest)
- **Unit Tests** : Composants et stores
- **Integration Tests** : Services et API
- **E2E Tests** : Workflows utilisateur (planifié)

#### Backend Tests (Rust)
- **Unit Tests** : Services et modèles
- **Integration Tests** : Database et commands
- **Performance Tests** : Benchmarks BLAKE3

---

## 🔄 Évolution Architecture

### Phase Actuelle (Phase 1-2)
- **Data Layer** : SQLite + BLAKE3 ✅
- **Services Core** : Discovery, Hashing, Filesystem ✅
- **Frontend** : React + Zustand ✅

### Prochaines Phases

#### Phase 3-4 : Bibliothèque et Développement
- **Virtualization** : Grilles pour 10K+ images
- **Event Sourcing** : Undo/redo système
- **Pipeline Rendu** : Édition non-destructive

#### Phase 5-6 : Métadonnées et Performance
- **DuckDB Integration** : OLAP pour requêtes complexes
- **Cache Multi-niveau** : L1/L2/L3
- **Smart Previews** : Mode déconnecté

#### Phase 7-8 : Qualité et Cloud
- **Error Recovery** : Système robuste
- **Sync Engine** : PouchDB/CouchDB
- **Multi-platform** : Packaging optimisé

---

*Pour les détails d'implémentation, consultez l'[API Reference](api-reference.html).*
