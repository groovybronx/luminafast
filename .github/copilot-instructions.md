# LuminaFast — Workspace Instructions pour Agents IA

## 1. Principes Généraux

- **Lire impérativement** `AGENTS.md` (racine) avant toute action.
- Respecter le plan de développement (`Docs/archives/luminafast_developement_plan.md`) et les briefs de phase (`Docs/briefs/PHASE-X.Y.md`).
- **Aucune modification du plan** sans validation explicite du propriétaire.
- **Tests obligatoires** à chaque sous-phase : aucun code sans test, non-régression garantie.
- **Jamais de simplification abusive** (suppression de tests, features, validations sans justification et accord).
- **Analyse cause racine** obligatoire avant toute correction.

## 2. Commandes de Build & Test

- **Frontend** (React/TS) :
  - Build : `npm run build` ou `vite build`
  - Test : `npm run test` ou `vitest`
- **Backend** (Rust/Tauri) :
  - Build : `cargo build` (dans `src-tauri/` ou crates)
  - Test : `cargo test`
- **CI/CD** : Workflows GitHub Actions, voir `.github/AGENTS.md` pour structure et path filtering.

## 3. Architecture & Patterns

- **Frontend** : TypeScript strict, Zustand pour l’état, composants React typés, intégration Tauri via services dédiés.
- **Backend** : Rust strict, gestion d’erreur explicite (`Result<T, E>`), pas de `unwrap()`/`expect()`/`panic!()` en prod, modules avec tests intégrés.
- **Documentation** : `Docs/APP_DOCUMENTATION.md` = source de vérité, synchronisée après chaque sous-phase.
- **Briefs** : chaque sous-phase a son brief (`Docs/briefs/PHASE-X.Y.md`), à créer/mettre à jour selon le template.

## 4. Pièges & Problèmes Fréquents

- Ne jamais mélanger sync/async dans le backend (voir user memory M.1.1)
- Toujours écrire les tests en parallèle du code, jamais après
- Ne pas modifier un test pour le rendre vert sans justification
- Respecter la checklist pré-commit `.github/AGENTS.md`

## 5. Navigation & Spécialisation

- Utiliser les AGENTS.md spécialisés :
  - Frontend : `src/AGENTS.md`
  - Backend : `src-tauri/AGENTS.md`
  - CI/CD : `.github/AGENTS.md`
  - Documentation : `Docs/AGENTS.md`
- Pour toute question d’architecture, consulter le plan de développement et la documentation vivante.

## 6. Exemples de Prompts

- « Ajoute un composant React typé pour la grille d’images, avec tests Vitest »
- « Implémente une commande Tauri pour exporter une image, avec gestion d’erreur Rust idiomatique et tests »
- « Synchronise APP_DOCUMENTATION.md après modification de l’API »
- « Génère le brief de la prochaine sous-phase à partir du plan »

## 7. Personnalisations d’agent recommandées

- `/create-agent Master-Validator` : vérifie la conformité code ↔ briefs de phase
- `/create-agent Documentation Sync` : maintient CHANGELOG et APP_DOCUMENTATION synchronisés
- `/create-agent Explore` : exploration rapide du codebase pour extraire conventions, patterns, pièges

---

Pour toute action, suivre ce fichier + AGENTS.md racine + AGENTS spécialisés du domaine concerné.
