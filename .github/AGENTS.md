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
- **DRY (Don't Repeat Yourself)** : Setup réutilisable via composite actions

### 1.2 — Composite Actions (Réduction de Duplication)

Deux composite actions éliminent la duplication de setup à travers les jobs :

**`.github/actions/setup-rust/action.yml`**
```yaml
name: Setup Rust Environment
description: Install Rust toolchain, mold, APT packages, and caching
runs:
  using: composite
  steps:
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: rustfmt, clippy
    - run: sudo apt-get install -y mold
      shell: bash
    - uses: Swatinem/rust-cache@v2
    - uses: awalsh128/cache-apt-pkgs-action@latest
      with:
        packages: libgtk-3-dev libwebkit2gtk-4.1-dev ... (Tauri deps)
```

**`.github/actions/setup-node/action.yml`**
```yaml
name: Setup Node Environment
description: Setup Node.js 20.x with npm caching
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
```

**Utilisation dans les jobs** :
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-rust  # ← Une ligne au lieu de 10
  - run: cd src-tauri && cargo fmt --check
```

**Avantages** :
- ✅ **Source unique** : Toute modification du setup Rust affecte tous les jobs
- ✅ **Lisibilité** : Les jobs sont 60% plus courts
- ✅ **Maintenabilité** : Pas de drift entre validate-backend, backend, integration, security

### 1.3 — Structure du Pipeline

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
    timeout-minutes: 10 # ← Obligatoire
    runs-on: ubuntu-latest
    # ...
```

| Job               | Timeout Max |
| ----------------- | ----------- |
| detect-changes    | 5 min       |
| validate-frontend | 10 min      |
| validate-backend  | 10 min      |
| frontend          | 15 min      |
| backend           | 15 min      |
| integration       | 30 min      |
| security          | 15 min      |

---

## 2. Détection de Changements

### 2.1 — Path Filtering

Le workflow doit **ignorer automatiquement** :

```yaml
paths-ignore:
  - '**.md' # Fichiers Markdown
  - '.github/workflows/**' # Autres workflows (pas le principal)
  - 'Docs/**' # Documentation
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

## 3. Quick Validation Jobs (Optimisé)

### 3.1 — validate-frontend

**Objectif** : TypeScript type-check + Prettier

```yaml
validate-frontend:
  needs: detect-changes
  if: needs.detect-changes.outputs.frontend == 'true'

  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-node    # ← Composite action
    - run: npm ci --prefer-offline
    - run: npm run type-check && npx prettier --check "src/**/*.{ts,tsx}"
```

### 3.2 — validate-backend

**Objectif** : Rust fmt + Clippy

```yaml
validate-backend:
  needs: detect-changes
  if: needs.detect-changes.outputs.backend == 'true'

  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-rust    # ← Composite action
    - run: cd src-tauri && cargo fmt --all -- --check
    - run: cd src-tauri && cargo clippy --lib -- -D warnings -A dead_code -A unused_variables
```

**Réduction de duplication** : 35 lignes → 12 lignes par job (66% réduction)

---

## 4. Full Test Jobs (PR to main)

### 4.1 — frontend (test + build)

**Objectif** : Tests Vitest + build Vite

```yaml
frontend:
  if: github.event_name == 'pull_request' && github.base_ref == 'main' && !github.event.pull_request.draft

  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-node    # ← Composite action (5 lignes)
    - run: npm ci --prefer-offline
    - run: npm run type-check && npm run lint
    - run: npm run test:ci && npm run build
```

### 4.2 — backend (test + build)

**Objectif** : Tests Rust + build lib

```yaml
backend:
  if: github.event_name == 'pull_request' && github.base_ref == 'main' && !github.event.pull_request.draft

  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-rust  # ← Composite action (25 lignes remplacées)
    - name: Format, lint & build
      run: |
        cd src-tauri
        cargo fmt --all -- --check
        cargo clippy --lib -- -D warnings -A dead_code -A unused_variables
        cargo build --lib
    - name: Run tests
      run: cd src-tauri && timeout 120 cargo test
```

**Réduction** : 45 lignes → 18 lignes (60% réduction)

---

## 5. Integration & Security (Optimisé)

### 5.1 — integration (build Tauri)

**Objectif** : Build complet de l'app Tauri + artifacts

```yaml
integration:
  needs: [frontend, backend]
  if: github.event_name == 'pull_request' && github.base_ref == 'main' &&
    (contains(github.event.pull_request.labels.*.name, 'run-integration') ||
     github.event.pull_request.mergeable_state == 'clean')

  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-node    # ← Composite action
    - uses: ./.github/actions/setup-rust    # ← Composite action
    - run: npm ci --prefer-offline
    - run: npm run build && npm run build:tauri
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: tauri-app-${{ github.sha }}
        path: src-tauri/target/release/bundle/deb/*.deb
        retention-days: 7
```

**Réduction** : 40 lignes → 18 lignes (55% réduction)

### 5.2 — security (audits)

**Objectif** : Audits de sécurité Rust + Node.js

```yaml
security:
  if: github.event_name == 'pull_request' && github.base_ref == 'main' &&
    github.event.pull_request.mergeable_state == 'clean'

  steps:
    - uses: actions/checkout@v4
    - uses: ./.github/actions/setup-rust    # ← Composite action
    - name: Rust security audit
      run: |
        cargo install --locked cargo-audit
        cd src-tauri && cargo audit --deny warnings
    - name: Node.js security audit
      run: npm audit --audit-level high
```

**Réduction** : 22 lignes → 15 lignes (32% réduction)

---

## 6. Caching & Performance (Centralisé)

### 6.1 — npm Cache (via setup-node action)

Automatiquement géré par `./.github/actions/setup-node` :

```yaml
- uses: ./.github/actions/setup-node  # Caching intégré
  # → Cache npm/package-lock.json automatiquement
  # → Restaure node_modules entre jobs
```

**Aucune configuration manuelle requise** — c'est géré par l'action composite.

### 6.2 — Rust Cache (via setup-rust action)

Automatiquement géré par `./.github/actions/setup-rust` :

```yaml
- uses: ./.github/actions/setup-rust  # Caching intégré
  # → Swatinem/rust-cache@v2 avec shared-key
  # → Cache compilation artifacts + APT packages
  # → Même cache partagé entre tous les jobs
```

**Avantage** : Modification du setup = mise à jour centralisée instant dans tous les jobs (4x automatiquement)

### 6.3 — Artefacts

Les artefacts de build sont capturés avec `if: always()` :

```yaml
- uses: actions/upload-artifact@v4
  if: always()  # Même en cas d'échec
  with:
    name: tauri-app-${{ github.sha }}
    path: src-tauri/target/release/bundle/deb/*.deb
    retention-days: 7
```

---

## 7. Maintenance des Actions Composites

### 7.1 — Ajouter une dépendance Rust

Si une nouvelle dépendance système est requise pour Rust (ex: `libfoo-dev`), la modifier **UNE SEULE FOIS** dans `.github/actions/setup-rust/action.yml` :

```yaml
# .github/actions/setup-rust/action.yml
      with:
        packages: libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf libssl-dev pkg-config libfoo-dev  ← Ajouter ici
        version: 1.0
```

Cette modification affecte **automatiquement** : `validate-backend` + `backend` + `integration` + `security` (4 jobs).
**Sans duplicate** — le changement est centralisé.

### 7.2 — Ajouter une nouvelle dépendance système

1. Mettre à jour `.github/actions/setup-rust/action.yml`
2. Tester sur une branche (le workflow l'utilisera automatiquement)
3. Pusher — tous les jobs Rust utiliseront la nouvelle version

### 7.3 — Créer une nouvelle action composite

Créer `.github/actions/setup-foo/action.yml` :

```yaml
name: Setup Foo
description: Install Foo toolchain and dependencies

runs:
  using: composite
  steps:
    - run: some-install-command
      shell: bash
    - uses: some/external-action@v1
```

Puis l'utiliser dans `ci.yml` :

```yaml
steps:
  - uses: ./.github/actions/setup-foo
```

---

## 8. Conditions & Déclencheurs

### 7.1 — Déclencheurs

```yaml
on:
  push:
    branches-ignore: [main] # Aucun push direct sur main
    paths-ignore: ['**.md', '.github/**', 'Docs/**']
  pull_request:
    branches: [develop, main]
    paths-ignore: ['**.md', '.github/**', 'Docs/**']
```

### 7.2 — Conditions de Jobs

| Job               | Quand s'exécute                                    |
| ----------------- | -------------------------------------------------- |
| detect-changes    | Toujours (rapide)                                  |
| validate-frontend | Si src/ changé + (push OU PR vers develop)         |
| validate-backend  | Si src-tauri/ changé + (push OU PR vers develop)   |
| frontend          | PR vers main non-draft                             |
| backend           | PR vers main non-draft                             |
| integration       | PR vers main merge-ready (labeled OU clean status) |
| security          | PR vers main merge-ready                           |

---

## 9. Debugging Failed Workflows

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

## 10. Lien avec Autres Documents

**Conventions de code** → `src/AGENTS.md` (Frontend) et `src-tauri/AGENTS.md` (Backend)

**Règles absolues** → `AGENTS.md` racine

**Stratégie de tests** → `Docs/TESTING_STRATEGY.md`

**Architecture générale** → `Docs/APP_DOCUMENTATION.md`
