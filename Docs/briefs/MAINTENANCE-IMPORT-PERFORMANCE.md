# Maintenance — Corrections Performance & UX Import

> **Statut** : 🔄 **En cours**
>
> **Objectif** : Corriger les problèmes de performance, freeze UI et progression du pipeline d'import.

---

## Contexte

Suite aux retours utilisateur, le système d'import complet (Phases 1.3, 2.1, 2.4) présente des problèmes critiques de performance et d'expérience utilisateur :

1. **Import très lent** (10-20× plus lent que prévu)
2. **Freeze de l'application** pendant l'import et génération de previews
3. **Barre de progression figée** (ne suit que le scan, pas l'ingestion/previews)
4. **Previews incomplètes** (seul Thumbnail généré, manque Standard/OneToOne)

## Causes Racines Identifiées

### 1. Ingestion Séquentielle (ingestion.rs:198)
**Problème** : Traitement séquentiel de tous les fichiers (commentaire explicite dans le code)
```rust
// Process files sequentially for now (avoid async issues with rayon)
for file in &files_to_process {
    let ingest_result = self.ingest_file(file).await; // BLOQUANT
}
```

**Impact** :
- 100 fichiers × 100ms = **10 secondes** au lieu de ~2s en parallèle (8 threads)
- Bloque le thread Tauri principal pendant toute la durée

**Solution** :
- Utiliser `rayon::par_iter()` avec pool de threads limité (4-8 threads)
- Émettre des événements de progression pendant l'ingestion
- Utiliser `tokio::task::spawn_blocking` pour les opérations CPU-intensives

---

### 2. Génération de Previews Séquentielle (useDiscovery.ts:62)
**Problème** : Génération des 3 types de previews UN PAR UN pour chaque image
```typescript
await previewService.generatePreview(ingestion.file.path, PreviewType.Thumbnail, hash);
await previewService.generatePreview(ingestion.file.path, PreviewType.Standard, hash);
await previewService.generatePreview(ingestion.file.path, PreviewType.OneToOne, hash);
```

**Impact** :
- 3× plus lent que nécessaire
- Charge/décode le fichier RAW 3 fois au lieu d'1 seule fois

**Solution** :
- Utiliser la commande `generate_preview_pyramid` existante (génère les 3 en 1 passe)
- Paralléliser avec Promise.all si nécessaire
- Émettre des événements de progression

---

### 3. Progression Incomplète (useDiscovery.ts + ingestion.rs)
**Problème** : La barre de progression ne suit que le **scan** (discovery), pas l'ingestion ni les previews

**Impact** :
- Barre figée à 100% pendant 70% du temps total
- Utilisateur pense que l'app a freeze
- Pas de visibilité sur les opérations longues (hashing, EXIF, previews)

**Solution** :
- Découper la progression en 3 phases :
  - **Scan** : 0-30% (discovery)
  - **Ingestion** : 30-70% (hashing + EXIF + insertion DB)
  - **Previews** : 70-100% (génération pyramide)
- Émettre des événements de progression granulaires pour chaque phase
- Mettre à jour `systemStore.importState.progress` en temps réel

---

### 4. Freeze UI (architecture threading)
**Problème** : Toutes les opérations lourdes (hashing BLAKE3, parsing EXIF, décodage RAW) bloquent le thread Tauri principal

**Impact** :
- UI complètement figée pendant l'import
- Impossibilité d'annuler l'opération
- Mauvaise expérience utilisateur

**Solution** :
- Déplacer toutes les opérations CPU-intensives dans des threads séparés
- Utiliser `tokio::task::spawn_blocking` pour les opérations sync lourdes
- Utiliser `rayon` pour le parallélisme CPU-bound
- Garder le thread Tauri responsive pour les événements UI

---

### 5. Pyramide de Previews Incomplète
**Problème** : Seul le `Thumbnail` est généré de façon fiable, `Standard` et `OneToOne` manquent souvent

**Impact** :
- Affichage grille OK (thumbnails)
- Zoom/détails lents (génération à la demande)
- Expérience utilisateur dégradée

**Solution** :
- Générer systématiquement les 3 types pendant l'import avec `generate_preview_pyramid`
- Valider la persistance des 3 types dans le cache
- Ajouter tests de non-régression

---

## Plan de Correction

### Étape 1 : Ingestion Parallèle + Progression
**Fichiers** : `src-tauri/src/services/ingestion.rs`, `src-tauri/src/commands/discovery.rs`

1. Remplacer boucle séquentielle par `rayon::par_iter()`
2. Limiter pool de threads (4-8 threads max via config)
3. Émettre événements `ingestion-progress` avec :
   - `processed: usize` (nombre de fichiers traités)
   - `total: usize` (total fichiers)
   - `current_file: String` (nom du fichier en cours)
   - `percentage: f32` (0.0-1.0)
4. Utiliser `tokio::task::spawn_blocking` pour `ingest_file()`

**Critères de validation** :
- [ ] 100 fichiers traités en <3s (vs 10s actuellement)
- [ ] Événements émis toutes les 100ms minimum
- [ ] Pas de freeze UI pendant l'ingestion

---

### Étape 2 : Pyramide de Previews Optimisée
**Fichiers** : `src/hooks/useDiscovery.ts`, `src/services/previewService.ts`

1. Remplacer 3 appels `generatePreview()` par 1 appel `generatePreviewPyramid()`
2. Paralléliser avec `Promise.all()` pour plusieurs images simultanées (max 4)
3. Émettre événements `preview-progress` depuis Rust

**Critères de validation** :
- [ ] 3 types de previews générés systématiquement
- [ ] Génération 3× plus rapide (1 passe au lieu de 3)
- [ ] Tous les fichiers preview existent dans le cache

---

### Étape 3 : Progression Globale Multi-Phase
**Fichiers** : `src/hooks/useDiscovery.ts`, `src/components/shared/ImportModal.tsx`

1. Découper progression en 3 phases :
   - **Scan** : 0-30%
   - **Ingestion** : 30-70%
   - **Previews** : 70-100%
2. Écouter événements `ingestion-progress` et `preview-progress`
3. Calculer pourcentage global avec pondération
4. Afficher phase courante dans l'UI (`"Analyse 25%"`, `"Ingestion 55%"`, `"Previews 85%"`)

**Critères de validation** :
- [ ] Barre de progression jamais figée >2s
- [ ] Transitions fluides entre phases
- [ ] Texte d'état descriptif (`"Ingestion: IMG_1234.CR3"`)

---

### Étape 4 : Tests de Performance
**Fichiers** : Tests Rust + Frontend

1. Benchmark ingestion (100 fichiers) : <3s
2. Benchmark previews (100 fichiers × 3 types) : <10s
3. Tests UI : progression toujours >0 et <100 pendant l'import
4. Tests freeze : UI responsive pendant toute la durée

**Critères de validation** :
- [ ] Benchmarks passent sur CI
- [ ] Pas de régression performance
- [ ] Tous les tests existants restent au vert

---

## Livrables

### Backend Rust
- `src-tauri/src/services/ingestion.rs` : Ingestion parallèle avec Rayon
- `src-tauri/src/commands/discovery.rs` : Événements progression ingestion
- `src-tauri/src/services/preview.rs` : Événements progression previews (si nécessaire)

### Frontend TypeScript
- `src/hooks/useDiscovery.ts` : Gestion progression multi-phase
- `src/components/shared/ImportModal.tsx` : Affichage progression détaillée
- `src/services/previewService.ts` : Utilisation `generatePreviewPyramid`

### Tests
- Tests unitaires Rust : Ingestion parallèle, événements
- Tests unitaires TypeScript : Calcul progression
- Tests d'intégration : Pipeline complet avec progression
- Benchmarks : Performance ingestion + previews

---

## Critères de Validation Globaux

### Performance
- [x] Analyse causes racines complète
- [ ] Ingestion 100 fichiers <3s (vs 10s actuellement)
- [ ] Previews 100 fichiers <10s
- [ ] UI responsive (pas de freeze >500ms)

### Progression
- [ ] Barre de progression toujours active pendant import
- [ ] Transitions fluides entre phases (scan → ingestion → previews)
- [ ] Texte d'état descriptif avec nom de fichier courant
- [ ] Annulation possible à tout moment

### Qualité
- [ ] 3 types de previews générés systématiquement
- [ ] Tous les tests existants passent
- [ ] Zéro régression fonctionnelle
- [ ] Documentation mise à jour (CHANGELOG, APP_DOCUMENTATION)

---

## Risques et Mitigations

### Threading Rust (rayon + tokio)
**Risque** : Deadlocks ou race conditions avec database mutex
**Mitigation** :
- Limiter scope des locks au minimum
- Utiliser `spawn_blocking` pour SQLite
- Tests de charge pour détecter deadlocks

### Événements Tauri
**Risque** : Flood d'événements (trop fréquents) → overhead
**Mitigation** :
- Throttling : 1 événement max toutes les 100ms
- Batch updates : grouper plusieurs fichiers par événement

### Compatibilité
**Risque** : Casser les phases 3.1-3.4 (grille, collections)
**Mitigation** :
- Exécuter tous les tests existants avant/après
- Validation manuelle de l'import + affichage grille

---

## Prochaine Phase

Une fois ces correctifs validés, nous pourrons continuer la Phase 3.5 — Recherche & Filtrage.

---

**Note** : Cette maintenance est **bloquante** pour une expérience utilisateur acceptable. Aucune nouvelle fonctionnalité ne doit être développée tant que ces problèmes ne sont pas résolus.
