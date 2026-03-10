# Phase M.3.1 — Refactoring App.tsx

> **Statut** : ✅ **Complétée** (2026-03-10)
> **Durée estimée** : 2-3 jours
> **Priorité** : P2 (Moyenne)

## Objectif

Simplifier et modulariser le composant racine App.tsx en extrayant AppInitializer et hook useAppShortcuts, réduisant la complexity DU composant principal pour meilleure maintenabilité.

## Périmètre

### ✅ Inclus dans cette phase

- Extraction logique initialisation app dans composant `AppInitializer` dédié
- Création hook personnalisé `useAppShortcuts` pour gestion des raccourcis clavier
- Allègement App.tsx : supprimer state/logic non-essentiels
- Tests unitaires pour AppInitializer et useAppShortcuts
- Validation aucune régression comportement

### ❌ Exclus ou reporté intentionnellement

- Refactoring LeftSidebar (reporté à phase **M.3.2a** — brief dédié `MAINTENANCE-MT-M.3.2a-leftsidebar-refactor.md`)
- Optimisation GridView virtualisation (reporté à M.3.2)
- Global state management rewrite (out of scope)

## Dépendances

### Phases

- Phase M.1.x ✅ (backend async ready)
- Phase M.2.x ✅ (security in place)

### Ressources Externes

- React Hooks (déjà utilisé)
- Zustand store (déjà utilisé)

### Test Infrastructure

- Vitest + React Testing Library

## Fichiers

### À créer

- `src/components/AppInitializer.tsx` — Composant responsable initialisation (load settings, verify catalog, etc.)
- `src/hooks/useAppShortcuts.ts` — Custom hook pour keyboard shortcuts management

### À modifier

- `src/App.tsx` — Nettoyer, utiliser AppInitializer et useAppShortcuts
- `src/types/shortcuts.ts` — Types pour shortcut definitions (si nécessaire créer)

## Interfaces Publiques

### React Components

```typescript
// src/components/AppInitializer.tsx
interface AppInitializerProps {
  onInitComplete: () => void;
  children?: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ onInitComplete, children }) => {
  // Initialization logic
};
```

### Custom Hooks

```typescript
// src/hooks/useAppShortcuts.ts
interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useAppShortcuts(shortcuts: Shortcut[]): void;
```

### App.tsx (simplified)

```typescript
export const App: React.FC = () => {
  return (
    <AppInitializer onInitComplete={() => {}}>
      <AppLayout />
    </AppInitializer>
  );
};
```

## Contraintes Techniques

### TypeScript Frontend

- ✅ Strict mode enabled
- ✅ Pas de `any` — utiliser types explicites
- ✅ Props interfaces pour tous composants
- ✅ Custom hooks typed properly (return type explicit)
- ✅ Error boundaries autour AppInitializer

## Architecture Cible

### Composition Before → After

```
BEFORE:
  App.tsx (300+ lines)
    - useState x10 (loading, error, settings, etc.)
    - useEffect x5 (init, shortcuts, resize, etc.)
    - Keyboard listeners inline
    - Complex JSX structure

APRÈS:
  App.tsx (50 lines)
    └ AppInitializer
        └ useAppShortcuts hook
            └ AppLayout

AppInitializer.tsx (100 lines)
  - useEffect für initialization
  - Loading/Error state
  - Callback onInitComplete

useAppShortcuts.ts (50 lines)
  - useEffect für keyboard listeners
  - Shortcut registration
  - Cleanup
```

## Dépendances Externes

### TypeScript (`package.json`)

- React = "^18.x" (déjà présent)
- zustand = "latest" (déjà présent)
- No new dependencies

## Checkpoints

- [x] **Checkpoint 1** : AppInitializer component créé et fonctionne
- [x] **Checkpoint 2** : useAppShortcuts hook créé et testé
- [x] **Checkpoint 3** : App.tsx refactorisé, compile sans erreur (`tsc --noEmit`)
- [x] **Checkpoint 4** : Tests unitaires passent (≥70% coverage ciblée)
- [x] **Checkpoint 5** : Aucune régression fonctionnelle (keyboard shortcuts, init, etc.)

## Pièges & Risques

### Pièges Courants

- Oublier cleanup dans useAppShortcuts (event listeners leak)
- AppInitializer blocking render (use Suspense/loading state)
- State not properly lifted to zustand (local state still mixed)

### Risques Potentiels

- Performance dégradée si AppInitializer heavy (lazy-load components)
- Shortcuts conflicting avec browser defaults (test common shortcuts)

### Solutions Préventives

- useEffect with proper dependency arrays
- Test keyboard interactions (especially Ctrl+S, etc.)
- Mock Tauri calls dans tests
- Test with E2E (Playwright) for real behavior

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description                                     | Statut       | Date       | Agent   |
| ----- | ---------- | ----------------------------------------------- | ------------ | ---------- | ------- |
| M     | 3.1        | Refactoring App.tsx (AppInitializer, shortcuts) | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.3.1)**:

- Fichiers créés: `AppInitializer.tsx`, `useAppShortcuts.ts`
- Fichiers modifiés: `App.tsx`
- Tests créés: `AppInitializer.test.tsx`, `useAppShortcuts.test.ts`
- Complexity reduction: App.tsx 300+ lines → 50 lines
- Keyboard shortcuts: Now centralized in useAppShortcuts hook
```

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — Update App.tsx structure
- Section "4. Frontend Components" — Document AppInitializer responsibilities
- Section "5. Hooks" — Document useAppShortcuts behavior

## Critères de Complétion

### Frontend

- [x] `tsc --noEmit` ✅
- [x] `npm run lint` ✅ (fichiers M.3.1)
- [x] Tests Vitest ciblés M.3.1 passants
- [x] Pas de `any` TypeScript ajouté
- [x] No console errors/warnings introduits sur startup

### Behavior

- [x] Initialization still works (settings load, catalog ready)
- [x] Keyboard shortcuts all functional
- [x] App renders without blocking
- [x] Cleanup listeners assuré via hook `useAppShortcuts`

### Integration

- [x] Non-régression frontend ciblée validée
- [x] CHANGELOG mis à jour
- [x] Code compile sans warning TypeScript
