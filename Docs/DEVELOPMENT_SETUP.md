# LuminaFast — Configuration de l'Environnement de Développement

## Extensions VS Code Requises

Pour bénéficier du formatage automatique, installez ces extensions (recommandations dans `.vscode/extensions.json`) :

### Essentielles

- **rust-lang.rust-analyzer** — Formatage Rust automatique (rustfmt) + Clippy
- **esbenp.prettier-vscode** — Formatage TypeScript/React automatique
- **dbaeumer.vscode-eslint** — Linting TypeScript automatique

### Recommandées

- **tauri-apps.tauri-vscode** — Support Tauri
- **bradlc.vscode-tailwindcss** — Autocomplétion Tailwind
- **eamodio.gitlens** — Git enrichi

## Formatage Automatique

### ✨ Rust (rustfmt + clippy)

Le formatage Rust est **automatique** via rust-analyzer :

- **À la sauvegarde** : `Cmd+S` formate avec rustfmt (config dans `.rustfmt.toml`)
- **Au paste** : `Cmd+V` formate automatiquement
- **Vérification en temps réel** : Clippy s'exécute automatiquement à chaque sauvegarde
- **Code actions** : Les suggestions clippy s'appliquent automatiquement si possible

**Configuration** (déjà dans `.vscode/settings.json`) :

```json
"[rust]": {
  "editor.defaultFormatter": "rust-lang.rust-analyzer",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true
}
```

**Commandes manuelles** (si besoin) :

```bash
npm run rust:fmt          # Formater tout le code Rust
npm run rust:clippy       # Lancer Clippy
npm run rust:fix          # Formater + appliquer les corrections clippy
```

---

### ✨ TypeScript/React (Prettier + ESLint)

Le formatage TypeScript est **automatique** via Prettier :

- **À la sauvegarde** : `Cmd+S` formate avec Prettier (config dans `.prettierrc`)
- **Au paste** : `Cmd+V` formate automatiquement
- **ESLint** : Les erreurs sont corrigées automatiquement à la sauvegarde
- **Imports** : Organisés automatiquement à la sauvegarde

**Configuration** (déjà dans `.vscode/settings.json`) :

```json
"[typescript]": {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  }
}
```

**Commandes manuelles** (si besoin) :

```bash
npm run format            # Formater tout le code TypeScript
npm run lint:fix          # Corriger les erreurs ESLint
```

---

## Vérification Avant Commit

### Option 1 : Git Hooks (Automatique)

Installez le hook pre-commit pour vérifier automatiquement avant chaque commit :

```bash
make setup-hooks
```

Le hook vérifie et formate automatiquement :

- ✅ Rust : `cargo fmt` + `cargo clippy`
- ✅ TypeScript : `prettier` + `eslint --fix`
- ✅ Type check : `tsc --noEmit`

**Note** : Fonctionne avec les git worktrees également.

### Option 2 : Makefile (Manuel)

Pour vérifier/corriger manuellement avant de commiter :

```bash
make fmt              # Formater tout le code (Rust + TS)
make lint             # Linter tout le code
make fix              # Formater + corriger automatiquement
make check-all        # Vérifier tout (format + lint + tests)
```

### Option 3 : Scripts npm (Manuel)

```bash
# Rust
npm run rust:fmt          # Formater Rust
npm run rust:clippy       # Linter Rust
npm run rust:fix          # Formater + corriger Rust

# TypeScript
npm run format            # Formater TypeScript
npm run lint              # Linter TypeScript
npm run lint:fix          # Corriger TypeScript

# Tout
npm run type-check        # Vérifier les types TypeScript
```

---

## Configuration des Règles

### Rust — `.rustfmt.toml`

```toml
max_width = 100           # Largeur max des lignes
tab_spaces = 4            # Indentation 4 espaces
use_small_heuristics = "Default"
```

### Rust — `clippy.toml`

```toml
cognitive-complexity-threshold = 15
too-many-arguments-threshold = 7
too-many-lines-threshold = 100
```

Les règles clippy actives sont définies dans `.vscode/settings.json` :

- `-D warnings` : Toutes les warnings sont des erreurs
- `-A dead_code` : Ignore le code mort (utile en développement)
- `-A unused_variables` : Ignore les variables inutilisées (utile en développement)

### TypeScript — `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### TypeScript — `eslint.config.js`

Configuration ESLint avec support React, TypeScript et Prettier.

---

## Workflow Recommandé

1. **Développer normalement** — Le formatage se fait automatiquement à chaque sauvegarde
2. **Avant de commiter** :
   - Si git hooks installés : rien à faire, tout est vérifié automatiquement
   - Sinon : `make check-all` pour tout vérifier
3. **Si erreurs** :
   - `make fix` pour corriger automatiquement ce qui peut l'être
   - Corriger manuellement les erreurs restantes
4. **Commiter** — Les tests CI vérifient également tout

---

## Raccourcis Clavier VS Code Utiles

- `Cmd+S` : Sauvegarder + formater automatiquement
- `Shift+Alt+F` : Formater le fichier courant (manuel)
- `Cmd+.` : Afficher les quick fixes (suggestions clippy/eslint)
- `Cmd+Shift+P` → "Format Document" : Formater manuellement

---

## Désactiver le Formatage Automatique (si besoin)

Si vous préférez formater manuellement, modifiez `.vscode/settings.json` :

```json
{
  "editor.formatOnSave": false,
  "editor.formatOnPaste": false
}
```

Puis utilisez `Shift+Alt+F` pour formater manuellement quand vous le souhaitez.

---

## Troubleshooting

### "rustfmt not found"

```bash
rustup component add rustfmt
```

### "clippy not found"

```bash
rustup component add clippy
```

### "Prettier doesn't format on save"

1. Vérifier que l'extension Prettier est installée
2. Vérifier dans la barre de statut que Prettier est le formatter par défaut
3. `Cmd+Shift+P` → "Format Document With..." → "Prettier"

### "ESLint ne corrige pas automatiquement"

1. Vérifier que l'extension ESLint est installée
2. Vérifier dans `.vscode/settings.json` que `source.fixAll.eslint` est activé
3. Relancer VS Code

---

## Validation Locale du CI

Pour simuler le pipeline CI en local avant de pousser :

```bash
make ci
```

Cette commande exécute :

1. Format check (Rust + TypeScript)
2. Lint (Clippy + ESLint)
3. Type check (TypeScript)
4. Tests (Rust + TypeScript)
5. Build (Frontend + Backend)

Si tout passe, votre PR passera la CI.
