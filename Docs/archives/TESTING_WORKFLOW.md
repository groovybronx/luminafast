# Testing Workflow Locally

Ce guide explique comment tester le workflow GitHub Actions en local avant de commiter.

## Option 1: Scripts NPM (Recommandé pour développement rapide)

### Test du Frontend

```bash
npm run test:workflow
```

Exécute :
- TypeScript type-check
- ESLint linting
- Vitest tests avec coverage
- Build Vite

### Test du Backend

```bash
npm run test:workflow:backend
```

Exécute :
- `cargo fmt` check
- `cargo clippy` lint
- `cargo build`
- `cargo test` (tests ignorés)

### Test Complet (Frontend + Backend)

```bash
npm run test:workflow:all
```

Ou directement :

```bash
./scripts/test-workflow.sh
./scripts/test-workflow.sh all
./scripts/test-workflow.sh frontend
./scripts/test-workflow.sh backend
```

---

## Option 2: Act (Simulation Exacte de GitHub Actions)

### Installation

```bash
# macOS
brew install act

# Linux
sudo apt install act  # ou voir https://github.com/nektos/act#installation
```

### Utilisation

```bash
# Tester tout le workflow comme sur GitHub Actions
act

# Tester un job spécifique
act -j frontend
act -j backend
act -j integration

# Tester avec événement spécifique
act pull_request
act push

# Avec plus de verbosité
act -v
```

### Avantages de `act`

✅ Simule exactement GitHub Actions
✅ Exécute dans Docker (environment isolé)
✅ Même OS, même versions que CI/CD
✅ Détecte les secrets (`.secrets`)
✅ Teste les conditions `if:`
✅ Reproduit les erreurs CI avant push

### Configuration de `act` (optionnel)

Pour utiliser une image Docker custom, créer `.actrc` :

```config
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
-b
```

---

## Workflow Type: Avant de Commiter

1. **Développement rapide** (10-20 sec) :
   ```bash
   npm run test:workflow
   ```

2. **Avant pull request** (1-2 min) :
   ```bash
   npm run test:workflow:all
   ```

3. **Pour déboguer CI** (5-10 min) :
   ```bash
   act
   ```

---

## Scripts Disponibles

| Command | Description |
|---------|-------------|
| `npm run test:workflow` | Frontend seulement |
| `npm run test:workflow:backend` | Backend seulement |
| `npm run test:workflow:all` | Frontend + Backend |
| `./scripts/test-workflow.sh` | Shell script équivalent |
| `act` | Simulation GitHub Actions complète |
| `act -j frontend` | Job frontend seulement |
| `act -j backend` | Job backend seulement |

---

## Troubleshooting

### `act` n'est pas installé
```bash
brew install act
```

### Erreurs Docker avec `act`
```bash
# Vérifier Docker
docker --version

# Si Docker n'est pas lancé
open -a Docker  # macOS
```

### Script shell pas exécutable
```bash
chmod +x ./scripts/test-workflow.sh
```

### Tests lents la première fois ?
- `act` télécharge les images Docker la première fois (~1GB)
- Les runs suivants sont plus rapides

---

## Notes

- **CI/CD** utilise le workflow strictement défini dans `.github/workflows/ci.yml`
- **Local testing** permet de reproduire les étapes avant push
- **act** est idéal pour déboguer les erreurs CI avant commit
- **Scripts NPM** sont plus rapides pour le développement itératif

Recommandation : Utilisez `npm run test:workflow` en dev, puis `act` avant PR !
