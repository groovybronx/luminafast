# LuminaFast — Instructions Obligatoires pour Agents IA

> **CE FICHIER DOIT ÊTRE LU ENTIÈREMENT AVANT TOUTE ACTION.**
> C'est le **hub central** qui renvoit vers les directives spécialisées.
> Toute violation des règles absolues (section 1) invalide le travail produit.

---

## 1. RÈGLES ABSOLUES (NON NÉGOCIABLES)

### 1.1 — Intégrité du Plan

- **Le plan de développement (`Docs/briefs/` + `Docs/archives/luminafast_developement_plan.md` ) ne peut PAS être modifié** sans approbation explicite du propriétaire.
- Avant modification du plan, l'agent DOIT :
  1. Documenter la raison (2-3 phrases)
  2. Proposer l'alternative
  3. **ATTENDRE la validation** avant procéder

### 1.2 — Interdiction de Simplification Abusive

- **Ne JAMAIS** résoudre un problème en supprimant une fonctionnalité, test ou validation existant.
- **Ne JAMAIS** employer de workarounds — viser la correction structurelle (cause racine).
- Si simplification requise : justifier + obtenir approbation propriétaire.

### 1.3 — Intégrité des Tests

- **Ne JAMAIS** modifier un test pour le rendre "vert" sans justifier pourquoi l'hypothèse initiale était fausse.
- **Chaque sous-phase DOIT produire des tests.** Aucun code sans test.
- Tous les tests des phases précédentes doivent continuer à passer (= non-régression).

### 1.4 — Analyse Cause Racine Obligatoire

Avant toute modification corrective, fournir 2-3 phrases identifiant:
- Le symptôme observé
- La cause racine technique
- La correction structurelle

Documenter dans le commit et le CHANGELOG.

---

## 2. PROTOCOLE DE TRAVAIL PAR SOUS-PHASE

### Avant de Commencer

1. **Lire le brief** : `Docs/briefs/PHASE-X.Y.md` (créer s'absent, selon `BRIEF_TEMPLATE.md`)
2. **Lire ce fichier** entièrement
3. **Consulter l'AGENTS spécialisé** : (voir section 4 ci-dessous)
4. **Vérifier les dépendances** dans CHANGELOG — phases précédentes ✅
5. **Créer branche** : `phase/X.Y-description-kebab-case`

### Pendant le Travail

- Respecter le périmètre du brief (pas de scope creep)
- Écrire tests EN PARALLÈLE du code (jamais après)
- Suivre les conventions du domaine (voir section 4)
- Gérer les erreurs explicitement (pas de `any`, `unwrap()`, etc.)

### Après Avoir Terminé

1. **Tous les tests passent** (unitaires + intégration + non-régression)
2. **Mettre à jour** : `Docs/CHANGELOG.md` (nouvelle entrée)
3. **Mettre à jour** : `Docs/APP_DOCUMENTATION.md` (si architecture change)
4. **Créer le brief suivant** : `Docs/briefs/PHASE-X.(Y+1).md`

---

## 3. NAVIGATION ENTRE DOCUMENTS

### Directif par Domaine

| Domaine | Fichier | Contenu |
|---------|---------|---------|
| **Frontend (TypeScript/React)** | `src/AGENTS.md` | Conventions TS, Zustand, tests Vitest, intégration backend |
| **Backend (Rust/Tauri)** | `src-tauri/AGENTS.md` | Conventions Rust, error handling, SQLite, session tracking, tests |
| **CI/CD** | `.github/AGENTS.md` | Workflow GitHub Actions, path filtering, timeouts, caching |
| **Documentation** | `Docs/AGENTS.md` | Briefs, CHANGELOG, APP_DOCUMENTATION, cohérence docs↔code |

### Architecture & Stratégie

| Document | Quand Consulter |
|----------|-----------------|
| `Docs/archives/Lightroomtechnique.md` | Conception DB, collections, cache |
| `Docs/archives/recommendations.md` | Choix technologiques (DuckDB, BLAKE3, Event Sourcing) |
| `Docs/TESTING_STRATEGY.md` | Structure tests, couverture minimale |
| `Docs/GOVERNANCE.md` | Escalade, décisions, approbations |
| `Docs/APP_DOCUMENTATION.md` | État actuel de l'application |
| `Docs/briefs/BRIEF_TEMPLATE.md` | Structure des briefs de phase |

---

## 4. CONVENTIONS DE CODE

⚠️ **Les conventions détaillées sont DANS les AGENTS spécialisés, PAS ici.**

| Domaine | Voir |
|---------|-----|
| TypeScript/React/Zustand | `src/AGENTS.md` → Sections 1-6 |
| Rust/Tauri/SQLite | `src-tauri/AGENTS.md` → Sections 1-6 |
| GitHub Actions/CI | `.github/AGENTS.md` → Sections 1-7 |
| Briefs/Documentation | `Docs/AGENTS.md` → Sections 1-5 |

**Résumé rapide**:
- ✅ Strict TypeScript (pas de `any`)
- ✅ Error handling obligatoire Rust (`Result<T, E>`)
- ✅ Tests en parallèle du code
- ✅ Commits : `phase(X.Y): description` + cause racine

---

## 5. PROTOCOLE D'ESCALADE

If blocage non-résolvable dans la sous-phase:

1. **NE PAS contourner** — ne rien faire sans validation
2. **Documenter le blocage** dans `CHANGELOG.md` (section "Blocages") :
   - Description précise du problème
   - Cause racine identifiée
   - Options envisagées + pros/cons
   - Impact sur planning
3. **Signaler au propriétaire** et attendre instructions

---

## 6. CHECKLIST PRÉ-COMMIT

⚠️ **La checklist détaillée est dans `.github/AGENTS.md` (Section 8).**

**Rapide**: Compiler ✅ + Tests ✅ + CHANGELOG ✅ + Docs ✅ + Scope respecté ✅

---

## 7. RAPPEL FINAL

> **L'objectif est de produire une application de qualité commerciale.**
> La rapidité ne justifie JAMAIS de sacrifier qualité, robustesse ou cohérence architecturale.
> En cas de doute : **demander, ne pas deviner.**
>
> **Règle d'or** : Si tu dois choisir entre vitesse et qualité → choisis qualité. Les agents IA sont ici pour ça.

---

## 8. STRUCTURE HIÉRARCHIQUE DES AGENTS

```
AGENTS.md (racine) ← Vous êtes ici
├─ Règles absolues (immuables)
├─ Protocole général de travail
├─ Navigation vers documents spécialisés
└─ Protocole d'escalade

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
