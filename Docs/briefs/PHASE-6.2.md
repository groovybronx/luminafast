# PHASE 6.2 — Intégration DuckDB (OLAP)

> **Statut** : ⬜ **En attente**
> **Objectif** : Performances de requêtes analytiques <100ms sur 100K images

---

## Objectif

Intégrer DuckDB pour requêtes analytiques complexes (agrégations, statistiques, Smart Collections accélérées) tout en maintenant SQLite comme source de vérité. Synchronisation périodique SQLite → DuckDB permettant des requêtes OLAP sans bloquer le pipeline transactionnel.

---

## Périmètre

### ✅ Inclus dans cette phase

- **DuckDB Service Rust** : Initialisation, synchronisation, requêtes
- **Synchronisation SQLite → DuckDB** : Périodique (trigger au startup + toutes les N minutes)
- **Requêtes Analytiques** :
  - Agrégations (photos par mois, par objectif, par lieu, par rating)
  - Statistiques catalogue (total images, taille totale, répartition ISO, etc.)
  - Smart Collections haute perf avec DuckDB
- **Tauri Commands** :
  - `get_aggregations(groupBy: string)` → GroupedStats[]
  - `get_catalog_statistics()` → CatalogStats
  - `execute_smart_query(query_json: string)` → ImageID[]
- **Testing** : Tests unitaires + benchmarks de perf (<100ms pour 100K)

### ❌ Exclus intentionnellement

- Cloud sync avec DuckDB (reporté PHASE 8)
- Parquet export (reporté PHASE 7.2 backup)
- DuckDB clustering/partitioning (optimisation future, PHASE 6.4)
- Caching de résultats analytiques (séparer du cache L1/L2)

### 📋 Reporté à partir d'autres phases

- PHASE 6.3 : Virtualisation avancée grille (peut utiliser agrégations DuckDB si perf ok)
- PHASE 6.4 : Index composites & FTS5 (SQLite), peut interagir avec DuckDB sync timing
- PHASE 7.2 : Backup incluant export DuckDB en Parquet

---

## Dépendances

### Phases

- **PHASE 6.1** ✅ Complétée — Cache multiniveau (pas de blocage si accès DB)

### Ressources Externes

- `duckdb` Rust crate avec support in-memory + file-based
- `chrono` (déjà présent) pour timestamp historique sync

### Test Infrastructure

- Vitest + Testing Library (TypeScript)
- Rust test framework + criterion pour benchmarks

---

## Fichiers

### À créer

#### Backend (Rust)

- **`src-tauri/src/services/duckdb_service.rs`**
  - `DuckDBService` struct : connection pool, init, cleanup
  - `fn sync_from_sqlite(db_conn, last_sync_ts)` → synchro incrémentale
  - `fn execute_aggregation(group_by, filters)` → Vec<GroupByResult>
  - `fn get_catalog_stats()` → CatalogStats
  - Tests unitaires pour chaque fonction

- **`src-tauri/src/commands/analytics.rs`**
  - `#[tauri::command] get_aggregations(groupBy: String) → Result<Vec<GroupByResultDTO>, String>`
  - `#[tauri::command] get_catalog_statistics() → Result<CatalogStatsDTO, String>`
  - `#[tauri::command] execute_smart_query(query_json: String) → Result<Vec<u32>, String>` (image IDs)
  - Toutes les commandes incluent logging `[DuckDB]`

#### Frontend (TypeScript)

- **`src/services/analyticsService.ts`**
  - `async getAggregations(groupBy: 'month' | 'camera' | 'iso' | 'rating')` → GroupedStats[]
  - `async getCatalogStatistics()` → CatalogStats
  - `async executeSmartQuery(queryJson: SmartQueryJSON)` → ImageID[]
  - Gestion d'erreur : try/catch avec logging
  - Types : GroupedStats, CatalogStats (voir section Interfaces)

#### Migration SQL

- **`src-tauri/migrations/008_duckdb_tracking.sql`**
  - Table `duckdb_sync_metadata`:
    ```sql
    CREATE TABLE duckdb_sync_metadata (
      id INTEGER PRIMARY KEY,
      last_sync_ts TEXT,  -- ISO 8601
      total_records INTEGER,
      sync_duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    ```
  - Permet de tracker syncos complètes vs incrémentales

### À modifier

#### Cargo.toml

- Ajouter : `duckdb = "0.9"` (version compatible avec Rust 1.70+)

#### `src-tauri/src/lib.rs`

- Ajouter module : `mod services::duckdb_service;`
- Ajouter commandes : `commands::analytics::*` aux setup

#### `src-tauri/src/commands/mod.rs`

- Exposer analytics module : `pub mod analytics;`

#### `src/services/index.ts`

- Export : `export * from './analyticsService';`

#### `Docs/APP_DOCUMENTATION.md`

- Ajouter section "Analytics via DuckDB" :
  - Schéma DuckDB (tables copiées de SQLite)
  - Requêtes exemple (agrégations par mois, par caméra)
  - Timing benchmarks (50K vs 100K vs 500K images)

---

## Interfaces Publiques

### Tauri Commands

```rust
/// Grouper les images par attribut et compter
#[tauri::command]
pub async fn get_aggregations(
    state: State<'_, AppState>,
    group_by: String, // "month" | "camera" | "iso" | "rating"
) -> Result<Vec<GroupByResultDTO>, String>;

/// Statistiques globales du catalogue
#[tauri::command]
pub async fn get_catalog_statistics(
    state: State<'_, AppState>,
) -> Result<CatalogStatsDTO, String>;

/// Exécuter une smart query pré-compilée sur DuckDB
#[tauri::command]
pub async fn execute_smart_query(
    state: State<'_, AppState>,
    query_json: String, // serde_json::Value
) -> Result<Vec<u32>, String>; // image IDs
```

### TypeScript DTOs & Services

```typescript
// Types for aggregations
export interface GroupByResult {
  key: string; // "2024-01", "Canon EOS", "ISO 3200", "Rating 5"
  count: number; // nombre d'images
  percentage: number; // fraction du total
}

// Stats catalogue
export interface CatalogStats {
  totalImages: number;
  totalSizeGb: number;
  oldestImageDate: string;
  newestImageDate: string;
  averageImageSize: number;
  distributionByRating: { rating: number; count: number }[];
  distributionByCamera: { camera: string; count: number }[];
  distributionByISO: { iso: number; count: number }[];
  ratedImagesCount: number;
  flaggedImagesCount: number;
}

// Analytics Service
export class AnalyticsService {
  static async getAggregations(
    groupBy: 'month' | 'camera' | 'iso' | 'rating',
  ): Promise<GroupByResult[]>;

  static async getCatalogStatistics(): Promise<CatalogStats>;

  static async executeSmartQuery(query: SmartCollectionQuery): Promise<number[]>; // image IDs
}
```

---

## Architecture Décisions

### 1. Synchronisation Stratégie

- **Timing** : Au startup + toutes les 5 minutes (configurable)
- **Mode** : Incrémentale si `last_sync_ts` existe, sinon full
- **Bloquant** : NON — async/await, ne jamais bloquer le thread UI
- **Conflit** : SQLite est source de vérité ; DuckDB réplique sempre

### 2. Schéma DuckDB

Tables miroir de SQLite (copie simplifiée pour analytics) :

- `images` (id, filename, captured_at, width, height)
- `exif_metadata` (image_id, iso, aperture, focal_length, camera_make, camera_model)
- `image_state` (image_id, rating, flag)
- `folders` (id, path)

**Pas de normalisation** : Dénormalisation volontaire pour queries rapides.

### 3. Smart Collections sur DuckDB

Conversion du JSON smart_query → SQL SELECT sur DuckDB, puis retour de IDs au frontend pour intersection avec sélection courante.

### 4. Performance Budgets

| Query Type            | Data Size       | Target | Notes                    |
| --------------------- | --------------- | ------ | ------------------------ |
| Agrégation (group by) | 10K images      | <20ms  | Index sur column groupée |
| Agrégation (group by) | 100K images     | <100ms | In-memory DuckDB         |
| Stats catalogue       | 100K images     | <50ms  | Requête simple COUNT/SUM |
| Smart Collections     | 100K + 20 rules | <200ms | Index sur image_id       |

---

## Critères de Validation

### ✅ Tests Unitaires

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_aggregate_by_month() { /* 50K images, <20ms */ }
    #[test]
    fn test_aggregate_by_camera() { /* 100K images, <100ms */ }
    #[test]
    fn test_catalog_statistics() { /* <50ms */ }
    #[test]
    fn test_duckdb_sync_speed() { /* SQLite 50K → DuckDB <500ms */ }
}
```

### ✅ Integration Tests

- Smart Collections exécutées via DuckDB retournent correct set d'IDs
- Après import de 100 images, agrégations mises à jour correctement

### ✅ Performance Benchmarks

- `cargo bench` : Agrégation 100K images en <100ms (criterion)
- Frontend : Analytics appels <200ms end-to-end (latency measure)

### ✅ Manual Testing

1. Importer catalogue test (50K images)
2. Ouvrir Statistics panel → affiche stats en <100ms
3. Dans Smart Collections, créer requête complexe → résultats en <200ms
4. Arrêt/redémarrage app → stats à jour (sync retrouvé)

---

## Contexte Architectural

### Pourquoi DuckDB ?

SQLite n'est pas optimisé OLAP (analytique) :

- Pas d'index bit-sliced
- JOIN lent sur 100K+ rows
- Pas de parallelization interne

DuckDB excelle pour :

- Agrégations sur 100K+ rows
- Multiple JOINs sans blocking
- In-memory + disk spillover
- Vectorized execution

### Sync Pattern

```
Timer (5min) ──→ DuckDB Service
                      │
                      ├─ Check last_sync_ts
                      ├─ Query SQLite (since last_sync)
                      ├─ COPY to DuckDB
                      └─ Update last_sync_ts
```

**Non-blocking** : Frontend nunca espera sync. Si DuckDB not ready, fallback à SQLite (lent mais correct).

---

## Points de Risque & Mitigation

| Risque                    | Impact                                   | Mitigation                                   |
| ------------------------- | ---------------------------------------- | -------------------------------------------- |
| Sync lag → données stales | Résultats analytiques retardées          | Afficher "last sync: 2min ago"               |
| DuckDB file corruption    | Perte de cache analytique (non-critique) | Recreate on corruption, log event            |
| Sync bloque import        | Import lent si sync concurrent           | Utiliser Mutex séparé, ne pas lock DB entier |
| Query timeout (100K+)     | UX freeze                                | Timeout 500ms, fallback à SQLite             |

---

## Prochaine Phase (📋 6.3)

Une fois DuckDB stable, Phase 6.3 (Virtualisation Avancée Grille) peut :

- Utiliser agrégations DuckDB pour barre latérale stats
- Prefetch basé sur distributions statistiques

---

## Fichiers de Référence

- `Docs/archives/recommendations.md` — Pourquoi DuckDB à la base
- `Docs/APP_DOCUMENTATION.md` — Sections "Analytics"
- `src-tauri/Cargo.toml` — Dépendances
