# Plan d'Implémentation — Types Image & State Management

> **Document de planification** pour l'exploitation des types définis mais non utilisés.
> Identifie les lacunes entre le plan de développement et l'implémentation actuelle.

---

## 1. Types Définis mais Inutilisés (État Actuel)

### 1.1 — Types du Modèle (`models/image.rs`)

| Type | Statut | Problème | Priorité |
|------|--------|---------|----------|
| `Image` (struct) | ✅ Défini, testé, #[allow(dead_code)] | Planifié Phase 4.2 (rendering pipeline) + Phase 5+ | 📋 **PLANIFIÉ** |
| `ExifData` | ✅ Défini, testé, #[allow(dead_code)] | Planifié Phase 5.1 (EXIF panel connecté) | 📋 **PLANIFIÉ** |
| `EditData` | Défini, tests uniquement | Pas d'intégration pipeline édition | 🟠 **HIGH** |
| `ImageFlag` (enum) | Défini, référencé seulement | Pas de test update_image_state avec flags | 🟠 **HIGH** |
| `ColorLabel` (enum) | Défini, référencé seulement | Pas de test color_label | 🟠 **HIGH** |
| `NewImage` | ✅ Utilisé (ingestion.rs) | — | ✅ OK |
| `ImageUpdate` | Défini, JAMAIS utilisé | Aucun test/code | 🟠 **HIGH** |

### 1.2 — Types DTO Tauri (`commands/types.rs`)

| Type | Statut | Problème | Priorité |
|------|--------|---------|----------|
| `TauriImage` | Défini, JAMAIS utilisé | Pas de commande Tauri l'invoquant | 🟠 **HIGH** |
| `TauriNewImage` | Défini, JAMAIS utilisé | Pas d'intégration API création | 🟠 **HIGH** |
| `TauriImageUpdate` | Défini, JAMAIS utilisé | Pas d'intégration API édition | 🟠 **HIGH** |

---

## 2. Lacunes vs. Plan de Développement

### 2.1 — Phase 1.2 (Tauri Commands CRUD) ❌ Lacune Détectée

**Prévu** : CRUD complet (Create, Read, Update, Delete) sur images
- `get_image_detail` : Devrait retourner `TauriImage` (ou `ImageDTO`)
- `update_image` : Devrait accepter `TauriImageUpdate`
- Mapping bidirectionnel Model ↔ DTO

**État Réel** : Pas d'implémentation
- Pas de commande `update_image`
- Pas de test de modification (rating, flag, color_label)

**Action** : Implémenter les commandes manquantes → **Phase 4.2 Prioritaire** (ou rattrappage phase 1.2)

### 2.2 — Phase 2.2 (EXIF Harvesting) ⚠️ Partielle

**Prévu** : Extraction + stockage EXIF métadonnées
- `ExifData` structure définie ✓
- Extraction via `extract_exif`, `extract_exif_batch` ✓

**État Réel** : EXIF extrait mais = JSON brut, pas mapping `ExifData`
- Métadonnées stockées dans `exif_metadata` table ✓
- Mais pas d'hydration en struct `ExifData` lors du fetch

**Action** : Créer service de mapping EXIF JSON → `ExifData` struct

### 2.3 — Phase 4.2 (Image Rendering Pipeline) ❌ Totalement Absent

**Prévu** : Pipeline pour édition + rendu
- Charge `Image` + `EditData`
- Applique modifications
- Retourne résultat rendu

**État Réel** : Aucune implémentation
- Commands CRUD d'édition (`update_image_edit_data`) n'existe pas
- `EditData` jamais utilisée
- Pas de test d'édition

**Action** : Implémenter phase 4.2 complétement

### 2.4 — Phase 5.3 (Rating & Flagging) ❌ Lacune Majeure

**Prévu** : Persistance `ImageFlag` et `ColorLabel`
- Modification via API Tauri
- Persistance en DB
- Tests complets

**État Réel** : Types définis mais 0 usage
- Pas de commande Tauri pour modifier flags/labels
- Table `image_state` existe mais pas d'usage via DTOs
- Test `test_image_state_operations` existe mais n'exercice pas les flags

**Action** : Implémenter commandes Tauri pour flags/labels + tests

---

## 3. Plan d'Action — Phases à Ajuster

### 3.1 — Phase 1.2 Complémentaire (URGENT)

**Tâche** : Finaliser API CRUD Tauri avec Image DTO

```
Phase 1.2 Ajout / Modification :
├── [ ] Créer commande `get_image_detail(image_id) → TauriImage`
├── [ ] Créer commande `update_image(image_id, update: TauriImageUpdate) → Result`
├── [ ] Implémenter mapping Model Image ↔ TauriImage
├── [ ] Implémenter mapping Model ImageUpdate ↔ TauriImageUpdate
├── [ ] Tests : create, read, update, delete (full CRUD)
└── [ ] Intégrer tests au CI/CD
```

**Critères de Validation** :
- `cargo test --lib` : 100% pass
- Mapping bidirectionnel sans perte de données
- DTOs contrastent clairement entités métier (Model)

### 3.2 — Phase 2.2 Complémentaire (IMPORTANT)

**Tâche** : Hydratation ExifData

```
Phase 2.2 Ajout / Modification :
├── [ ] Créer service `exif_mapping.rs` : JSON → ExifData
├── [ ] Intégrer au fetch d'image (populate exif_data field)
├── [ ] Test serialisation/désérialisation ExifData
└── [ ] Vérifier intégration avec API EXIF existante
```

### 3.3 — Phase 4.2 Prévue (BLOCKER)

**Tâche** : Pipeline Rendu Image (pré-requis pour historique/snapshots phase 4.3)

```
Phase 4.2 - Image Rendering Pipeline :
├── [ ] Service image rendering (charge Image + EditData)
├── [ ] Commande Tauri `render_image_preview()`
├── [ ] Commande Tauri `apply_edits(image_id, edits: EditData)`
├── [ ] Cache results (preview + rendus intermédiaires)
├── [ ] Tests unitaires + intégration
└── [ ] Documenter API dans APP_DOCUMENTATION.md
```

### 3.4 — Phase 5.3 Prévue (HIGH PRIORITY)

**Tâche** : Rating & Flagging via API

```
Phase 5.3 - Rating & Flagging Persistant :
├── [ ] Commande Tauri `set_image_flag(image_id, flag: ImageFlag)`
├── [ ] Commande Tauri `set_image_color_label(image_id, label: ColorLabel)`
├── [ ] Commande Tauri `set_image_rating(image_id, rating: i32)`
├── [ ] Update image_state table
├── [ ] Tests complets (set + get + persistence)
└── [ ] Trigger événements Event Sourcing (FlagChanged, ColorLabelChanged, etc.)
```

---

## 4. Checklist — Avant Passage en Production

- [ ] Tous les types modèles sont utilisés au moins une fois en code production (pas tests-only)
- [ ] Tous les types DTOs Tauri ont une commande correspondante
- [ ] Mapping Model ↔ DTO est bidirectionnel et totalement documenté
- [ ] Tests couvrent au minimum les chemins CRUD principaux
- [ ] Warnings Rust : 0 pour les types (sauf #[allow(dead_code)])
- [ ] Documentation API Tauri : à jour dans APP_DOCUMENTATION.md

---

## 5. Références & Dépendances

- Dev Plan : `Docs/archives/luminafast_developement_plan.md`
- PHASE-1.2 Brief : `Docs/briefs/PHASE-1.2.md`
- PHASE-2.2 Brief : `Docs/briefs/PHASE-2.2.md`
- PHASE-4.2 Brief : À créer (phase ultérieure)
- PHASE-5.3 Brief : À créer (phase ultérieure)
