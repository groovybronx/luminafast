# Maintenance — SQL Safety & Refactorisation `get_folder_images`

**Statut** : ⏳ En cours
**Date** : 2026-02-23
**Branche** : `maintenance/sql-safety-refactor`

---

## Contexte

Lors de l'analyse du PR #20 (Bug de l'import des images), une critique de revue de code a identifié une inefficacité dans la fonction `get_folder_images()` du fichier `src-tauri/src/commands/catalog.rs` (Phase 3.4).

**Problème identifié:**
La fonction utilise une conversion inutile `u32 → String → &str` et mélange deux styles de paramétrisation SQL, ce qui crée:
- ❌ Perte de performance (allocations mémoire inutiles)
- ❌ Difficulté de maintenance (mélange de styles)
- ❌ Risk de régression lors d'ajout de paramètres futurs

Bien que **rusqlite gère correctement les paramètres** (injection SQL impossible), la qualité du code peut être améliorée.

---

## Cause Racine

**Symptôme:** Fonction `get_folder_images()` effectue conversions inutiles: `folder_id.to_string()` puis `folder_id_str.as_str()`.

**Cause:** Implémentation Phase 3.4 rapide sans refactorisation pour clarté et performance.

**Correction:** Restructurer pour utiliser `query_map()` avec paramètres nommés ou positionnels directement sans conversion intermédiaire.

---

## Objectif

Refactoriser `get_folder_images()` pour:
1. ✅ Éliminer conversions `u32 → String → &str`
2. ✅ Utiliser un style cohérent de paramétrisation SQL
3. ✅ Améliorer lisibilité et maintenabilité du code
4. ✅ Ajouter tests d'intégration pour couvrir les deux branches (recursive=true/false)
5. ✅ Zéro impact comportemental (refactorisation interne uniquement)

---

## Périmètre de la Maintenance

### Fichiers à modifier

**Backend (Rust):**
- `src-tauri/src/commands/catalog.rs` : Refactoriser `get_folder_images()` (lignes 943-1040)
- `src-tauri/src/commands/catalog.rs` : Ajouter/améliorer tests unitaires (section `#[cfg(test)]`)

**Documentation:**
- `Docs/CHANGELOG.md` : Ajouter entrée de maintenance
- `Docs/APP_DOCUMENTATION.md` : Mettre à jour section historique

### Fichiers NON modifiés

- `src/components/library/FolderTree.tsx` : Pas de changement comportemental
- `src/services/catalogService.ts` : Pas de changement API
- `src/types/folder.ts` : Pas de changement de types

---

## Livrables Techniques

### 1. Refactorisation `get_folder_images()`

**Avant (problématique):**
```rust
let image_iter = if let Some(path) = folder_path {
    let search_pattern = format!("{}%", path);
    stmt.query_map([search_pattern.as_str()], map_image_row)  // ❌ &str binding
        .map_err(|e| format!("Failed to query images: {}", e))?
} else {
    let folder_id_str = folder_id.to_string();  // ❌ Conversion inutile
    stmt.query_map([folder_id_str.as_str()], map_image_row)  // ❌ &str binding
        .map_err(|e| format!("Failed to query images: {}", e))?
};
```

**Après (optimisé):**
```rust
let image_iter = if let Some(path) = folder_path {
    let search_pattern = format!("{}%", path);
    stmt.query_map(rusqlite::params![&search_pattern], map_image_row)
        .map_err(|e| format!("Failed to query images: {}", e))?
} else {
    stmt.query_map(rusqlite::params![folder_id], map_image_row)
        .map_err(|e| format!("Failed to query images: {}", e))?
};
```

**Bénéfices:**
- ✅ Pas de conversion `u32 → String`
- ✅ Utilise `rusqlite::params![]` uniformément
- ✅ Plus lisible et maintenable

### 2. Tests d'Intégration

**Nouveaux tests à ajouter:**

```rust
#[test]
fn test_get_folder_images_direct() {
    // Cas: recursive=false → filtre par folder_id
    // Crée 3 fichiers dans folder 1, 2 dans folder 2
    // Appelle get_folder_images(1, false)
    // ✅ Retourne 3 images, pas les images de folder 2
}

#[test]
fn test_get_folder_images_recursive() {
    // Cas: recursive=true → filtre par path LIKE pattern
    // Crée structure:
    //   /photos (folder_id=1)
    //     └─ img1.jpg
    //     └─ subfolder (folder_id=2, parent=1)
    //       └─ img2.jpg
    // Appelle get_folder_images(1, true)
    // ✅ Retourne 2 images (img1 + img2 de subfolder)
}

#[test]
fn test_get_folder_images_empty() {
    // Cas: Dossier sans images
    // ✅ Retourne Vec vide, pas d'erreur
}
```

---

## Critères de Validation

- ✅ `cargo clippy -- -D warnings` passe (aucun avertissement)
- ✅ `cargo test --lib` passe 100% (159 tests Rust existants + 3 nouveaux)
- ✅ `cargo fmt --all -- --check` validation format
- ✅ Aucun changement comportemental observé (même résultats queries)
- ✅ Tests spécifiques `test_get_folder_images_*` créés et verts
- ✅ Documentation du code mise à jour (commentaires)

---

## Dépendances

**Pré-requis:**
- ✅ Phase 3.4 complétée (Folder Navigator implémenté)
- ✅ Base de données SQLite initialisée

**Pas de dépendances avec futures phases** — Refactorisation interne uniquement

---

## Impact et Risques

| Aspect | Impact | Mitigation |
|--------|--------|-----------|
| **Comportement utilisateur** | ✅ Zéro impact | Refactorisation interne, API identique |
| **Performance** | ✅ Légière amélioration | Moins d'allocations mémoire |
| **Maintenance future** | ✅ Amélioration | Code plus lisible et cohérent |
| **Tests existants** | ✅ Tous passent | Aucun changement logique |
| **Complexité** | ⬜ Très faible | Changement localisé à 1 fonction |

---

## Checklist Pré-Commit

- [ ] `cargo clippy -- -D warnings` passe (0 warnings)
- [ ] `cargo test --lib` passe 100%
- [ ] `cargo fmt --all` appliqué
- [ ] Aucun `unwrap()` en code production
- [ ] Tests nouvellement ajoutés sont verts
- [ ] Commentaires de documention mis à jour
- [ ] CHANGELOG.md entrée créée
- [ ] APP_DOCUMENTATION.md mis à jour si nécessaire

---

## Ressources d'Apprentissage

**Rusqlite paramètres:**
- `rusqlite::params![]` macro pour paramètres nommés/positionnels
- Documentation: https://docs.rs/rusqlite/latest/rusqlite/#parameters

**Best practices SQL Rust:**
- Toujours utiliser prepared statements avec paramètres
- Éviter format!() pour construire chaînes SQL
- Préférer `rusqlite::params![]` ou `rusqlite::params_from_iter()`

---

## Notes pour Reviewer

Cette maintenance:
1. **Respecte le protocole AGENTS.md** — Brief formel, cause racine documentée
2. **Zéro risque régression** — Tests exhaustifs couvrent les deux branches
3. **Améliore qualité code** — Performance + lisibilité + maintenabilité
4. **Prépare future extensibilité** — Facilite ajout paramètres supplémentaires

**Timing:** Peut être mergée indépendamment, ne bloque pas Phase 3.5.
