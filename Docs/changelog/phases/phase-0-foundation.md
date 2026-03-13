# Phase 0 — Foundation

Phases bootstrap TypeScript, Tauri v2, architecture modulaire frontend, state management Zustand, et CI pipeline.

---

## 0.1 Migration TypeScript

**Statut** : ✅ Complétée | **Date** : 2026-02-11 | **Agent** : Cascade

### Objectifs

- Migrer projet JavaScript (JSX) vers TypeScript (TSX) strict
- Créer types de base du domaine métier
- Garantir `tsc --noEmit` sans erreur, zéro `any` en production
- Fondations TypeScript pour toutes phases futures

### Contexte

Phase fondationnelle : transformation prototype React/Vite monolithique (~711 lignes App.jsx) en application TypeScript typée. Types créés serviront à tous les modules futurs.

### Problèmes Tackled

- Codebase JSX entière sans typage (any partout)
- Interfaces métier manquantes (Image, Collection, EditEvent, EditState)
- Pas de `tsconfig.json` strict — configuration insuffisante
- Aucun type d'environnement Vite

### Solutions Apportées

- `tsconfig.json` avec `strict: true` + tous drapeaux sévérité
- `tsconfig.node.json` pour fichiers config
- Fichiers types : `src/types/{index, image, collection, events, ui}.ts`
- Interfaces métier : `Image`, `Collection`, `EditEvent`, `EditState`, `PixelFilterState`
- Renommage + typage : `App.jsx` → `App.tsx`, `main.jsx` → `main.tsx`
- Vite environment types : `src/vite-env.d.ts`
- Dépendances : `typescript`, `@types/react`, `@types/react-dom`

### Fichiers Clés Modifiés

- `tsconfig.json`, `tsconfig.node.json`
- `src/types/{index, image, collection, events, ui}.ts`
- `src/vite-env.d.ts`
- `src/App.tsx`, `src/main.tsx`
- `vite.config.ts`, `package.json`

### Validation

- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run dev` lance sans régression visuelle
- [x] `npm run build` produit build valide
- [x] Zéro `any` explicite en production
- [x] ESLint passe sur types stricts

### Dépendances et Impacts

- **Dépend de** : (installation fraîche)
- **Utilisé par** : 0.2, 0.3, 0.4, 0.5, 1+

### Leçons Apprises

Établir TypeScript strict dès départ prévient bugs runtime et facilite refactorings. Types doivent être évolutifs (propriétés optionnelles) pour fonctionnalités futures sans breaking changes.

---

## 0.2 Scaffolding Tauri v2

**Statut** : ✅ Complétée | **Date** : 2026-02-11 | **Agent** : Cascade

### Objectifs

- Intégrer Tauri v2 dans React+Vite+TypeScript
- Lancer UI mockup dans fenêtre native macOS
- Installer plugins fs/dialog/shell
- Configurer build production Tauri

### Contexte

Transition prototype web pur → application desktop native. Tauri v2 : architecture multi-webview, backend Rust, IPC `invoke()` pour commandes/événements.

### Problèmes Tackled

- Intégration Tauri v2 dans Vite existant — structure dossiers + configuration
- Permissions filesystem pour accès fichiers/dossiers
- Enregistrement plugins Tauri dans backend Rust

### Solutions Apportées

- Structure `src-tauri/` : Cargo.toml, main.rs, lib.rs
- Configuration fenêtre macOS native retina dans `tauri.conf.json`
- Types Rust base dans `src-tauri/src/lib.rs`
- Plugins : `tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-shell`
- Script build `build.rs` pour coordination Rust/frontend
- Intégration `vite.config.ts` pour dev server Tauri
- Capabilities + permissions dans `src-tauri/capabilities/default.json`

### Fichiers Clés

- `src-tauri/{Cargo.toml, tauri.conf.json, src/main.rs, src/lib.rs, build.rs}`
- `src-tauri/capabilities/default.json`
- `package.json` (scripts build), `vite.config.ts`

### Validation

- [x] `cargo tauri dev` lance app fenêtre macOS native
- [x] UI mockup s'affiche identiquement
- [x] `cargo tauri build` produit .app bundle
- [x] Plugins fs/dialog/shell enregistrés et fonctionnels

### Leçons Apprises

Intégration early Tauri évite refactorings tardifs massifs. Permissions doivent anticiper workflow utilisateur (accès récursif dossiers, notamment).

---

## 0.3 Décomposition Modulaire Frontend

**Statut** : ✅ Complétée | **Date** : 2026-02-11 | **Agent** : Cascade

### Objectifs

- Éclatement App.tsx monolithique (~711 lignes) en composants individuels
- Limite ~300 lignes par fichier
- Préserver comportement identique, zero régression
- Architecture claire + maintenable pour phases futures

### Contexte

Refactorisation pure : aucune fonctionnalité nouvelle. Prépare terrain pour backend Phase 1+.

### Problèmes Tackled

- Monolithe App.tsx 711 lignes — difficile test/maintenance
- Mix logique métier + présentation
- Pas réutilisabilité composants (grille, thumbnails)
- Props drilling profond sans state abstraction

### Solutions Apportées

- Arborescence : `layout/`, `library/`, `develop/`, `metadata/`, `shared/`
- Composants layout : TopNav, LeftSidebar, RightSidebar, Toolbar, Filmstrip
- Composants library : GridView, ImageCard
- Composants develop : DevelopView, DevelopSliders, HistoryPanel
- Composants shared : Histogram, ExifGrid, ImportModal, BatchBar
- Données mock centralisées dans `src/lib/mockData.ts`
- App.tsx réduit à <150 lignes orchestration

### Fichiers Clés

- `src/components/{layout, library, develop, metadata, shared}/*.tsx`
- `src/lib/{mockData.ts, helpers.ts}`
- `src/App.tsx` (refactorisé)

### Validation

- [x] `tsc --noEmit` passe sans erreur
- [x] `npm run build` succès
- [x] Aucun fichier > 300 lignes
- [x] Chaque composant a props typées
- [x] Zéro régression visuelle

### Leçons Apprises

Décomposition modulaire améliore testabilité/maintenabilité, mais sans state management (Zustand) props drilling devient problématique.

---

## 0.4 State Management (Zustand)

**Statut** : ✅ Complétée | **Date** : 2026-02-11 | **Agent** : Cascade

### Objectifs

- Remplacer useState App.tsx par stores Zustand centralisés
- 4 stores : catalogStore, uiStore, editStore, systemStore
- Éliminer props drilling
- App.tsx devient orchestrateur pur

### Contexte

Couche state management pilier architecture frontend. Pont entre UI React et commandes Tauri backend.

### Problèmes Tackled

- Props drilling profond 10+ niveaux
- État partagé entre composants sans parent commun
- Pas source unique de vérité état global
- Pas persistence état entre sessions

### Solutions Apportées

- Installation Zustand + TypeScript strict
- `src/stores/catalogStore.ts` : images, selection (Set<number>), filterText
- `src/stores/uiStore.ts` : activeView, sidebar states, thumbnailSize, rightSidebarTab
- `src/stores/editStore.ts` : eventLog, currentEdits, historyIndex, undo/redo
- `src/stores/systemStore.ts` : logs, importState, appReady
- Re-export centralisé `src/stores/index.ts`
- Computed getters utilisant `get()` (getSelectedImages, getActiveImage)

### Fichiers Clés

- `src/stores/{catalogStore, uiStore, editStore, systemStore}.ts`
- `src/stores/index.ts`
- `src/App.tsx` (refactorisé, zéro useState)
- `package.json` (zustand dependency)

### Validation

- [x] App.tsx ne contient aucun useState
- [x] Tous états gérés par stores Zustand
- [x] Application fonctionne identiquement
- [x] Stores typés correctement
- [x] Tests undo/redo + store selectors passent

### Leçons Apprises

Zustand simplicité/flexibilité > Redux/Context pour petites/moyennes apps. Structure stores doit anticiper besoins futurs (collectionStore Phase 3.2, folderStore Phase 3.4, etc.).

---

## 0.5 Pipeline CI & Linting

**Statut** : ✅ Complétée | **Date** : 2026-02-11 | **Agent** : Cascade

### Objectifs

- Pipeline intégration continue opérationnel
- Linting strict TypeScript + Rust
- Tests automatisés + builds
- Garantir qualité code avant backend Phase 1

### Contexte

Dernière phase foundation. Standards qualité pour toutes phases futures. Infrastructure technique "go" pour backend.

### Problèmes Tackled

- Absence CI/CD — builds manuels
- Pas linting TypeScript/Rust — code non-standard
- Pas tests automatisés — régressions non détectées

### Solutions Apportées

- ESLint strict : TypeScript, React, imports + `.eslintrc.js`
- Prettier formatage auto + `.prettierrc.json`
- GitHub Actions workflow CI complet
- Clippy (Rust linting) + `clippy.toml` règles strictes
- `rustfmt` + `.rustfmt.toml`
- Husky + lint-staged pre-commit hooks
- Scripts npm : `lint`, `lint:fix`, `test:ci`, `build:tauri`
- `rust-toolchain.toml` version Rust fixe cross-compatible

### Fichiers Clés

- `.github/workflows/ci.yml`
- `.eslintrc.js`, `eslint.config.js`, `.prettierrc.json`
- `clippy.toml`, `.rustfmt.toml`, `rust-toolchain.toml`
- `.husky/pre-commit`
- `package.json` (scripts + dev deps)
- `Makefile` (commandes courantes)

### Validation

- [x] ESLint passe codebase entier
- [x] Clippy passe zéro warnings
- [x] GitHub Actions tests réussis
- [x] Coverage ≥80%
- [x] Build Tauri production fonctionne
- [x] Zéro `any` TypeScript
- [x] Formatage auto via hooks

### Leçons Apprises

Automatisation early qualité prévient accumulation dette technique. Pre-commit hooks doivent rester légers. Standards doivent être documentés clairement (AGENTS.md).

---
