# MAINTENANCE — Phase 6.1 Cache System Completion

> **Statut** : ⬜ **En attente**
> **Objectif** : Compléter l'implémentation du cache multiniveau en ajoutant le cache-first pattern et la persistance des métadonnées DB
> **Durée estimée** : 3-4 heures

---

## Résumé Exécutif

Phase 6.1 est actuellement à **68% de conformité**. Les composants de cache (L1 en-mémoire, L2 disque, services TS) existent mais ne sont **pas intégrés aux requêtes principales** du catalogue. Ce brief consolide deux corrections :

1. **Cache-First Pattern** : Modifier `get_all_images()` et `get_image_detail()` pour vérifier les caches AVANT requête DB
2. **Database Metadata Schema** : Créer table `cache_metadata` pour persister stats et enable warm startup

---

## Objectif

Implémenter l'intégration complète du système de cache multiniveau en tant que couche d'accélération réelle devant les requêtes SQLite, et ajouter la persistance des métadonnées du cache dans la base de données pour optimiser le warm startup.

---

## Périmètre

### ✅ Inclus dans cette phase

- Refactorisation de `get_all_images()` pour appliquer le cache-first pattern avec fallback à DB
- Refactorisation de `get_image_detail()` pour cache lookup → populate on miss
- Migration SQLite : table `cache_metadata` (image_id, cached_at, last_accessed, size_bytes, source)
- Commandes Tauri : `get_cache_metadata()`, `update_cache_metadata()`, `warm_cache_from_db()`
- Frontend : Optionnel — intégration de `BackendCacheService` dans `catalogService.ts`
- Tests unitaires Rust : cache hit/miss scenarios, DB roundtrip avoidance
- Tests d'intégration : 50K image load <3s avec cache warming

### ❌ Exclus intentionnellement

- Optimisation DuckDB (Phase 6.2)
- Virtualisation avancée grille (Phase 6.3)
- Optimisation SQLite indexes (Phase 6.4)
- Auto-cleanup L2 disk cache (reporter à Phase 6.2)

### 📋 Dépendances à partir de cette phase

- Phase 6.2 (DuckDB) peut maintenant s'appuyer sur le cache persisté pour warm startup OLAP

---

## Dépendances

### Phases

- ✅ Phase 6.1 (Cache Services) — Tous les composants L1/L2/services existants
- ✅ Phase 1.1 (SQLite Schema) — Database infrastructure
- ✅ Phase 4.1 (Event Sourcing) — Invalidation triggers

### Ressources Externes

- `rusqlite` crate (déjà présent) — Gestion DB
- `tokio` (déjà présent) — Async cache operations
- `serde_json` (déjà présent) — Metadata serialization

### Test Infrastructure

- ✅ Vitest + React Testing Library (TypeScript tests)
- ✅ Rust tokio::test framework
- ✅ tempfile crate (Rust tests)
- REQUIRED : `chrono` crate pour timestamps (déjà présent via autres dépendances)

---

## Fichiers

### À créer

**Migrations :**

- `src-tauri/migrations/011_cache_metadata.sql` — Schema pour table `cache_metadata`

**Rust Services :**

- `src-tauri/src/services/cache_metadata_service.rs` — Service pour persist/retrieve cache metadata

**Tests Rust :**

- `src-tauri/tests/cache_completion_integration.rs` — Tests cache-first pattern avec 50K images

### À modifier

**Rust Commands :**

- `src-tauri/src/commands/catalog.rs` — Refactor `get_all_images()` et `get_image_detail()` pour cache-first
- `src-tauri/src/commands/cache.rs` — Ajouter 3 commandes pour metadata

**Rust Cache :**

- `src-tauri/src/cache/mod.rs` — Ajouter `get_stats()` avec accès à DB metadata
- `src-tauri/src/cache/l2.rs` — Logger writes to cache_metadata table

**Rust Lib :**

- `src-tauri/src/lib.rs` — Initialiser cache metadata service en setup()

**TypeScript Services :**

- `src/services/catalogService.ts` — (OPTIONNEL) Ajouter cache layer avant invoke()
- `src/services/backendCacheService.ts` — Ajouter `getCacheMetadata()`, `warmCacheFromDB()`

**TypeScript Tests :**

- `src/services/__tests__/catalogService.test.ts` — Tests cache hit scenarios dans getAllImages()

**Documentation :**

- `Docs/APP_DOCUMENTATION.md` — Section "Cache Metadata Schema" + "Integration Flow"

---

## Interfaces Publiques

### Tauri Commands (Rust)

```rust
// get_all_images — Cache-First Pattern
#[tauri::command]
pub async fn get_all_images(
    filter: Option<ImageFilter>,
    state: State<'_, AppState>,
    cache: State<'_, CacheInstance>,
) -> CommandResult<Vec<ImageDTO>>;
// CHANGE: Check queryResults cache BEFORE DB query, populate on miss

// get_image_detail — Cache-First Pattern
#[tauri::command]
pub async fn get_image_detail(
    id: u32,
    state: State<'_, AppState>,
    cache: State<'_, CacheInstance>,
) -> CommandResult<ImageDetailDTO>;
// CHANGE: Check image cache BEFORE DB query, populate on miss

// NEW: Get cache metadata for monitoring
#[tauri::command]
pub async fn get_cache_metadata(
    image_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<Option<CacheMetadataDTO>>;

// NEW: Update cache metadata (called on cache write)
#[tauri::command]
pub async fn update_cache_metadata(
    image_id: u32,
    source: String,  // "L1", "L2", "COMPUTED"
    size_bytes: u64,
    state: State<'_, AppState>,
) -> CommandResult<()>;

// NEW: Warm cache from DB on startup
#[tauri::command]
pub async fn warm_cache_from_db(
    batch_size: u32,  // Default: 50
    state: State<'_, AppState>,
    cache: State<'_, CacheInstance>,
) -> CommandResult<WarmCacheResult>;
```

### TypeScript DTOs

```typescript
// Backend → Frontend
export interface CacheMetadataDTO {
  imageId: number;
  cachedAt: string; // ISO 8601
  lastAccessed: string;
  sizeBytes: number;
  source: 'L1' | 'L2' | 'COMPUTED';
}

export interface WarmCacheResult {
  warmedCount: number;
  skippedCount: number;
  totalImages: number;
  elapsedMs: number;
}

// (Existing) ImageDTO — unchanged
```

### Rust Structs

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetadataDTO {
    pub image_id: u32,
    pub cached_at: String,
    pub last_accessed: String,
    pub size_bytes: u64,
    pub source: CacheSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CacheSource {
    L1,
    L2,
    COMPUTED,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WarmCacheResult {
    pub warmed_count: u32,
    pub skipped_count: u32,
    pub total_images: u32,
    pub elapsed_ms: u128,
}
```

---

## Contraintes Techniques

### Rust Backend

- ✅ NO `unwrap()` — utiliser `Result<T, E>` systématiquement
- ✅ Valider image_id, filter, sizes (ranges)
- ✅ Transactions DB : `cache_metadata` writes doivent être atomiques avec cache stores
- ✅ Tests unitaires pour : cache hit/miss, DB metadata operations, cache population
- ✅ Performance : `get_image_detail()` cache hit doit être <1ms (vs DB ~50-100ms)

### TypeScript Frontend

- ✅ Strict TypeScript — no `any`
- ✅ Memoize expensive operations (cache lookups)
- ✅ Error handling : try/catch on invoke calls, fallback to DB on cache error

### SQLite Database

- ✅ Migration `011_cache_metadata.sql` doit être autorun au startup
- ✅ Foreign key ON DELETE CASCADE vers `images(id)`
- ✅ Index sur `(image_id, cached_at)` pour warm-start queries
- ✅ NO deletions unless via cascade from image deletion

---

## Architecture Cible

### Schéma DB

```sql
-- New table for cache persistence
CREATE TABLE cache_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL UNIQUE,
    cached_at TEXT NOT NULL,                -- ISO 8601 timestamp
    last_accessed TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('L1', 'L2', 'COMPUTED')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

CREATE INDEX idx_cache_metadata_image_id ON cache_metadata(image_id);
CREATE INDEX idx_cache_metadata_cached_at ON cache_metadata(cached_at DESC);
```

### Flux de Données (Cache-First Pattern)

```
Frontend: invoke('get_image_detail', {id: 42})
    ↓
Rust Command: get_image_detail(id=42, cache, db)
    ├─ Check cache.get_thumbnail(42) ← L1 hit (μs) ✓
    │   └─ Return ImageDTO + cache metadata
    ├─ OR Check cache L2 fallback ← L2 hit (ms) ✓
    │   └─ Update cache_metadata table
    │   └─ Return ImageDTO
    └─ OR Query DB ← L1/L2 miss (100+ ms)
        ├─ Execute SELECT query
        ├─ Cache result in L1/L2
        ├─ Insert into cache_metadata
        └─ Return ImageDTO

Cache Invalidation (Event Sourcing):
  Edit Event (editStore.addEvent)
    ↓ cacheInvalidationService.onEdit(imageId)
    ├─ Call invalidate_image_cache(imageId) Tauri
    └─ Rust: invalidate_image() → clear L1 + L2 + DELETE cache_metadata
```

### Performance Targets

| Operation            | Target | Current | Expected After  |
| -------------------- | ------ | ------- | --------------- |
| Cache hit (L1)       | <10μs  | TBD     | ✓ <1μs          |
| Cache hit (L2)       | <50ms  | TBD     | ✓ <10ms         |
| DB query (no cache)  | N/A    | ~100ms  | N/A             |
| Cache invalidation   | <10ms  | TBD     | ✓ <5ms          |
| Startup (50K images) | <3s    | TBD     | ✓ ~2s (with HDD |
| Warm cache (50K→L1)  | <2s    | N/A     | ✓ <1.5s (batch) |

---

## Critères de Validation

### Tests Unitaires Rust ([✅ MUST PASS](example))

- [ ] `test_cache_first_pattern_with_hit()` — cache hit returns immediately, no DB query
- [ ] `test_cache_first_pattern_with_miss()` — cache miss triggers DB query, populates cache
- [ ] `test_cache_metadata_persist()` — metadata written to DB, survives session
- [ ] `test_cache_metadata_unique_image_id()` — UNIQUE constraint enforced
- [ ] `test_cache_invalidation_cascades()` — DELETE image → DELETE cache_metadata

### Tests d'Intégration Rust ([✅ MUST PASS](example))

- [ ] `test_50k_image_load_with_cache_warming()` — <3s startup with batch warm
- [ ] `test_l1_hit_rate_with_typical_access()` — >70% L1 hit rate (80% recent access)
- [ ] `test_l1_l2_combined_hit_rate()` — >85% combined hit rate
- [ ] `test_cache_invalidation_and_repopulate()` — edit event invalidates, next read repopulates

### Tests Frontend TypeScript ([✅ MUST PASS](example))

- [ ] `test_catalogService_with_cached_results()` — getAllImages uses cache layer
- [ ] `test_backendCacheService_get_metadata()` — getCacheMetadata() returns DTO
- [ ] `test_cache_warming_on_app_startup()` — warmCache() runs, populates first batch

### Performance Benchmarks ([✅ REQUIRED](example))

- [ ] `benchmark_cache_hit_latency()` — L1 hit <10μs average over 10K accesses
- [ ] `benchmark_db_query_latency()` — Uncached query ~100-200ms for single image
- [ ] `benchmark_cache_miss_populate()` — Cache populate <1s for 50 images
- [ ] `load_test_50k_startup()` — Full startup (DB init + cache warm) <3s

---

## Plan d'Implémentation

### Phase A : Schema & Service (Frontend 2h)

1. Créer migration `011_cache_metadata.sql`
2. Créer `cache_metadata_service.rs` avec CRUD operations
3. Modifier `lib.rs` : initialize service en setup()
4. Tests unitaires : CRUD operations + constraint enforcement

### Phase B : Backend Command Refactor (Durée 1h)

1. Refactor `get_all_images()` : check `queryResults` cache before DB
2. Refactor `get_image_detail()` : check L1 cache before DB
3. Add cache population on miss → store metadata
4. Modify `cache.rs` commands : add 3 new commands for metadata
5. Tests : cache hit/miss scenarios, metadata isolation

### Phase C : Integration Testing & Benchmarks (Durée 1h)

1. Integration test : 50K catalog load with warming
2. Benchmark : cache hit rates, latency
3. Load test execution pour valider <3s target
4. Frontend test optionnel : catalogService with cache

### Phase D : Documentation (Durée 30min)

1. Update `APP_DOCUMENTATION.md` : Cache Integration section
2. Add ADR : "Cache-First Pattern Rationale"

---

## Notes Importantes

### Cache Invalidation Chain

Event Sourcing triggers cache invalidation AUTOMATICALLY :

```
editStore.addEvent(imageId)
  → cacheInvalidationService.invalidateCacheForImage(imageId) [Frontend]
  → invalidate_image_cache(imageId) Tauri command
  → Rust: cache.invalidate_image() + DELETE cache_metadata
```

**NO** manual invalidation calls needed in catalog commands.

### Database Transactions

Metadata writes MUST be atomic with cache operations. Use SQLite transactions where needed :

```rust
let tx = db.transaction().map_err(|e| format!("Transaction error: {}", e))?;
cache.put_thumbnail(id, data).await?;
cache_metadata_service.update(&tx, id, source, size).await?;
tx.commit().map_err(|e| format!("Commit error: {}", e))?;
```

### Warm Cache Strategy

On app startup :

1. Initialize cache infrastructure (L1 + L2 directories) ✅ (already done)
2. Query DB for first N recently-accessed images (N=50)
3. Batch populate L1 via `warm_cache_from_db()` command
4. Frontend calls `cacheWarmingService.warmCache()` ✅ (already done)

---

## Donneurs Utiles

### Existing Phase 6.1 Code Locations

- L1 cache : `src-tauri/src/cache/l1.rs` (100+ LOC)
- L2 cache : `src-tauri/src/cache/l2.rs` (100+ LOC)
- Cache commands : `src-tauri/src/commands/cache.rs` (150+ LOC)
- Frontend cache service : `src/services/cacheService.ts` (100+ LOC)
- Cache warming : `src/services/cacheWarmingService.ts` (80+ LOC)

### Key Methods to Modify

- `get_all_images()` @ [src-tauri/src/commands/catalog.rs:167](src-tauri/src/commands/catalog.rs#L167)
- `get_image_detail()` @ [src-tauri/src/commands/catalog.rs:198](src-tauri/src/commands/catalog.rs#L198)

---

## Références

- **Master-Validator Report** : Docs/Master-Validator-brief.md (Phase 6.1 audit)
- **Performance Targets** : Docs/briefs/PHASE-6.1.md (original plan)
- **Event Sourcing Integration** : Docs/briefs/PHASE-4.1.md (invalidation mechanisms)
