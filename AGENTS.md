# LuminaFast — Instructions pour Agents IA

> **Hub centralisé minimal.**
> Source de vérité = fichiers spécialisés AGENTS.md par domaine.

---

## 1. Règles Absolues (Non-Négociables)

- **Plan integrity** : `Docs/briefs/` + `luminafast_developement_plan.md` immuable sans approbation propriétaire
- **No shortcuts** : Jamais supprimer fonction/test/validation existante ou utiliser workaround
- **Test integrity** : 100% tests passants. Modification de test = justification racine obligatoire
- **Root cause analysis** : Avant correction = symptôme + cause technique + solution structurelle

---

## 2. Protocole par Sous-Phase

| Étape | Actions |
|-------|---------|
| **Avant** | 1. Lire `Docs/CHANGELOG.md` 2. Vérifier `Docs/briefs/PHASE-X.Y.md` 3. Lire AGENTS.md pertinents 4. Créer branche `phase/X.Y-description` |
| **Pendant** | Respecter brief • Tests en parallèle • Suivre conventions • Erreurs explicites |
| **Après** | 1. Tests 100% ✅ 2. `Docs/CHANGELOG.md` à jour 3. `Docs/APP_DOCUMENTATION.md` à jour 4. Brief suivant créé |

---

## 3. Domaines & AGENTS Spécialisés

| Domaine | Fichier | Contenu |
|---------|---------|---------|
| **Frontend** | [src/AGENTS.md](src/AGENTS.md) | TS strict, React, Zustand, Vitest, Tauri services |
| **Backend** | [src-tauri/AGENTS.md](src-tauri/AGENTS.md) | Rust, error handling, SQLite, session tracking |
| **CI/CD** | [.github/AGENTS.md](.github/AGENTS.md) | Workflows, composite actions, caching, timeouts |
| **Docs** | [Docs/AGENTS.md](Docs/AGENTS.md) | Briefs, CHANGELOG, cohérence |

---

## 4. Key Documents

| Document | Purpose |
|----------|---------|
| [Docs/CHANGELOG.md](Docs/CHANGELOG.md) | État projet actuel |
| [Docs/APP_DOCUMENTATION.md](Docs/APP_DOCUMENTATION.md) | Architecture + features |
| [Docs/TESTING_STRATEGY.md](Docs/TESTING_STRATEGY.md) | Test patterns |
| [Docs/GOVERNANCE.md](Docs/GOVERNANCE.md) | Règles projet |
| [Docs/briefs/BRIEF_TEMPLATE.md](Docs/briefs/BRIEF_TEMPLATE.md) | Phase brief template |

---

## 5. Pre-Commit Checklist

✅ Compile (TS + Rust) | ✅ Tests 100% | ✅ No `any`/`unwrap()` | ✅ Error handling | ✅ Docs updated

---

## 6. Escalation Protocol

Non-resolvable blocker:

1. **Never workaround** — validate first
2. **Document in CHANGELOG.md** : precise description + root cause + options + planning impact
3. **Signal owner** and wait for instructions

---

## 7. Gold Rule

**Target: Commercial-grade application.**
Speed never justifies sacrificing quality, robustness, or architectural coherence.
⚠️ **When in doubt: ask, don't guess.**
