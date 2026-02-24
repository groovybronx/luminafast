# LuminaFast — Copilot Instructions for AI Coding Agents

> **Start here for immediate context, then refer to specific AGENTS files for detailed conventions.**

---

## 🏗️ Big Picture: What is LuminaFast?

**LuminaFast** is a Tauri-based Digital Asset Management (DAM) application for managing large photography libraries with metadata, smart collections, and non-destructive editing (inspired by Adobe Lightroom Classic).
The project is structured in phases, each with specific features and technical requirements. The codebase is split between a Rust backend (for performance-critical operations) and a TypeScript/React frontend (for UI and user interactions).

---

## 🛠️ Essential Developer Workflows
1. **Phase Workflow**: Follow the phase-based development process (see `AGENTS.md` )
**Rule**: Tests are written IN PARALLEL with code, never after.


---

## 📍 Where to Find Convention Details

> **Don't reinvent — these files have the answers:**

### Global Rules (Always Read First)
- **`AGENTS.md`** (root) — Absolute rules + navigation guide

### Domain-Specific Conventions
- **`src/AGENTS.md`** — TypeScript/React/Zustand/Vitest patterns
- **`src-tauri/AGENTS.md`** — Rust/Tauri/SQLite/error handling patterns
- **`.github/AGENTS.md`** — GitHub Actions / CI/CD config

### Documentation Standards
- **`Docs/AGENTS.md`** — How to write briefs, CHANGELOG, APP_DOCUMENTATION

### Testing Strategy
- **`Docs/TESTING_STRATEGY.md`** — What tests to write, how to structure them, and coverage expectations

---

## ⚠️ Non-Negotiable Rules

1. **No `unwrap()` / `expect()` / `panic!()` in Rust** — use `Result<T, E>` everywhere
2. **No `any` type in TypeScript** — use `unknown` + type guards
3. **Tests run IN PARALLEL with code** — not after
4. **All tests from previous phases must still pass** — check non-regression
5. **Use prepared SQL statements** — never build SQL strings
6. **Business logic in stores** — not scattered in components
7. **Document cause-root in commits** — why, not just what

---

## 🔍 Where to Get Help

| Question | File |
|----------|------|
| "How do I structure a Rust error type?" | `src-tauri/AGENTS.md` § 1.2 |
| "How do I name React components?" | `src/AGENTS.md` § 1.3 |
| "How do I write a Zustand store?" | `src/AGENTS.md` § 2.2 |
| "What's the phase workflow?" | `AGENTS.md` § 2 |
| "What tests do I need to write?" | `Docs/TESTING_STRATEGY.md` |
| "What's the current app state?" | `Docs/APP_DOCUMENTATION.md` |
| "How do I add a Tauri command?" | `src/services/catalogService.ts` (example + `src-tauri/AGENTS.md`) |
| "What does the database schema look like?" | `Docs/archives/Lightroomtechnique.md` |

---

**Start with `AGENTS.md` (root), then jump to domain-specific files as needed.**
