---
layout: documentation
title: API Reference
description: Référence complète des commandes Tauri et services
previous:
  title: Documentation Application
  url: /documentation/app-documentation.html
next:
  title: Changelog
  url: /documentation/changelog.html
---

# API Reference

Référence complète de l'API LuminaFast avec toutes les commandes Tauri, services, et types de données.

---

## 📋 Vue d'Ensemble

L'API LuminaFast est organisée en plusieurs catégories :

- **Catalog** : Gestion du catalogue d'images
- **Hashing** : Service BLAKE3 et déduplication
- **Discovery** : Discovery et ingestion de fichiers
- **Filesystem** : Gestion du système de fichiers

---

## 🗄️ Catalog API

### Images

#### `get_all_images()`
```typescript
interface GetImagesResponse {
  images: CatalogImage[];
  total: number;
}
```

**Description** : Récupère toutes les images du catalogue avec pagination.

**Paramètres** :
- `limit?: number` - Nombre maximum d'images (défaut: 100)
- `offset?: number` - Offset pour pagination (défaut: 0)

**Retour** : Liste d'images et nombre total.

---

#### `get_image_detail(imageId: string)`
```typescript
interface ImageDetail extends CatalogImage {
  exif_metadata: ExifData;
  collections: Collection[];
  tags: Tag[];
}
```

**Description** : Récupère les détails complets d'une image.

**Paramètres** :
- `imageId: string` - ID unique de l'image

**Retour** : Détails complets incluant métadonnées et collections.

---

#### `update_image_state(imageId: string, state: Partial<ImageState>)`
```typescript
interface ImageState {
  rating: number; // 0-5
  flag: 'pick' | 'reject' | null;
  color_label: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | null;
}
```

**Description** : Met à jour l'état d'une image (notation, flag, color label).

**Paramètres** :
- `imageId: string` - ID de l'image
- `state: Partial<ImageState>` - Champs à mettre à jour

**Retour** : ImageState mis à jour.

---

### Collections

#### `create_collection(collection: CreateCollectionRequest)`
```typescript
interface CreateCollectionRequest {
  name: string;
  description?: string;
  type: 'static' | 'smart' | 'quick';
  query?: SmartQuery; // Pour les smart collections
}
```

**Description** : Crée une nouvelle collection.

**Paramètres** :
- `collection: CreateCollectionRequest` - Données de la collection

**Retour** : Collection créée avec ID généré.

---

#### `get_collections()`
```typescript
interface GetCollectionsResponse {
  collections: Collection[];
  total: number;
}
```

**Description** : Récupère toutes les collections.

**Retour** : Liste des collections avec images associées.

---

#### `add_images_to_collection(collectionId: string, imageIds: string[])`
```typescript
interface AddImagesResponse {
  added: number;
  duplicates: number;
  errors: string[];
}
```

**Description** : Ajoute des images à une collection.

**Paramètres** :
- `collectionId: string` - ID de la collection
- `imageIds: string[]` - IDs des images à ajouter

**Retour** : Résultat de l'opération.

---

### Recherche

#### `search_images(query: SearchQuery)`
```typescript
interface SearchQuery {
  text?: string;
  rating?: number;
  flag?: string;
  color_label?: string;
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}
```

**Description** : Recherche des images selon critères multiples.

**Paramètres** :
- `query: SearchQuery` - Critères de recherche

**Retour** : Images correspondant aux critères.

---

## 🔐 Hashing API

### Hachage

#### `hash_file(filePath: string)`
```typescript
interface HashResult {
  hash: string; // BLAKE3 hash en hex
  file_size: number;
  computation_time: number; // en ms
  algorithm: 'blake3';
}
```

**Description** : Calcule le hash BLAKE3 d'un fichier.

**Paramètres** :
- `filePath: string` - Chemin du fichier

**Retour** : Hash et métadonnées de calcul.

---

#### `hash_batch(filePaths: string[], progressCallback?: (progress: HashProgress) => void)`
```typescript
interface HashProgress {
  completed: number;
  total: number;
  current_file: string;
  percentage: number;
}
```

**Description** : Calcule les hashes de plusieurs fichiers avec progression.

**Paramètres** :
- `filePaths: string[]` - Liste des fichiers
- `progressCallback?: function` - Callback de progression

**Retour** : HashResult[] pour tous les fichiers.

---

### Déduplication

#### `detect_duplicates(filePaths: string[])`
```typescript
interface DuplicateGroup {
  hash: string;
  files: string[];
  file_size: number;
}
```

**Description** : Détecte les fichiers en double basé sur les hashes.

**Paramètres** :
- `filePaths: string[]` - Fichiers à analyser

**Retour** : Groupes de fichiers en double.

---

#### `verify_file_integrity(filePath: string, expectedHash: string)`
```typescript
interface IntegrityResult {
  is_valid: boolean;
  computed_hash: string;
  expected_hash: string;
  matches: boolean;
}
```

**Description** : Vérifie l'intégrité d'un fichier.

**Paramètres** :
- `filePath: string` - Fichier à vérifier
- `expectedHash: string` - Hash attendu

**Retour** : Résultat de la vérification.

---

### Cache et Performance

#### `get_hash_cache_stats()`
```typescript
interface CacheStats {
  total_entries: number;
  hit_rate: number; // pourcentage
  miss_rate: number;
  memory_usage: number; // en bytes
  oldest_entry: string;
  newest_entry: string;
}
```

**Description** : Statistiques du cache de hashes.

**Retour** : Métriques de performance du cache.

---

#### `benchmark_hashing(testFiles: string[])`
```typescript
interface BenchmarkResult {
  total_files: number;
  total_size: number;
  total_time: number;
  avg_time_per_file: number;
  throughput_mbps: number;
  algorithm: 'blake3';
}
```

**Description** : Benchmark des performances de hachage.

**Paramètres** :
- `testFiles: string[]` - Fichiers de test

**Retour** : Métriques de performance détaillées.

---

## 🔍 Discovery API

### Scanning

#### `scan_directory(directoryPath: string, options?: ScanOptions)`
```typescript
interface ScanOptions {
  recursive?: boolean; // défaut: true
  file_extensions?: string[]; // défaut: ['cr3', 'raf', 'arw', 'dng']
  max_depth?: number; // défaut: 10
  include_hidden?: boolean; // défaut: false
}
```

**Description** : Scan un répertoire à la recherche de fichiers images.

**Paramètres** :
- `directoryPath: string` - Répertoire à scanner
- `options?: ScanOptions` - Options de scan

**Retour** : Liste des fichiers découverts.

---

#### `start_discovery_session(sessionConfig: DiscoverySessionConfig)`
```typescript
interface DiscoverySessionConfig {
  name: string;
  directories: string[];
  file_filters: string[];
  auto_import?: boolean;
}
```

**Description** : Démarre une session de discovery.

**Paramètres** :
- `sessionConfig: DiscoverySessionConfig` - Configuration de session

**Retour** : ID de session créé.

---

### Ingestion

#### `ingest_files(filePaths: string[], sessionId: string, progressCallback?: (progress: IngestProgress) => void)`
```typescript
interface IngestProgress {
  session_id: string;
  completed: number;
  total: number;
  current_file: string;
  percentage: number;
  errors: string[];
}
```

**Description** : Importe des fichiers dans le catalogue.

**Paramètres** :
- `filePaths: string[]` - Fichiers à importer
- `sessionId: string` - ID de session
- `progressCallback?: function` - Callback de progression

**Retour** : Résultat de l'ingestion.

---

#### `get_ingestion_session_status(sessionId: string)`
```typescript
interface SessionStatus {
  session_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  files_processed: number;
  total_files: number;
  errors: string[];
  start_time: string;
  end_time?: string;
}
```

**Description** : Statut d'une session d'ingestion.

**Paramètres** :
- `sessionId: string` - ID de session

**Retour** : État actuel de la session.

---

## 📁 Filesystem API

### Watchers

#### `start_watcher(directoryPath: string, options?: WatcherOptions)`
```typescript
interface WatcherOptions {
  recursive?: boolean;
  event_types?: ('create' | 'modify' | 'delete')[];
  debounce_ms?: number; // défaut: 100
}
```

**Description** : Démarre un watcher sur un répertoire.

**Paramètres** :
- `directoryPath: string` - Répertoire à surveiller
- `options?: WatcherOptions` - Options du watcher

**Retour** : ID du watcher créé.

---

#### `stop_watcher(watcherId: string)`
**Description** : Arrête un watcher actif.

**Paramètres** :
- `watcherId: string` - ID du watcher

**Retour** : Succès/échec de l'opération.

---

### Verrous (Locks)

#### `acquire_lock(filePath: string, lockType: 'shared' | 'exclusive', timeout?: number)`
```typescript
interface LockResult {
  lock_id: string;
  file_path: string;
  lock_type: 'shared' | 'exclusive';
  acquired_at: string;
  expires_at?: string;
}
```

**Description** : Acquiert un verrou sur un fichier.

**Paramètres** :
- `filePath: string` - Fichier à verrouiller
- `lockType: 'shared' | 'exclusive'` - Type de verrou
- `timeout?: number` - Timeout en ms (défaut: 5000)

**Retour** : Informations du verrou acquis.

---

#### `release_lock(lockId: string)`
**Description** : Libère un verrou.

**Paramètres** :
- `lockId: string` - ID du verrou

**Retour** : Succès/échec.

---

#### `is_file_locked(filePath: string)`
```typescript
interface LockInfo {
  is_locked: boolean;
  lock_type?: 'shared' | 'exclusive';
  lock_count: number;
  locks: LockResult[];
}
```

**Description** : Vérifie si un fichier est verrouillé.

**Paramètres** :
- `filePath: string` - Fichier à vérifier

**Retour** : État des verrous sur le fichier.

---

### Événements

#### `get_pending_events(watcherId?: string)`
```typescript
interface FilesystemEvent {
  event_id: string;
  event_type: 'create' | 'modify' | 'delete';
  file_path: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Description** : Récupère les événements filesystem en attente.

**Paramètres** :
- `watcherId?: string` - ID du watcher (optionnel)

**Retour** : Liste des événements pending.

---

#### `clear_events(eventIds?: string[])`
**Description** : Nettoie les événements traités.

**Paramètres** :
- `eventIds?: string[]` - IDs des événements à supprimer

**Retour** : Nombre d'événements supprimés.

---

## 📊 Types de Données

### Image

```typescript
interface CatalogImage {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  blake3_hash: string;
  captured_at?: string;
  imported_at: string;
  modified_at: string;
  folder_id: string;
  state: ImageState;
  thumbnail_path?: string;
  preview_path?: string;
}
```

### EXIF

```typescript
interface ExifData {
  id: string;
  image_id: string;
  camera_make?: string;
  camera_model?: string;
  lens_model?: string;
  focal_length?: number;
  aperture?: number;
  shutter_speed?: string;
  iso?: number;
  exposure_time?: string;
  flash_used?: boolean;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  width?: number;
  height?: number;
  color_space?: string;
}
```

### Collection

```typescript
interface Collection {
  id: string;
  name: string;
  description?: string;
  type: 'static' | 'smart' | 'quick';
  query?: SmartQuery;
  created_at: string;
  modified_at: string;
  image_count: number;
  cover_image_id?: string;
}
```

---

## 🔧 Gestion des Erreurs

Toutes les commandes retournent des erreurs structurées :

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
```

### Codes d'Erreur Communs

- `FILE_NOT_FOUND` - Fichier introuvable
- `PERMISSION_DENIED` - Permissions insuffisantes
- `INVALID_PARAMETER` - Paramètre invalide
- `DATABASE_ERROR` - Erreur base de données
- `HASHING_ERROR` - Erreur lors du hachage
- `FILESYSTEM_ERROR` - Erreur système de fichiers

---

## 📝 Exemples d'Utilisation

### Importer des images

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Scanner un répertoire
const files = await invoke<string[]>('scan_directory', {
  directoryPath: '/Users/Photos/2024',
  options: {
    recursive: true,
    file_extensions: ['cr3', 'raf', 'arw']
  }
});

// Importer avec progression
await invoke('ingest_files', {
  filePaths: files,
  sessionId: 'session-123',
  progressCallback: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  }
});
```

### Rechercher des images

```typescript
const results = await invoke('search_images', {
  query: {
    rating: 5,
    tags: ['landscape', 'sunset'],
    date_range: {
      start: '2024-01-01',
      end: '2024-12-31'
    }
  }
});
```

---

*Pour plus d'exemples, consultez la [documentation application](app-documentation.html).*
