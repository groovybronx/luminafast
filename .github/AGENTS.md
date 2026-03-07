# LuminaFast — CI/CD & Infrastructure (Agents IA)

> **Format minimal pour agents IA.**
> Source de vérité = [`.github/workflows/ci.yml`](.github/workflows/ci.yml) + [`.github/actions/*/action.yml`](.github/actions/)

---

## 1. Directives Absolues

| Règle                   | Détail                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **DRY Setup**           | Rust setup → `.github/actions/setup-rust/action.yml` (utilisée par validate-backend, backend, integration, security) |
| **DRY Setup**           | Node setup → `.github/actions/setup-node/action.yml` (utilisée par validate-frontend, frontend, integration)         |
| **Timeout obligatoire** | Chaque job DOIT avoir `timeout-minutes` (voir tableau timeouts)                                                      |
| **Pas de duplication**  | Avant ajouter étape = vérifier si existe déjà dans une action composite                                              |
| **Path filtering**      | Ignorer: `**.md`, `.github/**`, `Docs/**`                                                                            |
| **No direct push**      | Aucun push direct sur `main` — PR seulement                                                                          |

---

## 2. Job Matrix & Timeouts

### Execution Flow

```
Commit (any branch except main)
  → detect-changes (5 min)
    ├─ validate-frontend (if src/* changed, 10 min)
    └─ validate-backend (if src-tauri/* changed, 10 min)

PR to main (non-draft)
  → frontend (15 min) + backend (15 min)

PR merge-ready
  → integration (30 min) + security (15 min)
```

### Timeouts

| Job               | minutes | Condition                                           |
| ----------------- | ------- | --------------------------------------------------- |
| detect-changes    | 5       | Always                                              |
| validate-frontend | 10      | Push/PR to develop + src/\* changed                 |
| validate-backend  | 10      | Push/PR to develop + src-tauri/\* changed           |
| frontend          | 15      | PR to main (non-draft)                              |
| backend           | 15      | PR to main (non-draft)                              |
| integration       | 30      | PR to main (labeled `run-integration` OR mergeable) |
| security          | 15      | PR to main (mergeable only)                         |

---

## 3. Composite Actions

### setup-rust

**File**: `.github/actions/setup-rust/action.yml`

Contains:

- dtolnay/rust-toolchain@stable (rustfmt, clippy)
- mold linker
- Swatinem/rust-cache@v2
- APT packages (Tauri dependencies)

**Used by**: validate-backend, backend, integration, security

### setup-node

**File**: `.github/actions/setup-node/action.yml`

Contains:

- actions/setup-node@v4 (v20.x, npm cache)

**Used by**: validate-frontend, frontend, integration

---

## 4. Maintenance

### Add Rust System Dependency

1. Edit `.github/actions/setup-rust/action.yml` (packages list)
2. Affects: validate-backend + backend + integration + security (auto)

### Add Node Dependency

1. Edit `.github/actions/setup-node/action.yml`
2. Affects: validate-frontend + frontend + integration (auto)

### Create New Composite Action

1. Create `.github/actions/setup-{name}/action.yml`
2. Use in ci.yml: `- uses: ./.github/actions/setup-{name}`

### Modify Workflow Behavior

1. Edit `.github/workflows/ci.yml` (source of truth)
2. Reference this AGENTS.md only for directives

---

## 5. Environment Variables

```yaml
env:
  CARGO_TERM_COLOR: always
  CARGO_INCREMENTAL: 1
  CARGO_BUILD_JOBS: 4
  RUSTFLAGS: -C link-arg=-fuse-ld=mold
```

---

## 6. Key Paths

| Item               | Path                                        |
| ------------------ | ------------------------------------------- |
| Main workflow      | `.github/workflows/ci.yml`                  |
| Setup actions      | `.github/actions/setup-*/action.yml`        |
| Build artifacts    | `src-tauri/target/release/bundle/deb/*.deb` |
| Artifact retention | 7 days                                      |

---

## 7. Common Patterns

### Conditional Execution

```yaml
if: github.event_name == 'pull_request' &&
  github.base_ref == 'main' &&
  !github.event.pull_request.draft
```

### Execute if Files Changed

```yaml
needs: detect-changes
if: needs.detect-changes.outputs.backend == 'true'
```

### Always Capture Artifacts

```yaml
- uses: actions/upload-artifact@v4
  if: always() # Even on failure
```

---

## 8. Debugging

### Find Logs

GitHub Actions tab → Workflow → Click failed job → View logs

### Common Issues

| Problem              | Check                                    |
| -------------------- | ---------------------------------------- |
| APT install fails    | Host OS (ubuntu-latest), network         |
| Rust cache broken    | shared-key in setup-rust/action.yml      |
| Node cache stale     | npm ci --prefer-offline forces reinstall |
| Timeout during build | timeout-minutes < actual build time      |

---

## 9. Related Documents

- **Global rules** → [AGENTS.md (root)](../AGENTS.md)
- **Frontend conventions** → [src/AGENTS.md](../src/AGENTS.md)
- **Backend conventions** → [src-tauri/AGENTS.md](../src-tauri/AGENTS.md)
- **Testing strategy** → [Docs/TESTING_STRATEGY.md](../Docs/TESTING_STRATEGY.md)
- **Architecture** → [Docs/APP_DOCUMENTATION.md](../Docs/APP_DOCUMENTATION.md)
