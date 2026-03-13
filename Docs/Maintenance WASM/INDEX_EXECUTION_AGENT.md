# Index Execution Agent - Migration WASM Core

Statut : ✅ Migration complete
Date : 2026-03-13
Portee : Orchestration complete M0.1 -> M5.3

## 0) Etat d avancement actuel

- M0.1 : ✅ Completee
- M0.2 : ✅ Completee
- M0.3 : ✅ Completee
- M1.1 : ✅ Completee
- M1.2 : ✅ Completee
- M1.3 : ✅ Completee
- M2.1 : ✅ Completee
- M2.2 : ✅ Completee
- M2.3 : ✅ Completee
- M3.1 : ✅ Completee
- M3.2 : ✅ Completee
- M3.3 : ✅ Completee
- M4.1 : ✅ Completee
- M4.2 : ✅ Completee
- M4.3 : ✅ Completee
- M5.1 : ✅ Completee
- M5.2 : ✅ Completee
- M5.3 : ✅ Completee

## 1) Ordre d execution officiel

1. M0.1 - Cadrage Root Cause
2. M0.2 - Baseline Qualite et Performance
3. M0.3 - Gouvernance et Roadmap des Briefs
4. M1.1 - Initialisation Crate Core Image
5. M1.2 - Portage des Algorithmes vers le Core
6. M1.3 - Stabilisation API Core v1
7. M2.1 - Integration WASM sur Core Partage
8. M2.2 - Non-Regression Frontend WASM
9. M2.3 - Parite Visuelle WASM
10. M3.1 - Integration Backend Export sur Core
11. M3.2 - Service Export Non Destructif
12. M3.3 - Contrat de Parite Preview/Export
13. M4.1 - Architecture Pipeline RAW-Ready
14. M4.2 - Abstraction Decodeur RAW
15. M4.3 - Pilote RAW Reel
16. M5.1 - Suppression de la Duplication Legacy
17. M5.2 - Synchronisation Documentation
18. M5.3 - CI Garde-Fous

## 2) Fichier brief a executer pour chaque etape

1. Docs/Maintenance WASM/BRIEF-M0.1-CADRAGE-ROOT-CAUSE.md
2. Docs/Maintenance WASM/BRIEF-M0.2-BASELINE-QUALITE-PERF.md
3. Docs/Maintenance WASM/BRIEF-M0.3-GOUVERNANCE-ROADMAP-BRIEFS.md
4. Docs/Maintenance WASM/BRIEF-M1.1-INIT-CRATE-CORE-IMAGE.md
5. Docs/Maintenance WASM/BRIEF-M1.2-PORTAGE-ALGORITHMES-VERS-CORE.md
6. Docs/Maintenance WASM/BRIEF-M1.3-STABILISATION-API-CORE-V1.md
7. Docs/Maintenance WASM/BRIEF-M2.1-INTEGRATION-WASM-SUR-CORE.md
8. Docs/Maintenance WASM/BRIEF-M2.2-NON-REGRESSION-FRONTEND-WASM.md
9. Docs/Maintenance WASM/BRIEF-M2.3-PARITE-VISUELLE-WASM.md
10. Docs/Maintenance WASM/BRIEF-M3.1-INTEGRATION-BACKEND-EXPORT.md
11. Docs/Maintenance WASM/BRIEF-M3.2-SERVICE-EXPORT-NON-DESTRUCTIF.md
12. Docs/Maintenance WASM/BRIEF-M3.3-CONTRAT-PARITE-PREVIEW-EXPORT.md
13. Docs/Maintenance WASM/BRIEF-M4.1-ARCHI-PIPELINE-RAW-READY.md
14. Docs/Maintenance WASM/BRIEF-M4.2-ABSTRACTION-DECODEUR-RAW.md
15. Docs/Maintenance WASM/BRIEF-M4.3-PILOTE-RAW-REEL.md
16. Docs/Maintenance WASM/BRIEF-M5.1-SUPPRESSION-DUPLICATION.md
17. Docs/Maintenance WASM/BRIEF-M5.2-SYNCHRO-DOCUMENTATION.md
18. Docs/Maintenance WASM/BRIEF-M5.3-CI-GARDE-FOUS.md

## 3) Gates obligatoires entre sous-phases

- Gate G1 (fin M0.3) : baselines et briefs complets valides
- Gate G2 (fin M1.3) : API core v1 gelee, tests core verts
- Gate G3 (fin M2.3) : WASM integre, non-regression frontend, parite visuelle OK
- Gate G4 (fin M3.3) : backend export integre, contrat parite preview/export valide
- Gate G5 (fin M4.3) : pilote RAW scope cible valide et documente
- Gate G6 (fin M5.3) : duplication retiree, docs synchronisees, garde-fous CI actifs

## 4) Commandes de validation standards par type de phase

Validation TypeScript/Frontend:

- npm run type-check
- npm run lint
- npm run test:ci

Validation Rust backend:

- cd src-tauri && cargo check
- cd src-tauri && cargo clippy --all-targets -- -D warnings
- cd src-tauri && cargo test

Validation WASM:

- cd luminafast-wasm && wasm-pack build --target web --release

Validation core partage (quand cree):

- cd luminafast-image-core && cargo check
- cd luminafast-image-core && cargo test

Validation anti-duplication (phase M5.3):

- grep -R "apply_filters\|compute_histogram_from_pixels\|PixelFilters" -n src-tauri/src luminafast-wasm/src luminafast-image-core/src
- verifier une seule implementation algorithmique active dans le core

## 5) Procedure d execution pour un agent IA

1. Lire AGENTS racine et AGENTS specialises pertinents.
2. Lire le brief de la sous-phase cible en entier.
3. Verifier dependances de phases precedentes dans Docs/CHANGELOG.md.
4. Implementer strictement le scope IN, sans scope creep.
5. Ecrire/mettre a jour les tests en parallele du code.
6. Executer les validations locales de la sous-phase.
7. Mettre a jour Docs/CHANGELOG.md et Docs/APP_DOCUMENTATION.md.
8. Marquer la sous-phase completee, puis passer a la suivante.

## 6) Regles d arret

Arret immediate et escalation obligatoire si:

- un pre-requis de phase est manquant
- un choix d architecture hors brief est necessaire
- une regression critique ne peut pas etre corrigee proprement

Dans ce cas:

- documenter blocage et cause racine
- proposer options
- attendre validation proprietaire

## 7) Reference globale

Plan de migration maitre:

- Docs/Maintenance WASM/PLAN_COMPLET_MIGRATION_WASM_CORE.md
