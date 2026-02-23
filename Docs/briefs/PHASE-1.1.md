# Phase 1.1 — Schéma SQLite du Catalogue

> **Statut** : ✅ **Complétée** — Schéma de base de données complet, migrations actives (001+002+003), 425 tests au vert.

---

## Objectif

Créer le schéma de base de données SQLite pour le catalogue d'images LuminaFast. C'est la première phase "backend réel" qui remplace les données mockées par une persistence structurée.

---

## Périmètre

### 1. Création du schéma SQLite

- **Tables principales** :
  - `images` : métadonnées des fichiers images (catalog)
  - `collections` : collections utilisateur (folders, smart collections)
  - `collection_images` : relation many-to-many images ↔ collections
  - `tags` : tags hiérarchiques
  - `image_tags` : relation many-to-many images ↔ tags
  - `events` : event sourcing pour l'historique des modifications

### 2. Intégration Tauri

- Ajouter les dépendances Rust nécessaires (`rusqlite`, `uuid`)
- Créer les commandes Tauri de base :
  - `init_database()` : création et migration du schéma
  - `get_images()` : récupération des images (avec pagination)
  - `get_collections()` : récupération des collections
  - `add_images()` : insertion de nouvelles images

### 3. Migration des stores Zustand

- Modifier `catalogStore.ts` pour utiliser les commandes Tauri
- Conserver l'interface existante (pas de rupture frontend)
- Ajouter la gestion d'erreur (Result<T, E>)

---

## Contraintes Techniques

### SQLite Schema

- Utiliser les types SQLite appropriés (INTEGER, TEXT, REAL, BLOB)
- Clés primaires auto-incrémentées pour les IDs
- Index sur les champs fréquemment queryés (filename, captured_at, rating)
- Foreign keys avec `ON DELETE CASCADE`

### Rust Integration

- Utiliser `rusqlite` avec `bundled` feature (pas de dépendance système)
- Connection pool via `r2d2` ou gestion manuelle
- Error handling avec `thiserror::Error`
- Structs Rust mappées aux tables SQLite

### TypeScript Compatibility

- Les types existants dans `src/types/` doivent rester valides
- Adapter les interfaces si nécessaire mais préserver la compatibilité
- Pas de `any` — utiliser des types stricts

---

## Livrables

### Fichiers à créer

- `src-tauri/src/database.rs` — Module gestion DB
- `src-tauri/src/models/` — Structs Rust (image.rs, collection.rs, event.rs)
- `src-tauri/src/commands/catalog.rs` — Commandes Tauri catalogue
- `src-tauri/migrations/001_initial.sql` — Script migration initiale

### Fichiers à modifier

- `src-tauri/Cargo.toml` — Ajouter dépendances (rusqlite, uuid, thiserror)
- `src-tauri/src/lib.rs` — Enregistrer les nouvelles commandes
- `src/stores/catalogStore.ts` — Connecter aux commandes Tauri
- `src/types/` — Adapter si nécessaire pour la persistence

### Tests

- `src-tauri/src/database.rs` — Tests unitaires DB (in-memory SQLite)
- `src/stores/__tests__/catalogStore.test.ts` — Adapter aux commandes Tauri
- Tests d'intégration frontend ↔ backend

---

## Critères de Validation

### Backend

- [x] `cargo check` passe sans erreur
- [x] `cargo test` passe (tests unitaires DB)
- [x] La base de données se crée automatiquement au premier lancement
- [x] Les commandes Tauri retournent des `Result<T, E>` corrects

### Frontend

- [x] `tsc --noEmit` passe sans erreur
- [x] `npm test` passe (tests adaptés)
- [x] L'interface frontend fonctionne identiquement (pas de régression)
- [x] Les données mockées sont remplacées par des données réelles

### Integration

- [x] Le frontend peut récupérer les images depuis SQLite
- [x] L'ajout d'images persiste dans la base de données
- [x] Les erreurs backend sont correctement propagées au frontend

---

## Architecture Cible

### Tables SQLite (schéma initial)

```sql
-- Images du catalogue
CREATE TABLE images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    filepath TEXT NOT NULL,
    file_hash TEXT NOT NULL UNIQUE, -- BLAKE3 hash
    file_size INTEGER NOT NULL,
    captured_at TEXT, -- ISO datetime
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Métadonnées EXIF (JSON)
    exif_data TEXT, -- JSON string

    -- État utilisateur
    rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    flag TEXT CHECK (flag IN ('pick', 'reject') OR flag IS NULL),
    color_label TEXT CHECK (color_label IN ('red', 'yellow', 'green', 'blue', 'purple') OR color_label IS NULL),

    -- Édition
    edit_data TEXT, -- JSON string pour les paramètres de développement
    edit_version INTEGER DEFAULT 1,

    -- Sync
    is_synced BOOLEAN DEFAULT FALSE,
    sync_revision TEXT
);

-- Collections (folders, smart collections)
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'smart', 'quick')),
    parent_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    query TEXT, -- JSON pour smart collections
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Relation many-to-many images ↔ collections
CREATE TABLE collection_images (
    collection_id INTEGER NOT NULL,
    image_id INTEGER NOT NULL,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, image_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Tags hiérarchiques
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Relation many-to-many images ↔ tags
CREATE TABLE image_tags (
    image_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (image_id, tag_id),
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Event sourcing (historique des modifications)
CREATE TABLE events (
    id TEXT PRIMARY KEY, -- UUID
    timestamp INTEGER NOT NULL, -- Unix timestamp
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    target_type TEXT NOT NULL, -- 'image', 'collection', etc.
    target_id INTEGER NOT NULL,
    user_id TEXT, -- Future: multi-user support
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance
CREATE INDEX idx_images_filename ON images(filename);
CREATE INDEX idx_images_hash ON images(file_hash);
CREATE INDEX idx_images_captured_at ON images(captured_at);
CREATE INDEX idx_images_rating ON images(rating);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_target ON events(target_type, target_id);
```

---

## Notes

### Phase suivante

La Phase 1.2 construira sur ce schéma pour implémenter les commandes CRUD complètes et le service BLAKE3 pour le hashing.

### Migration depuis le mockup

- Les données mock actuelles (`INITIAL_IMAGES`) serviront de données de test
- L'interface frontend ne doit pas changer — seule la source de données change
- Conserver la réactivité de Zustand avec les données asynchrones

### Performance

- Pagination implémentée côté backend (LIMIT/OFFSET)
- Index stratégiques pour les requêtes communes
- Connection pooling pour gérer multiples requêtes simultanées
