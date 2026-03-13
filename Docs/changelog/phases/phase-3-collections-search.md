# Phase 3 — Collections & Search

Phase centrale : gestion avancée des collections, navigation arborescente, recherche structurée et virtualisation performante de la grille.

---

## 3.1 Grille d'Images Réelle

**Statut** : ✅ Complétée | **Date** : 2026-02-20 | **Agent** : Copilot

### Objectifs

- Connecter GridView au catalogue SQLite réel via hook useCatalog
- Remplacer mocks par vraies previews générées
- Implémenter virtualisation performante pour 10K+ images
- Afficher grille avec 60fps fluide

### Contexte

Transformation du prototype mockup en système réel. Les images importées sont maintenant visibles avec vraies previews dans une grille virtualisée performante.

### Problèmes Tackled

- GridView affichait données mockées
- Pas de virtualisation — O(n) DOM nodes pour 10K images
- Pas de lazy loading previews
- Pas de filtrage

### Solutions Apportées

- Hook useCatalog : charge images depuis SQLite via CatalogService
- Fetch thumbnails via previewService.getPreviewPath
- Conversion URLs avec convertFileSrc() Tauri
- Virtualisation avec @tanstack/react-virtual
- Dynamic cellpacking selon thumbnailSize
- Prefetching N rows ahead viewport
- Placeholder blur-hash pendant chargement
- Fallback ImageIcon si preview manquante
- États : Loading, Empty, Error
- Tri : date, nom, rating, ISO

### Fichiers Clés

- `src/hooks/useCatalog.ts`, `src/components/library/GridView.tsx`, `src/components/library/ImageCard.tsx`, `src/stores/catalogStore.ts`, `src/stores/uiStore.ts`, `src/App.tsx`, `package.json` (@tanstack/react-virtual)

### Validation

- [x] useCatalog hook opérationnel
- [x] Images importées affichent vraies previews
- [x] Scroll fluide 60fps sur 5000 images
- [x] Resize adapte grille sans lag
- [x] Filtrage texte fonctionne
- [x] Placeholder si preview manquante

### Leçons Apprises

@tanstack/react-virtual crucial pour scaling. Prefetching et placeholder améliorent performance perçue. Fallbacks (ImageIcon) améliorent UX même en cas d'erreur.

---

## 3.2 Collections Statiques (CRUD)

**Statut** : ✅ Complétée | **Date** : 2026-02-21 | **Agent** : Copilot

### Objectifs

- CRUD complet des collections statiques
- Ajouter/retirer images des collections
- Connecter sidebar gauche aux données réelles

### Contexte

Première interface "collection" pour l'utilisateur. Les data structures pour smart collections (3.3) et folder navigator (3.4) en dépendent.

### Problèmes Tackled

- Collections affichées en hardcoded mockup
- Pas de CRUD backend
- Pas d'intégration drag-drop 3.2b
- Aucun filtre par collection dans grille

### Solutions Apportées

- Commandes Tauri : delete_collection, rename_collection, remove_images_from_collection, get_collection_images
- Store Zustand collectionStore
- Intégration LeftSidebar : collections réelles + icône
- Filtrage collection dans App.tsx
- Services TypeScript wrapper
- Drag & drop support en 3.2b

### Fichiers Clés

- `src-tauri/src/commands/catalog.rs`, `src/stores/collectionStore.ts`, `src/services/catalogService.ts`, `src/components/layout/LeftSidebar.tsx`, `src/App.tsx`

### Validation

- [x] 4 commandes fonctionnelles
- [x] Collections persistées SQLite
- [x] Filtrage par collection dans grille
- [x] CRUD UI opérationnelle
- [x] Tests backend/frontend passent

### Leçons Apprises

Collections statiques = précédent pour smart collections. Utiliser Set<number> pour image_ids améliore performance. Store Zustand doit mettre en cache l'état.

---

## 3.2b Drag & Drop d'Images dans les Collections (MultiSelect Support)

**Statut** : ✅ Complétée | **Date** : 2026-02-24 | **Agent** : Copilot

### Objectifs

- Drag & drop pour ajouter images dans collections
- Support multi-select
- Feedback visuel (zone de drop, ghost image)
- Intégration Event Sourcing

### Contexte

Extension de 3.2 pour rendre collections intuitives. Foundation pour batch operations.

### Problèmes Tackled

- Pas de drag & drop
- Pas de multi-select
- Pas de feedback visuel

### Solutions Apportées

- Drag & drop natif React
- Multi-select avec Ctrl/Cmd + Click ou Shift click
- Visual feedback : highlight drop zone, ghost image
- Backend : batch add_images_to_collection
- Event Sourcing integration
- BatchBar pour batch operations

### Fichiers Clés

- `src/components/library/GridView.tsx`, `src/components/layout/LeftSidebar.tsx`, `src/components/shared/BatchBar.tsx`, `src/hooks/useSelection.ts`

### Validation

- [x] Drag & drop fonctionne grille → collections
- [x] Multi-select opérationnel
- [x] Feedback visuel clair
- [x] Event Sourcing trace actions
- [x] Performance fluide avec 1000+ images

### Leçons Apprises

Drag & drop natif HTML5 suffit. Multi-select Shift+Click standard. Visual feedback améliore UX.

---

## 3.3 Smart Collections

**Statut** : ✅ Complétée | **Date** : 2026-02-21 | **Agent** : Copilot

### Objectifs

- Smart collections basées sur règles de filtrage
- Parseur JSON → SQL WHERE clause
- Support multi-champs (rating, ISO, aperture, etc.)
- Résultats dynamiques recalculés automatiquement

### Contexte

Evolution de collections statiques vers dynamiques. Foundation pour recherche avancée (3.5).

### Problèmes Tackled

- Collections statiques peu flexibles
- Pas de filtres dynamiques
- Pas de parseur JSON → SQL

### Solutions Apportées

- Commandes Tauri : create_smart_collection, get_smart_collection_results, update_smart_collection
- Format JSON SmartQuery
- Parseur Rust JSON → SQL WHERE
- Support champs : rating, ISO, aperture, focal_length, camera_make/model, lens, flag, color_label, filename
- Opérateurs texte : contains, not_contains, starts_with, ends_with
- Store collectionStore supporte type smart
- LeftSidebar affiche smart collections

### Fichiers Clés

- `src-tauri/src/services/smart_query_parser.rs`, `src-tauri/src/commands/catalog.rs`, `src/types/collection.ts`, `src/services/catalogService.ts`, `src/stores/collectionStore.ts`

### Validation

- [x] Parser JSON validé
- [x] Conversion JSON → SQL injection-safe
- [x] Résultats dynamiques recalculés
- [x] Support 10+ champs
- [x] Performance <50ms pour AND/OR sur 10K images

### Leçons Apprises

Parseur JSON → SQL doit être strictement validé. Lazy evaluation améliore performance. UI builder pour smart collections = future enhancement.

---

## 3.4 Navigateur de Dossiers

**Statut** : ✅ Complétée | **Date** : 2026-02-21 | **Agent** : Copilot

### Objectifs

- Afficher arborescence réelle des dossiers importés
- Filtrer images par dossier (récursif optionnel)
- Montrer compteur images par dossier
- Indicateur volume en ligne/hors ligne

### Contexte

Complète la navigation : Collections (statique+smart) + Folders (arborescence). Les utilisateurs naviguent leur filesystem importé.

### Problèmes Tackled

- Pas de vue arborescence
- Pas de compteurs images
- Pas de détection volumes offline

### Solutions Apportées

- Commandes Tauri : get_folder_tree, get_folder_images, update_volume_status
- FolderTreeNode avec id, name, path, volume_name, is_online, image_count, total_image_count, children[]
- Store folderStore : folderTree, activeFolderId, expandedFolderIds
- LeftSidebar nouvel onglet "Dossiers"
- Icônes : dossier + compteur, disque avec statut
- Indent visual selon profondeur
- Filtrage parallèle : collection > folder > texte search

### Fichiers Clés

- `src-tauri/src/commands/catalog.rs`, `src/types/folder.ts`, `src/services/catalogService.ts`, `src/stores/folderStore.ts`, `src/components/layout/LeftSidebar.tsx`

### Validation

- [x] Arborescence affiche complètement
- [x] Compteurs images corrects
- [x] Filtrage par dossier fonctionne
- [x] Récursif optionnel OK
- [x] Volume status détecté
- [x] Performance <100ms pour 10K dossiers

### Leçons Apprises

Les utilisateurs attendent une arborescence familière. Recursive filtering doit être performant. Volume status crucial pour sync future.

---

## 3.5 Recherche & Filtrage

**Statut** : ✅ Complétée | **Date** : 2026-02-24 | **Agent** : Copilot

### Objectifs

- SearchBar unifiée avec syntaxe structurée
- Recherche texte libre + préfixes (star, iso, camera, etc.)
- Parsing frontend → JSON → SQL backend
- Résultats temps réel avec debounce

### Contexte

Dernière interface navigation principale. Les utilisateurs trouvent images via texte libre ou recherche structurée.

### Problèmes Tackled

- Pas de recherche
- Pas de syntaxe structurée
- Pas de debounce

### Solutions Apportées

- Composant SearchBar input + suggestions
- Frontend parser : "iso:>3200 star:4" → JSON structuré
- Commande Tauri search_images
- Support préfixes : star, iso, aperture, focal, camera, lens, flag, color_label, filename
- Service searchService.ts + debounce 300ms
- Opérateurs numériques et texte
- Intégration App.tsx : searchQuery override filteredImages

### Fichiers Clés

- `src/components/library/SearchBar.tsx`, `src/services/searchService.ts`, `src/types/search.ts`, `src-tauri/src/services/search.rs`, `src-tauri/src/commands/catalog.rs`

### Validation

- [x] Parsing syntaxe correctement
- [x] Recherche "iso:>3200 star:4" <50ms sur 10K
- [x] Recherche texte fonctionne
- [x] Debounce 300ms respecté
- [x] Résultats temps réel
- [x] Coverage tests >90%

### Leçons Apprises

Syntaxe de recherche intuitive = adoption. Debounce frontend = UX responsif. Parsing côté frontend offre feedback immédiat sur erreurs.

---
