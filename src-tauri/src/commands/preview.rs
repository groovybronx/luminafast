use crate::models::preview::*;
use crate::services::preview::PreviewService;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::OnceCell;

/// Instance globale du service preview
static PREVIEW_SERVICE: OnceCell<Arc<PreviewService>> = OnceCell::const_new();

/// Initialise le service preview
pub async fn init_preview_service(_app_handle: &AppHandle) -> Result<(), String> {
    let config = PreviewConfig::default();
    let service = PreviewService::new(config)
        .map_err(|e| format!("Impossible d'initialiser le service preview: {}", e))?;

    let service_arc = Arc::new(service);
    PREVIEW_SERVICE
        .set(service_arc)
        .map_err(|_| "Le service preview est déjà initialisé")?;

    log::info!("Service preview initialisé avec succès");
    Ok(())
}

/// Récupère le service preview
fn get_preview_service() -> Result<Arc<PreviewService>, String> {
    PREVIEW_SERVICE
        .get()
        .ok_or_else(|| "Service preview non initialisé".to_string())
        .cloned()
}

/// Génère une preview pour un fichier
#[tauri::command]
pub async fn generate_preview(
    file_path: String,
    preview_type: PreviewType,
    source_hash: String,
) -> Result<PreviewResult, String> {
    let service = get_preview_service()?;
    let path = PathBuf::from(file_path);

    service
        .generate_preview(&path, preview_type, &source_hash)
        .await
        .map_err(|e| format!("Erreur génération preview: {}", e))
}

/// Génère des previews en batch
#[tauri::command]
pub async fn generate_batch_previews(
    files: Vec<(String, String)>, // (path, hash)
    preview_type: PreviewType,
) -> Result<BatchPreviewStats, String> {
    let service = get_preview_service()?;
    let files_with_paths: Vec<(PathBuf, String)> = files
        .into_iter()
        .map(|(path, hash)| (PathBuf::from(path), hash))
        .collect();

    service
        .generate_batch_previews(files_with_paths, preview_type)
        .await
        .map_err(|e| format!("Erreur génération batch previews: {}", e))
}

/// Génère la pyramide complète des previews pour un fichier
#[tauri::command]
pub async fn generate_preview_pyramid(
    file_path: String,
    source_hash: String,
) -> Result<Vec<PreviewResult>, String> {
    let service = get_preview_service()?;
    let path = PathBuf::from(file_path);

    let mut results = Vec::new();

    // Générer les 3 types de previews
    for preview_type in [
        PreviewType::Thumbnail,
        PreviewType::Standard,
        PreviewType::OneToOne,
    ] {
        let result = service
            .generate_preview(&path, preview_type, &source_hash)
            .await
            .map_err(|e| format!("Erreur génération preview {:?}: {}", preview_type, e))?;
        results.push(result);
    }

    Ok(results)
}

/// Vérifie si une preview existe en cache
#[tauri::command]
pub async fn is_preview_cached(
    source_hash: String,
    preview_type: PreviewType,
) -> Result<bool, String> {
    let service = get_preview_service()?;

    Ok(service.is_preview_cached(&source_hash, &preview_type).await)
}

/// Récupère les informations sur le cache de previews
#[tauri::command]
pub async fn get_preview_cache_info() -> Result<PreviewCacheInfo, String> {
    let service = get_preview_service()?;

    Ok(service.get_cache_info().await)
}

/// Nettoie le cache des previews
#[tauri::command]
pub async fn cleanup_preview_cache(
    max_cache_size: u64,
    max_age_days: u32,
    max_previews_per_type: usize,
) -> Result<(), String> {
    let service = get_preview_service()?;

    let cleanup_config = CacheCleanupConfig {
        max_cache_size,
        max_age_days,
        max_previews_per_type,
        cleanup_interval_hours: 24, // Non utilisé pour le cleanup manuel
    };

    service
        .cleanup_cache(&cleanup_config)
        .await
        .map_err(|e| format!("Erreur cleanup cache: {}", e))
}

/// Supprime une preview spécifique du cache
#[tauri::command]
pub async fn remove_preview(source_hash: String, preview_type: PreviewType) -> Result<(), String> {
    let service = get_preview_service()?;

    service
        .remove_preview(&source_hash, &preview_type)
        .await
        .map_err(|e| format!("Erreur suppression preview: {}", e))
}

/// Récupère le chemin d'une preview si elle existe
#[tauri::command]
pub async fn get_preview_path(
    source_hash: String,
    preview_type: PreviewType,
) -> Result<Option<String>, String> {
    let service = get_preview_service()?;

    if service.is_preview_cached(&source_hash, &preview_type).await {
        // Récupérer le chemin du cache
        if let Some(path) = service
            .get_cached_preview_path(&source_hash, &preview_type)
            .await
        {
            Ok(Some(path.to_string_lossy().to_string()))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

/// Génère des previews pour une liste de fichiers avec progression
#[tauri::command]
pub async fn generate_previews_with_progress(
    files: Vec<(String, String)>, // (path, hash)
    preview_types: Vec<PreviewType>,
    app_handle: AppHandle,
) -> Result<BatchPreviewStats, String> {
    let service = get_preview_service()?;
    let files_with_paths: Vec<(PathBuf, String)> = files
        .into_iter()
        .map(|(path, hash)| (PathBuf::from(path), hash))
        .collect();

    let mut total_stats = BatchPreviewStats {
        batch_id: uuid::Uuid::new_v4(),
        total_files: files_with_paths.len() * preview_types.len(),
        successful_count: 0,
        failed_count: 0,
        skipped_count: 0,
        total_duration: std::time::Duration::ZERO,
        avg_time_per_file: std::time::Duration::ZERO,
        started_at: chrono::Utc::now(),
        completed_at: None,
    };

    let start_time = std::time::Instant::now();

    // Traiter chaque type de preview
    for (index, preview_type) in preview_types.iter().enumerate() {
        // Émettre un événement de progression
        let _ = app_handle.emit(
            "preview_progress",
            serde_json::json!({
                "type": "preview_type_started",
                "preview_type": preview_type,
                "current": index + 1,
                "total": preview_types.len()
            }),
        );

        let stats = service
            .generate_batch_previews(files_with_paths.clone(), *preview_type)
            .await
            .map_err(|e| format!("Erreur batch previews {:?}: {}", preview_type, e))?;

        total_stats.successful_count += stats.successful_count;
        total_stats.failed_count += stats.failed_count;
        total_stats.skipped_count += stats.skipped_count;

        // Émettre un événement de progression
        let _ = app_handle.emit(
            "preview_progress",
            serde_json::json!({
                "type": "preview_type_completed",
                "preview_type": preview_type,
                "successful": stats.successful_count,
                "failed": stats.failed_count,
                "skipped": stats.skipped_count
            }),
        );
    }

    total_stats.total_duration = start_time.elapsed();
    if total_stats.total_files > 0 {
        total_stats.avg_time_per_file = total_stats.total_duration / total_stats.total_files as u32;
    }
    total_stats.completed_at = Some(chrono::Utc::now());

    // Émettre l'événement final
    let _ = app_handle.emit(
        "preview_progress",
        serde_json::json!({
            "type": "batch_completed",
            "stats": total_stats
        }),
    );

    Ok(total_stats)
}

/// Test de performance du service preview
#[tauri::command]
pub async fn benchmark_preview_generation(
    test_file: String,
    iterations: usize,
) -> Result<Vec<PreviewResult>, String> {
    let service = get_preview_service()?;
    let path = PathBuf::from(test_file);

    // Calculer le hash pour le test (utiliser un hash fixe pour le benchmark)
    let test_hash = "benchmark_test_hash";

    let mut results = Vec::new();
    let start_time = std::time::Instant::now();

    for i in 0..iterations {
        let preview_type = match i % 3 {
            0 => PreviewType::Thumbnail,
            1 => PreviewType::Standard,
            _ => PreviewType::OneToOne,
        };

        let result = service
            .generate_preview(&path, preview_type, test_hash)
            .await
            .map_err(|e| format!("Erreur benchmark iteration {}: {}", i, e))?;

        results.push(result);
    }

    let total_time = start_time.elapsed();
    log::info!(
        "Benchmark terminé: {} previews en {:?}",
        iterations,
        total_time
    );

    Ok(results)
}

/// Récupère la configuration actuelle du service preview
#[tauri::command]
pub async fn get_preview_config() -> Result<PreviewConfig, String> {
    let _service = get_preview_service()?;

    // Note: Le service n'expose pas directement sa config,
    // donc on retourne la config par défaut pour l'instant
    Ok(PreviewConfig::default())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_preview_service_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let config = PreviewConfig {
            catalog_dir: temp_dir.path().to_path_buf(),
            ..Default::default()
        };

        let service = PreviewService::new(config).unwrap();
        let cache_info = service.get_cache_info().await;

        assert_eq!(cache_info.total_previews, 0);
        assert_eq!(cache_info.total_size, 0);
    }

    #[tokio::test]
    async fn test_preview_type_serialization() {
        let thumbnail = PreviewType::Thumbnail;
        let serialized = serde_json::to_string(&thumbnail).unwrap();
        let deserialized: PreviewType = serde_json::from_str(&serialized).unwrap();

        assert_eq!(thumbnail, deserialized);
    }
}
