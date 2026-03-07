# LuminaFast — Optimisations & Corrections Futures

> **Ce fichier liste toutes les tâches de maintenance, optimisations et corrections identifiées pendant le développement.**
> À consulter après chaque phase complétée pour identifier les prochaines priorités.
>
> **Dernière mise à jour** : 2026-03-07 (Post-Phase 5.4 Conformity Audit)

---

## 📌 Légende de Priorité

| Symbole | Sévérité | Description |
|---------|----------|------------|
| 🔴 CRITIQUE | Bloque production ou cause régression | Doit être fait avant release |
| 🟠 HAUTE | Impacte UX/perf significativement | À faire avant Phase 6 |
| 🟡 MOYENNE | Nice-to-have, perf improvements | À faire Phase 6-7 |
| 🟢 FAIBLE | Documentation, dev ergonomie | À faire post-launch |

---

## 🚀 **P2 — React 19.2 Optimizations** (Post-Phase 5.4)

### **P2.1 — Add Rating/Flag UI Buttons to Image Cards** 🟠

**Status** : NOT STARTED
**Complexity** : LOW
**Risk** : LOW
**Effort** : 0.5h
**Scope** : LazyLoadedImageCard component

**Description** :
Currently, rating/flag functionality exists in backend + XmpPanel, but images in GridView lack interactive star/flag buttons. Need to add clickable UI for quick feedback without navigating to develop view.

**What to do** :
1. Add `<StarRating>` component (reusable, 1-5 stars)
2. Add `<FlagButton>` component (pick/reject/none toggle)
3. Integrate into LazyLoadedImageCard bottom overlay (appears on hover)
4. Wire to `onRatingChange(id, rating)` + `onFlagChange(id, flag)` callbacks

**Files to create/modify** :
- NEW: `src/components/library/StarRating.tsx` (shared component)
- NEW: `src/components/library/FlagButton.tsx` (shared component)
- MODIFY: `src/components/library/LazyLoadedImageCard.tsx` (add UI + callbacks)

**Tests needed** :
- StarRating click interaction (5 tests)
- FlagButton toggle states (4 tests)
- LazyLoadedImageCard overlay visibility on hover (3 tests)

**Dependencies** :
- Lucide icons (CheckCircle2, XCircle, Star)
- Tailwind CSS utilities

**Blockers** :
- None (can be done independently)

---

### **P2.2 — Refactor useCatalog Hook for Optimistic Rating/Flag Updates** 🟠

**Status** : NOT STARTED
**Complexity** : MEDIUM
**Risk** : MEDIUM-HIGH (Tauri timing race conditions)
**Effort** : 1.5h
**Scope** : useCatalog hook, CatalogService, XmpService

**Description** :
Currently `useCatalog()` has `refreshCatalog()` but no transactional methods for rating/flag updates. Need to add optimistic UI updates with proper error rollback.

**What to do** :
1. Add `onRatingChange(imageId, rating): Promise<void>` to useCatalog hook
2. Add `onFlagChange(imageId, flag): Promise<void>` to useCatalog hook
3. Add `onTagsChange(imageId, tags): Promise<void>` to useCatalog hook
4. Implement optimistic store updates (immediate UI feedback)
5. Add Tauri calls to update SQLite (via `update_image_rating`, `update_image_flag` commands)
6. Add error handling with toast notifications on failure
7. Add rollback logic if Tauri calls fail

**Implementation pattern** :
```typescript
const onRatingChange = useCallback(async (imageId: number, rating: number) => {
  // 1. Save previous state for rollback
  const previousState = storeImages.find(img => img.id === imageId);
  
  // 2. Update store optimistically
  setImages(storeImages.map(img => 
    img.id === imageId ? { ...img, rating } : img
  ));
  
  try {
    // 3. Call Tauri to persist
    await CatalogService.updateImageRating(imageId, rating);
  } catch (error) {
    // 4. Rollback on error
    setImages(storeImages);
    addLog({
      level: 'error',
      message: `Failed to update rating: ${error.message}`
    });
  }
}, [storeImages, setImages, addLog]);
```

**Files to modify** :
- MODIFY: `src/hooks/useCatalog.ts` (add 3 handler methods)
- MODIFY: `src/services/catalogService.ts` (add `updateImageRating()`, `updateImageFlag()`, `updateImageTags()` wrappers)
- MODIFY: `src/types/index.ts` (if needed for new DTO types)

**Tests needed** :
- useCatalog: optimistic update + success (3 tests)
- useCatalog: error rollback (3 tests)
- useCatalog: race condition handling (2 tests)
- CatalogService Tauri integration (4 tests)

**Dependencies** :
- Tauri IPC fully working (✅ verified Phase 5.4)
- Error handling pattern from CatalogService existing methods

**Blockers** :
- Tauri `update_image_rating` command must exist in backend
- Tauri `update_image_flag` command must exist in backend

**Risk Analysis** :
- 🔴 **Race conditions** : Two rapid clicks might create order ambiguity
- 🟠 **Silent failures** : Tauri errors might not propagate to UI
- 🟡 **State synchronization** : uiStore (filters) vs catalogStore (images) drift possible

---

### **P2.3 — Implement useOptimistic with Error Boundaries** 🟠

**Status** : NOT STARTED
**Complexity** : MEDIUM
**Risk** : MEDIUM (React 19.2 stability + error handling)
**Effort** : 1h
**Scope** : App-level error boundaries, component wrappers

**Description** :
Wrap P2.2 optimistic updates with React 19.2's `useOptimistic` hook + ErrorBoundary fallbacks for graceful degradation.

**What to do** :
1. Create `<ErrorBoundary>` wrapper for image card grid
2. Create `<OptimisticUpdateWrapper>` for LazyLoadedImageCard
3. Integrate `useOptimistic()` into LazyLoadedImageCard for transactional rating/flag updates
4. Add error recovery UI (toast with "Retry" button)
5. Add telemetry logging for failed updates

**Implementation pattern** :
```typescript
export const LazyLoadedImageCard = ({ image, ...props }) => {
  const { onRatingChange } = useCatalog();
  const [optimisticRating, addOptimisticRating] = useOptimistic(image.rating, updateFn);
  
  const handleRatingClick = async (newRating) => {
    addOptimisticRating(newRating);
    try {
      await onRatingChange(image.id, newRating);
    } catch (error) {
      // useOptimistic auto-reverts on throw
      showToast({ type: 'error', message: 'Update failed. Retry?' });
    }
  };
  
  return <StarRating value={optimisticRating} onChange={handleRatingClick} />;
};
```

**Files to create/modify** :
- NEW: `src/components/shared/ErrorBoundary.tsx` (reusable error boundary)
- MODIFY: `src/App.tsx` (wrap view components with ErrorBoundary)
- MODIFY: `src/components/library/LazyLoadedImageCard.tsx` (add useOptimistic)
- NEW: `src/hooks/useOptimisticUpdate.ts` (custom hook wrapping useOptimistic + error handling)

**Tests needed** :
- useOptimistic: success path (2 tests)
- useOptimistic: error reverts state (3 tests)
- ErrorBoundary: catches error + shows fallback (2 tests)
- Integration: full flow rating update (2 tests)

**Dependencies** :
- P2.2 must be completed first
- React 19.2 stableRelease

**Blockers** :
- None (but depends on P2.2)

**Risk Analysis** :
- 🟠 **React 19.2 edge cases** : May hit undocumented Suspense/useOptimistic interactions
- 🟡 **Error communication** : Toast system must be reliable

---

### **P2.4 — Activity Component for Tab State Preservation** 🟢

**Status** : NOT STARTED
**Complexity** : LOW
**Risk** : LOW (React 19.2 Activity component well-tested)
**Effort** : 0.5h
**Scope** : App.tsx, view routing

**Description** :
Use React 19.2's `<Activity>` component to preserve DevelopView state (comparison mode, slider values, edit history) when switching to LibraryView and back. Currently, navigation resets all state.

**What to do** :
1. Wrap DevelopView with `<Activity mode={activeView === 'develop' ? 'visible' : 'hidden'}>`
2. Wrap LibraryView with `<Activity mode={activeView === 'library' ? 'visible' : 'hidden'}>`
3. Test that switching between tabs restores previous editor state
4. Verify no memory leaks from hidden Activity instances

**Implementation pattern** :
```typescript
export function App() {
  const activeView = useUiStore(state => state.activeView);
  
  return (
    <div>
      <Activity mode={activeView === 'develop' ? 'visible' : 'hidden'}>
        <DevelopView />
      </Activity>
      
      <Activity mode={activeView === 'library' ? 'visible' : 'hidden'}>
        <LibraryView />
      </Activity>
    </div>
  );
}
```

**Files to create/modify** :
- MODIFY: `src/App.tsx` (wrap view components with Activity)

**Tests needed** :
- Activity: state preserved on tab switch (2 tests)
- Activity: no memory leak on multiple switches (1 test)

**Dependencies** :
- None (React 19.2 built-in)

**Blockers** :
- None

**Risk Analysis** :
- 🟢 **Low risk** — Activity is stable in React 19.2
- 🟡 **Perf** : Hidden activities may still consume memory (monitor with DevTools)

---

## 🔧 **Maintenance & Bug Fixes**

### **M1 — WASM Filter Range Edge Cases Documentation** 🟡

**Status** : IDENTIFIED (Post-Phase 4.2)
**Complexity** : LOW
**Risk** : LOW
**Effort** : 0.5h
**Scope** : wasmRenderingService.ts documentation

**Description** :
Phase 4.2 regression (PR #20) revealed subtle clamping behaviors in WASM filter normalization. More edge cases may exist (e.g., what happens if user inputs clarity=-100?). Document all clipping behavior.

**What to do** :
1. Add table documenting WASM clamping behavior (already partially done in P1)
2. Test all boundary conditions (min, max, negative positives, etc.)
3. Add test cases for edge values
4. Document any asymmetric behavior (clarity always ≥ 0 but contrast can be negative)

**Files to modify** :
- VERIFY: `src/services/wasmRenderingService.ts` (validate P1 doc is sufficient)
- MODIFY: `src/services/__tests__/wasmRenderingService.test.ts` (add edge case tests if missing)

**Tests needed** :
- normalizeFiltersForWasm: boundary values (8 tests)
- renderWithWasm: clamped values visual verification (2 tests)

**Status** : ONGOING (P1 partially addresses)

---

### **M2 — Drag & Drop Collection Detection Robustness** 🟡

**Status** : IDENTIFIED (Phase 3.2b, fixed in commit c703555)
**Complexity** : MEDIUM
**Risk** : MEDIUM (Can cause silent failures)
**Effort** : 1h
**Scope** : GridView drag drop, collection detection

**Description** :
Regression in Phase 3.2b: drag-drop collection ID detection lost due to catalogStore.selection migration to uiStore. Fixed but could regress if similar refactorings happen. Need robust tests.

**What to do** :
1. Add integration tests for drag-drop collection detection
2. Test both single-image and multi-select drag scenarios
3. Verify collection ID correctly extracted from drop zones
4. Add comment explaining selection store location (critical for maintenance)

**Files to modify** :
- MODIFY: `src/components/library/GridView.tsx` (add/enhance drag drop test coverage)
- VERIFY: Selection store reference is correct (must use uiStore, not catalogStore)

**Tests needed** :
- Drag single image to collection (2 tests)
- Drag multi-select to collection (2 tests)
- Collection ID extraction from drop event (2 tests)

**Blocker** : None (can be done independently)

---

### **M3 — SQLite Query Performance Monitoring** 🟡

**Status** : IDENTIFIED (Post-Phase 2, ongoing)
**Complexity** : MEDIUM
**Risk** : LOW
**Effort** : 2h
**Scope** : Logging, backend perf tracking

**Description** :
No systematic perf monitoring for SQLite queries. As catalogue grows (10K+ images), slow queries may go undetected. Need query timing telemetry.

**What to do** :
1. Add query execution timing to all `get_db()` calls
2. Log queries exceeding 500ms threshold
3. Create perf metrics dashboard in frontend (or CLI tool)
4. Identify slow queries + index them

**Files to modify** :
- MODIFY: `src-tauri/src/services/database.rs` (add timing wrapper)
- NEW: `src-tauri/src/services/perf_logger.rs` (perf telemetry)
- OPTIONAL: `src/components/shared/ArchitectureMonitor.tsx` (show perf stats)

**Tests needed** :
- Perf logging accuracy (2 tests)
- Threshold detection (1 test)

**Blocker** : None

---

## 📈 **Performance Optimizations**

### **PERF1 — Virtualization Optimization for 50K+ Images** 🟡

**Status** : IDENTIFIED (Phase 3.1, implemented basic virtualization)
**Complexity** : HIGH
**Risk** : HIGH (Can cause rendering regressions)
**Effort** : 3h
**Scope** : GridView virtualization, item sizing

**Description** :
Current @tanstack/react-virtual implementation works well for 5K images. But at 50K+ images, memory usage and scrolling may degrade. Need:
- Larger item sizes at top level
- Estimated item heights (not fixed)
- Overscan optimization
- Memory pooling of DOM nodes

**What to do** :
1. Profile with 50K+ mock images
2. Measure memory footprint vs scroll fluidity
3. Adjust overscan window size
4. Implement dynamic column count based on viewport
5. Add performance monitoring (FPS counter, memory usage)

**Files to modify** :
- MODIFY: `src/components/library/GridView.tsx` (optimize virtualization params)
- NEW: `src/lib/perfUtils.ts` (perf measurement utilities)
- OPTIONAL: `src/components/shared/PerformanceMonitor.tsx` (dev-only overlay)

**Tests needed** :
- Mock 50K images + scroll performance (1 integration test)
- Memory usage baseline (manual test)
- FPS consistency (1 integration test)

**Blocker** : None (but requires scaled dataset for testing)

---

### **PERF2 — Preview Generation Batch Optimization** 🟡

**Status** : IDENTIFIED (Phase 2.3, implemented basic batching)
**Complexity** : MEDIUM
**Risk** : MEDIUM (Can cause import slowdown if bugs introduced)
**Effort** : 2h
**Scope** : Preview generation pipeline (Tauri Rayon), image processing

**Description** :
Current preview generation uses Rayon thread pool but might be sub-optimal. Can improve by:
- Dynamic batch sizing based on image dimensions
- GPU acceleration (if available)
- Progressive JPEG generation
- Cached intermediate results

**What to do** :
1. Profile preview generation on 1000-image sample
2. Measure CPU/disk I/O bottlenecks
3. Consider libvips GPU modes
4. Implement smart batch sizing

**Files to modify** :
- MODIFY: `src-tauri/src/services/preview_service.rs` (batch optimization)
- VERIFY: Existing tests still pass (no regressions)

**Tests needed** :
- Preview generation: batch processing (2 tests)
- Performance: 1000-image generation baseline (1 test)

**Blocker** : None

---

## 🛡️ **Security & Robustness**

### **SEC1 — Input Validation for User-Provided Paths** 🟠

**Status** : IDENTIFIED (Phase 2.1 Discovery, partially addressed)
**Complexity** : MEDIUM
**Risk** : MEDIUM (Path traversal vulnerability possible)
**Effort** : 1h
**Scope** : FileSystem service, discovery commands

**Description** :
Discovery and ingestion commands accept `folder_path` parameter. Need robust validation to prevent path traversal attacks (e.g., `../../../system/file`).

**What to do** :
1. Add path canonicalization before any FS operations
2. Verify path is within allowed user directories
3. Reject symbolic links (security best practice)
4. Add unit tests for malicious paths

**Files to modify** :
- MODIFY: `src-tauri/src/commands/discovery.rs` (add path validation)
- MODIFY: `src-tauri/src/services/filesystem.rs` (validate before FS ops)
- NEW: Tests for path traversal attacks

**Tests needed** :
- Path validation: allow valid paths (2 tests)
- Path validation: reject traversal (3 tests)
- Path validation: reject symlinks (1 test)

**Blocker** : None

---

### **SEC2 — XMP Injection Prevention** 🟠

**Status** : IDENTIFIED (Phase 5.4, partially addressed)
**Complexity** : MEDIUM
**Risk** : MEDIUM (XML injection via malicious tags)
**Effort** : 1h
**Scope** : XMP service, XML generation

**Description** :
XMP files contain XML that's parsed and regenerated. If user provides malicious tag names or values, XML injection is possible. Need input sanitization.

**What to do** :
1. Sanitize tag names (alphanumeric + underscore + hyphen only)
2. HTML-encode tag values before XML generation
3. Reject tags containing XML special chars (< > & " ')
4. Add tests for malicious inputs

**Files to modify** :
- MODIFY: `src-tauri/src/services/xmp.rs` (sanitize inputs)
- MODIFY: `src/components/metadata/TagsPanel.tsx` (client-side validation too)

**Tests needed** :
- XMP: sanitized tag input (3 tests)
- XMP: malicious value rejection (3 tests)

**Blocker** : None

---

## 📚 **Documentation Improvements**

### **DOC1 — Architecture Diagram with Mermaid** 🟢

**Status** : NOT STARTED
**Complexity** : LOW
**Risk** : LOW
**Effort** : 1h
**Scope** : Docs visualization

**Description** :
Create visual architecture diagram showing:
- Component hierarchy (App → Views → Panels)
- Store relationships (Zustand stores + dependencies)
- Data flow (Tauri IPC)
- Event Sourcing pipeline

**What to do** :
1. Create `Docs/ARCHITECTURE_DIAGRAM.md`
2. Use Mermaid syntax for visual representation
3. Include separate diagrams for:
   - UI component tree
   - State management flow
   - Tauri IPC layer
   - Data persistence pipeline

**Files to create** :
- NEW: `Docs/ARCHITECTURE_DIAGRAM.md`

**Dependencies** : None (Mermaid is rendered by GitHub)

---

### **DOC2 — API Reference (Tauri Commands)** 🟢

**Status** : PARTIALLY DONE (scattered across briefs)
**Complexity** : LOW
**Risk** : LOW
**Effort** : 1h
**Scope** : API documentation

**Description** :
Consolidate all Tauri commands into single reference document with:
- Command signature
- Parameters + types
- Return type
- Error conditions
- Usage examples

**What to do** :
1. Create `Docs/TAURI_API_REFERENCE.md`
2. List all commands (discovery, catalog, xmp, etc.)
3. Include examples for each

**Files to create** :
- NEW: `Docs/TAURI_API_REFERENCE.md`

---

### **DOC3 — Testing Strategy & Test Templates** 🟢

**Status** : IDENTIFIED (Testing strategy exists but templates lacking)
**Complexity** : LOW
**Risk** : LOW
**Effort** : 2h
**Scope** : Testing documentation

**Description** :
Create reusable test templates + best practices guide for contributors.

**What to do** :
1. Create `Docs/TESTING_TEMPLATES.md`
2. Include templates for:
   - React component tests (Vitest + RTL)
   - Hook tests
   - Service tests (Tauri mocking)
   - Integration tests
3. Best practices checklist

---

## 🐛 **Known Bugs & Workarounds**

### **BUG1 — WASM Module Loading Race Condition** 🟡

**Status** : IDENTIFIED (Phase 4.2, mitigated but not fixed)
**Complexity** : MEDIUM
**Risk** : MEDIUM (Occasional white screen on fast navigation)
**Effort** : 1.5h
**Scope** : WASM module initialization, PreviewRenderer

**Description** :
WASM module loading is async but not properly synchronized. If user navigates to DevelopView before WASM finishes loading, rendering fails silently. Mitigated by CSS filter fallback but ideal fix is proper loading state management.

**What to do** :
1. Create WasmModuleProvider context + hook
2. Track WASM loading state globally
3. Show loading spinner in PreviewRenderer while WASM loads
4. Queue rendering ops until WASM ready
5. Add error boundary if WASM fails to load

**Files to create/modify** :
- NEW: `src/contexts/WasmModuleContext.tsx` (global WASM state)
- MODIFY: `src/services/wasmRenderingService.ts` (integrate context)
- MODIFY: `src/components/develop/PreviewRenderer.tsx` (show loading state)

**Tests needed** :
- WASM: loading state transitions (3 tests)
- WASM: error handling (2 tests)
- PreviewRenderer: loading UI (1 test)

**Blocker** : None

---

### **BUG2 — Memory Leak in useExif Hook** 🟡

**Status** : IDENTIFIED (Phase 5.1, suspected but not confirmed)
**Complexity** : MEDIUM
**Risk** : MEDIUM (Can cause slowdown after many image switches)
**Effort** : 1h
**Scope** : useExif hook, Tauri IPC

**Description** :
useExif fetches EXIF data for each image. If user rapidly switches between images, pending Tauri requests might accumulate. Need abort/cleanup on unmount or image ID change.

**What to do** :
1. Profile memory usage while rapidly switching images
2. Add abort controller to Tauri IPC calls
3. Ensure cleanup on unmount
4. Test with DevTools memory profiler

**Files to modify** :
- MODIFY: `src/hooks/useExif.ts` (add abort controller)

**Tests needed** :
- useExif: cleanup on unmount (1 test)
- useExif: abort on imageId change (1 test)

**Blocker** : None

---

## 🔄 **Refactoring Candidates**

### **REF1 — Separate Store Slices for Better Ergonomics** 🟢

**Status** : NOT STARTED
**Complexity** : MEDIUM
**Risk** : MEDIUM (Store refactoring can cause regressions)
**Effort** : 2h
**Scope** : uiStore, editStore, catalogStore

**Description** :
Currently all UI state in single `uiStore`. As app grows, could benefit from:
- `developStore` (DevelopView-specific state: comparisonMode, sliders, edits)
- `libraryStore` (LibraryView-specific: selectedImages, scrollPosition, activeFolder)
- `appStore` (Global: activeView, theme, etc.)

**What to do** :
1. Separate uiStore into domain-specific stores
2. Update all imports
3. Verify no breaking changes
4. Update tests

**Files to modify** :
- MODIFY/SPLIT: `src/stores/uiStore.ts` into multiple stores
- UPDATE: All components importing uiStore

**Tests needed** :
- Store separation: no regressions in state (all existing tests)
- Store separation: cross-store sync still works (3 tests)

**Blocker** : None (nice-to-have refactoring)

---

## 📊 **Summary Table**

| Task ID | Category | Title | Priority | Effort | Risk | Status |
|---------|----------|-------|----------|--------|------|--------|
| P2.1 | Feature | Add Rating/Flag Buttons | 🟠 | 0.5h | 🟢 | NOT STARTED |
| P2.2 | Feature | Refactor useCatalog Hooks | 🟠 | 1.5h | 🟠 | NOT STARTED |
| P2.3 | Feature | useOptimistic + Error Boundaries | 🟠 | 1h | 🟠 | NOT STARTED |
| P2.4 | Feature | Activity Component | 🟢 | 0.5h | 🟢 | NOT STARTED |
| M1 | Maintenance | WASM Edge Cases Docs | 🟡 | 0.5h | 🟢 | ONGOING |
| M2 | Maintenance | Drag & Drop Robustness | 🟡 | 1h | 🟠 | NOT STARTED |
| M3 | Maintenance | SQLite Perf Monitoring | 🟡 | 2h | 🟢 | NOT STARTED |
| PERF1 | Optimization | Virtualization 50K+ | 🟡 | 3h | 🔴 | NOT STARTED |
| PERF2 | Optimization | Preview Generation Batch | 🟡 | 2h | 🟠 | NOT STARTED |
| SEC1 | Security | Path Validation | 🟠 | 1h | 🟠 | NOT STARTED |
| SEC2 | Security | XMP Injection Prevention | 🟠 | 1h | 🟠 | NOT STARTED |
| DOC1 | Docs | Architecture Diagram | 🟢 | 1h | 🟢 | NOT STARTED |
| DOC2 | Docs | Tauri API Reference | 🟢 | 1h | 🟢 | NOT STARTED |
| DOC3 | Docs | Testing Templates | 🟢 | 2h | 🟢 | NOT STARTED |
| BUG1 | Bug Fix | WASM Loading Race | 🟡 | 1.5h | 🟠 | NOT STARTED |
| BUG2 | Bug Fix | useExif Memory Leak | 🟡 | 1h | 🟠 | NOT STARTED |
| REF1 | Refactoring | Store Separation | 🟢 | 2h | 🟠 | NOT STARTED |

---

## 🎯 **Recommended Roadmap**

### **Phase 6 (Immediate — Next Sprint)**

Priority: Fix bugs + add missing UI

1. **BUG1** — WASM Loading Race (1.5h, blocks perf tests)
2. **P2.1** — Rating/Flag Buttons (0.5h, enables next items)
3. **P2.2** — useCatalog Refactor (1.5h, required for P2.3)
4. **SEC1** — Path Validation (1h, security fix)
5. **SEC2** — XMP Injection Prevention (1h, security fix)

**Total Phase 6** : ~5.5h

### **Phase 7 (Post-MVP)**

Priority: Optimizations + robustness

1. **P2.3** — useOptimistic (1h)
2. **P2.4** — Activity Component (0.5h)
3. **M2** — Drag & Drop Tests (1h)
4. **M3** — SQLite Monitoring (2h)
5. **PERF2** — Preview Batch (2h)
6. **DOC1-3** — Documentation (4h)

**Total Phase 7** : ~10.5h

### **Phase 8 (Post-Launch)**

Priority: Scale-up optimizations

1. **PERF1** — Virtualization 50K+ (3h)
2. **REF1** — Store Separation (2h)
3. **BUG2** — Memory Leak (1h)

**Total Phase 8+** : ~6h

---

## 📝 **Notes**

- This file is a living document. Update it after each phase.
- Move completed items to separate "COMPLETED_OPTIMIZATIONS.md" file for archive.
- Estimate times are best-guess; factor in ~20% overhead for testing/debugging.
- Risk assessments assume current codebase state; reassess post-major refactorings.
