# Phase M.1.1a — Monitoring Threadpool

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 2 jours
> **Priorité** : P2 (Moyenne)
> **Dépendance** : Phase M.1.1 complétée

## Objectif

Implémenter monitoring et alertes pour saturation threadpool Tokio lors de `batch_ingest()`, permettant détection précoce de goulots d'étranglement et tuning optimal du threadpool size.

## Périmètre

### ✅ Inclus dans cette phase

- Instrumentation threadpool metrics (active tasks, queue depth)
- Logs warnings si threadpool saturation > 80%
- Optional : metrics export vers Prometheus/observability
- Tests pour verify logging/alerting behavior
- Documentation des metrics à monitorer

### ❌ Exclus ou reporté intentionnellement

- Full distributed tracing (reporté à advanced monitoring phase)
- Real-time dashboard UI (reporté à future maintenance)
- Automated threadpool auto-scaling (feature, not monitoring)

## Dépendances

### Phases

- Phase M.1.1 ✅ (Correction Runtime Ingestion complétée)

### Ressources Externes

- tokio metrics crate (optional, or custom instrumentation)
- tracing crate (optional, structured logging)

## Fichiers

### À créer

- `src-tauri/src/services/metrics.rs` — Threadpool monitoring + metrics collection

### À modifier

- `src-tauri/src/services/ingestion.rs` — Intégrer metrics collection dans `batch_ingest()`
- `src-tauri/src/main.rs` — Initialiser metrics system au startup

## Interfaces Publiques

### Rust Types

```rust
// src-tauri/src/services/metrics.rs

pub struct ThreadpoolMetrics {
    pub active_tasks: usize,
    pub queue_depth: usize,
    pub max_threads: usize,
}

pub trait MetricsCollector: Send + Sync {
    fn record_threadpool_metrics(&self, metrics: ThreadpoolMetrics);
    fn check_saturation(&self, threshold: f32) -> bool;
}
```

## Contraintes Techniques

### Rust Backend

- ✅ Zero overhead if monitoring disabled (feature flag)
- ✅ Non-blocking metrics collection
- ✅ Proper error handling (metrics failure ≠ app failure)

## Architecture Cible

### Monitoring Flow

```
batch_ingest() runs
  ↓
tokio task spawned
  ↓
metrics.record_active_tasks(count)
  ↓
if saturation > 80%:
  warn!("Threadpool saturation: {:.0}%", usage)
  ↓
  Optional: emit metric/alert
```

## Checkpoints

- [ ] **Checkpoint 1** : Metrics collection implemented + tested
- [ ] **Checkpoint 2** : Logs show threadpool saturation warnings
- [ ] **Checkpoint 3** : Zero performance overhead verified
- [ ] **Checkpoint 4** : Tests pass (≥80% coverage metrics.rs)

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅
- [ ] Tests Rust passent (coverage ≥80%)
- [ ] Monitoring active în production builds

### Integration

- [ ] Tests M.1.1 passent (non-régression)
- [ ] CHANGELOG et APP_DOCUMENTATION mis à jour
