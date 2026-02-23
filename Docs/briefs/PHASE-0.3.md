# Phase 0.3 — Décomposition Modulaire Frontend

## Objectif

Découper le fichier monolithique `src/App.tsx` (~711 lignes) en composants individuels, chacun dans son propre fichier. Respecter la règle de ~300 lignes max par fichier. Préserver le comportement identique de l'application.

## Dépendances

- Phase 0.1 (Migration TypeScript) ✅
- Phase 0.2 (Scaffolding Tauri v2) ✅

## Composants à extraire

### Layout

- `src/components/layout/TopNav.tsx` — Barre de navigation supérieure
- `src/components/layout/LeftSidebar.tsx` — Panneau gauche (catalogue, collections, folders)
- `src/components/layout/RightSidebar.tsx` — Panneau droit (histogramme, EXIF, sliders/metadata)
- `src/components/layout/Toolbar.tsx` — Barre d'outils (mode grille/develop, recherche, taille)
- `src/components/layout/Filmstrip.tsx` — Bande défilante en bas

### Library

- `src/components/library/GridView.tsx` — Grille d'images responsive
- `src/components/library/ImageCard.tsx` — Carte individuelle d'image dans la grille

### Develop

- `src/components/develop/DevelopView.tsx` — Vue développement (image + avant/après)
- `src/components/develop/DevelopSliders.tsx` — Sliders de réglage (exposition, contraste, etc.)
- `src/components/develop/HistoryPanel.tsx` — Historique des events

### Metadata

- `src/components/metadata/MetadataPanel.tsx` — Fiche technique + tags
- `src/components/metadata/Histogram.tsx` — Histogramme
- `src/components/metadata/ExifGrid.tsx` — Grille EXIF compacte

### Shared

- `src/components/shared/GlobalStyles.tsx` — Styles CSS globaux
- `src/components/shared/ArchitectureMonitor.tsx` — Console monitoring
- `src/components/shared/ImportModal.tsx` — Modal d'import
- `src/components/shared/BatchBar.tsx` — Barre d'actions batch
- `src/components/shared/KeyboardOverlay.tsx` — Indicateurs raccourcis

### Helpers

- `src/lib/mockData.ts` — generateImages, IMAGE_THEMES, constantes mock
- `src/lib/helpers.ts` — safeID et autres utilitaires

## Fichiers à modifier

- `src/App.tsx` — Réduire à l'orchestration des composants (~100-150 lignes max)

## Interfaces à respecter

- Props typées pour chaque composant (interfaces \*Props)
- Aucune logique métier dans les composants — déléguer aux callbacks passés en props
- Les types existants dans `src/types/` restent inchangés

## Critères de validation

1. `tsc --noEmit` passe sans erreur
2. `npm run build` produit un build valide
3. L'app s'affiche identiquement (aucune régression visuelle)
4. Aucun fichier ne dépasse ~300 lignes
5. Chaque composant a ses props typées
6. App.tsx est réduit à <150 lignes

## Notes

- Phase 0.3 est un refactoring pur : AUCUN changement fonctionnel
- Les données mock restent identiques, juste déplacées dans lib/mockData.ts
- Les callbacks sont passés via props drilling (Zustand sera ajouté en Phase 0.4)
