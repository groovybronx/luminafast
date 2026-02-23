use crate::models::preview::*;
use chrono::Utc;
use rayon::prelude::*;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

/// Service de génération de previews pour fichiers RAW
pub struct PreviewService {
    /// Configuration du service
    config: PreviewConfig,
    /// Cache des métadonnées de previews
    cache_metadata: Arc<RwLock<HashMap<String, PreviewMetadata>>>,
    /// Cache des previews en cours de génération
    #[allow(dead_code)] // Prévu pour la gestion des requêtes concurrentes (Phase 2.3)
    generating: Arc<RwLock<HashMap<String, Vec<mpsc::UnboundedSender<PreviewProgressEvent>>>>>,
    /// Statistiques du service
    stats: Arc<RwLock<PreviewCacheInfo>>,
}

impl PreviewService {
    /// Crée une nouvelle instance du service preview
    pub fn new(config: PreviewConfig) -> Result<Self, PreviewError> {
        // Créer les répertoires de previews Previews.lrdata/
        let previews_dir = config.previews_dir();
        std::fs::create_dir_all(&previews_dir).map_err(|e| PreviewError::CacheError {
            message: format!("Impossible de créer le répertoire Previews.lrdata: {}", e),
        })?;

        // Créer les sous-répertoires pour chaque type de preview
        for preview_type in [
            PreviewType::Thumbnail,
            PreviewType::Standard,
            PreviewType::OneToOne,
        ] {
            let type_dir = config.preview_type_dir(preview_type);
            std::fs::create_dir_all(&type_dir).map_err(|e| PreviewError::CacheError {
                message: format!(
                    "Impossible de créer le répertoire {}: {}",
                    preview_type.subdir_name(),
                    e
                ),
            })?;
        }

        Ok(Self {
            config,
            cache_metadata: Arc::new(RwLock::new(HashMap::new())),
            generating: Arc::new(RwLock::new(HashMap::new())),
            stats: Arc::new(RwLock::new(PreviewCacheInfo {
                total_previews: 0,
                total_size: 0,
                thumbnail_count: 0,
                preview_count: 0,
                last_cleanup: None,
            })),
        })
    }

    /// Génère une preview pour un fichier RAW
    pub async fn generate_preview(
        &self,
        file_path: &Path,
        preview_type: PreviewType,
        source_hash: &str,
    ) -> Result<PreviewResult, PreviewError> {
        let _start_time = Instant::now();

        // Vérifier si la preview existe déjà en cache
        if let Some(cached_path) = self
            .get_cached_preview_path(source_hash, &preview_type)
            .await
        {
            if cached_path.exists() {
                let metadata =
                    std::fs::metadata(&cached_path).map_err(|e| PreviewError::IoError {
                        message: format!("Impossible de lire les métadonnées du cache: {}", e),
                    })?;

                let dimensions = self.get_image_dimensions(&cached_path)?;

                return Ok(PreviewResult {
                    path: cached_path.clone(),
                    preview_type,
                    size: dimensions,
                    file_size: metadata.len(),
                    generation_time: Duration::from_millis(0), // Cache hit
                    source_hash: source_hash.to_string(),
                    generated_at: Utc::now(),
                });
            }
        }

        // Générer la preview
        let result = self
            .generate_preview_internal(file_path, &preview_type, source_hash)
            .await?;

        // Mettre à jour le cache
        self.update_cache_metadata(&result).await?;

        log::info!(
            "Preview générée: {:?} en {:?}",
            result.path,
            result.generation_time
        );

        Ok(result)
    }

    /// Génère des previews en batch
    pub async fn generate_batch_previews(
        &self,
        files: Vec<(PathBuf, String)>, // (path, hash)
        preview_type: PreviewType,
    ) -> Result<BatchPreviewStats, PreviewError> {
        let batch_id = Uuid::new_v4();
        let start_time = Instant::now();
        let started_at = Utc::now();

        let mut stats = BatchPreviewStats {
            batch_id,
            total_files: files.len(),
            successful_count: 0,
            failed_count: 0,
            skipped_count: 0,
            total_duration: Duration::ZERO,
            avg_time_per_file: Duration::ZERO,
            started_at,
            completed_at: None,
        };

        // Traitement parallèle avec Rayon
        let results: Vec<Result<PreviewResult, PreviewError>> = files
            .par_iter()
            .map(|(path, hash)| {
                let rt = tokio::runtime::Handle::current();
                rt.block_on(async { self.generate_preview(path, preview_type, hash).await })
            })
            .collect();

        // Compter les résultats
        for result in results {
            match result {
                Ok(_) => stats.successful_count += 1,
                Err(_) => stats.failed_count += 1,
            }
        }

        stats.total_duration = start_time.elapsed();
        if stats.total_files > 0 {
            stats.avg_time_per_file = stats.total_duration / stats.total_files as u32;
        }
        stats.completed_at = Some(Utc::now());

        log::info!(
            "Batch preview terminé: {}/{} succès en {:?}",
            stats.successful_count,
            stats.total_files,
            stats.total_duration
        );

        Ok(stats)
    }

    /// Vérifie si une preview existe en cache
    pub async fn is_preview_cached(&self, source_hash: &str, preview_type: &PreviewType) -> bool {
        let cached_path = match self
            .get_cached_preview_path(source_hash, preview_type)
            .await
        {
            Some(path) => path,
            None => return false,
        };

        cached_path.exists()
    }

    /// Nettoie le cache des previews
    pub async fn cleanup_cache(
        &self,
        cleanup_config: &CacheCleanupConfig,
    ) -> Result<(), PreviewError> {
        let mut metadata = self.cache_metadata.write().await;
        let mut removed_count = 0;
        let mut removed_size = 0u64;
        let now = Utc::now();

        // Collecter les previews à supprimer
        let to_remove: Vec<String> = metadata
            .iter()
            .filter(|(_, meta)| {
                let age = now.signed_duration_since(meta.generated_at);
                age.num_days() > cleanup_config.max_age_days as i64
            })
            .map(|(hash, _)| hash.clone())
            .collect();

        // Supprimer les fichiers et métadonnées
        for hash in to_remove {
            if let Some(meta) = metadata.remove(&hash) {
                if let Err(e) = std::fs::remove_file(&meta.path) {
                    log::warn!(
                        "Impossible de supprimer le fichier preview {:?}: {}",
                        meta.path,
                        e
                    );
                } else {
                    removed_count += 1;
                    removed_size += meta.file_size;
                }
            }
        }

        // Mettre à jour les statistiques
        let mut stats = self.stats.write().await;
        stats.total_previews -= removed_count;
        stats.total_size -= removed_size;
        stats.last_cleanup = Some(now);

        log::info!(
            "Cache cleanup: {} previews supprimées ({} octets)",
            removed_count,
            removed_size
        );

        Ok(())
    }

    /// Récupère les informations sur le cache
    pub async fn get_cache_info(&self) -> PreviewCacheInfo {
        self.stats.read().await.clone()
    }

    /// Supprime une preview spécifique du cache
    pub async fn remove_preview(
        &self,
        source_hash: &str,
        preview_type: &PreviewType,
    ) -> Result<(), PreviewError> {
        let cached_path = self
            .get_cached_preview_path(source_hash, preview_type)
            .await
            .ok_or_else(|| PreviewError::CacheError {
                message: "Preview non trouvée en cache".to_string(),
            })?;

        if cached_path.exists() {
            std::fs::remove_file(&cached_path).map_err(|e| PreviewError::IoError {
                message: format!("Impossible de supprimer la preview: {}", e),
            })?;
        }

        // Supprimer des métadonnées
        let mut metadata = self.cache_metadata.write().await;
        metadata.remove(source_hash);

        Ok(())
    }

    // --- Méthodes privées ---

    /// Génère une preview (implémentation interne)
    async fn generate_preview_internal(
        &self,
        file_path: &Path,
        preview_type: &PreviewType,
        source_hash: &str,
    ) -> Result<PreviewResult, PreviewError> {
        let start_time = Instant::now();

        // Vérifier que le fichier existe
        if !file_path.exists() {
            return Err(PreviewError::CorruptedFile {
                path: file_path.to_string_lossy().to_string(),
            });
        }

        // Déterminer le format du fichier
        let _extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .ok_or_else(|| PreviewError::UnsupportedFormat {
                format: "inconnu".to_string(),
            })?;

        // Générer la preview selon le type
        let (output_path, dimensions) = match preview_type {
            PreviewType::Thumbnail => {
                let size = PreviewType::Thumbnail.default_size();
                let output_path = self
                    .get_cached_preview_path(source_hash, preview_type)
                    .await
                    .ok_or_else(|| PreviewError::CacheError {
                        message: "Impossible de déterminer le chemin de cache".to_string(),
                    })?;

                self.generate_thumbnail(file_path, &output_path, size)
                    .await?;
                (output_path, size)
            }
            PreviewType::Standard => {
                let size = PreviewType::Standard.default_size();
                let output_path = self
                    .get_cached_preview_path(source_hash, preview_type)
                    .await
                    .ok_or_else(|| PreviewError::CacheError {
                        message: "Impossible de déterminer le chemin de cache".to_string(),
                    })?;

                self.generate_preview_image(file_path, &output_path, size)
                    .await?;
                (output_path, size)
            }
            PreviewType::OneToOne => {
                let output_path = self
                    .get_cached_preview_path(source_hash, preview_type)
                    .await
                    .ok_or_else(|| PreviewError::CacheError {
                        message: "Impossible de déterminer le chemin de cache".to_string(),
                    })?;

                self.generate_native_preview(file_path, &output_path)
                    .await?;
                // Pour 1:1, les dimensions sont celles de l'image originale
                let dimensions = self.get_image_dimensions(file_path)?;
                (output_path, dimensions)
            }
        };

        // Récupérer les métadonnées du fichier généré
        let metadata = std::fs::metadata(&output_path).map_err(|e| PreviewError::IoError {
            message: format!("Impossible de lire les métadonnées de la preview: {}", e),
        })?;

        Ok(PreviewResult {
            path: output_path,
            preview_type: *preview_type,
            size: dimensions,
            file_size: metadata.len(),
            generation_time: start_time.elapsed(),
            source_hash: source_hash.to_string(),
            generated_at: Utc::now(),
        })
    }

    /// Génère un thumbnail
    async fn generate_thumbnail(
        &self,
        input_path: &Path,
        output_path: &Path,
        size: (u32, u32),
    ) -> Result<(), PreviewError> {
        // Utiliser rsraw pour les fichiers RAW
        if self.is_raw_file(input_path).await {
            self.generate_raw_thumbnail(input_path, output_path, size)
                .await
        } else {
            // Utiliser image crate pour les fichiers standards
            self.generate_standard_thumbnail(input_path, output_path, size)
                .await
        }
    }

    /// Génère une preview haute qualité
    async fn generate_preview_image(
        &self,
        input_path: &Path,
        output_path: &Path,
        size: (u32, u32),
    ) -> Result<(), PreviewError> {
        if self.is_raw_file(input_path).await {
            self.generate_raw_preview(input_path, output_path, size)
                .await
        } else {
            self.generate_standard_preview(input_path, output_path, size)
                .await
        }
    }

    /// Vérifie si un fichier est un format RAW supporté
    async fn is_raw_file(&self, path: &Path) -> bool {
        if let Some(extension) = path.extension() {
            if let Some(ext_str) = extension.to_str() {
                let ext_lower = ext_str.to_lowercase();
                matches!(
                    ext_lower.as_str(),
                    "cr3" | "cr2" | "raf" | "arw" | "nef" | "orf" | "pef" | "rw2" | "dng"
                )
            } else {
                false
            }
        } else {
            false
        }
    }

    /// Génère un thumbnail pour fichier RAW avec rsraw
    async fn generate_raw_thumbnail(
        &self,
        input_path: &Path,
        output_path: &Path,
        size: (u32, u32),
    ) -> Result<(), PreviewError> {
        // Créer les répertoires parents si nécessaire
        if let Some(parent) = output_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| PreviewError::IoError {
                    message: format!("Impossible de créer le répertoire de sortie: {}", e),
                })?;
        }

        // Lire le fichier RAW
        let data = tokio::fs::read(input_path)
            .await
            .map_err(|e| PreviewError::IoError {
                message: format!("Impossible de lire le fichier RAW: {}", e),
            })?;

        // Ouvrir le fichier RAW avec rsraw
        let mut raw_image =
            rsraw::RawImage::open(&data).map_err(|e| PreviewError::ProcessingError {
                message: format!("Erreur ouverture fichier RAW: {:?}", e),
            })?;

        // Essayer d'extraire les thumbnails embarqués
        match raw_image.extract_thumbs() {
            Ok(thumbs) if !thumbs.is_empty() => {
                // Utiliser le plus grand thumbnail disponible
                let thumb = thumbs
                    .iter()
                    .max_by_key(|t| t.width * t.height)
                    .expect("thumbs is not empty but max_by_key returned None");

                // Si le thumbnail est déjà assez petit, l'utiliser directement
                if thumb.width <= size.0 && thumb.height <= size.1 {
                    // Écrire le thumbnail directement
                    tokio::fs::write(output_path, &thumb.data)
                        .await
                        .map_err(|e| PreviewError::WriteError {
                            path: format!("{}: {}", output_path.to_string_lossy(), e),
                        })?;
                } else {
                    // Sinon, redimensionner le thumbnail
                    let img = image::load_from_memory(&thumb.data).map_err(|e| {
                        PreviewError::ProcessingError {
                            message: format!("Impossible de charger le thumbnail: {}", e),
                        }
                    })?;

                    let (original_width, original_height) = (img.width(), img.height());
                    let (new_width, new_height) =
                        self.calculate_resize_dimensions(original_width, original_height, size);

                    let resized =
                        img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

                    resized
                        .save(output_path)
                        .map_err(|e| PreviewError::WriteError {
                            path: format!("{}: {}", output_path.to_string_lossy(), e),
                        })?;
                }
                Ok(())
            }
            _ => {
                // Pas de thumbnail embarqué, traiter le RAW complet
                raw_image
                    .unpack()
                    .map_err(|e| PreviewError::ProcessingError {
                        message: format!("Erreur décompression RAW: {:?}", e),
                    })?;

                let processed = raw_image.process::<{ rsraw::BIT_DEPTH_8 }>().map_err(|e| {
                    PreviewError::ProcessingError {
                        message: format!("Erreur traitement RAW: {:?}", e),
                    }
                })?;

                // Convertir les données RAW en image
                let width = processed.width();
                let height = processed.height();
                let colors = processed.colors() as u32;

                if colors != 3 {
                    return Err(PreviewError::ProcessingError {
                        message: format!("Format couleur non supporté: {} canaux", colors),
                    });
                }

                let img = image::RgbImage::from_raw(width, height, processed.to_vec()).ok_or_else(
                    || PreviewError::ProcessingError {
                        message: "Impossible de créer l'image depuis les données RAW".to_string(),
                    },
                )?;

                // Redimensionner
                let (new_width, new_height) = self.calculate_resize_dimensions(width, height, size);

                let resized = image::DynamicImage::ImageRgb8(img).resize(
                    new_width,
                    new_height,
                    image::imageops::FilterType::Lanczos3,
                );

                resized
                    .save(output_path)
                    .map_err(|e| PreviewError::WriteError {
                        path: format!("{}: {}", output_path.to_string_lossy(), e),
                    })?;

                Ok(())
            }
        }
    }

    /// Génère une preview pour fichier RAW avec rsraw
    async fn generate_raw_preview(
        &self,
        input_path: &Path,
        output_path: &Path,
        size: (u32, u32),
    ) -> Result<(), PreviewError> {
        // Créer les répertoires parents si nécessaire
        if let Some(parent) = output_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| PreviewError::IoError {
                    message: format!("Impossible de créer le répertoire de sortie: {}", e),
                })?;
        }

        // Lire le fichier RAW
        let data = tokio::fs::read(input_path)
            .await
            .map_err(|e| PreviewError::IoError {
                message: format!("Impossible de lire le fichier RAW: {}", e),
            })?;

        // Ouvrir et traiter le fichier RAW avec rsraw
        let mut raw_image =
            rsraw::RawImage::open(&data).map_err(|e| PreviewError::ProcessingError {
                message: format!("Erreur ouverture fichier RAW: {:?}", e),
            })?;

        // Décompresser le RAW
        raw_image
            .unpack()
            .map_err(|e| PreviewError::ProcessingError {
                message: format!("Erreur décompression RAW: {:?}", e),
            })?;

        // Traiter en 8-bit pour les previews standard (meilleur compromis taille/qualité)
        let processed = raw_image.process::<{ rsraw::BIT_DEPTH_8 }>().map_err(|e| {
            PreviewError::ProcessingError {
                message: format!("Erreur traitement RAW: {:?}", e),
            }
        })?;

        // Convertir les données RAW en image
        let width = processed.width();
        let height = processed.height();
        let colors = processed.colors() as u32;

        if colors != 3 {
            return Err(PreviewError::ProcessingError {
                message: format!("Format couleur non supporté: {} canaux", colors),
            });
        }

        let img =
            image::RgbImage::from_raw(width, height, processed.to_vec()).ok_or_else(|| {
                PreviewError::ProcessingError {
                    message: "Impossible de créer l'image depuis les données RAW".to_string(),
                }
            })?;

        // Redimensionner pour la preview standard
        let (new_width, new_height) = self.calculate_resize_dimensions(width, height, size);

        let resized = image::DynamicImage::ImageRgb8(img).resize(
            new_width,
            new_height,
            image::imageops::FilterType::Lanczos3,
        );

        resized
            .save(output_path)
            .map_err(|e| PreviewError::WriteError {
                path: format!("{}: {}", output_path.to_string_lossy(), e),
            })?;

        Ok(())
    }

    /// Génère un thumbnail pour fichier standard avec image crate
    async fn generate_standard_thumbnail(
        &self,
        input_path: &Path,
        output_path: &Path,
        size: (u32, u32),
    ) -> Result<(), PreviewError> {
        // Créer les répertoires parents si nécessaire
        if let Some(parent) = output_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| PreviewError::IoError {
                    message: format!("Impossible de créer le répertoire de sortie: {}", e),
                })?;
        }

        let img = image::open(input_path).map_err(|e| PreviewError::ProcessingError {
            message: format!("Impossible d'ouvrir l'image: {}", e),
        })?;

        // Redimensionner en gardant le ratio et en utilisant 240px comme bord long
        let (original_width, original_height) = (img.width(), img.height());
        let (new_width, new_height) =
            self.calculate_resize_dimensions(original_width, original_height, size);

        let resized = img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

        // Sauvegarder avec la qualité appropriée pour thumbnail
        // Pour l'instant, utiliser save() simple - la qualité JPEG sera gérée plus tard
        resized
            .save(output_path)
            .map_err(|e| PreviewError::WriteError {
                path: format!("{}: {}", output_path.to_string_lossy(), e),
            })?;

        Ok(())
    }

    /// Génère une preview pour fichier standard avec image crate
    async fn generate_standard_preview(
        &self,
        input_path: &Path,
        output_path: &Path,
        size: (u32, u32),
    ) -> Result<(), PreviewError> {
        // Créer les répertoires parents si nécessaire
        if let Some(parent) = output_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| PreviewError::IoError {
                    message: format!("Impossible de créer le répertoire de sortie: {}", e),
                })?;
        }

        let img = image::open(input_path).map_err(|e| PreviewError::ProcessingError {
            message: format!("Impossible d'ouvrir l'image: {}", e),
        })?;

        // Pour preview standard: 1440px bord long
        let (original_width, original_height) = (img.width(), img.height());
        let (new_width, new_height) =
            self.calculate_resize_dimensions(original_width, original_height, size);

        let resized = img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

        // Sauvegarder avec la qualité appropriée pour preview standard
        // Pour l'instant, utiliser save() simple - la qualité JPEG sera gérée plus tard
        resized
            .save(output_path)
            .map_err(|e| PreviewError::WriteError {
                path: format!("{}: {}", output_path.to_string_lossy(), e),
            })?;

        Ok(())
    }

    /// Génère une preview 1:1 (résolution native) pour zoom pixel
    async fn generate_native_preview(
        &self,
        input_path: &Path,
        output_path: &Path,
    ) -> Result<(), PreviewError> {
        // Vérifier si c'est un fichier RAW
        if self.is_raw_file(input_path).await {
            // Créer les répertoires parents si nécessaire
            if let Some(parent) = output_path.parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .map_err(|e| PreviewError::IoError {
                        message: format!("Impossible de créer le répertoire de sortie: {}", e),
                    })?;
            }

            // Lire le fichier RAW
            let data = tokio::fs::read(input_path)
                .await
                .map_err(|e| PreviewError::IoError {
                    message: format!("Impossible de lire le fichier RAW: {}", e),
                })?;

            // Ouvrir et traiter le fichier RAW avec rsraw
            let mut raw_image =
                rsraw::RawImage::open(&data).map_err(|e| PreviewError::ProcessingError {
                    message: format!("Erreur ouverture fichier RAW: {:?}", e),
                })?;

            // Décompresser le RAW
            raw_image
                .unpack()
                .map_err(|e| PreviewError::ProcessingError {
                    message: format!("Erreur décompression RAW: {:?}", e),
                })?;

            // Traiter en 16-bit pour la qualité maximale en 1:1
            let processed = raw_image
                .process::<{ rsraw::BIT_DEPTH_16 }>()
                .map_err(|e| PreviewError::ProcessingError {
                    message: format!("Erreur traitement RAW: {:?}", e),
                })?;

            // Convertir les données RAW en image
            let width = processed.width();
            let height = processed.height();
            let colors = processed.colors() as u32;

            if colors != 3 {
                return Err(PreviewError::ProcessingError {
                    message: format!("Format couleur non supporté: {} canaux", colors),
                });
            }

            // Pour 16-bit, ProcessedImage<BIT_DEPTH_16> derefs to [u16]
            // Convertir en 8-bit pour compatibilité avec RgbImage, en utilisant toute la plage 16-bit
            let processed_8bit: Vec<u8> = processed.iter()
                .map(|&pixel| ((pixel as u32 * 255) / 65535) as u8) // Convertir 16-bit vers 8-bit avec mise à l'échelle proportionnelle
                .collect();

            let img =
                image::RgbImage::from_raw(width, height, processed_8bit).ok_or_else(|| {
                    PreviewError::ProcessingError {
                        message: "Impossible de créer l'image depuis les données RAW".to_string(),
                    }
                })?;

            // Sauvegarder sans redimensionnement pour 1:1
            image::DynamicImage::ImageRgb8(img)
                .save(output_path)
                .map_err(|e| PreviewError::WriteError {
                    path: format!("{}: {}", output_path.to_string_lossy(), e),
                })?;

            Ok(())
        } else {
            // Fichier standard (JPEG, PNG, etc.)
            // Créer les répertoires parents si nécessaire
            if let Some(parent) = output_path.parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .map_err(|e| PreviewError::IoError {
                        message: format!("Impossible de créer le répertoire de sortie: {}", e),
                    })?;
            }

            let img = image::open(input_path).map_err(|e| PreviewError::ProcessingError {
                message: format!("Impossible d'ouvrir l'image: {}", e),
            })?;

            // Pour preview 1:1: résolution native, pas de redimensionnement
            // Sauvegarder avec la qualité maximale pour zoom pixel
            img.save(output_path)
                .map_err(|e| PreviewError::WriteError {
                    path: format!("{}: {}", output_path.to_string_lossy(), e),
                })?;

            Ok(())
        }
    }

    /// Récupère le chemin de cache pour une preview
    pub async fn get_cached_preview_path(
        &self,
        source_hash: &str,
        preview_type: &PreviewType,
    ) -> Option<PathBuf> {
        if source_hash.len() < 2 {
            return None;
        }

        // Validate source_hash: must be a valid hex string without path traversal characters
        if !source_hash.chars().all(|c| c.is_ascii_hexdigit()) {
            log::error!("Invalid source_hash: contains non-hexadecimal characters");
            return None;
        }

        // Additional safety check: ensure no path traversal attempts
        if source_hash.contains('.') || source_hash.contains('/') || source_hash.contains('\\') {
            log::error!("Invalid source_hash: contains path traversal characters");
            return None;
        }

        let type_dir = self.config.preview_type_dir(*preview_type);
        let hash_prefix = &source_hash[..2];
        let filename = format!("{}.jpg", source_hash);

        Some(type_dir.join(hash_prefix).join(filename))
    }

    /// Met à jour les métadonnées du cache
    async fn update_cache_metadata(&self, result: &PreviewResult) -> Result<(), PreviewError> {
        let mut metadata = self.cache_metadata.write().await;
        let mut stats = self.stats.write().await;

        let preview_metadata = PreviewMetadata {
            source_hash: result.source_hash.clone(),
            preview_type: result.preview_type,
            path: result.path.clone(),
            status: PreviewStatus::Ready,
            file_size: result.file_size,
            size: result.size,
            generated_at: result.generated_at,
            last_accessed: Utc::now(),
            access_count: 1,
        };

        metadata.insert(result.source_hash.clone(), preview_metadata);

        // Mettre à jour les statistiques
        stats.total_previews = metadata.len();
        stats.total_size += result.file_size;

        match result.preview_type {
            PreviewType::Thumbnail => stats.thumbnail_count += 1,
            PreviewType::Standard => stats.preview_count += 1,
            PreviewType::OneToOne => stats.preview_count += 1,
        }

        Ok(())
    }

    /// Récupère les dimensions d'une image
    fn get_image_dimensions(&self, image_path: &Path) -> Result<(u32, u32), PreviewError> {
        let img = image::open(image_path).map_err(|e| PreviewError::ProcessingError {
            message: format!("Impossible d'ouvrir l'image pour dimensions: {}", e),
        })?;

        Ok((img.width(), img.height()))
    }

    /// Calcule le facteur d'échelle et les nouvelles dimensions pour redimensionner une image
    ///
    /// Redimensionne l'image en gardant son ratio d'aspect, de sorte que le côté le plus long
    /// de l'image originale ne dépasse pas target_size.0 pixels. Cette approche garantit que
    /// l'image s'inscrit dans un carré de target_size.0 x target_size.0 pixels.
    fn calculate_resize_dimensions(
        &self,
        original_width: u32,
        original_height: u32,
        target_size: (u32, u32),
    ) -> (u32, u32) {
        let scale_factor = target_size.0 as f32 / original_width.max(original_height) as f32;
        let new_width = (original_width as f32 * scale_factor) as u32;
        let new_height = (original_height as f32 * scale_factor) as u32;
        (new_width, new_height)
    }
}

#[cfg(test)]
mod tests {
            #[tokio::test]
            async fn test_preview_generation_performance_libvips() {
                // Ce test nécessite un fichier RAW de test accessible
                let test_file = std::env::var("LUMINAFAST_TEST_RAW").unwrap_or_else(|_| "/tmp/test_image.cr3".to_string());
                if !std::path::Path::new(&test_file).exists() {
                    eprintln!("[SKIP] Fichier RAW de test absent: {}", test_file);
                    return;
                }
                let config = PreviewConfig {
                    catalog_dir: PathBuf::from("/tmp/luminafast-perf-libvips"),
                    parallel_threads: 2,
                    generation_timeout: 30,
                    use_libvips: true,
                };
                let service = PreviewService::new(config).expect("init preview service");
                let hash = "testhash1234567890";
                let start = std::time::Instant::now();
                let result = service.generate_preview(
                    &std::path::Path::new(&test_file),
                    PreviewType::Thumbnail,
                    hash,
                ).await;
                let elapsed = start.elapsed();
                match result {
                    Ok(preview) => {
                        println!("[PERF] Génération libvips: {:?} en {:?}", preview.path, elapsed);
                        assert!(elapsed.as_secs_f32() < 2.0, "Génération trop lente (>2s)");
                    }
                    Err(e) => panic!("Erreur génération preview: {:?}", e),
                }
            }
        #[tokio::test]
        async fn test_preview_generation_libvips_flag() {
            let config = PreviewConfig {
                catalog_dir: PathBuf::from("/tmp/luminafast-test-libvips"),
                parallel_threads: 2,
                generation_timeout: 10,
                use_libvips: true,
            };
            let service = PreviewService::new(config.clone()).expect("init preview service");
            assert!(service.config.use_libvips, "libvips doit être activé dans la config");
            // Ce test vérifie uniquement que le flag est bien propagé dans le service.
            // Pour un test d'intégration complet, il faudrait un mock ou un fichier RAW de test et vérifier le chemin de code.
        }
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_test_service() -> (PreviewService, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let config = PreviewConfig {
            catalog_dir: temp_dir.path().to_path_buf(),
            ..Default::default()
        };

        let service = PreviewService::new(config).unwrap();
        (service, temp_dir)
    }

    #[tokio::test]
    async fn test_preview_service_creation() {
        let (service, _temp_dir) = create_test_service();
        let cache_info = service.get_cache_info().await;

        assert_eq!(cache_info.total_previews, 0);
        assert_eq!(cache_info.total_size, 0);
    }

    #[tokio::test]
    async fn test_cached_preview_path() {
        let (service, _temp_dir) = create_test_service();

        let path = service
            .get_cached_preview_path("b3a1c2d3e4f5", &PreviewType::Thumbnail)
            .await;
        assert!(path.is_some());

        let path = path.expect("Path should be some");
        assert!(path.to_string_lossy().contains("thumbnails"));
        assert!(path.to_string_lossy().contains("b3"));
        assert!(path.to_string_lossy().ends_with("b3a1c2d3e4f5.jpg"));
    }

    #[tokio::test]
    async fn test_is_raw_file() {
        let (service, _temp_dir) = create_test_service();

        assert!(service.is_raw_file(&PathBuf::from("test.cr3")).await);
        assert!(service.is_raw_file(&PathBuf::from("test.RAF")).await);
        assert!(service.is_raw_file(&PathBuf::from("test.arw")).await);
        assert!(!service.is_raw_file(&PathBuf::from("test.jpg")).await);
        assert!(!service.is_raw_file(&PathBuf::from("test.png")).await);
    }

    #[tokio::test]
    async fn test_preview_type_defaults() {
        assert_eq!(PreviewType::Thumbnail.default_size(), (240, 240));
        assert_eq!(PreviewType::Standard.default_size(), (1440, 1080));
        assert_eq!(PreviewType::OneToOne.default_size(), (0, 0)); // Résolution native

        assert_eq!(PreviewType::Thumbnail.jpeg_quality(), 75);
        assert_eq!(PreviewType::Standard.jpeg_quality(), 85);
        assert_eq!(PreviewType::OneToOne.jpeg_quality(), 90);

        assert_eq!(PreviewType::Thumbnail.max_file_size(), 50 * 1024);
        assert_eq!(PreviewType::Standard.max_file_size(), 500 * 1024);
        assert_eq!(PreviewType::OneToOne.max_file_size(), 2 * 1024 * 1024);

        assert_eq!(PreviewType::Thumbnail.subdir_name(), "thumbnails");
        assert_eq!(PreviewType::Standard.subdir_name(), "standard");
        assert_eq!(PreviewType::OneToOne.subdir_name(), "native");
    }

    #[tokio::test]
    async fn test_preview_config_default() {
        let config = PreviewConfig::default();
        assert_eq!(config.generation_timeout, 30);
        assert!(config.use_libvips);
        assert!(config.parallel_threads > 0);
        assert!(config.catalog_dir.ends_with("Pictures/LuminaFast"));
        assert!(config.previews_dir().ends_with("Previews.lrdata"));
    }

    #[tokio::test]
    async fn test_preview_result_serialization() {
        let result = PreviewResult {
            path: PathBuf::from("/test/preview.jpg"),
            preview_type: PreviewType::Thumbnail,
            size: (240, 180),
            file_size: 1024,
            generation_time: Duration::from_millis(100),
            source_hash: "b3a1c2d3".to_string(),
            generated_at: Utc::now(),
        };

        let serialized = serde_json::to_string(&result).unwrap();
        let deserialized: PreviewResult = serde_json::from_str(&serialized).unwrap();

        assert_eq!(result.preview_type, deserialized.preview_type);
        assert_eq!(result.size, deserialized.size);
        assert_eq!(result.file_size, deserialized.file_size);
    }

    #[test]
    fn test_preview_error_display() {
        let error = PreviewError::UnsupportedFormat {
            format: "cr3".to_string(),
        };
        assert!(error.to_string().contains("cr3"));

        let error = PreviewError::GenerationTimeout { timeout: 30u64 };
        assert!(error.to_string().contains("30s"));
    }

    #[test]
    fn test_cache_cleanup_config_default() {
        let config = CacheCleanupConfig::default();
        assert_eq!(config.max_cache_size, 2 * 1024 * 1024 * 1024);
        assert_eq!(config.max_age_days, 30);
        assert_eq!(config.max_previews_per_type, 10000);
        assert_eq!(config.cleanup_interval_hours, 24);
    }

    #[tokio::test]
    async fn test_batch_preview_stats_serialization() {
        let stats = BatchPreviewStats {
            batch_id: Uuid::new_v4(),
            total_files: 10,
            successful_count: 8,
            failed_count: 2,
            skipped_count: 0,
            total_duration: Duration::from_secs(5),
            avg_time_per_file: Duration::from_millis(500),
            started_at: Utc::now(),
            completed_at: Some(Utc::now()),
        };

        let serialized = serde_json::to_string(&stats).unwrap();
        let deserialized: BatchPreviewStats = serde_json::from_str(&serialized).unwrap();

        assert_eq!(stats.total_files, deserialized.total_files);
        assert_eq!(stats.successful_count, deserialized.successful_count);
        assert_eq!(stats.failed_count, deserialized.failed_count);
    }

    #[tokio::test]
    async fn test_preview_metadata_serialization() {
        let metadata = PreviewMetadata {
            source_hash: "b3a1c2d3e4f5".to_string(),
            preview_type: PreviewType::Thumbnail,
            path: PathBuf::from("/test/preview.jpg"),
            status: PreviewStatus::Ready,
            file_size: 25600,
            size: (240, 180),
            generated_at: Utc::now(),
            last_accessed: Utc::now(),
            access_count: 5,
        };

        let serialized = serde_json::to_string(&metadata).unwrap();
        let deserialized: PreviewMetadata = serde_json::from_str(&serialized).unwrap();

        assert_eq!(metadata.preview_type, deserialized.preview_type);
        assert_eq!(metadata.status, deserialized.status);
        assert_eq!(metadata.access_count, deserialized.access_count);
    }

    #[tokio::test]
    async fn test_preview_progress_event_serialization() {
        let event = PreviewProgressEvent {
            id: Uuid::new_v4(),
            preview_type: PreviewType::Thumbnail,
            source_path: PathBuf::from("/test/image.cr3"),
            progress: 0.5,
            message: "Generating preview".to_string(),
            timestamp: Utc::now(),
            stats: None,
        };

        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: PreviewProgressEvent = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.preview_type, PreviewType::Thumbnail);
        assert_eq!(deserialized.progress, 0.5);
        assert_eq!(deserialized.message, "Generating preview");
        assert!(deserialized.stats.is_none());
    }

    #[tokio::test]
    async fn test_cache_info_serialization() {
        let info = PreviewCacheInfo {
            total_previews: 150,
            total_size: 1024 * 1024 * 50, // 50MB
            thumbnail_count: 100,
            preview_count: 50,
            last_cleanup: Some(Utc::now()),
        };

        let serialized = serde_json::to_string(&info).unwrap();
        let deserialized: PreviewCacheInfo = serde_json::from_str(&serialized).unwrap();

        assert_eq!(info.total_previews, deserialized.total_previews);
        assert_eq!(info.thumbnail_count, deserialized.thumbnail_count);
        assert_eq!(info.preview_count, deserialized.preview_count);
    }

    #[tokio::test]
    async fn test_preview_config_serialization() {
        let config = PreviewConfig {
            catalog_dir: PathBuf::from("/test/catalog"),
            parallel_threads: 8,
            generation_timeout: 60,
            use_libvips: true,
        };

        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: PreviewConfig = serde_json::from_str(&serialized).unwrap();

        assert_eq!(config.catalog_dir, deserialized.catalog_dir);
        assert_eq!(config.parallel_threads, deserialized.parallel_threads);
        assert_eq!(config.generation_timeout, deserialized.generation_timeout);
        assert_eq!(config.use_libvips, deserialized.use_libvips);
    }
}
