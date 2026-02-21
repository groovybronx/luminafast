# Phase 2.3 - Génération de Previews

> **Statut** : ✅ **Complétée (100%)** — Thumbnails JPEG 240px générés et affichés dans la grille. Cache `Previews.lrdata/` opérationnel.

## Objectif
Implémenter un système complet de génération de thumbnails et previews haute qualité pour les fichiers RAW photographiques, avec cache intelligent et traitement parallèle.

## Périmètre

### Fonctionnalités requises
- [x] Génération de thumbnails (240px bord long, JPEG q75) pour grille rapide
- [x] Génération de previews haute résolution pour mode développement
- [x] Support des formats RAW principaux (CR3, RAF, ARW, NEF, ORF, PEF, RW2, DNG)
- [x] Cache intelligent avec structure basée sur BLAKE3 hash (`Previews.lrdata/thumbnails/`)
- [x] Batch processing avec progression et callbacks
- [x] Gestion des erreurs (fichiers corrompus, permissions, mémoire)
- [x] Parallélisation avec rayon pour performance optimale

### Architecture technique
- [x] Service Rust avec tokio::sync::Mutex pour concurrence
- [x] Intégration `image` crate pour traitement et redimensionnement
- [x] Structure de cache `Previews.lrdata/thumbnails/` organisée par hash BLAKE3
- [x] Commandes Tauri pour communication frontend (`get_preview_path`, `generate_preview`, etc.)
- [x] Types TypeScript stricts (zéro any)
- [x] Tests unitaires complets (>90% coverage)

### Performance cibles
- [x] Thumbnail generation <100ms par fichier RAW
- [x] Preview generation <500ms par fichier RAW
- [x] Support 4-8 threads parallèles
- [x] Cache hit/miss tracking et cleanup automatique
- [x] Memory usage stable (<200MB pour gros dossiers)

## Dépendances
- Phase 2.2 doit être complétée ✅
- Service filesystem disponible ✅
- Base de données SQLite initialisée ✅
- Service BLAKE3 disponible pour hash ✅

## Livrables
1. **Services Rust** : `src-tauri/src/services/preview.rs`
2. **Modèles** : `src-tauri/src/models/preview.rs`
3. **Commandes Tauri** : `src-tauri/src/commands/preview.rs`
4. **Types TypeScript** : `src/types/preview.ts`
5. **Service Frontend** : `src/services/previewService.ts`
6. **Tests** : Tests unitaires pour tous les composants

## Architecture technique

### Structure du cache
```
.luminafast/
├── previews/
│   ├── thumbnails/
│   │   └── b3/
│   │       └── [blake3_hash[:2]]/
│   │           └── [blake3_hash].jpg
│   └── previews/
│       └── b3/
│           └── [blake3_hash[:2]]/
│               └── [blake3_hash].jpg
```

### Service Rust
- `PreviewService` : Service singleton avec état partagé
- `ThumbnailGenerator` : Génération thumbnails rapide
- `PreviewGenerator` : Génération previews haute qualité
- `CacheManager` : Gestion du cache et cleanup

### Types principaux
```rust
pub struct PreviewConfig {
    pub thumbnail_size: (u32, u32),
    pub preview_size: (u32, u32),
    pub jpeg_quality: u8,
    pub cache_dir: PathBuf,
}

pub enum PreviewType {
    Thumbnail,
    Preview,
}

pub struct PreviewResult {
    pub path: PathBuf,
    pub size: (u32, u32),
    pub file_size: u64,
    pub generation_time: Duration,
}
```

## Critères de validation
- [ ] Tous les tests unitaires passent
- [ ] TypeScript strict, zéro `any`
- [ ] Documentation Rust (`///`) pour fonctions publiques
- [ ] Performance conformes aux cibles
- [ ] Gestion d'erreurs explicite (Result<T,E>)
- [ ] Cache fonctionnel avec structure hash
- [ ] Parallélisation efficace

## Risques et mitigations
- **Risque** : Fichiers RAW corrompus ou non supportés
- **Mitigation** : Gestion d'erreurs robuste avec Result<T,E>
- **Risque** : Performance avec gros dossiers (>10k fichiers)
- **Mitigation** : Batch processing avec progression et parallélisation
- **Risque** : Memory usage avec gros RAW
- **Mitigation** : Streaming et libération mémoire explicite
- **Risque** : Dependencies libraw-rust compilation
- **Mitigation** : Fallback vers image crate ou system calls

## Timeline estimée
- Jour 1 : Analyse tech + modèles Rust + service preview
- Jour 2 : Commandes Tauri + types TypeScript
- Jour 3 : Service frontend + tests unitaires
- Jour 4 : Performance tuning + documentation

## Recherche technologique
À analyser avant implémentation :
1. **libraw-rust** : Binding Rust pour libraw (support RAW complet)
2. **image crate** : Support limité mais plus simple
3. **system calls** : dcraw/sips en fallback (macOS)
4. **Performance** : Benchmark des approches

---
*Phase 2.3 - Génération de Previews*
