# Parite Visuelle WASM - M2.3

Statut : Completee
Date : 2026-03-13
Branche : phase/m2.3-parite-visuelle-wasm
Brief : Docs/Maintenance WASM/BRIEF-M2.3-PARITE-VISUELLE-WASM.md

## Objectif

Valider objectivement la parite visuelle WASM apres migration sur le core partage, avec comparaison automatisee sur buffers non recompresses.

## Cause racine et correction structurelle

Le symptome cible en M2.3 etait un risque de regression visuelle subtile apres la migration interne vers le core partage, meme sans changement d API frontend. La cause racine est l absence de garde-fou de comparaison pixel objective entre une reference figee et la sortie WASM courante. La correction structurelle est l ajout d un test automatise de parite dans wasmRenderingService qui compare un dataset de reference a des sorties WASM attendues avec un seuil explicite de delta.

## Dataset de reference

Le dataset M2.3 couvre les 5 categories imposees en M0.2 avec des buffers RGBA non recompresses :

- low_light
- highlights
- high_contrast
- skin_warm
- mixed_interior_exterior

Chaque cas contient :

- dimensions fixes (3x2)
- buffer source RGBA
- preset de filtres UI
- buffer reference WASM fige

## Methode de comparaison

- Normalisation UI -> WASM via normalizeFiltersForWasm (contrat frontend existant)
- Application WASM via PixelFiltersWasm.apply_filters
- Comparaison buffer brute (sans JPEG/WebP/AVIF)
- Metrique: delta absolu moyen RGB (canaux R,G,B uniquement)

Formule :

$$
\Delta_{moyen} = \frac{1}{3N}\sum_{i=1}^{N}\left(|R_i-\hat{R}_i| + |G_i-\hat{G}_i| + |B_i-\hat{B}_i|\right)
$$

Seuil M0.2 :

- delta moyen acceptable <= 2 niveaux RGB/canal

## Resultats

| Cas                     | Delta moyen RGB | Seuil   |
| ----------------------- | --------------- | ------- |
| low_light               | 0.00            | <= 2.00 |
| highlights              | 0.00            | <= 2.00 |
| high_contrast           | 0.00            | <= 2.00 |
| skin_warm               | 0.00            | <= 2.00 |
| mixed_interior_exterior | 0.00            | <= 2.00 |

Verdict : parite visuelle WASM validee, aucun ecart bloquant.

## Checkpoints M2.3

- [x] Checkpoint 1: dataset reference en place
- [x] Checkpoint 2: comparaison automatisee executee
- [x] Checkpoint 3: seuil respecte

## Preuves techniques

- Test ajoute dans : src/services/**tests**/wasmRenderingService.test.ts
- Cas de test : should keep visual parity on reference dataset with mean RGB delta <= 2
- Execution validee : 33/33 tests passants sur le fichier wasmRenderingService.test.ts
