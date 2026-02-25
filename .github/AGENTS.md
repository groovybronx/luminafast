
# LuminaFast Agents — CI/CD & Infrastructure

> **Directives spécialisées pour GitHub Actions et infrastructure.**
> Lisez d’abord `AGENTS.md` (racine) pour les règles absolues globales et le protocole général.

---

## Sommaire

1. GitHub Actions workflow
2. Détection de changements
3. Quick validation jobs
4. Path filtering
5. Timeouts
6. Caching & artifacts
7. Checklist pré-commit

---

## 1. GitHub Actions workflow

### 1.1 — Philosophie

Le workflow doit être:
- **Rapide** : Feedback immédiat aux devs (< 10 min pour quick validation)
- **Économe** : Pas d'exécution inutile (path filtering)
- **Fiable** : Tous les tests passent avant merge
- **Transparent** : Chaque job a un timeout et un objectif clair

### 1.2 — Structure du Pipeline

```
PUSH (n'importe quelle branche) OU PR vers develop
  ↓
detect-changes (quick detection)
  ↓
  ├─ validate-frontend (si src/** changé) — 10 min
  └─ validate-backend (si src-tauri/** changé) — 10 min
     (Exécution parallèle)

PR vers main (non-draft)
  ↓
  ├─ frontend (tests complets) — 15 min
  └─ backend (tests complets) — 15 min
     (Dépendance: detect-changes)

PR vers main (merge-ready)
  ↓
  ├─ integration (build Tauri) — 30 min
  │  (Dépendance: frontend + backend)
  └─ security (audits) — 15 min
     (Parallèle, pas dépendant)
```

### 1.3 — Timeouts Obligatoires

Chaque job DOIT avoir un `timeout-minutes` :

```yaml
jobs:
  validate-frontend:
    timeout-minutes: 10    # ← Obligatoire
    runs-on: ubuntu-latest
    # ...
```

| Job | Timeout Max |
|-----|------------|
| detect-changes | 5 min |
| validate-frontend | 10 min |
| validate-backend | 10 min |
| frontend | 15 min |
| backend | 15 min |
| integration | 30 min |
| security | 15 min |

---

## 2. Détection de Changements

### 2.1 — Path Filtering

Le workflow doit **ignorer automatiquement** :

```yaml
paths-ignore:
  - '**.md'                    # Fichiers Markdown
  - '.github/workflows/**'     # Autres workflows (pas le principal)
  - 'Docs/**'                  # Documentation
```

### 2.2 — Job `detect-changes`

Utiliser `dorny/paths-filter@v2` pour détecter **précisément** quels fichiers ont changé :

```yaml
detect-changes:
  name: Detect Changes
  runs-on: ubuntu-latest
  outputs:
    frontend: ${{ steps.filter.outputs.frontend }}
    backend: ${{ steps.filter.outputs.backend }}
  steps:
    - uses: actions/checkout@v4
    - uses: dorny/paths-filter@v2
      id: filter
      with:
        filters: |
          frontend:
            - 'src/**'
            - 'package.json'
            - 'tsconfig.json'
          backend:
            - 'src-tauri/**'
            - 'Cargo.lock'
```

Puis les jobs conditionnels l'utilisent :

```yaml
validate-frontend:
  needs: detect-changes
  if: needs.detect-changes.outputs.frontend == 'true'
```

---

## 3. Quick Validation Jobs

### 3.1 — validate-frontend

**Objectif** : TypeScript type-check + Prettier

```yaml
validate-frontend:
  name: Quick Validation (Frontend)
  runs-on: ubuntu-latest
  timeout-minutes: 10

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    - run: npm ci --prefer-offline
    - run: npm run type-check
    - run: npx prettier --check "src/**/*.{ts,tsx}"
```

### 3.2 — validate-backend

**Objectif** : Rust fmt + Clippy

```yaml
validate-backend:
  name: Quick Validation (Backend)
  runs-on: ubuntu-latest
  timeout-minutes: 10

  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: rustfmt, clippy
    - uses: Swatinem/rust-cache@v2
      with:
        workspaces: src-tauri
        shared-key: rust-stable
    - name: Install system dependencies
      run: |
        sudo apt-get update -qq
        sudo apt-get install -y --no-install-recommends \
          libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
          librsvg2-dev patchelf libssl-dev pkg-config
    - run: cd src-tauri && cargo fmt --check
    - run: cd src-tauri && cargo clippy --lib -- -D warnings
```

---

## 4. Full Test Jobs

### 4.1 — frontend (test + build)

**Objectif** : Tests Vitest + build Vite

```yaml
frontend:
  name: Frontend
  runs-on: ubuntu-latest
  timeout-minutes: 15
  if: github.event_name == 'pull_request' &&
      github.base_ref == 'main' &&
      !github.event.pull_request.draft

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    - run: npm ci --prefer-offline
    - run: npm run type-check
    - run: npm run lint
    - run: npm run test:ci
    - run: npm run build
```

### 4.2 — backend (test + build)

**Objectif** : Tests Rust + build lib

```yaml
backend:
  name: Backend
  runs-on: ubuntu-latest
  timeout-minutes: 15
  if: github.event_name == 'pull_request' &&
      github.base_ref == 'main' &&
      !github.event.pull_request.draft

  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: rustfmt, clippy
    - uses: Swatinem/rust-cache@v2
      with:
        workspaces: src-tauri
        shared-key: rust-stable
        cache-on-failure: true
    - name: Install system dependencies
      run: |
        sudo apt-get update -qq
        sudo apt-get install -y --no-install-recommends \
          libgtk-3-dev libwebkit2gtk-4.1-dev \
          libayatana-appindicator3-dev librsvg2-dev \
          patchelf libssl-dev pkg-config
    - name: Create dist placeholder
      run: mkdir -p dist && echo '<!DOCTYPE html><html></html>' > dist/index.html
    - run: cd src-tauri && cargo fmt --check
    - run: cd src-tauri && cargo clippy --lib -- -D warnings
    - run: cd src-tauri && cargo build --lib
    - run: cd src-tauri && timeout 120 cargo test
```

---

## 5. Integration & Security

### 5.1 — integration (build Tauri)

**Objectif** : Build complet de l'app Tauri + artifacts

```yaml
integration:
  name: Integration Build
  runs-on: ubuntu-latest
  timeout-minutes: 30
  needs: [frontend, backend]
  if: github.event_name == 'pull_request' &&
      github.base_ref == 'main' &&
      (contains(github.event.pull_request.labels.*.name, 'run-integration') ||
       github.event.pull_request.mergeable_state == 'clean')

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    - uses: dtolnay/rust-toolchain@stable
    - uses: Swatinem/rust-cache@v2
      with:
        workspaces: src-tauri
        shared-key: rust-stable
    - name: Install system dependencies
      run: |
        sudo apt-get update -qq
        sudo apt-get install -y --no-install-recommends \
          libgtk-3-dev libwebkit2gtk-4.1-dev \
          libayatana-appindicator3-dev librsvg2-dev \
          patchelf libssl-dev pkg-config
    - run: npm ci --prefer-offline
    - run: npm run build
    - run: npm run build:tauri
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: tauri-app-${{ github.sha }}
        path: src-tauri/target/release/bundle/deb/*.deb
        retention-days: 7
```

### 5.2 — security (audits)

**Objectif** : Audits de sécurité Rust + Node.js

```yaml
security:
  name: Security Audit
  runs-on: ubuntu-latest
  timeout-minutes: 15
  if: github.event_name == 'pull_request' &&
      github.base_ref == 'main' &&
      github.event.pull_request.mergeable_state == 'clean'

  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - uses: Swatinem/rust-cache@v2
      with:
        workspaces: src-tauri
        shared-key: rust-stable
    - name: Rust security audit
      run: |
        cargo install --locked cargo-audit
        cd src-tauri && cargo audit --deny warnings
    - name: Node.js security audit
      run: npm audit --audit-level high
```

---

## 6. Cache & Performance

### 6.1 — npm Cache

Utilisé automatiquement par `actions/setup-node@v4` avec `cache: 'npm'` :

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    cache: 'npm'  ← Cache npm/package-lock.json
```

### 6.2 — Rust Cache

Utiliser `Swatinem/rust-cache@v2` :

```yaml
- uses: Swatinem/rust-cache@v2
  with:
    workspaces: src-tauri
    shared-key: rust-stable
    cache-on-failure: true  # Important pour les builds qui échouent
```

### 6.3 — Artefacts

`if: always()` capture les artefacts même en cas d'échec (pour debug) :

```yaml
- uses: actions/upload-artifact@v4
  if: always()  ← Même si build échoue
  with:
    name: tauri-app-${{ github.sha }}
    path: src-tauri/target/release/bundle/deb/*.deb
    retention-days: 7
```

---

## 7. Conditions & Déclencheurs

### 7.1 — Déclencheurs

```yaml
on:
  push:
    branches-ignore: [main]           # Aucun push direct sur main
    paths-ignore: ['**.md', '.github/**', 'Docs/**']
  pull_request:
    branches: [develop, main]
    paths-ignore: ['**.md', '.github/**', 'Docs/**']
```

### 7.2 — Conditions de Jobs

| Job | Quand s'exécute |
|-----|-----------------|
| detect-changes | Toujours (rapide) |
| validate-frontend | Si src/ changé + (push OU PR vers develop) |
| validate-backend | Si src-tauri/ changé + (push OU PR vers develop) |
| frontend | PR vers main non-draft |
| backend | PR vers main non-draft |
| integration | PR vers main merge-ready (labeled OU clean status) |
| security | PR vers main merge-ready |

---

## 8. Debugging Failed Workflows

### 8.1 — Logs

Chaque job produit des logs détaillés. Cliquer sur le job échoué pour voir:

```
Step: Install system dependencies
Run: sudo apt-get update
stderr: E: Sub-process /usr/bin/apt-get returned an error code (1)
```

### 8.2 — Artifacts d'Échec

Utiliser `if: always()` pour capturer les outputs même en cas d'erreur:

```yaml
- name: Upload test results on failure
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results-${{ github.sha }}
    path: test-results/
```

---

## 9. Lien avec Autres Documents

**Conventions de code** → `src/AGENTS.md` (Frontend) et `src-tauri/AGENTS.md` (Backend)

**Règles absolues** → `AGENTS.md` racine

**Stratégie de tests** → `Docs/TESTING_STRATEGY.md`

**Architecture générale** → `Docs/APP_DOCUMENTATION.md`
