# Phase 3.3 — Smart Collections (Moteur de Règles Dynamiques)

## Objectif

Implémenter les Smart Collections : des collections dont le contenu est généré **dynamiquement** par des règles SQL construites depuis un JSON de critères. L'utilisateur définit des règles (champ + opérateur + valeur) et la collection évalue automatiquement les images correspondantes à chaque consultation.

## État Actuel (pré-3.3)

### ✅ Déjà implémenté (Phase 3.2)
- Table `collections` avec colonne `type` : 'static' | 'smart' | 'quick'
- CRUD complet des collections statiques (create, delete, rename, get_images)
- `collectionStore` Zustand avec `setActiveCollection` (appelle `getCollectionImages`)
- `catalogService.ts` avec toutes les méthodes collection (camelCase Tauri v2)
- `LeftSidebar` affiche les collections SQLite réelles

### ⚠️ À implémenter
1. **Migration** : colonne `smart_criteria TEXT` dans `collections` + index sur `type`
2. **Backend** : 3 nouvelles commandes Tauri (`create_smart_collection`, `evaluate_smart_collection`, `update_smart_criteria`)
3. **Frontend** : Types `SmartRule` + `SmartCriteria` dans `src/types/collection.ts`
4. **Frontend** : 3 nouvelles méthodes dans `catalogService.ts`
5. **Frontend** : Nouvelles actions dans `collectionStore` + `setActiveCollection` adapté
6. **Frontend** : UI dans `LeftSidebar` pour créer/identifier les Smart Collections

---

## Périmètre de la Phase 3.3

### 1. Migration SQL — `004_smart_collections.sql`

```sql
ALTER TABLE collections ADD COLUMN smart_criteria TEXT;
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(type);
```

### 2. Backend Rust — Structs internes

```rust
pub struct SmartRuleDto {
    pub field: String, // "rating" | "flag" | "camera_make" | "camera_model" | "lens" | "extension" | "iso" | "aperture" | "shutter_speed"
    pub op: String,    // "eq" | "neq" | "gte" | "lte" | "contains"
    pub value: serde_json::Value,
}

pub struct SmartCriteriaDto {
    pub rules: Vec<SmartRuleDto>,
    pub match_type: String, // "all" (AND) | "any" (OR)
}
```

Fonction publique `build_smart_conditions(criteria) → Result<(Vec<String>, Vec<String>), String>` :
- Whitelist des champs et opérateurs (protection SQL injection)
- Mapping champ logique → colonne SQL aliasée (`rating` → `ist.rating`, `camera_model` → `e.camera_model`, etc.)
- Retourne (conditions SQL, params bound)

### 3. Backend Rust — 3 commandes Tauri

#### `create_smart_collection(name, criteriaJson) → CommandResult<CollectionDTO>`
- Valider nom non vide
- Parser `criteriaJson` → SmartCriteriaDto (erreur si JSON invalide)
- Valider les règles via `build_smart_conditions`
- INSERT INTO collections (name, type='smart', smart_criteria)
- Retourner CollectionDTO (image_count=0, smart_criteria=Some(json))

#### `evaluate_smart_collection(collectionId) → CommandResult<Vec<ImageDTO>>`
- Récupérer type + smart_criteria depuis la DB
- Vérifier type == 'smart'
- Parser les critères et construire la requête dynamique (paramétrisée)
- Exécuter : SELECT images … WHERE [conditions dynamiques] ORDER BY imported_at DESC
- Retourner Vec<ImageDTO>

#### `update_smart_criteria(collectionId, criteriaJson) → CommandResult<()>`
- Valider JSON + règles
- UPDATE collections SET smart_criteria = ? WHERE id = ? AND type = 'smart'
- Erreur si 0 lignes affectées

### 4. Backend : Enregistrement dans `lib.rs`
Ajouter les 3 nouvelles commandes dans `tauri::generate_handler![]`

### 5. Frontend — `src/types/collection.ts`

```typescript
export interface SmartRule {
  field: 'rating' | 'flag' | 'camera_make' | 'camera_model' | 'lens' | 'extension' | 'iso' | 'aperture' | 'shutter_speed';
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'contains';
  value: string | number;
}

export interface SmartCriteria {
  rules: SmartRule[];
  match: 'all' | 'any';
}
```

### 6. Frontend — `src/services/catalogService.ts`

3 nouvelles méthodes :
- `createSmartCollection(name: string, criteria: SmartCriteria): Promise<CollectionDTO>`
- `evaluateSmartCollection(collectionId: number): Promise<ImageDTO[]>`
- `updateSmartCriteria(collectionId: number, criteria: SmartCriteria): Promise<void>`

**Convention Tauri v2 (camelCase)** : les clés invoke = `name`, `criteriaJson`, `collectionId`.

### 7. Frontend — `src/stores/collectionStore.ts`

Nouvelles actions :
- `createSmartCollection(name, criteria): Promise<CollectionDTO>`
- `updateSmartCriteria(collectionId, criteria): Promise<void>`

Modification de `setActiveCollection` : si `collection.type === 'smart'`, appeler `evaluateSmartCollection` au lieu de `getCollectionImages`.

### 8. Frontend — `src/components/layout/LeftSidebar.tsx`

- Distinguer visuellement statique (icône `Folder`) vs smart (icône `Zap`)
- Bouton `+` smart collection (ou menu contextuel) → formulaire minimaliste :
  - Champ `name`
  - 1 règle par défaut (field=rating, op=gte, value=3)
  - Bouton Créer / Annuler
- Indicateur visuel différent pour les Smart Collections actives

---

## Livrables Techniques

### Fichiers créés
- `src-tauri/migrations/004_smart_collections.sql`
- `Docs/briefs/PHASE-3.3.md` (ce fichier)

### Fichiers modifiés
- `src-tauri/src/commands/catalog.rs` — structs SmartRuleDto/SmartCriteriaDto, `build_smart_conditions`, 3 commandes + tests
- `src-tauri/src/database.rs` — enregistrement migration 004
- `src-tauri/src/models/dto.rs` — champ `smart_criteria: Option<String>` dans CollectionDTO
- `src-tauri/src/lib.rs` — enregistrement des 3 nouvelles commandes
- `src/types/collection.ts` — SmartRule, SmartCriteria
- `src/services/catalogService.ts` — 3 nouvelles méthodes
- `src/stores/collectionStore.ts` — 2 nouvelles actions + setActiveCollection adapté
- `src/components/layout/LeftSidebar.tsx` — UI création smart + icône différenciée

---

## Tests Requis

### Backend Rust (`src-tauri/src/commands/catalog.rs`)
- `test_create_smart_collection_valid_json` — insertion en DB + vérification type='smart'
- `test_create_smart_collection_invalid_json` — erreur sur JSON malformé
- `test_evaluate_smart_collection_rating_gte` — filtre par rating >= N
- `test_evaluate_smart_collection_flag_eq` — filtre par flag='pick'
- `test_evaluate_smart_collection_and_rules` — match:'all' (AND)
- `test_evaluate_smart_collection_or_rules` — match:'any' (OR)
- `test_update_smart_criteria` — mise à jour en DB
- `test_evaluate_smart_collection_not_found` — erreur sur ID inexistant
- `test_build_smart_conditions_valid` — conditions générées correctement
- `test_build_smart_conditions_invalid_field` — erreur sur champ inconnu
- `test_build_smart_conditions_contains_wraps_value` — LIKE avec %value%

### Frontend (`src/services/__tests__/catalogService.test.ts`)
- `createSmartCollection` : invoke avec bon criteriaJson camelCase
- `evaluateSmartCollection` : invoke avec collectionId
- `updateSmartCriteria` : invoke avec collectionId + criteriaJson

### Frontend (`src/stores/__tests__/collectionStore.test.ts`)
- `createSmartCollection` ajoute à la liste
- `setActiveCollection` sur type='smart' appelle evaluateSmartCollection
- `setActiveCollection` sur type='static' appelle getCollectionImages (inchangé)
- `updateSmartCriteria` appelle le service

---

## Critères de Validation

- [ ] `cargo check` passe sans erreur
- [ ] `cargo test --lib` : tous les tests Rust passent (existants + 11 nouveaux)
- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm test` : tous les tests frontend passent (existants + nouveaux)
- [ ] `CollectionDTO` inclut `smart_criteria: Option<String>` en Rust + `smartCriteria?: string` côté TS
- [ ] `create_smart_collection` valide le JSON et les champs avant insertion
- [ ] `evaluate_smart_collection` retourne les bonnes images selon les critères AND/OR
- [ ] `setActiveCollection` déclenche `evaluateSmartCollection` pour les smart collections
- [ ] Les smart collections sont visuellement distinguées dans la sidebar (icône Zap)
- [ ] Aucun `any` TypeScript ajouté
- [ ] Aucun `unwrap()` Rust en code de production

---

## Dépendances

**Sous-phases complétées (prérequis)** :
- ✅ Phase 1.1 : Schéma SQLite
- ✅ Phase 3.2 : Collections Statiques CRUD complètes

**Hors Périmètre (Phase 3.3)** :
- UI de modification des critères d'une smart collection existante → Phase 3.5+
- Collections intelligentes multi-niveaux / imbriquées → Phase 3.5+
- Glisser-déposer → Phase 3.4+
