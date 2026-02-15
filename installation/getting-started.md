---
layout: documentation
title: Guide de Démarrage Rapide
description: Installation et configuration de LuminaFast en quelques minutes
---

# Guide de Démarrage Rapide

Bienvenue dans LuminaFast ! Ce guide vous aidera à installer et lancer l'application en quelques minutes.

---

## Prérequis

### Système d'Exploitation
- **macOS** 10.15+ (recommandé)
- **Windows** 10+ (supporté)
- **Linux** Ubuntu 20.04+ (supporté)

### Logiciels Requis

#### Node.js (Version 18 ou supérieure)
```bash
# Vérifier la version
node --version

# Installer avec nvm (recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Rust (Stable)
```bash
# Installer Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Vérifier la version
rustc --version
```

#### Tauri CLI
```bash
# Installer Tauri CLI
cargo install tauri-cli

# Vérifier l'installation
cargo tauri --version
```

---

## Méthodes d'Installation

### 🚀 Méthode 1 : Build depuis Source (Recommandé)

Cette méthode vous donne la dernière version avec toutes les fonctionnalités.

#### 1. Cloner le Repository
```bash
git clone https://github.com/groovybronx/luminafast.git
cd luminafast
```

#### 2. Installer les Dépendances
```bash
# Installer les dépendances npm
npm install

# Installer les dépendances Rust (automatique avec npm)
npm run rust:build
```

#### 3. Lancer l'Application
```bash
# Mode développement
npm run tauri:dev

# Ou mode production
npm run tauri:build
# Puis exécuter le binaire généré
```

#### 4. Vérifier l'Installation
L'application devrait s'ouvrir dans une fenêtre native avec :
- Interface LuminaFast complète
- Grille d'images de démonstration
- Panneaux latéraux fonctionnels
- Sliders de développement

---

### 📦 Méthode 2 : Release Binaire (Bientôt disponible)

Les binaires pré-compilés seront bientôt disponibles pour :

- **macOS** : `.dmg` avec installation glisser-déposer
- **Windows** : `.msi` avec assistant d'installation
- **Linux** : `.AppImage` portable

---

## Configuration Initiale

### 1. Premier Lancement

Au premier lancement, LuminaFast vous accueillera avec :

#### 📊 État Actuel
- **Version** : 0.1.0 (développement)
- **Tests** : 216/216 passants
- **Coverage** : 98.93%
- **Phases** : 10/38 complétées

#### 🎮 Interface
- **Navigation** : Bibliothèque/Développement
- **Grille** : Images de démonstration
- **Panneaux** : EXIF, métadonnées, sliders
- **Raccourcis** : G (Bibliothèque), D (Développement)

### 2. Configuration Recommandée

#### 📁 Dossier de Travail
Créez un dossier pour vos photos :
```bash
# Exemple sur macOS
mkdir -p ~/Pictures/LuminaFast-Catalog
```

#### 🖥️ Paramètres Suggérés
- **Taille des thumbnails** : Moyenne (200px)
- **Qualité des previews** : Haute (JPEG q85)
- **Auto-save** : Activé
- **Raccourcis clavier** : Activer les raccourcis clavier

---

## Utilisation de Base

### 📚 Navigation de Base

#### Vue Bibliothèque
- **G** : Basculer en vue Bibliothèque
- **Clic simple** : Sélectionner une image
- **Double-clic** : Ouvrir en mode Développement
- **Shift+clic** : Sélection multiple
- **1-5** : Noter une image (étoiles)
- **P/X/U** : Flag pick/reject/effacer

#### Vue Développement
- **D** : Basculer en vue Développement
- **Sliders** : Ajuster exposition, contraste, etc.
- **Avant/Après** : Comparer les modifications
- **Historique** : Voir les modifications apportées

### 🎯 Premières Actions

#### 1. Explorer l'Interface
- Naviguez entre les vues Bibliothèque et Développement
- Testez les raccourcis clavier
- Explorez les panneaux latéraux

#### 2. Tester les Fonctionnalités
- **Notation** : Évaluez quelques images (1-5 étoiles)
- **Flagging** : Marquez des images (pick/reject)
- **Développement** : Ajustez les sliders sur une image

#### 3. Vérifier les Performances
- **Navigation** : Testez la fluidité de la grille
- **Sliders** : Vérifiez la réactivité des ajustements
- **Memory** : Surveillez l'utilisation mémoire (Activity Monitor)

---

## Dépannage

### ❌ Problèmes Communs

#### Build échoue
```bash
# Nettoyer et réessayer
npm run clean
npm install
npm run tauri:dev
```

#### Erreur de dépendances
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

#### Fenêtre ne s'ouvre pas
```bash
# Vérifier Tauri CLI
cargo tauri --version

# Réinstaller si nécessaire
cargo install tauri-cli --force
```

#### Performance lente
- **Vérifier** : Utilisation CPU/Memory
- **Redémarrer** : L'application après un long usage
- **Mettre à jour** : Node.js et Rust dernière version

### 🆘 Obtenir de l'Aide

#### Documentation Complète
- 📖 [Documentation technique](/documentation/)
- 📊 [Statistiques du projet](/stats/)
- 🗺️ [Roadmap de développement](/features/roadmap.html)

#### Support Communautaire
- 💬 [Issues GitHub](https://github.com/groovybronx/luminafast/issues)
- 🐛 [Rapporter un bug](https://github.com/groovybronx/luminafast/issues/new)
- 💡 [Suggestions d'amélioration](https://github.com/groovybronx/luminafast/discussions)

#### Développement
- 🔧 [Guide développeur](/installation/development-setup.html)
- 🧪 [Stratégie de tests](https://github.com/groovybronx/luminafast/blob/main/Docs/TESTING_STRATEGY.md)
- 📋 [Instructions IA](https://github.com/groovybronx/luminafast/blob/main/Docs/AI_INSTRUCTIONS.md)

---

## Prochaines Étapes

### 🎯 Pour les Utilisateurs

1. **Importer vos photos** (quand Phase 2.2 sera complétée)
2. **Explorer les fonctionnalités** avancées
3. **Personnaliser l'interface** et les raccourcis
4. **Donner votre feedback** sur l'application

### 🔧 Pour les Développeurs

1. **Lire la documentation** technique complète
2. **Explorer le code source** et l'architecture
3. **Contribuer** à une phase de développement
4. **Participer** aux discussions et reviews

---

## Statistiques Actuelles

| Métrique | Valeur | Statut |
|----------|-------|--------|
| **Version** | 0.1.0 | Développement |
| **Phases complétées** | 10/38 | 26.3% |
| **Tests unitaires** | 216 | ✅ 100% passants |
| **Coverage** | 98.93% | ✅ Excellent |
| **Builds** | 100% réussis | ✅ Stable |
| **Plateformes** | macOS, Windows, Linux | ✅ Multi-plateforme |

---

## Félicitations ! 🎉

Vous avez maintenant LuminaFast installé et fonctionnel. L'application est en développement actif avec de nouvelles fonctionnalités ajoutées régulièrement.

**Prochaine étape recommandée** : Explorez la [documentation technique](/documentation/) pour comprendre l'architecture et les capacités actuelles de l'application.

*Pour toute question ou problème, n'hésitez pas à consulter le [guide de dépannage](/installation/troubleshooting.html) ou à ouvrir une issue sur GitHub.*
