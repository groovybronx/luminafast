# Maintenance — Phase 4.2 Conformity (Rendering Pipeline)

> **Statut** : ⬜ **En attente**
> **Duree estimee** : 1-2 jours
> **Date cible** : 2026-02-26+

## Objectif

Aligner l implementation de la Phase 4.2 avec le brief `Docs/briefs/PHASE-4.2.md` en comblant les ecarts fonctionnels, techniques, et documentaires identifiees par Master-Validator.

## Perimetre

### ✅ Inclus dans cette phase

- Ajouter la commande Tauri `get_edit_events` et le wrapper frontend `catalogService.getEditEvents(imageId)`
- Integrer `editStore` avec Event Sourcing et exposer `getAppliedEdits(imageId)`
- Mettre a jour `PreviewRenderer` pour utiliser `editStore` et `getEditEvents`, et supporter le toggle `useWasm`
- Brancher `PreviewRenderer` dans la carte UI (ImageCard ou LazyLoadedImageCard)
- Aligner Phase B avec le brief : dependances WASM dans `src-tauri/Cargo.toml` + configuration `build.rs`
- Ajouter le fichier de tests Rust attendu `src-tauri/src/services/__tests__/image_processing.test.rs`
- Ajouter/ajuster tests d integration TS pour le rendu (PreviewRenderer + wasmRenderingService)
- Mettre a jour `Docs/APP_DOCUMENTATION.md` et `Docs/CHANGELOG.md`

### ❌ Exclus intentionnellement

- Changements du plan de developpement
- Refactor complet du pipeline de rendu ou du module WASM
- Optimisations SIMD avancees ou cache de rendu

### 📋 Reporte

- Develop Sliders UI (Phase 4.3)
- Cache de rendus (Phase 6.1)

## Dependances

### Phases

- Phase 4.1 ✅ completee

### Ressources externes

- wasm-pack (deja utilise dans le repo)

### Test infrastructure

- Vitest + Testing Library
- Rust tests (`cargo test`)

## Fichiers

### A creer

- `src-tauri/src/services/__tests__/image_processing.test.rs` — Tests unitaires pixel (Phase B)
- `src/services/__tests__/previewRenderer.integration.test.tsx` — Integration PreviewRenderer + event edits

### A modifier

- `src-tauri/src/commands/event_sourcing.rs` — Ajouter commande `get_edit_events(image_id)`
- `src-tauri/src/lib.rs` — Enregistrer `get_edit_events` dans `invoke_handler`
- `src/services/catalogService.ts` — Ajouter `getEditEvents(imageId)`
- `src/stores/editStore.ts` — Ajouter `getAppliedEdits(imageId)` et logique d integration
- `src/components/library/PreviewRenderer.tsx` — Brancher editStore + useWasm + wasmRenderingService
- `src/components/library/LazyLoadedImageCard.tsx` (ou ImageCard) — Remplacer `<img>` par `PreviewRenderer`
- `src/services/wasmRenderingService.ts` — Optionnel: API adapte a `PreviewRenderer` si besoin
- `src-tauri/Cargo.toml` — Ajouter `wasm-bindgen`, `web-sys`, `js-sys` (selon brief)
- `src-tauri/build.rs` — Configurer build WASM (selon brief)
- `Docs/APP_DOCUMENTATION.md` — Ajouter section "Systeme de Rendu"
- `Docs/CHANGELOG.md` — Documenter correction de conformite

## Interfaces Publiques

### Tauri Commands

```rust
#[tauri::command]
pub fn get_edit_events(image_id: i64, state: State<AppState>) -> Result<Vec<EventDTO>, CommandError>;
```

### TypeScript Services

```typescript
export async function getEditEvents(imageId: number): Promise<EventDTO[]>;
```

### Store Actions

```typescript
getAppliedEdits: (imageId: number) => CSSFilterState | PixelFilterState;
```

## Contraintes Techniques

### Rust Backend

- Pas de `unwrap()`
- Validation input (image_id > 0)
- Erreurs explicites (thiserror ou CommandError)

### TypeScript Frontend

- Strict mode, pas de `any`
- Error handling sur appels Tauri
- `PreviewRenderer` ne doit pas faire de fetch global des events

## Architecture Cible

```
PreviewRenderer
  -> editStore.getAppliedEdits(imageId)
  -> renderingService.eventsToCSSFilters()
  -> <img style={{ filter: ... }} />
  -> useWasm ? wasmRenderingService.renderWithWasm(...) : CSS
```

## Checkpoints

- [ ] Commande `get_edit_events` ajoutee et enregistree
- [ ] `catalogService.getEditEvents` + `editStore.getAppliedEdits` implementes
- [ ] `PreviewRenderer` integre dans la carte UI
- [ ] Tests Rust `image_processing.test.rs` passent
- [ ] Tests Vitest PreviewRenderer + integration passes
- [ ] Docs `APP_DOCUMENTATION` + `CHANGELOG` mises a jour

## Risques

- Desynchronisation event store / editStore
- Regression UI si PreviewRenderer remplace la carte sans tests

## Documentation Attendue

### CHANGELOG

- Ajouter une entree maintenance "Phase 4.2 Conformity"

### APP_DOCUMENTATION

- Ajouter section "Systeme de Rendu" (CSS + WASM + flux Event Sourcing)

## Criteres de Completion

- [ ] Tous les ecarts Phase 4.2 listes par Master-Validator sont resolus
- [ ] Tests passes (TS + Rust) et non-regression
- [ ] Documentation a jour
