# Phase M.1 — Performance Core & Concurrence

> **Statut** : ⬜ **En attente**
> **Priorité** : P0 (Critique)

## Objectif

Éliminer les goulots d'étranglement critiques dans le backend Rust qui empêchent l'application de scaler. La priorité absolue est de corriger la création répétée de Runtimes Tokio lors de l'ingestion et de supprimer les appels IO bloquants (`std::fs`) dans les contextes asynchrones.

## Périmètre

### ✅ Inclus dans cette phase

*   **Refactoring Ingestion** : Réécriture de `batch_ingest` pour utiliser un Runtime unique ou `spawn_blocking`.
*   **Migration Async IO** : Remplacement systématique de `std::fs` par `tokio::fs` dans `discovery.rs` et `preview.rs`.
*   **Nettoyage Code Mort** : Suppression de `test_hook.rs` et code déprécié identifié.

### ❌ Exclus intentionnellement

*   Refactoring architectural profond (Injection dépendances DB) -> Reporté à Phase M.2.
*   Nouvelles fonctionnalités.

## Dépendances

### Phases

*   Phase 3.5 ✅ complétée
*   Audit de Code ✅ complété

### Ressources Externes

*   Crates existants : `tokio`, `rayon`.

## Fichiers à Modifier

### Backend Rust

*   `src-tauri/src/services/ingestion.rs` — Supprimer `Runtime::new()` dans la boucle `par_iter`.
*   `src-tauri/src/services/discovery.rs` — Remplacer `std::fs::metadata` par `tokio::fs::metadata`.
*   `src-tauri/src/services/preview.rs` — Remplacer `std::fs` par `tokio::fs` + gestion erreurs async.
*   `src-tauri/src/test_hook.rs` — À supprimer.
*   `src-tauri/src/commands/catalog.rs` — Supprimer `search_images_simple`.
*   `luminafast-wasm/src/image_processing.rs` — Supprimer fonctions dépréciées (`apply_exposure`, etc.).

## Interfaces Publiques

Aucun changement d'API publique (Tauri Commands) prévu. Il s'agit d'une optimisation interne.

## Contraintes Techniques

### Rust Backend

*   **ZERO blocking IO in async** : Interdiction absolue d'utiliser `std::fs` dans une fonction `async fn`.
*   **Gestion Runtime** : Ne jamais créer de Runtime à l'intérieur d'une tâche async ou d'une boucle chaude.
*   **Error Handling** : Propagation propre des erreurs `tokio::io::Error`.

## Architecture Cible

### Gestion Concurrence Ingestion

```rust
// Avant (Mauvais)
files.par_iter().for_each(|file| {
    let rt = Runtime::new()...; // ❌ Coûteux
    rt.block_on(...)
});

// Après (Cible)
// Option A: Rayon -> spawn_blocking (si tâche principalement CPU mais avec un peu d'async)
// Option B: Pure Tokio avec Semaphore pour limite de concurrence (si IO bound)
// Choix : Option A maintenue pour compatibilité existante, mais avec Handle::current() ou bridge correct.
```

### Async IO

```rust
// Avant
let metadata = std::fs::metadata(path)?; // ❌ Bloque le thread worker

// Après
let metadata = tokio::fs::metadata(path).await?; // ✅ Rend la main au runtime
```

## Checkpoints de Validation

*   [ ] **Checkpoint 1** : `test_hook.rs` et code mort supprimés.
*   [ ] **Checkpoint 2** : `batch_ingest` refactorisé et benchmarqué (ne doit plus créer de threads OS massivement).
*   [ ] **Checkpoint 3** : `discovery.rs` et `preview.rs` utilisent uniquement `tokio::fs`.
*   [ ] **Checkpoint 4** : Tests d'intégration (import 100 images) passent sans erreur.

## Pièges & Risques Connus

*   **Deadlocks** : Attention au mélange Rayon (sync) et Tokio (async). Utiliser `tokio::task::block_in_place` ou `Handle::current().block_on()` avec précaution, ou mieux, séparer clairement les phases.
*   **Performance** : Vérifier que `tokio::fs` ne dégrade pas les perfs sur les petits fichiers (overhead async) vs `std::fs` (mais ici l'enjeu est la non-blocage du runtime).

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description | Statut | Date | Agent |
| ----- | ---------- | ----------- | ------ | ---- | ----- |
| M     | M.1        | Performance Core & Concurrence (Ingestion Fix + Async IO) | ✅ Complétée | YYYY-MM-DD | Agent-X |
```
