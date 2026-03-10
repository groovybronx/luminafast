# Phase M.1.2a — Cleanup Sync Code in Other Modules

> **Statut** : ✅ **Complétée** (2026-03-10)
> **Durée estimée** : 2-3 jours
> **Priorité** : P2 (Moyenne)
> **Dépendance** : Phase M.1.2 complétée

## Objectif

Balayer codebase Rust pour identifier et remplacer les appels `std::fs` restants dans contextes non-async (tests, utils, non-critical paths), garantissant cohérence stylée et éliminer dépendances legacy.

## Périmètre

### ✅ Inclus dans cette phase

- Audit complet des fichiers Rust pour `std::fs` usages
- Remplacement `std::fs` → `tokio::fs` dans fichiers async-compatible
- Adaptation code teste (peut rester std::fs si approprié)
- Documentation des décisions par-cas (pourquoi std::fs conservé si cas)
- Validation aucune régression

### ❌ Exclus ou reporté intentionnellement

- Refactoring global error handling (out of scope)
- Migration entire test suite vers async (too large, selective seulement)

## Dépendances

### Phases

- Phase M.1.2 ✅ (core discovery/preview migrated)

## Fichiers

### À modifier

- Various Rust files identified in audit (list after analysis)

## Checkpoints

- [x] **Checkpoint 1** : Audit complète des std::fs usages
- [x] **Checkpoint 2** : Code compile (`cargo check` ✅)
- [x] **Checkpoint 3** : Tests passent
- [x] **Checkpoint 4** : Grep std::fs returns only justified cases

## Critères de Complétion

### Backend

- [x] `cargo check` ✅
- [x] `cargo clippy` ✅
- [x] Tests Rust passent

### Integration

- [x] Tests M.1.1, M.1.2 passent (ciblés backend non-régression)
- [x] CHANGELOG mis à jour

## Résultat d'Audit std::fs (M.1.2a)

### Modifications appliquées

- `src-tauri/src/services/xmp.rs`
  - Suppression des APIs sync `read_xmp` / `write_xmp` utilisant `std::fs`.
  - Conservation uniquement des APIs async `read_xmp_async` / `write_xmp_async` (tokio::fs).
  - Adaptation des tests vers le flux async déjà en place.

### Usages std::fs restants et justifiés

- `src-tauri/src/services/blake3.rs` : lecture streaming via `std::fs::File` dans `spawn_blocking` (I/O sync volontaire en contexte CPU-bound).
- `src-tauri/src/services/exif.rs` : parsing EXIF via `kamadak-exif` sur `std::io::Read` sync.
- `src-tauri/src/services/filesystem.rs` : `std::fs::metadata` dans callback `notify` sync (non-async).
- `src-tauri/src/lib.rs` : `create_dir_all` au bootstrap app (one-shot setup synchrone).
- Usages en modules de test (`commands/*`, `services/security.rs`, `services/discovery/tests.rs`) conservés pour fixtures/tests.

## Validation Exécutée

- `cargo check` ✅
- `cargo clippy --all-targets -- -D warnings` ✅
- `cargo test xmp -- --nocapture` ✅ (16 tests)
- `cargo test test_get_all_images_brief_query_returns_null_exif_columns -- --nocapture` ✅
