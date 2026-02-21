# Phase 3.3 — Smart Collections (Requêtes Dynamiques)

## Objectif

Implémenter les Smart Collections : collections dynamiques basées sur des règles de filtrage sauvegardées. Les résultats se recalculent automatiquement à l'ouverture, sans gestion manuelle des images.

---

## État Actuel (pré-3.3)

### ✅ Déjà implémenté
- Schéma SQLite : colonne `collections.smart_query` (TEXT NULL)
- Type `collections.type` : peut être `'static'` ou `'smart'` (CHECK constraint)
- Type TypeScript `SmartQuery` (défini dans `src/types/collection.ts`)
- Collections statiques CRUD opérationnelles (Phase 3.2)
- `collectionStore` Zustand existant avec `setActiveCollection(id)`

### ⚠️ À implémenter
1. **Backend** : Commande `create_smart_collection(name, smart_query, parent_id)`
2. **Backend** : Commande `get_smart_collection_results(collection_id)` — parseur JSON → SQL WHERE
3. **Backend** : Commande `update_smart_collection(collection_id, smart_query)`
4. **Frontend** : UI builder de règles avec champs/opérateurs/valeurs
5. **Frontend** : Service methods pour les 3 commandes backend
6. **Frontend** : Intégration dans `collectionStore` (créer et charger smart collections)
7. **Frontend** : Support des smart collections dans `LeftSidebar` (visuel différent, badge)

---

## Périmètre de la Phase 3.3

### 1. Backend Rust — 3 nouvelles commandes

#### `create_smart_collection(name: String, smart_query: String, parent_id: Option<u32>) → CommandResult<CollectionDTO>`
- Valider que `name` n'est pas vide
- Valider que `smart_query` est du JSON valide (parseable en `SmartQuery`)
- INSERT INTO collections (name, type, smart_query, parent_id) VALUES (?, 'smart', ?, ?)
- Retourner le DTO créé avec `type: 'smart'` et `image_count` calculé
- Utiliser la même `image_count` calculation que pour les static collections

#### `get_smart_collection_results(collection_id: u32) → CommandResult<Vec<ImageDTO>>`
- Vérifier que la collection existe et que `type = 'smart'`
- Parser `smart_query` JSON en filtre structuré
- Convertir en SQL WHERE clause dynamique
- Exécuter : SELECT images.*, exif_metadata.*, image_state.* ... WHERE [générés]
- LEFT JOIN image_state + exif_metadata (même structure que `get_all_images`)
- ORDER BY images.imported_at DESC
- Retourner les ImageDTOs

#### `update_smart_collection(collection_id: u32, smart_query: String) → CommandResult<()>`
- Vérifier que la collection existe et que `type = 'smart'`
- Valider que `smart_query` est du JSON valide
- UPDATE collections SET smart_query = ? WHERE id = ?
- Retourner erreur si collection introuvable

### 2. Smart Query Format (JSON)

```json
{
  "rules": [
    {
      "field": "rating",
      "operator": ">=",
      "value": 3
    },
    {
      "field": "iso",
      "operator": ">",
      "value": 1600
    }
  ],
  "combinator": "AND"
}
```

**Champs supportés** :
- `rating` (0-5) : operators `=`, `!=`, `>`, `>=`, `<`, `<=`
- `iso` (number) : operators `=`, `>`, `>=`, `<`, `<=`, `!=`
- `aperture` (number) : operators `=`, `>`, `>=`, `<`, `<=`
- `focal_length` (number) : operators `=`, `>`, `>=`, `<`, `<=`
- `camera_make` (string) : operators `=`, `!=`, `contains`, `not_contains`
- `camera_model` (string) : operators `=`, `!=`, `contains`, `not_contains`
- `lens` (string) : operators `=`, `!=`, `contains`, `not_contains`
- `flag` (string: 'pick'|'reject') : operators `=`, `!=`
- `color_label` (string) : operators `=`, `!=`
- `filename` (string) : operators `contains`, `not_contains`, `starts_with`, `ends_with`

**Combinators** : `AND` ou `OR` (appliquer uniformément à toutes les rules)

### 3. Backend : Parser JSON → SQL

Fichier `src-tauri/src/services/smart_query_parser.rs` (nouveau)

```rust
pub struct SmartQueryRule {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

pub fn parse_smart_query(json: &str) -> Result<String, Box<dyn std::error::Error>> {
    let query: SmartQuery = serde_json::from_str(json)?;
    let clauses: Vec<String> = query.rules.iter()
        .map(|rule| build_sql_clause(rule))
        .collect::<Result<_, _>>()?;

    let joiner = match query.combinator.as_str() {
        "OR" => " OR ",
        _ => " AND ",
    };

    Ok(format!("({})", clauses.join(joiner)))
}

fn build_sql_clause(rule: &SmartQueryRule) -> Result<String, Box<dyn std::error::Error>> {
    match rule.field.as_str() {
        "rating" => Ok(format!("image_state.rating {} {}", rule.operator, rule.value)),
        "iso" => Ok(format!("exif_metadata.iso {} {}", rule.operator, rule.value)),
        "camera_make" => {
            match rule.operator.as_str() {
                "contains" => Ok(format!("exif_metadata.camera_make LIKE '%{}%'", rule.value)),
                _ => Ok(format!("exif_metadata.camera_make {} '{}'", rule.operator, rule.value)),
            }
        }
        // ... autres champs
        _ => Err("Champ non supporté".into()),
    }
}
```

### 4. Backend : Mise à jour `commands/catalog.rs`

Ajouter les 3 commandes + tests unitaires :
- `test_create_smart_collection_success` : créer et récupérer
- `test_create_smart_collection_invalid_json` : erreur si JSON mal formé
- `test_get_smart_collection_results_empty` : liste vide
- `test_get_smart_collection_results_filters_correctly` : rating >= 3 AND iso > 1600
- `test_update_smart_collection_success` : modifier la requête

### 5. Backend : Mise à jour `lib.rs`

Ajouter les 3 nouvelles commandes dans `tauri::generate_handler![]`

### 6. Frontend : `src/types/collection.ts`

Ajouter/mettre à jour :
```typescript
export type SmartQueryOperator =
  | '=' | '!='
  | '>' | '>=' | '<' | '<='
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with';

export type SmartQueryField =
  | 'rating' | 'iso' | 'aperture' | 'focal_length'
  | 'camera_make' | 'camera_model' | 'lens'
  | 'flag' | 'color_label' | 'filename';

export interface SmartQueryRule {
  field: SmartQueryField;
  operator: SmartQueryOperator;
  value: number | string | boolean;
}

export interface SmartQuery {
  rules: SmartQueryRule[];
  combinator: 'AND' | 'OR';
}

export interface Collection {
  id: number;
  name: string;
  type: 'static' | 'smart' | 'quick';
  parent_id: number | null;
  smart_query: SmartQuery | null;
  image_count: number;
}
```

### 7. Frontend : `src/services/catalogService.ts`

Ajouter les 3 méthodes :
```typescript
async createSmartCollection(
  name: string,
  smartQuery: SmartQuery,
  parentId?: number
): Promise<CollectionDTO>

async getSmartCollectionResults(collectionId: number): Promise<ImageDTO[]>

async updateSmartCollection(
  collectionId: number,
  smartQuery: SmartQuery
): Promise<void>
```

### 8. Frontend : `src/stores/collectionStore.ts`

Ajouter les actions async :
```typescript
createSmartCollection: (name: string, query: SmartQuery, parentId?: number) => Promise<CollectionDTO>;
updateSmartCollection: (id: number, query: SmartQuery) => Promise<void>;
// setActiveCollection doit détecter et charger les résultats pour smart collections
```

### 9. Frontend : UI Builder (`src/components/library/SmartCollectionBuilder.tsx` - nouveau)

Modal pour construire une smart collection :
- Sélecteur de champ (dropdown : rating, iso, camera_make, etc.)
- Sélecteur d'opérateur (adapté au type du champ)
- Champ valeur (input text/number selon type)
- Bouton "Ajouter une règle"
- Liste des règles avec boutons delete
- Sélecteur combinator (AND / OR)
- Bouton "Aperçu" : affiche les images matchées en temps réel
- Bouton "Créer" ou "Mettre à jour"

### 10. Frontend : Mise à jour `LeftSidebar.tsx`

- Afficher les smart collections avec une icône distinctive (ex: ⚡ ou 🔍)
- Bouton pour créer nouvelle smart collection (`+ Smart`)
- Click sur smart collection → charger résultats via `get_smart_collection_results`
- Indicateur visuel "Dynamic" ou badge "Smart"
- (optionnel) Bouton edit : ouvrir le builder pour modifier la requête

---

## Livrables Techniques

### Fichiers créés
- `src-tauri/src/services/smart_query_parser.rs`
- `src/components/library/SmartCollectionBuilder.tsx`
- `src/components/library/__tests__/SmartCollectionBuilder.test.tsx`
- `src/types/smartQuery.ts` (si séparé de collection.ts)

### Fichiers modifiés
- `src-tauri/src/commands/catalog.rs` — 3 nouvelles commandes + tests
- `src-tauri/src/lib.rs` — enregistrement des 3 commandes
- `src/types/collection.ts` — types SmartQuery enrichis
- `src/services/catalogService.ts` — 3 nouvelles méthodes
- `src/services/__tests__/catalogService.test.ts` — tests smart collection
- `src/stores/collectionStore.ts` — créer/modifier smart collections
- `src/stores/__tests__/collectionStore.test.ts` — tests smart collections
- `src/components/layout/LeftSidebar.tsx` — afficher smart collections + bouton créer

---

## Tests Requis

### Backend Rust (`src-tauri/src/commands/`)
- `test_create_smart_collection_success` : créer "ISO > 1600 AND Rating >= 3", récupérer
- `test_create_smart_collection_invalid_json` : erreur si smart_query JSON mal formé
- `test_get_smart_collection_results_empty` : liste vide pour query sans match
- `test_get_smart_collection_results_with_data` : retourner images filtrées
- `test_get_smart_collection_results_wrong_type` : erreur si collection.type != 'smart'
- `test_update_smart_collection_success` : modifier la requête et récupérer
- `test_smart_query_parser_rating_ge` : "rating >= 3" → SQL valide
- `test_smart_query_parser_camera_contains` : "camera_make contains 'Canon'" → SQL valide
- `test_smart_query_parser_or_combinator` : "rating = 5 OR iso > 3200" → SQL avec OR
- `test_smart_query_parser_invalid_field` : erreur si champ inconnu

### Frontend (`src/components/library/__tests__/SmartCollectionBuilder.test.tsx`)
- `should render all field options`
- `should update operator based on selected field`
- `should add a new rule`
- `should delete a rule`
- `should change combinator`
- `should display preview count on button click`
- `should create smart collection with valid query`

### Frontend (`src/services/__tests__/catalogService.test.ts`)
- Extension : tests des 3 méthodes smart collection

### Frontend (`src/stores/__tests__/collectionStore.test.ts`)
- Extension : *should create smart collection*
- Extension : *should update smart collection*
- Extension : *should load smart collection results*

---

## Critères de Validation

- [x] `cargo check` passe sans erreur
- [x] `cargo test` : todos los tests Rust passent (existants + nouveaux) — **153/153 tests ✅**
- [x] `tsc --noEmit` passe sans erreur
- [x] `npm test` : tous les tests frontend passent (existants + nouveaux) — **339/339 tests ✅**
- [x] Créer une smart collection "Rating >= 3 AND ISO > 1600" fonctionne — `createSmartCollection` + Tauri command implémentés
- [x] Les résultats sont filtrés correctement (pas d'images n'ayant pas Rating >= 3) — `test_get_smart_collection_results_filters_correctly` PASSING
- [x] Les résultats sont recalculés si on met la collection active — `setActiveCollection()` détecte type='smart' et charge résultats
- [x] Modifier la requête d'une smart collection met à jour les résultats — `updateSmartCollection` implémenté + store rechargne automatiquement
- [x] La smart collection affiche le nombre correct d'images — `get_smart_collection_image_count()` calculé et affiché dans LeftSidebar
- [x] Les combinators AND/OR fonctionnent correctement — `test_parse_smart_query_and_combinator` + `test_parse_smart_query_or_combinator` PASSING
- [x] Tous les champs supportés peuvent être utilisés sans erreur SQL — 10 champs + 14+ tests unitaires couvrant tous les cas

---

## Dépendances

**Sous-phases complétées (prérequis)** :
- ✅ Phase 1.1 : Schéma SQLite (collections, exif_metadata, image_state)
- ✅ Phase 1.2 : Tauri Commands de base
- ✅ Phase 2.2 : Harvesting EXIF (données présentes)
- ✅ Phase 3.2 : Collections Statiques CRUD

**Fichiers clés à consulter** :
- `Docs/archives/Lightroomtechnique.md` : Smart Albums dans Lightroom
- `src-tauri/src/commands/catalog.rs` : Pattern des commandes existantes
- `src/types/collection.ts` : Types de collections
- `src/stores/collectionStore.ts` : Pattern du store

---

## Hors Périmètre (Phase 3.3)

- Arborescence de collections (parent/enfant complexe) → Phase 3.4+
- Sauvegarde des smart collections en tant que filtres sauvegardés → Phase 3.5
- Édition inline/contextuelle des smart collections → Phase 3.5+
- Duplication de smart collections → Phase 3.5+
- Export de smart collections → Phase 8+

---

## ✅ STATUS DE COMPLETION

**Phase 3.3 — Smart Collections : COMPLÉTÉE**

- **Date**: 2026-02-21
- **Statut**: ✅ Validée et Déployable
- **Tests Totaux**: 492/492 passing (153 Rust + 339 Frontend)
- **Compilation**: Clean (0 errors, 0 warnings)
- **Documentation**: À jour
- **Prochaine Phase**: Phase 3.4 — Navigateur de Dossiers

### Résumé des Livrables

**Backend (Rust)**
- ✅ 3 Tauri commands (create, get_results, update)
- ✅ Parser JSON→SQL avec 10 champs + 8 opérateurs
- ✅ 14+ tests unitaires du parser
- ✅ 5 tests des commands

**Frontend (React/TypeScript)**
- ✅ SmartCollectionBuilder composant + 11 tests
- ✅ 3 service methods wrapping Tauri commands
- ✅ Zustand store avec actions async
- ✅ LeftSidebar intégrée avec création/affichage smart collections
- ✅ Détection type (static/smart) et chargement résultats appropriés

**Intégration**
- ✅ UI distintive (icône Zap ⚡)
- ✅ Modal de création via "+ Smart" button
- ✅ Click-to-load pour charger résultats
- ✅ Bouton supprimer pour nettoyer collections
- ✅ Live preview du nombre d'images matchées
