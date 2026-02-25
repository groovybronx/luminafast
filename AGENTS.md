
# LuminaFast — Instructions Obligatoires pour Agents IA

**CE FICHIER DOIT ÊTRE LU ENTIÈREMENT AVANT TOUTE ACTION.**
C'est le **hub central** qui renvoie vers les directives spécialisées.
Toute violation des règles absolues (section 1) invalide le travail produit.

---

## 1. Protocole de travail par sous-phase

### Avant de commencer

1. **Lire le fichier** : `Docs/CHANGELOG.md` pour connaître l’état actuel du projet
2. **Vérifier l’existence du brief de la prochaine phase** : `Docs/briefs/PHASE-X.Y.md` (créer si absent, selon `BRIEF_TEMPLATE.md` en se référant au plan de développement `Docs/archives/luminafast_developement_plan.md`)
3. **Lire ce fichier** entièrement
4. **Consulter l’AGENTS spécialisé** (voir section 4 ci-dessous)
5. **Vérifier les dépendances** dans CHANGELOG — phases précédentes ✅
6. **Créer branche** : `phase/X.Y-description-kebab-case`

### Pendant le travail

- Respecter le périmètre du brief (pas de scope creep)
- Écrire les tests EN PARALLÈLE du code (jamais après)
- Suivre les conventions du domaine (voir section 4)
- Gérer les erreurs explicitement (pas de `any`, `unwrap()`, etc.)

### Après avoir terminé

1. **Tous les tests passent** (unitaires + intégration + non-régression)
2. **Mettre à jour** : `Docs/CHANGELOG.md` (nouvelle entrée)
3. **Mettre à jour** : `Docs/APP_DOCUMENTATION.md` en respectant la structure existante
4. **Créer le brief suivant** : `Docs/briefs/PHASE-X.(Y+1).md`

---

## 2. Règles absolues (non négociables)

### 2.1 — Intégrité du plan

- **Le plan de développement (`Docs/briefs/` + `Docs/archives/luminafast_developement_plan.md`) ne peut PAS être modifié** sans approbation explicite du propriétaire.
- Avant modification du plan, l’agent DOIT :
  1. Documenter la raison (2-3 phrases)
  2. Proposer l’alternative
  3. **ATTENDRE la validation** avant de procéder

### 2.2 — Interdiction de simplification abusive

- **Ne JAMAIS** résoudre un problème en supprimant une fonctionnalité, un test ou une validation existante.
- **Ne JAMAIS** employer de workarounds — viser la correction structurelle (cause racine).
- Si simplification requise : justifier + obtenir approbation du propriétaire.

### 2.3 — Intégrité des tests

- **Ne JAMAIS** modifier un test pour le rendre « vert » sans justifier pourquoi l’hypothèse initiale était fausse.
- **Chaque sous-phase DOIT produire des tests.** Aucun code sans test.
- Tous les tests des phases précédentes doivent continuer à passer (= non-régression).

### 2.4 — Analyse cause racine obligatoire

Avant toute modification corrective, fournir 2-3 phrases identifiant :
- Le symptôme observé
- La cause racine technique
- La correction structurelle

Documenter dans le commit et le CHANGELOG.

---

## 3. Navigation entre documents

### Directif par domaine

| Domaine                        | Fichier                | Contenu                                                      |
|--------------------------------|------------------------|--------------------------------------------------------------|
| **Frontend (TypeScript/React)**| `src/AGENTS.md`        | Conventions TS, Zustand, tests Vitest, intégration backend    |
| **Backend (Rust/Tauri)**       | `src-tauri/AGENTS.md`  | Conventions Rust, error handling, SQLite, session tracking, tests |
| **CI/CD**                      | `.github/AGENTS.md`    | Workflow GitHub Actions, path filtering, timeouts, caching    |
| **Documentation**              | `Docs/AGENTS.md`       | Briefs, CHANGELOG, APP_DOCUMENTATION, cohérence docs↔code    |

### Architecture & stratégie

| Document                                 | Quand consulter                                 |
|-------------------------------------------|-------------------------------------------------|
| `Docs/archives/Lightroomtechnique.md`     | Conception DB, collections, cache               |
| `Docs/archives/recommendations.md`        | Choix technologiques (DuckDB, BLAKE3, Event Sourcing) |
| `Docs/TESTING_STRATEGY.md`                | Structure tests, couverture minimale            |
| `Docs/GOVERNANCE.md`                      | Escalade, décisions, approbations               |
| `Docs/APP_DOCUMENTATION.md`               | État actuel de l’application                    |
| `Docs/briefs/BRIEF_TEMPLATE.md`           | Structure des briefs de phase                   |

---

## 4. Conventions de code

⚠️ **Les conventions détaillées sont DANS les AGENTS spécialisés, PAS ici.**

| Domaine                   | Voir                                      |
|---------------------------|--------------------------------------------|
| TypeScript/React/Zustand  | `src/AGENTS.md` → Sections 1-6             |
| Rust/Tauri/SQLite         | `src-tauri/AGENTS.md` → Sections 1-6       |
| GitHub Actions/CI         | `.github/AGENTS.md` → Sections 1-7         |
| Briefs/Documentation      | `Docs/AGENTS.md` → Sections 1-5            |

**Résumé rapide** :
- ✅ Strict TypeScript (pas de `any`)
- ✅ Error handling obligatoire Rust (`Result<T, E>`)
- ✅ Tests en parallèle du code
- ✅ Commits : `phase(X.Y): description` + cause racine

---

## 5. Protocole d’escalade

Si blocage non-résolvable dans la sous-phase :

1. **NE PAS contourner** — ne rien faire sans validation
2. **Documenter le blocage** dans `CHANGELOG.md` (section « Blocages ») :
   - Description précise du problème
   - Cause racine identifiée
   - Options envisagées + pros/cons
   - Impact sur planning
3. **Signaler au propriétaire** et attendre instructions

---

## 6. Checklist pré-commit

⚠️ **La checklist détaillée est dans `.github/AGENTS.md` (Section 8).**

**Rapide** : Compiler ✅ + Tests ✅ + CHANGELOG ✅ + Docs ✅ + Scope respecté ✅

---

## 7. Rappel final

**L’objectif est de produire une application de qualité commerciale.**
La rapidité ne justifie JAMAIS de sacrifier qualité, robustesse ou cohérence architecturale.
En cas de doute : **demander, ne pas deviner.**

**Règle d’or** : Si tu dois choisir entre vitesse et qualité → choisis qualité. Les agents IA sont ici pour ça.

---

## 8. Structure hiérarchique des agents

```
AGENTS.md (racine) ← Vous êtes ici
├─ Règles absolues (immuables)
├─ Protocole général de travail
├─ Navigation vers documents spécialisés
└─ Protocole d’escalade

    ├─ src/AGENTS.md (Frontend)
    │   ├─ TypeScript strict mode
    │   ├─ React components + Zustand
    │   ├─ Services Tauri
    │   └─ Tests Vitest
    │
    ├─ src-tauri/AGENTS.md (Backend)
    │   ├─ Rust error handling
    │   ├─ Tauri commands
    │   ├─ SQLite + migrations
    │   ├─ Session tracking
    │   └─ Tests unitaires/intégration
    │
    ├─ .github/AGENTS.md (CI/CD)
    │   ├─ Workflow philosophy
    │   ├─ Path filtering
    │   ├─ Jobs + timeouts
    │   └─ Caching + artifacts
    │
    └─ Docs/AGENTS.md (Documentation)
        ├─ Briefs structure
        ├─ CHANGELOG format
        ├─ Documentation cohérence
        └─ Gouvernance
```

**→ Chaque sous-phase = lire ce fichier + AGENTS spécialisé(s) pertinent(s)**
