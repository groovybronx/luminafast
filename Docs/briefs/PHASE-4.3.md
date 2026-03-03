# Phase 4.3 — Historique & Snapshots UI

> **Statut** : ✅ **Complétée**
> **Durée estimée** : 2-3 jours
> **Priorité** : 🟡 Normale
> **Dépendances** : Phase 4.1 ✅ + Phase 4.2 ✅
> **Créé le** : 2026-03-03

---

## Objectif

Transformer le **HistoryPanel** mockup en interface fonctionnelle permettant la **navigation temporelle** dans l'historique d'édition d'une image, avec support de **snapshots nommés** et restauration instantanée.

---

## Périmètre

### ✅ Inclus dans cette phase

- **Timeline interactive** : Liste des événements d'édition avec timestamp et payload
- **Time travel** : Clic sur un event → restauration de l'état de l'image à ce moment
- **Snapshots nommés** : Bouton "Snapshot" → sauvegarde d'un état avec nom custom
- **Bouton Reset** : Retour à l'état d'import (événement initial)
- **Preview instantanée** : Changement de l'image dans PreviewRenderer en <16ms
- **Persistance** : Snapshots sauvegardés en SQLite (table `edit_snapshots`)
- **Interface** : Intégration dans RightSidebar existant

### ❌ Exclus intentionnellement

- **Comparaison avant/après** (Phase 4.4 dédiée)
- **Undo/Redo par raccourcis clavier** (sera ajouté en Phase 7.4 — Accessibilité)
- **Snapshots partagés entre utilisateurs** (Phase 8 — Cloud sync)
- **Historique entre sessions** (sera implémenté via Event Sourcing persistence, déjà acquis)

---

## Dépendances

### Phases

- **Phase 4.1** ✅ — Event Sourcing Engine (append_event, get_events)
- **Phase 4.2** ✅ — Pipeline de Rendu Image (PreviewRenderer + filters)

### Ressources Rust

- Table SQLite `events` (existe via migration 005)
- Tauri commands `append_event`, `get_events` (existent)

### Ressources Frontend

- `editStore` (existe avec structure undo/redo)
- `HistoryPanel.tsx` (mockup à améliorer)
- `PreviewRenderer.tsx` (capable de recharger filters)

---

## Fichiers à Créer/Modifier

### Fichiers Backend (Rust)

#### À créer

1. **`src-tauri/migrations/006_snapshots.sql`**
   - Table `edit_snapshots` (id, image_id, name, snapshot_data, created_at, event_ids)
   - Index sur `image_id` pour lookup rapide

2. **`src-tauri/src/models/snapshot.rs`**
   - Structs : `Snapshot`, `SnapshotDTO` (serde serialize)
   - Logic de sérialisation de l'état (JSON ou FlatBuffers)

3. **`src-tauri/src/services/snapshot_service.rs`**
   - `create_snapshot(image_id, name, events)` → Result<SnapshotDTO>
   - `get_snapshots(image_id)` → Result<Vec<SnapshotDTO>>
   - `delete_snapshot(id)` → Result<()>

4. **`src-tauri/src/commands/snapshots.rs`**
   - Tauri commands exposant le service (create_snapshot, get_snapshots, delete_snapshot)

#### À modifier

5. **`src-tauri/src/main.rs`**
   - Ajouter `mod commands::snapshots;`
   - Enregistrer commands dans `.invoke_handler()`

6. **`src-tauri/src/lib.rs`**
   - Ajouter `pub mod models::snapshot;`
   - Ajouter `pub mod services::snapshot_service;`

### Fichiers Frontend (TypeScript/React)

#### À créer

7. **`src/services/snapshotService.ts`**
   - `createSnapshot(imageId, name, eventIds)` → Promise<SnapshotDTO>
   - `getSnapshots(imageId)` → Promise<SnapshotDTO[]>
   - `deleteSnapshot(id)` → Promise<void>
   - Type `SnapshotDTO` matching Rust

8. **`src/components/develop/SnapshotModal.tsx`**
   - Modal pour nommer un snapshot avant création
   - Input + validation + boutons Cancel/Save

9. **`src/services/__tests__/snapshotService.test.ts`**
   - Tests unitaires pour les wrappers Tauri

10. **`src/components/develop/__tests__/HistoryPanel.test.tsx`**
    - Tests UI pour le panneau d'historique
    - Tests d'interaction (clic event, clic snapshot, reset)

#### À modifier

11. **`src/components/develop/HistoryPanel.tsx`**
    - Remplacer le mockup par une vraie timeline
    - Afficher les events de `editStore.editEventsPerImage[imageId]`
    - Clic sur event → appeler `restoreToEvent(eventIndex)`
    - Bouton "Snapshot" → ouvrir `SnapshotModal`
    - Bouton "Reset" → restaurer à l'événement initial
    - Afficher les snapshots existants (section séparée)

12. **`src/stores/editStore.ts`**
    - Ajouter action `restoreToEvent(imageId: number, eventIndex: number)`
    - Ajouter état `snapshots: Record<number, SnapshotDTO[]>`
    - Ajouter actions `setSnapshots`, `addSnapshot`, `deleteSnapshot`

13. **`src/components/develop/DevelopView.tsx`**
    - Passer `selectedImage.id` au `HistoryPanel` via props

14. **`src/types/index.ts`**
    - Exporter type `SnapshotDTO` pour usage global

### Documentation

15. **`Docs/APP_DOCUMENTATION.md`**
    - Nouvelle section **20. Historique & Snapshots UI**
    - Description du flux time travel
    - Schéma SQLite `edit_snapshots`
    - Exemples d'usage

16. **`Docs/CHANGELOG.md`**
    - Entrée pour Phase 4.3 après complétion

---

## Interfaces Publiques

### Backend (Rust → TypeScript)

#### Tauri Commands

```rust
// src-tauri/src/commands/snapshots.rs

#[tauri::command]
pub fn create_snapshot(
    image_id: i64,
    name: String,
    event_ids: Vec<String>,
    state: State<AppState>,
) -> Result<SnapshotDTO, CommandError>;

#[tauri::command]
pub fn get_snapshots(
    image_id: i64,
    state: State<AppState>,
) -> Result<Vec<SnapshotDTO>, CommandError>;

#[tauri::command]
pub fn delete_snapshot(
    id: i64,
    state: State<AppState>,
) -> Result<(), CommandError>;
```

#### SnapshotDTO

```rust
// src-tauri/src/models/snapshot.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDTO {
    pub id: i64,
    pub image_id: i64,
    pub name: String,
    pub snapshot_data: String, // JSON serialized events
    pub event_ids: Vec<String>,
    pub created_at: String, // RFC3339
}
```

### Frontend (Service API)

```typescript
// src/services/snapshotService.ts

export interface SnapshotDTO {
  id: number;
  imageId: number;
  name: string;
  snapshotData: string; // JSON events
  eventIds: string[];
  createdAt: string; // ISO8601
}

export async function createSnapshot(
  imageId: number,
  name: string,
  eventIds: string[],
): Promise<SnapshotDTO>;

export async function getSnapshots(imageId: number): Promise<SnapshotDTO[]>;

export async function deleteSnapshot(id: number): Promise<void>;
```

### EditStore Actions

```typescript
// src/stores/editStore.ts

interface EditStore {
  // ... existing fields
  snapshots: Record<number, SnapshotDTO[]>;

  // Actions
  restoreToEvent: (imageId: number, eventIndex: number) => void;
  setSnapshots: (imageId: number, snapshots: SnapshotDTO[]) => void;
  addSnapshot: (imageId: number, snapshot: SnapshotDTO) => void;
  deleteSnapshotLocal: (imageId: number, snapshotId: number) => void;
}
```

---

## Architecture Cible

### Flux Time Travel (Restauration d'État)

```
User clicks event in HistoryPanel
  ↓
onClickEvent(eventIndex)
  ↓
editStore.restoreToEvent(imageId, eventIndex)
  ↓
1. Get events from editEventsPerImage[imageId]
  ↓
2. Slice events[0...eventIndex] (keep only events up to this point)
  ↓
3. Dispatch new merged filter state to catalogStore
  ↓
4. PreviewRenderer re-renders with restored filters
  ↓
Result: Image displays state at selected timestamp
```

### Flux Snapshot Creation

```
User clicks "Snapshot" button
  ↓
Open SnapshotModal (input for name)
  ↓
User enters name "Before color grading"
  ↓
onSave()
  ↓
1. Get current events: editStore.editEventsPerImage[imageId]
  ↓
2. Extract event IDs
  ↓
3. snapshotService.createSnapshot(imageId, name, eventIds)
  ↓
4. Tauri IPC → Rust create_snapshot()
  ↓
5. Serialize events → JSON
  ↓
6. INSERT INTO edit_snapshots(...)
  ↓
7. Return SnapshotDTO
  ↓
8. editStore.addSnapshot(imageId, snapshot)
  ↓
9. HistoryPanel updates UI (show new snapshot in list)
```

### Flux Reset to Initial State

```
User clicks "Reset" button
  ↓
onReset()
  ↓
1. editStore.restoreToEvent(imageId, 0)
  ↓
2. Clear all filters (currentEdits = {})
  ↓
3. PreviewRenderer reloads with empty filters
  ↓
Result: Image shows original state (as imported)
```

---

## Schéma SQLite

### Table `edit_snapshots`

```sql
-- src-tauri/migrations/006_snapshots.sql
CREATE TABLE IF NOT EXISTS edit_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    snapshot_data TEXT NOT NULL,  -- JSON array of EventDTO
    event_ids TEXT NOT NULL,      -- JSON array of event IDs (for reference)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(image_id, name)  -- Prevent duplicate snapshot names per image
);

CREATE INDEX idx_snapshots_image_id ON edit_snapshots(image_id);
CREATE INDEX idx_snapshots_created_at ON edit_snapshots(created_at);
```

---

## Critères de Validation

### Tests Rust

1. ✅ **Test création snapshot** : `test_create_snapshot_success()`
   - Créer snapshot → vérifier insertion SQLite
   - Vérifier sérialisation JSON correcte

2. ✅ **Test get snapshots** : `test_get_snapshots_by_image()`
   - Créer 3 snapshots pour image_id=1
   - Récupérer → vérifier count=3

3. ✅ **Test delete snapshot** : `test_delete_snapshot()`
   - Supprimer snapshot → vérifier disparition

4. ✅ **Test contrainte unique** : `test_duplicate_snapshot_name()`
   - Créer 2 snapshots même nom → erreur

### Tests TypeScript

5. ✅ **Test snapshotService wrappers** : Tous invokes fonctionnent
6. ✅ **Test editStore.restoreToEvent** : Restauration correcte des filters
7. ✅ **Test HistoryPanel UI** :
   - Clic event → `restoreToEvent` appelé
   - Bouton Reset → filters cleared
   - Bouton Snapshot → modal s'ouvre

### Tests Intégration

8. ✅ **E2E workflow** :
   - Modifier image (exposure +20, contrast +10)
   - Créer snapshot "Step 1"
   - Modifier encore (saturation +15)
   - Cliquer sur snapshot "Step 1" → image revient à l'état précédent
   - Cliquer Reset → image revient à l'état initial

### Performance

9. ✅ **Time travel <16ms** : Restauration d'état ne doit pas bloquer l'UI
10. ✅ **Snapshots list <50ms** : Chargement de la liste instantané

### Compilation & Lint

11. ✅ `cargo check` → 0 erreurs
12. ✅ `cargo clippy` → 0 warnings
13. ✅ `cargo test` → tous tests passent
14. ✅ `npm run type-check` → 0 erreurs TypeScript
15. ✅ `npm run test:run` → tous tests passent
16. ✅ Non-régression : Phases 1-4.2 toujours ✅

---

## Contraintes Techniques

### Performance

- Restauration d'état doit être **instantanée** (<16ms)
- Liste de snapshots doit charger en <50ms (même 100 snapshots)
- Ne PAS bloquer l'UI pendant la sérialisation

### Persistance

- Snapshots survivent aux redémarrages app
- Suppression d'image → cascade delete snapshots
- Format JSON **human-readable** pour debug

### UX

- Timeline scrollable si >20 events
- Event actif highlighté (border bleue)
- Snapshot nommé affiché séparément des events
- Tooltip sur chaque event avec timestamp + payload

---

## Contexte Architectural

### Event Sourcing (Phase 4.1)

L'infrastructure Event Sourcing est déjà en place :

- **Table SQLite** : `events` (id, timestamp, event_type, payload, target_id)
- **Tauri commands** : `append_event`, `get_events`, `replay_events`
- **Service frontend** : `eventService.ts`

Cette phase **utilise** les events existants pour construire l'historique UI, sans modifier l'infrastructure.

### Pipeline de Rendu (Phase 4.2)

Le rendu est connecté via :

- **PreviewRenderer** lit `editStore.editEventsPerImage[imageId]`
- Changement des filters → re-render automatique
- Restauration d'état = modifier `editEventsPerImage` → PreviewRenderer réagit

### Zustand Store Pattern

`editStore` est le **source of truth** pour :

- Events en cours pour chaque image
- Snapshots chargés
- État de restauration

**Pas de duplication d'état** entre store et composants.

---

## Risques & Mitigations

| Risque                                  | Impact    | Mitigation                                              |
| --------------------------------------- | --------- | ------------------------------------------------------- |
| Sérialisation JSON trop lente (>100ms)  | 🟡 Moyen  | Utiliser FlatBuffers si >1000 events                    |
| UI freeze pendant restauration          | 🔴 Élevé  | Restauration synchrone (pas d'async), optimistic update |
| Snapshots list trop longue (>100 items) | 🟡 Moyen  | Pagination ou virtualisation (Phase 6.3)                |
| Noms de snapshots dupliqués             | 🟢 Faible | Contrainte UNIQUE en DB + validation frontend           |

---

## Brief Recap

**Ce qu'on construit** : Interface d'historique interactive permettant navigation temporelle + snapshots nommés.

**Critère de succès** : User peut modifier une image, créer un snapshot, continuer l'édition, puis restaurer instantanément le snapshot ou n'importe quel point de l'historique.

**Fichiers clés** :

- Backend : `snapshots.rs` (commands), `snapshot_service.rs`, `006_snapshots.sql`
- Frontend : `HistoryPanel.tsx` (refactor), `snapshotService.ts`, `SnapshotModal.tsx`
- Store : `editStore.ts` (add restore + snapshots state)

**Dépendances externes** : Aucune nouvelle crate Rust, utilise `rusqlite` et `serde_json` existants.

---

## Instructions pour l'Agent IA

1. **Lire en priorité** :
   - `Docs/briefs/PHASE-4.1.md` (Event Sourcing context)
   - `Docs/briefs/PHASE-4.2.md` (Rendering context)
   - `src/stores/editStore.ts` (état actuel)
   - `src/components/develop/HistoryPanel.tsx` (mockup existant)

2. **Créer les fichiers dans cet ordre** :
   - Migration SQL + models Rust
   - Service + commands Rust
   - Tests Rust
   - Service TypeScript + types
   - HistoryPanel refactor + SnapshotModal
   - Tests TypeScript
   - Documentation

3. **Valider à chaque étape** :
   - `cargo test` après chaque fichier Rust
   - `npm run test:run` après chaque fichier TS
   - Vérifier dans l'app que l'UI répond

4. **Ne PAS** :
   - Modifier le schéma `events` existant
   - Changer l'API de `eventService.ts`
   - Supprimer le mockup initial avant d'avoir le remplacement fonctionnel

5. **Commit strategy** :
   - 1 commit par fichier backend (testable isolément)
   - 1 commit frontend (UI + store + service ensemble)
   - 1 commit documentation finale

---

**Prêt à démarrer ?** 🚀
