# Phase 4.1 — Event Sourcing Engine

> **Statut** : 🔄 **En cours (Étape 1/3 : infrastructure backend)**
> **Durée estimée** : 2-3 jours
> **Dates** : Démarrage 2026-02-25 | Étape 1 ✅ 2026-02-25

## Objectif

Mettre en place un moteur d'Event Sourcing côté backend (Rust/Tauri) pour assurer la traçabilité complète de toutes les modifications du catalogue d’images (ajout, édition, suppression, collections, tags, etc.), avec persistance des événements et API de replay.

## Périmètre

### ✅ Inclus dans cette phase

- Module Rust Event Sourcing (logique + tests)
- Types d’événements exhaustifs (image, collection, tag, rating, edit)
- Table events (migration SQLite)
- API Tauri : append_event, get_events, replay_events
- Tests unitaires Rust (≥80% coverage)

### ❌ Exclus intentionnellement

- UI d’historique (phase 4.3)
- Optimisation performance (phase 6.1)
- DuckDB/OLAP (phase 6.2)

### 📋 Reporté à partir 3.5

- Aucun

## Dépendances

### Phases

- Phase 3.5 ✅ complétée

### Ressources Externes

- Aucune

## Fichiers

### À créer

- `src-tauri/src/services/event_sourcing.rs` — Logique Event Sourcing + tests
- `src-tauri/migrations/005_event_sourcing.sql` — Table events

### À modifier

- `src-tauri/src/services/mod.rs` — Ajout du module
- `Docs/APP_DOCUMENTATION.md` — Section architecture + schéma DB
- `Docs/CHANGELOG.md` — Entrée phase 4.1

## Interfaces Publiques

### Tauri Commands

```rust
#[tauri::command]
pub fn append_event(event: EventDTO) -> Result<(), String>;
#[tauri::command]
pub fn get_events() -> Result<Vec<EventDTO>, String>;
#[tauri::command]
pub fn replay_events() -> Result<(), String>;
```

### TypeScript DTOs

```typescript
export interface EventDTO {
  id: string;
  timestamp: number;
  event_type: string;
  payload: any;
  target_type: string;
  target_id: number;
  user_id?: string;
  created_at: string;
}
```

## Contraintes Techniques

### Rust Backend

- Pas de unwrap()/panic! en prod
- Result<T, E> systématique
- thiserror pour erreurs custom
- Tests unitaires pour chaque fonction publique

### Database

- Migration séquentielle (005)
- Index sur timestamp

## Architecture Cible

### Schéma DB

```sql
CREATE TABLE events (
		id TEXT PRIMARY KEY,
		timestamp INTEGER NOT NULL,
		event_type TEXT NOT NULL,
		payload TEXT NOT NULL,
		target_type TEXT NOT NULL,
		target_id INTEGER NOT NULL,
		user_id TEXT,
		created_at TEXT NOT NULL
);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

### Flux de Données

```
Frontend (invoke append_event)
	↓
Tauri Command (Rust)
	↓
EventStore (SQLite)
	↓
get_events/replay_events
```

## Dépendances Externes

### Rust

- chrono, uuid, serde, rusqlite

## Checkpoints

- [ ] Code compile (`cargo check`)
- [ ] Tests unitaires Rust (≥80% coverage)
- [ ] API Tauri accessible
- [ ] Tests non-régression phases précédentes
- [ ] Documentation à jour

## Pièges & Risques

- Oublier la migration events (erreur au runtime)
- Mauvais mapping types Rust <-> TS (DTO)
- Deadlocks SQLite si transactions longues

## Documentation Attendue

- Entrée CHANGELOG.md détaillée (phase 4.1)
- Section "Architecture des Fichiers" et "Schéma DB" dans APP_DOCUMENTATION.md

## Critères de Complétion

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅
- [ ] Tests Rust passent (≥80% coverage)
- [ ] API Tauri testée
- [ ] APP_DOCUMENTATION et CHANGELOG à jour
