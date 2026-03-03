# Phase 4.4 — Comparaison Avant/Après

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 3-4 jours
> **Priorité** : 🟡 Normale
> **Dépendances** : Phase 4.1 ✅ + Phase 4.2 ✅ + Phase 4.3 ✅
> **Créé le** : 2026-03-04

---

## Objectif

Connecter le composant **BeforeAfter mockup** existant dans `DevelopView` aux vraies édits via **Event Sourcing**, en implémentant **3 modes de comparaison** (split-view, overlay, side-by-side) avec **synchronisation zoom/pan** et affichage du RAW original vs preview éditée.

---

## Périmètre

### ✅ Inclus dans cette phase

- **Mode Split-View** : Séparateur vertical glissable (Divider) affichant avant gauche / après droite
  - Interaction : dragger le séparateur pour ajuster les positions
  - Affichage automatique des badges "Original RAW" et "Aperçu Dynamique"

- **Mode Overlay** : Superposition avec slider de transparence
  - Slider contrôlant l'opacité de l'image "Après" (0→100%)
  - Interaction : bouton + glisser horizontalement pour ajuster transparence

- **Mode Side-by-Side Synchronisé** : Deux images empilées (vertical) avec zoom/pan liés
  - Scroll wheel → zoom sur les deux images simultanément
  - Drag → pan synchronisé des deux images
  - Affichage du % de zoom et position (travail futur)

- **Intégration avec Event Sourcing** :
  - Image "Avant" = version originale sans aucun filtre (previewUrl brute)
  - Image "Après" = résultat de tous les événements d'édition appliqués
  - Basculer entre snapshot d'une image → réinitialiser les filtres affichés

- **Sélecteur de Mode** :
  - Boutons dans Toolbar ou panneau flottant au-dessus de DevelopView
  - 3 modes : "Split", "Overlay", "Side-by-Side"
  - État persistant dans `uiStore` (nouvelle propriété `comparisonMode`)

- **Persistance & UX** :
  - Mode de comparaison choisi reste actif lors du switch entre images
  - Position du split-view slider persistée (uiStore)
  - Opacity du mode overlay persistée (uiStore)

### ❌ Exclus intentionnellement

- **Masking/brush-based masking** (Phase future)
- **Gesture multitouch (pinch zoom)** (Phase 7.4 — Accessibilité)
- **Animated transitions entre modes** (reporting optionnel)
- **Histogramme comparatif** (reporting à Phase 5.1)
- **Synchronisation zoom chiffré (% exact)** (optionnel, MVP = simplement lié)

### 📋 Reporté

- **Cursor position synchronisé** (reporting si trop complexe)
- **Keyboard shortcuts** : `C` pour cycle modes (Phase 7.4)

---

## Dépendances

### Phases

- **Phase 4.1** ✅ — Event Sourcing Engine (append_event, get_events, replay_events)
- **Phase 4.2** ✅ — Pipeline Rendu Image (PreviewRenderer + CSS/WASM filters)
- **Phase 4.3** ✅ — Historique & Snapshots (edit_events persisted, snapshots working)

### Ressources Frontend Existantes

- `uiStore` — state pour `showBeforeAfter`, nouvelle prop `comparisonMode`, nouveau state `splitViewPosition`
- `editStore` — `editEventsPerImage[imageId]` accessible
- `DevelopView.tsx` — structure layout `showBeforeAfter ? 'flex-row' : 'flex-col'` existante
- `Toolbar.tsx` — bouton `onToggleBeforeAfter` existant → sera remplacé par mode selector
- `PreviewRenderer.tsx` — capable d'appliquer/retirer les filtres

### Ressources Rust (Backend)

- Aucune nouvelle migration SQL (utilise `events` de Phase 4.1)
- Aucune nouvelle commande Tauri (utilise `get_edit_events` existant)

### Test Infrastructure

- Vitest + Testing Library disponibles
- Storybook disponible pour prévisualisation des modes

---

## Fichiers à Créer/Modifier

### Fichiers Frontend (TypeScript/React)

#### À créer

1. **`src/components/develop/BeforeAfterComparison.tsx`**
   - Composant principal englobant tous les 3 modes
   - Props : `imageId, beforeUrl, afterUrl, mode, onModeChange, splitPosition, onSplitPositionChange, opacity, onOpacityChange`
   - Logic :
     - Switch sur `mode` pour rendre le bon sous-composant
     - Gestion du zoom synchronisé (ref container pour wheel event)
     - Gestion du pan (coordonnées x/y partagées)

2. **`src/components/develop/SplitViewComparison.tsx`**
   - Affiche deux images côte-à-côte avec séparateur glissable
   - Props : `beforeUrl, afterUrl, position (0-100), onPositionChange`
   - Render :
     - Flex container avec deux enfants (widths basés sur `position`)
     - Divider node au centre avec cursor grabbing
     - Mouse handlers : mousedown → track mousemove → set position
   - Badge "Original RAW" et "Aperçu Dynamique" au-dessus de chaque moitié

3. **`src/components/develop/OverlayComparison.tsx`**
   - Superposition avec slider d'opacité
   - Props : `beforeUrl, afterUrl, opacity (0-100), onOpacityChange`
   - Render :
     - Position: relative container
     - Image "Après" avec `opacity: opacity/100`
     - Slider horizontal sous les images

4. **`src/components/develop/SideBySideComparison.tsx`**
   - Deux images empilées (vertical) avec zoom/pan synchronisé
   - Props : `beforeUrl, afterUrl, containerRef`
   - Internal state : `zoom (1-5), panX, panY`
   - Event handlers :
     - Wheel → calculate zoom delta → apply to both images
     - MouseDown + MouseMove → pan both

5. **`src/components/develop/ComparisonModeSelector.tsx`**
   - 3 boutons : "Split", "Overlay", "Side-by-Side"
   - Props : `mode, onModeChange`
   - Styling : boutons radio-like avec underline active

6. **`src/types/comparison.ts`**
   - Enum `ComparisonMode = 'split' | 'overlay' | 'sideBySide'`
   - Interface `ComparisonState = { mode, splitPosition, opacity }`

#### À modifier

7. **`src/stores/uiStore.ts`**
   - Ajouter propriétés :
     ```typescript
     comparisonMode: 'split' | 'overlay' | 'sideBySide';
     splitViewPosition: number; // 0-100, défaut 50
     overlayOpacity: number; // 0-100, défaut 50
     ```
   - Ajouter actions :
     ```typescript
     setComparisonMode: (mode) => void;
     setSplitViewPosition: (pos) => void;
     setOverlayOpacity: (opacity) => void;
     ```

8. **`src/components/develop/DevelopView.tsx`**
   - Remplacer le layout mockup simplifié par :
     ```tsx
     {showBeforeAfter ? (
       <BeforeAfterComparison
         imageId={activeImg.id}
         beforeUrl={activeImg.urls.standard} // ← Original RAW
         afterUrl={activeImg.urls.standard}   // ← Sera transformée par PreviewRenderer
         mode={comparisonMode}
         onModeChange={setComparisonMode}
         splitPosition={splitViewPosition}
         onSplitPositionChange={setSplitViewPosition}
         opacity={overlayOpacity}
         onOpacityChange={setOverlayOpacity}
       />
     ) : (
       <PreviewRenderer ... /> // Mode normal
     )}
     ```
   - Connecter les props depuis `uiStore`

9. **`src/components/layout/Toolbar.tsx`**
   - Remplacer le simple bouton toggle par `ComparisonModeSelector`
   - Garder le bouton de toggle show/hide (affiche/cache la comparaison)
   - Nouvelles props : `comparisonMode, onComparisonModeChange`

10. **`src/components/develop/__tests__/BeforeAfterComparison.test.ts`**
    - Tests de rendu des 3 modes
    - Tests drag du split slider (simulation d'événements)
    - Tests changement de mode

11. **`src/components/develop/__tests__/ComparisonModeSelector.test.ts`**
    - Tests boutons de sélection
    - Tests callback onModeChange

### Architecture Cible

```
DevelopView (showBeforeAfter=true)
├─ ComparisonModeSelector
│  └─ onChange → uiStore.setComparisonMode
├─ BeforeAfterComparison
│  ├─ SplitViewComparison (if mode='split')
│  │  ├─ PreviewRenderer (beforeUrl, no filters)
│  │  ├─ Divider (draggable)
│  │  └─ PreviewRenderer (afterUrl, with filters)
│  ├─ OverlayComparison (if mode='overlay')
│  │  ├─ PreviewRenderer (beforeUrl)
│  │  ├─ PreviewRenderer (afterUrl, opacity)
│  │  └─ SliderHorizontal (opacity)
│  └─ SideBySideComparison (if mode='sideBySide')
│     ├─ PreviewRenderer (beforeUrl)
│     └─ PreviewRenderer (afterUrl)
```

**Flux de Données** :

```
Event Sourcing (editEventsPerImage[imageId])
  ↓
PreviewRenderer.tsx (applique filtres)
  ↓
BeforeAfterComparison (synchronise les deux rendus)
  ↓
État uiStore (comparisonMode, splitPosition, opacity)
  ↓
Affichage utilisateur
```

---

## Interfaces Publiques

### TypeScript Types

```typescript
// src/types/comparison.ts
export type ComparisonMode = 'split' | 'overlay' | 'sideBySide';

export interface BeforeAfterComparisonProps {
  imageId: number;
  beforeUrl: string;
  afterUrl: string;
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  splitPosition: number; // 0-100
  onSplitPositionChange: (position: number) => void;
  opacity: number; // 0-100
  onOpacityChange: (opacity: number) => void;
}

export interface ComparisonModeSelectorProps {
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
}

export interface SplitViewComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  position: number;
  onPositionChange: (position: number) => void;
}

export interface OverlayComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export interface SideBySideComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}
```

### Zustand Store Actions

```typescript
// uiStore.ts additions
interface UiStore {
  comparisonMode: ComparisonMode;
  splitViewPosition: number;
  overlayOpacity: number;

  setComparisonMode: (mode: ComparisonMode) => void;
  setSplitViewPosition: (position: number) => void;
  setOverlayOpacity: (opacity: number) => void;
}
```

---

## Contraintes Techniques

### TypeScript Frontend

- Strict mode `"strict": true`
- Pas de `any` → types explicites pour props et state
- Tous les événements souris typés (MouseEvent, PointerEvent, WheelEvent)
- Handlers mémoisés pour éviter re-render inutiles

### Synchronisation Zoom/Pan

- Stockage centralisé des coordonnées : `zoom` et `[panX, panY]`
- Calculer les transformations CSS une seule fois dans un `useMemo`
- Appliquer via `transform: scale(zoom) translate()`
- Wheel events : `e.deltaY > 0` → zoom out, sinon → zoom in

### Interaction Glisser-Déposer

- Split slider :
  - START : `onMouseDown` → `isGrabbing = true`
  - MOVE : `onMouseMove` → `position = (e.clientX / containerWidth) * 100`
  - END : `onMouseUp` → `isGrabbing = false`
  - CSS cursor : `cursor: col-resize`

- Overlay slider :
  - Similaire, mais axe horizontal (X)
  - CSS : `min-slider` ou contrôle custom

### Performance

- `useCallback` pour tous les event handlers (drag, wheel, etc.)
- `useMemo` pour les calculs de transform CSS
- Debounce ou throttle optionnels si nécessaire (pour events haute fréquence)

### Gestion des Images

- **Image "Avant"** = `previewUrl` brut (AUCUN filtre CSS/WASM)
  - PreviewRenderer avec `useWasm={false}` et `className=""` (aucun filtre)
- **Image "Après"** = `previewUrl` avec tous les filtres
  - PreviewRenderer normal avec `useWasm={true}`

---

## Dépendances Externes

### TypeScript (package.json)

- Aucune nouvelle dépendance requise
- Utiliser les composants Lucide existants pour les icônes

### Système

- Aucune (toute la logique est frontend React)

---

## Checkpoints de Validation

- [ ] **Checkpoint 1** : Code TypeScript compile sans erreur (`tsc --noEmit`)
- [ ] **Checkpoint 2** : Mode "Split-View" rend et rend draggable le séparateur
- [ ] **Checkpoint 3** : Mode "Overlay" affiche deux images + slider opacité
- [ ] **Checkpoint 4** : Mode "Side-by-Side" synchronise le zoom des deux images
- [ ] **Checkpoint 5** : Sélecteur de mode bascule les 3 modes correctement
- [ ] **Checkpoint 6** : État persiste dans `uiStore` (mode, position, opacity)
- [ ] **Checkpoint 7** : Tests à 80% de couverture pour BeforeAfterComparison et ses sous-composants
- [ ] **Checkpoint 8** : Image "Avant" affichée sans filtres, "Après" avec filtres appliqués
- [ ] **Checkpoint 9** : Switching images (sélection) réinitialise les états correctement
- [ ] **Checkpoint 10** : Integration test : snapshot d'une image → bascule en comparaison → restauration → nouveau snapshot visible

---

## Cas d'Usage Clés

### 1. Utilisateur bascule en mode comparaison

```
User → Toolbar (click button/selector)
→ uiStore.setComparisonMode('split')
→ DevelopView re-render
→ BeforeAfterComparison affiche SplitViewComparison
```

### 2. Utilisateur ajuste le split slider

```
User → drag Divider in SplitViewComparison
→ onMouseMove calcule position (0-100)
→ uiStore.setSplitViewPosition(50)
→ Container widths s'ajustent : 50% / 50%
```

### 3. Utilisateur zoome en mode side-by-side

```
User → wheel up (scroll)
→ SideBySideComparison.onWheel
→ Calcule zoom = 1.1 (ou 0.9)
→ Applique transform: scale(1.1) aux deux images
```

### 4. Utilisateur bascule snapshot

```
User → click snapshot in HistoryPanel
→ editStore.restoreToEvent(imageId, snapshotIndex)
→ editEventsPerImage[imageId] remplacé
→ PreviewRenderer re-rend avec nouveaux filtres
→ Mode comparaison met à jour automatiquement (afterUrl re-render)
```

---

## Critère de Validation Final

✅ **Split view** montrant le RAW original (gauche, grayscale, badge "Original RAW") vs preview éditée (droite, couleurs, badge "Aperçu Dynamique"), avec séparateur glissable

✅ **Overlay** superposant les deux images avec slider de transparence (0→100%)

✅ **Side-by-Side** empilant verticalement avec zoom/pan synchronisés

✅ Sélecteur de mode fonctionnel (3 boutons)

✅ État persisté dans `uiStore` (même mode après fermeture panneau)

✅ Tests couvrant les 3 modes + drag du slider + changement de mode (80%+ couverture)

✅ Tous les tests Phase 4.1-4.3 continuent à passer (non-régression)

---

## Next Steps (Phase 4.5 onwards)

- Phase 5.1 : Panneau EXIF finalisé (histogramme comparatif)
- Phase 7.4 : Raccourcis clavier (`C` pour cycle modes, `Z` pour zoom)
- Post-lancement : Animated transitions, masking avec brush
