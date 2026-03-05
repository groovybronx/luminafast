# Brief PHASE-5.3 — Rating & Flagging Persistants

## 1. Objectif

Compléter le système de rating (0-5 étoiles) et flagging (pick/reject/none) en ajoutant :

- Filtres rapides dans la sidebar (par rating minimum et par flag)
- Badge visuel de flag sur les vignettes (vert= pick, rouge = reject)
- Opérations batch complètes dans BatchBar (rating 1-5, reject en plus du pick)
- État de filtre dédié dans uiStore (ratingFilter, flagFilter)

## 2. Fichiers à créer/modifier

### Créer

- `src/stores/__tests__/uiStore.test.ts` (compléter avec tests 5.3)
- `src/components/shared/__tests__/BatchBar.test.tsx`
- `src/components/layout/__tests__/LeftSidebar.test.tsx`

### Modifier

- `src/stores/uiStore.ts` — ajout `ratingFilter`, `flagFilter`, actions associées
- `src/App.tsx` — `filteredImages` useMemo intègre ratingFilter et flagFilter
- `src/components/layout/LeftSidebar.tsx` — section "Filtres Rapides" avec boutons ★ et P/X/U
- `src/components/library/LazyLoadedImageCard.tsx` — badge flag visuel (P vert / X rouge)
- `src/components/shared/BatchBar.tsx` — boutons rating 1-5 + bouton Reject

## 3. Dépendances

- ✅ Phase 1.2 complétée (backend `update_image_state`, `ImageFilter` avec `rating_min`/`flag`)
- ✅ Phase 5.1 complétée (panneau EXIF + RightSidebar)
- ✅ Phase 5.2 complétée (tags hiérarchiques)
- Backend Tauri command `update_image_state` déjà opérationnel
- Hooks `onRatingChange` / `onFlagChange` déjà opérationnels dans `useCatalog`
- Keyboard shortcuts (0-5, p, x, u) déjà implémentés dans `App.tsx`

## 4. Interfaces

### uiStore — nouveaux champs

```typescript
// État
ratingFilter: number | null;   // null = tous, 1-5 = rating minimum
flagFilter: FlagType | null; // null = tous, 'pick'|'reject' = filtre flag

// Actions
setRatingFilter: (rating: number | null) => void;
setFlagFilter: (flag: FlagType | null) => void;
```

### LeftSidebar — nouvelle prop

```typescript
// LeftSidebar n'a pas besoin de nouvelles props
// utilise useUiStore pour lire/écrire ratingFilter et flagFilter
```

### LazyLoadedImageCard — badge flag

```tsx
// Overlay positionné en bas-gauche du thumbnail
// flag === 'pick' → badge vert avec checkmark
// flag === 'reject' → badge rouge avec X
```

### BatchBar — nouvelles actions

```tsx
// Groupe "Rating" avec 5 boutons ★ (1..5 étoiles)
// Bouton Reject en plus du Pick existant
// Bouton Clear flag (U)
```

## 5. Critères de validation

- [ ] `ratingFilter` dans uiStore filtre correctement les images dans `filteredImages`
- [ ] `flagFilter` dans uiStore filtre correctement les images dans `filteredImages`
- [ ] LeftSidebar affiche une section "Filtres Rapides" avec 6 boutons star (all + 1★ à 5★)
- [ ] LeftSidebar affiche boutons Pick / Reject / Tous pour le flag
- [ ] Le filtre actif est visuellement distinguable (highlighted)
- [ ] LazyLoadedImageCard affiche badge vert "P" pour pick, rouge "X" pour reject
- [ ] BatchBar permet de définir rating 1, 2, 3, 4 ou 5 sur la sélection (pas seulement 5)
- [ ] BatchBar a un bouton Reject et un bouton Clear (U)
- [ ] Rating/flag persiste après fermeture/réouverture (via SQLite)
- [ ] Tous les tests passent

## 6. Contexte architectural

- `uiStore` gère tout l'état UI (activeView, filterText, selection…) — cohérent d'y ajouter les filtres rating/flag
- `filteredImages` dans App.tsx est le point central de filtrage — ratingFilter et flagFilter s'intègrent dans la chaîne existante
- Le backend `get_all_images` supporte déjà `rating_min`, `rating_max` et `flag` via `ImageFilter` — mais pour la réactivité UI, le filtrage côté frontend est préférable (pas de round-trip SQLite)
- Convention: camelCase pour les arguments Tauri (mémoire repo: `Tauri parameter naming`)
