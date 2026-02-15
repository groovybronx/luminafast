use crate::models::hashing::*;
use blake3::Hasher;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::fs::metadata;

/// Service de hachage BLAKE3 haute performance
pub struct Blake3Service {
    /// Cache des hashes déjà calculés
    cache: Arc<Mutex<HashMap<PathBuf, FileHash>>>,
    /// Configuration du service
    config: HashConfig,
}

impl Blake3Service {
    /// Crée une nouvelle instance du service
    pub fn new(config: HashConfig) -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            config,
        }
    }

    /// Calcule le hash BLAKE3 d'un fichier (streaming pour gros fichiers)
    pub async fn hash_file(&self, file_path: &Path) -> HashResult<FileHash> {
        // Vérifier si le hash est déjà en cache
        if self.config.enable_cache {
            if let Ok(cache) = self.cache.lock() {
                if let Some(cached_hash) = cache.get(file_path) {
                    return Ok(cached_hash.clone());
                }
            }
        }

        // Vérifier que le fichier existe et est accessible
        let file_path = file_path.to_path_buf();
        let meta = metadata(&file_path).await.map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => HashError::FileNotFound(file_path.clone()),
            std::io::ErrorKind::PermissionDenied => HashError::PermissionDenied(file_path.clone()),
            _ => HashError::ReadError(file_path.clone(), e.to_string()),
        })?;

        // Vérifier la taille maximale
        if let Some(max_size) = self.config.max_file_size {
            if meta.len() > max_size {
                return Err(HashError::FileTooLarge(file_path, meta.len()));
            }
        }

        // Calculer le hash
        let hash = self.compute_hash_streaming(&file_path, meta.len())?;

        // Mettre en cache si activé
        if self.config.enable_cache {
            if let Ok(mut cache) = self.cache.lock() {
                cache.insert(file_path, hash.clone());
            }
        }

        Ok(hash)
    }

    /// Calcule le hash BLAKE3 avec streaming pour gérer les gros fichiers
    fn compute_hash_streaming(&self, file_path: &Path, file_size: u64) -> HashResult<FileHash> {
        let start_time = Instant::now();

        let file = File::open(file_path).map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => HashError::FileNotFound(file_path.to_path_buf()),
            std::io::ErrorKind::PermissionDenied => {
                HashError::PermissionDenied(file_path.to_path_buf())
            }
            _ => HashError::ReadError(file_path.to_path_buf(), e.to_string()),
        })?;

        let mut hasher = Hasher::new();
        let mut reader = BufReader::new(file);
        let mut buffer = vec![0u8; self.config.chunk_size];

        loop {
            let bytes_read = reader
                .read(&mut buffer)
                .map_err(|e| HashError::ReadError(file_path.to_path_buf(), e.to_string()))?;

            if bytes_read == 0 {
                break;
            }

            hasher.update(&buffer[..bytes_read]);
        }

        let hash_hex = hasher.finalize().to_hex().to_string();
        let elapsed = start_time.elapsed();

        // Log de performance pour les gros fichiers
        if file_size > 50 * 1024 * 1024 && elapsed.as_millis() > 100 {
            log::info!(
                "Hash BLAKE3 de {:?} ({}MB) en {}ms",
                file_path,
                file_size / (1024 * 1024),
                elapsed.as_millis()
            );
        }

        Ok(FileHash {
            hash: hash_hex,
            hash_type: HashType::Blake3,
            file_size,
            hashed_at: chrono::Utc::now(),
        })
    }

    /// Calcule les hashes de plusieurs fichiers en parallèle
    pub async fn hash_files_batch(
        &self,
        file_paths: &[PathBuf],
        progress_callback: Option<Box<dyn Fn(HashProgress) + Send + Sync>>,
    ) -> HashResult<Vec<(PathBuf, FileHash)>> {
        let total_files = file_paths.len() as u32;
        let processed_files = Arc::new(Mutex::new(0u32));
        let current_file = Arc::new(Mutex::new(None::<PathBuf>));

        // Pour le moment, implémentation séquentielle (async dans map est complexe)
        let mut results = Vec::new();

        for (_i, path) in file_paths.iter().enumerate() {
            // Mettre à jour la progression
            {
                let mut current_file_guard = current_file.lock().unwrap();
                *current_file_guard = Some(path.clone());
            }

            let result = self.hash_file(path).await;

            {
                let mut processed = processed_files.lock().unwrap();
                *processed += 1;

                // Envoyer la progression si callback fourni
                if let Some(ref callback) = progress_callback {
                    let progress = HashProgress {
                        processed_files: *processed,
                        total_files,
                        current_file: current_file.lock().unwrap().clone(),
                        progress: *processed as f64 / total_files as f64,
                    };
                    callback(progress);
                }
            }

            match result {
                Ok(hash) => results.push((path.clone(), hash)),
                Err(e) => return Err(e),
            }
        }

        Ok(results)
    }

    /// Détecte les doublons dans une liste de fichiers
    pub async fn detect_duplicates(
        &self,
        file_paths: &[PathBuf],
        progress_callback: Option<Box<dyn Fn(HashProgress) + Send + Sync>>,
    ) -> HashResult<DuplicateAnalysis> {
        let hash_results = self.hash_files_batch(file_paths, progress_callback).await?;

        // Grouper par hash
        let mut hash_groups: HashMap<String, Vec<PathBuf>> = HashMap::new();
        let mut file_sizes: HashMap<String, u64> = HashMap::new();

        for (path, file_hash) in hash_results {
            hash_groups
                .entry(file_hash.hash.clone())
                .or_insert_with(Vec::new)
                .push(path);
            file_sizes.insert(file_hash.hash, file_hash.file_size);
        }

        // Identifier les doublons (groupes avec >1 fichier)
        let duplicates: Vec<DuplicateInfo> = hash_groups
            .into_iter()
            .filter_map(|(hash, paths)| {
                if paths.len() > 1 {
                    let file_size = file_sizes[&hash];
                    Some(DuplicateInfo {
                        hash,
                        file_paths: paths,
                        file_size,
                        first_detected: chrono::Utc::now(),
                    })
                } else {
                    None
                }
            })
            .collect();

        let total_duplicate_files = duplicates.iter().map(|d| d.file_paths.len() as u32).sum();
        let wasted_space: u64 = duplicates
            .iter()
            .map(|d| d.file_size * (d.file_paths.len() as u64 - 1))
            .sum();

        Ok(DuplicateAnalysis {
            total_files: file_paths.len() as u32,
            duplicate_groups: duplicates.len() as u32,
            duplicate_files: total_duplicate_files,
            wasted_space,
            duplicates,
        })
    }

    /// Vérifie l'intégrité d'un fichier en comparant son hash actuel avec celui fourni
    pub async fn verify_integrity(
        &self,
        file_path: &Path,
        expected_hash: &str,
    ) -> HashResult<bool> {
        let current_hash = self.hash_file(file_path).await?;
        Ok(current_hash.hash == expected_hash)
    }

    /// Vide le cache des hashes
    pub fn clear_cache(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.clear();
        }
    }

    /// Retourne des statistiques sur le cache
    pub fn cache_stats(&self) -> (usize, usize) {
        if let Ok(cache) = self.cache.lock() {
            let count = cache.len();
            let size_bytes = cache
                .iter()
                .map(|(path, hash)| {
                    path.as_os_str().len() + hash.hash.len() + 16 // estimation
                })
                .sum();
            (count, size_bytes)
        } else {
            (0, 0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

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
    async fn test_file_not_found_error() {
        let service = Blake3Service::new(HashConfig::default());
        let non_existent_path = Path::new("/non/existent/file.txt");

        let result = service.hash_file(non_existent_path).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            HashError::FileNotFound(path) => assert_eq!(path, non_existent_path),
            _ => panic!("Expected FileNotFound error"),
        }
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

        // Créer des fichiers avec des contenus identiques
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
}
