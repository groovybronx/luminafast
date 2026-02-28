## Plan: Phase 4.2 Conformity Alignment

Align Phase 4.2 to the maintenance brief: add `get_edit_events`, integrate `editStore` with event sourcing, wire `PreviewRenderer` into the image card, and complete WASM rendering filters. We will use the brief’s event format (`ImageEdited` with `edits` map), swap `PreviewRenderer` into ImageCard, and finish clarity/vibrance/curves/vignette in Rust with tests. We will also update the required docs and changelog, keeping tests in parallel with code per governance.

**Steps**

1. Verify current phase status and scope in `Docs/CHANGELOG.md` and confirm the target brief requirements in `Docs/briefs/MAINTENANCE-PHASE-4.2-CONFORMITY.md` and `Docs/briefs/PHASE-4.2.md`.
2. Backend events: add `get_edit_events(image_id)` command and register it, plus adjust event model to emit/return `ImageEdited` with `edits` map. Touch `src-tauri/src/commands/event_sourcing.rs`, `src-tauri/src/lib.rs`, and the event types in `src-tauri/src/models/event.rs`.
3. Frontend services + store: add `catalogService.getEditEvents(imageId)` in `src/services/catalogService.ts` and integrate `editStore.getAppliedEdits(imageId)` using the event stream in `src/stores/editStore.ts`.
4. Rendering pipeline: update `src/services/renderingService.ts` to consume the new `ImageEdited` payloads and update `src/components/library/PreviewRenderer.tsx` to use `editStore.getAppliedEdits`, `getEditEvents`, and the `useWasm` toggle.
5. UI integration: replace the `<img>` in `src/components/library/ImageCard.tsx` with `PreviewRenderer` while preserving sizing/selection behavior.
6. WASM + Rust filters: complete clarity/vibrance/curves/vignette algorithms in `src-tauri/src/services/image_processing.rs` and ensure WASM build deps are declared in `src-tauri/Cargo.toml` and build wiring in `src-tauri/build.rs` per the brief.
7. Tests (in parallel): add Rust tests in `src-tauri/src/services/__tests__/image_processing.test.rs` and TS integration tests in `src/services/__tests__/previewRenderer.integration.test.tsx`, plus any necessary updates to existing tests for new event payloads.
8. Documentation: update `Docs/APP_DOCUMENTATION.md` with the rendering system section and add a maintenance entry in `Docs/CHANGELOG.md`. Create the next brief if required by the workflow in `Docs/briefs`.

**Verification**

- Run Rust tests: `cargo test` (or scope to image processing tests if needed).
- Run frontend tests: `npm test` or `vitest` with the new integration tests.
- Manual UI check: verify image cards render with `PreviewRenderer` and toggling `useWasm` switches the rendering path without regression.

**Decisions**

- Event format: align to brief `ImageEdited` with `edits` map.
- UI integration target: `ImageCard`.
- Phase B completeness: implement missing filters now.
