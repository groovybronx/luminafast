# Phase 2.2 - Harvesting Métadonnées EXIF/IPTC

## Objectif
Implémenter un système complet d'extraction de métadonnées EXIF et IPTC pour les fichiers RAW, avec validation et stockage structuré.

## Périmètre

### Fonctionnalités requises
- [x] Extraction EXIF complète (ISO, ouverture, vitesse, date, GPS, etc.)
- [x] Extraction IPTC (copyright, keywords, description, etc.)
- [x] Support des formats RAW principaux (CR3, RAF, ARW, DNG, NEF, ORF, PEF, RW2)
- [x] Validation et normalisation des métadonnées
- [x] Gestion des erreurs (fichiers corrompus, permissions)
- [x] Batch extraction avec progression
- [x] Cache des métadonnées pour performance

### Architecture technique
- [x] Service Rust avec tokio::sync::Mutex pour concurrence
- [x] Intégration kamadak-exif pour extraction EXIF
- [x] Modèles TypeScript stricts (zéro any)
- [x] Commandes Tauri pour communication frontend
- [x] Tests unitaires complets (>90% coverage)

### Performance cibles
- [x] Extraction <50ms par fichier (sans I/O)
- [x] Support de dossiers avec >10,000 fichiers
- [x] Memory usage stable (<100MB pour gros dossiers)
- [x] Batch processing avec callbacks progression

## Dépendances
- Phase 2.1 doit être complétée ✅
- Service filesystem disponible ✅
- Base de données SQLite initialisée ✅

## Livrables
1. **Services Rust** : `src-tauri/src/services/exif.rs`, `src-tauri/src/services/iptc.rs`
2. **Modèles** : `src-tauri/src/models/exif.rs` (466 lignes)
3. **Commandes Tauri** : `src-tauri/src/commands/exif.rs`
4. **Types TypeScript** : `src/types/exif.ts`
5. **Service Frontend** : `src/services/exifService.ts`
6. **Tests** : Tests unitaires pour tous les composants

## Critères de validation
- [ ] Tous les tests unitaires passent
- [ ] TypeScript strict, zéro `any`
- [ ] Documentation Rust (`///`) pour fonctions publiques
- [ ] Performance conformes aux cibles
- [ ] Gestion d'erreurs explicite (Result<T,E>)
- [ ] Intégration avec service filesystem

## Risques et mitigations
- **Risque** : Fichiers RAW corrompus
- **Mitigation** : Gestion d'erreurs robuste avec Result<T,E>
- **Risque** : Performance avec gros dossiers
- **Mitigation** : Batch processing avec progression
- **Risque** : Métadonnées manquantes
- **Mitigation** : Valeurs par défaut et validation

## Timeline estimée
- Jour 1 : Services Rust + modèles
- Jour 2 : Commandes Tauri + tests
- Jour 3 : Types TypeScript + service frontend
- Jour 4 : Tests finaux + documentation

---
*Phase 2.2 - Harvesting Métadonnées EXIF/IPTC*
