# Maintenance Plan — Phase 4.2 Conformity Correction

> **Statut** : 🔄 **En cours**
> **Date création** : 2026-03-03
> **Branche** : `maintenance/phase-4.2-correction`
> **Dépendances** : Phase 4.2 (partiellement complétée 2026-02-26)

## Objectif

Corriger et valider la Phase 4.2 (Pipeline de Rendu Image) suite aux modifications du 3 mars qui ont partiellement fixé la persistance Event Sourcing mais cassé 9 tests et laissé Phase B WASM non-intégrée.

**Blockers identifiés** :

1. 🔴 **CRITIQUE** : 9/55 tests échouent (eventType mismatch)
2. 🟠 **MAJEUR** : Phase B WASM jamais appelée dans PreviewRenderer
3. 🟡 **MINEUR** : Documentation hors-sync

## Plan par Sous-Phases

### Sous-Phase A — Fixer Tests Cassés

**Objectif** : Restaurer 55/55 tests au vert

**Cause racine** :
- Commit ca2bba4 (3 mars) a changé `eventType` de `'ImageEdited'` → `'edit_applied'` dans le code
- Tests `renderingService.test.ts` utilisent toujours l'ancienne valeur
- Fonction `eventsToCSSFilters()` rejette tous les événements de test

**Fichiers à modifier** :

- `src/services/__tests__/renderingService.test.ts` — 14 occurrences de `eventType: 'ImageEdited'` à remplacer par `'edit_applied'`

**Critères de validation** :

- ✅ Tous les 14 tests avec `eventType: 'ImageEdited'` modifiés
- ✅ `npm test -- renderingService.test.ts` → 55/55 PASS
- ✅ Aucune autre fonction ne dépend de `'ImageEdited'`

**Tests requis** :

- `npm test -- renderingService` doit retourner **0 failures**
- Vérification que les autres tests (eventService, PreviewRenderer) passent encore

**Dépendances** : Aucune

---

### Sous-Phase B — Intégrer ou Reporter Phase B WASM

**Objectif** : Clarifier et finaliser l'état de Phase B

**Cause racine** :
- Brief PHASE-4.2.md décrit Phase B comme "à implémenter"
- Code `wasmRenderingService.ts` existe mais n'est jamais appelé
- `PreviewRenderer.tsx` accepte prop `useWasm` mais l'ignore

**Deux options** :

#### Option B.1 — Reporter Phase B à Future Phase

**Si choisi** :

1. Créer `PHASE-4.2-CSS-ONLY.md` (brief simplifié Phase A CSS seulement)
2. Mettre à jour `PHASE-4.2.md` pour clarifier que Phase B est reportée
3. Créer `PHASE-5.0-WASM-RENDERING.md` pour Phase B future
4. Modifier `PreviewRenderer.tsx` : supprimer prop `useWasm` (jamais utilisée)

**Critre de validation** :

- ✅ Briefs créés et structure clarifiée
- ✅ APP_DOCUMENTATION.md stipule "Phase A CSS complète, Phase B reportée"
- ✅ Tests passent (55/55)

#### Option B.2 — Implémenter Phase B Maintenant

**Si choisi** :

1. Intégrer `renderWithWasm()` dans `PreviewRenderer.tsx`
2. Ajouter toggle `useWasm` prop (fallback CSS si WASM indisponible)
3. Tests WASM integration doivent passer
4. Benchmarker latence <16ms par frame

**Critères de validation** :

- ✅ PreviewRenderer appelle `renderWithWasm()` si `useWasm=true`
- ✅ Canvas rendering fonctionne avec pixels traités
- ✅ Fallback CSS actif si WASM non-disponible
- ✅ Latence <16ms mesurée
- ✅ Tests renderingService + wasmRenderingService passent (55+X/55+X)

**Temps estimé** : 3-4 heures vs 30 min pour Option B.1

---

### Sous-Phase C — Mettre à Jour Documentation

**Objectif** : Synchroniser documentation avec implémentation réelle

**Fichiers à modifier** :

- `Docs/APP_DOCUMENTATION.md` section "Système de Rendu" (ligne 948-1100+)
  - Mettre à jour statut Phase A (+  Phase B si implémentée, ou "reportée" si B.1)
  - Ajouter section "Implémentation détaillée" décrivant le flux réel

- `Docs/CHANGELOG.md` 
  - Ajouter entrée pour cette maintenance

**Critères de validation** :

- ✅ APP_DOCUMENTATION reflète implémentation réelle
- ✅ Pas de contradiction entre doc et code
- ✅ État des phases (A/B) clarifiés

**Dépendances** : Sous-phases A et B doivent être terminées

---

## Checklist d'Exécution

### Avant de commencer

- [ ] Lire ce brief entièrement
- [ ] Checkout branche : `git checkout -b maintenance/phase-4.2-correction`
- [ ] Lire AGENTS.md, GOVERNANCE.md, TESTING_STRATEGY.md

### Sous-Phase A (Fixer Tests)

- [ ] Ouvrir `src/services/__tests__/renderingService.test.ts`
- [ ] Remplacer 14 occurrences de `'ImageEdited'` → `'edit_applied'`
- [ ] `npm test -- renderingService` → vérifier 55/55 PASS
- [ ] Committer avec message : `phase(4.2-A): Fix eventType mismatch in renderingService tests`

### Sous-Phase B (Phase B WASM)

**Décision requise** : Choisir B.1 (Reporter) ou B.2 (Implémenter)

**Si B.1 (Reporter)**:
- [ ] Créer `PHASE-4.2-CSS-ONLY.md`
- [ ] Créer `PHASE-5.0-WASM-RENDERING.md`  
- [ ] Supprimer prop `useWasm` de PreviewRenderer
- [ ] Committer : `phase(4.2-B.1): Reporter WASM Phase B à Phase 5.0`

**Si B.2 (Implémenter)**:
- [ ] Intégrer `renderWithWasm()` dans PreviewRenderer
- [ ] Implémenter toggle `useWasm` avec fallback
- [ ] `npm test -- rendering` → 55+X/55+X PASS
- [ ] Mesurer latence <16ms
- [ ] Committer : `phase(4.2-B.2): Implement WASM rendering integration`

### Sous-Phase C (Documentation)

- [ ] Mettre à jour APP_DOCUMENTATION.md
- [ ] Mettre à jour CHANGELOG.md
- [ ] `npm test` → 0 failures global
- [ ] Committer : `phase(4.2-C): Update documentation for Phase 4.2 finalization`

### Après correction

- [ ] Tous les tests passent (567/567 codebase)
- [ ] Lancer Master-Validator pour re-validator Phase 4.2
- [ ] Mettre à jour Master-Validator-brief.md avec nouveaux résultats
- [ ] Créer PR vers `develop`

---

## Estimation Temps

| Sous-Phase | Tâche                      | Durée   |
| ---------- | -------------------------- | ------- |
| **A**      | Fixer 14 tests             | 15 min  |
| **B.1**    | Reporter WASM (si choisi)  | 30 min  |
| **B.2**    | Implémenter WASM (alt)     | 3-4h    |
| **C**      | Documenter                 | 20 min  |
| **Total**  | A + B.1 + C (minimal)      | **1h 5m** |
| **Total**  | A + B.2 + C (si WASM)      | **4h 5m** |

---

## Points Importants

### Règles AGENTS.md à Respecter

- ✅ Section 2.3 : "Ne jamais casser les tests" → Sous-Phase A corrige ça
- ✅ Section 2.2 : "Analyse cause racine" → Mismatch `eventType` identifié
- ✅ Tester en parallèle du code
- ✅ Commits avec cause racine en message

### Dépendances Validées

- Phase 4.1 (Event Sourcing) : ✅ Complétée
- Modifications 3 mars (persistance) : ✅ Intégrées
- Tests autres phases : ✅ Doivent rester vertes

---

## Prochaines Phases

Si Option B.1 (Reporter WASM) choisie :
- **Phase 5.0** — WASM Rendering Engine (5.0-A, 5.0-B, 5.0-C)

Si Option B.2 (Implémenter WASM) choisie :
- **Phase 4.3** — Historique & Snapshots UI (dépend de 4.2 complète)

---

## Questions à Clarifier

1. **Phase B.1 ou B.2** ? (Reporter ou implémenter WASM maintenant ?)
2. **Timeline** ? (Corriger aujourd'hui ou reporter ?)
3. **Qui exécute** ? (Cet agent ou agent spécialisé Phase-Implementation ?)

---

**Brief généré par** : Master-Validator Agent
**Date** : 2026-03-03
**Source** : Analyse PHASE-4.2-VALIDATION-REPORT.md
