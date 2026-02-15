---
layout: feature
title: Phase 2 - Pipeline d'Import
description: Système d'ingestion intelligent pour fichiers RAW avec EXIF et previews
icon: fas fa-download
status: in-progress
progress: 25
phase: 2
technologies:
  - Rust
  - Kamadak-EXIF
  - Image Crate
  - Rayon
  - Discovery Service
  - Ingestion Service
---

# Phase 2 - Pipeline d'Import

> **Statut** : 🔄 25% Complétée (1/4 sous-phases)
> 
> **Durée estimée** : 2 semaines
> 
> **Début** : 2026-02-13

## 🎯 Objectif de la Phase

Remplacer `generateImages()` par un vrai pipeline d'ingestion de fichiers RAW avec découverte, harvesting EXIF, et génération de previews.

---

## ✅ Sous-Phases

### 2.1 - Discovery & Ingestion de Fichiers ✅
**Date** : 2026-02-13

#### Réalisations
- **Service Discovery** pour scanning de dossiers
- **Service Ingestion** avec traitement parallèle
- **Commandes Tauri** complètes (discovery/ingestion)
- **Wrapper TypeScript** robuste avec progression

#### Fichiers créés
- `src-tauri/src/services/discovery.rs` - Service discovery
- `src-tauri/src/services/ingestion.rs` - Service ingestion
- `src-tauri/src/commands/discovery.rs` - Commandes Tauri
- `src-tauri/src/models/discovery.rs` - Types Rust
- `src/types/discovery.ts` - Types TypeScript
- `src/services/discoveryService.ts` - Wrapper TypeScript

#### Fonctionnalités
- **Scanning récursif** de dossiers
- **Filtrage** par extensions (CR3, RAF, ARW)
- **Ingestion parallèle** avec rayon
- **Progression** temps réel

---

### 2.2 - Harvesting Métadonnées EXIF/IPTC ⬜
**Statut** : ⬜ En attente

#### Objectifs
- **Extraction** EXIF complète avec kamadak-exif
- **Métadonnées IPTC** pour keywords et copyright
- **Parsing** avancé des tags spécifiques
- **Stockage** optimisé dans SQLite

#### Dépendances
- `kamadak-exif` pour EXIF/IPTC
- Tables `exif_metadata` déjà prêtes
- Service ingestion existant

#### Livrables attendus
- Service EXIF avec parsing complet
- Commandes Tauri pour extraction
- Tests unitaires exhaustifs

---

### 2.3 - Génération de Previews ⬜
**Statut** : ⬜ En attente

#### Objectifs
- **Previews multi-niveaux** (thumbnail, standard, 1:1)
- **Cache intelligent** pour éviter regénération
- **Formats** supportés (JPEG, HEIC, DNG)
- **Performance** <500ms pour preview standard

#### Dépendances
- `image` crate pour traitement
- Système de cache à implémenter
- Storage pour previews locaux

#### Livrables attendus
- Service previews avec multi-résolution
- Cache LRU pour previews
- Commandes Tauri optimisées

---

### 2.4 - UI d'Import Connectée ⬜
**Statut** : ⬜ En attente

#### Objectifs
- **Modal d'import** avec progression réelle
- **Configuration** des options d'import
- **Preview** des fichiers à importer
- **Gestion** des erreurs et conflits

#### Dépendances
- Services phases 2.1-2.3
- ImportModal existant à connecter
- Stores Zustand pour état import

#### Livrables attendus
- ImportModal connecté aux services
- État import temps réel
- Gestion d'erreurs utilisateur

---

## 📊 Métriques Actuelles

| Métrique | Valeur | Cible |
|----------|-------|-------|
| **Sous-phases** | 1/4 | 4/4 |
| **Tests discovery** | 54 | 60+ |
| **Services Rust** | 2 | 4 |
| **Commands Tauri** | 12 | 20+ |

---

## 🏗️ Architecture Technique

### Services Implémentés
- **DiscoveryService** : Scanning et filtrage fichiers
- **IngestionService** : Traitement parallèle et stockage

### Services Planifiés
- **ExifService** : Extraction métadonnées
- **PreviewService** : Génération previews multi-niveaux

### Performance Cibles
- **Scanning** : <100ms pour 1000 fichiers
- **EXIF extraction** : <50ms par fichier
- **Preview generation** : <500ms standard
- **Ingestion batch** : <2s pour 100 fichiers

---

## 🎯 Fonctionnalités Attendues

### ✅ Déjà Implémentées
- **Discovery récursif** de dossiers
- **Filtrage** par extensions RAW
- **Ingestion parallèle** avec progression
- **Base de données** prête pour métadonnées

### 🔄 En Développement
- **Extraction EXIF/IPTC** complète
- **Previews** multi-niveaux optimisés
- **UI d'import** connectée et responsive

---

## 📈 Impact sur le Projet

Cette phase transformera LuminaFast d'une démo à une application fonctionnelle :

1. **Import réel** de fichiers photographiques
2. **Métadonnées** complètes et exploitables
3. **Previews** rapides pour navigation fluide
4. **Performance** pour bibliothèques massives

---

## 🔄 Prochaines Étapes

1. **Priorité haute** : Phase 2.2 - EXIF harvesting
2. **Priorité haute** : Phase 2.3 - Previews generation
3. **Priorité moyenne** : Phase 2.4 - UI connectée

---

## 🎯 Défis Techniques

- **Performance** : Traitement de milliers de fichiers
- **Memory** : Gestion efficace des gros RAW
- **Concurrency** : Parallelisation sans conflits
- **UX** : Feedback utilisateur pendant l'import

---

*Pour suivre la progression, consultez le [changelog](../documentation/changelog.html).*
