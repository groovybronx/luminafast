# Plan Complet — Migration vers un Moteur Image Partagé (WASM + Backend Export)

> **Statut** : ✅ Complétée intégralement M0.1→M5.3 (2026-03-13) — Gate G6 fermée
> **Date** : 2026-03-12
> **Type** : Maintenance structurante
> **Décision architecture** : Crate partagée Cargo (moteur unique)

## 1. Contexte

> **Note historique (M5.1 complétée — 2026-03-13)** : Les deux copies algorithmiques décrites ci-dessous ont été supprimées. La source unique est désormais `luminafast-image-core`. Ce contexte est conservé à titre d'historique de la décision.

Le projet contenait deux implémentations Rust du traitement pixel :

- `src-tauri/src/services/image_processing.rs` _(supprimé en M5.1)_
- `luminafast-wasm/src/image_processing.rs` _(supprimé en M2.1)_

Ce modèle en copie manuelle créait un risque de désynchronisation. Le risque s'était déjà matérialisé : la version WASM contenait des optimisations et des capacités (passe unique + histogramme) absentes de la version backend.

## 2. Objectif global

Créer une **source de vérité unique** pour les algorithmes de traitement image, réutilisée à la fois :

- par le wrapper WASM (preview temps réel)
- par le backend Rust (export non destructif et extension RAW)

## 3. Résultats attendus

- Une nouvelle crate Rust pure (`luminafast-image-core`) contenant les algorithmes.
- `luminafast-wasm` dépend de cette crate.
- `src-tauri` dépend de cette crate pour le pipeline export.
- Suppression de la duplication manuelle des algorithmes.
- Parité preview/export mesurée et testée.

## 4. Architecture cible

```text
Frontend (TS)                     Backend (Tauri)
  |                                   |
  | import dynamique @wasm            | commandes export
  v                                   v
luminafast-wasm  ----------------> luminafast-image-core <---------------- src-tauri
(wrapper wasm-bindgen)            (algorithmes + contrats)                (service export)
```

Principes non négociables :

- Le core ne dépend pas de `tauri`, ni de `wasm-bindgen`.
- Les wrappers WASM/Tauri sont minces (mapping I/O, validation externe, logging).
- Les tests algorithmiques résident dans la crate core.
- Les tests de parité preview/export sont obligatoires.

## 5. Phases et sous-phases

## Phase M0 — Cadrage et baseline

### M0.1 — Cadrage root cause + périmètre

- Formaliser le symptôme, la cause racine, la correction structurelle.
- Figer le scope de migration.
- Définir les exclusions et les reports.

### M0.2 — Baseline qualité/performance

- Capturer l'état initial: tests, métriques latence preview, cas visuels de référence.
- Créer un jeu d'images de test pour comparaison future.

### M0.3 — Gouvernance des briefs et dépendances

- Créer tous les briefs opérationnels.
- Établir la matrice de dépendances entre sous-phases.

## Phase M1 — Construction du core partagé

### M1.1 — Initialisation crate `luminafast-image-core`

- Créer la crate Rust pure dédiée.
- Ajouter types filtres et erreurs.
- Ajouter base des fonctions publiques.

### M1.2 — Portage des algorithmes vers le core

- Migrer la logique de traitement depuis la version la plus avancée.
- Ajouter histogramme et validation dimensions/buffer.
- Ajouter tests unitaires de comportement.

### M1.3 — Stabilisation API core v1

- Geler signatures publiques.
- Clarifier conventions de ranges.
- Ajouter tests de contrat API.

## Phase M2 — Intégration WASM

### M2.1 — Brancher `luminafast-wasm` sur le core

- Supprimer la logique duplicative locale.
- Conserver un wrapper wasm-bindgen minimal.

### M2.2 — Non-régression frontend

- Vérifier que `src/services/wasmRenderingService.ts` fonctionne sans changement d'API.
- Conserver fallback et comportement existants.

### M2.3 — Parité visuelle preview WASM

- Établir snapshots de référence.
- Vérifier l'écart toléré par preset.

## Phase M3 — Intégration backend export

### M3.1 — Brancher `src-tauri` sur le core

- Remplacer l'usage de l'ancienne copie backend.
- Garder compatibilité de commandes publiques existantes.

### M3.2 — Service export non destructif

- Construire un pipeline export (params -> rendu final).
- Intégrer dans les commandes Tauri d'export.

### M3.3 — Contrat de cohérence preview/export

- Ajouter tests de parité backend vs WASM.
- Définir seuils d'écart admissibles.

## Phase M4 — Préparation édition RAW

### M4.1 — Pipeline RAW-ready (architecture)

- Structurer le core en étapes extensibles.
- Isoler transform colorimétrique et tone mapping.

### M4.2 — Abstraction décodeur RAW

- Définir interfaces d'entrée pixel pour futurs décodeurs.
- Permettre intégration incrémentale sans casser le core.

### M4.3 — Pilote RAW réel

- Valider sur un sous-ensemble de formats/caméras.
- Produire bilan de compatibilité et limites.

## Phase M5 — Nettoyage et durcissement

### M5.1 — Suppression duplication legacy

- Retirer les anciennes implémentations en doublon.
- Vérifier absence d'usages résiduels.

### M5.2 — Synchronisation documentation

- Mettre à jour docs techniques, changelog, README WASM.
- Clarifier nouvelle source de vérité.

### M5.3 — Garde-fous CI

- Ajouter jobs de validation migration.
- Empêcher retour de duplication via contrôle automatique.

## 6. Ordonnancement (DAG)

- M0.1 -> M0.2 -> M0.3
- M0.3 -> M1.1 -> M1.2 -> M1.3
- M1.3 -> M2.1 -> M2.2 -> M2.3
- M1.3 -> M3.1 -> M3.2 -> M3.3
- M3.3 -> M4.1 -> M4.2 -> M4.3
- M2.3 + M4.3 -> M5.1 -> M5.2 -> M5.3

## 7. Stratégie de tests

Niveaux requis :

- Unit tests crate core (algorithmes, erreurs, bornes)
- Tests wrapper WASM (interop JS/TS)
- Tests backend export (pipeline)
- Tests parité preview/export (jeu d'images de référence)
- Tests non-régression frontend/backend existants

## 8. Risques principaux et mitigation

- Risque : régression visuelle subtile.
  Mitigation : snapshots + seuil de delta + dataset de référence.
- Risque : divergence de ranges entre UI et core.
  Mitigation : contrat API v1 + tests de conversion explicites.
- Risque : montée de complexité RAW trop tôt.
  Mitigation : RAW en phase dédiée (M4), scope incrémental.

## 9. Définition de terminé (globale)

La migration est terminée lorsque :

- Une seule implémentation algorithmique subsiste.
- WASM et backend utilisent le même moteur core.
- Export édité passe avec tests de cohérence preview/export.
- La documentation ne mentionne plus de copie manuelle.
- CI bloque automatiquement toute réintroduction de duplication.

## 10. Liste des briefs créés

- `INDEX_EXECUTION_AGENT.md`
- `BRIEF-M0.1-CADRAGE-ROOT-CAUSE.md`
- `BRIEF-M0.2-BASELINE-QUALITE-PERF.md`
- `BRIEF-M0.3-GOUVERNANCE-ROADMAP-BRIEFS.md`
- `BRIEF-M1.1-INIT-CRATE-CORE-IMAGE.md`
- `BRIEF-M1.2-PORTAGE-ALGORITHMES-VERS-CORE.md`
- `BRIEF-M1.3-STABILISATION-API-CORE-V1.md`
- `BRIEF-M2.1-INTEGRATION-WASM-SUR-CORE.md`
- `BRIEF-M2.2-NON-REGRESSION-FRONTEND-WASM.md`
- `BRIEF-M2.3-PARITE-VISUELLE-WASM.md`
- `BRIEF-M3.1-INTEGRATION-BACKEND-EXPORT.md`
- `BRIEF-M3.2-SERVICE-EXPORT-NON-DESTRUCTIF.md`
- `BRIEF-M3.3-CONTRAT-PARITE-PREVIEW-EXPORT.md`
- `BRIEF-M4.1-ARCHI-PIPELINE-RAW-READY.md`
- `BRIEF-M4.2-ABSTRACTION-DECODEUR-RAW.md`
- `BRIEF-M4.3-PILOTE-RAW-REEL.md`
- `BRIEF-M5.1-SUPPRESSION-DUPLICATION.md`
- `BRIEF-M5.2-SYNCHRO-DOCUMENTATION.md`
- `BRIEF-M5.3-CI-GARDE-FOUS.md`
