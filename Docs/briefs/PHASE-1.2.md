# Phase 1.2 — Tauri Commands CRUD

## Objectif

Exposer les commandes Rust via `#[tauri::command]` pour permettre au frontend TypeScript d'interagir avec la base de données SQLite du catalogue.

## Fichiers à créer/modifier

- `src-tauri/src/commands/` - Nouveau dossier pour les commandes
  - `catalog.rs` - Commandes CRUD pour images/collections
  - `mod.rs` - Export des commandes
- `src-tauri/src/lib.rs` - Enregistrement des commandes
- `src/services/catalogService.ts` - Wrapper TypeScript pour les appels Tauri
- `src/types/dto.ts` - DTOs TypeScript pour les réponses
- `Docs/briefs/PHASE-1.2.md` - Ce fichier

## Dépendances

- ✅ Phase 1.1 - Schéma SQLite du Catalogue (terminée)
- ✅ Phase 0.4 - State Management Zustand (pour les stores)

## Interfaces à respecter

### Commandes Rust à implémenter

```rust
#[tauri::command]
async fn get_all_images(filter: Option<ImageFilter>) -> Result<Vec<ImageDTO>, String>

#[tauri::command]
async fn get_image_detail(id: u32) -> Result<ImageDetailDTO, String>

#[tauri::command]
async fn update_image_state(id: u32, rating: Option<u8>, flag: Option<String>) -> Result<(), String>

#[tauri::command]
async fn create_collection(name: String, collection_type: String, parent_id: Option<u32>) -> Result<CollectionDTO, String>

#[tauri::command]
async fn add_images_to_collection(collection_id: u32, image_ids: Vec<u32>) -> Result<(), String>

#[tauri::command]
async fn get_collections() -> Result<Vec<CollectionDTO>, String>

#[tauri::command]
async fn search_images(query: String) -> Result<Vec<ImageDTO>, String>
```

### DTOs Rust (avec serde)

```rust
#[derive(Serialize, Deserialize)]
pub struct ImageDTO {
    pub id: u32,
    pub blake3_hash: String,
    pub filename: String,
    pub extension: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub rating: Option<u8>,
    pub flag: Option<String>,
    pub captured_at: Option<String>,
    pub imported_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct CollectionDTO {
    pub id: u32,
    pub name: String,
    pub collection_type: String,
    pub parent_id: Option<u32>,
    pub image_count: u32,
}
```

### Service TypeScript

```typescript
export class CatalogService {
  static async getAllImages(filter?: ImageFilter): Promise<ImageDTO[]> {
    return invoke('get_all_images', { filter });
  }

  static async getImageDetail(id: number): Promise<ImageDetailDTO> {
    return invoke('get_image_detail', { id });
  }

  // ... autres méthodes
}
```

## Critères de validation

- [x] Toutes les commandes Rust compilent sans erreur
- [x] Les DTOs sont sérialisables/désérialisables correctement
- [x] Le service TypeScript peut appeler les commandes Rust
- [x] Les retours d'erreur sont correctement formatés (Result<T, String>)
- [x] Tests unitaires pour chaque commande (avec base de données en mémoire)
- [x] Integration test : appel aller-retour frontend → Rust → SQLite
- [x] `cargo tauri dev` fonctionne avec les nouvelles commandes

## Contexte architectural

- Base de données SQLite déjà initialisée dans `src-tauri/src/database.rs`
- Modèles Rust disponibles dans `src-tauri/src/models/catalog.rs`
- Stores Zustand prêts à être connectés (catalogStore, uiStore, editStore, systemStore)
- Pipeline CI/CD configuré pour tester le code Rust
- Convention d'erreur : `Result<T, String>` avec messages descriptifs

## Notes

- Utiliser `async` pour les opérations DB potentiellement longues
- Gérer les erreurs SQLite de manière appropriée
- Les IDs sont des `u32` dans Rust, `number` dans TypeScript
- Les dates sont des `String` au format ISO 8601
- Prévoir des filtres optionnels pour les requêtes complexes (Phase 3.5)
