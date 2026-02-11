# Phase 1.3 — Service BLAKE3 (Content Addressable Storage)

## Objectif

Implémenter un service de hachage BLAKE3 haute performance pour la détection de doublons et le stockage addressable par contenu. Ce service sera utilisé par le pipeline d'import (Phase 2) pour identifier les fichiers uniques et optimiser l'espace de stockage.

## Périmètre

### 1. Service BLAKE3 Rust
- **Fonctionnalité** : Hachage parallèle de fichiers avec BLAKE3
- **Performance** : Support multi-threading pour batch processing
- **API** : Interface synchrone et asynchrone
- **Validation** : Vérification d'intégrité des fichiers
- **Cache** : Cache des hashes déjà calculés

### 2. Détection de Doublons
- **Algorithmes** : Comparaison de hashes BLAKE3
- **Stratégies** : Hard duplicates, near duplicates (optionnel)
- **Reporting** : Rapport détaillé des doublons trouvés
- **Actions** : Options pour gérer les doublons (skip, replace, keep both)

### 3. Content Addressable Storage
- **Structure** : Organisation des fichiers par hash BLAKE3
- **Intégrité** : Vérification périodique des fichiers
- **Optimisation** : Déduplication au niveau stockage
- **Migration** : Path depuis structure existante vers CAS

### 4. Performance et Scalabilité
- **Benchmarking** : Tests de performance sur différents types de fichiers
- **Memory Management** : Streaming pour gros fichiers (>100MB)
- **Parallel Processing** : Utilisation de tous les coeurs CPU disponibles
- **Progress Reporting** : Interface pour monitoring du hachage

## Livrables

### Backend Rust
- `src-tauri/src/services/blake3.rs` : Service de hachage BLAKE3
- `src-tauri/src/models/hashing.rs` : Types pour hachage et doublons
- `src-tauri/src/commands/hashing.rs` : Commandes Tauri pour hachage
- Tests unitaires complets pour tous les composants

### Frontend TypeScript
- `src/services/hashingService.ts` : Wrapper TypeScript
- `src/types/hashing.ts` : DTOs pour hachage et doublons
- Interface utilisateur pour monitoring du hachage

### Tests et Performance
- Benchmarks BLAKE3 vs autres algorithmes
- Tests de charge avec milliers de fichiers
- Tests d'intégrité avec fichiers corrompus
- Tests de mémoire avec gros fichiers

## Contraintes Techniques

### BLAKE3 Implementation
- Utiliser crate `blake3` officiel
- Support streaming pour gros fichiers
- Parallélisation avec Rayon ou Tokio
- Gestion d'erreurs robuste

### Performance Cibles
- **Images RAW** : <100ms pour 50MB (Canon CR3, Fuji RAF)
- **Videos** : <500ms pour 1GB (MP4, MOV)
- **Documents** : <10ms pour 10MB (PDF, DOCX)
- **Batch** : 10x plus rapide que séquentiel

### Intégration Existante
- Compatible avec schéma SQLite existant
- Intégration avec pipeline d'import (Phase 2)
- Non-breaking pour fonctionnalités actuelles

## Dépendances

### Rust
- `blake3` : Implémentation BLAKE3 officielle
- `rayon` : Parallélisation (optionnel)
- `tokio` : Async runtime (si nécessaire)
- `thiserror` : Gestion d'erreurs

### TypeScript
- Types stricts pour tous les DTOs
- Interface de monitoring en temps réel
- Support pour progress callbacks

## Critères de Validation

### Fonctionnels
- [ ] Hachage BLAKE3 fonctionnel pour tous les formats supportés
- [ ] Détection de doublons 100% accurate
- [ ] Performance cibles atteintes sur benchmarks
- [ ] Interface monitoring responsive et informative

### Techniques
- [ ] Tests unitaires >90% coverage
- [ ] Pas de memory leaks avec gros fichiers
- [ ] Gestion d'erreurs robuste (fichiers corrompus, permissions)
- [ ] Code documenté et respecte conventions Rust

### Performance
- [ ] Benchmarks BLAKE3 vs SHA256 (2-3x plus rapide)
- [ ] Utilisation efficace de tous les coeurs CPU
- [ ] Memory usage < 1GB pour 10GB de fichiers
- [ ] Temps de réponse < 100ms pour < 50MB

## Notes d'Architecture

### BLAKE3 vs Alternatives
- **BLAKE3** : Plus rapide, moderne, cryptographiquement sécurisé
- **SHA256** : Plus lent, mais plus standard
- **MD5** : Rapide mais non sécurisé (déconseillé)

### Storage Strategy
- **Phase 1.3** : Service de hachage uniquement
- **Phase 2.1** : Intégration avec pipeline d'import
- **Phase 6.1** : Migration vers CAS complet

### Future Extensions
- Support pour near-duplicate detection
- Compression des fichiers identiques
- Distributed hashing (cluster)

## Risques et Mitigations

### Performance
- **Risque** : BLAKE3 plus lent que prévu sur certains hardware
- **Mitigation** : Fallback vers SHA256 si nécessaire

### Memory
- **Risque** : Memory usage excessif avec gros fichiers
- **Mitigation** : Streaming et chunking automatique

### Compatibility
- **Risque** : Incompatibilité avec certains formats de fichiers
- **Mitigation** : Tests extensifs sur formats RAW prioritaires

## Success Metrics

- **Speed** : 10x plus rapide que hachage séquentiel
- **Accuracy** : 100% détection de doublons exacts
- **Scalability** : Support pour 100k+ fichiers sans dégradation
- **User Experience** : Monitoring transparent et non-intrusif
