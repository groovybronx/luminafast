# Phase 2.1 — Discovery & Ingestion de Fichiers

> **Objectif** : Implémenter la détection automatique et l'ingestion des fichiers RAW sur le filesystem.

---

## Contexte

Cette sous-phase marque le début de la **Phase 2 - Ingestion & Catalog**. Elle utilise les services précédemment implémentés (BLAKE3, Filesystem, Database) pour détecter automatiquement les fichiers RAW (Canon CR3, Fuji RAF, Sony ARW) sur le disque et les ingérer dans le catalogue.

## Dépendances

- ✅ **Phase 1.1** : Schéma SQLite complet (table `images` prête)
- ✅ **Phase 1.2** : Tauri Commands CRUD (insertion d'images)
- ✅ **Phase 1.3** : Service BLAKE3 (hachage et déduplication)
- ✅ **Phase 1.4** : Service Filesystem (watchers et locks)

## Objectifs

### 2.1.1 — Service Discovery
- Créer `DiscoveryService` en Rust pour scanner les dossiers
- Support des formats RAW : Canon (.CR3), Fuji (.RAF), Sony (.ARW)
- Filtrage par extensions et signatures de fichiers
- Scan récursif avec exclusion des dossiers système

### 2.1.2 — Service Ingestion
- Créer `IngestionService` en Rust pour traiter les fichiers découverts
- Hachage BLAKE3 pour déduplication
- Extraction métadonnées EXIF de base
- Insertion en base de données avec transactions

### 2.1.3 — Commandes Tauri
- `start_discovery` : Démarrer le scan d'un dossier
- `stop_discovery` : Arrêter le scan en cours
- `get_discovery_status` : État du scan (progression, fichiers trouvés)
- `ingest_file` : Ingestion individuelle d'un fichier
- `batch_ingest` : Ingestion par lot

### 2.1.4 — Frontend TypeScript
- Types Discovery/Ingestion partagés
- Service wrapper avec gestion d'erreurs
- Interface de monitoring de l'ingestion
- Intégration avec les stores Zustand existants

## Livrables

### Backend Rust
- `src-tauri/src/services/discovery.rs` : Service de scan filesystem
- `src-tauri/src/services/ingestion.rs` : Service d'ingestion
- `src-tauri/src/commands/discovery.rs` : Commandes Tauri (5 commandes)
- `src-tauri/src/models/discovery.rs` : Types Discovery/Ingestion

### Frontend TypeScript
- `src/types/discovery.ts` : Types stricts pour le frontend
- `src/services/discoveryService.ts` : Wrapper avec fallbacks

### Tests
- Tests unitaires Rust (discovery, ingestion, commandes)
- Tests unitaires TypeScript (types, service wrapper)
- Tests d'intégration (scan → hash → insert)

## Critères de Validation

### Fonctionnels
- [x] Scan récursif détecte tous les fichiers RAW dans un dossier
- [x] Filtres excluent les dossiers système (.git, node_modules, etc.)
- [x] Hachage BLAKE3 évite les doublons lors de l'ingestion
- [x] Métadonnées EXIF de base extraites (ISO, ouverture, date)
- [x] Transactions SQLite garantissent la cohérence

### Performance
- [x] Scan <1s pour 1000 fichiers dans des dossiers imbriqués
- [x] Ingestion <100ms par fichier (hash + EXIF + insert)
- [x] Support de dossiers avec >10,000 fichiers
- [x] Memory usage stable (<50MB pour gros dossiers)

### Qualité
- [x] TypeScript strict, zéro `any`
- [x] Gestion d'erreurs explicite (permissions, fichiers corrompus)
- [x] Tests unitaires >90% coverage
- [x] Documentation Rust (`///`) pour toutes les fonctions publiques

## Architecture Technique

### Flux Discovery
```
Dossier cible → DiscoveryService → FileWatcher → FileFilter → CandidateFiles
```

### Flux Ingestion
```
CandidateFiles → BLAKE3 Hash → Doublon? → EXIF Extract → SQLite Insert → Result
```

### Concurrence
- Scan async avec tokio::spawn pour les gros dossiers
- Ingestion parallèle avec Rayon (max 4 threads)
- Locks filesystem pour éviter les conflits d'écriture

## Gestion d'Erreurs

### Cas d'erreur
- Permissions insuffisantes sur dossier
- Fichiers corrompus ou invalides
- Espace disque insuffisant
- Contraintes de base de données violées

### Stratégie
- Logging détaillé avec `thiserror`
- Continuation sur erreur (un fichier en échec ne bloque pas le batch)
- Rapport d'erreurs à l'utilisateur via le frontend

## Notes d'Implémentation

### Signatures de fichiers
- CR3 : Commence avec `ftypcr3 `
- RAF : Binaire Fuji spécifique
- ARW : Binaire Sony spécifique

### EXIF Extraction
- Utilisation de `kamadak-exif` pour Rust
- Focus sur les métadonnées critiques (date, ISO, ouverture, objectif)
- Fallback si EXIF absent ou corrompu

### Progress Monitoring
- Callbacks Tauri pour la progression en temps réel
- Mise à jour du `systemStore` Zustand
- UI avec barre de progression et statistiques

## Prochaine Phase

Phase 2.2 — Harvesting Métadonnées EXIF/IPTC (extraction complète des métadonnées)
