# Phase 4.4 — Plan d'Implémentation Détaillé

> **Structure** : Décomposition en 5 sous-phases (4.4-A → 4.4-E)
> **Chaque sous-phase** : testable indépendamment, livrables spécifiques
> **Prérequis** : Brief PHASE-4.4.md lu entièrement

---

## Vue d'Ensemble

```
Phase 4.4 (Global)
├─ 4.4-A : Types & Store Zustand
├─ 4.4-B : Composants de Comparaison (3 modes)
├─ 4.4-C : Container BeforeAfterComparison
├─ 4.4-D : Sélecteur de Modes & Intégration UI
└─ 4.4-E : Tests & Validation Finale
```

**Durée totale estimée** : 3-4 jours (1 jour par sous-phase en moyenne)

---

## Phase 4.4-A : Types & Store Zustand

### Objectif

Créer les types TypeScript et mettre à jour `uiStore` pour supporter les états de comparaison.

### Fichiers à Créer

#### 1. `src/types/comparison.ts` (nouveau)

```typescript
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

export interface SplitViewComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  position: number; // 0-100
  onPositionChange: (position: number) => void;
}

export interface OverlayComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  opacity: number; // 0-100
  onOpacityChange: (opacity: number) => void;
}

export interface SideBySideComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export interface ComparisonModeSelectorProps {
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
}
```

**Validation** :

- [ ] `tsc --noEmit` passe
- [ ] Types exportés et réutilisables

### Fichiers à Modifier

#### 2. `src/types/index.ts`

Ajouter `export * from './comparison';`

#### 3. `src/stores/uiStore.ts`

Ajouter propriétés + actions :

```typescript
interface UiStore {
  // ... propriétés existantes ...

  // Nouvelles propriétés (Phase 4.4)
  comparisonMode: ComparisonMode;
  splitViewPosition: number;
  overlayOpacity: number;

  // Nouvelles actions
  setComparisonMode: (mode: ComparisonMode) => void;
  setSplitViewPosition: (position: number) => void;
  setOverlayOpacity: (opacity: number) => void;
}
```

**État initial** :

```typescript
comparisonMode: 'split',
splitViewPosition: 50,
overlayOpacity: 50,
```

**Validation** :

- [ ] `tsc --noEmit` passe
- [ ] Actions testables en isolation (Zustand)
- [ ] Valeurs initiales sensées (50% par défaut)

---

## Phase 4.4-B : Composants de Comparaison

### Objectif

Créer les 3 composants de comparaison (SplitView, Overlay, SideBySide) en isolation.

### Fichiers à Créer

#### 1. `src/components/develop/SplitViewComparison.tsx`

**Structure** :

```tsx
interface SplitViewComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  position: number; // 0-100
  onPositionChange: (position: number) => void;
}

export const SplitViewComparison: React.FC<SplitViewComparisonProps> = ({
  beforeUrl,
  afterUrl,
  position,
  onPositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Event handlers pour drag du séparateur
  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = ((e.clientX - rect.left) / rect.width) * 100;
      onPositionChange(Math.max(0, Math.min(100, newPos)));
    },
    [isDragging, onPositionChange],
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex w-full h-full overflow-hidden">
      {/* Avant (gauche) */}
      <div style={{ width: `${position}%` }} className="shrink-0 overflow-hidden relative">
        <img src={beforeUrl} className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-xs font-bold text-white rounded">
          Original RAW
        </div>
      </div>

      {/* Séparateur glissable */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 bg-blue-600 cursor-col-resize hover:bg-blue-400 transition-colors ${
          isDragging ? 'bg-blue-300' : ''
        }`}
      />

      {/* Après (droite) */}
      <div style={{ width: `${100 - position}%` }} className="shrink-0 overflow-hidden relative">
        <img src={afterUrl} className="w-full h-full object-contain" />
        <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 text-xs font-bold text-white rounded">
          Aperçu Dynamique
        </div>
      </div>
    </div>
  );
};
```

**Validation** :

- [ ] Render sans erreur
- [ ] Drag du séparateur modifie `position`
- [ ] Badges visibles "Original RAW" et "Aperçu Dynamique"
- [ ] Clamp de position (min 0, max 100)

#### 2. `src/components/develop/OverlayComparison.tsx`

**Structure** :

```tsx
interface OverlayComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  opacity: number; // 0-100
  onOpacityChange: (opacity: number) => void;
}

export const OverlayComparison: React.FC<OverlayComparisonProps> = ({
  beforeUrl,
  afterUrl,
  opacity,
  onOpacityChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onOpacityChange(parseInt(e.target.value));
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Image "Avant" (fond) */}
      <div className="flex-1 relative overflow-hidden">
        <img src={beforeUrl} className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-xs font-bold text-white rounded">
          Original RAW
        </div>

        {/* Image "Après" (dessus, transparent) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={afterUrl}
            className="w-full h-full object-contain"
            style={{ opacity: opacity / 100 }}
          />
        </div>
      </div>

      {/* Slider pour opacité */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="flex items-center gap-4">
          <label className="text-sm text-zinc-300">Transparence</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={handleChange}
            className="flex-1"
          />
          <span className="text-sm text-zinc-400 w-8 text-right">{opacity}%</span>
        </div>
      </div>
    </div>
  );
};
```

**Validation** :

- [ ] Render sans erreur
- [ ] Slider modifie l'opacité
- [ ] Image "Après" disparaît à 0%, visible à 100%
- [ ] Affichage du % en temps réel

#### 3. `src/components/develop/SideBySideComparison.tsx`

**Structure** :

```tsx
interface SideBySideComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const SideBySideComparison: React.FC<SideBySideComparisonProps> = ({
  beforeUrl,
  afterUrl,
  containerRef,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out/in
    setZoom((prev) => Math.max(1, Math.min(5, prev * delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="flex flex-col w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Image "Avant" */}
      <div className="flex-1 overflow-hidden border-b border-zinc-800 relative bg-zinc-950">
        <div style={{ transform }} className="w-full h-full origin-center">
          <img src={beforeUrl} className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-4 left-4 text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded">
          Zoom: {zoom.toFixed(2)}x
        </div>
      </div>

      {/* Image "Après" */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        <div style={{ transform }} className="w-full h-full origin-center">
          <img src={afterUrl} className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-4 right-4 text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded">
          Scroll pour zoomer
        </div>
      </div>
    </div>
  );
};
```

**Validation** :

- [ ] Render sans erreur
- [ ] Wheel events zoom les deux images
- [ ] Drag synchronise le pan
- [ ] Zoom affiché (2.00x, etc.)
- [ ] Clamp de zoom (1x à 5x)

**Tests à écrire** :

- `__tests__/SplitViewComparison.test.ts` → tests drag, position clamping
- `__tests__/OverlayComparison.test.ts` → tests slider, opacity range
- `__tests__/SideBySideComparison.test.ts` → tests wheel, pan sync

---

## Phase 4.4-C : Container BeforeAfterComparison

### Objectif

Créer le composant wrapper qui sélectionne le bon mode et gère les props.

### Fichiers à Créer

#### 1. `src/components/develop/BeforeAfterComparison.tsx`

**Structure** :

```tsx
interface BeforeAfterComparisonProps {
  imageId: number;
  beforeUrl: string;
  afterUrl: string;
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  splitPosition: number;
  onSplitPositionChange: (position: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  imageId,
  beforeUrl,
  afterUrl,
  mode,
  onModeChange,
  splitPosition,
  onSplitPositionChange,
  opacity,
  onOpacityChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-zinc-950">
      {/* Mode selector (en haut) */}
      <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex gap-2">
        {(['split', 'overlay', 'sideBySide'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {m === 'split' ? 'Split' : m === 'overlay' ? 'Overlay' : 'Side-by-Side'}
          </button>
        ))}
      </div>

      {/* Contenu (sélection du mode) */}
      <div className="flex-1 overflow-hidden">
        {mode === 'split' && (
          <SplitViewComparison
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            position={splitPosition}
            onPositionChange={onSplitPositionChange}
          />
        )}

        {mode === 'overlay' && (
          <OverlayComparison
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            opacity={opacity}
            onOpacityChange={onOpacityChange}
          />
        )}

        {mode === 'sideBySide' && (
          <SideBySideComparison
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            containerRef={containerRef}
          />
        )}
      </div>
    </div>
  );
};
```

**Validation** :

- [ ] Render sans erreur
- [ ] Buttons basculer les 3 modes
- [ ] Le bon composant affiche selon mode
- [ ] Props correctes passées à chaque composant
- [ ] Focus visuel sur mode actif

---

## Phase 4.4-D : Sélecteur de Modes & Intégration UI

### Objectif

Créer le sélecteur de modes (optionnel, peut être intégré dans BeforeAfterComparison) et intégrer dans DevelopView + Toolbar.

### Fichiers à Créer

#### 1. `src/components/develop/ComparisonModeSelector.tsx` (optionnel)

Si on veut un composant standalone réutilisable.

### Fichiers à Modifier

#### 2. `src/components/develop/DevelopView.tsx`

Remplacer la structure mockup simplifiée :

```tsx
export const DevelopView = ({ activeImg, showBeforeAfter }: DevelopViewProps) => {
  const comparisonMode = useUiStore((state) => state.comparisonMode);
  const setComparisonMode = useUiStore((state) => state.setComparisonMode);
  const splitViewPosition = useUiStore((state) => state.splitViewPosition);
  const setSplitViewPosition = useUiStore((state) => state.setSplitViewPosition);
  const overlayOpacity = useUiStore((state) => state.overlayOpacity);
  const setOverlayOpacity = useUiStore((state) => state.setOverlayOpacity);

  return (
    <div className="h-full flex items-center justify-center p-12 bg-zinc-950">
      {showBeforeAfter ? (
        <BeforeAfterComparison
          imageId={activeImg.id}
          beforeUrl={activeImg.urls.standard}
          afterUrl={activeImg.urls.standard}
          mode={comparisonMode}
          onModeChange={setComparisonMode}
          splitPosition={splitViewPosition}
          onSplitPositionChange={setSplitViewPosition}
          opacity={overlayOpacity}
          onOpacityChange={setOverlayOpacity}
        />
      ) : (
        <PreviewRenderer
          imageId={activeImg.id}
          previewUrl={activeImg.urls.standard}
          className="w-full h-full object-contain img-render"
          isSelected={true}
          useWasm={true}
        />
      )}
    </div>
  );
};
```

**Validation** :

- [ ] `showBeforeAfter=true` → BeforeAfterComparison affiché
- [ ] `showBeforeAfter=false` → PreviewRenderer seul affiché
- [ ] Switching images conserve le mode choisi
- [ ] Props connectedés correctement

#### 3. `src/components/layout/Toolbar.tsx`

Modifier le bouton/sélecteur BeforeAfter :

```tsx
interface ToolbarProps {
  // ... existing props ...
  showBeforeAfter: boolean;
  onToggleBeforeAfter: () => void;
  comparisonMode: ComparisonMode;
  onComparisonModeChange: (mode: ComparisonMode) => void;
}

export const Toolbar = ({
  // ... existing props ...
  showBeforeAfter,
  onToggleBeforeAfter,
  comparisonMode,
  onComparisonModeChange,
}: ToolbarProps) => {
  return (
    <div className="flex gap-2">
      {/* Bouton toggle show/hide comparaison */}
      <button
        onClick={onToggleBeforeAfter}
        className={`p-2 rounded border transition-colors ${
          showBeforeAfter
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Eye />
      </button>

      {/* Sélecteur de mode (visible si comparaison activée) */}
      {showBeforeAfter && (
        <select
          value={comparisonMode}
          onChange={(e) => onComparisonModeChange(e.target.value as ComparisonMode)}
          className="px-2 py-1 rounded bg-zinc-800 text-zinc-100 text-sm"
        >
          <option value="split">Split</option>
          <option value="overlay">Overlay</option>
          <option value="sideBySide">Side-by-Side</option>
        </select>
      )}
    </div>
  );
};
```

#### 4. `src/App.tsx`

Connecter les props depuis uiStore dans le rendu du Toolbar :

```tsx
const comparisonMode = useUiStore((state) => state.comparisonMode);
const setComparisonMode = useUiStore((state) => state.setComparisonMode);
const toggleBeforeAfter = useUiStore((state) => state.toggleBeforeAfter);
const showBeforeAfter = useUiStore((state) => state.showBeforeAfter);

// ...

<Toolbar
  // ... existing props ...
  showBeforeAfter={showBeforeAfter}
  onToggleBeforeAfter={toggleBeforeAfter}
  comparisonMode={comparisonMode}
  onComparisonModeChange={setComparisonMode}
/>;
```

**Validation** :

- [ ] Bouton toggle visible dans Toolbar
- [ ] Sélecteur mode visible seulement si comparaison activée
- [ ] Changement mode → DevelopView re-render correct
- [ ] État persisté en changeant d'image

---

## Phase 4.4-E : Tests & Validation Finale

### Objectif

Écrire les tests couvrant tous les modes, interactions, et intégration.

### Tests à Écrire

#### 1. `src/components/develop/__tests__/SplitViewComparison.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitViewComparison } from '../SplitViewComparison';

describe('SplitViewComparison', () => {
  it('should render both images', () => {
    const mockOnPositionChange = vi.fn();
    render(
      <SplitViewComparison
        beforeUrl="/test-before.jpg"
        afterUrl="/test-after.jpg"
        position={50}
        onPositionChange={mockOnPositionChange}
      />
    );
    // Vérifier que les deux images sont présentes
  });

  it('should update position on drag', () => {
    const mockOnPositionChange = vi.fn();
    const { container } = render(
      <SplitViewComparison
        beforeUrl="/test-before.jpg"
        afterUrl="/test-after.jpg"
        position={50}
        onPositionChange={mockOnPositionChange}
      />
    );
    // Simuler drag du séparateur
    const divider = container.querySelector('[class*="col-resize"]');
    // fireEvent...
  });

  it('should clamp position between 0 and 100', () => {
    // Test que position < 0 devient 0, position > 100 devient 100
  });

  it('should display badges', () => {
    // Vérifier "Original RAW" et "Aperçu Dynamique"
  });
});
```

#### 2. `src/components/develop/__tests__/OverlayComparison.test.ts`

```typescript
describe('OverlayComparison', () => {
  it('should render image with opacity slider', () => {
    // Render et vérifier slider
  });

  it('should update opacity on slider change', () => {
    // Vérifier opacity 0-100
  });

  it('should display opacity percentage', () => {
    // Vérifier affichage du %
  });
});
```

#### 3. `src/components/develop/__tests__/SideBySideComparison.test.ts`

```typescript
describe('SideBySideComparison', () => {
  it('should render two stacked images', () => {
    // Vérifier layout vertical
  });

  it('should zoom both images on wheel', () => {
    // Simul wheel event
  });

  it('should pan both images on drag', () => {
    // Simul drag + pan synchronisation
  });

  it('should clamp zoom between 1 and 5', () => {
    // Test clamp
  });
});
```

#### 4. `src/components/develop/__tests__/BeforeAfterComparison.test.ts`

```typescript
describe('BeforeAfterComparison', () => {
  it('should render SplitViewComparison when mode=split', () => {
    // Mode switch test
  });

  it('should render OverlayComparison when mode=overlay', () => {
    // Mode switch test
  });

  it('should render SideBySideComparison when mode=sideBySide', () => {
    // Mode switch test
  });

  it('should change mode when button clicked', () => {
    // Test mode selector buttons
  });
});
```

#### 5. `src/stores/__tests__/uiStore.test.ts`

```typescript
describe('uiStore comparison modes', () => {
  it('should initialize with default comparison mode', () => {
    // Default = 'split'
  });

  it('should update comparison mode', () => {
    // setComparisonMode
  });

  it('should update split view position', () => {
    // setSplitViewPosition (clamp 0-100)
  });

  it('should update overlay opacity', () => {
    // setOverlayOpacity (clamp 0-100)
  });
});
```

### Integration Tests

#### 6. `src/components/develop/__tests__/DevelopView.integration.test.ts`

```typescript
describe('DevelopView integration (Phase 4.4)', () => {
  it('should show PreviewRenderer when showBeforeAfter=false', () => {
    // Test default view
  });

  it('should show BeforeAfterComparison when showBeforeAfter=true', () => {
    // Test comparison view
  });

  it('should persist comparison mode when switching images', () => {
    // Change image, mode doit rester 'split' (ex)
  });

  it('should apply Event Sourcing filters to afterUrl', () => {
    // Vérifier que PreviewRenderer reçoit les bons filters
    // Avant = sans filters, Après = avec filters
  });
});
```

**Cible de couverture** : 80%+ pour tous les fichiers

---

## Checklist de Validation Complète

### Phase 4.4-A (Types & Store)

- [ ] `src/types/comparison.ts` créé
- [ ] `src/types/index.ts` re-export
- [ ] `uiStore.ts` mis à jour (props + actions)
- [ ] Tests uiStore passent
- [ ] `tsc --noEmit` pas d'erreur

### Phase 4.4-B (Composants)

- [ ] `SplitViewComparison.tsx` créé + fonctionne
- [ ] `OverlayComparison.tsx` créé + fonctionne
- [ ] `SideBySideComparison.tsx` créé + fonctionne
- [ ] Tests pour les 3 (couverture 80%+)
- [ ] Drag/slider/wheel events fonctionnels
- [ ] Badges "Original RAW" et "Aperçu Dynamique" visibles

### Phase 4.4-C (Container)

- [ ] `BeforeAfterComparison.tsx` créé
- [ ] Mode selector buttons fonctionnels
- [ ] Sélection du bon composant par mode
- [ ] Props correctes aux enfants
- [ ] Tests du container

### Phase 4.4-D (UI Integration)

- [ ] `DevelopView.tsx` modifié
- [ ] `Toolbar.tsx` modifié
- [ ] `App.tsx` connecté
- [ ] Sélecteur mode visible en comparaison
- [ ] State persistent uiStore

### Phase 4.4-E (Tests Finaux)

- [ ] Tous les tests passent
- [ ] Couverture 80%+ globale
- [ ] Aucune régression Phase 4.1-4.3
- [ ] Build sans erreur (`npm run build`)
- [ ] Linting ESLint + Prettier OK

---

## Architecture de Rendu Final

```
App.tsx
├─ DevelopView
│  └─ showBeforeAfter=true → BeforeAfterComparison
│     ├─ ComparisonModeSelector
│     │  └─ 3 buttons (split/overlay/sideBySide)
│     └─ Contenu selon mode :
│        ├─ SplitViewComparison (split)
│        │  ├─ PreviewRenderer (beforeUrl, no filters)
│        │  ├─ Divider (draggable)
│        │  └─ PreviewRenderer (afterUrl, with event filters)
│        ├─ OverlayComparison (overlay)
│        │  ├─ PreviewRenderer (beforeUrl, no filters)
│        │  ├─ PreviewRenderer (afterUrl, opacity)
│        │  └─ Slider (opacity control)
│        └─ SideBySideComparison (sideBySide)
│           ├─ PreviewRenderer (beforeUrl, zoom/pan)
│           └─ PreviewRenderer (afterUrl, zoom/pan)
└─ Toolbar
   ├─ Toggle BeforeAfter (eye button)
   └─ Mode Selector (dropdown si actif)
```

---

## Flux d'État

```
uiStore
├─ comparisonMode ('split' | 'overlay' | 'sideBySide')
├─ splitViewPosition (0-100)
└─ overlayOpacity (0-100)
    ↓
DevelopView props
    ↓
BeforeAfterComparison
    ↓
SplitViewComparison / OverlayComparison / SideBySideComparison
    ↓
onChange callbacks → uiStore.setXxx()
```

---

## Dépendances Entre Sous-Phases

```
4.4-A (Types & Store)
  ↓
4.4-B (Composants isolés) — peut commencer après 4.4-A
  ↓
4.4-C (Container) — dépend de 4.4-B
  ↓
4.4-D (UI Integration) — dépend de 4.4-C
  ↓
4.4-E (Tests & Validation) — tout en parallèle, tests finaux
```

**Parallélisable** : 4.4-B et ses tests peuvent être écrits en parallèle (TDD)

---

## Commits Recommandés

```
phase(4.4-A): types & store uiStore
phase(4.4-B): composants comparaison (split, overlay, sidebyside)
phase(4.4-C): container BeforeAfterComparison + mode selector
phase(4.4-D): intégration DevelopView, Toolbar, App
phase(4.4-E): tests + validation finale
```

**Merge** : 1x PR globale avec tous les commits, ou 5x PR (1 par sous-phase)

---

## Estimation Temps par Sous-Phase

| Sous-Phase | Tâche                     | Durée           |
| ---------- | ------------------------- | --------------- |
| 4.4-A      | Types + Store             | 30 min          |
| 4.4-B      | 3 Composants + tests      | 1.5h            |
| 4.4-C      | Container + tests         | 45 min          |
| 4.4-D      | Intégration UI            | 45 min          |
| 4.4-E      | Tests finaux + validation | 1h              |
| **TOTAL**  |                           | **~4.5 heures** |

(**Disclaimer** : peut varier selon complexité du drag/zoom)
