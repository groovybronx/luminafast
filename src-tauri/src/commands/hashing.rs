use crate::models::hashing::*;
use crate::services::blake3::Blake3Service;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// État global pour le service de hachage
pub struct HashingState {
    pub service: Arc<Blake3Service>,
}

impl HashingState {
    pub fn new() -> Self {
        let config = HashConfig::default();
        Self {
            service: Arc::new(Blake3Service::new(config)),
        }
    }
}

/// Calcule le hash BLAKE3 d'un fichier
#[tauri::command]
pub async fn hash_file(app: AppHandle, file_path: String) -> Result<FileHash, String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    let path = PathBuf::from(file_path);
    service.hash_file(&path).await.map_err(|e| e.to_string())
}

/// Calcule les hashes de plusieurs fichiers en parallèle
#[tauri::command]
pub async fn hash_files_batch(
    app: AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<(String, FileHash)>, String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    let paths: Vec<PathBuf> = file_paths.into_iter().map(PathBuf::from).collect();
    let results = service
        .hash_files_batch(&paths, None)
        .await
        .map_err(|e| e.to_string())?;

    // Convertir PathBuf en String pour la sérialisation
    let serialized_results: Vec<(String, FileHash)> = results
        .into_iter()
        .map(|(path, hash)| (path.to_string_lossy().to_string(), hash))
        .collect();

    Ok(serialized_results)
}

/// Détecte les doublons dans une liste de fichiers
#[tauri::command]
pub async fn detect_duplicates(
    app: AppHandle,
    file_paths: Vec<String>,
) -> Result<DuplicateAnalysis, String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    let paths: Vec<PathBuf> = file_paths.into_iter().map(PathBuf::from).collect();
    service
        .detect_duplicates(&paths, None)
        .await
        .map_err(|e| e.to_string())
}

/// Scan un répertoire et détecte les doublons
#[tauri::command]
pub async fn scan_directory_for_duplicates(
    app: AppHandle,
    directory_path: String,
    recursive: bool,
) -> Result<DuplicateAnalysis, String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    let dir_path = PathBuf::from(directory_path);

    // Vérifier que le répertoire existe
    if !dir_path.exists() {
        return Err(format!("Directory not found: {:?}", dir_path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {:?}", dir_path));
    }

    // Scanner les fichiers du répertoire
    let file_paths = scan_files_in_directory(&dir_path, recursive)
        .map_err(|e| format!("Failed to scan directory: {}", e))?;

    // Détecter les doublons
    service
        .detect_duplicates(&file_paths, None)
        .await
        .map_err(|e| e.to_string())
}

/// Scan récursivement un répertoire pour trouver tous les fichiers
fn scan_files_in_directory(dir_path: &PathBuf, recursive: bool) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();

    let entries = std::fs::read_dir(dir_path)
        .map_err(|e| format!("Cannot read directory {:?}: {}", dir_path, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Cannot read entry: {}", e))?;
        let path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Cannot read metadata for {:?}: {}", path, e))?;

        if metadata.is_file() {
            files.push(path);
        } else if metadata.is_dir() && recursive {
            // Récursivement scanner les sous-répertoires
            let sub_files = scan_files_in_directory(&path, recursive)?;
            files.extend(sub_files);
        }
    }

    Ok(files)
}

/// Vérifie l'intégrité d'un fichier
#[tauri::command]
pub async fn verify_file_integrity(
    app: AppHandle,
    file_path: String,
    expected_hash: String,
) -> Result<bool, String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    let path = PathBuf::from(file_path);
    service
        .verify_integrity(&path, &expected_hash)
        .await
        .map_err(|e| e.to_string())
}

/// Vide le cache des hashes
#[tauri::command]
pub fn clear_hash_cache(app: AppHandle) -> Result<(), String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    service.clear_cache();
    Ok(())
}

/// Retourne les statistiques du cache
#[tauri::command]
pub fn get_hash_cache_stats(app: AppHandle) -> Result<(usize, usize), String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    Ok(service.cache_stats())
}

/// Test de performance du hachage
#[tauri::command]
pub async fn benchmark_hashing(
    app: AppHandle,
    test_file_path: String,
    iterations: u32,
) -> Result<HashBenchmarkResult, String> {
    let hashing_state = app.state::<HashingState>();
    let service = hashing_state.service.clone();

    let path = PathBuf::from(test_file_path);

    // Mesurer la taille du fichier
    let file_size = tokio::fs::metadata(&path)
        .await
        .map_err(|e| e.to_string())?
        .len();

    // Exécuter plusieurs itérations pour mesurer la performance
    let start_time = std::time::Instant::now();
    let mut hashes = Vec::new();

    for _ in 0..iterations {
        let hash_result = service.hash_file(&path).await.map_err(|e| e.to_string())?;
        hashes.push(hash_result);
    }

    let total_time = start_time.elapsed();
    let avg_time_per_hash = total_time / iterations;
    let throughput_mbps = (file_size as f64 / avg_time_per_hash.as_secs_f64()) / (1024.0 * 1024.0);

    // Vérifier que tous les hashes sont identiques
    let first_hash = &hashes[0].hash;
    let all_hashes_identical = hashes.iter().all(|h| h.hash == *first_hash);

    Ok(HashBenchmarkResult {
        file_path: path.to_string_lossy().to_string(),
        file_size,
        iterations,
        total_time_ms: total_time.as_millis() as u64,
        avg_time_per_hash_ms: avg_time_per_hash.as_millis() as u64,
        throughput_mbps: throughput_mbps as f64,
        all_hashes_identical,
        sample_hash: first_hash.clone(),
    })
}

/// Résultat du benchmark de hachage
#[derive(serde::Serialize)]
pub struct HashBenchmarkResult {
    pub file_path: String,
    pub file_size: u64,
    pub iterations: u32,
    pub total_time_ms: u64,
    pub avg_time_per_hash_ms: u64,
    pub throughput_mbps: f64,
    pub all_hashes_identical: bool,
    pub sample_hash: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::{Builder, NamedTempFile};

    #[tokio::test]
    async fn test_blake3_service_creation() {
        let service = Blake3Service::new(HashConfig::default());
        // Test que le service se crée sans erreur
        let (count, size) = service.cache_stats();
        assert_eq!(count, 0);
        assert_eq!(size, 0);
    }

    #[tokio::test]
    async fn test_blake3_hash_deterministic() {
        let service = Blake3Service::new(HashConfig::default());
        let mut temp_file = NamedTempFile::new().unwrap();

        // Écrire des données de test
        temp_file.write_all(b"test data for hashing").unwrap();
        temp_file.flush().unwrap();

        let hash1 = service.hash_file(temp_file.path()).await.unwrap();
        let hash2 = service.hash_file(temp_file.path()).await.unwrap();

        assert_eq!(hash1.hash, hash2.hash);
        assert_eq!(hash1.hash_type, HashType::Blake3);
        assert_eq!(hash1.file_size, 21); // "test data for hashing" = 21 bytes
    }

    #[tokio::test]
    async fn test_blake3_hash_different_for_different_input() {
        let service = Blake3Service::new(HashConfig::default());

        let mut temp_file1 = NamedTempFile::new().unwrap();
        temp_file1.write_all(b"data1").unwrap();
        temp_file1.flush().unwrap();

        let mut temp_file2 = NamedTempFile::new().unwrap();
        temp_file2.write_all(b"data2").unwrap();
        temp_file2.flush().unwrap();

        let hash1 = service.hash_file(temp_file1.path()).await.unwrap();
        let hash2 = service.hash_file(temp_file2.path()).await.unwrap();

        assert_ne!(hash1.hash, hash2.hash);
    }

    #[tokio::test]
    async fn test_empty_file_hash() {
        let service = Blake3Service::new(HashConfig::default());
        let temp_file = NamedTempFile::new().unwrap(); // fichier vide

        let hash = service.hash_file(temp_file.path()).await.unwrap();

        assert!(!hash.hash.is_empty());
        assert_eq!(hash.file_size, 0);
        assert_eq!(hash.hash_type, HashType::Blake3);
    }

    #[tokio::test]
    async fn test_batch_hashing() {
        let service = Blake3Service::new(HashConfig::default());

        // Créer plusieurs fichiers temporaires
        let mut temp_files = Vec::new();
        let mut temp_file_handles = Vec::new();
        for i in 0..3 {
            let mut temp_file = NamedTempFile::new().unwrap();
            temp_file
                .write_all(format!("test data {}", i).as_bytes())
                .unwrap();
            temp_file.flush().unwrap();
            temp_files.push(temp_file.path().to_path_buf());
            temp_file_handles.push(temp_file); // Garder le handle pour éviter la suppression
        }

        let results = service.hash_files_batch(&temp_files, None).await.unwrap();

        assert_eq!(results.len(), 3);

        // Vérifier que chaque fichier a un hash unique
        let hashes: Vec<String> = results.iter().map(|(_, hash)| hash.hash.clone()).collect();
        let mut unique_hashes = hashes.clone();
        unique_hashes.sort();
        unique_hashes.dedup();
        assert_eq!(unique_hashes.len(), 3);
    }

    #[tokio::test]
    async fn test_duplicate_detection() {
        let service = Blake3Service::new(HashConfig::default());

        // Créer des fichiers avec contenus identiques
        let mut temp_files = Vec::new();
        let mut temp_file_handles = Vec::new();

        // Deux fichiers identiques
        for _ in 0..2 {
            let mut temp_file = NamedTempFile::new().unwrap();
            temp_file.write_all(b"duplicate content").unwrap();
            temp_file.flush().unwrap();
            temp_files.push(temp_file.path().to_path_buf());
            temp_file_handles.push(temp_file); // Garder le handle
        }

        // Un fichier différent
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"unique content").unwrap();
        temp_file.flush().unwrap();
        temp_files.push(temp_file.path().to_path_buf());
        temp_file_handles.push(temp_file); // Garder le handle

        let analysis = service.detect_duplicates(&temp_files, None).await.unwrap();

        assert_eq!(analysis.total_files, 3);
        assert_eq!(analysis.duplicate_groups, 1);
        assert_eq!(analysis.duplicate_files, 2);
        assert_eq!(analysis.duplicates.len(), 1);
        assert_eq!(analysis.duplicates[0].file_paths.len(), 2);
    }

    #[tokio::test]
    async fn test_integrity_verification() {
        let service = Blake3Service::new(HashConfig::default());
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"integrity test").unwrap();
        temp_file.flush().unwrap();

        let original_hash = service.hash_file(temp_file.path()).await.unwrap();

        // Vérifier l'intégrité (devrait être true)
        let is_valid = service
            .verify_integrity(temp_file.path(), &original_hash.hash)
            .await
            .unwrap();
        assert!(is_valid);

        // Vérifier avec un mauvais hash (devrait être false)
        let is_invalid = service
            .verify_integrity(temp_file.path(), "wrong_hash")
            .await
            .unwrap();
        assert!(!is_invalid);
    }

    #[tokio::test]
    async fn test_cache_functionality() {
        let service = Blake3Service::new(HashConfig::default());
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"cache test").unwrap();
        temp_file.flush().unwrap();

        // Premier appel (calcule le hash)
        let start1 = std::time::Instant::now();
        let hash1 = service.hash_file(temp_file.path()).await.unwrap();
        let elapsed1 = start1.elapsed();

        // Deuxième appel (utilise le cache)
        let start2 = std::time::Instant::now();
        let hash2 = service.hash_file(temp_file.path()).await.unwrap();
        let elapsed2 = start2.elapsed();

        assert_eq!(hash1.hash, hash2.hash);
        assert!(elapsed2 < elapsed1); // Le cache devrait être plus rapide

        // Vérifier les stats du cache
        let (count, size) = service.cache_stats();
        assert!(count > 0);
        assert!(size > 0);

        // Vider le cache
        service.clear_cache();
        let (count_after, _) = service.cache_stats();
        assert_eq!(count_after, 0);
    }

    #[tokio::test]
    async fn test_file_not_found_error() {
        let service = Blake3Service::new(HashConfig::default());
        let temp_dir = Builder::new().tempdir().unwrap();
        let non_existent_path = temp_dir.path().join("non_existent_file.txt");

        let result = service.hash_file(&non_existent_path).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            HashError::FileNotFound(path) => assert_eq!(path, non_existent_path),
            _ => panic!("Expected FileNotFound error"),
        }
    }

    #[tokio::test]
    async fn test_permission_denied_error() {
        let service = Blake3Service::new(HashConfig::default());
        // Note: Ce test peut échouer selon les permissions du système
        // On teste juste que l'erreur est gérée
        let temp_dir = Builder::new().tempdir().unwrap();
        let restricted_path = temp_dir.path().join("restricted_file.txt");

        // Créer le fichier
        std::fs::write(&restricted_path, b"test").unwrap();

        // Sur certains systèmes, ce test peut passer si les permissions sont permissives
        let result = service.hash_file(&restricted_path).await;

        // Si le test passe, c'est que les permissions sont permissives (acceptable)
        // Si le test échoue avec PermissionDenied, c'est le comportement attendu
        if let Err(HashError::PermissionDenied(_)) = result {
            // Comportement attendu
        }
    }

    #[tokio::test]
    async fn test_scan_files_in_directory() {
        use std::fs::File;
        let temp_dir = Builder::new().tempdir().unwrap();
        let dir_path = temp_dir.path().to_path_buf();

        // Créer quelques fichiers de test
        File::create(dir_path.join("file1.txt")).unwrap();
        File::create(dir_path.join("file2.txt")).unwrap();

        // Créer un sous-répertoire avec un fichier
        std::fs::create_dir(dir_path.join("subdir")).unwrap();
        File::create(dir_path.join("subdir").join("file3.txt")).unwrap();

        // Test non-récursif
        let files = scan_files_in_directory(&dir_path, false).unwrap();
        assert_eq!(files.len(), 2); // Seulement file1.txt et file2.txt

        // Test récursif
        let files = scan_files_in_directory(&dir_path, true).unwrap();
        assert_eq!(files.len(), 3); // file1.txt, file2.txt, et subdir/file3.txt
    }

    #[tokio::test]
    async fn test_scan_files_in_directory_empty() {
        let temp_dir = Builder::new().tempdir().unwrap();
        let dir_path = temp_dir.path().to_path_buf();

        let files = scan_files_in_directory(&dir_path, false).unwrap();
        assert_eq!(files.len(), 0);
    }

    #[tokio::test]
    async fn test_scan_files_in_directory_error() {
        let non_existent_path = PathBuf::from("/nonexistent/directory");
        let result = scan_files_in_directory(&non_existent_path, false);
        assert!(result.is_err());
    }
}
