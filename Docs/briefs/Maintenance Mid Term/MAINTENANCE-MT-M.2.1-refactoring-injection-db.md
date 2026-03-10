# Phase M.2.1 — Refactoring Injection Dépendances DB

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 4-5 jours
> **Priorité** : P1 (Élevée)

## Objectif

Assainir l'architecture d'injection de dépendances DB : retirer la dépendance forte à `Mutex<Connection>`, supprimer hacks (open_in_memory), et implémenter un pattern `Repository` ou `Context` propre et testable.

## Périmètre

### ✅ Inclus dans cette phase

- Audit architecture injection DB actuelle (`Mutex<Connection>` usage)
- Suppression hack `open_in_memory` dans `src-tauri/src/commands/catalog.rs`
- Design + implémentation pattern `Repository` ou `DBContext` pour abstraction
- Adaptation `src-tauri/src/services/ingestion.rs` pour utiliser nouveau pattern
- Tests unitaires avec mocks DB (ne nécessitant pas vraie connexion)
- Documentation architecture DB clear pour maintenance future

### ❌ Exclus ou reporté intentionnellement

- Connection pooling strategy avancée (reporté à phase **M.2.1a** — brief dédié `MAINTENANCE-MT-M.2.1a-connection-pooling.md`)
- Migration schéma DB (no schema changes in this phase)
- Optimisation requêtes (reporté à M.1.2 ou M.3.2)

## Dépendances

### Phases

- Phase M.1.1 ✅ (pour contexte patterns async)
- Phase M.1.2 ✅ (async IO adoption)

### Ressources Externes

- tokio-util ou similar pattern libraries (si nécessaire)

### Test Infrastructure

- Rust test framework avec support mocks

## Fichiers

### À créer

- `src-tauri/src/services/db_repository.rs` — Repository pattern abstraction for DB access
- `src-tauri/src/types/db_context.rs` — Context trait définissant interface DB operations

### À modifier

- `src-tauri/src/commands/catalog.rs` — Utiliser Repository/Context pattern, supprimer hack open_in_memory
- `src-tauri/src/services/ingestion.rs` — Adapter pour prendre Context/Repository en param
- `src-tauri/src/main.rs` — Adapter initialization (setup db context)
- `src-tauri/Cargo.toml` — Ajouter dépendances si nécessaire (e.g., `async-trait`)

## Interfaces Publiques

### Rust Traits/Types

```rust
// src-tauri/src/types/db_context.rs
#[async_trait]
pub trait DBContext: Send + Sync {
    async fn insert_image(&self, image: ImageData) -> Result<(), String>;
    async fn get_images(&self, filter: Option<String>) -> Result<Vec<ImageData>, String>;
    async fn delete_image(&self, id: i32) -> Result<(), String>;
}

// src-tauri/src/services/db_repository.rs
pub struct ImageRepository {
    context: Arc<dyn DBContext>,
}

impl ImageRepository {
    pub async fn save_batch(&self, images: Vec<ImageData>) -> Result<usize, String> {
        // Implementation
    }
}
```

### Tauri Commands (updated)

```rust
#[tauri::command]
pub async fn batch_ingest(state: tauri::State<'_, AppState>, paths: Vec<String>) -> Result<IngestionResult, String>;
```

Où `AppState` contient contexte DB injecté proprement.

## Contraintes Techniques

### Rust Backend

- ✅ Pas de `Mutex<Connection>` en state global (ou minimal)
- ✅ Pattern injection via `async_trait` traits
- ✅ Tests unitaires avec mocks DB (no real DB connection needed)
- ✅ Aucun `unwrap()` — errors properly threaded
- ✅ Backward compatibility : commandes existantes conservent même signatures Tauri

## Architecture Cible

### DI Pattern Before → After

```
AVANT:
  struct AppState {
    db_conn: Arc<Mutex<Connection>>  // 🔴 Tight coupling
  }

  fn batch_ingest(state: State<AppState>) {
    let conn = state.db_conn.lock().unwrap();  // 🔴 Blocking
    ...
  }

APRÈS:
  #[async_trait]
  pub trait DBContext { ... }

  struct ImageRepository {
    context: Arc<dyn DBContext>  // ✅ Loose coupling
  }

  impl ImageRepository {
    pub async fn batch_ingest(&self, paths: Vec<String>) {
      for path in paths {
        self.context.insert_image(image).await?;
      }
    }
  }
```

## Dépendances Externes

### Rust (`Cargo.toml`)

- async-trait = "0.1" — Async trait support
- tokio = "1.x" (déjà présent)

## Checkpoints

- [ ] **Checkpoint 1** : Architecture DB design documentée (diagram)
- [ ] **Checkpoint 2** : Code compile (`cargo check` ✅)
- [ ] **Checkpoint 3** : Tests unitaires passent (≥80% coverage)
- [ ] **Checkpoint 4** : Intégration Tauri fonctionne (real usage test)
- [ ] **Checkpoint 5** : Clippy 0 warnings

## Pièges & Risques

### Pièges Courants

- Over-abstraction (trop de traits/layers compliquent code)
- Oublier mocking DB dans tests (tester vraie intégration aussi)
- Introducing new Mutex locks indirectement (analyser performance)

### Risques Potentiels

- Performance dégradée si pattern introduit overhead indirection
- Migration existant code vers nouveau pattern peut casser comportement
- Tests nécessaire couvrir edge cases (concurrent access, etc.)

### Solutions Préventives

- Keep pattern simple (1-2 trait levels max)
- Benchmark before/after performance
- Integration tests avec vraie DB aussi
- Gradual migration (adapter files one by one, test each)

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description                          | Statut       | Date       | Agent   |
| ----- | ---------- | ------------------------------------ | ------------ | ---------- | ------- |
| M     | 2.1        | Refactoring Injection Dépendances DB | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.2.1)**:

- Fichiers créés: `db_repository.rs`, `db_context.rs`
- Fichiers modifiés: `catalog.rs`, `ingestion.rs`, `main.rs`
- Tests créés: `db_repository_tests.rs` — N test cases with mocks
- Pattern: Repository/Context trait-based injection (diagram in doc)
- Performance: Benchmark before/after latency
```

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — New entries for repository/context
- Section "6. Patterns & Architecture Decisions" — Document DI pattern choice
- Add diagram of DBContext integration

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] Tests Rust passent (coverage ≥80%)
- [ ] Aucune direct `Mutex<Connection>` access en filepattern
- [ ] Integration tests pass (real DB usage)

### Integration

- [ ] Tests M.1.1, M.1.2, M.1.3 passent (non-régression)
- [ ] All Tauri commands work as before (backward compatible)
- [ ] CHANGELOG et APP_DOCUMENTATION mis à jour
- [ ] Code compile sans warning
