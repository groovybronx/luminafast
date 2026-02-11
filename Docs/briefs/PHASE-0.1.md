# Phase 0.1 — Migration TypeScript

## Objectif
Migrer le projet de JavaScript (JSX) vers TypeScript (TSX) strict. Créer les types de base du domaine métier. Garantir que `tsc --noEmit` passe sans erreur.

## Dépendances
- Aucune (première sous-phase)

## Fichiers à créer
- `tsconfig.json` — Configuration TypeScript strict
- `tsconfig.node.json` — Configuration pour les fichiers de config Vite
- `src/types/index.ts` — Re-export de tous les types
- `src/types/image.ts` — Types Image, ExifData, ImageState
- `src/types/collection.ts` — Types Collection, SmartQuery
- `src/types/events.ts` — Types Event, EventType, EditPayload
- `src/types/ui.ts` — Types pour l'état UI (ActiveView, LogEntry)
- `src/vite-env.d.ts` — Déclarations d'environnement Vite

## Fichiers à modifier
- `src/App.jsx` → `src/App.tsx` — Renommage + typage
- `src/main.jsx` → `src/main.tsx` — Renommage + typage
- `index.html` — Mise à jour du chemin vers main.tsx
- `vite.config.js` → `vite.config.ts` — Renommage
- `package.json` — Ajout dépendances TypeScript

## Interfaces à respecter
Les types doivent correspondre exactement au modèle de données mock actuel documenté dans `Docs/APP_DOCUMENTATION.md` section 5.

## Critères de validation
1. `tsc --noEmit` passe sans erreur
2. `npm run dev` lance l'app sans régression visuelle
3. `npm run build` produit un build valide
4. Aucun `any` explicite dans le code
5. Tous les composants ont des props typées

## Contexte architectural
Phase fondationnelle. Les types créés ici seront utilisés par TOUTES les phases suivantes. Ils doivent être conçus pour évoluer (ajout de champs optionnels, pas de breaking changes).
