use crate::models::filesystem::{
    FileEvent, FileEventMetadata, FileEventType, FileLock, FileLockType, FilesystemError,
    FilesystemResult, FilesystemState, WatcherConfig, WatcherStats,
};
use chrono::Utc;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

/// Service de gestion du système de fichiers avec watchers et locks
pub struct FilesystemService {
    /// Watchers actifs
    watchers: Arc<RwLock<HashMap<Uuid, WatcherHandle>>>,
    /// Verrous actifs
    locks: Arc<RwLock<HashMap<PathBuf, FileLock>>>,
    /// Queue d'événements
    event_queue: Arc<RwLock<Vec<FileEvent>>>,
    /// Statistics
    stats: Arc<RwLock<FilesystemState>>,
}

/// Handle pour un watcher actif
struct WatcherHandle {
    /// ID du watcher
    id: Uuid,
    /// Watcher notify
    watcher: RecommendedWatcher,
    /// Configuration
    config: WatcherConfig,
    /// Channel pour les événements
    event_tx: mpsc::UnboundedSender<FileEvent>,
    /// Statistics
    stats: WatcherStats,
    /// Dernier événement pour debouncing
    last_event: Arc<RwLock<Option<(PathBuf, Instant)>>>,
}

impl FilesystemService {
    /// Crée une nouvelle instance du service
    pub fn new() -> Self {
        let service = Self {
            watchers: Arc::new(RwLock::new(HashMap::new())),
            locks: Arc::new(RwLock::new(HashMap::new())),
            event_queue: Arc::new(RwLock::new(Vec::new())),
            stats: Arc::new(RwLock::new(FilesystemState {
                active_watchers: Vec::new(),
                active_locks: Vec::new(),
                pending_events: 0,
                events_per_second: 0.0,
                last_updated: Utc::now(),
            })),
        };

        // Nettoyage périodique des verrous expirés
        service.start_lock_cleanup();
        service
    }

    /// Démarre un watcher sur un chemin
    pub async fn start_watcher(&self, config: WatcherConfig) -> FilesystemResult<Uuid> {
        let watcher_id = Uuid::new_v4();
        let path = config.path.clone();

        // Validation du chemin
        if !path.exists() {
            return Err(FilesystemError::FileNotFound(
                path.to_string_lossy().to_string(),
            ));
        }

        // Création du channel pour les événements
        let (event_tx, mut event_rx) = mpsc::unbounded_channel();

        // Clonage des données pour le watcher
        let config_clone = config.clone();
        let event_tx_clone = event_tx.clone();
        let queue_clone = Arc::clone(&self.event_queue);
        let stats_clone = Arc::clone(&self.stats);

        // Création du watcher notify
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                match res {
                    Ok(event) => {
                        // Conversion vers notre format
                        if let Some(fs_event) = Self::convert_notify_event(&event, &config_clone) {
                            if let Err(_) = event_tx_clone.send(fs_event) {
                                eprintln!("Failed to send filesystem event");
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Filesystem watcher error: {:?}", e);
                    }
                }
            },
            Config::default(),
        )
        .map_err(|e| FilesystemError::WatcherError(e.to_string()))?;

        // Démarrage de la surveillance
        let recursive_mode = if config.recursive {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        };

        watcher
            .watch(&path, recursive_mode)
            .map_err(|e| FilesystemError::WatcherError(e.to_string()))?;

        // Création du handle
        let handle = WatcherHandle {
            id: watcher_id,
            watcher,
            config: config.clone(),
            event_tx,
            stats: WatcherStats {
                watcher_id,
                path: path.clone(),
                events_processed: 0,
                errors: 0,
                started_at: Utc::now(),
                last_event_at: None,
                files_watched: 0,
                directories_watched: 0,
                memory_usage: 0,
            },
            last_event: Arc::new(RwLock::new(None)),
        };

        // Stockage du watcher
        {
            let mut watchers = self.watchers.write().await;
            watchers.insert(watcher_id, handle);
        }

        // Task pour traiter les événements
        let queue_task = queue_clone.clone();
        let stats_task = stats_clone.clone();
        tokio::spawn(async move {
            while let Some(event) = event_rx.recv().await {
                // Ajout à la queue
                {
                    let mut queue = queue_task.write().await;
                    queue.push(event.clone());
                }

                // Mise à jour des statistiques
                {
                    let mut stats = stats_task.write().await;
                    stats.pending_events += 1;
                    stats.last_updated = Utc::now();
                }
            }
        });

        // Comptage initial des fichiers/dossiers
        let (files, dirs) = self.count_path_items(&path).await?;
        {
            let mut watchers = self.watchers.write().await;
            if let Some(handle) = watchers.get_mut(&watcher_id) {
                handle.stats.files_watched = files;
                handle.stats.directories_watched = dirs;
            }
        }

        // Mise à jour des statistiques globales
        self.update_global_stats().await;

        Ok(watcher_id)
    }

    /// Arrête un watcher
    pub async fn stop_watcher(&self, watcher_id: Uuid) -> FilesystemResult<()> {
        let removed = {
            let mut watchers = self.watchers.write().await;
            if let Some(handle) = watchers.remove(&watcher_id) {
                // Le watcher sera automatiquement arrêté quand il est drop
                drop(handle.watcher);
                true
            } else {
                false
            }
        };

        if removed {
            self.update_global_stats().await;
            Ok(())
        } else {
            Err(FilesystemError::WatcherError(
                "Watcher not found".to_string(),
            ))
        }
    }

    /// Acquiert un verrou sur un fichier
    pub async fn acquire_lock(
        &self,
        path: PathBuf,
        lock_type: FileLockType,
        timeout: Option<Duration>,
    ) -> FilesystemResult<Uuid> {
        // Vérification si un verrou existe déjà
        {
            let locks = self.locks.read().await;
            if locks.contains_key(&path) {
                return Err(FilesystemError::LockAlreadyAcquired(
                    path.to_string_lossy().to_string(),
                ));
            }
        }

        // Validation du chemin
        if !path.exists() {
            return Err(FilesystemError::FileNotFound(
                path.to_string_lossy().to_string(),
            ));
        }

        // Création du verrou
        let lock = FileLock {
            id: Uuid::new_v4(),
            path: path.clone(),
            lock_type,
            process_id: std::process::id(),
            created_at: Utc::now(),
            timeout,
            inherited: false,
        };

        // Stockage du verrou
        {
            let mut locks = self.locks.write().await;
            locks.insert(path.clone(), lock.clone());
        }

        // Mise à jour des statistiques
        self.update_global_stats().await;

        Ok(lock.id)
    }

    /// Libère un verrou
    pub async fn release_lock(&self, lock_id: Uuid) -> FilesystemResult<()> {
        let removed = {
            let mut locks = self.locks.write().await;

            // Recherche du verrou par ID
            let lock_path = locks
                .iter()
                .find(|(_, lock)| lock.id == lock_id)
                .map(|(path, _)| path.clone());

            if let Some(path) = lock_path {
                locks.remove(&path);
                true
            } else {
                false
            }
        };

        if removed {
            self.update_global_stats().await;
            Ok(())
        } else {
            Err(FilesystemError::FileNotFound("Lock not found".to_string()))
        }
    }

    /// Récupère les événements en attente
    pub async fn get_pending_events(&self, limit: Option<usize>) -> Vec<FileEvent> {
        let mut queue = self.event_queue.write().await;
        let limit = limit.unwrap_or(queue.len());
        let actual_limit = limit.min(queue.len());

        queue.drain(..actual_limit).collect()
    }

    /// Récupère l'état actuel du service
    pub async fn get_state(&self) -> FilesystemState {
        self.update_global_stats().await;
        self.stats.read().await.clone()
    }

    /// Compte les fichiers et dossiers dans un chemin
    async fn count_path_items(&self, path: &Path) -> FilesystemResult<(u64, u64)> {
        let mut files = 0u64;
        let mut dirs = 0u64;

        let mut entries = tokio::fs::read_dir(path)
            .await
            .map_err(|e| FilesystemError::IoError(e.to_string()))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| FilesystemError::IoError(e.to_string()))?
        {
            let metadata = entry
                .metadata()
                .await
                .map_err(|e| FilesystemError::IoError(e.to_string()))?;

            if metadata.is_dir() {
                dirs += 1;
                // Récursion si configuré
                // Note: implémentation simplifiée pour Phase 1.4
            } else {
                files += 1;
            }
        }

        Ok((files, dirs))
    }

    /// Convertit un événement notify vers notre format
    fn convert_notify_event(event: &Event, config: &WatcherConfig) -> Option<FileEvent> {
        // Filtrage par extension
        if let Some(ref extensions) = config.extensions_filter {
            for path in &event.paths {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if !extensions.contains(&ext.to_lowercase()) {
                        return None;
                    }
                }
            }
        }

        // Filtrage par pattern
        if let Some(ref patterns) = config.pattern_filter {
            for path in &event.paths {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !patterns.iter().any(|pattern| {
                        // Pattern matching simple (pour Phase 1.4)
                        name.contains(pattern) || pattern == "*"
                    }) {
                        return None;
                    }
                }
            }
        }

        // Conversion du type d'événement
        let event_type = match event.kind {
            EventKind::Create(_) => {
                if event.paths.len() == 1 && event.paths[0].is_dir() {
                    FileEventType::DirectoryCreated
                } else {
                    FileEventType::Created
                }
            }
            EventKind::Modify(_) => FileEventType::Modified,
            EventKind::Remove(_) => {
                if event.paths.len() == 1 {
                    FileEventType::Deleted
                } else {
                    FileEventType::Renamed {
                        from: event.paths[0].clone(),
                        to: event.paths[1].clone(),
                    }
                }
            }
            _ => return None,
        };

        // Création de l'événement
        let path = event.paths[0].clone();
        let metadata = std::fs::metadata(&path).ok();

        Some(FileEvent {
            id: Uuid::new_v4(),
            event_type,
            path: path.clone(),
            timestamp: Utc::now(),
            size: metadata.as_ref().map(|m| m.len()),
            mime_type: Self::detect_mime_type(&path),
            metadata: FileEventMetadata {
                permissions: metadata.as_ref().map(|m| {
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        m.permissions().mode()
                    }
                    #[cfg(not(unix))]
                    {
                        0
                    }
                }),
                is_directory: metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                is_hidden: Self::is_hidden(&path),
                extension: path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_lowercase()),
                blake3_hash: None, // Sera rempli par le service BLAKE3
            },
        })
    }

    /// Détecte le type MIME d'un fichier
    fn detect_mime_type(path: &Path) -> Option<String> {
        let extension = path.extension()?.to_str()?.to_lowercase();

        match extension.as_str() {
            "jpg" | "jpeg" => Some("image/jpeg".to_string()),
            "png" => Some("image/png".to_string()),
            "gif" => Some("image/gif".to_string()),
            "tiff" | "tif" => Some("image/tiff".to_string()),
            "cr3" => Some("image/x-canon-cr3".to_string()),
            "raf" => Some("image/x-fuji-raf".to_string()),
            "arw" => Some("image/x-sony-arw".to_string()),
            "mp4" => Some("video/mp4".to_string()),
            "mov" => Some("video/quicktime".to_string()),
            "pdf" => Some("application/pdf".to_string()),
            _ => None,
        }
    }

    /// Vérifie si un fichier est caché
    fn is_hidden(path: &Path) -> bool {
        #[cfg(unix)]
        {
            path.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with('.'))
                .unwrap_or(false)
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            std::fs::metadata(path)
                .map(|m| (m.file_attributes() & 0x2) != 0)
                .unwrap_or(false)
        }
    }

    /// Met à jour les statistiques globales
    /// Filtre les verrous expirés pour garantir un état cohérent
    async fn update_global_stats(&self) {
        let watchers = self.watchers.read().await;
        let queue = self.event_queue.read().await;

        let active_watchers: Vec<WatcherStats> =
            watchers.values().map(|h| h.stats.clone()).collect();

        // Clean expired locks before reporting
        let now = Utc::now();
        let mut expired_paths = Vec::new();
        {
            let locks = self.locks.read().await;
            for (path, lock) in locks.iter() {
                if let Some(timeout) = lock.timeout {
                    let elapsed = now.signed_duration_since(lock.created_at);
                    if elapsed.to_std().unwrap_or(std::time::Duration::MAX) > timeout {
                        expired_paths.push(path.clone());
                    }
                }
            }
        }

        // Remove expired locks
        if !expired_paths.is_empty() {
            let mut locks = self.locks.write().await;
            for path in &expired_paths {
                locks.remove(path);
            }
        }

        // Build active locks list (post-cleanup)
        let locks = self.locks.read().await;
        let active_locks: Vec<FileLock> = locks.values().cloned().collect();

        let mut stats = self.stats.write().await;
        stats.active_watchers = active_watchers;
        stats.active_locks = active_locks;
        stats.pending_events = queue.len() as u64;
        stats.last_updated = Utc::now();
    }

    /// Démarre le nettoyage périodique des verrous expirés
    fn start_lock_cleanup(&self) {
        let locks_clone = Arc::clone(&self.locks);
        let stats_clone = Arc::clone(&self.stats);

        // Ne démarrer le cleanup que si nous sommes dans un runtime Tokio
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            handle.spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(30));

                loop {
                    interval.tick().await;

                    let now = Utc::now();
                    let mut expired_locks = Vec::new();

                    // Recherche des verrous expirés
                    {
                        let locks = locks_clone.read().await;
                        for (path, lock) in locks.iter() {
                            if let Some(timeout) = lock.timeout {
                                let elapsed = now.signed_duration_since(lock.created_at);
                                if elapsed.to_std().unwrap_or(Duration::MAX) > timeout {
                                    expired_locks.push(path.clone());
                                }
                            }
                        }
                    }

                    // Suppression des verrous expirés
                    if !expired_locks.is_empty() {
                        let mut locks = locks_clone.write().await;
                        for path in expired_locks {
                            locks.remove(&path);
                        }

                        // Mise à jour des statistiques
                        let mut stats = stats_clone.write().await;
                        stats.last_updated = Utc::now();
                    }
                }
            });
        }
        // Si pas de runtime Tokio disponible, on ne démarre pas le cleanup
    }
}

impl Default for FilesystemService {
    fn default() -> Self {
        Self::new()
    }
}

/// Tests unitaires
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_service_creation() {
        let service = FilesystemService::new();
        let state = service.get_state().await;

        assert_eq!(state.active_watchers.len(), 0);
        assert_eq!(state.active_locks.len(), 0);
        assert_eq!(state.pending_events, 0);
    }

    #[tokio::test]
    // #[ignore] // Temporairement désactivé - hanging test (>60s)
    async fn test_watcher_lifecycle() {
        let service = FilesystemService::new();
        let temp_dir = TempDir::new().unwrap();
        let config = WatcherConfig {
            path: temp_dir.path().to_path_buf(),
            recursive: false,
            watch_events: vec![FileEventType::Created, FileEventType::Modified],
            extensions_filter: None,
            pattern_filter: None,
            ignore_hidden: true,
            debounce_timeout: 100,
            max_file_size: None,
        };

        // Démarrage du watcher
        let watcher_id = service.start_watcher(config).await.unwrap();
        let state = service.get_state().await;
        assert_eq!(state.active_watchers.len(), 1);

        // Arrêt du watcher
        service.stop_watcher(watcher_id).await.unwrap();
        let state = service.get_state().await;
        assert_eq!(state.active_watchers.len(), 0);
    }

    #[tokio::test]
    // #[ignore] // Temporairement désactivé - hanging test (>60s)
    async fn test_file_locking() {
        let service = FilesystemService::new();
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");

        // Création du fichier
        File::create(&file_path)
            .unwrap()
            .write_all(b"test")
            .unwrap();

        // Acquisition du verrou
        let lock_id = service
            .acquire_lock(
                file_path.clone(),
                FileLockType::Exclusive,
                Some(Duration::from_secs(1)),
            )
            .await
            .unwrap();

        let state = service.get_state().await;
        assert_eq!(state.active_locks.len(), 1);

        // Tentative de double verrou (doit échouer)
        let result = service
            .acquire_lock(file_path.clone(), FileLockType::Shared, None)
            .await;
        assert!(result.is_err());

        // Libération du verrou
        service.release_lock(lock_id).await.unwrap();
        let state = service.get_state().await;
        assert_eq!(state.active_locks.len(), 0);
    }

    #[tokio::test]
    async fn test_mime_type_detection() {
        assert_eq!(
            FilesystemService::detect_mime_type(&PathBuf::from("test.jpg")),
            Some("image/jpeg".to_string())
        );
        assert_eq!(
            FilesystemService::detect_mime_type(&PathBuf::from("test.cr3")),
            Some("image/x-canon-cr3".to_string())
        );
        assert_eq!(
            FilesystemService::detect_mime_type(&PathBuf::from("test.unknown")),
            None
        );
    }

    #[tokio::test]
    async fn test_hidden_file_detection() {
        assert!(FilesystemService::is_hidden(&PathBuf::from(".hidden")));
        assert!(!FilesystemService::is_hidden(&PathBuf::from("visible")));
    }

    #[tokio::test]
    async fn test_lock_timeout() {
        let service = FilesystemService::new();
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");

        File::create(&file_path)
            .unwrap()
            .write_all(b"test")
            .unwrap();

        // Verrou avec timeout court
        let lock_id = service
            .acquire_lock(
                file_path.clone(),
                FileLockType::Exclusive,
                Some(Duration::from_millis(100)),
            )
            .await
            .unwrap();

        // Attente de l'expiration
        sleep(Duration::from_millis(200)).await;

        // Le verrou devrait être expiré et nettoyé
        let state = service.get_state().await;
        assert_eq!(state.active_locks.len(), 0);
    }
}
