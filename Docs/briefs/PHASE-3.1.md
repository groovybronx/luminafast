# Phase 3.1 — Grille d'Images Réelle

## Objectif
Connecter le composant `GridView` au catalogue SQLite réel via le hook `useCatalog`, remplacer les données mockées par les vraies previews générées, et implémenter une virtualisation performante pour gérer des catalogues de 10K+ images avec fluidité (60fps).

## État Actuel

### ✅ Déjà implémenté
- **Hook `useCatalog`** (`src/hooks/useCatalog.ts`) :
  - Charge les images depuis SQLite via `CatalogService.getAllImages()`
  - Récupère les thumbnails via `previewService.getPreviewPath()`
  - Convertit les URLs avec `convertFileSrc()` de Tauri
  - Retourne les images au format `CatalogImage[]`
- **GridView component** (`src/components/library/GridView.tsx`) :
  - Affiche les images avec `images.map()`
  - Gère la sélection et le double-clic
  - Affiche les flags (pick/reject), ratings, state sync
  - Fallback gracieux si preview pas disponible (icône ImageIcon)
- **PreviewService** :
  - Génère les thumbnails (240px, JPEG q75)
  - Stocke dans `Previews.lrdata/`

### ⚠️ À compléter
1. **Intégration dans App.tsx** : App.tsx utilise encore `useCatalogStore` directement au lieu du hook `useCatalog`
2. **Virtualisation** : GridView utilise `.map()` simple (pas performant pour 10K+ images)
3. **Lazy loading amélioré** : Intersection Observer optionnel pour charger previews à la demande
4. **Tests avec données réelles** : Tests actuels utilisent mocks hardcodés

## Périmètre de la Phase 3.1

### 1. Intégration du Hook useCatalog dans App.tsx
- Remplacer l'accès direct au store par `const { images, isLoading, refreshCatalog } = useCatalog()`
- Déclencher `refreshCatalog()` au montage et après chaque import
- Gérer l'état de chargement avec un spinner ou placeholder
- Gérer les erreurs avec un message utilisateur convivial

### 2. Virtualisation de la Grille
**Option A** : Utiliser `@tanstack/react-virtual` (recommandé)
- Wrapper le GridView avec un virtualiseur de grille
- Configurer les dimensions de cellule dynamiques selon `thumbnailSize`
- Recycler les DOM nodes pour performance
- Préserver le scroll position lors du resize

**Option B** : Utiliser `react-virtuoso` (alternative)
- Wrapper avec `<VirtuosoGrid>` 
- Configurer `itemContent` pour rendre chaque ImageCard
- Gérer le responsive avec `useWindowSize`

**Critère de décision** : Préférer @tanstack si déjà dans les dépendances, sinon react-virtuoso.

### 3. Prefetching Intelligent
- Charger N rows ahead du viewport actuel
- Utiliser `IntersectionObserver` pour détecter l'approche du bord
- Canceller les requêtes de preview si l'utilisateur scroll trop vite
- Placeholder blur-hash pendant le chargement (optionnel pour v1)

### 4. Gestion des États
- **Loading** : Afficher un skeleton loader pendant le premier chargement
- **Empty** : Message invitant à importer des photos si le catalogue est vide
- **Error** : Afficher l'erreur avec un bouton "Retry"
- **Preview manquante** : Afficher l'icône ImageIcon + bouton "Generate Preview"

### 5. Tri et Filtrage
- Conserver le filtrage existant dans App.tsx (star:, iso:, gfx, etc.)
- Ajouter des options de tri :
  - Date (récent → ancien)
  - Nom (A → Z)
  - Rating (élevé → bas)
  - ISO (bas → élevé)
- Sauvegarder la préférence de tri dans `uiStore`

## Livrables Techniques

### Frontend TypeScript
- **`src/App.tsx`** : Remplacer `useCatalogStore` par `useCatalog()` hook
- **`src/components/library/GridView.tsx`** : Ajouter virtualisation (@tanstack/virtual)
- **`src/stores/uiStore.ts`** : Ajouter `sortBy` et `sortDirection` (optionnel)
- **`src/hooks/useCatalog.ts`** : Ajouter un filtre de tri (si nécessaire)

### Dépendances NPM
```bash
npm install @tanstack/react-virtual
# OU
npm install react-virtuoso
```

### Tests
- **Tests unitaires** :
  - `src/hooks/__tests__/useCatalog.test.ts` : Vérifier le chargement depuis SQLite
  - `src/components/library/__tests__/GridView.test.tsx` : Adapter les tests existants
- **Tests d'intégration** :
  - Importer 100 images → vérifier qu'elles apparaissent dans la grille
  - Scroll rapide → vérifier que les previews se chargent progressivement
  - Resize de fenêtre → vérifier que la grille s'adapte

## Critères de Validation

- [ ] `App.tsx` utilise `useCatalog()` au lieu de `useCatalogStore` direct
- [ ] Les images importées apparaissent dans la grille avec leurs vraies previews
- [ ] Les previews manquantes affichent un placeholder avec icône ImageIcon
- [ ] Le scroll est fluide (60fps) sur un catalogue de 5000 images
- [ ] Le resize de fenêtre adapte la grille sans lag
- [ ] Le filtrage par texte (filename, tags) fonctionne
- [ ] Les raccourcis clavier (rating, flag) persistent en SQLite
- [ ] Les tests passent avec données réelles (pas de mocks)

## Dépendances

**Sous-phases dépendantes (doivent être complétées)** :
- ✅ Phase 1.1 : Schéma SQLite
- ✅ Phase 1.2 : Tauri Commands CRUD
- ✅ Phase 2.1 : Discovery & Ingestion
- ✅ Phase 2.3 : Génération de Previews
- ✅ Phase 2.4 : UI d'Import Connectée

**Fichiers à consulter** :
- `Docs/archives/Lightroomtechnique.md` : Architecture grille Lightroom Classic
- `Docs/archives/recommendations.md` : Virtualisation et performance
- `src/hooks/useCatalog.ts` : Hook existant
- `src/services/catalogService.ts` : Service SQLite
- `src/types/dto.ts` : Types ImageDTO

## Interfaces Clés

### useCatalog Hook (existant)
```typescript
export interface UseCatalogReturn {
  images: CatalogImage[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  refreshCatalog: (filter?: ImageFilter) => Promise<void>;
  syncAfterImport: () => Promise<void>;
  clearError: () => void;
  imageCount: number;
  hasImages: boolean;
}
```

### GridView Props (existant)
```typescript
interface GridViewProps {
  images: CatalogImage[];
  selection: number[];
  thumbnailSize: number; // 1-10 (mapped to px)
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
  onSetActiveView: (view: ActiveView) => void;
}
```

### Nouveau: VirtualizedGridView Props (optionnel)
```typescript
interface VirtualizedGridViewProps extends GridViewProps {
  containerHeight: number; // Height of viewport
  rowHeight: number;       // Dynamic based on thumbnailSize
  overscan?: number;       // Number of rows to prefetch
}
```

## Risques et Mitigations

### Performance
- **Risque** : Charger 10K thumbnails d'un coup ralentit l'UI
- **Mitigation** : Virtualisation + lazy loading progressif

### Preview manquante
- **Risque** : Affichage cassé si le thumbnail n'existe pas encore
- **Mitigation** : Fallback gracieux avec icône ImageIcon (déjà implémenté)

### Cache invalidation
- **Risque** : Anciennes previews affichées après ré-import
- **Mitigation** : Utiliser `blake3_hash` comme clé de cache (déjà fait)

### Scroll position
- **Risque** : Perte de position de scroll lors du refresh
- **Mitigation** : Sauvegarder/restaurer `scrollTop` dans `uiStore`

## Contexte Architectural

### Lightroom Classic (référence)
- Utilise une grille virtualisée avec placeholder loading
- Cache les thumbnails en RAM (LRU)
- Prefetch intelligent basé sur la direction du scroll
- Grid responsive avec colonnes dynamiques

### Stack LuminaFast
- **Previews** : Stockées localement dans `Previews.lrdata/`
- **Thumbnails** : 240px bord long, JPEG q75
- **Conversion URLs** : `convertFileSrc()` pour accès Tauri
- **Cache** : Géré par PreviewService (disque uniquement pour l'instant)

## Notes de Développement

- Le hook `useCatalog` est déjà bien conçu et testable
- GridView actuel est responsive et bien stylisé (TailwindCSS)
- Pas besoin de modifier le backend Rust pour cette phase
- La virtualisation est la seule optimisation critique

## Plan d'Implémentation Suggéré

1. **Étape 1** : Intégrer `useCatalog()` dans App.tsx (30 min)
2. **Étape 2** : Tester avec un petit catalogue (50 images) (15 min)
3. **Étape 3** : Installer @tanstack/react-virtual (5 min)
4. **Étape 4** : Créer `VirtualizedGridView.tsx` wrapper (1h)
5. **Étape 5** : Adapter les tests existants (30 min)
6. **Étape 6** : Tester avec 5000 images (30 min)
7. **Étape 7** : Optimisations finales (prefetch, transitions) (1h)

**Durée estimée totale** : ~4 heures

---

**Date de création** : 2026-02-20  
**Agent** : Cascade  
**Statut** : ⬜ En attente
