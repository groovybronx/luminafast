# LuminaFast — Instructions Obligatoires pour Agents IA

> **CE FICHIER DOIT ÊTRE LU EN INTÉGRALITÉ AVANT TOUTE ACTION SUR LE PROJET.**
> Toute violation de ces règles invalide le travail produit.

---

## 1. RÈGLES ABSOLUES (NON NÉGOCIABLES)

### 1.1 — Intégrité du Plan
- **Le plan de développement (`Docs/briefs/` + plan principal) ne peut PAS être modifié** sans l'approbation explicite du propriétaire du projet.
- Si une modification du plan est nécessaire, l'agent DOIT :
  1. Expliquer la raison avec une justification technique détaillée
  2. Proposer l'alternative
  3. **ATTENDRE la validation** avant de procéder
- Aucune phase, sous-phase ou étape ne peut être sautée, annulée ou contournée.

### 1.2 — Interdiction de Simplification Abusive
- **Ne JAMAIS résoudre un problème en supprimant une fonctionnalité, une validation ou un test existant.**
- **Ne JAMAIS simplifier le code dans le but de contourner un problème ou faire passer un test.**
- Si une correction nécessite de simplifier le code, l'agent DOIT :
  1. Justifier pourquoi la complexité actuelle est impossible à maintenir
  2. Obtenir la validation explicite du propriétaire
- Les workarounds (contournements) sont INTERDITS. Viser systématiquement la correction structurelle (cause racine).

### 1.3 — Intégrité des Tests
- **Ne JAMAIS modifier un test pour le rendre "vert" sans expliquer quelle hypothèse du test initial était fausse.**
- Si un test échoue après une modification de code, l'agent DOIT :
  1. Analyser la cause racine de l'échec
  2. Déterminer si c'est le code ou le test qui est incorrect
  3. Justifier explicitement son choix avant toute modification du test
- **Chaque sous-phase DOIT produire des fichiers de tests correspondants.** Aucun code sans test.

### 1.4 — Analyse Cause Racine Obligatoire
- Avant toute modification de code (bug fix, refactoring), l'agent DOIT fournir une analyse courte (2-3 phrases) identifiant la **cause racine** du problème.
- Cette analyse doit être documentée dans le commit message et dans le CHANGELOG.

---

## 2. PROTOCOLE DE TRAVAIL PAR SOUS-PHASE

### Avant de commencer une sous-phase :
1. **Lire** le brief correspondant : `Docs/briefs/PHASE-X.Y.md`
2. **Lire** ce fichier (`AI_INSTRUCTIONS.md`) en entier
3. **Lire** `Docs/CHANGELOG.md` pour comprendre l'état actuel du projet
4. **Lire** `Docs/APP_DOCUMENTATION.md` pour l'architecture en place
5. **Vérifier** que toutes les sous-phases dépendantes sont marquées ✅ dans le CHANGELOG
6. **Vérifier** que les tests des phases précédentes passent toujours

### Pendant le travail :
1. Respecter strictement le périmètre défini dans le brief (pas de modifications hors scope)
2. Écrire les tests EN PARALLÈLE du code (pas après)
3. Utiliser les types TypeScript stricts — pas de `any`, pas de `as unknown`
4. Gérer les cas d'erreur explicitement (edge cases)
5. Préserver les interfaces existantes (signatures de fonctions, API) sauf si le brief le permet
6. Suivre les conventions de code définies en section 4

### Après avoir terminé une sous-phase :
1. **Exécuter tous les tests** (unitaires + intégration) — TOUS doivent passer
2. **Mettre à jour** `Docs/CHANGELOG.md` avec l'entrée de la sous-phase complétée
3. **Mettre à jour** `Docs/APP_DOCUMENTATION.md` pour refléter les changements
4. **Vérifier** que la documentation est cohérente avec l'état réel de l'application
5. **Lister** les fichiers créés/modifiés dans le CHANGELOG
6. **Créer** le brief de la sous-phase suivante si non existant

---

## 3. DOCUMENTS DE RÉFÉRENCE ARCHITECTURALE

Ces documents définissent l'architecture cible et les choix technologiques. Ils doivent être consultés pour toute décision de conception :

| Document | Contenu | Quand le consulter |
|----------|---------|-------------------|
| `Docs/archives/Lightroomtechnique.md` | Architecture Lightroom Classic (SQLite, collections, previews, EXIF) | Conception du schéma DB, collections, cache |
| `Docs/archives/recommendations.md` | Stack moderne recommandée (DuckDB, BLAKE3, FlatBuffers, Event Sourcing) | Choix technologiques, sérialisation, performance |
| `Docs/GOVERNANCE.md` | Règles de gouvernance du projet | En cas de doute sur les permissions |
| `Docs/TESTING_STRATEGY.md` | Stratégie de tests | Avant d'écrire tout test |
| `Docs/APP_DOCUMENTATION.md` | État actuel de l'application | Avant chaque sous-phase |

---

## 4. CONVENTIONS DE CODE

### 4.1 — TypeScript (Frontend)
```
- Strict mode activé (`strict: true` dans tsconfig.json)
- Pas de `any` — utiliser `unknown` + type guards si nécessaire
- Interfaces pour les props de composants (suffixe `Props`)
- Types pour les modèles de données (dans `src/types/`)
- Enums pour les valeurs finies (états, flags, vues)
- Gestion d'erreur explicite : try/catch avec types d'erreur
- Imports absolus via alias `@/` pour `src/`
- **Session tracking** : Utiliser les méthodes de session réelles (pas d'approximations)
```

### 4.2 — Rust (Backend Tauri)
```
- Utiliser `Result<T, E>` systématiquement — pas de `unwrap()` en production
- Structs avec `#[derive(Debug, Clone, Serialize, Deserialize)]`
- Modules organisés par domaine (`catalog.rs`, `hashing.rs`, `preview.rs`)
- Documentation Rust (`///`) pour toute fonction publique
- Tests unitaires dans le même fichier (`#[cfg(test)]`)
- Error types personnalisés avec `thiserror`
- **Session tracking** : Implémenter les méthodes de session réelles (create/update/complete)
- **Stats réelles** : Utiliser les tables de session, pas d'approximations temporelles
```

### 4.3 — Nommage
```
- Fichiers composants : PascalCase.tsx (ex: GridView.tsx)
- Fichiers utilitaires : camelCase.ts (ex: catalogService.ts)
- Fichiers Rust : snake_case.rs (ex: blake3_hasher.rs)
- Variables/fonctions : camelCase (TS), snake_case (Rust)
- Types/Interfaces : PascalCase (les deux)
- Constantes : SCREAMING_SNAKE_CASE (les deux)
- Branches Git : phase/X.Y-description-kebab-case
- Commits : "phase(X.Y): description concise"
```

### 4.4 — Structure des fichiers
```
- Un composant par fichier
- Imports en haut, exports en bas
- Pas de logique métier dans les composants — déléguer aux stores/services
- Maximum ~300 lignes par fichier (découper si dépassé)
- Pas de commentaires évidents — le code doit être auto-documenté
- Commentaires uniquement pour le "pourquoi", pas le "quoi"
```

---

## 5. PROTOCOLE D'ESCALADE

Si l'agent rencontre un blocage qu'il ne peut pas résoudre dans le périmètre de la sous-phase :

1. **NE PAS contourner le problème**
2. **NE PAS modifier le scope de la sous-phase**
3. **Documenter le blocage** dans le CHANGELOG avec :
   - Description précise du problème
   - Cause racine identifiée (ou hypothèses)
   - Solutions envisagées avec pros/cons
   - Impact sur le planning
4. **Signaler au propriétaire** et attendre ses instructions

---

## 6. FICHIERS À TOUJOURS MAINTENIR À JOUR

| Fichier | Quand mettre à jour | Responsabilité |
|---------|---------------------|----------------|
| `Docs/CHANGELOG.md` | Après chaque sous-phase complétée | Obligatoire |
| `Docs/APP_DOCUMENTATION.md` | Après chaque sous-phase qui modifie l'architecture, l'API ou la DB | Obligatoire |
| `Docs/briefs/PHASE-X.Y.md` | Avant de commencer la sous-phase | Obligatoire |
| Tests correspondants | En parallèle du code de la sous-phase | Obligatoire |

---

## 7. CHECKLIST DE PRÉ-COMMIT

Avant chaque commit, l'agent DOIT vérifier :

- [ ] Le code compile sans erreur (`tsc --noEmit` + `cargo check`)
- [ ] Tous les tests existants passent
- [ ] Les nouveaux tests de la sous-phase passent
- [ ] Aucun `any` TypeScript ajouté
- [ ] Aucun `unwrap()` Rust ajouté en code de production
- [ ] Le CHANGELOG est à jour
- [ ] La documentation APP_DOCUMENTATION est cohérente
- [ ] Le périmètre de la sous-phase n'a pas été dépassé
- [ ] Aucune fonctionnalité existante n'a été supprimée ou simplifiée
- [ ] **Session tracking** : Implémenté avec tables dédiées (pas d'approximations)
- [ ] **Stats réelles** : Utilisées dans les services (pas de fallback temporel)

---

## 8. RAPPEL FINAL

> **L'objectif est de produire une application de qualité commerciale.**
> La rapidité d'exécution ne justifie JAMAIS de sacrifier la qualité, la robustesse ou la cohérence architecturale.
> En cas de doute : **demander, ne pas deviner.**
