# Maintenance PHASE-2.3 — Alignement Schéma SQL et Structs Rust

> **Criticalité** : 🟠 **MAJEURE**
> **Statut** : ⚠️ **À implémenter**
> **Dépendance** : Phase 2.3 (previews.db prévue mais partiellement implémentée)

---

## Problème Identifié

**Misalignment architectural** entre le schéma SQL et les structs Rust :

### État Actuel

#### **Migration 003_previews.sql** (✅ EXISTS)

```sql
CREATE TABLE previews (
    id INTEGER PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES images(id),
    source_hash TEXT NOT NULL,
    preview_type TEXT CHECK(... IN ('thumbnail', 'standard', 'onetoone')),
    file_path TEXT NOT NULL,              -- ⚠️ CHEMIN ABSOLU
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    generation_time INTEGER NOT NULL,     -- millisecondes
    quality INTEGER NOT NULL DEFAULT 85,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(image_id, preview_type)
);
```

#### **Structs Rust** (❌ NE CORRESPONDENT PAS)

```rust
pub struct PreviewRecord {
    pub id: i64,
    pub source_hash: String,
    pub preview_type: PreviewType,
    pub relative_path: String,           // ⚠️ CHEMIN RELATIF - INCOHÉRENT!
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub jpeg_quality: u8,
    pub generated_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,    // ❌ ABSENT DU SCHÉMA!
    pub access_count: u64,               // ❌ ABSENT DU SCHÉMA!
}
```

#### **Service preview.rs** (❌ NE PERSISTE JAMAIS)

- ✅ Génère previews (filesystem)
- ✅ Cache en mémoire (HashMap + RwLock)
- ❌ **NE persiste JAMAIS les données en SQL**
- ❌ **NE track JAMAIS les accès** (access_count)
- ❌ **Les structs PreviewRecord/NewPreviewRecord ne sont jamais instanciées**

### Résultats

1. **Compiler warnings** : `struct PreviewRecord is never constructed`
2. **Tables SQL inutilisées** : Schéma créé mais jamais exploité
3. **Pas de tracking d'accès** : Impossible de supporter Phase 6.1 (cache multiniveau LRU)
4. **Dead code** : Les structs définies mais orphelines

---

## Racine Cause

Lors de Phase 2.3, deux approches ont divergé :

| Aspect              | Plan                            | Implémentation                |
| ------------------- | ------------------------------- | ----------------------------- |
| **Persistance**     | SQL `previews.db`               | Cache mémoire uniquement      |
| **Access tracking** | Oui (Phase 6.1)                 | Non                           |
| **Schema**          | Table previews + cache_metadata | Tables créées × non utilisées |
| **Structs**         | Prévu                           | Créé × mismatch schema        |

**Décision implicite** : Cache in-memory suffisant pour Phase 3-5, mais **contrat pour Phase 6.1 brisé**.

---

## Solution : Choisir UNE Architecture Cohérente

### **Option A** : Aligner structs sur schéma SQL existant ❌

- **Pro** : Pas de refonte migration
- **Con** : Perd access_count (requis Phase 6.1), perd relative_path simplicity

### **Option B** : Refaire schéma pour structs (✅ **RECOMMANDÉ**)

- **Pro** : Garde access_count + last_accessed (Phase 6.1 LRU), simplifie relative_path
- **Pro** : Aligne structs + schema 1:1
- **Con** : 1 nouvelle migration (`007_fix_previews_schema.sql`)

---

## Implémentation Recommandée (Option B)

### Étape 1 : Refaire Migration SQL (0.5h)

**Fichier** : `src-tauri/migrations/007_fix_previews_schema.sql` (nouvelle, remplace 003_previews approche)

```sql
-- Supprimer la vieille table previews (si elle existe) + recréer alignée
DROP TABLE IF EXISTS preview_generation_log;
DROP TABLE IF EXISTS preview_cache_metadata;
DROP TABLE IF EXISTS previews;

-- Table alignée avec structs Rust PreviewRecord
CREATE TABLE previews (
    id INTEGER PRIMARY KEY,
    source_hash TEXT NOT NULL UNIQUE,           -- Clé unique = source BLAKE3
    preview_type TEXT NOT NULL,                 -- 'thumbnail', 'standard', 'onetoone'
    relative_path TEXT NOT NULL,                -- Chemin depuis Previews.lrdata/
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    jpeg_quality INTEGER NOT NULL DEFAULT 85,
    created_at TEXT DEFAULT (datetime('now')),
    last_accessed TEXT DEFAULT (datetime('now')),
    access_count INTEGER DEFAULT 0,

    UNIQUE(source_hash, preview_type)
);

-- Index pour performance LRU Phase 6.1
CREATE INDEX idx_previews_last_accessed ON previews(last_accessed);
CREATE INDEX idx_previews_access_count ON previews(access_count);
```

**Why simpler** :

- Clé = (source_hash, preview_type) — pas besoin image_id
- relative_path = simple chemin depuis Previews.lrdata/
- access_count + last_accessed = phase 6.1 LRU ready

### Étape 2 : Implémenter PreviewDbService (2h)

**Fichier** : `src-tauri/src/services/preview_db.rs` (~250 lignes)

```rust
pub struct PreviewDbService {
    db: Arc<Mutex<rusqlite::Connection>>,
}

impl PreviewDbService {
    /// Insérer ou mettre à jour présentation metadata
    pub fn upsert_preview(
        &self,
        record: &NewPreviewRecord,
    ) -> Result<PreviewRecord, PreviewError>;

    /// Récupérer métadonnées preview par source_hash
    pub fn get_preview(
        &self,
        source_hash: &str,
        preview_type: PreviewType,
    ) -> Result<Option<PreviewRecord>, PreviewError>;

    /// Incrémenter access_count + update last_accessed
    pub fn record_access(
        &self,
        source_hash: &str,
        preview_type: PreviewType,
    ) -> Result<(), PreviewError>;

    /// Récupérer stats cache global
    pub fn get_cache_stats(&self) -> Result<CacheStats, PreviewError>;

    /// Pruner stale previews (age > max_age_days)
    pub fn prune_stale(
        &self,
        max_age_days: u32,
    ) -> Result<PruneResult, PreviewError>;
}
```

### Étape 3 : Intégrer dans PreviewService (1h)

**Action** : Modifier `src-tauri/src/services/preview.rs`

À la fin de `generate_preview()` :

```rust
let result = self.generate_preview_internal(...)?;

// NOUVEAU : Persister en base
self.db_service.upsert_preview(&NewPreviewRecord {
    source_hash: source_hash.to_string(),
    preview_type,
    relative_path: result.path.strip_prefix(config.previews_dir())?,
    width: result.size.0,
    height: result.size.1,
    file_size: result.file_size,
    jpeg_quality: quality_for_type(&preview_type),
})?;

Ok(result)
```

Dans `get_preview_path()` ou accès lecture :

```rust
// NOUVEAU : Tracker accès
db_service.record_access(source_hash, preview_type)?;
```

### Étape 4 : Commandes Tauri (0.5h)

**Fichier** : `src-tauri/src/commands/preview.rs`

Ajouter 3 commandes :

```rust
#[tauri::command]
pub fn get_preview_cache_stats(state: State<AppState>) -> Result<CacheStats, String> { ... }

#[tauri::command]
pub fn prune_stale_previews(state: State<AppState>, max_age_days: u32) -> Result<PruneResult, String> { ... }
```

### Étape 5 : Tests (1.5h)

**Fichiers** :

- `src-tauri/src/services/preview_db.rs` : Tests unitaires CRUD
- `src-tauri/src/services/tests/preview_db_integration.rs` : Integration test (gen → db persist → access tracking)

---

## Fichiers à Créer/Modifier

| Fichier                                  | Action   | Détail                                     |
| ---------------------------------------- | -------- | ------------------------------------------ |
| `migrations/007_fix_previews_schema.sql` | Créer    | Nouvelle migration (remplace 003 approche) |
| `src/services/preview_db.rs`             | Créer    | Service PreviewDbService (CRUD + tracking) |
| `src/services/mod.rs`                    | Modifier | Exporter preview_db                        |
| `src/services/preview.rs`                | Modifier | Appeler db_service.upsert/record_access    |
| `src/commands/preview.rs`                | Modifier | Ajouter 3 commandes Tauri                  |
| `src/lib.rs`                             | Modifier | Ajouter PreviewDbService dans AppState     |
| `src/models/preview.rs`                  | Vérifier | Structs alignées ✅ (pas de changement)    |
| `src/services/preview_db.rs`             | Ajouter  | Tests unitaires (4 tests min)              |

---

## Critères de Validation

- [ ] Migration 007 crée table `previews` alignée
- [ ] Structs PreviewRecord/NewPreviewRecord utilisées dans PreviewDbService
- [ ] Service persiste tout nouveau preview généré
- [ ] Accès road track (access_count + last_accessed)
- [ ] Compiler warnings `dead_code` éliminés
- [ ] Tous tests passent (unitaires + integration)
- [ ] Pas de breaking changes API frontend
- [ ] Phase 6.1 (LRU eviction) peut maintenant utiliser access_count

---

## Dépendances

- Phase 2.3 (génération previews) ✅ **Complétée**
- Phase 1.1 (schéma SQLite) ✅ **Complétée**

---

## Impact

### Positif

- ✅ Élimine compiler warnings
- ✅ Prépare Phase 6.1 (LRU cache)
- ✅ Aligne plan + code
- ✅ Auditable + reperable (access tracking)

### Neutre

- Overhead insertion ~1-2ms par preview (acceptable)
- Nouvelle migration (07, suivant pattern)

### Négatif

- Néant (pas de breaking changes)

---

## Timeline Estimée

- **5.5h total** : 2 dev days + code review
- **Criticité** : 🟠 Majeure (prépare Phase 6.1)

---

## Alignment Governance

- ✅ Suit AGENTS.md (cause racine + tests + no simplification)
- ✅ Complète Phase 2.3 spec
- ✅ Prepare Phase 6.1 contrat (access_count)
- ✅ Pas de scope creep

---

_Maintenance PHASE-2.3 — Alignement Schéma SQL + Structs Rust_
