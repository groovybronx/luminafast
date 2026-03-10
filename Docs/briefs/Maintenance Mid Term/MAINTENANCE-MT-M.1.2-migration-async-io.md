# Phase M.1.2 — Migration Async IO

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 2-3 jours
> **Priorité** : P0 (Critique)

## Objectif

Remplacer tous les appels `std::fs` par `tokio::fs` dans les contextes async pour éliminer les appels bloquants qui figent le runtime Tokio. Garantir que aucun IO synchrone n'existe dans les blocs `async fn`.

## Périmètre

### ✅ Inclus dans cette phase

- Migration `std::fs` → `tokio::fs` dans `src-tauri/src/services/discovery.rs`
- Migration `std::fs` → `tokio::fs` dans `src-tauri/src/services/preview.rs`
- Vérification complète de tous les points d'entrée `async` pour bannir appels bloquants
- Tests unitaires validant absence d'appels `std::fs` en contexte async
- Benchmark IO performance avant/après

### ❌ Exclus ou reporté intentionnellement

- Cleanup de code synchrone ailleurs dans codebase (reporté à phase **M.1.2a** — brief dédié `MAINTENANCE-MT-M.1.2a-cleanup-sync-code.md`)
- Optimisation requêtes DB (reporté à phase **M.2.1**)
- Caching stratégies (reporté à maintenance future)

## Dépendances

### Phases

- Phase M.1.1 ✅ (ou non-bloquant si M.1.1 parallèle)

### Ressources Externes

- tokio::fs (présent dans tokio v1.x)

### Test Infrastructure

- Rust test framework (`cargo test`)

## Fichiers

### À modifier

- `src-tauri/src/services/discovery.rs` — Remplacer `std::fs` par `tokio::fs`, adapter signature functions async
- `src-tauri/src/services/preview.rs` — Remplacer `std::fs` par `tokio::fs`, adapter signature functions async
- `src-tauri/src/commands/catalog.rs` — Adapter calls vers discovery/preview
- `src-tauri/Cargo.toml` — Vérifier tokio features incluent `fs` (généralement présent)

## Interfaces Publiques

### Tauri Commands (Rust)

```rust
#[tauri::command]
pub async fn discover_images(dir: String) -> Result<Vec<ImageMetadata>, String>;

#[tauri::command]
pub async fn generate_preview(image_path: String) -> Result<PreviewData, String>;
```

### Response DTOs (Rust)

```rust
#[derive(Serialize)]
pub struct ImageMetadata {
    pub path: String,
    pub filename: String,
    pub size: u64,
}

#[derive(Serialize)]
pub struct PreviewData {
    pub image_path: String,
    pub preview_buffer: Vec<u8>,
    pub dimensions: (u32, u32),
}
```

## Contraintes Techniques

### Rust Backend

- ✅ JAMAIS de `std::fs` dans blocs `async fn`
- ✅ Utiliser `tokio::fs` pour tous file operations en async context
- ✅ Pas de `.block_on()` ou autres tricks pour sync IO
- ✅ Tests validant absence `std::fs` (grep + cargo check)
- ✅ Aucun `unwrap()` — error handling systématique

## Architecture Cible

### Async IO Pattern

```
AVANT (bloquant):
  async fn discover() {
    let entries = std::fs::read_dir(dir)?  // 🔴 BLOQUANT
    ...
  }

APRÈS (non-bloquant):
  async fn discover() {
    let mut entries = tokio::fs::read_dir(dir).await?  // ✅ NON-BLOQUANT
    while let Some(entry) = entries.next_entry().await? {
      ...
    }
  }
```

## Dépendances Externes

### Rust (`Cargo.toml`)

- tokio = "1.x" with features = ["fs"] (déjà présent)

## Checkpoints

- [ ] **Checkpoint 1** : Code compile (`cargo check` ✅)
- [ ] **Checkpoint 2** : Grep `std::fs` en fichiers async = 0 results
- [ ] **Checkpoint 3** : Tests unitaires passent (coverage ≥80%)
- [ ] **Checkpoint 4** : IO performance benchmark exécuté
- [ ] **Checkpoint 5** : Clippy 0 warnings

## Pièges & Risques

### Pièges Courants

- Oublier `.await` sur opérations tokio::fs
- Mélanger import `std::fs` et `tokio::fs` dans même file
- Forget que `read_dir().await?` ne lit qu'une entry à la fois (boucle nécessaire)

### Risques Potentiels

- Performance dégradée si beaucoup de petits IO (batching nécessaire)
- Erreurs permissions fichiers détectées tardivement (test avec dataset réel)

### Solutions Préventives

- Tester avec 10K+ fichiers
- Batch read operations quand possible
- Add integration tests avec vraie filesystem

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description                              | Statut       | Date       | Agent   |
| ----- | ---------- | ---------------------------------------- | ------------ | ---------- | ------- |
| M     | 1.2        | Migration Async IO (std::fs → tokio::fs) | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.1.2)**:

- Fichiers modifiés: `discovery.rs`, `preview.rs`, `catalog.rs`
- Tests créés: `io_migration_tests.rs` — N test cases validating async IO
- Impact: Blocking calls eliminated from async context
```

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — Update `discovery.rs`, `preview.rs` async patterns
- Section "4. Performance & Optimisation" — Add IO benchmarks

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] Tests Rust passent (coverage ≥80%)
- [ ] `grep std::fs` en discovery.rs/preview.rs = 0 matches
- [ ] IO benchmark exécuté

### Integration

- [ ] Tests M.1.1, M.1.3 passent (non-régression)
- [ ] CHANGELOG et APP_DOCUMENTATION mis à jour
- [ ] Code compile sans warning
