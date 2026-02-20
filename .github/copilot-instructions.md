# LuminaFast — AI Coding Instructions

**Before working on this project, read [AGENTS.md](../AGENTS.md) in full.** It contains mandatory rules that govern all AI work.

---

## Quick Start for AI Agents

### 1. Project Overview

**LuminaFast** is a Tauri desktop app (macOS-first) for photography Digital Asset Management, inspired by Lightroom Classic.

- **Stack**: React 19 + TypeScript (strict) + Rust + SQLite + Tauri v2
- **Current phase**: Phases 0–2.4 complete. Import pipeline functional (scan → hash → DB → display).
- **Next phase**: Phase 3.1 (Real grid display).
- **Database**: SQLite for transactional data; DuckDB planned for analytics (Phase 6.2).

### 2. Essential Files to Read Before Each Phase

| File | Purpose | When to Read |
|------|---------|-------------|
| [AGENTS.md](../AGENTS.md) | **Mandatory** — project governance rules | Before ANY work |
| `Docs/briefs/PHASE-X.Y.md` | Scope & requirements for your phase | Before starting |
| [Docs/CHANGELOG.md](../Docs/CHANGELOG.md) | Completion status & history | To verify dependencies |
| [Docs/APP_DOCUMENTATION.md](../Docs/APP_DOCUMENTATION.md) | Current architecture & data models | To understand context |
| [Docs/TESTING_STRATEGY.md](../Docs/TESTING_STRATEGY.md) | Test structure & coverage rules | Writing tests |

---

## Architecture Patterns

### Frontend-Backend Communication (Tauri Bridge)

**All backend logic lives in Rust.** Frontend calls via `CatalogService` (TypeScript wrapper):

```typescript
// Frontend (src/services/catalogService.ts)
static async getAllImages(filter?: ImageFilter): Promise<ImageDTO[]> {
  const invoke = this.getInvoke();
  const result = await invoke('get_all_images', { filter });
  return result as ImageDTO[];
}

// Backend (src-tauri/src/commands/catalog.rs)
#[command]
pub async fn get_all_images(state: State<'_, AppState>) -> Result<Vec<ImageDTO>, String> {
  let db = state.db.lock().unwrap();
  // ... database logic
}
```

**Key rule**: Services handle serialization errors. Tauri commands own database access.

### State Management (Zustand)

Four stores manage frontend state—**never use `useState` directly**:

```typescript
// Example: catalogStore.ts
interface CatalogStore {
  images: CatalogImage[];
  selection: Set<number>;
  getFilteredImages: () => CatalogImage[];
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  // ...
}));

// Usage in components:
const { images, selection } = useCatalogStore();
```

**Stores** (`catalogStore`, `uiStore`, `editStore`, `systemStore`) manage all persistent & UI state. Components call store actions, never manage local edits.

### Types vs Implementations (Separation)

- **`src/types/`** → Pure TypeScript interfaces (domain models, events, filters)
- **`src-tauri/src/models/`** → Rust structs (identical to DB schema + serde)
- **`src/services/`** → TypeScript wrapper classes (Tauri communication)
- **`src-tauri/src/commands/`** → Tauri commands (RPC endpoints)
- **`src-tauri/src/services/`** → Rust business logic (hashing, discovery, preview)

Example: `Image` type exists in both TS (`image.ts`) and Rust (`catalog.rs`), kept in sync.

### Database Schema

SQLite with migrations in `src-tauri/src/migrations/001_initial.sql`:

```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY,
  blake3_hash TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  folder_id INTEGER,
  ...
);
CREATE TABLE exif_metadata (
  image_id INTEGER PRIMARY KEY REFERENCES images(id),
  iso INTEGER, aperture REAL, ...
);
```

**Key rule**: Every Tauri command validates input & handles DB errors. No `unwrap()` in production code.

---

## Development Workflows

### Running Tests

```bash
# Frontend tests (Vitest)
npm run test                  # Watch mode
npm run test:run             # Single run
npm run test:run -- src/services/__tests__

# Backend tests (Rust)
npm run rust:test            # All tests
npm run rust:check           # Compile check
cd src-tauri && cargo test --lib -- --test-threads=1  # Sequential (for DB tests)

# Full workflow (recommended before commits)
bash ./scripts/test-workflow.sh all
```

### Building & Running

```bash
# Development (frontend + backend)
npm run tauri:dev            # Hot reload + Rust recompile

# Production build
npm run build                # TS + Vite bundle
npm run tauri:build          # Rust + app package
```

### Type Checking

```bash
npm run type-check           # No emit, fastest
npm run lint                 # ESLint + type checks
npm run lint:fix             # Auto-fix
```

---

## Code Conventions

### TypeScript (Frontend)

- **Strict mode mandatory** (`strict: true` in tsconfig.json)
- **No `any` types** — use `unknown` + type guards if needed
- **Imports**: Absolute via `@/` alias for `src/`
  ```typescript
  import { useCatalogStore } from '@/stores/catalogStore';
  import type { CatalogImage } from '@/types/image';
  ```
- **File naming**: Composed PascalCase (`GridView.tsx`), utils camelCase (`helpers.ts`)
- **Types for props**:
  ```typescript
  interface GridViewProps {
    images: CatalogImage[];
    onSelect: (id: number) => void;
  }
  function GridView({ images, onSelect }: GridViewProps) { ... }
  ```

### Rust (Backend)

- **No `unwrap()` in production** — use `Result<T, E>` + `?` operator
- **Structs with derives**: `#[derive(Debug, Clone, Serialize, Deserialize)]`
- **Error handling**: Use `thiserror` crate for custom error types
  ```rust
  use thiserror::Error;
  
  #[derive(Error, Debug)]
  pub enum CatalogError {
    #[error("Image not found: {0}")]
    NotFound(i64),
    #[error("Database error: {0}")]
    Database(String),
  }
  
  pub fn get_image(db: &Connection, id: i64) -> Result<Image, CatalogError> {
    // ...
  }
  ```
- **Docs for public functions**:
  ```rust
  /// Hash a single file with BLAKE3
  /// Returns hex-encoded hash or error
  pub fn hash_file(path: &str) -> Result<String, Box<dyn std::error::Error>> { ... }
  ```

### Naming Conventions

| Scope | Convention | Example |
|-------|-----------|---------|
| React components | PascalCase | `GridView.tsx`, `MetadataPanel.tsx` |
| TS functions/variables | camelCase | `getFilteredImages()`, `filterText` |
| Rust modules/functions | snake_case | `catalog.rs`, `get_image()` |
| TypeScript types | PascalCase | `CatalogImage`, `ImageFilter` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_THUMB_SIZE`, `MAX_HASH_CACHE` |
| Git branches | kebab-case with phase | `phase/3.1-real-grid-display` |
| Git commits | `phase(X.Y): description` | `phase(2.1): add directory discovery` |

---

## Testing Patterns

### Frontend (Vitest + React Testing Library)

Tests live in `__tests__/` subdirectories next to source files:

```typescript
// src/services/__tests__/catalogService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CatalogService } from '../catalogService';

describe('CatalogService', () => {
  it('should fetch images from Tauri', async () => {
    vi.stubGlobal('window', {
      __TAURI__: {
        invoke: vi.fn().mockResolvedValue([{ id: 1, filename: 'test.jpg' }]),
      },
    });
    
    const images = await CatalogService.getAllImages();
    expect(images).toHaveLength(1);
  });
});
```

### Backend (Rust Tests)

Tests inline with source code using `#[cfg(test)]`:

```rust
// src-tauri/src/services/hashing.rs
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_blake3_hash_consistency() {
    let data = b"test";
    let hash1 = hash_data(data).unwrap();
    let hash2 = hash_data(data).unwrap();
    assert_eq!(hash1, hash2);
  }
}
```

### Coverage Requirements

- **Rust backend**: 80% line coverage (`cargo tarpaulin` via CI)
- **TypeScript frontend**: 70% line coverage (Vitest + `--coverage`)
- **Rule**: Never modify a test to make it pass without documenting why the original assumption was wrong.

---

## Phase-Based Development

Each phase has a brief in `Docs/briefs/PHASE-X.Y.md` defining scope. **Phases cannot be skipped or modified without project owner approval.**

After each phase:

1. ✅ All tests pass (existing + new)
2. ✅ Update `Docs/CHANGELOG.md` with completion entry
3. ✅ Update `Docs/APP_DOCUMENTATION.md` if architecture changed
4. ✅ Create brief for next phase if not exists
5. ✅ No simplified workarounds — fix root cause only

Current status: **All phases 0–2.4 complete.** Phase 3.1 ready to begin.

---

## Common Gotchas

### Database Access (Tauri)

- Tauri commands run in async runtime. Use `tokio::task::block_in_place()` for sync DB calls.
- **Never hold locks across `await` points** — deadlock risk.
- Database path is app-data directory (`~/.config/luminafast/` on macOS).

### Import Modal State

Discovery service scans asynchronously. Import state tracked in `systemStore.importState`:

```typescript
{
  isScanning: boolean;
  filesDiscovered: string[];
  filesIngested: string[];
  currentFile: string | null;
  error: string | null;
}
```

All state changes must flow through store actions, not direct mutations.

### Preview Service Initialization

Preview generation is async and runs in background. Check initialization before calling:

```rust
// In commands, verify preview service is ready
if let Err(e) = commands::preview::init_preview_service(&handle).await {
  return Err(format!("Preview service failed: {}", e));
}
```

### EXIF Extraction

EXIF data uses `kamadak-exif` crate. RAW files (`.RAF`, `.CR3`, `.ARW`) require dedicated RAW parser (`rsraw` crate) for dimensions — not yet fully integrated.

---

## Quick Reference: File Locations

| Task | File(s) |
|------|---------|
| Add Tauri command | `src-tauri/src/commands/*.rs` + `lib.rs` handler |
| Add frontend component | `src/components/*/*.tsx` with `__tests__` |
| Add store state | `src/stores/*.ts` |
| Add type | `src/types/*.ts` + Rust equivalent `src-tauri/src/models/*.rs` |
| Add service | `src/services/*.ts` (frontend) or `src-tauri/src/services/*.rs` (backend) |
| Database migration | `src-tauri/src/migrations/*.sql` |
| Modify DB schema | `001_initial.sql` + update models both sides |

---

## Before Committing

- [ ] `npm run type-check` passes
- [ ] `npm run test:run` passes (frontend)
- [ ] `npm run rust:test` passes (backend)
- [ ] `npm run lint` passes (no warnings)
- [ ] No `any` or `unwrap()` added
- [ ] Tests written for new code
- [ ] CHANGELOG updated if phase complete
- [ ] Branch name follows `phase/X.Y-description`
- [ ] Commit message: `phase(X.Y): description`

---

## Documentation & Support

- **Project governance**: [Docs/GOVERNANCE.md](../Docs/GOVERNANCE.md)
- **Architecture decisions**: [Docs/archives/recommendations.md](../Docs/archives/recommendations.md)
- **Lightroom inspiration**: [Docs/archives/Lightroomtechnique.md](../Docs/archives/Lightroomtechnique.md)
- **Development plan**: [Docs/archives/luminafast_developement_plan.md](../Docs/archives/luminafast_developement_plan.md)

**Questions?** Check AGENTS.md section 5 (Escalation Protocol) for how to raise blockers.
