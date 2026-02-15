---
layout: documentation
title: Installation
description: Guides d'installation pour LuminaFast
---

# Installation de LuminaFast

Bienvenue dans le guide d'installation de LuminaFast. Choisissez la méthode qui vous convient le mieux.

## 🚀 Méthodes d'Installation

### 📦 Guide de Démarrage Rapide
[**Démarrage Rapide**](getting-started.html) - Installation et configuration en quelques minutes.

### 🔧 Installation Développeur
Pour les développeurs qui souhaitent contribuer au projet.

#### Prérequis
- **Node.js** 18+ 
- **Rust** stable
- **Tauri CLI**

#### Installation
```bash
# Cloner le repository
git clone https://github.com/groovybronx/luminafast.git
cd luminafast

# Installer les dépendances
npm install

# Lancer en développement
npm run tauri:dev
```

---

## 📋 Systèmes Supportés

| Système | Version | Statut |
|---------|---------|--------|
| **macOS** | 10.15+ | ✅ Recommandé |
| **Windows** | 10+ | ✅ Supporté |
| **Linux** | Ubuntu 20.04+ | ✅ Supporté |

---

## 🛠️ Configuration Requise

### Minimum
- **RAM** : 4GB
- **Stockage** : 500MB
- **Processeur** : 64-bit moderne

### Recommandé
- **RAM** : 8GB+
- **Stockage** : 2GB+ pour les previews
- **Processeur** : Multi-cœurs pour BLAKE3

---

## 🔧 Dépannage

### Problèmes Communs

#### Build échoue
```bash
# Nettoyer et réessayer
npm run clean
npm install
npm run tauri:dev
```

#### Performance lente
- Vérifier l'utilisation mémoire
- Redémarrer après long usage
- Mettre à jour Node.js et Rust

### Support

- 📖 [Documentation complète](../documentation/)
- 🐛 [Issues GitHub](https://github.com/groovybronx/luminafast/issues)
- 💬 [Discussions](https://github.com/groovybronx/luminafast/discussions)

---

## 📊 Après Installation

Une fois installé, vous aurez accès à :

- **Interface professionnelle** - Design moderne et responsive
- **216 tests unitaires** - Qualité garantie
- **10 phases complétées** - Fonctionnalités robustes
- **Documentation complète** - Support technique

---

*Pour commencer rapidement, suivez notre [guide de démarrage](getting-started.html).*
