# PHASE 3.5 — Recherche & Filtrage

## Objectif

Implémenter une barre de recherche unifiée permettant la recherche texte libre et structurée (préfixes) sur le catalogue d’images, avec parsing côté frontend, transmission à la commande Tauri, et affichage temps réel des résultats.

## Périmètre

- Barre de recherche unifiée (UI)
- Parsing de la syntaxe :
  - Texte libre (filename, tags, lieu)
  - Préfixes structurés : `star:5`, `iso:>1600`, `camera:gfx`, `lens:35mm`
- Parseur de requête frontend → JSON
- Commande Tauri : recherche avancée
- Résultats temps réel avec debounce
- Tests unitaires et d’intégration

## Contraintes

- Respecter la syntaxe décrite dans le plan de développement
- Pas de fallback temporel : résultats réels depuis la DB
- Types stricts (TS/Rust)
- Pas de `any` ni de simplification abusive
- Tests écrits en parallèle du code

## Critères de validation

- Recherche "iso:>3200 star:4" retourne les résultats en <50ms sur 10K images
- Recherche texte libre fonctionne (tags, filename, lieu)
- Résultats temps réel (debounce)
- Couverture de tests >90%

## Dépendances

- PHASE 3.1, 3.2, 3.3, 3.4 ✅
- Backend Rust : commandes de recherche exposées

## Livrables

- src/components/library/SearchBar.tsx
- src/services/searchService.ts
- src/types/search.ts
- src-tauri/src/services/search.rs
- Tests unitaires et d’intégration
- Documentation et CHANGELOG à jour

## Plan détaillé d’implémentation et de tests

### 1. Fichiers à créer/modifier

- `src/components/library/SearchBar.tsx` : Composant UI principal (barre de recherche)
- `src/services/searchService.ts` : Service d’appel à la commande Tauri et gestion du debounce
- `src/types/search.ts` : Types stricts pour la syntaxe de recherche, le parseur, et les résultats
- `src-tauri/src/services/search.rs` : Service Rust pour la recherche avancée côté backend
- `src-tauri/src/commands/catalog.rs` (si extension de la commande existante)
- Tests :
  - `src/components/library/__tests__/SearchBar.test.tsx`
  - `src/services/__tests__/searchService.test.ts`
  - `src/types/__tests__/search.test.ts`
  - `src-tauri/src/services/search.rs` (tests Rust #[cfg(test)])

### 2. Types et interfaces clés

- `SearchQuery` (TS) : structure JSON issue du parseur (texte libre + filtres structurés)
- `SearchResult` (TS) : résultat typé d’une recherche (liste d’images, total, etc.)
- `ParsedFilter` (TS) : type pour chaque filtre structuré (champ, opérateur, valeur)
- `SearchRequest`/`SearchResponse` (Rust/TS) : DTO pour l’appel Tauri

### 3. Services et logique

- Parseur TS : transforme la chaîne utilisateur en structure typée (gestion des opérateurs, valeurs, edge cases)
- Service d’appel Tauri : envoie la requête structurée, gère le debounce, reçoit les résultats
- Rust : mapping JSON → SQL, exécution performante, gestion des erreurs explicite

### 4. Tests à prévoir

- Parsing : cas simples, cas limites, erreurs de syntaxe
- UI : interaction utilisateur, affichage des résultats, gestion du loading
- Service : debounce, appel Tauri, gestion des erreurs
- Backend : requêtes SQL générées, performance, cohérence des résultats
