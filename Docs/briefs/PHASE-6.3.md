# PHASE 6.3 — Virtualisation Avancée de la Grille

## 1. Objectif

Améliorer les performances de la grille d'images en ajoutant une **vitesse de scroll adaptive**, un **prefetching intelligent** basé sur la vélocité, et un **placeholder shimmer** pendant le chargement — cible : 60fps sur 100K images.

La virtualisation de base (@tanstack/react-virtual, `overscan: 3`) est déjà implémentée depuis la Phase 3.1. Cette phase optimise le comportement dynamique.

## 2. Fichiers à Créer / Modifier

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/hooks/useScrollVelocity.ts` | Hook : calcule vélocité scroll en px/s, expose `isScrollingFast` |
| `src/hooks/__tests__/useScrollVelocity.test.ts` | Tests unitaires du hook |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/components/library/GridView.tsx` | Overscan dynamique (3→8) + passer `isScrollingFast` aux cartes |
| `src/components/library/LazyLoadedImageCard.tsx` | Prop `isScrollingFast` + chargement différé + shimmer skeleton |
| `src/components/library/library.css` | Animation `@keyframes shimmer` + classe `.grid-skeleton-shimmer` |
| `src/components/library/__tests__/GridView.test.tsx` | Tests overscan dynamique |
| `src/components/library/__tests__/LazyLoadedImageCard.test.tsx` | Tests shimmer + isScrollingFast |

## 3. Dépendances

- Phase 3.1 ✅ (GridView + LazyLoadedImageCard opérationnels)
- Phase 6.1 ✅ (Cache multiniveau en place)
- `@tanstack/react-virtual` déjà installé comme dépendance

## 4. Interfaces

### `useScrollVelocity`

```typescript
interface UseScrollVelocityOptions {
  threshold?: number;   // px/s seuil "fast" (défaut: 500)
  idleDelay?: number;   // ms inactivité avant reset à idle (défaut: 100)
}

interface UseScrollVelocityResult {
  velocity: number;         // vitesse absolue en px/s
  isScrollingFast: boolean; // true si velocity >= threshold
}

function useScrollVelocity(
  scrollRef: React.RefObject<HTMLElement | null>,
  options?: UseScrollVelocityOptions
): UseScrollVelocityResult
```

### `LazyLoadedImageCard` (props étendues)

```typescript
interface LazyLoadedImageCardProps {
  // ... props existantes ...
  isScrollingFast?: boolean; // nouveau : différer le chargement si true
}
```

## 5. Critères de Validation

- [ ] Hook `useScrollVelocity` exporté depuis `src/hooks/`
- [ ] `isScrollingFast` passe de `false` → `true` au-dessus de 500 px/s
- [ ] `isScrollingFast` repasse à `false` après 100ms d'inactivité
- [ ] GridView utilise `overscan: 8` quand `isScrollingFast === true`
- [ ] GridView utilise `overscan: 3` quand `isScrollingFast === false`
- [ ] LazyLoadedImageCard affiche le shimmer (`.grid-skeleton-shimmer`) quand non visible OU `isScrollingFast`
- [ ] LazyLoadedImageCard charge l'image immédiatement à l'intersection si `isScrollingFast === false`
- [ ] LazyLoadedImageCard différe le chargement (mode `pending`) si `isScrollingFast === true` lors de l'intersection, et charge dès que scroll s'arrête
- [ ] Animation CSS shimmer définie dans `library.css`
- [ ] Tous les tests existants passent (non-régression)
- [ ] `tsc --noEmit` sans erreur

## 6. Contexte Architectural

### Virtualisation actuelle (à conserver)

La `GridView` utilise `useVirtualizer` de `@tanstack/react-virtual` avec :
- Récupération des items virtuels par ligne (row-based)
- `overscan: 3` statique
- `containerRef` référencé sur le div scrollable

### Lazy Loading actuel

`LazyLoadedImageCard` utilise `IntersectionObserver` avec `rootMargin: '100px'` pour précharger les images à 100px avant qu'elles entrent dans le viewport. Une fois visible (`hasInitializedRef.current = true`), l'image n'est jamais déchargée.

### Pattern de chargement différé

Lors d'un scroll rapide, les images du viewport ne doivent PAS être chargées immédiatement (évite les requêtes inutiles pour des images qui défileront avant d'être visibles). Le mécanisme :

1. `IntersectionObserver` fires → si `isScrollingFast` : marquer `pendingLoadRef.current = true`
2. Quand `isScrollingFast → false` : si `pendingLoadRef.current`, déclencher le chargement
3. Si déjà chargé (`hasInitializedRef.current`) : toujours afficher l'image (ne pas régresser)

### Performance CSS

Le shimmer via `background: linear-gradient` + `background-position` animation est GPU-accelerated (transform/opacity). Éviter `width` ou `height` dans les keyframes.
