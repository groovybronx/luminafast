# Parite Preview/Export - M3.3

Statut : Complete
Date : 2026-03-13
Perimetre : Contrat de coherence preview (WASM) vs export backend (pipeline non destructif)

## 1) Root cause

Symptome observe : apres M3.2, l export backend et la preview WASM partageaient bien le meme moteur core, mais aucun garde-fou automatise ne validait encore que le rendu final export restait aligne avec la preview pour les memes presets.

Cause racine technique : absence de protocole de comparaison buffer a buffer entre la sortie preview de reference et la sortie du pipeline export (events/snapshots -> PixelFilters -> rendu -> ecriture fichier).

Correction structurelle : ajout d un contrat de parite executable avec presets communs, seuil numerique fixe, et tests automatises cote backend + frontend.

## 2) Protocole de comparaison

- Source : buffers RGBA deterministes (5 cas representatifs)
- Preview de reference : `luminafast_image_core::apply_filters` avec normalisation UI identique au frontend
- Export teste : `export_image_with_edits` en sortie TIFF (format lossless)
- Comparaison : delta absolu moyen RGB sur buffer brut

Formule utilisee :

$$
\Delta_{mean} = \frac{1}{3N}\sum_{i=1}^{N} (|R_i^{exp} - R_i^{ref}| + |G_i^{exp} - G_i^{ref}| + |B_i^{exp} - B_i^{ref}|)
$$

## 3) Presets communs M3.3

- low_light
- highlights
- high_contrast
- skin_warm
- mixed_interior_exterior

Ces presets sont maintenant declares a la fois dans :

- `src/services/__tests__/wasmRenderingService.test.ts`
- `src-tauri/src/services/tests/parity_preview_export.rs`

## 4) Seuil de tolerance

- Seuil fixe du contrat : `delta moyen RGB <= 2`
- Constante frontend : `PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD = 2`
- Constante backend : `PREVIEW_EXPORT_PARITY_DELTA_THRESHOLD = 2.0`

## 5) Resultats de validation

Backend (Rust):

- `cargo test parity_preview_export` : 2/2 OK
- `test_preview_export_parity_with_events_only` : OK
- `test_preview_export_parity_with_snapshot_seed` : OK

Frontend (TypeScript):

- `npx vitest run src/services/__tests__/wasmRenderingService.test.ts` : 35/35 OK
- Validation presets communs + normalisation stable : OK
- `npm run lint` : OK
- `npm run test:ci` : 693/693 OK

Qualite globale:

- `npm run type-check` : OK
- `cd src-tauri && cargo check` : OK
- `cd src-tauri && cargo clippy --all-targets -- -D warnings` : OK
- `cd src-tauri && cargo test` : 240/240 OK

## 6) Impact

- Gate G4 prepare avec preuve executable de coherence preview/export.
- Toute derive de normalisation UI->core ou de reconstruction events/snapshots est desormais detectee automatiquement.
