//! Commandes Tauri pour la gestion des fichiers sidecar XMP — Phase 5.4
//!
//! Ces commandes permettent d'exporter et d'importer les métadonnées
//! (rating, flag, tags) vers/depuis des fichiers `.xmp` conformes au standard Adobe.

use crate::commands::catalog::AppState;
use crate::models::dto::CommandResult;
use crate::services::xmp::{self, XmpData};
use serde::{Deserialize, Serialize};
use tauri::State;

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// Statut du sidecar XMP pour une image
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmpStatusDTO {
    /// `true` si le fichier `.xmp` existe sur le disque
    pub exists: bool,
    /// Chemin absolu du fichier sidecar (calculé, peut ne pas exister)
    pub xmp_path: String,
}

/// Résultat d'une importation XMP dans la base de données
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmpImportResultDTO {
    /// Note importée (None si absente dans le XMP)
    pub rating: Option<u8>,
    /// Flag importé ("pick" / "reject" / None)
    pub flag: Option<String>,
    /// Nombre de tags importés
    pub tags_imported: u32,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers privés
// ─────────────────────────────────────────────────────────────────────────────

/// Construit la liste de tags plats + hiérarchiques pour une image à partir de la DB.
///
/// Retourne (flat_tags, hierarchical_subjects).
/// `hierarchical_subjects` suit la convention Lightroom : "Parent/Enfant/SousEnfant".
fn build_tags_for_image(
    db: &mut crate::database::Database,
    image_id: u32,
) -> Result<(Vec<String>, Vec<String>), String> {
    // Charger tous les tags avec leur parent_id
    let mut stmt = db
        .connection()
        .prepare("SELECT id, name, parent_id FROM tags")
        .map_err(|e| format!("Prepare all_tags: {}", e))?;

    let all_tags: Vec<(u32, String, Option<u32>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| format!("Query all_tags: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Row all_tags: {}", e))?;

    drop(stmt); // Libère l'emprunt mutable sur db avant la prochaine requête

    // Charger les tag ids de l'image
    let mut stmt2 = db
        .connection()
        .prepare("SELECT tag_id FROM image_tags WHERE image_id = ?")
        .map_err(|e| format!("Prepare image_tags: {}", e))?;

    let image_tag_ids: Vec<u32> = stmt2
        .query_map([image_id], |row| row.get(0))
        .map_err(|e| format!("Query image_tags: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Row image_tags: {}", e))?;

    drop(stmt2);

    // Build lookup: id → (name, parent_id)
    let lookup: std::collections::HashMap<u32, (String, Option<u32>)> = all_tags
        .into_iter()
        .map(|(id, name, parent_id)| (id, (name, parent_id)))
        .collect();

    let mut flat_tags = Vec::new();
    let mut hierarchical_subjects = Vec::new();

    for tag_id in &image_tag_ids {
        if let Some((name, _)) = lookup.get(tag_id) {
            flat_tags.push(name.clone());

            // Construire le chemin hiérarchique complet : "Racine/Parent/Enfant"
            let path = build_tag_path(*tag_id, &lookup);
            if path.contains('/') {
                // Uniquement si hiérarchique (au moins 2 niveaux)
                hierarchical_subjects.push(path);
            }
        }
    }

    Ok((flat_tags, hierarchical_subjects))
}

/// Remonte la chaîne parent jusqu'à la racine et construit le chemin slash-séparé.
fn build_tag_path(
    tag_id: u32,
    lookup: &std::collections::HashMap<u32, (String, Option<u32>)>,
) -> String {
    let mut parts = Vec::new();
    let mut current_id = tag_id;

    // Protection contre les cycles (max 20 niveaux)
    for _ in 0..20 {
        if let Some((name, parent_id)) = lookup.get(&current_id) {
            parts.push(name.clone());
            match parent_id {
                Some(pid) => current_id = *pid,
                None => break,
            }
        } else {
            break;
        }
    }

    parts.reverse();
    parts.join("/")
}

/// Récupère ou crée un tag par son nom dans la DB.
/// Retourne `tag_id`.
fn get_or_create_tag(
    db: &mut crate::database::Database,
    name: &str,
    parent_id: Option<u32>,
) -> Result<u32, String> {
    let trimmed = name.trim();

    // Chercher d'abord
    let existing: Result<u32, _> = db.connection().query_row(
        "SELECT id FROM tags WHERE name = ? AND (parent_id IS ? OR (parent_id IS NULL AND ? IS NULL))",
        rusqlite::params![trimmed, parent_id, parent_id],
        |row| row.get(0),
    );

    if let Ok(id) = existing {
        return Ok(id);
    }

    // Créer sinon
    db.connection()
        .execute(
            "INSERT INTO tags (name, parent_id) VALUES (?, ?)",
            rusqlite::params![trimmed, parent_id],
        )
        .map_err(|e| format!("Insert tag error: {}", e))?;

    Ok(db.connection().last_insert_rowid() as u32)
}

// ─────────────────────────────────────────────────────────────────────────────
// Commandes Tauri
// ─────────────────────────────────────────────────────────────────────────────

/// Résout le chemin du fichier original depuis la DB (via `ingestion_file_status`).
fn resolve_image_file_path(
    db: &mut crate::database::Database,
    image_id: u32,
) -> Result<String, String> {
    let result = db.connection().query_row(
        "SELECT ifs.file_path
         FROM images i
         JOIN ingestion_file_status ifs ON i.blake3_hash = ifs.blake3_hash
         WHERE i.id = ?
         ORDER BY ifs.id DESC
         LIMIT 1",
        [image_id],
        |row| row.get::<_, String>(0),
    );
    result.map_err(|_| {
        format!(
            "Image {} has no known file path in ingestion history",
            image_id
        )
    })
}

/// Exporte les métadonnées d'une image (rating, flag, tags) vers un fichier `.xmp` sidecar.
///
/// Le fichier est créé à côté de l'image originale avec l'extension `.xmp`.
/// Retourne le chemin absolu du fichier XMP écrit.
#[tauri::command]
pub async fn export_image_xmp(image_id: u32, state: State<'_, AppState>) -> CommandResult<String> {
    let (image_path, xmp_data) = {
        let mut db = state
            .db
            .lock()
            .map_err(|e| format!("Database lock poisoned: {}", e))?;

        // 0. Résoudre le chemin fichier
        let image_path = resolve_image_file_path(&mut db, image_id)?;

        // 1. Récupérer rating + flag depuis image_state
        let image_state: Option<(Option<u8>, Option<String>)> = {
            let result = db.connection().query_row(
                "SELECT rating, flag FROM image_state WHERE image_id = ?",
                [image_id],
                |row| {
                    Ok((
                        row.get::<_, Option<u8>>(0)?,
                        row.get::<_, Option<String>>(1)?,
                    ))
                },
            );
            result.ok()
        };

        let (rating, flag) = image_state.unwrap_or((None, None));

        // 2. Récupérer les tags
        let (flat_tags, hierarchical_subjects) = build_tags_for_image(&mut db, image_id)?;

        // 3. Construire XmpData
        let xmp_data = XmpData {
            rating,
            flag,
            tags: flat_tags,
            hierarchical_subjects,
        };

        (image_path, xmp_data)
    };

    // 4. Écrire le fichier XMP
    let xmp_path = xmp::build_xmp_path(&image_path);
    xmp::write_xmp_async(&xmp_path, &xmp_data)
        .await
        .map_err(|e| format!("XMP write error: {}", e))?;

    Ok(xmp_path.to_string_lossy().to_string())
}

/// Importe les métadonnées depuis le fichier `.xmp` sidecar vers la base de données.
///
/// Met à jour `image_state` (rating, flag) et `image_tags` (tags).
/// Les tags inexistants sont créés automatiquement.
#[tauri::command]
pub async fn import_image_xmp(
    image_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<XmpImportResultDTO> {
    let image_path = {
        let mut db = state
            .db
            .lock()
            .map_err(|e| format!("Database lock poisoned: {}", e))?;
        resolve_image_file_path(&mut db, image_id)?
    };

    let xmp_path = xmp::build_xmp_path(&image_path);

    if tokio::fs::metadata(&xmp_path).await.is_err() {
        return Err(format!("XMP sidecar not found at {:?}", xmp_path));
    }

    let xmp_data = xmp::read_xmp_async(&xmp_path)
        .await
        .map_err(|e| format!("XMP read error: {}", e))?;

    // Convertir le label XMP en flag LuminaFast
    let flag = xmp_data
        .flag
        .as_deref()
        .and_then(xmp::xmp_label_to_flag)
        .or_else(|| xmp_data.flag.clone());

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // 1. Mettre à jour image_state (upsert)
    db.connection()
        .execute(
            "INSERT INTO image_state (image_id, rating, flag) VALUES (?, ?, ?)
             ON CONFLICT(image_id) DO UPDATE SET
               rating = COALESCE(excluded.rating, rating),
               flag   = COALESCE(excluded.flag, flag)",
            rusqlite::params![image_id, xmp_data.rating, flag],
        )
        .map_err(|e| format!("Update image_state error: {}", e))?;

    // 2. Importer les tags plats de dc:subject
    let mut tags_imported = 0u32;
    for tag_name in &xmp_data.tags {
        let tag_id = get_or_create_tag(&mut db, tag_name, None)?;
        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, tag_id],
            )
            .map_err(|e| format!("Link tag error: {}", e))?;
        tags_imported += 1;
    }

    // 3. Importer les tags hiérarchiques de lr:hierarchicalSubject
    for subject_path in &xmp_data.hierarchical_subjects {
        let parts: Vec<&str> = subject_path.split('/').collect();
        let mut parent_id: Option<u32> = None;
        let mut last_tag_id = 0u32;

        for part in &parts {
            let tag_id = get_or_create_tag(&mut db, part, parent_id)?;
            parent_id = Some(tag_id);
            last_tag_id = tag_id;
        }

        // Lier uniquement le tag feuille
        if last_tag_id > 0 {
            db.connection()
                .execute(
                    "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                    rusqlite::params![image_id, last_tag_id],
                )
                .map_err(|e| format!("Link hierarchical tag error: {}", e))?;
        }
    }

    Ok(XmpImportResultDTO {
        rating: xmp_data.rating,
        flag,
        tags_imported,
    })
}

/// Retourne le statut du sidecar XMP pour une image donnée.
///
/// Résout le chemin `.xmp` attendu depuis la DB et vérifie son existence sur le disque.
#[tauri::command]
pub async fn get_xmp_status(
    image_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<XmpStatusDTO> {
    let resolved_image_path = {
        let mut db = state
            .db
            .lock()
            .map_err(|e| format!("Database lock poisoned: {}", e))?;
        resolve_image_file_path(&mut db, image_id)
    };

    let image_path = match resolved_image_path {
        Ok(p) => p,
        Err(_) => {
            // Image sans chemin connu (not yet ingested ou en mémoire)
            return Ok(XmpStatusDTO {
                exists: false,
                xmp_path: String::new(),
            });
        }
    };

    let xmp_path = xmp::build_xmp_path(&image_path);
    let exists = tokio::fs::metadata(&xmp_path).await.is_ok();
    Ok(XmpStatusDTO {
        exists,
        xmp_path: xmp_path.to_string_lossy().to_string(),
    })
}
