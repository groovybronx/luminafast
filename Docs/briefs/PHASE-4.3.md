# Phase 4.3 — Historique & Snapshots UI

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 2-3 jours

---

## Objectif

Implémenter un panneau historique interactif affichant la timeline des éditions d'une image, permettant la navigation temporelle (time-travel) en cliquant sur un événement, la création de snapshots nommés, et la réinitialisation aux états d'import. Le frontend affiche l'historique des events Phase 4.1 et permet de rejouer l'état complet via `replay_events()` du backend.

---

## Périmètre

### ✅ Inclus dans cette phase

**Backend Rust:**
- Aucun changement à `edit_sourcing.rs` (Phase 4.1) — fonctionnalités de base déjà présentes
- Service Rust : `src-tauri/src/services/history_service.rs` (nouveau)
  - `get_event_timeline(image_id: u32, limit?: u32) -> Vec<EditEventDTO>` — retourne N derniers events avec metadata
  - `create_snapshot(image_id: u32, name: String, description?: String) -> Result<SnapshotDTO, String>` — sauvegarde l'état actuel
  - `get_snapshots(image_id: u32) -> Vec<SnapshotDTO>` — liste les snapshots
  - `delete_snapshot(snapshot_id: u32) -> Result<(), String>`
  - `restore_to_snapshot(snapshot_id: u32) -> Result<(), String>` — restaure vers un snapshot (rejoue events jusqu'au snapshot)
  - `restore_to_event(image_id: u32, event_id: u32) -> Result<EditStateDTO, String>` — restaure vers un event spécifique
  - `count_events_since_import(image_id: u32) -> u32` — compte les edits appliqués

- Tauri commands dans `src-tauri/src/commands/history.rs` (nouveau)
  - `get_event_timeline(image_id: i64, limit?: i64)` → Result<Vec<EditEventDTO>>
  - `create_snapshot(image_id: i64, name: String, description?: String)` → Result<SnapshotDTO>
  - `get_snapshots(image_id: i64)` → Result<Vec<SnapshotDTO>>
  - `delete_snapshot(snapshot_id: i64)` → Result<()>
  - `restore_to_snapshot(snapshot_id: i64)` → Result<EditStateDTO>
  - `restore_to_event(image_id: i64, event_id: i64)` → Result<EditStateDTO>
  - `count_events_since_import(image_id: i64)` → Result<u32>

- Schema SQL (migration 006 — snapshots & metadata)
  ```sql
  CREATE TABLE IF NOT EXISTS edit_snapshots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id     INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    description  TEXT,
    event_count  INTEGER NOT NULL,    -- nombre d'events replayed
    snapshot_state TEXT NOT NULL,     -- JSON EditStateDTO
    created_at   TEXT    DEFAULT (datetime('now')),
    branch_from_event_id INTEGER REFERENCES edit_events(id)
  );
  ```

- Tests Rust: `src-tauri/tests/history_integration.rs`
  - Test getEventTimeline, createSnapshot, restoreToEvent, deleteSnapshot
  - Coverage ≥80%

**Frontend TypeScript:**
- Créer `src/types/history.ts`:
  - `EditEventDTO` (id, imageId, eventType, payload, timestamp, isCancelled)
  - `SnapshotDTO` (id, imageId, name, description, eventCount, createdAt)
  - `HistoryTimelineItem` (union de EditEventDTO | SnapshotDTO)

- Créer `src/services/historyService.ts`:
  - `getEventTimeline(imageId: number, limit?: number)` → Promise<EditEventDTO[]>
  - `createSnapshot(imageId: number, name: string, desc?: string)` → Promise<SnapshotDTO>
  - `getSnapshots(imageId: number)` → Promise<SnapshotDTO[]>
  - `restoreToEvent(imageId: number, eventId: number)` → Promise<EditStateDTO>
  - `restoreToSnapshot(snapshotId: number)` → Promise<EditStateDTO>
  - `deleteSnapshot(snapshotId: number)` → Promise<void>
  - `countEventsSinceImport(imageId: number)` → Promise<number>
  - Cache local pour timeline (invalidate on new edit)

- Tests TS: `src/services/__tests__/historyService.test.ts`
  - Mock Tauri invoke
  - Test cache, deletion, restoration
  - Coverage ≥70%

- Créer `src/components/develop/HistoryPanel.tsx` (nouveau ou refactor existing)
  - Layout vertical: timeline sur le côté gauche (200px fixed)
  - Timeline structure:
    - Snapshots (visual: star icon + name)
    - Events (visual: event type icon + param value + timestamp)
    - "Import" baseline au bottom
  - Interactive:
    - Hover event → preview state changes
    - Click event → restore to that event (trigger editStore update)
    - Click snapshot → restore to snapshot
    - Right-click event → show context menu (create snapshot, mark as branch point)
    - Scroll up/down to load more events (pagination, limit 50 by default)
  - Buttons:
    - "Create Snapshot" → modal input name + optional description
    - "Reset to Import" → confirm → restore all edits to empty state
  - Visual indicators:
    - Current state highlighted (bold or colored background)
    - Modified since snapshot (indicator dot)
    - Unsaved edits (asterisk)

- Modify `src/stores/editStore.ts`:
  - After `applyEdit()`, invalidate historyService cache
  - Track current "position" in history (which event we're at)
  - On restore: `replaceAllEdits(newEditState)` instead of individual edits

- Modify `src/components/develop/DevelopView.tsx`:
  - Add HistoryPanel to layout (left sidebar area, collapsible)
  - When history restore triggered: update sliders to match restored state
  - Visual feedback: brief flash/animation showing state changed

- Tests TS: `src/components/develop/__tests__/HistoryPanel.test.ts`
  - Mock historyService
  - Mock editStore
  - Test click event → restore
  - Test create snapshot modal
  - Test reset confirmation
  - Coverage ≥70%

### ❌ Exclus intentionnellement

- Diff viewer (detailed comparison of which fields changed) — reporté Phase 4.4
- Branching/forking from a historical state (stay on current branch)
- Animated timeline playback (skip → restore → done)
- Save snapshots to XMP sidecar (Phase 5.4 - Sidecar XMP)
- Export edit history as PDF/JSON report
- Collaborative editing history merge (Phase 8)

---

## Dépendances

### Phases

- **Phase 4.1** ✅ — Event Sourcing (events persisted, `replay_events()` exists)
- **Phase 4.2** ✅ — Pipeline Rendu (CSS filters working, `computeCSSFilters()` available)
- **Phase 3.1** ✅ — Grille images (image_id selection)

### Ressources Externes

- Phase 4.1 Types: `EditEventDTO`, `EditStateDTO` from `src/types/edit.ts`
- Tauri invoke available ✅
- SQLite migrations infrastructure ready ✅

### Test Infrastructure

- Vitest configured ✅
- Tauri mocks available ✅
- Rust test framework ready ✅

---

## Schéma SQL (migration 006)

```sql
-- 006_edit_snapshots.sql

CREATE TABLE IF NOT EXISTS edit_snapshots (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id            INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  name                TEXT    NOT NULL,
  description         TEXT,
  event_count         INTEGER NOT NULL,
  snapshot_state      TEXT    NOT NULL,  -- JSON serialized EditStateDTO
  created_at          TEXT    DEFAULT (datetime('now')),
  branch_from_event_id INTEGER REFERENCES edit_events(id),

  UNIQUE(image_id, name)  -- Can't have duplicate snapshot names per image
);

CREATE INDEX idx_edit_snapshots_image_id ON edit_snapshots(image_id);
CREATE INDEX idx_edit_snapshots_created_at ON edit_snapshots(created_at DESC);
```

---

## Fichiers à Créer/Modifier

### À créer

- **`src-tauri/src/services/history_service.rs`** — History & snapshot logic
- **`src-tauri/src/commands/history.rs`** — Tauri commands
- **`src-tauri/migrations/006_edit_snapshots.sql`** — Schema for snapshots
- **`src-tauri/tests/history_integration.rs`** — Rust integration tests
- **`src/types/history.ts`** — TypeScript interfaces
- **`src/services/historyService.ts`** — Service wrapper + cache
- **`src/services/__tests__/historyService.test.ts`** — TS tests
- **`src/components/develop/HistoryPanel.tsx`** — Timeline UI component
- **`src/components/develop/__tests__/HistoryPanel.test.ts`** — Component tests

### À modifier

- **`src-tauri/src/lib.rs`** — Register new module `pub mod history_service;` + commands via `invoke_handler!`
- **`src-tauri/Cargo.toml`** — No new dependencies (utiliser chrono, serde déjà présents)
- **`src/stores/editStore.ts`** — Invalidate history cache on edits
- **`src/components/develop/DevelopView.tsx`** — Add HistoryPanel to layout
- **`Docs/APP_DOCUMENTATION.md`** — Section "5. Historique & Time-Travel"
- **`Docs/CHANGELOG.md`** — Nouvelle entrée après complétion

---

## Interfaces Publiques

### Tauri Commands

```rust
#[tauri::command]
pub async fn get_event_timeline(
    image_id: i64,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<EditEventDTO>, String>;

#[tauri::command]
pub async fn create_snapshot(
    image_id: i64,
    name: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<SnapshotDTO, String>;

#[tauri::command]
pub async fn restore_to_event(
    image_id: i64,
    event_id: i64,
    state: State<'_, AppState>,
) -> Result<EditStateDTO, String>;

#[tauri::command]
pub async fn restore_to_snapshot(
    snapshot_id: i64,
    state: State<'_, AppState>,
) -> Result<EditStateDTO, String>;

#[tauri::command]
pub async fn delete_snapshot(
    snapshot_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String>;
```

### TypeScript DTOs

```typescript
// src/types/history.ts

export interface EditEventDTO {
  id: number;
  imageId: number;
  eventType: string;      // 'EXPOSURE', 'CONTRAST', etc.
  payload: Record<string, unknown>;
  timestamp: string;      // ISO 8601
  isCancelled: boolean;
}

export interface SnapshotDTO {
  id: number;
  imageId: number;
  name: string;
  description?: string;
  eventCount: number;     // Number of events included in snapshot
  createdAt: string;      // ISO 8601
}

export type HistoryTimelineItem = EditEventDTO | SnapshotDTO;

export interface HistoryTimelineResponse {
  events: EditEventDTO[];
  snapshots: SnapshotDTO[];
  totalEventCount: number;
}
```

### Service

```typescript
// src/services/historyService.ts

export const historyService = {
  getEventTimeline(imageId: number, limit?: number): Promise<EditEventDTO[]>,
  createSnapshot(imageId: number, name: string, desc?: string): Promise<SnapshotDTO>,
  getSnapshots(imageId: number): Promise<SnapshotDTO[]>,
  restoreToEvent(imageId: number, eventId: number): Promise<EditStateDTO>,
  restoreToSnapshot(snapshotId: number): Promise<EditStateDTO>,
  deleteSnapshot(snapshotId: number): Promise<void>,
  countEventsSinceImport(imageId: number): Promise<number>,
  invalidateCache(imageId: number): void,
};
```

---

## Contraintes Techniques

### Rust Backend

- **Error Handling** : All `Result<T, String>`, no `unwrap()`
- **Input Validation** : imageId > 0, eventId > 0, snapshot name not empty
- **Performance** : `get_event_timeline()` <100ms even with 1000+ events
- **Database** : Use transactions for snapshot creation, rollback on error
- **Concurrency** : Handle simultaneous edits + snapshot creation safely (lock DB)

### TypeScript Frontend

- **Strict Mode** : `"strict": true`
- **No `any`** : All types explicit
- **Cache Strategy** : LRU cache per imageId, invalidate on new edit or restore
- **Performance** : Timeline scroll smooth 60fps, pagination for 1000+ events
- **Memory** : Don't load all events at once, use pagination (limit 50)
- **Error Handling** : Try/catch on `invoke()`, show toast on failure

### UI/UX

- **Timeline responsive** : Works on 1920x1080 down to 1366x768
- **Accessibility** : Keyboard navigation (arrow keys for timeline), voice labels
- **Visual hierarchy** : Current state obvious, snapshots distinct from events
- **Undo/Redo** : "Reset to Import" should NOT be undoable (confirmation required)

---

## Architecture Cible

### Flux de Données

```
HistoryPanel rendered
  ↓
edits$.subscribe() from editStore
  ↓
historyService.invalidateCache()
  ↓
User clicks event in timeline
  ↓
historyService.restoreToEvent(imageId, eventId)
  ↓
Rust: replay_events(image_id) from Phase 4.1 → rebuild EditStateDTO up to that event
  ↓
Frontend: editStore.replaceAllEdits(newState)
  ↓
DevelopView sliders update to new state
  ↓
renderService.invalidateCache() → recompute CSS filters
  ↓
Preview updates instantly
```

### Timeline UI Structure

```
[Create Snapshot] [Reset to Import]

┌─────────────────────────────┐
│ Snapshot "Before edits" ✓   │  ← Click to restore
│ 12:34 PM — 5 events        │
│                             │
│ ● EXPOSURE +0.75           │  ← Events
│   12:32 PM                  │
│                             │
│ ● CONTRAST +0.2             │
│   12:31 PM                  │
│                             │
│ ═══════════════════════════ │
│ IMPORT (baseline)           │  ← Bottom marker
└─────────────────────────────┘

^ Current position (bold highlight)
```

### Cache Strategy

```
Frontend cache Map<imageId, {events: EditEventDTO[], hash: string, timestamp}>

Invalidation triggers:
  - editStore.applyEdit() → invalidateCache
  - historyService.restoreToEvent() → invalidateCache
  - historyService.restoreToSnapshot() → invalidateCache
  - User switches to different image → clear old cache
```

---

## Dépendances Externes

### Rust (`src-tauri/Cargo.toml`)

- `chrono` (déjà présent) ✅ — Timestamps
- `serde` / `serde_json` (déjà présents) ✅ — Serialization
- `rusqlite` (déjà présent) ✅ — Database

### TypeScript (`package.json`)

- Toutes les dépendances déjà présentes ✅

### System

- Aucune dépendance système supplémentaire

---

## Checkpoints

- [ ] **Checkpoint 1** : `src-tauri/src/services/history_service.rs` compiles (`cargo check`)
- [ ] **Checkpoint 2** : `src-tauri/src/commands/history.rs` + Tauri commands working
- [ ] **Checkpoint 3** : Migration 006 applies correctly, snapshots table created
- [ ] **Checkpoint 4** : Frontend service `historyService.ts` implemented + cache logic working
- [ ] **Checkpoint 5** : HistoryPanel component renders timeline correctly
- [ ] **Checkpoint 6** : Click event → restore functionality working end-to-end
- [ ] **Checkpoint 7** : Create snapshot modal → snapshot saved to DB + appears in timeline
- [ ] **Checkpoint 8** : Reset to Import button prompts confirmation → clears all edits
- [ ] **Checkpoint 9** : Rust integration tests pass (≥80% coverage)
- [ ] **Checkpoint 10** : TS component tests pass (≥70% coverage)
- [ ] **Checkpoint 11** : All Phase 0→4.2 tests still pass (non-régression)
- [ ] **Checkpoint 12** : APP_DOCUMENTATION and CHANGELOG updated

---

## Pièges & Risques Connus

### Pièges Courants

1. **Snapshot state mismatch** — If we save a snapshot but later the edit_events get deleted, snapshot becomes orphaned
   - **Solution** : Test orphan scenario, handle gracefully (show "snapshot unavailable" if events gone)

2. **Timeline not updating after new edit** — Cache not invalidated
   - **Solution** : Subscribe to editStore changes, invalidate cache on every `applyEdit()`

3. **Restoring stale edits** — User edits A, creates snapshot, edits B, restores snapshot → should lose edits B
   - **Solution** : Clear editStore completely, reload from DB via `replay_events()`

4. **Performance issue** — 1000+ events, loading all at once → slow
   - **Solution** : Pagination (load 50 initially, more on scroll)

5. **Database transaction deadlock** — Concurrent edit + snapshot creation
   - **Solution** : Use explicit transactions with timeouts (Phase 1.1 pattern)

### Risques Potentiels

- **Memory leak** : Timeline cache growing unbounded if user never switches images
  - **Mitigation** : LRU eviction, max 5 images cached

- **UI lag** : HistoryPanel scroll with 1000+ events
  - **Mitigation** : Virtualize timeline using `@tanstack/react-virtual`

- **Data loss** : User resets to import by accident, loses work
  - **Mitigation** : Show confirmation dialog, clear button is red/emphasized

### Solutions Préventives

1. Profile HistoryPanel with 1000 events, measure DOM update time
2. Test restore flow: edit → snapshot → more edits → restore → verify state correct
3. Test orphan snapshot: create snapshot → manually delete events in DB → try restore
4. Test cache invalidation: edit → check cache hit → new edit → cache miss

---

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| 4 | 4.3 | Historique & Snapshots UI | ✅ Complétée | YYYY-MM-DD | Copilot |

**Details (Phase 4.3 — Historique & Time-Travel)**:

**Changements clés**:
- Service Rust `history_service.rs` : timeline, snapshots, restore logic
- Tauri commands : `get_event_timeline()`, `create_snapshot()`, `restore_to_event()`, etc.
- HistoryPanel component : interactive timeline avec time-travel capability
- Migration 006 : `edit_snapshots` table + indices
- editStore refactor : `replaceAllEdits()` for snapshot restoration

**Tests** :
- Rust integration tests : snapshot create/restore, orphan handling
- TS component tests : timeline rendering, click interactions, cache

**Fichiers** :
- Créés : `src-tauri/src/services/history_service.rs`, `src-tauri/src/commands/history.rs`, `src-tauri/migrations/006_edit_snapshots.sql`, `src/types/history.ts`, `src/services/historyService.ts`, `src/components/develop/HistoryPanel.tsx`
- Modifiés : `DevelopView.tsx`, `editStore.ts`, `APP_DOCUMENTATION.md`

**Non-régression** : Tous tests Phase 0→4.2 ✅ (600 tests)
```

### APP_DOCUMENTATION.md Sections to Update

**Add new section** (after "4. Pipeline Rendering"):

```markdown
## 5. Historique & Time-Travel

### Vue d'ensemble

Users can navigate the complete edit history, create named snapshots, and restore to any previous state.

### Timeline Components

- **Events** : Recorded edits (EXPOSURE, CONTRAST, etc.) with timestamp
- **Snapshots** : User-created checkpoints with custom name
- **Import** : Baseline state (no edits)

### Time-Travel Mechanism

Click any event/snapshot → `restoreToEvent()` or `restoreToSnapshot()` called

→ Backend replays edit_events up to that point via `replay_events()`

→ Frontend state synchronized via `editStore.replaceAllEdits()`

→ Sliders + preview update instantly

### Create Snapshot

Click "Create Snapshot" button → Modal input name → Save to `edit_snapshots` table

Snapshot captures:
- Current EditState
- Event count at that moment
- User-provided name + optional description

### Reset to Import

"Reset to Import" button → Confirmation (destructive!) → Clears all edits

→ Restores to empty EditStateDTO (baseline)

### Performance

- Timeline pagination : Load 50 events initially, lazy-load on scroll
- Snapshot restoration : <100ms via replay_events()
- Timeline scroll: 60fps with virtual scrolling
```

---

## Critères de Complétion

### Architecture & Design
- [ ] Timeline UI mockup approved
- [ ] Snapshot schema finalized
- [ ] Data flow diagram (edit → snapshot → restore) clear

### Backend (Rust)

- [ ] `cargo check` ✅ (0 errors)
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] `history_service.rs` handles all snapshot operations
- [ ] `replay_events()` chain working (Phase 4.1 integration)
- [ ] Migration 006 runs cleanly
- [ ] Concurrent edits + snapshot creation safe (transactions)
- [ ] Rust integration tests pass (≥80% coverage)
- [ ] No `unwrap()` in production code

### Frontend (TypeScript)

- [ ] `tsc --noEmit` ✅ (0 type errors)
- [ ] `npm run lint` ✅
- [ ] HistoryPanel component fully functional
- [ ] Timeline scroll smooth 60fps with 1000+ events
- [ ] Click event → restore works end-to-end
- [ ] Create snapshot modal functional
- [ ] Reset to Import shows confirmation
- [ ] Cache invalidation working (new edits clear cache)
- [ ] TS tests pass (≥70% coverage)
- [ ] No `any` types

### Integration

- [ ] Tauri IPC commands callable and working
- [ ] Data flow: click timeline → restore → state updated complete
- [ ] editStore.replaceAllEdits() correct (replaces ALL edits, not merges)
- [ ] Sliders update to restored state correctly
- [ ] Filters updated (CSS filters recomputed)
- [ ] DevelopView integrates HistoryPanel smoothly

### Non-Regression

- [ ] All Phase 0.1→4.2 tests pass ✅
  - Rust: 185+ tests
  - TypeScript: 399+ tests
- [ ] No visual regressions in existing UI
- [ ] Import/discovery unaffected
- [ ] Event Sourcing (Phase 4.1) still working
- [ ] CSS Filters (Phase 4.2) still working

### Documentation & Deployment

- [ ] `APP_DOCUMENTATION.md` updated (Section 5)
- [ ] `CHANGELOG.md` entry added
- [ ] Brief marked ✅ Complétée
- [ ] Code compiles on macOS, Windows, Linux (CI green)

---

## Ressources Additionnelles

- **Phase 4.1** : `Docs/briefs/PHASE-4.1.md` (Event Sourcing, edit_events table)
- **Phase 4.2** : `Docs/briefs/PHASE-4.2.md` (CSS Filters)
- **Frontend AGENTS** : `src/AGENTS.md` (React patterns, testing)
- **Backend AGENTS** : `src-tauri/AGENTS.md` (Rust patterns, DB, transactions)
- **React Virtualization** : https://tanstack.com/virtual/latest/docs/guide/introduction (for 1000+ item lists)
