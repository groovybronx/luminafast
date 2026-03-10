# Phase M.2.2 — Durcissement Sécurité

> **Statut** : ✅ **Complétée** (2026-03-10)
> **Durée estimée** : 2-3 jours
> **Priorité** : P1 (Élevée)

## Objectif

Restreindre l'accès aux fichiers système via Tauri assetProtocol, implémenter une liste blanche dynamique de dossiers autorisés, et revoir Content Security Policy pour éviter XSS avant distribution commerciale.

## Périmètre

### ✅ Inclus dans cette phase

- Audit `src-tauri/tauri.conf.json` : identifier scope `assetProtocol` trop large
- Suppression de wildcards `$HOME/**` (remplacer par liste blanche spécifique)
- Implémentation système liste blanche dynamique de dossiers autorises
- Validation chemins fichiers avant accès (prevent path traversal)
- Revue CSP (Content Security Policy) dans `tauri.conf.json`
- Tests de sécurité : tentatives accès path hors whitelist doivent échouer

### ❌ Exclus ou reporté intentionnellement

- Détail complet CSP review avancée (reporté à phase **M.2.2a** — brief dédié `MAINTENANCE-MT-M.2.2a-csp-review.md`)
- Audit complet des permissions Tauri (out of scope, très vaste)
- Encryption données sensibles (future phase)

## Dépendances

### Phases

- Phase M.1.3 ✅ (nettoyage code, clarté codebase)

### Ressources Externes

- Tauri docs sur assetProtocol et CSP
- OWASP path traversal prevention best practices

### Test Infrastructure

- Rust integration tests pour validation whitelist

## Fichiers

### À créer

- `src-tauri/src/services/security.rs` — Path validation + whitelist logic
  - Function: `validate_path(requested_path: &str, whitelist: &[String]) -> Result<(), SecurityError>`
  - Function: `is_path_traversal_attempt(path: &str) -> bool`

### À modifier

- `src-tauri/tauri.conf.json` — Restreindre assetProtocol scope, ajouter CSP stricte
- `src-tauri/src/main.rs` — Initialiser whitelist depuis config ou env vars
- `src-tauri/src/commands/catalog.rs` — Appeler validation chemin avant accès fichier
- `src-tauri/src/services/discovery.rs` — Appeler validation chemin avant scan

## Interfaces Publiques

### Rust Types/Functions

```rust
// src-tauri/src/services/security.rs

#[derive(Debug)]
pub enum SecurityError {
    PathTraversalAttempt,
    NotInWhitelist,
    InvalidPath,
}

pub fn validate_path(requested_path: &str, whitelist: &[String]) -> Result<(), SecurityError>;
pub fn is_path_traversal_attempt(path: &str) -> bool;
pub fn normalize_path(path: &str) -> Result<PathBuf, SecurityError>;
```

### Tauri Configuration (tauri.conf.json)

```json
{
  "tauri": {
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      "assetProtocol": {
        "enable": true,
        "scope": ["app:///**"] // Restrictive scope
      }
    }
  }
}
```

## Contraintes Techniques

### Rust Backend

- ✅ Aucun accès fichier sans validation prealable
- ✅ Path traversal attempts (`../`, `..\\`) rejectés
- ✅ Utiliser `std::path::Path::canonicalize()` pour resolve paths
- ✅ Whitelist peut être dynamic (loaded from DB ou env)
- ✅ Tests exhaustifs cas malveillants (fuzzing optional)

### Security

- ✅ Pas de hardcoded paths (utiliser config)
- ✅ Logs accès fichier pour audit (optional, security phase future)

## Architecture Cible

### Path Validation Flow

```
Request: /path/to/image.jpg
  ↓
normalize_path()               // Resolve ../, ./, symlinks
  ↓
is_path_traversal_attempt()    // Reject ../../../etc/passwd, etc.
  ↓
validate_path(whitelist)       // Check if path in authorized dirs
  ↓
Access file
```

### Whitelist Example

```rust
let whitelist = vec![
  "/Users/user/Pictures".to_string(),
  "/Users/user/Documents/Photos".to_string(),
];

validate_path("/Users/user/Pictures/vacation.jpg", &whitelist)?  // ✅ OK
validate_path("/etc/passwd", &whitelist)?                          // ❌ BLOCKED
validate_path("/Users/user/Pictures/../../etc/passwd", &whitelist)?  // ❌ BLOCKED (traversal)
```

## Dépendances Externes

### Rust (`Cargo.toml`)

- tokio = "1.x" (déjà présent)
- No new dependencies required (std::path::Path sufficient)

## Checkpoints

- [x] **Checkpoint 1** : Audit tauri.conf.json completed (current scope listed)
- [x] **Checkpoint 2** : Code compile (`cargo check` ✅)
- [x] **Checkpoint 3** : Path validation tests pass (including malicious paths)
- [x] **Checkpoint 4** : Whitelist functional in real usage (discover folders)
- [x] **Checkpoint 5** : CSP review completed, config updated

## Pièges & Risques

### Pièges Courants

- Symlinks allowing bypass de whitelist (use `canonicalize()`)
- Unicode normalization attacks (path confusion)
- Relative path confusion (always use absolute paths)
- Forgetting to validate ALL filesystem access points

### Risques Potentiels

- **Security bypass** si validation incomplete (attacker discovers input not checked)
- **False positives** overly restrictive whitelist causes legitimate usage failure
- **Performance** path canonicalization might be slow (cache results)

### Solutions Préventives

- Test with path fuzzer (malicious input generation)
- Whitelist should be explicit per-user (not global)
- Logging all path validation attempts (audit trail)
- Security testing before release (penetration test optional)

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description                                 | Statut       | Date       | Agent   |
| ----- | ---------- | ------------------------------------------- | ------------ | ---------- | ------- |
| M     | 2.2        | Durcissement Sécurité (path whitelist, CSP) | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.2.2)**:

- Fichiers créés: `security.rs` (path validation)
- Fichiers modifiés: `tauri.conf.json`, `catalog.rs`, `discovery.rs`
- Tests créés: `security_tests.rs` — Path traversal attempts blocked
- Whitelist: Dynamic implementation details
- CSP: Updated to restrictive mode (details in APP_DOCUMENTATION)
```

### APP_DOCUMENTATION.md Sections to Update

- Section "8. Security & Compliance" — New section describing whitelist system
- Section "tauri.conf.json" — Explain assetProtocol scope + CSP settings

## Critères de Complétion

### Backend

- [x] `cargo check` ✅
- [x] `cargo clippy` ✅ (0 warnings)
- [x] Tests Rust passent (coverage ciblée sécurité/discovery validée)
- [x] Aucun path traversal attack successful dans tests
- [x] Whitelist validation integrated in discovery commands + discovery service (defense in depth)

### Security

- [x] CSP review completed, config matches OWASP recommendations
- [x] tauri.conf.json assetProtocol scope restricted
- [x] Whitelist tested with real user folders

### Integration

- [x] Tests M.1.x, M.2.1 non-régression ciblée maintenue (discovery + backend sécurité)
- [x] User can still access authorized folders normally
- [x] CHANGELOG et APP_DOCUMENTATION mis à jour
- [x] Code compile sans warning
