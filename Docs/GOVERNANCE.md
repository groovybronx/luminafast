# LuminaFast — Règles de Gouvernance du Projet

> **Ce document constitue le contrat entre le propriétaire du projet et tout agent IA ou contributeur.**
> Ces règles sont non négociables et s'appliquent à tout moment.

---

## 1. Autorité & Chaîne de Décision

Le **propriétaire du projet** est la seule autorité décisionnelle. Aucun agent IA ne dispose d'autonomie pour :
- Modifier le plan de développement
- Sauter ou réordonner des phases
- Supprimer des fonctionnalités ou des tests
- Changer l'architecture ou la stack technologique
- Prendre des décisions ayant un impact au-delà du périmètre de la sous-phase en cours

---

## 2. Règles sur le Plan de Développement

### 2.1 — Immutabilité du Plan
Le plan de développement (phases et sous-phases défini dans le plan principal et les briefs) est **immuable** sauf approbation explicite du propriétaire.

### 2.2 — Processus de Demande de Modification
Si un agent identifie un besoin de modifier le plan, il DOIT :

1. **Documenter la demande** dans `Docs/CHANGELOG.md` (section "Demandes de Modification du Plan")
2. **Fournir obligatoirement** :
   - La sous-phase concernée
   - La modification proposée (ajout, suppression, réorganisation)
   - La justification technique détaillée (cause racine, pas de vague "c'est plus simple")
   - L'impact sur les autres sous-phases
   - Les alternatives considérées et pourquoi elles ont été rejetées
3. **ATTENDRE** la réponse du propriétaire — ne pas procéder en parallèle
4. **Documenter la décision** (approuvée/rejetée + date) dans le CHANGELOG

### 2.3 — Interdiction de Contournement
Les actions suivantes sont considérées comme un contournement du plan et sont **INTERDITES** :
- Implémenter une fonctionnalité d'une phase ultérieure dans la phase courante
- Fusionner deux sous-phases sans approbation
- Implémenter une version "simplifiée" d'une sous-phase en prétendant qu'elle est complète
- Marquer une sous-phase comme terminée si tous ses critères de validation ne sont pas remplis

---

## 3. Règles sur les Phases

### 3.1 — Ordre Séquentiel Strict
- Les phases DOIVENT être exécutées dans l'ordre (0 → 1 → 2 → ... → 8)
- Au sein d'une phase, les sous-phases DOIVENT être exécutées dans l'ordre
- Exception : des sous-phases d'une même phase peuvent être parallélisées SI ET SEULEMENT SI elles n'ont aucune dépendance entre elles ET que le propriétaire l'a approuvé

### 3.2 — Aucune Phase Sautée
- Aucune phase ou sous-phase ne peut être sautée, même si elle semble "triviale"
- Aucune phase ne peut être annulée sans l'approbation du propriétaire
- Si une phase est jugée non pertinente par l'agent, il doit en informer le propriétaire et attendre sa décision

### 3.3 — Critères de Complétion
Une sous-phase est considérée **complétée** uniquement quand :
- [ ] Tous les critères de validation du brief sont remplis
- [ ] Tous les tests associés passent
- [ ] Aucune régression sur les tests des phases précédentes
- [ ] Le CHANGELOG est mis à jour
- [ ] La documentation APP_DOCUMENTATION est mise à jour
- [ ] Le code compile sans erreur ni warning

---

## 4. Règles sur le Code

### 4.1 — Interdiction de Simplification Abusive
**Définition** : Une simplification abusive est toute modification qui résout un symptôme en supprimant la complexité légitime plutôt qu'en traitant la cause racine.

Exemples INTERDITS :
- Supprimer un champ de validation parce qu'il cause une erreur
- Remplacer un type strict par `any` pour éviter une erreur de compilation
- Commenter un test qui échoue
- Supprimer une fonctionnalité pour faire passer un test
- Utiliser `unwrap()` en Rust pour éviter la gestion d'erreur
- Utiliser `// @ts-ignore` ou `// eslint-disable` sans justification

### 4.2 — Analyse Cause Racine
Avant TOUTE modification corrective, l'agent DOIT produire une analyse en 2-3 phrases :
1. **Quel est le symptôme** observé ?
2. **Quelle est la cause racine** technique ?
3. **Quelle est la correction structurelle** (pas le workaround) ?

### 4.3 — Préservation de l'Architecture
- Les interfaces publiques (signatures de fonctions, API Tauri commands, types partagés) ne peuvent être modifiées que dans le cadre de la sous-phase qui les a créées ou d'une sous-phase explicitement dédiée
- Toute modification d'interface impactant d'autres modules doit être documentée et les tests des modules dépendants doivent être mis à jour

---

## 5. Règles sur les Tests

### 5.1 — Tests Obligatoires
- **Chaque sous-phase DOIT produire des tests** correspondants (voir `TESTING_STRATEGY.md`)
- **Aucun code sans test** — le code et les tests sont livrés ensemble

### 5.2 — Intégrité des Tests
- Un test existant ne peut être modifié que si l'hypothèse qu'il vérifie est prouvée fausse
- La preuve doit être documentée dans le commit message
- Un test ne peut JAMAIS être supprimé sans l'approbation du propriétaire

### 5.3 — Non-Régression
- Avant de livrer une sous-phase, TOUS les tests existants doivent passer
- Une régression bloque la livraison — elle doit être corrigée dans le périmètre de la sous-phase

---

## 6. Règles sur la Documentation

### 6.1 — Documentation Vivante Obligatoire
- `Docs/APP_DOCUMENTATION.md` DOIT refléter l'état actuel de l'application à tout moment
- Toute incohérence entre la documentation et le code est un bug de documentation
- La documentation est mise à jour DANS la même sous-phase que le code, pas après

### 6.2 — Cohérence
- Les types documentés doivent correspondre aux types dans le code
- Les commandes Tauri documentées doivent correspondre aux commandes implémentées
- Le schéma de base de données documenté doit correspondre aux migrations

---

## 7. Protocole d'Escalade

### Niveau 1 — Blocage technique résolvable
L'agent tente de résoudre dans le périmètre de la sous-phase.

### Niveau 2 — Blocage nécessitant une décision
L'agent documente le problème dans le CHANGELOG et signale au propriétaire :
- Description du blocage
- Options possibles (minimum 2)
- Recommandation de l'agent avec justification
- **Attente de décision avant de continuer**

### Niveau 3 — Blocage nécessitant une modification du plan
Même processus que la section 2.2 (Demande de Modification du Plan).

---

## 8. Sanctions en Cas de Violation

Si un agent viole ces règles de gouvernance :
1. Le travail produit est **considéré invalide** et doit être refait
2. La sous-phase est **remise à l'état "En attente"** dans le CHANGELOG
3. Un post-mortem doit être documenté expliquant quelle règle a été violée et pourquoi

---

## 9. Résumé des Règles Cardinales

| # | Règle | Conséquence si violée |
|---|-------|----------------------|
| 1 | Aucune phase sautée | Sous-phase invalidée |
| 2 | Plan non modifiable sans approbation | Travail rejeté |
| 3 | Pas de simplification pour contourner | Code rejeté, refaire |
| 4 | Tests obligatoires et parallèles | Sous-phase non complétée |
| 5 | Documentation à jour | Sous-phase non complétée |
| 6 | Analyse cause racine avant correction | Commit rejeté |
| 7 | Pas de modification de test pour le rendre vert | Test restauré, code corrigé |

---

> **Ce document est lui-même immuable sauf approbation explicite du propriétaire du projet.**
