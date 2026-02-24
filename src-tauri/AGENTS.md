# LuminaFast Agents — Backend (Rust/Tauri)

> **Directives spécialisées pour la couche Backend Rust.**
> Lisez d'abord `AGENTS.md` racine pour les règles absolues globales.

---

## 1. Conventions Rust Strictes

### 1.1 — Error Handling Obligatoire

**JAMAIS de `unwrap()`, `expect()` ou `panic!()` en code de production.**

```rust
// ✅ BON
fn load_image(path: &Path) -> Result<Image, ImageError> {
    let file = std::fs::File::open(path)
        .map_err(|e| ImageError::FileNotFound(e.to_string()))?;
    // ...
}

// ❌ MAUVAIS
fn load_image(path: &Path) -> Image {
    let file = std::fs::File::open(path).unwrap(); // BOOM si fichier absent
    // ...
}
```

### 1.2 — Résultats & Types d'Erreur

Utiliser `thiserror` pour les types d'erreur personnalisés :

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CatalogError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Image not found: {0}")]
    ImageNotFound(String),

    #[error("Hash mismatch for {path}: expected {expected}, got {actual}")]
    HashMismatch { path: String, expected: String, actual: String },
}

pub type CatalogResult<T> = Result<T, CatalogError>;
```

### 1.3 — Nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichier module | snake_case | `blake3_hasher.rs` |
| Struct/Enum | PascalCase | `Image`, `CatalogError` |
| Fonction/méthode | snake_case | `compute_blake3()`, `load_from_db()` |
| Constante | SCREAMING_SNAKE_CASE | `THUMBNAIL_WIDTH = 240` |
| Trait | PascalCase | `HashProvider`, `ImageProcessor` |

---

## 2. Structure des Modules

### 2.1 — Organisation par Domaine

```
src-tauri/src/
├── lib.rs                 # Re-exports principaux
├── catalog.rs             # CRUD images + opérations catalogue
├── collection.rs          # Collection management
├── hashing.rs             # BLAKE3 + CAS
├── preview.rs             # Génération previews
├── discovery.rs           # Scan fichiers
├── exif.rs                # Extraction EXIF/IPTC
├── errors.rs              # Types d'erreur globaux
├── database.rs            # Gestion SQLite
└── commands/
    ├── mod.rs             # Re-export commands
    ├── catalog.rs         # Commands #[tauri::command]
    ├── collection.rs      # Commands collections
    ├── discovery.rs       # Commands discovery/import
    └── dev.rs             # Commands développement (si applicable)
```

### 2.2 — Modules Internes avec Tests

Chaque module Rust contient ses tests unitaires :

```rust
// src-tauri/src/hashing.rs
pub fn compute_blake3(data: &[u8]) -> String {
    blake3::hash(data).to_hex().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blake3_deterministic() {
        let data = b"test";
        let hash1 = compute_blake3(data);
        let hash2 = compute_blake3(data);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_blake3_different_input() {
        let hash1 = compute_blake3(b"test1");
        let hash2 = compute_blake3(b"test2");
        assert_ne!(hash1, hash2);
    }
}
```

---

## 3. Tauri Commands

### 3.1 — Conventions de Nommage

Les commands Rust doivent utiliser **snake_case** et être déclarées avec `#[tauri::command]` :

```rust
// ✅ BON
#[tauri::command]
pub fn get_all_images(filter: Option<String>) -> CatalogResult<Vec<ImageDTO>> {
    // Implementation
}

// L'invocation côté TS sera :
// invoke<ImageDTO[]>('get_all_images', { filter: "test" })
```

### 3.2 — Arguments & Serialization

Tous les arguments doivent implémenter `Serialize` + `Deserialize` de `serde` :

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ImageDTO {
    pub id: String,
    pub filename: String,
    pub blake3_hash: String,
    pub width: u32,
    pub height: u32,
    pub captured_at: String, // ISO date
}

#[tauri::command]
pub fn create_collection(
    #[serde(rename = "collectionType")] collection_type: String,
    #[serde(rename = "parentId")] parent_id: Option<String>,
    name: String,
) -> CatalogResult<CollectionDTO> {
    // Implementation
}
```

**Note** : Les args camelCase du frontend sont mappés en snake_case Rust via `#[serde(rename = "...")]`.

### 3.3 — Retours d'Erreur

```rust
#[tauri::command]
pub fn get_image(id: String) -> CatalogResult<ImageDTO> {
    // La CatalogResult<T> encode automatiquement les erreurs en JSON
    // côté TS, elles sont rejetées dans le Promise.catch()
}
```

---

## 4. Base de Données SQLite

### 4.1 — Migrations

Les migrations sont dans `src-tauri/migrations/` et executées à l'init :

```sql
-- migrations/001_initial.sql
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    blake3_hash TEXT UNIQUE NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    captured_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    collection_type TEXT NOT NULL,
    parent_id TEXT REFERENCES collections(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 — Connexions à la DB

Utiliser une **fonction centralisée** pour obtenir la connexion :

```rust
// src-tauri/src/database.rs
use rusqlite::{Connection, Result};
use std::sync::Mutex;

pub fn get_db_connection() -> Result<Connection> {
    let db_path = get_db_path();
    Connection::open(db_path)
}

fn get_db_path() -> std::path::PathBuf {
    // Retourner le chemin du fichier luminafast.db
    // À partir de app_data_dir()
}
```

Toujours utiliser une nouvelle connexion pour les commandes stateless :

```rust
#[tauri::command]
pub fn get_all_images() -> CatalogResult<Vec<ImageDTO>> {
    let conn = get_db_connection()
        .map_err(|e| CatalogError::DatabaseError(e.to_string()))?;

    // Requête
}
```

### 4.3 — Transactions

Pour les opérations multi-stepped, utiliser des transactions :

```rust
pub fn import_image(path: &Path, hash: &str) -> CatalogResult<ImageDTO> {
    let conn = get_db_connection()?;
    let tx = conn.transaction()
        .map_err(|e| CatalogError::DatabaseError(e.to_string()))?;

    // Insert image
    // Insert exif
    // Insert preview mappings

    tx.commit()
        .map_err(|e| CatalogError::DatabaseError(e.to_string()))?;

    Ok(image_dto)
}
```

---

## 5. Tauri Commands Asynchrones

### 5.1 — Opérations qui Prennent du Temps

Pour les opérations longues (import, hashing, preview generation), utiliser `async` :

```rust
#[tauri::command]
async fn batch_import_images(
    paths: Vec<String>,
) -> CatalogResult<Vec<ImageDTO>> {
    // Rayon parallélization
    use rayon::prelude::*;

    let results: Vec<CatalogResult<ImageDTO>> = paths
        .par_iter()
        .map(|path| {
            let hash = compute_blake3_from_file(path)?;
            insert_image(path, &hash)
        })
        .collect();

    results.into_iter().collect()
}
```

### 5.2 — Progress Updates via Events

Pour avoir une progression en temps réel, émettre des events Tauri :

```rust
#[tauri::command]
async fn import_and_track(
    paths: Vec<String>,
    app_handle: tauri::AppHandle,
) -> CatalogResult<Vec<ImageDTO>> {
    let total = paths.len();
    let mut results = Vec::new();

    for (idx, path) in paths.iter().enumerate() {
        let image = import_single_image(path)?;
        results.push(image);

        let _ = app_handle.emit_all("import_progress", (idx + 1, total));
    }

    Ok(results)
}
```

Côté TS :
```typescript
import { listen } from '@tauri-apps/api/event';

async function importWithProgress() {
  await listen<[number, number]>('import_progress', (event) => {
    const [current, total] = event.payload;
    console.log(`${current}/${total}`);
  });

  const images = await invoke<ImageDTO[]>('import_and_track', { paths });
}
```

---

## 6. Session Tracking (Important!)

### 6.1 — Tables Dédiées

**Utiliser les vraies tables de session**, pas d'approximations temporelles :

```sql
-- migrations/002_ingestion_sessions.sql
CREATE TABLE IF NOT EXISTS ingestion_sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL, -- 'discovering', 'ingesting', 'completing'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    total_files INTEGER,
    discovered_count INTEGER DEFAULT 0,
    ingested_count INTEGER DEFAULT 0,
    preview_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingestion_file_status (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES ingestion_sessions(id),
    file_path TEXT NOT NULL,
    status TEXT NOT NULL, -- 'discovered', 'hashed', 'ingested', 'preview_done'
    blake3_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 — Métiers de Session Réels

```rust
pub fn create_session() -> CatalogResult<String> {
    let conn = get_db_connection()?;
    let session_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO ingestion_sessions (id, status) VALUES (?, ?)",
        (&session_id, "discovering"),
    )?;

    Ok(session_id)
}

pub fn get_session(session_id: &str) -> CatalogResult<ImportSessionDTO> {
    let conn = get_db_connection()?;

    let mut stmt = conn.prepare(
        "SELECT id, status, started_at, total_files, discovered_count,
                ingested_count, preview_count
         FROM ingestion_sessions WHERE id = ?"
    )?;

    let session = stmt.query_row([session_id], |row| {
        Ok(ImportSessionDTO {
            id: row.get(0)?,
            current_phase: row.get(1)?,
            progress_percent: calculate_progress(
                row.get(4)?,  // discovered_count
                row.get(5)?,  // ingested_count
                row.get(6)?,  // preview_count
                row.get(3)?,  // total_files
            ),
            elapsed_ms: calculate_elapsed(row.get(2)?)?,
        })
    })?;

    Ok(session)
}

pub fn update_session_status(session_id: &str, status: &str) -> CatalogResult<()> {
    let conn = get_db_connection()?;
    conn.execute(
        "UPDATE ingestion_sessions SET status = ? WHERE id = ?",
        (status, session_id),
    )?;
    Ok(())
}
```

---

## 7. Tests Rust

### 7.1 — Structure des Tests

```rust
// src-tauri/src/catalog.rs
pub fn insert_image(image: &Image) -> Result<String> {
    // Implementation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_image_stores_all_fields() {
        let image = Image {
            id: "test-1".to_string(),
            filename: "test.jpg".to_string(),
            // ...
        };

        let result = insert_image(&image);
        assert!(result.is_ok());
    }
}
```

### 7.2 — Couverture Minimale

- **80% couverture de lignes** pour backend Rust
- **Tous les types d'erreur** doivent avoir au moins un test d'occurrence
- **Tous les DTOs** doivent être testés pour la sérialisation (si impliquent le réseau)
- **Toutes les opérations DB** doivent avoir des tests d'intégration

---

## 8. Dépendances Autorisées

| Crate | Version | Justification |
|-------|---------|--------------|
| tauri | 2.x | Framework shell |
| serde | 1.x | Serialization |
| rusqlite | 0.31.x | SQLite driver |
| blake3 | latest | Hashing |
| image | latest | Image processing |
| kamadak-exif | 0.6.1 | EXIF extraction |
| rayon | latest | Parallélization |
| thiserror | latest | Error handling |
| tokio | latest | Async runtime |
| uuid | latest | ID generation |

**Aucune autre dépendance** sans approbation propriétaire.

---

## 9. Lien avec AGENTS Globaux

Pour les **règles absolues** (plan, tests, intégrité), voir : `AGENTS.md` racine.

Pour l'**architecture générale**, voir : `Docs/APP_DOCUMENTATION.md`

Pour la **stratégie de tests**, voir : `Docs/TESTING_STRATEGY.md`

Pour l'**API Tauri**, voir : `Docs/briefs/PHASE-1.2.md`
