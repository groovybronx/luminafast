# PHASE 6.1 — Système de Cache Multiniveau

## Objectif Global

Implémenter un système de cache à 3 niveaux pour permettre aux catalogues de 50K+ images de se charger en <3 secondes, tout en maintenant une réactivité <100ms pour les opérations courantes.

---

## Architecture

### Hiérarchie des Caches

| Niveau | Nom     | Localisaton        | Contenu                             | Capacité                 | TTL       |
| ------ | ------- | ------------------ | ----------------------------------- | ------------------------ | --------- |
| **L1** | Mémoire | RAM (frontend)     | Thumbnails 240px + métadonnées      | ~500 images max          | Session   |
| **L2** | Disque  | `Previews.lrdata/` | Previews standard 1440px            | Limité par espace disque | Session   |
| **L3** | Source  | Volume utilisateur | Fichiers RAW originaux (non cachés) | N/A                      | Permanent |

### Flux d'Accès

```mermaid
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ├─→ L1 (Memory) - Fast (μs)
       │   ├─ HIT  → Return thumbnail + metadata
       │   └─ MISS → Continue
       │
       ├─→ L2 (Disk) - Medium (ms)
       │   ├─ HIT  → Return preview, populate L1
       │   └─ MISS → Continue
       │
       └─→ L3 (Source) - Slow (100s+ ms)
           └─ Generate/load from RAW, populate L2+L1
```

### Invalidation

- **Manual**: User edits trigger `cacheInvalidationService.invalidate(imageId)`
- **Chain**: Invalidate L1 → propagate to L2 (mark stale, async cleanup)
- **Smart**: Only affected images (query results cache also cleared)

---

## Phase Breakdown

### Phase 1: Frontend L1 Cache Services ✅

- **Status**: COMPLETED
- LRU cache in TypeScript (generic `LRUCache<K, V>`)
- Cache invalidation service with event subscriptions
- React hook `useImageCache(imageId)` with loading/error states
- Comprehensive test coverage

**Files created:**

- `src/services/cacheService.ts` — LRU implementation
- `src/services/cacheInvalidationService.ts` — Invalidation orchestration
- `src/hooks/useImageCache.ts` — React integration
- `src/services/__tests__/*` — Test suite

---

### Phase 2: Backend L1/L2 Cache Layer (⏳ IN PROGRESS)

**Objective**: Implement Rust cache services for in-memory (L1) and disk (L2) caching.

#### Backend Files to Create

| File                              | Purpose                      | Type   |
| --------------------------------- | ---------------------------- | ------ |
| `src-tauri/src/cache/mod.rs`      | Module exports & config      | NEW    |
| `src-tauri/src/cache/l1.rs`       | In-memory LRU cache          | NEW    |
| `src-tauri/src/cache/l2.rs`       | Disk cache manager           | NEW    |
| `src-tauri/src/cache/metadata.rs` | Cache metadata tracking      | NEW    |
| `src-tauri/src/commands/cache.rs` | Tauri commands for cache ops | NEW    |
| `src-tauri/src/lib.rs`            | Register cache commands      | MODIFY |

#### Rust Dependencies to Add

```toml
# In Cargo.toml
lru = "0.12"          # LRU eviction
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
```

#### Key Implementations

**L1 Cache (In-Memory LRU)**

```rust
pub struct CacheL1 {
    thumbnails: Arc<Mutex<lru::LruCache<u32, ThumbnailData>>>,
    metadata: Arc<Mutex<HashMap<u32, CacheMetadata>>>,
}

impl CacheL1 {
    pub fn new(max_size: usize) -> Self { /*...*/ }
    pub async fn get(&self, image_id: u32) -> Option<ThumbnailData> { /*...*/ }
    pub async fn put(&self, image_id: u32, data: ThumbnailData) { /*...*/ }
    pub async fn invalidate(&self, image_id: u32) { /*...*/ }
    pub async fn clear(&self) { /*...*/ }
}
```

**L2 Cache (Disk Manager)**

```rust
pub struct CacheL2 {
    preview_root: PathBuf,  // Previews.lrdata/
    db: Arc<Database>,      // previews.db metadata
}

impl CacheL2 {
    pub async fn get(&self, image_id: u32) -> Result<Vec<u8>, Error> { /*...*/ }
    pub async fn put(&self, image_id: u32, preview: Vec<u8>) -> Result<(), Error> { /*...*/ }
    pub async fn exists(&self, image_id: u32) -> Result<bool, Error> { /*...*/ }
    pub async fn invalidate(&self, image_id: u32) -> Result<(), Error> { /*...*/ }
}
```

#### Tauri Commands

```rust
#[tauri::command]
pub async fn get_cached_thumbnail(image_id: u32) -> Result<Option<ThumbnailData>, String>;

#[tauri::command]
pub async fn get_cached_preview(image_id: u32) -> Result<Option<Vec<u8>>, String>;

#[tauri::command]
pub async fn clear_cache(level: Option<String>) -> Result<(), String>;

#[tauri::command]
pub async fn get_cache_stats() -> Result<CacheStats, String>;

#[tauri::command]
pub async fn invalidate_image_cache(image_id: u32) -> Result<(), String>;
```

#### Validation Criteria (Phase 2)

- [ ] L1 cache stores/retrieves thumbnails with O(1) lookup
- [ ] L2 cache persists previews to disk and retrieves them
- [ ] Invalidation propagates from frontend → Rust backend
- [ ] Cache stats command shows memory usage and hit rates
- [ ] Tauri commands work bi-directionally with frontend
- [ ] All Rust tests pass
- [ ] Zero memory leaks (Arc/Mutex cleanup on drop)

---

### Phase 3: Cache Integration & Persistence

- Integrate cache into existing catalog service
- Modify `get_images()` and `get_image_detail()` to check caches first
- Implement database-level cache metadata schema
- Backend event sourcing triggers cache invalidation

### Phase 4: Frontend Integration

- Connect `catalogService.ts` to new Tauri cache commands
- Implement cache warming on app startup
- Add cache status indicators to UI
- Performance monitoring

### Phase 5: Testing & Optimization

- Load test with 50K image catalog
- Measure startup time (<3s target)
- Validate cache hit rates
- Fine-tune LRU eviction thresholds
- Benchmark before/after cache implementation

---

## Performance Targets

| Metric                         | Target | Validation                           |
| ------------------------------ | ------ | ------------------------------------ |
| Catalog load (50K images)      | <3s    | Startup timer in ArchitectureMonitor |
| Image detail query (cache hit) | <1ms   | Cache stats command                  |
| Thumbnail retrieval            | <10μs  | L1 hit time                          |
| Preview retrieval (disk)       | <50ms  | L2 hit time                          |
| Cache invalidation             | <10ms  | Event sourcing chain                 |

---

## Thread Safety & Concurrency

- **Frontend**: JavaScript is single-threaded; LRU cache uses `Map` (no locks needed)
- **Backend**: Rust uses `Arc<Mutex<>>` for thread-safe access to shared cache structures
- **Tauri IPC**: Uses channels; cache operations are async with proper error handling

---

## Cache Invalidation Pipeline

```
Edit Event (EventSourcing)
    ↓
editStore.addEvent() [Frontend]
    ↓
cacheInvalidationService.onEdit() [Frontend L1]
    ↓
invalidate_image_cache(imageId) Tauri Command [Rust L1+L2]
    ↓
Clear L1 (in-memory)
Clear L2 (disk, mark stale)
Mark query results cache stale
    ↓
Re-render with fresh preview
```

---

## Dependencies

- ✅ Phase 5.4 (Sidecar XMP) — Metadata persistence
- ✅ Phase 4.1 (Event Sourcing) — Edit invalidation triggers
- ✅ Phase 2.3 (Preview Generation) — Previews.lrdata structure
- ✅ Phase 1.1 (SQLite Schema) — Database foundation

---

## Notes


- **Session-only design**: Cache is volatile; safe data must persist to DB
- **LRU eviction**: Max 500 thumbnails; oldest unused exits memory to make room
- **Lazy L2**: Disk cache filled opportunistically; doesn't pre-generate previews
