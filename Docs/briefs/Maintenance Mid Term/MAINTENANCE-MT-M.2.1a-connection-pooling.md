# Phase M.2.1a — Connection Pooling Strategy

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 3-4 jours
> **Priorité** : P2 (Moyenne)
> **Dépendance** : Phase M.2.1 complétée

## Objectif

Implémenter connection pooling avancée avec configuration tunable (pool size, timeout, retry logic), permettant optimal resource utilization et graceful handling de concurrent DB access.

## Périmètre

### ✅ Inclus dans cette phase

- Sélection + intégration connection pool library (r2d2, bb8, or similar)
- Configuration pool parameters : min/max connections, timeout
- Retry logic pour transient failures
- Metrics : active connections, wait time
- Tests : concurrent access, pool exhaustion handling
- Documentation tuning guidelines

### ❌ Exclus ou reporté intentionnellement

- Migration à NoSQL ou distributed database (out of scope)
- Replication/failover setup (future high-availability)

## Dépendances

### Phases

- Phase M.2.1 ✅ (Repository pattern in place)

### Ressources Externes

- r2d2 or bb8 crate (connection pool libraries)

## Fichiers

### À modifier

- `src-tauri/src/services/db_repository.rs` — Intégrer pool management
- `src-tauri/src/main.rs` — Initialize pool at startup

## Checkpoints

- [ ] **Checkpoint 1** : Pool library integrated + compiled
- [ ] **Checkpoint 2** : Concurrent access tests pass
- [ ] **Checkpoint 3** : Metrics show connection utilization
- [ ] **Checkpoint 4** : Tests passent (coverage ≥80%)

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅
- [ ] Tests concurrent access pass
- [ ] Pool metrics functional

### Integration

- [ ] Tests M.2.1 passent
- [ ] CHANGELOG mis à jour
