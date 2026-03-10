# BRIEF_TEMPLATE — Structure de Brief par Sous-Phase

Chaque sous-phase DOIT avoir un fichier `Docs/briefs/PHASE-X.Y.md` suivant cette structure. Ce brief est le **prompt principal** pour les agents IA.

---

## Sections Obligatoires

### 1. Entête

```markdown
# Phase X.Y — [Titre Descriptif]

> **Statut** : ⬜ **En attente** (ou ✅ **Complétée** après)
> **Durée libre**
```

### 2. Objectif

(2-3 lignes, aucune ambiguïté)

```markdown
## Objectif

Décrire précisément ce qui doit être fait, sans mentionner comment.
```

### 3. Périmètre

Délimiter IN/OUT strictement.

```markdown
## Périmètre

### ✅ Inclus dans cette phase

- Feature A spécifiquement définie
- Composant B avec ces responsabilités
- Table DB C avec ce schéma

### ❌ Exclus ou reporté intentionnellement. ( il ne doit pas s agir de simpflication de périmètre, mais de ce qui est explicitement hors scope ou necessite un brief dédié car trop complexe en une seule phase. Ce feature,  optimisation .... reporté doit tout de suite faire l objet d'un brief dédié, il ne doit pas être juste "exclue" de celle ci.)

- Feature D (reportée à phase X.Z)
- Optimisation E (reporter à maintenance)
- Feature F (dépendance manquante)

### 📋 Reporté à partir Z.W

- Feature G (dépend de découverte)
```

### 4. Dépendances

```markdown
## Dépendances

### Phases

- Phase X.(Y-1) ✅ complétée
- Phase X.(Y-2) ✅ complétée

### Ressources Externes

- Aucune (ou liste ce qu'on dépend)

### Test Infrastructure

- Vitest + Testing Library installés
- Rust test framework prêt
```

### 5. Fichiers à Créer/Modifier

**Format**: `path/file.ext` — Description concise (responsabilité, ce qu'il expose)

```markdown
## Fichiers

### À créer

- `src-tauri/src/module.rs` — Logique métier + tests unitaires intégrés
- `src-tauri/migrations/001_schema.sql` — Schéma DB (exécuté une seule fois)
- `src/types/dto.ts` — Types partagés frontend/backend (liste les interfaces)
- `src/components/Component.tsx` — Interface: props typées, 0 useState

### À modifier

- `src-tauri/Cargo.toml` — Ajouter dépendances: [`crate` v1.2.3]
- `src/stores/store.ts` — Connecter aux commandes Tauri (expose actions)
- `Docs/APP_DOCUMENTATION.md` — Section: "Architecture des Fichiers" (ajouter listing)
```

### 6. Interfaces Publiques

Les types/signatures exposées (backend→frontend ou module→module).

````markdown
## Interfaces Publiques

### Tauri Commands

```rust
#[tauri::command]
pub fn get_data(id: String) -> Result<DataDTO, String>;
```
````

### TypeScript DTOs

```typescript
export interface DataDTO {
  id: string;
  name: string;
}
```

### Store Actions

```typescript
// Dans catalogStore
setData: (data: Data[]) => void;
```

````

### 7. Contraintes Techniques

Non-negotiables pour cette phase.

```markdown
## Contraintes Techniques

### Rust Backend
- JAMAIS de `unwrap()` — utiliser `Result<T, E>` systématiquement
- Valider inputs (tailles, types, ranges)
- Utiliser `thiserror` pour les custom errors
- Tests unitaires pour chaque fonction publique

### TypeScript Frontend
- Strict mode (`"strict": true`)
- Pas de `any` — utiliser `unknown` + type guards
- Props interfaces (suffixe `Props`)
- Gestion d'erreur: try/catch ou Promise.catch()

### Database (si applicable)
- Migrations séquentielles (001, 002, ...)
- Foreign keys avec CASCADE
- Indexes sur colonnes fréquemment queryées
````

### 8. Architecture Cible

Schémas, diagrammes, flux clés.

````markdown
## Architecture Cible

### Schéma DB (si applicable)

```sql
CREATE TABLE images (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    ...
);
```
````

### Flux de Données

```
Frontend (request)
  ↓
Tauri Command (invoke)
  ↓
Rust Backend (compute)
  ↓
SQLite (persist)
  ↓
Response back to Frontend
```

````

### 9. Dépendances Externes

Packages/crates à installer, versions.

```markdown
## Dépendances Externes

### Rust (`Cargo.toml`)
- tokio = "1.x" — Async runtime
- serde = "1.0" — Serialization (déjà présent)

### TypeScript (`package.json`)
- @tanstack/react-virtual = "latest" — Virtualization (si applicable)

### System
- libssl-dev (Ubuntu) — Pour OpenSSL
````

### 10. Checkpoints de Validation

Points intermédiaires où vérifier le progrès.

```markdown
## Checkpoints

- [ ] **Checkpoint 1**: Code compile sans erreur (`cargo check` + `tsc`)
- [ ] **Checkpoint 2**: Tests unitaires passent (80% couverture backend)
- [ ] **Checkpoint 3**: Integration frontend↔backend fonctionne
- [ ] **Checkpoint 4**: Tests des phases précédentes passent (non-régression)
- [ ] **Checkpoint 5**: Documentation `APP_DOCUMENTATION.md` mise à jour
```

### 11. Pièges & Risques Connus

Blocages potentiels observés avant.

```markdown
## Pièges & Risques

### Pièges Courants

- Oublier les migrations DB à l'init (les anciennes connections ne voient pas la modif)
- Confusion entre types TS (camelCase) et DTOs Rust (snake_case)
- Async/await sans gestion d'erreur (Promise.catch())

### Risques Potentiels

- Performance: Si >10K images, tester avec données réelles
- DB locks: Risque de deadlock en transactions longues (timeout 120s)

### Solutions Préventives

- Toujours tester avec dataset de taille réelle
- Utiliser transactions pour multi-step DB operations
- Mock les commandes Tauri côté test frontend
```

### 12. Documentation Attendue

Entrées CHANGELOG + sections APP_DOCUMENTATION.

````markdown
## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description        | Statut       | Date       | Agent   |
| ----- | ---------- | ------------------ | ------------ | ---------- | ------- |
| X     | X.Y        | [Titre descriptif] | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase X.Y)**:

- Files créés: [list]
- Tests créés: [N test cases, what they validate]
- Migrations: [schema changes summary]
```
````

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — Ajouter nouvelles entrées
- Section "2. Stack Technique Actuelle" — Maj si nouvelles dépendances
- Section "5. Schéma de Base de Données" — Si modif du schéma

````

### 13. Critères de Complétion

Tous DOIVENT être cochés pour valider la phase.

```markdown
## Critères de Complétion

### Backend (si applicable)
- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] Tests Rust passent (coverage ≥80%)
- [ ] Aucun `unwrap()` en code production

### Frontend (si applicable)
- [ ] `tsc --noEmit` ✅
- [ ] `npm run lint` ✅
- [ ] Tests Vitest passent (coverage ≥70%)
- [ ] Pas de `any` TypeScript

### Integration
- [ ] Tous tests phases précédentes passent (non-régression)
- [ ] APP_DOCUMENTATION et CHANGELOG mis à jour
- [ ] Code compile sans warning aucun
````

---

## Instructions d'Utilisation

1. **Créer le brief AVANT la sous-phase** — Ne pas créer le code d'abord
2. **Copier ce template** — Adapter toutes les sections
3. **Lire l'AGENTS.md pertinent** — `src/AGENTS.md`, `src-tauri/AGENTS.md`, etc.
4. **Remplir précisément** — Pas de "TBD", pas de vagues
5. **L'agent lit le brief entièrement** — C'est son "spec"

---

## Comparaison BEFORE/AFTER

Le template sera maintenant **auto-suffisant** pour des agents IA:

- ✅ Savent exactement QUOI faire (périmètre + objectif)
- ✅ Savent QUELS fichiers créer/modifier (détaillé)
- ✅ Savent COMMENT valider (checkpoints + critères)
- ✅ Savent les risques/pièges à éviter
- ✅ Savent quoi documenter après (CHANGELOG + APP_DOCUMENTATION)
