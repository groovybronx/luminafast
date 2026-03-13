# Phase 4 — Rendering & History

Phase pivot : passage du simple affichage à l’édition non-destructive, moteur d’historique, pipeline de rendu unifié (CSS/WASM), et UI avancée de comparaison.

---

## 4.1 Event Sourcing Engine

**Statut** : ✅ Complétée | **Date** : 2026-02-25 | **Agent** : Copilot

### Objectifs

- Implémenter moteur event sourcing pour l’historique d’édition
- Stocker chaque action utilisateur comme événement sérialisé
- Permettre undo/redo illimités, navigation temporelle
- Support multi-image (batch edits)

### Contexte

Pivot vers édition non-destructive. Chaque modification (ex : exposure, crop) devient un événement dans une timeline.

### Problèmes Tackled

- Historique limité à undo/redo local
- Pas de persistance des actions
- Pas de batch edits traçables

### Solutions Apportées

- Modèle Event : {id, type, payload, timestamp, user}
- Store Zustand eventStore
- Commandes Tauri : save_event, get_events, revert_to_event
- Timeline UI : navigation, preview, revert
- BatchBar : replay d’événements sur plusieurs images

### Fichiers Clés

- `src-tauri/src/commands/history.rs`, `src/stores/eventStore.ts`, `src/components/history/Timeline.tsx`, `src/components/shared/BatchBar.tsx`

### Validation

- [x] Undo/redo illimité
- [x] Persistance SQLite
- [x] Timeline UI opérationnelle
- [x] Batch edits traçables

### Leçons Apprises

Event sourcing = base pour édition avancée. BatchBar = pattern réutilisable. Timeline UI = feedback utilisateur crucial.

---

## 4.2 Pipeline de Rendu Image (CSS Filters + WASM Pixel Processing)

**Statut** : ✅ Complétée | **Date** : 2026-02-26 | **Agent** : Copilot

### Objectifs

- Unifier pipeline de rendu preview/export (CSS, WASM, backend)
- Appliquer stack d’édition (event sourcing) à chaque rendu
- Support presets, custom filters, et normalisation
- Parité visuelle entre preview et export

### Contexte

Avant : preview (CSS) ≠ export (backend). Après : pipeline unique, stackable, testée.

### Problèmes Tackled

- Divergence preview/export
- Pas de pipeline stackable
- Pas de tests de parité visuelle

### Solutions Apportées

- Pipeline TypeScript : applyFiltersStack
- WASM bridge : PixelFiltersWasm (luminafast-wasm)
- Backend : export_rendering.rs → luminafast-image-core
- Tests de parité preview/export (delta RGB ≤ 2)
- Normalisation RGBA centralisée
- Presets et custom filters stackables

### Fichiers Clés

- `src/services/wasmRenderingService.ts`, `src/services/exportService.ts`, `src-tauri/src/services/export_rendering.rs`, `luminafast-image-core/src/pipeline.rs`, `src/components/editor/PreviewCanvas.tsx`, `src/components/export/ExportDialog.tsx`

### Validation

- [x] Parité preview/export sur 5 presets
- [x] Stack d’édition appliquée à chaque rendu
- [x] Tests de non-régression visuelle
- [x] Normalisation RGBA validée

### Leçons Apprises

Pipeline unifié = robustesse. Parité preview/export = garde-fou. Tests visuels automatisés indispensables.

---

## 4.3 Historique & Snapshots UI

**Statut** : ✅ Complétée | **Date** : 2026-03-03 | **Agent** : Copilot

### Objectifs

- UI timeline interactive pour historique d’édition
- Snapshots visuels (miniatures) à chaque étape
- Navigation temporelle, revert, annotation

### Contexte

Complément du moteur event sourcing. L’utilisateur visualise et navigue son historique d’édition.

### Problèmes Tackled

- Pas de visualisation timeline
- Pas de snapshots intermédiaires
- Navigation historique peu intuitive

### Solutions Apportées

- Timeline UI avec miniatures (snapshots)
- Hover/Click pour preview/revert
- Annotations sur événements
- Intégration avec eventStore

### Fichiers Clés

- `src/components/history/Timeline.tsx`, `src/stores/eventStore.ts`, `src/services/historyService.ts`, `src/components/editor/PreviewCanvas.tsx`

### Validation

- [x] Timeline interactive
- [x] Snapshots générés à chaque étape
- [x] Navigation/revert fonctionnels
- [x] Annotations persistées

### Leçons Apprises

Visual feedback = adoption. Snapshots = sécurité utilisateur. Annotations = traçabilité.

---

## 4.4 Before/After Comparison (3 modes: Split-View, Overlay, Side-by-Side)

**Statut** : ✅ Complétée | **Date** : 2026-03-04 | **Agent** : Copilot

### Objectifs

- UI de comparaison avant/après avancée
- 3 modes : Split-View, Overlay, Side-by-Side
- Synchro navigation, zoom, pan

### Contexte

Permet à l’utilisateur de comparer l’effet de ses modifications, valider l’impact de chaque étape.

### Problèmes Tackled

- Pas de comparaison visuelle
- Navigation désynchronisée
- UI peu intuitive

### Solutions Apportées

- Composant CompareView avec 3 modes
- Synchro zoom/pan entre vues
- Overlay alpha blending
- Split bar draggable
- UI responsive

### Fichiers Clés

- `src/components/editor/CompareView.tsx`, `src/components/editor/PreviewCanvas.tsx`, `src/stores/uiStore.ts`, `src/components/history/Timeline.tsx`

### Validation

- [x] 3 modes opérationnels
- [x] Synchro navigation/zoom
- [x] UI responsive
- [x] Tests utilisateurs positifs

### Leçons Apprises

Comparaison visuelle = confiance utilisateur. Synchro navigation = UX premium. Overlay = cas d’usage avancé (retouche fine).

---
