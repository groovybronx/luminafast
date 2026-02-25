# Phase 4.1 — Event Sourcing Engine

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 2-3 jours

---

## Objectif

Implémenter le moteur d'édition non-destructive basé sur Event Sourcing côté Rust : persistance des événements d'édition en SQLite, rejeu (`replay_events`) pour reconstruire l'état courant, snapshots automatiques pour la performance, et commandes Tauri exposées au frontend. Le frontend (editStore) est refactoré pour déléguer la persistance au backend tout en conservant la réactivité UI.

---

## Périmètre

### ✅ Inclus dans cette phase

- Migration SQL : tables `edit_events` et `edit_snapshots`
- Rust : module `src-tauri/src/services/edit_sourcing.rs`
  - `apply_edit_event(image_id, event_type, payload)` → insère en DB
  - `replay_events(image_id)` → reconstruit l'état courant depuis les events
  - `get_edit_history(image_id, limit?)` → retourne les N derniers events
  - `undo_last_edit(image_id)` → supprime le dernier event (ou marque comme annulé)
  - `redo_edit(image_id, event_id)` → rejoue un event précédemment annulé
  - `reset_edits(image_id)` → supprime tous les events d'une image
  - Snapshot automatique tous les 20 events
- Commandes Tauri dans `src-tauri/src/commands/edit.rs` :
  - `apply_edit(image_id, event_type, payload_json)` → Result<EditStateDTO>
  - `get_edit_history(image_id)` → Vec<EditEventDTO>
  - `get_current_edit_state(image_id)` → EditStateDTO (depuis snapshot ou replay)
  - `undo_edit(image_id)` → Result<EditStateDTO>
  - `redo_edit(image_id, event_id)` → Result<EditStateDTO>
  - `reset_edits(image_id)` → Result<()>
- Types Rust : `EditEvent`, `EditSnapshot`, `EditStateDTO`, `EditEventDTO`
- Types TS : `EditEventDTO`, `EditStateDTO`, `EditEventType` dans `src/types/edit.ts`
- Service TS : `src/services/editService.ts` (wrappeurs `invoke()`)
- Refactoring de `src/stores/editStore.ts` : undo/redo/apply connectés au backend
- Tests unitaires Rust (`#[cfg(test)]` dans `edit_sourcing.rs`)
- Tests TS : `src/services/__tests__/editService.test.ts`
- Tests store : `src/stores/__tests__/editStore.test.ts`

### ❌ Exclus intentionnellement

- Rendu pixel réel (Phase 4.2 — CSS filters ou WASM)
- Historique UI avec timeline visuelle (Phase 4.3)
- Comparaison avant/après split-view (Phase 4.4)
- Snapshots nommés par l'utilisateur (Phase 4.3)
- FlatBuffers (simplifié à JSON BLOB pour cette phase)

---

## Dépendances

### Phases

- Phase 1.1 ✅ — Schéma SQLite (images, références FK)
- Phase 1.2 ✅ — Tauri Commands pattern
- Phase 3.1 ✅ — Grille images (image_id disponible)
- Phase 3.5 ✅ — (dernier complétée, non-régression requise)

### Infrastructure

- `rusqlite` déjà dans Cargo.toml ✅
- `serde`/`serde_json` déjà dans Cargo.toml ✅
- `chrono` déjà dans Cargo.toml ✅
- `uuid` déjà dans Cargo.toml ✅
- Vitest + mocks Tauri (`src/test/`) ✅

---

## Schéma SQL (migration 005)

```sql
-- 005_edit_events.sql

CREATE TABLE IF NOT EXISTS edit_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id   INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  event_type TEXT    NOT NULL,  -- 'EXPOSURE', 'CONTRAST', 'SATURATION', 'CROP', 'WHITE_BALANCE', etc.
  payload    TEXT    NOT NULL,  -- JSON: { "param": "exposure", "value": 0.75, "prev_value": 0.0 }
  is_undone  INTEGER NOT NULL DEFAULT 0,  -- 1 = annulé (soft-undo)
  session_id TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edit_events_image_id ON edit_events(image_id, is_undone, created_at);

CREATE TABLE IF NOT EXISTS edit_snapshots (
  image_id    INTEGER PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  snapshot    TEXT    NOT NULL,  -- JSON: état complet { "exposure": 0.5, "contrast": -0.2, ... }
  event_count INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

---

## Types à définir

### Rust (`src-tauri/src/models/edit.rs`)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditEvent {
    pub id: i64,
    pub image_id: i64,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub is_undone: bool,
    pub session_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditSnapshot {
    pub image_id: i64,
    pub snapshot: serde_json::Value,  // Map<param, value>
    pub event_count: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditStateDTO {
    pub image_id: i64,
    pub state: std::collections::HashMap<String, f64>,  // { "exposure": 0.5, ... }
    pub can_undo: bool,
    pub can_redo: bool,
    pub event_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditEventDTO {
    pub id: i64,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub is_undone: bool,
    pub created_at: String,
}
```

### TypeScript (`src/types/edit.ts`)

```typescript
export const EDIT_EVENT_TYPES = [
  'EXPOSURE', 'CONTRAST', 'SATURATION', 'HIGHLIGHTS',
  'SHADOWS', 'WHITES', 'BLACKS', 'CLARITY', 'VIBRANCE',
  'TEMPERATURE', 'TINT', 'SHARPNESS', 'NOISE_REDUCTION',
  'CROP', 'ROTATION',
] as const;

export type EditEventType = typeof EDIT_EVENT_TYPES[number];

export interface EditPayload {
  param: string;
  value: number;
  prev_value?: number;
}

export interface EditEventDTO {
  id: number;
  event_type: EditEventType;
  payload: EditPayload;
  is_undone: boolean;
  created_at: string;
}

export interface EditStateDTO {
  image_id: number;
  state: Record<string, number>;  // { exposure: 0.5, contrast: -0.2, ... }
  can_undo: boolean;
  can_redo: boolean;
  event_count: number;
}
```

---

## Fichiers à Créer/Modifier

### À créer

- `src-tauri/migrations/005_edit_events.sql` — Tables `edit_events` + `edit_snapshots`
- `src-tauri/src/models/edit.rs` — Structs Rust: `EditEvent`, `EditSnapshot`, `EditStateDTO`, `EditEventDTO`
- `src-tauri/src/services/edit_sourcing.rs` — Service Event Sourcing + tests `#[cfg(test)]`
- `src-tauri/src/commands/edit.rs` — Commandes Tauri (apply_edit, get_edit_history, undo_edit, redo_edit, reset_edits, get_current_edit_state)
- `src/types/edit.ts` — Types TS strict
- `src/services/editService.ts` — Wrappeurs `invoke()` camelCase
- `src/services/__tests__/editService.test.ts` — Tests unitaires service
- `src/stores/__tests__/editStore.test.ts` — Tests store refactoré

### À modifier

- `src-tauri/src/models/mod.rs` — Exposer `mod edit`
- `src-tauri/src/services/mod.rs` — Exposer `mod edit_sourcing`
- `src-tauri/src/commands/mod.rs` — Exposer `mod edit`
- `src-tauri/src/lib.rs` — Enregistrer les commandes edit dans `invoke_handler`
- `src/stores/editStore.ts` — Refactoring undo/redo/reset connectés au backend via editService
- `src/types/index.ts` — Re-exporter les types edit si applicable

---

## Logique Métier (Service Rust)

### `replay_events(conn, image_id)` → `HashMap<String, f64>`

```
1. Charger le snapshot le plus récent (si existe)
2. Charger tous les events NON-undone APRÈS le snapshot (ordered by id ASC)
3. Appliquer chaque event sur la map (payload.param = payload.value)
4. Retourner la map résultante
```

### `apply_edit_event(conn, image_id, event_type, payload)` → `EditStateDTO`

```
1. Insérer l'event en DB
2. Compter les events actifs de l'image
3. Si count % 20 == 0 → prendre un snapshot automatique
4. Retourner get_current_edit_state()
```

### `undo_last_edit(conn, image_id)` → `EditStateDTO`

```
1. Trouver le dernier event non-undone (ORDER BY id DESC)
2. Marquer is_undone = 1
3. Invalider le snapshot (le supprimer pour forcer replay fresh)
4. Retourner get_current_edit_state()
```

### Snapshot automatique (tous les 20 events actifs)

```
snapshot = replay_events() → sérialiser en JSON
UPDATE edit_snapshots SET snapshot=?, event_count=?, updated_at=? WHERE image_id=?
(INSERT OR REPLACE)
```

---

## Conventions Tauri (RAPPEL CRITIQUE)

⚠️ **Paramètres Tauri invoke() : camelCase côté TypeScript** (Tauri v2 convertit automatiquement en snake_case Rust)

```typescript
// Frontend (camelCase)
invoke('apply_edit', { imageId: 42, eventType: 'EXPOSURE', payloadJson: JSON.stringify({...}) })

// Rust (snake_case)
#[tauri::command]
async fn apply_edit(image_id: i64, event_type: String, payload_json: String) -> Result<EditStateDTO>
```

---

## Critères de Validation

- [ ] Migration SQL appliquée proprement sans erreur
- [ ] `apply_edit` insère en DB et retourne l'état courant
- [ ] `replay_events(100 events)` s'exécute en <10ms
- [ ] Undo/redo fonctionnent correctement (cycles multiples)
- [ ] Snapshot automatique déclenché à 20 events
- [ ] `reset_edits` vide tous les events de l'image
- [ ] `editStore.ts` undo/redo connectés au backend (plus de `console.warn`)
- [ ] Tests unitaires Rust passent
- [ ] Tests TS passent (service + store)
- [ ] Non-régression : tous les tests des phases précédentes passent
- [ ] Compilation Rust sans warnings

---

## Contexte Architectural

Le projet suit le pattern Event Sourcing pour les éditions : chaque modification d'un paramètre d'image est un event immutable en base. L'état courant est toujours reconstruit par rejeu des events. Les snapshots sont une optimisation de performance (pas une source de vérité).

Le `editStore` actuel (`src/stores/editStore.ts`) contient un état en mémoire uniquement avec des TODO pour undo/redo. Cette phase implémente le backend durable, et le store devient un cache frontend de l'état Rust.

Pattern d'erreur Rust obligatoire : `Result<T, LuminaError>` avec `thiserror` (voir `src-tauri/src/commands/catalog.rs` pour le pattern existant).

Les commandes Tauri existantes sont dans `src-tauri/src/commands/` — suivre exactement le même pattern pour `edit.rs`.
