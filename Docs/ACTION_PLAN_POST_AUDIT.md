ce fichier est un# Plan d'Action Post-Audit — LuminaFast

> **Basé sur l'audit du 10 Mars 2026**
> Ce plan structure la résolution des dettes techniques et problèmes de performance identifiés en phases de maintenance (M.x) et d'évolution (E.x).

---

## Vue d'Ensemble des Phases

| Phase | Priorité | Domaine | Titre | Objectif Principal |
| :--- | :--- | :--- | :--- | :--- |
| **M.1** | **P0** (Critique) | Backend | **Performance Core & Concurrence** | Corriger la boucle de création de Runtime et les IO bloquants. |
| **M.2** | P1 (Élevée) | Archi | **Architecture & Sécurité** | Nettoyer l'injection de dépendance DB et durcir les permissions. |
| **M.3** | P2 (Moyenne) | Frontend | **UX & Optimisations UI** | Virtualisation robuste, Lazy loading EXIF, refactor App.tsx. |
| **E.1** | P3 (Future) | Feature | **Évolutions Fonctionnelles** | Intégration des features reportées (DuckDB, Cloud, etc.). |

---

## Détail des Phases

### Phase M.1 — Performance Core & Concurrence

> **Objectif** : Éliminer les goulots d'étranglement qui empêchent l'application de scaler au-delà de quelques centaines d'images.

#### Sous-phase M.1.1 : Correction Runtime Ingestion (P0)
**Périmètre :**
*   `src-tauri/src/services/ingestion.rs` : Réécriture de `batch_ingest`.
*   Suppression de `tokio::runtime::Runtime::new()` dans la boucle.
*   Utilisation correcte de `tokio::task::spawn_blocking` ou pool Rayon global.

#### Sous-phase M.1.2 : Migration Async IO (P0)
**Périmètre :**
*   `src-tauri/src/services/discovery.rs` : Remplacement `std::fs` → `tokio::fs`.
*   `src-tauri/src/services/preview.rs` : Remplacement `std::fs` → `tokio::fs`.
*   Vérification de tous les points d'entrée `async` pour bannir les appels bloquants.

#### Sous-phase M.1.3 : Nettoyage Code Mort (P1)
**Périmètre :**
*   Suppression `src-tauri/src/test_hook.rs`.
*   Suppression fonctions dépréciées `luminafast-wasm`.
*   Suppression commandes inutilisées `catalog.rs`.

---

### Phase M.2 — Architecture & Sécurité

> **Objectif** : Assainir les bases architecturales pour faciliter la maintenance et sécuriser l'application avant distribution.

#### Sous-phase M.2.1 : Refactoring Injection Dépendances (P1)
**Périmètre :**
*   `src-tauri/src/services/ingestion.rs` : Retirer la dépendance forte à `Mutex<Connection>`.
*   `src-tauri/src/commands/catalog.rs` : Supprimer le hack `open_in_memory`.
*   Mise en place d'un pattern `Repository` ou `Context` plus propre.

#### Sous-phase M.2.2 : Durcissement Sécurité (P1)
**Périmètre :**
*   `src-tauri/tauri.conf.json` : Restreindre le scope `assetProtocol` (supprimer `$HOME/**`).
*   Implémenter une liste blanche dynamique de dossiers si nécessaire.
*   Revue CSP (Content Security Policy).

---

### Phase M.3 — UX & Optimisations UI

> **Objectif** : Fluidifier l'interface utilisateur et réduire l'empreinte mémoire frontend.

#### Sous-phase M.3.1 : Refactoring App.tsx (P2)
**Périmètre :**
*   Extraction `AppInitializer`.
*   Création hook `useAppShortcuts`.
*   Allègement du composant racine.

#### Sous-phase M.3.2 : Optimisation Grille & Données (P2)
**Périmètre :**
*   Optimisation requête `get_all_images` (Lazy loading EXIF).
*   Vérification comportement resize `GridView`.
*   Extraction composants inline `LeftSidebar`.

---

## Critères de Validation Global

*   **Performance** : Import de 5000 images sans crash ni freeze UI.
*   **Code** : Plus aucun `std::fs` dans les blocs `async`.
*   **Sécurité** : Scope fichiers restreint au strict nécessaire.
*   **Tests** : Non-régression totale sur la suite existante (backend + frontend).
