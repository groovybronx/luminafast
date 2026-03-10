# Phase M.1.1 — Correction Runtime Ingestion

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 3-4 jours
> **Priorité** : P0 (Critique)

## Objectif

Éliminer la création répétée de `tokio::runtime::Runtime` dans la boucle `batch_ingest()` qui crée un goulot d'étranglement critique empêchant l'application de scaler au-delà de quelques centaines d'images. Remplacer par un pattern async/await propre utilisant le runtime global.

## Périmètre

### ✅ Inclus dans cette phase

- Audit complet de `src-tauri/src/services/ingestion.rs` : identification de chaque appel `Runtime::new()`
- Réécriture de `batch_ingest()` avec async/await + tokio runtime global
- Utilisation correcte de `tokio::task::spawn_blocking()` pour opérations CPU-bound
- Tests unitaires pour vérifier absence de fuites de Runtime
- Benchmark avant/après sur import 1000+ images

### ❌ Exclus ou reporté intentionnellement

- Monitoring/alertes threadpool saturation (reporté à phase **M.1.1a** — brief dédié `MAINTENANCE-MT-M.1.1a-monitoring-threadpool.md`)
- Optimisation algorithmes EXIF (reporté à phase **M.3.2**)
- Migration pool connexions (reporté à phase **M.2.1**)

## Dépendances

### Phases

- Aucune dépendance (indépendante, critique en priorité)

### Ressources Externes

- tokio runtime v1.x (déjà présent)
- rayon pool (déjà présent)

### Test Infrastructure

- Rust test framework (`cargo test`)

## Fichiers

### À modifier

- `src-tauri/src/services/ingestion.rs` — Réécrire `batch_ingest()`, supprimer `Runtime::new()` en boucle, utiliser async/await + `spawn_blocking()`
- `src-tauri/src/commands/catalog.rs` — Adapter commandes Tauri apellant `batch_ingest()`

## Interfaces Publiques

### Tauri Commands (Rust)

```rust
#[tauri::command]
pub async fn batch_ingest(paths: Vec<String>, catalog_dir: String) -> Result<IngestionResult, String>;
```

### Response DTO (Rust)

```rust
#[derive(Serialize)]
pub struct IngestionResult {
    pub total: usize,
    pub successful: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}
```

## Contraintes Techniques

### Rust Backend

- ✅ JAMAIS de `Runtime::new()` en boucles productrices
- ✅ Utiliser `tokio::task::spawn_blocking()` pour CPU-intensive work
- ✅ Pas de `unwrap()` — errors explicites retournées via `Result<T, E>`
- ✅ Tests unitaires couvrent chemins erreur et cas limites
- ✅ Benchmark: Import 1000 images < 10s

## Architecture Cible

### Flux Ingestion — AVANT vs APRÈS

```
AVANT:
  batch_ingest() {
    for file in files {
      runtime = Runtime::new()  // 🔴 GOULOT
      process(file)
      runtime.block_on(...)
    }
  }

APRÈS:
  async fn batch_ingest(paths, catalog_dir) {
    let tasks: Vec<_> = paths.iter().map(|path| {
      tokio::task::spawn_blocking(move || process_heavy(path))
    }).collect();
    futures::future::join_all(tasks).await
  }
```

## Dépendances Externes

### Rust (`Cargo.toml`)

- tokio = "1.x" (déjà présent, async runtime)
- rayon (déjà présent, CPU parallelization)

## Checkpoints

- [ ] **Checkpoint 1** : Code compile (`cargo check` ✅)
- [ ] **Checkpoint 2** : Aucun `Runtime::new()` en boucles (grep validé)
- [ ] **Checkpoint 3** : Tests unitaires passent (coverage ≥80%)
- [ ] **Checkpoint 4** : Benchmark import 1000 images < 10s
- [ ] **Checkpoint 5** : Clippy 0 warnings

## Pièges & Risques

### Pièges Courants

- Oublier que `async fn` transforme le contexte executeur
- Confondre `spawn()` (concurrent) vs `spawn_blocking()` (bloquant)
- Race conditions si multiples workers accèdent DB simultanément

### Risques Potentiels

- **Deadlock** si transaction longue + workers concurrent
- **OOM** si trop de `spawn_blocking()` tasks

### Solutions Préventives

- Tester avec dataset 5000+ images en parallèle
- Batch par 100 images max par transaction
- Monitoring threadpool saturation (voir phase M.1.1a)

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description                  | Statut       | Date       | Agent   |
| ----- | ---------- | ---------------------------- | ------------ | ---------- | ------- |
| M     | 1.1        | Correction Runtime Ingestion | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.1.1)**:

- Fichiers modifiés: `ingestion.rs`, `catalog.rs`
- Tests créés: `ingestion_tests.rs` — N test cases verifying absence Runtime::new()
- Impact: Import 1000 images: BEFORE Xs → AFTER Ys
```

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — Update `ingestion.rs` pattern async
- Section "4. Performance & Optimisation" — Add benchmark results

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] Tests Rust passent (coverage ≥80%)
- [ ] Aucun `Runtime::new()` en production
- [ ] Benchmark import 1000 images réalisé

### Integration

- [ ] Tests M.1.2, M.1.3 passent (non-régression)
- [ ] CHANGELOG et APP_DOCUMENTATION mis à jour
- [ ] Code compile sans warning
