# MAINTENANCE — Extraction Hook useWasmCanvasRender

> **Statut**: ⬜ **En attente**
> **Type**: Maintenance (Refactoring)
> **Branche**: `phase/maintenance-wasm-extraction`

---

## Objectif

Extraire la logique répétée de rendu WASM dans les trois composants de comparaison (SplitViewComparison, OverlayComparison, SideBySideComparison) en un hook React personnalisé `useWasmCanvasRender()`. Améliorer la clarté, la maintenabilité et réduire la duplication de code.

**Impact** : Aucun changement de comportement, refactoring pur (code cleanup).

---

## Périmètre

### ✅ Inclus dans cette phase

- Créer `src/hooks/useWasmCanvasRender.ts` avec le hook encapsulant la logique `useEffect`
- Créer `src/lib/filterUtils.ts` avec les fonctions utilitaires :
  - `editStateToPixelFilters()` : convertir `EditState` → `PixelFilterState`
  - `hasNonNeutralFilters()` : détecter les modifications
- Refactoriser les 3 composants pour utiliser le hook
- Ajouter tests unitaires pour `filterUtils.ts`
- Mettre à jour `APP_DOCUMENTATION.md` si nécessaire

### ❌ Exclus intentionnellement

- Optimisations de performance WASM (voir phase maintenance-acceleration-preview)
- Modification de `renderWithWasm()` (traité en Option A/B précédent)
- Changement du comportement des composants

### 📋 Dépendances Résolvées

- Phase 4.4-B (3 composants de comparaison) ✅ complétée

---

## Dépendances

### Phases

- Phase 4.4-B (comparaison avant/après) ✅ complétée
- Phase 4.2 (WASM rendering) ✅ complétée

### Ressources Externes

- Aucune

### Test Infrastructure

- Vitest + Testing Library ✅ opérés
- React Testing Library pour tests de hook

---

## Fichiers

### À créer

- `src/lib/filterUtils.ts` — Fonctions utilitaires pour conversion/détection filtres
- `src/hooks/useWasmCanvasRender.ts` — Hook React encapsulant la logique du `useEffect`
- `src/lib/__tests__/filterUtils.test.ts` — Tests unitaires des fonctions utilitaires
- `src/hooks/__tests__/useWasmCanvasRender.test.ts` — Tests du hook (optionnel, mais recommandé)

### À modifier

- `src/components/develop/SplitViewComparison.tsx` — Utiliser le hook, nettoyer le `useEffect`
- `src/components/develop/OverlayComparison.tsx` — Utiliser le hook, nettoyer le `useEffect`
- `src/components/develop/SideBySideComparison.tsx` — Utiliser le hook, nettoyer le `useEffect`
- `Docs/APP_DOCUMENTATION.md` — Section "Composants UI > Services et Hooks internes" (ajouter note sur le hook)

---

## Interfaces Publiques

### filterUtils.ts

```typescript
/**
 * Convertit un EditState en PixelFilterState
 * Gère les valeurs par défaut et mapping champs (temp → colorTemp)
 */
export function editStateToPixelFilters(
  editState: EditState | undefined,
): PixelFilterState;

/**
 * Détecte si des filtres non-neutres sont appliqués
 */
export function hasNonNeutralFilters(filters: PixelFilterState): boolean;
```

### useWasmCanvasRender.ts

```typescript
import type { RefObject } from 'react';
import type { EditState } from '@/types';

/**
 * Hook personnalisé pour rendu WASM sur canvas
 * Gère le chargement d'image, normalisation des filtres et rendu WASM
 *
 * @param canvasRef - Référence au canvas HTML
 * @param imageUrl - URL de l'image à traiter
 * @param editState - État des éditions (filtres)
 */
export function useWasmCanvasRender(
  canvasRef: RefObject<HTMLCanvasElement>,
  imageUrl: string | undefined,
  editState: EditState | undefined,
): void;
```

---

## Contraintes Techniques

### TypeScript Frontend

- Strict mode (`"strict": true`)
- Pas de `any` — typer correctement filtres et editState
- Hook reçoit `RefObject<HTMLCanvasElement>`, pas le canvas directement
- Gestion d'erreur: `try/catch` sur le rendu WASM
- Pas de state manipulation dans le hook (côté composant)

### Tests

- filterUtils.test.ts : couvrir tous les champs de conversion `EditState → PixelFilterState`
- filterUtils.test.ts : couvrir la détection de filtres neutres et non-neutres (cas limites)
- Optional: useWasmCanvasRender.test.ts avec mocks de canvas et WASM

### Code Architecture

- Le hook NE doit PAS exposer l'implémentation interne (KISS principle)
- Réutiliser `renderWithWasm()` existant — pas de duplication
- Garder les fonctions utilitaires **pures** (sans effets de bord)

---

## Validations Avant Completion

- ✅ Les 3 composants utilisent le hook et ont un code `useEffect` beaucoup plus court (~3 lignes)
- ✅ Les tests `filterUtils.test.ts` passent (coverage ≥ 95%)
- ✅ Tous les tests de regression du projet passent
- ✅ `APP_DOCUMENTATION.md` mise à jour

---

## Notes Additionnelles

### Pourquoi cette refactorisation ?

La même logique existe 3 fois :
1. Conversion `EditState` → `PixelFilterState` (hardcoded dans chaque composant)
2. Détection des filtres neutres/non-neutres (logique booléenne répétée)
3. Pattern `useEffect` identique (load image, get dimensions, render WASM)

**Sans refactorisation** : risque de bug si cette logique doit être modifiée (risque de manquer une instance, incohérence).

**Avec refactorisation** : 
- Source unique de vérité
- Plus facile à tester
- Plus lisible

### Impact Behavioral

**Zéro changement** — c'est un refactoring pur. Comportement des 3 composants doit être 100% identique après.
