# LuminaFast Agents — Documentation & Briefs

> **Directives spécialisées pour la documentation du projet.**
> Lisez d'abord `AGENTS.md` racine pour les règles absolues globales.

---

## 1. Documentation Vivante (APP_DOCUMENTATION.md)

### 1.1 — But

`Docs/APP_DOCUMENTATION.md` est la **source de vérité** sur l'état actuel de l'application. Elle doit rester **synchrone avec le code en tout temps**.

### 1.2 — Quand Mettre à Jour

Après **CHAQUE sous-phase** qui modifie:

- L'architecture ou l'organisation des fichiers
- Les APIs/commands Tauri
- Le schéma de base de données
- Les types partagés (interfaces publiques)
- Les dépendances majeures
- Le statut des phases/sous-phases

**N'PAS mettre à jour** pour:
- Refactoring interne (logs, constantes)
- Corrections de bugs mineures
- Changements de noms de variables locales

### 1.3 — Structure du Document

```markdown
# LuminaFast — Documentation de l'Application

## 1. Vue d'Ensemble
- État actuel (phases complétées)
- Objectif du projet
- Date de dernière mise à jour

## 2. Stack Technique Actuelle
- Tableau avec technos, versions, statut

## 3. Architecture des Fichiers
- Structure complète `src/`, `src-tauri/`, et modifié depuis dernière maj

## 4. Stack de Tests
- Couverture actuelle
- Stratégies utilisées

## 5. Schéma de Base de Données
- ERD ou liste des tables

## 6. APIs Tauri Commands
- Chaque command avec arguments + retours

## 7. Modules Clés
- Description de chaque module majeur

## 8. Décisions de Projet
- Décisions architecturales validées

## 9. État des Phases
- Tableau récapitulatif du CHANGELOG
```

### 1.4 — Exemple de Mise à Jour

```markdown
# État actuel : Phases 0 à 3.5 complétées

(Ancienne version)

# État actuel : Phases 0 à 4.1 complétées + Maintenance SQL

**Dernière mise à jour** : 2026-02-25 (Maintenance : Phase 4.1 Event Sourcing)

- 500 tests ✅ (345 TS + 159 Rust)
- Event sourcing engine implémenté avec replay
- ...
```

---

## 2. CHANGELOG.md

### 2.1 — But

Tracker l'avancement des phases/sous-phases en temps réel. Source de vérité pour "qui a fait quoi quand".

### 2.2 — Format

```markdown
| Phase | Sous-Phase | Description | Statut | Date | Agent |
|-------|-----------|-------------|--------|------|-------|
| 4 | 4.1 | Event Sourcing Engine | ✅ Complétée | 2026-02-25 | Agent-X |
```

### 2.3 — Statuts Possibles

| Statut | Couleur | Signification |
|--------|--------|--------------|
| ✅ Complétée | Vert | Livrée, testée, intégrée |
| 🟡 En cours | Orange | En développement actif |
| ⬜ En attente | Gris | N'a pas encore commencé |
| ⚠️ Bloquée | Rouge | Attend une décision/ressource |
| ❌ Annulée | Noir | Rejetée/abandonnée |

### 2.4 — Entrée d'une Sous-Phase

Quand une sous-phase est **complétée**, ajouter une entrée avec:

```markdown
| Phase | Sous-Phase | Description | Statut | Date | Agent |
|-------|-----------|-------------|--------|------|-------|
| 4 | 4.1 | Event Sourcing Engine | ✅ Complétée | 2026-02-25 | Copilot |

**Détails (Phase 4.1)**:
- Fichiers créés: `src-tauri/src/event_sourcing.rs`, `src-tauri/src/replay.rs`
- Fichiers modifiés: `src-tauri/src/commands/catalog.rs`
- Tests créés: `src-tauri/src/event_sourcing.rs::tests` (12 cas)
- Migrations: `003_event_sourcing.sql` (new tables: events, snapshots)
- Architecture: Event types, aggregate roots, CQRS pattern
- Restrictions: Events immutables, snapshots tous les 100 événements
```

---

## 3. Briefs de Phases (PHASE-X.Y.md)

### 3.1 — But

Chaque sous-phase a un **brief dédié** qui sert de "prompt" pour l'agent IA. Le brief doit contenir **tout le contexte nécessaire** pour que l'IA ne soit pas bloquée.

### 3.2 — Sections Obligatoires

```markdown
# PHASE-X.Y — [Titre Descriptif]

## Objectif
(2-3 lignes max)

## Dépendances
- PHASE-X.X doit être ✅ complétée
- PHASE-X.(Y-1) doit être ✅ complétée

## Fichiers à Créer/Modifier
- src/types/event.ts (nouveau)
- src-tauri/src/event_sourcing.rs (nouveau)
- src-tauri/migrations/003_events.sql (nouveau)
- src/stores/editStore.ts (modifier)

## Interfaces Publiques
(Types/signatures qu'on expose)

```typescript
// Rust command (tauri)
#[tauri::command]
pub fn emit_event(event: EventDTO) -> Result<String>;

// TypeScript DTO (doit correspondre à Rust)
export interface EventDTO {
  id: string;
  type: 'image_edit' | 'collection_created';
  timestamp: string; // ISO
  data: unknown;
}
```

## Critères de Validation
- [ ] Event sourcing engine émet tous les 5 types d'event
- [ ] Replay fonctionne et produit l'état identique
- [ ] 12+ tests unitaires (events, snapshots, replay)
- [ ] 0 warning Clippy + Rust fmt passing
- [ ] APP_DOCUMENTATION mis à jour

## Contexte Architectural

[Extrait pertinent des docs]

## Notes d'Implémentation
- Utiliser les enums Rust pour les types d'events
- Snapshots sérialisés en JSON dans la DB
- Replay atomique (tout ou rien)
```

### 3.3 — Template Officiel

Voir `Docs/briefs/BRIEF_TEMPLATE.md` pour le template complet.

### 3.4 — Quand Créer un Brief

Avant **CHAQUE** nouvelle sous-phase:

1. L'agent lit le brief existant
2. L'agent implémente selon le brief
3. Après complètion, l'agent **crée le brief de la sous-phase suivante**

---

## 4. Conventions Markdown

### 4.1 — Titres

```markdown
# Titre principal (H1) — Utilisé une seule fois par document
## Section principale (H2) — Grandes sections
### Sous-section (H3) — Détails spécifiques
#### Détail fin (H4) — Listes imbriquées
```

### 4.2 — Code & Blocs

```markdown
# Bon pour les extraits courts
`function foo() { }`

# Bon pour les extraits longs
```typescript
// Code complet avec contexte
function foo() {
  return bar();
}
```

# Tableau
| En-tête 1 | En-tête 2 |
|-----------|-----------|
| Ligne 1   | Valeur 1  |
```

### 4.3 — Listes

```markdown
- Item bullet
  - Sub-item (indent 2 spaces)
  
1. Item numéroté
   1. Sub-item numéroté
```

### 4.4 — Liens

```markdown
# Interne
[Lien texte](relative/path/file.md)
[Lien vers section](#sous-section)

# Externe
[GitHub](https://github.com/...)
```

---

## 5. Cohérence Documentation ↔ Code

### 5.1 — Vérifications Obligatoires

Avant de marquer une sous-phase complétée:

- [ ] Toutes les structs/interfaces documentées existent dans le code
- [ ] Tous les commands Tauri documentés sont implémentés
- [ ] Le schéma DB documenté correspond aux migrations
- [ ] Les dépendances listées correspondent à `Cargo.toml` + `package.json`
- [ ] Les fichiers listés existent

### 5.2 — Outil de Vérification

Agent spécialisé `LuminaFast Documentation Sync`:

```bash
# Lance automatiquement après chaque sous-phase
# vérifie cohérence entre Docs + code
# met à jour CHANGELOG.md automatiquement
```

---

## 6. Gouvernance (GOVERNANCE.md)

### 6.1 — Quand Consulter

Avant toute décision concernant:

- Modification du plan de développement
- Changement de phase/sous-phase
- Dérogation aux règles (tests, architecture)

### 6.2 — Demandes de Modification du Plan

Si modification nécessaire:

```markdown
## Demande de Modification du Plan

**Date**: 2026-02-25
**Agent**: Copilot
**Sous-phase Concernée**: 4.2 - Pipeline de Rendu

**Description du Besoin**:
Event sourcing nécessite une table events_snapshots pour performance.
Cela impacte le schéma DB de Phase 4.1.

**Options Considérées**:
1. Ajouter snapshots dans 4.1 (requis pour 4.2)
2. Reporter snapshots à 4.2 (risque de performance)

**Recommandation**: Option 1 (modifier 4.1)

**Décision du Propriétaire**: [En attente]
```

---

## 7. Testing Strategy (TESTING_STRATEGY.md)

### 7.1 — Quand Consulter

Avant d'écrire **tout test** (unitaire, intégration, E2E).

### 7.2 — Structure de Tests par Couche

| Couche | Type Test | Framework | Location |
|--------|-----------|-----------|----------|
| Frontend | Unitaire | Vitest + Testing Library | `src/__tests__/` |
| Frontend | Composant | Vitest + Testing Library | `src/components/**/__tests__/` |
| Backend | Unitaire | `#[cfg(test)]` | `src-tauri/src/` |
| Backend | Intégration | Rust test runner | `src-tauri/tests/` |
| E2E | - | Playwright (futur) | `e2e/` |

---

## 8. Lien avec AGENTS Locaux

**Frontend** → `src/AGENTS.md`

**Backend** → `src-tauri/AGENTS.md`

**CI/CD** → `.github/AGENTS.md`

---

## 9. Checklist de Documentation Post-Sous-Phase

Après avoir complété une sous-phase:

- [ ] Brief de la sous-phase lue entièrement
- [ ] Tests écrits et passants
- [ ] Code compilé sans warning
- [ ] **APP_DOCUMENTATION.md mis à jour** (si architecture change)
- [ ] **CHANGELOG.md mis à jour** avec nouvelle entry
- [ ] **Brief de la sous-phase SUIVANTE créé** (si applicable)
- [ ] Tous les fichiers créés/modifiés listés dans CHANGELOG
- [ ] Documentation cohérente avec code (types, tables, commands)
- [ ] Commit messages descriptifs ("phase(X.Y): description")

---

## 10. Lien avec Règles Absolues

Pour les **règles non-négociables** → `AGENTS.md` racine

Pour les **décisions approuvées** → `Docs/GOVERNANCE.md`

Pour les **directives de code** → `src/AGENTS.md` et `src-tauri/AGENTS.md`
