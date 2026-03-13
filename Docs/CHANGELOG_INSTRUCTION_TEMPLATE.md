v b.                                              # Template d’Instruction pour CHANGELOG

## 1. Tableau synthétique (en-tête)

| Phase | Sous-Phase | Description           | Statut       | Date       | Auteur  |
| ----- | ---------- | --------------------- | ------------ | ---------- | ------- |
| X     | Y          | Brève description     | ✅/🟡/⬜/⚠️/❌ | AAAA-MM-JJ | Nom     |

---

## 2. Entrée détaillée par sous-phase/correction

### Phase X.Y — [Titre descriptif]
- Date : AAAA-MM-JJ
- Auteur : [Nom]
- Symptôme : [Description du problème]
- Cause racine : [Analyse technique]
- Correction : [Solution structurelle]
- Fichiers créés/modifiés : [Liste]
- Tests créés/modifiés : [Liste]
- Impact : [Non-régression, performance, sécurité, etc.]
- Notes : [Restrictions, breaking changes, migrations]

---

## 3. Section Blocages (si applicable)

### Blocage — [Titre]
- Description précise du problème
- Cause racine
- Options envisagées (pros/cons)


---

## 4. Section Annexe (optionnelle)
- Liens vers briefs, documentation, tickets, décisions de gouvernance

---

## Conseils d’utilisation
- Une entrée = une action ou sous-phase
- Toujours documenter la cause racine
- Lister explicitement les tests
- Privilégier la clarté et la traçabilité

---

## Exemple

| Phase | Sous-Phase | Description           | Statut       | Date       | Auteur  |
| ----- | ---------- | --------------------- | ------------ | ---------- | ------- |
| 4     | 4.2        | Correction export RAW | ✅ Complétée | 2026-03-13 | Copilot |

### Phase 4.2 — Correction export RAW
- Date : 2026-03-13
- Auteur : Copilot
- Symptôme : export échoue sur .raf
- Cause racine : absence de validation extension
- Correction : ajout RawFormatOutOfPilotScope
- Fichiers : src-tauri/src/services/export_pipeline.rs, Docs/briefs/PHASE-4.2B-COMPLETE.md
- Tests : test_export_raw_pilot_scope
- Impact : non-régression, pilot contract respecté
- Notes : breaking change sur extension .raf

---
