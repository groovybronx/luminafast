# Maintenance — WASM/Core Migration

### 2026-03-12 — Maintenance WASM M2.1 : Integration WASM sur core partage (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m2.1-integration-wasm-core`
**Type** : Maintenance

#### Résumé

**Cause racine** : le crate `luminafast-wasm` conservait encore une implémentation locale de `PixelFilters`/`apply_filters`/`compute_histogram_from_pixels`, ce qui créait un risque de divergence avec le moteur partagé `luminafast-image-core` et donc avec le backend.

**Solution** : conversion de `luminafast-wasm` en wrapper pur du core partagé (réexports directs), suppression du module dupliqué `image_processing.rs`, maintien strict des signatures wasm-bindgen (`PixelFiltersWasm`, `compute_histogram`) et ajout de tests unitaires dédiés au wrapper WASM.

#### Fichiers créés

- Aucun nouveau fichier permanent

#### Fichiers modifiés

- `luminafast-wasm/src/lib.rs` — réexports vers `luminafast-image-core` + tests wrapper WASM
- `luminafast-wasm/src/image_processing.rs` — suppression de la duplication algorithmique locale
- `src/services/wasmRenderingService.ts` — références documentation mises à jour vers le core partagé
- `luminafast-wasm/README.md` — architecture mise à jour (wrapper sur core)

#### Critères de validation remplis

- [x] Checkpoint 1 : `cd luminafast-wasm && wasm-pack build --target web --release` OK
- [x] Checkpoint 2 : import dynamique frontend valide (`src/services/__tests__/wasmRenderingService.test.ts` : 31/31)
- [x] Checkpoint 3 : tests wrappers OK (`cd luminafast-wasm && cargo test` : 2/2)

#### Impact

- Le code algorithmique n'existe plus qu'à un seul endroit (`luminafast-image-core`) pour WASM + backend.
- API JS/TS conservée sans changement (`PixelFiltersWasm` et `compute_histogram`).
- Validations complémentaires : `cd luminafast-image-core && cargo test` : 17/17 ✅.

# Maintenance — WASM/Core Migration

### 2026-03-12 — Maintenance WASM M2.2 : Non-regression frontend WASM (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m2.2-non-regression-frontend-wasm`
**Type** : Maintenance

#### Résumé

**Cause racine** : après l’intégration interne sur core partagé (M2.1), le risque principal frontend était une régression silencieuse du fallback CSS ou des conversions de plages UI -> moteur WASM, sans changement d’API visible.

**Solution** : ajout d’un test explicite sur le chemin de fallback CSS (`console.warn` dédié), conservation du contrat public (`loadWasmModule`, `hasWasmSupport`, `renderWithWasm`) et revalidation complète du service WASM en TypeScript strict.

#### Fichiers créés

- Aucun nouveau fichier

#### Fichiers modifiés

- `src/services/__tests__/wasmRenderingService.test.ts` — ajout du test explicite de fallback CSS

#### Critères de validation remplis

- [x] Checkpoint 1 : tests service WASM verts (`src/services/__tests__/wasmRenderingService.test.ts` : 32/32)
- [x] Checkpoint 2 : fallback CSS validé (test dédié sur la branche fallback)
- [x] Checkpoint 3 : `npm run type-check` vert

#### Impact

- Contrat frontend WASM inchangé et vérifié.
- Couverture non-régression fallback/normalisation renforcée pour préparer M2.3.
- Validation complémentaire : `npm run lint` ✅.

# Maintenance — WASM/Core Migration

### 2026-03-13 — Maintenance WASM M2.3 : Parite visuelle WASM (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m2.3-parite-visuelle-wasm`
**Type** : Maintenance

#### Résumé

**Cause racine** : après migration interne WASM sur core partagé, le principal risque résiduel était une régression visuelle subtile non détectée par les tests de contrat API, faute de comparaison pixel objective sur un dataset de référence.

**Solution** : ajout d'un test automatisé de parité visuelle sur buffers RGBA non recompressés (5 cas de référence M0.2), comparaison de la sortie `PixelFiltersWasm.apply_filters` face à des snapshots figés, avec vérification d'un seuil explicite de delta moyen RGB `<= 2`.

#### Fichiers créés

- `Docs/Maintenance WASM/PARITE-VISUELLE-WASM.md` — rapport de parité M2.3 (dataset, méthode, résultats)

#### Fichiers modifiés

- `src/services/__tests__/wasmRenderingService.test.ts` — test de parité visuelle WASM (dataset + métrique delta)

#### Critères de validation remplis

- [x] Checkpoint 1 : dataset de référence en place (5 cas : low_light, highlights, high_contrast, skin_warm, mixed_interior_exterior)
- [x] Checkpoint 2 : comparaison automatisée exécutée (`src/services/__tests__/wasmRenderingService.test.ts` : 33/33)
- [x] Checkpoint 3 : seuil respecté (delta moyen RGB `<= 2`, mesuré `0.00` sur tous les cas)

#### Impact

- Parité visuelle WASM objectivée avec garde-fou automatisé reproductible.
- Risque de dérive visuelle post-migration réduit avant passage à M3.1 (backend export).

# Maintenance — WASM/Core Migration

### 2026-03-13 — Maintenance WASM M3.1 : Integration backend export sur core partage (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m3.1-integration-backend-export`
**Type** : Maintenance

#### Résumé

**Cause racine** : la couche backend conservait encore une implémentation algorithmique locale dans `services/image_processing.rs`, ce qui maintenait un risque de divergence avec le moteur partagé déjà utilisé côté WASM.

**Solution** : création d'un service backend dédié `export_rendering` branché sur `luminafast-image-core`, conversion de `image_processing.rs` en wrapper de compatibilité (deprecate) vers le core, et suppression de la logique algorithmique dupliquée active côté backend.

#### Fichiers créés

- `src-tauri/src/services/export_rendering.rs` — service backend export branché sur le core + tests unitaires

#### Fichiers modifiés

- `src-tauri/src/services/mod.rs` — ajout du module `export_rendering`
- `src-tauri/src/services/image_processing.rs` — deprecation et délégation vers `luminafast-image-core`

#### Critères de validation remplis

- [x] Checkpoint 1 : build backend vert (`cd src-tauri && cargo check`)
- [x] Checkpoint 2 : tests export unitaires verts (`cargo test export_rendering` : 2/2)
- [x] Checkpoint 3 : usages copie backend supprimés (algorithme local retiré de `image_processing.rs`)

#### Impact

- Backend et WASM utilisent désormais le même moteur algorithmique partagé.
- M3.2 peut construire le pipeline export non destructif sans dette de duplication legacy.

# Maintenance — WASM/Core Migration

### 2026-03-13 — Maintenance WASM M3.2 : Service export non destructif (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m3.2-service-export-non-destructif`
**Type** : Maintenance

#### Résumé

**Cause racine** : après M3.1, le backend pouvait rendre des pixels via le core partagé, mais aucun pipeline applicatif n'orchestrait encore la reconstruction des edits depuis l'historique (events/snapshots) jusqu'à un export fichier final. Cette absence bloquait l'export non destructif malgré la parité algorithmique backend/WASM.

**Solution** : ajout d'un pipeline backend dédié `export_pipeline` (résolution image source SQL, replay snapshots + events, mapping edits vers `PixelFilters`, rendu via `export_rendering`, écriture JPEG/TIFF), exposé par la commande Tauri `export_image_edited` et un DTO de résultat typé.

#### Fichiers créés

- `src-tauri/src/services/export_pipeline.rs` — pipeline export non destructif + tests unitaires
- `src-tauri/src/commands/export.rs` — commande Tauri `export_image_edited`

#### Fichiers modifiés

- `src-tauri/src/services/mod.rs` — ajout du module `export_pipeline`
- `src-tauri/src/commands/mod.rs` — export du module `export`
- `src-tauri/src/models/dto.rs` — ajout `ExportResultDTO`
- `src-tauri/src/lib.rs` — enregistrement IPC `commands::export::export_image_edited`

#### Critères de validation remplis

- [x] Checkpoint 1 : pipeline unitaire valide (`cd src-tauri && cargo test export_pipeline` : 3/3)
- [x] Checkpoint 2 : commande export fonctionnelle (commande Tauri branchée + DTO sérialisable)
- [x] Checkpoint 3 : build/lint backend verts (`cargo check` + `cargo clippy --all-targets -- -D warnings`)

#### Impact

- Export non destructif backend activé de bout en bout (events/snapshots -> rendu core -> fichier disque).
- Base solide posée pour M3.3 (contrat de parité preview/export).

# Maintenance — WASM/Core Migration

### 2026-03-13 — Maintenance WASM M3.3 : Contrat de parite preview/export (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m3.3-contrat-parite-preview-export`
**Type** : Maintenance

#### Résumé

**Cause racine** : apres M3.2, la preview WASM et l export backend utilisaient deja le meme moteur partage, mais aucun test de contrat n attestait que la reconstruction backend events/snapshots restait coherente avec la preview pour des presets reels.

**Solution** : ajout d une suite de parite backend buffer-a-buffer (sortie TIFF lossless) avec presets communs et seuil fixe `delta moyen RGB <= 2`, puis alignement du test frontend sur ces memes presets/constantes de contrat.

#### Fichiers créés

- `Docs/Maintenance WASM/PARITE-PREVIEW-EXPORT.md` — protocole de comparaison, seuils et resultats
- `src-tauri/src/services/tests/parity_preview_export.rs` — tests de parite preview/export (events + snapshots)
- `src-tauri/src/services/tests/mod.rs` — module de tests services

#### Fichiers modifiés

- `src-tauri/src/services/mod.rs` — branchement du module `tests`
- `src/services/__tests__/wasmRenderingService.test.ts` — presets communs M3.3 + verrouillage normalisation

#### Critères de validation remplis

- [x] Checkpoint 1 : protocole comparaison valide (rapport `PARITE-PREVIEW-EXPORT.md`)
- [x] Checkpoint 2 : tests parite automatises verts (`cargo test parity_preview_export` 2/2, `vitest wasmRenderingService` 35/35)
- [x] Checkpoint 3 : seuils documentes (`delta moyen RGB <= 2` cote frontend + backend)

#### Impact

- Contrat preview/export durable active avant Gate G4.
- Toute derive future de normalisation UI->core ou de replay backend est maintenant detectee automatiquement.

# Maintenance — WASM/Core Migration

### 2026-03-13 — Maintenance WASM M4.1 : Architecture pipeline RAW-ready (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m4.1-architecture-pipeline-raw-ready`
**Type** : Maintenance

#### Résumé

**Cause racine** : apres M3.3, le core image appliquait encore les transformations dans une fonction monolithique sans pipeline explicite. Cette structure ne separait pas clairement les etapes input/transform/output, rendant l extension vers des etapes RAW dediees plus risquee.

**Solution** : ajout d un module `pipeline` avec trait `ImagePipelineStep`, pipeline compose extensible et validation RGBA centralisee, puis branchement de `apply_filters` sur une etape `FilterTransformStep` pour conserver strictement le contrat API v1.

#### Fichiers créés

- `luminafast-image-core/src/pipeline.rs` — architecture pipeline composee + tests unitaires dedies

#### Fichiers modifiés

- `luminafast-image-core/src/lib.rs` — export du module pipeline (`ImagePipeline`, `ImagePipelineStep`)
- `luminafast-image-core/src/filters.rs` — application des filtres via pipeline interne
- `luminafast-image-core/src/histogram.rs` — reusage validation RGBA centralisee

#### Critères de validation remplis

- [x] Checkpoint 1 : architecture pipeline codee (`ImagePipelineStep` + `ImagePipeline`)
- [x] Checkpoint 2 : tests unitaires pipeline verts (`cd luminafast-image-core && cargo test` : 21/21)
- [x] Checkpoint 3 : compat API v1 preservee (`luminafast-image-core/tests/api_contract.rs` : 5/5)

#### Impact

- Le core image est desormais structure en pipeline extensible, pret pour l abstraction decodeur de M4.2.
- Les chemins backend/WASM conservent le meme contrat public `apply_filters` sans regression fonctionnelle.

### 2026-03-13 — Maintenance WASM M5.1 : Suppression de la duplication legacy (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m5.1-suppression-duplication`
**Type** : Maintenance

#### Résumé

**Cause racine** : apres M3.1, un module backend legacy de compatibilite (`services/image_processing.rs`) etait encore exporte, ce qui maintenait une dette de duplication potentielle malgre la migration effective sur `luminafast-image-core`.

**Solution** : suppression du module backend legacy et de son export dans `services/mod.rs`, avec verification explicite d absence d usages residuels, puis revalidation complete build/tests backend + WASM.

#### Fichiers supprimés

#### Fichiers modifiés

#### Critères de validation remplis

#### Impact

### 2026-03-13 — Maintenance WASM M4.3 : Pilote RAW reel (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m4.3-pilote-raw-reel`
**Type** : Maintenance

#### Résumé

**Cause racine** : apres M4.2, le contrat `RawDecoder` etait pret dans le core mais aucun flux backend reel n utilisait encore un decodeur concret pour l export non destructif. Le pipeline export restait limite a `image::open`, donc inoperant sur les RAW pilotes.

**Solution** : integration d un decodeur concret `rsraw` cote backend export, ajout de la commande Tauri `export_raw_edited`, limitation explicite du scope pilote (`arw`, `raf`, `dng`) avec erreurs dediees hors scope, et production d un rapport de compatibilite M4.3.

#### Fichiers créés

- `Docs/Maintenance WASM/RAPPORT-PILOTE-RAW.md` — scope pilote, protocole de validation et limites

#### Fichiers modifiés

- `src-tauri/src/services/export_pipeline.rs` — decodeur RAW concret + branchement pipeline + tests integration pilotes
- `src-tauri/src/commands/export.rs` — nouvelle commande `export_raw_edited`
- `src-tauri/src/lib.rs` — enregistrement commande `export_raw_edited`

#### Critères de validation remplis

- [x] Checkpoint 1 : pilote compile (`cd src-tauri && cargo check`)
- [x] Checkpoint 2 : exports RAW pilotes valides (`cargo test export_pipeline` : 8/8)
- [x] Checkpoint 3 : rapport compatibilite produit (`Docs/Maintenance WASM/RAPPORT-PILOTE-RAW.md`)

#### Impact

- Premier flux RAW backend operationnel en pilote controle (decodeur reel -> pipeline edits -> export fichier).
- Les formats hors scope pilote sont explicitement rejetes pour eviter les faux positifs de compatibilite.

### 2026-03-13 — Maintenance WASM M4.2 : Abstraction decodeur RAW (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m4.2-abstraction-decodeur-raw`
**Type** : Maintenance

#### Résumé

**Cause racine** : en sortie M4.1, le pipeline etait extensible cote transformations, mais il n existait aucun contrat stable pour brancher des decodeurs RAW concrets sans coupler le core a une implementation vendor.

**Solution** : ajout d un module `raw_decoder` avec type intermediaire `LinearImage` et trait `RawDecoder`, puis integration au pipeline via `decode_raw_to_rgba8` et `execute_on_linear_image`, plus une suite de tests de contrat avec mock decodeur.

#### Fichiers créés

- `luminafast-image-core/src/raw_decoder.rs` — contrat decodeur RAW + validations image lineaire
- `luminafast-image-core/tests/raw_decoder_contract.rs` — tests de contrat mock decodeur/pipeline

#### Fichiers modifiés

- `luminafast-image-core/src/lib.rs` — export public `LinearImage` / `RawDecoder`
- `luminafast-image-core/src/pipeline.rs` — conversion lineaire->RGBA et execution pipeline depuis image lineaire
- `luminafast-image-core/src/errors.rs` — erreur explicite `RawDecodeError`

#### Critères de validation remplis

- [x] Checkpoint 1 : trait decodeur defini (`RawDecoder`) + type `LinearImage`
- [x] Checkpoint 2 : mock decodeur passe les tests (`raw_decoder_contract` : 5/5)
- [x] Checkpoint 3 : pipeline compile avec abstraction (`cargo test` core : 26/26)

#### Impact

- Le core dispose maintenant d un point d extension decodeur RAW independant des crates vendor.
- Le flux decodeur lineaire -> pipeline RGBA est verrouille avant la phase pilote M4.3.

# Maintenance — WASM/Core Migration

## M0.1-M5.3 : Migration CORE/WASM, parité, suppression legacy, CI garde-fous

---
