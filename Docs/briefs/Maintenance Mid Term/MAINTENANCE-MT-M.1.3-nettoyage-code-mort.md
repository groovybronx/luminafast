# Phase M.1.3 — Nettoyage Code Mort

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 1-2 jours
> **Priorité** : P1 (Élevée)

## Objectif

Identifier et supprimer le code mort, fichiers inutilisés et dépendances non-essentielles pour réduire la complexity et préparer l'application à la distribution commerciale.

## Périmètre

### ✅ Inclus dans cette phase

- Suppression `src-tauri/src/test_hook.rs` (fichier debug non utilisé en production)
- Expurge commandes inutilisées dans `src-tauri/src/commands/catalog.rs`
- Suppression fonctions dépréciées et non-exportées dans `luminafast-wasm/src/`
- Nettoyage imports inutilisés (Cargo.toml, package.json)
- Tests validant aucune régression fonctionnelle

### ❌ Exclus ou reporté intentionnellement

- Refactoring global codebase (trop vaste, reporté à maintenance future)
- Cleanup commandes debug internes (reporté si mentionnés dans doc usage)
- Suppression dépendances "maybe used" (vérifier avant via code analysis)

## Dépendances

### Phases

- Aucune (indépendante)

### Ressources Externes

- Aucune

### Test Infrastructure

- Rust test framework (`cargo test`)
- TypeScript type checking (`tsc`)

## Fichiers

### À supprimer

- `src-tauri/src/test_hook.rs` — Fichier entièrement (validé comme code test-only)

### À modifier

- `src-tauri/src/commands/catalog.rs` — Identifier + supprimer commandes dead code
- `luminafast-wasm/src/lib.rs` — Nettoyer fonctions non-exposed/deprecated
- `src-tauri/Cargo.toml` — Supprimer dépendances unused (via `cargo tree`)
- `package.json` — Supprimer devDependencies non-utilisées

## Interfaces Publiques

### Tauri Commands (après cleanup)

Liste finale des commandes conservées (détailler dans brief après audit):

```rust
// Exemple — actualiser après audit du code réel
#[tauri::command]
pub async fn batch_ingest(paths: Vec<String>, catalog_dir: String) -> Result<IngestionResult, String>;
```

## Contraintes Techniques

### Rust Backend

- ✅ Audit avant suppression : grep pour vérifier aucun usage dans codebase
- ✅ Aucun `unwrap()` en code restant
- ✅ Tests passent à 100% après nettoyage
- ✅ Documentation interne à jour (comments removes appropriés)

### TypeScript Frontend

- ✅ Pas de `any` type
- ✅ Type checking strict (`tsc --noEmit` passes)

## Architecture Cible

### Dépendances Rationalisées

Après nettoyage :

- Cargo.toml : minimal set de dépendances (no "maybe-used" deps)
- package.json : prod dependencies = utilised seulement
- Code structure : no dangling files/modules

## Dépendances Externes

### Rust (`Cargo.toml`)

- Audit via `cargo tree` — supprimer unused crates
- Vérifier version Tokio, Serde, etc. (garder versions actuelles si utilisées)

### TypeScript (`package.json`)

- Audit via `npm ls` / `npm audit` — supprimer unused devDependencies

## Checkpoints

- [ ] **Checkpoint 1** : Audit complet identifiée dans analyse (files list)
- [ ] **Checkpoint 2** : Code compile (`cargo check` + `tsc` ✅)
- [ ] **Checkpoint 3** : Tests passent 100% (non-régression)
- [ ] **Checkpoint 4** : Aucun import non-résolu restant
- [ ] **Checkpoint 5** : Clippy 0 warnings

## Pièges & Risques

### Pièges Courants

- Supprimer code "apparemment mort" mais utilisé via reflection/string-based lookup
- Oublier de nettoyer imports quand suppressions
- Supprimer dépendances utilisées transitively

### Risques Potentiels

- Casser runtime si commandes Tauri supprimées mais frontend attend
- Performance impact négatif (rare, mais tester)

### Solutions Préventives

- Grep exhaustif avant chaque suppression
- Tests intégration complète post-cleanup
- Versionner changements dans git avant merge
- Test with actual use-cases (import folders, view grid, etc.)

## Documentation Attendue

### CHANGELOG.md Entry

```markdown
| Phase | Sous-Phase | Description         | Statut       | Date       | Agent   |
| ----- | ---------- | ------------------- | ------------ | ---------- | ------- |
| M     | 1.3        | Nettoyage Code Mort | ✅ Complétée | YYYY-MM-DD | Agent-X |

**Détails (Phase M.1.3)**:

- Fichiers supprimés: test_hook.rs, [list others]
- Dépendances Cargo supprimées: [list crate names]
- Commandes Tauri supprimées: [list command names]
- Tests: All existing tests pass (non-régression 100%)
```

### APP_DOCUMENTATION.md Sections to Update

- Section "3. Architecture des Fichiers" — Remove dead entries
- Section "2. Stack Technique Actuelle" — Update dependencies list

## Critères de Complétion

### Backend

- [ ] `cargo check` ✅
- [ ] `cargo clippy` ✅ (0 warnings)
- [ ] Tests Rust passent 100% (non-régression)
- [ ] Aucune import non-résolu
- [ ] `cargo tree` clean (no unused)

### Frontend

- [ ] `tsc --noEmit` ✅
- [ ] `npm run lint` ✅
- [ ] Aucun import non-résolu

### Integration

- [ ] Tests M.1.1, M.1.2 passent (non-régression)
- [ ] CHANGELOG et APP_DOCUMENTATION mis à jour
- [ ] Code compile sans warning
