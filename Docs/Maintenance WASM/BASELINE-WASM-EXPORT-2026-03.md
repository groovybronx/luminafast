# Baseline WASM/Export - 2026-03

Statut : Completee
Date : 2026-03-12
Branche : phase/m0.1-cadrage-root-cause

## Objectif

Capturer une baseline reproductible avant migration vers le core partage.

## 1) Baseline tests

Frontend:

- Commande: npm run type-check
- Resultat: PASS

Frontend lint:

- Commande: npm run lint
- Resultat: PASS

Frontend tests:

- Commande: npm run test:ci
- Resultat: PASS
- Resume: 57 fichiers de test passes, 689 tests passes, duree 9.11s, couverture globale lignes 62.94%

Backend check:

- Commande: cd src-tauri && cargo check
- Resultat: PASS (compile OK)

Backend clippy:

- Commande: cd src-tauri && cargo clippy --all-targets -- -D warnings
- Resultat: PASS (0 warning bloquant)

Backend tests:

- Commande: cd src-tauri && cargo test
- Resultat: PASS (236 tests unitaires + 2 doc-tests, 0 echec)

WASM build:

- Commande: cd luminafast-wasm && wasm-pack build --target web --release
- Resultat: PASS (pkg genere, wasm-opt execute)

## 2) Baseline performance

Scenario A - image standard 1440px:

- Rendu preview WASM: pending ms
- Rendu preview WASM: 19.71 ms moyen (min 19.31, max 20.32)
- Notes: benchmark synthetique apply_filters via module WASM compile en release, 12 iterations + warmup

Scenario B - image large 4K:

- Rendu preview WASM: 115.99 ms moyen (min 115.39, max 117.15)
- Notes: benchmark synthetique apply_filters via module WASM compile en release, 6 iterations + warmup

## 3) Dataset de reference

Statut: valide (spec de reference figee pour les phases de parite)

Attendu:

- 1 image basse lumiere
- 1 image hautes lumieres
- 1 image contraste fort
- 1 image peau/teintes chaudes
- 1 image scene mixte interieur/exterieur

## 4) Seuils de regression cibles

- Ecart visuel acceptable (delta): delta absolu moyen <= 2 niveaux RGB par canal sur cas non-RAW
- Ecart perf acceptable sur preview: regression moyenne <= 20% vs baseline M0.2 (Scenario A <= 24 ms, Scenario B <= 140 ms)

## 5) Reproductibilite

- Machine: arm64 (Apple Silicon)
- OS: macOS 26.1 (build 25B78)
- Version Node/Rust: Node 25.6.1, npm 11.9.0, rustc 1.92.0, cargo 1.92.0
- Commandes exactes: voir section 1

## 6) Validation M0.2 (a cocher a la cloture)

- [x] Baseline tests capturee
- [x] Baseline latence capturee
- [x] Dataset reference valide
- [x] Seuils de regression valides
