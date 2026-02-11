# Phase 0.5 — Pipeline CI & Linting

## Objectif
Mettre en place un pipeline d'intégration continue et un linting strict pour garantir la qualité du code avant d'attaquer le backend Rust.

## Périmètre
### Configuration ESLint étendue
- Règles TypeScript strictes
- Règles React (hooks, best practices)
- Règles d'import/export
- Configuration pour les fichiers Rust (clippy)

### GitHub Actions
- Workflow CI sur push/PR
- Tests automatisés sur Node.js
- Build Tauri sur macOS
- Linting TypeScript + Rust
- Coverage de tests

### Scripts npm additionnels
- `lint` - Linting TypeScript + Rust
- `lint:fix` - Auto-correction
- `test:ci` - Tests pour CI (coverage)
- `build:tauri` - Build production Tauri

### Configuration outils
- `.github/workflows/ci.yml` - Pipeline CI
- `rust-toolchain.toml` - Version Rust fixe
- `.rustfmt.toml` - Formatting Rust
- `clippy.toml` - Règles Clippy

## Critères de validation
- [x] ESLint passe sans erreur sur tout le codebase
- [x] Clippy passe sans warning sur le code Rust
- [x] GitHub Actions exécute les tests avec succès
- [x] Coverage de tests ≥ 80%
- [x] Build Tauri production fonctionne
- [x] Aucun `any` TypeScript détecté
- [x] Formatage automatique (Prettier + rustfmt)

## Dépendances
- Phase 0.4 (State Management) ✅
- Tests existants (Phase 0.4) ✅

## Livrables
- Pipeline CI fonctionnel
- Codebase 100% linté
- Scripts de développement unifiés
- Documentation des outils dans APP_DOCUMENTATION.md

## Notes
- Prépare l'intégration continue pour les phases backend
- Établit les standards de qualité pour tout le projet
- Facilitera les reviews de code futurs
