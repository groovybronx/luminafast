# Phase 2.4 — UI d'Import Connectée

> **Statut** : ✅ **Complétée** — Import connecté bout-en-bout : dialogue natif → scan → ingestion SQLite → grille avec vraies previews (`assetProtocol` activé).

## Objectif
Connecter l'interface utilisateur d'import (`ImportModal`) aux services Rust (`DiscoveryService`, `IngestionService`) via le wrapper TypeScript `discoveryService`. Remplacer les mocks actuels par des appels réels pour permettre la sélection de dossiers, le scan de fichiers RAW, et leur ingestion en base de données.

## Périmètre

### 1. Sélection de Dossier
- Remplacer le mock actuel par `dialog.open()` de Tauri.
- Valider le chemin sélectionné via `discoveryService.validateDiscoveryPath`.
- Gérer les permissions et les erreurs d'accès.

### 2. Processus de Découverte (Scan)
- Utiliser `discoveryService.startDiscovery` pour lancer le scan.
- Afficher la progression en temps réel via `discoveryService.addProgressListener`.
- Mettre à jour `systemStore.importState` avec les stats (fichiers trouvés, en cours).
- Afficher les fichiers découverts dans une vue temporaire ou directement dans la grille (selon UX).

### 3. Processus d'Ingestion
- Implémenter l'ingestion par lots via `discoveryService.batchIngest`.
- Gérer la concurrence et le feedback visuel (barre de progression).
- Traiter les erreurs d'ingestion (fichiers corrompus, doublons).

### 4. Feedback Utilisateur
- Connecter `ArchitectureMonitor` aux événements réels.
- Utiliser `systemStore.addLog` pour tracer les étapes clés (Scan démarré, Fichier ingéré, Erreur).
- Gérer l'état de chargement et de blocage de l'UI pendant l'import.

## Livrables Techniques

### Frontend TypeScript
- Mise à jour de `src/components/shared/ImportModal.tsx` pour utiliser `discoveryService`.
- Mise à jour de `src/stores/systemStore.ts` si nécessaire pour supporter les nouveaux états.
- Création de `src/hooks/useDiscovery.ts` (optionnel) pour encapsuler la logique de scan.

### Tests
- Tests unitaires pour les composants connectés (avec mocks de `discoveryService`).
- Tests d'intégration pour le flux complet (Scan -> Ingestion -> Store update).

## Critères de Validation
- [x] Le dialogue natif de sélection de dossier s'ouvre et retourne un chemin valide.
- [x] Le scan démarre et la progression s'affiche correctement (X fichiers trouvés).
- [x] L'ingestion se lance et peuple la base de données SQLite.
- [x] Les images importées apparaissent dans la grille (via `useCatalog` + `assetProtocol`).
- [x] Les erreurs sont gérées gracieusement (logs système + console).
- [x] Aucun blocage de l'UI pendant le scan (async).

## Risques et Mitigations
- **Performance UI** : Trop d'événements de progression peuvent laguer l'UI.
  - *Mitigation* : Debounce/Throttle des mises à jour de state (déjà géré partiellement côté Rust, à vérifier côté TS).
- **Grands dossiers** : Scan de 10k+ fichiers.
  - *Mitigation* : Pagination ou virtualisation de la liste de pré-import si affichée.

## Dépendances
- Phase 2.1 (Services Rust) ✅
- Phase 2.3 (Previews) ✅
- Store `systemStore` ✅
