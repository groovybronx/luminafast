/**
 * Types TypeScript pour le service de génération de previews
 * Phase 2.3 - Génération de Previews (Pyramide d'Images)
 */

/**
 * Types de previews disponibles (pyramide d'images)
 */
export enum PreviewType {
  /** Thumbnail pour grille (240px bord long, JPEG q75) */
  Thumbnail = 'thumbnail',
  /** Standard pour affichage plein écran (1440px bord long, JPEG q85) */
  Standard = 'standard',
  /** 1:1 pour zoom pixel (résolution native, JPEG q90) */
  OneToOne = 'one_to_one',
}

/**
 * Configuration pour la génération de previews
 */
export interface PreviewConfig {
  /** Répertoire du catalogue (contient Previews.lrdata/) */
  catalog_dir: string;
  /** Nombre de threads pour traitement parallèle */
  parallel_threads: number;
  /** Timeout pour génération (secondes) */
  generation_timeout: number;
  /** Utiliser libvips si disponible, sinon image crate */
  use_libvips: boolean;
}

/**
 * Résultat de la génération d'une preview
 */
export interface PreviewResult {
  /** Chemin vers le fichier preview généré */
  path: string;
  /** Type de preview */
  preview_type: PreviewType;
  /** Dimensions réelles (largeur, hauteur) */
  size: [number, number];
  /** Taille du fichier en octets */
  file_size: number;
  /** Temps de génération en millisecondes */
  generation_time: number;
  /** Hash BLAKE3 du fichier original */
  source_hash: string;
  /** Timestamp de génération */
  generated_at: string;
}

/**
 * Métadonnées d'une preview dans la base de données previews.db
 */
export interface PreviewRecord {
  /** ID unique de la preview */
  id: number;
  /** Hash BLAKE3 du fichier source */
  source_hash: string;
  /** Type de preview */
  preview_type: PreviewType;
  /** Chemin relatif depuis Previews.lrdata/ */
  relative_path: string;
  /** Dimensions réelles (largeur, hauteur) */
  width: number;
  height: number;
  /** Taille du fichier en octets */
  file_size: number;
  /** Qualité JPEG utilisée */
  jpeg_quality: number;
  /** Date de génération */
  generated_at: string;
  /** Date de dernier accès */
  last_accessed: string;
  /** Nombre d'accès */
  access_count: number;
}

/**
 * Nouvelle preview à insérer dans la base
 */
export interface NewPreviewRecord {
  source_hash: string;
  preview_type: PreviewType;
  relative_path: string;
  width: number;
  height: number;
  file_size: number;
  jpeg_quality: number;
}

/**
 * Informations sur le cache de previews
 */
export interface PreviewCacheInfo {
  /** Nombre total de previews en cache */
  total_previews: number;
  /** Taille totale du cache (octets) */
  total_size: number;
  /** Nombre de thumbnails */
  thumbnail_count: number;
  /** Nombre de previews standard */
  preview_count: number;
  /** Dernier cleanup */
  last_cleanup: string | null;
}

/**
 * Statistiques de génération batch
 */
export interface BatchPreviewStats {
  /** ID unique du batch */
  batch_id: string;
  /** Nombre total de fichiers traités */
  total_files: number;
  /** Nombre de succès */
  successful_count: number;
  /** Nombre d'échecs */
  failed_count: number;
  /** Nombre de fichiers skip (déjà en cache) */
  skipped_count: number;
  /** Temps total de traitement en millisecondes */
  total_duration: number;
  /** Temps moyen par fichier en millisecondes */
  avg_time_per_file: number;
  /** Timestamp de début */
  started_at: string;
  /** Timestamp de fin */
  completed_at: string | null;
}

/**
 * Erreurs spécifiques au service preview
 */
export type PreviewError =
  | { type: 'unsupported_format'; format: string }
  | { type: 'corrupted_file'; path: string }
  | { type: 'processing_error'; message: string }
  | { type: 'write_error'; path: string }
  | { type: 'cache_error'; message: string }
  | { type: 'generation_timeout'; timeout: number }
  | { type: 'out_of_memory' }
  | { type: 'io_error'; message: string };

/**
 * État d'une preview dans le cache
 */
export enum PreviewStatus {
  /** Preview générée et valide */
  Ready = 'ready',
  /** En cours de génération */
  Generating = 'generating',
  /** Erreur de génération */
  Failed = 'failed',
  /** Obsolète (fichier source modifié) */
  Stale = 'stale',
}

/**
 * Métadonnées d'une preview en cache
 */
export interface PreviewMetadata {
  /** Hash BLAKE3 du fichier source */
  source_hash: string;
  /** Type de preview */
  preview_type: PreviewType;
  /** Chemin du fichier preview */
  path: string;
  /** État actuel */
  status: PreviewStatus;
  /** Taille du fichier preview */
  file_size: number;
  /** Dimensions */
  size: [number, number];
  /** Date de génération */
  generated_at: string;
  /** Dernier accès */
  last_accessed: string;
  /** Nombre d'accès */
  access_count: number;
}

/**
 * Événement de progression de génération
 */
export interface PreviewProgressEvent {
  /** Type de l'événement */
  type: 'preview_type_started' | 'preview_type_completed' | 'batch_completed';
  /** Type de preview (pour les événements de type) */
  preview_type?: PreviewType;
  /** Index actuel (pour preview_type_started) */
  current?: number;
  /** Total (pour preview_type_started) */
  total?: number;
  /** Nombre de succès (pour preview_type_completed) */
  successful?: number;
  /** Nombre d'échecs (pour preview_type_completed) */
  failed?: number;
  /** Nombre de fichiers skip (pour preview_type_completed) */
  skipped?: number;
  /** Statistiques complètes (pour batch_completed) */
  stats?: BatchPreviewStats;
}

/**
 * Configuration du cache cleanup
 */
export interface CacheCleanupConfig {
  /** Taille maximale du cache (octets) */
  max_cache_size: number;
  /** Âge maximal des previews (jours) */
  max_age_days: number;
  /** Nombre maximal de previews par type */
  max_previews_per_type: number;
  /** Fréquence de cleanup (heures) */
  cleanup_interval_hours: number;
}

/**
 * Options pour la génération de preview pyramidale
 */
export interface PreviewPyramidOptions {
  /** Générer tous les types de previews */
  generate_all: boolean;
  /** Types spécifiques à générer */
  preview_types?: PreviewType[];
  /** Forcer la régénération même si existant */
  force_regenerate: boolean;
  /** Émettre des événements de progression */
  emit_progress: boolean;
}

/**
 * Résultat de la génération pyramidale
 */
export interface PreviewPyramidResult {
  /** Hash du fichier source */
  source_hash: string;
  /** Résultats par type de preview */
  results: PreviewResult[];
  /** Temps total de génération */
  total_generation_time: number;
  /** Timestamp de génération */
  generated_at: string;
}

/**
 * Statistiques de performance du service preview
 */
export interface PreviewPerformanceStats {
  /** Temps moyen par type de preview */
  avg_generation_time: {
    thumbnail: number;
    standard: number;
    one_to_one: number;
  };
  /** Débit de traitement (previews/seconde) */
  throughput: number;
  /** Taux de succès */
  success_rate: number;
  /** Utilisation mémoire (octets) */
  memory_usage: number;
  /** Nombre de threads actifs */
  active_threads: number;
}

/**
 * Options de recherche de previews
 */
export interface PreviewSearchOptions {
  /** Types de previews à inclure */
  preview_types?: PreviewType[];
  /** Filtrer par date de génération */
  generated_after?: string;
  generated_before?: string;
  /** Filtrer par taille de fichier */
  min_file_size?: number;
  max_file_size?: number;
  /** Ordre de tri */
  sort_by?: 'generated_at' | 'file_size' | 'access_count';
  /** Ordre de tri */
  sort_order?: 'asc' | 'desc';
  /** Pagination */
  offset?: number;
  /** Nombre maximum de résultats */
  limit?: number;
}

/**
 * Résultat de recherche de previews
 */
export interface PreviewSearchResult {
  /** Previews trouvées */
  previews: PreviewRecord[];
  /** Nombre total de résultats */
  total_count: number;
  /** Offset utilisé */
  offset: number;
  /** Nombre maximum demandé */
  limit: number;
}

/**
 * État du service preview
 */
export interface PreviewServiceStatus {
  /** Service initialisé */
  initialized: boolean;
  /** Configuration actuelle */
  config: PreviewConfig;
  /** Informations sur le cache */
  cache_info: PreviewCacheInfo;
  /** Statistiques de performance */
  performance_stats: PreviewPerformanceStats;
  /** Nombre de générations en cours */
  active_generations: number;
  /** Dernière erreur */
  last_error: PreviewError | null;
}

/**
 * Événements émis par le service preview
 */
export type PreviewServiceEvent =
  | { type: 'preview_generated'; result: PreviewResult }
  | { type: 'preview_error'; error: PreviewError; source_hash: string }
  | { type: 'batch_started'; batch_id: string; total_files: number }
  | { type: 'batch_completed'; stats: BatchPreviewStats }
  | { type: 'cache_cleanup'; removed_count: number; freed_space: number }
  | { type: 'service_status'; status: PreviewServiceStatus };

/**
 * Types d'export pour les previews
 */
export enum PreviewExportFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  TIFF = 'tiff',
  WEBP = 'webp',
}

/**
 * Options d'export de preview
 */
export interface PreviewExportOptions {
  /** Format d'export */
  format: PreviewExportFormat;
  /** Qualité (pour JPEG/WebP) */
  quality?: number;
  /** Redimensionner */
  resize?: {
    width: number;
    height: number;
  };
  /** Appliquer des filtres */
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
}

/**
 * Résultat d'export de preview
 */
export interface PreviewExportResult {
  /** Chemin du fichier exporté */
  path: string;
  /** Taille du fichier exporté */
  file_size: number;
  /** Temps d'export en millisecondes */
  export_time: number;
  /** Format utilisé */
  format: PreviewExportFormat;
}
