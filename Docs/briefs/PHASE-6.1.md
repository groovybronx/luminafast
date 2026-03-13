# Phase 6.1 — Système de Cache Multiniveau

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 5-7 jours (Settings UI infrastructure created Phase 6.0)

## Objectif

Implémenter un système de cache **auto-géré 3 niveaux** (L1 RAM + L2 Disk + L3 Origin) avec quotas enforcés, évictions LRU intelligentes, et cohérence garantie après édits. Atteindre ouverture 50K catalog en <3s avec contrôle utilisateur via Settings.

---

## Périmètre

### ✅ Inclus dans cette phase

**Backend (Rust)**:

- Service `CacheManager` : orchestration quotas + prune scheduler
- Modèle `CacheConfig` + `CacheStatus` DTO sérialisables
- Quota enforcement : L1 ≤500MB (RAM), L2 ≤5GB (Disk)
- Éviction LRU : oldest + least-accessed en priorité
- Invalidation on edit : hook phase 4.1 events → cache clear
- 4 commandes Tauri : get_cache_status, update_config, enforce_quotas, invalidate_image_cache
- Tests unitaires : quota logic, eviction, edit coherence
- Scheduler : toutes les N heures ou idle 5 min

**Frontend (TypeScript)**:

- `cacheStore` (Zustand) : config + live status avec polling 5s
- Composants appelés depuis `src/components/settings/` (créés Phase 6.0) :
  - Affichage L1/L2/L3 usage (live)
  - Sliders L1/L2/prune_threshold avec validation
  - Boutons : "Force Clean Now", "Clear All Preview" (warn)
- Service wrapper : `cacheService.ts` pour IPC Tauri

**Database**:

- Table `cache_settings` : persistence de CacheConfig (SQLite)
- Query optimisation : indexes sur `(last_accessed, access_count)` (déjà Phase 2.3)

**Documentation**:

- Update `APP_DOCUMENTATION.md` : section "Cache Architecture"
- Update `CHANGELOG.md` : entry Phase 6.1

### ❌ Exclus (reportés)

- **Predictive prefetch** (Phase 6.3) : requires access history analysis
- **Compression on disk** (Phase 7) : trade CPU/space optimization
- **Cloud sync config** (Phase 8) : multi-device settings sync
- **DuckDB integration** (Phase 6.2) : separate OLAP layer

### 📋 Reporté à partir Phase 6.0

- **Settings UI Framework** : créé Phase 6.0, juste utilisé ici (lecture Settings tab)

---

## Dépendances

### Phases

- Phase 2.3 MAINTENANCE ✅ complétée (access_count + last_accessed schema)
- Phase 4.1 ✅ complétée (Event Sourcing pour invalidation hooks)
- Phase 6.0 ⬜ (Settings UI Framework — crée SettingsCategoryCache avec sliders)

### Ressources Externes

- Aucune nouvelle dépendance (toutes phases présentes)

### Test Infrastructure

- Vitest + Testing Library (Phase 0.5 ✅)
- Rust test framework (Phase 1 ✅)

---

## Fichiers

### À créer

**Backend**:

- `src-tauri/src/services/cache_manager.rs` (~350 lines)
  - `CacheManager` struct + public API (enforce_quotas, check_level_status, evict_lru, invalidate_on_edit)
  - L1 memory tracking, L2 disk scan, eviction logic
  - Scheduler initialization

- `src-tauri/src/models/cache.rs` (~100 lines)
  - `CacheConfig` struct (serde) : l1_limit_mb, l2_limit_gb, prune_threshold_percent
  - `CacheStatus` struct : l1_usage_mb, l2_usage_gb, evictions_count, freed_mb, cache_hit_rate
  - Default values + validation methods

- `src-tauri/src/commands/cache.rs` (~150 lines)
  - `#[tauri::command] get_cache_status() -> Result<CacheStatus, String>`
  - `#[tauri::command] update_cache_config(config: CacheConfig) -> Result<(), String>`
  - `#[tauri::command] enforce_cache_quotas() -> Result<CacheStatus, String>`
  - `#[tauri::command] invalidate_image_cache(image_id: i64) -> Result<(), String>`

- `src-tauri/src/services/tests/cache_manager_tests.rs` (~280 lines, 8 tests)
  - test_quota_enforcement_l1 : eviction on RAM limit
  - test_quota_enforcement_l2 : prune on disk limit
  - test_lru_eviction_priority : oldest + least-accessed first
  - test_edit_invalidation : deletes cache on edit event
  - test_config_validation : rejects invalid configs
  - test_concurrent_quota_check : tokio tasks don't deadlock
  - test_cache_hit_rate_tracking : stats accurate
  - test_orphaned_file_cleanup : deletes unreferenced files

**Frontend**:

- `src/services/cacheService.ts` (~80 lines)
  - Wrappers: `getCacheStatus()`, `updateCacheConfig()`, `enforceCacheQuotas()`, `invalidateImageCache()`
  - Error handling + retry logic

- `src/stores/cacheStore.ts` (~150 lines)
  - Zustand store : `{ cacheStatus, cacheConfig, loading, error }`
  - Actions: `updateStatus`, `updateConfig`, `enforceQuotas`, `setLoading`
  - Selectors: `getCacheHealthStatus()`, `getCachePercentUsed()`, etc.
  - Auto-polling logic (5s interval) via useEffect hook

**Tests**:

- `src/__tests__/cacheService.test.ts` (~120 lines)
  - Mock Tauri invoke, test service wrappers
  - Validate error handling

- `src/__tests__/cacheStore.test.ts` (~80 lines)
  - Test store mutations, selectors
  - Validate state persistence (localStorage compat)

### À modifier

**Backend**:

- `src-tauri/src/lib.rs`
  - Add `mod cache_commands;` to module tree
  - Register 4 new commands in `invoke_handler!`

- `src-tauri/src/services/preview.rs`
  - Add method `get_l1_memory_usage() -> usize`
  - Hook into ingest_image : call `cache_manager.invalidate_on_edit(image_id)` on edit

- `src-tauri/src/services/preview_db.rs`
  - Enhance `prune_stale_previews(days: i64)` → add `by_type` parameter
  - Type-aware logic: can spare 'standard' (highest priority), prune 'thumbnail'/'native' first

- `src-tauri/src/database.rs`
  - Add migration (008) for table `cache_settings`, OR store config in memory (TBD)

**Frontend**:

- `src/types/index.ts` or `src/types/cache.ts`
  - Import exported DTO types from API (or duplicate TS stubs)
  - `interface CacheConfig { l1_limit_mb, l2_limit_gb, prune_threshold_percent }`
  - `interface CacheStatus { l1_usage_mb, l2_usage_gb, ... }`

- `src/components/settings/SettingsCategoryCache.tsx` (created Phase 6.0, enhanced here)
  - Replace stub with functional implementation
  - Connect `cacheStore.cache` config
  - Wire sliders to `cacheService` backend calls
  - Display live cache metrics (polling 5s)
  - "Force Clean Now" + "Clear All" buttons → trigger `enforceQuotas()`, `invalidateImageCache()`

- `src/components/settings/SettingsCategoryDisplay.tsx` (created Phase 6.0, unmodified)
  - Already contains "Show Cache Status" toggle
  - No changes needed (Phase 6.1 read-only)

---

## Interfaces Publiques

### Tauri Commands

```rust
#[tauri::command]
pub async fn get_cache_status() -> Result<CacheStatus, String>;

#[tauri::command]
pub async fn update_cache_config(config: CacheConfig) -> Result<(), String>;

#[tauri::command]
pub async fn enforce_cache_quotas() -> Result<CacheStatus, String>;

#[tauri::command]
pub async fn invalidate_image_cache(image_id: i64) -> Result<(), String>;
```

### TypeScript DTOs

```typescript
export interface CacheConfig {
  l1_limit_mb: number; // 100-2000
  l2_limit_gb: number; // 1-20
  prune_threshold_percent: number; // 70-95
}

export interface CacheStatus {
  l1_usage_mb: number;
  l2_usage_gb: number;
  l3_total_gb: number;
  evictions_24h: number;
  freed_mb_24h: number;
  cache_hit_rate: number; // 0-100 percent
  most_accessed_type: 'thumbnail' | 'standard' | 'native';
}
```

### Zustand Store Actions

```typescript
// Dans cacheStore
updateStatus: (status: Partial<CacheStatus>) => void;
updateConfig: (config: Partial<CacheConfig>) => void;
enforceQuotas: () => Promise<void>;
setLoading: (loading: boolean) => void;
```

---

## Contraintes Techniques

### Rust Backend

- JAMAIS de panics — tous les paths retournent `Result<T, E>`
- Validations strictes : L1 < RAM available, L2 < disk available
- Éviction thread-safe : use Arc<Mutex<>> for shared state
- Performance : quota checks < 100ms (no full tree scans)

### TypeScript Frontend

- Strict mode (`"strict": true` tsconfig)
- Pas de `any` — use typed DTO structs
- Polling logic : useEffect with cleanup (prevent leaks)
- Error bounds : try/catch around Tauri invokes

### Database

- Table `cache_settings` : atomic writes (single row update)
- Indexes : `(last_accessed, access_count)` déjà présents (Phase 2.3)
- No foreign keys required (cache config is independent)

### Performance Target

- **Catalog load** : 50K images in <3s (cumulative with other optimizations)
- **Quota check** : <100ms per run
- **Prune operation** : <500ms (runs in background)
- **Polling overhead** : <1% CPU (5s interval)

---

## Critères de Validation

### Phase 1 : Backend Infrastructure

- [ ] `CacheManager` compiles without warnings
- [ ] All 4 Tauri commands registered in `lib.rs`
- [ ] Unit tests pass (8/8 tests green)
- [ ] `cargo clippy -- -D warnings` ✅
- [ ] Quota enforcement logic works on mock data (5 GB → prunes to 4 GB)

### Phase 2 : Frontend Integration

- [ ] `cacheService` + `cacheStore` compiles
- [ ] Zustand store actions dispatch correctly
- [ ] `pnpm lint` ✅
- [ ] TypeScript `tsc --noEmit` ✅

### Phase 3 : L1 Memory Management

- [ ] `PreviewService.get_l1_memory_usage()` returns correct byte count
- [ ] L1 eviction triggered when ram exceeds limit
- [ ] Manual test : ingest 100 images → L1 % shown correctly in UI

### Phase 4 : L2 Disk Enforcement

- [ ] Disk usage calculation accurate (scan Previews.lrdata/)
- [ ] Type-aware prune works (spare 'standard', clean 'native' first)
- [ ] Orphaned files detected + removed
- [ ] Manual test : exceed L2 limit → prune triggered → size correct

### Phase 5 : Edit Invalidation

- [ ] Hook on edit_events : INSERT → triggers invalidation
- [ ] Cache files deleted when image edited
- [ ] Manual test : edit image → old previews gone from disk

### Phase 6 : Integration Tests & Perf

- [ ] Ingest 1000 images → final L1+L2 < config limits
- [ ] No regressions vs Phase 5 baseline
- [ ] **50K catalog load time <3s** (measure with DevTools Timeline)
- [ ] All Phase 5 tests still pass (`cargo test`)
- [ ] Manual test : SettingsModal shows live CacheStatus (polling works)
- [ ] Manual test : drag sliders → config persists on restart

---

## Architecture Decision Log

### Decision 1 : L1 Cache Location

- **Option A** : In-memory HashMap (chosen)
- **Option B** : SQLite BLOB
- **Rationale** : Faster eviction, simpler logic, no serialization overhead

### Decision 2 : Eviction Order

- **Option A** : LRU by `last_accessed` only
- **Option B** : LRU by `last_accessed` + `access_count` secondary (chosen)
- **Rationale** : Balances fresh and popular content; prevents edge case where old-but-frequent files evicted

### Decision 3 : Edit Invalidation

- **Option A** : Hard delete (eager cleanup)
- **Option B** : Soft delete (lazy prune later)
- **Chosen** : Hard delete
- **Rationale** : Guarantees data coherence immediately; trades fragmentation (acceptable)

### Decision 4 : Config Persistence

- **Option A** : SQLite `cache_settings` table
- **Option B** : Disk file (TOML/JSON)
- **Option C** : Hardcoded defaults only
- **Chosen** : SQLite (same as other settings)
- **Rationale** : Consistent with app architecture; benefits from WAL/transaction safety

### Decision 5 : Scheduler Trigger

- **Option A** : Interval (every 60 min)
- **Option B** : Idle timer (5 min of inactivity)
- **Chosen** : Interval (every 60 min)
- **Rationale** : Predictable, no wake-up logic; Phase 6.3 can add predictive prefetch

---

## Known Limitations & Future Work

1. **No predictive prefetch** : L1 is reactive, not predictive. Phase 6.3 will add access pattern learning.
2. **No compression** : L2 grows uncompressed. Phase 7 can add optional ZSTD compression.
3. **No cloud sync** : Cache config is local only. Phase 8 will sync via PouchDB.
4. **Quota enforcement lag** : Polling interval = 5s; during heavy import, cache may briefly exceed limit. Acceptable (hard limits kick in within 5s).

---

## Testing Strategy

### Unit Tests (Rust)

- 8 tests in `src-tauri/src/services/tests/cache_manager_tests.rs`
- Focus : quota logic, eviction order, invalidation hooks

### Integration Tests (Rust + TypeScript)

- Spawn real app → ingest 1000 images → check final sizes
- Verify no panics or data loss

### Manual Tests

1. **UI responsiveness** : Settings modal opens, shows live cache status
2. **Slider interaction** : Drag L1 limit → config saves → restart app → config persists
3. **Eviction trigger** : Ingest 50K images → verify cache stays <5 GB (via disk `du`)
4. **Edit coherence** : Edit image → old previews deleted → reload shows fresh preview

### Performance Checkpoint

- **Metric** : Time from app-start to grid visible (LibraryView renders first thumbnail)
- **Baseline** (Phase 5) : ~4-5s (unbounded cache)
- **Target** (Phase 6.1) : <3s (with 5 GB cache limit)
- **Measure** : `console.time('app-init')` in App.tsx → `console.timeEnd()` in LibraryView.tsx mounted

---

## Deliverables

### Code

- [ ] `src-tauri/src/services/cache_manager.rs`
- [ ] `src-tauri/src/models/cache.rs`
- [ ] `src-tauri/src/commands/cache.rs`
- [ ] `src-tauri/src/services/tests/cache_manager_tests.rs`
- [ ] `src/services/cacheService.ts`
- [ ] `src/stores/cacheStore.ts`
- [ ] `src/__tests__/cacheService.test.ts`
- [ ] `src/__tests__/cacheStore.test.ts`

### Modifications

- [ ] `src-tauri/src/lib.rs` — command registration
- [ ] `src-tauri/src/services/preview.rs` — L1 tracking + invalidation hook
- [ ] `src-tauri/src/services/preview_db.rs` — type-aware prune
- [ ] `src/components/settings/SettingsCategoryCache.tsx` — functional implementation
- [ ] `src/components/settings/SettingsCategoryDisplay.tsx` — cache visibility toggle
- [ ] `src/types/index.ts` — DTO types

### Documentation

- [ ] `Docs/APP_DOCUMENTATION.md` — Cache Architecture section
- [ ] `Docs/CHANGELOG.md` — Phase 6.1 entry
- [ ] Inline code comments (especially LRU eviction logic)

---
