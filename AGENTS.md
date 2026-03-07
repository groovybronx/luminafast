# LuminaFast — Instructions Obligatoires pour Agents IA

⚠️ **Hub centralisé des directives IA — Lire avant toute action.**
**Violation des 4 règles absolues = travail invalide.**

---

## 1️⃣ Protocole par Sous-Phase

| Étape       | Actions                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Avant**   | 1. Lire `Docs/CHANGELOG.md` (état projet) 2. Vérifier brief `Docs/briefs/PHASE-X.Y.md` 3. Lire ce fichier + AGENTS spécialisés nécéssaires pour la phase 4. Vérifier dépendances phases précédentes 5. Créer branche `phase/X.Y-description` |
| **Pendant** | • Respecter périmètre du brief • Écrire tests EN PARALLÈLE du code • Suivre conventions domaine • Gérer erreurs explicitement                                                                                      |
| **Après**   | 1. Tests 100% passants 2. Mettre à jour `Docs/CHANGELOG.md` 3. Mettre à jour `Docs/APP_DOCUMENTATION.md` 4. Créer brief suivant `PHASE-X.(Y+1).md`                                                                 |

---

## 2️⃣ Règles Absolues (Immuables)

- **2.1 Intégrité du plan** : Plan `Docs/briefs/` + `luminafast_developement_plan.md` immuable sans approbation explicite propriétaire
- **2.2 Pas de simplification abusive** : Ne JAMAIS supprimer fonction/test/validation existante ou employer workaround
- **2.3 Intégrité tests** : Tous les tests passent + zéro modification de test sans justification racine
- **2.4 Analyse cause racine obligatoire** : Avant correction, identifier symptôme + cause technique + correction structurelle

---

## 3️⃣ Navigation Rapide

### 📂 Documents par Domaine

| Domaine                  | Fichier               | Contenu                                        |
| ------------------------ | --------------------- | ---------------------------------------------- |
| **Frontend (TS/React)**  | `src/AGENTS.md`       | Conventions TS, Zustand, Vitest, Tauri         |
| **Backend (Rust/Tauri)** | `src-tauri/AGENTS.md` | Rust, error handling, SQLite, session tracking |
| **CI/CD**                | `.github/AGENTS.md`   | GitHub Actions, workflows, caching             |
| **Documentation**        | `Docs/AGENTS.md`      | Briefs, CHANGELOG, cohérence docs↔code         |

### 🎯 Architecture & Stratégie

- **DB & Cache** : `Docs/archives/Lightroomtechnique.md`
- **Choix Tech** : `Docs/archives/recommendations.md`
- **Tests** : `Docs/TESTING_STRATEGY.md`
- **Gouvernance** : `Docs/GOVERNANCE.md`
- **App Status** : `Docs/APP_DOCUMENTATION.md`
- **Brief Template** : `Docs/briefs/BRIEF_TEMPLATE.md`

---

## 4️⃣ Pré-Commit Rapide

✅ Compile (TS + Rust) | ✅ Tests 100% | ✅ Pas de `any`/`unwrap()` | ✅ Error handling | ✅ CHANGELOG + Docs

---

## 5️⃣ Protocole d'Escalade

Si blocage non-résolvable :

1. NE PAS contourner — ne rien faire sans validation
2. Documenter dans `CHANGELOG.md` : description précise + cause racine + options + impact planning
3. Signaler propriétaire et attendre instructions

---

## 6️⃣ Structure Hiérarchique des Agents

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

**→ Chaque sous-phase = lire ce fichier + le ou les AGENTS spécialisé(s) impliqués.**

---

## 🎯 Règle d'Or

**L'objectif : produire une application de qualité commerciale.**
La rapidité ne justifie JAMAIS de sacrifier qualité, robustesse ou cohérence architecturale.
⚠️ En cas de doute : **demander, ne pas deviner.**
