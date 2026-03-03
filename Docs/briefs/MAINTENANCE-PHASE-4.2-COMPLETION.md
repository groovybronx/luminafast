---
# BRIEF MAINTENANCE — Phase 4.2 Conformity

> **Statut** : ⬜ **En attente d'assignation**
> **Durée estimée** : 1-2 jours (3 sous-phases)
> **Priorité** : 🔴 **CRITIQUE** (régression : pipeline cassé)
> **Dépendances** : Phase 4.1 ✅ Event Sourcing Engine
> **Créé par**: Master-Validator (2026-03-02)

## Contexte

Phase 4.2 (Pipeline de Rendu Image) est marquée "✅ Complétée" dans CHANGELOG (2026-02-26) avec score 567/567 tests ✅, mais une validation objective du code réel révèle **une régression majeure** :

**Le pipeline Event Sourcing n'est jamais utilisé pour persister les modifications EDIT.**

**Symptôme** : Utilisateur change l'exposition dans DevelopSliders → aucun changement visuel → données perdues au rechargement.

**Cause Racine** :
1. `App.tsx` dispatchEvent('EDIT') stocke seulement localement (editStore + catalogStore)
2. Jamais ne persiste via Tauri `append_event()` à SQLite Event Store (Phase 4.1)
3. `PreviewRenderer` recharge des events via `getEditEvents()` mais aucun événement n'existe en DB
4. Pipeline CSS appliqué sur zéro événements = zéro filtres visibles

**Impact** :
- ❌ Édits perdus au rechargement
- ❌ PreviewRenderer affiche aucun filtre
- ❌ Event Sourcing (Phase 4.1) non utilisé
- ❌ WASM jamais intégré (jamais appelé depuis TypeScript)

**Rapport complet** : [Docs/PHASE-4.2-VALIDATION-REPORT.md](PHASE-4.2-VALIDATION-REPORT.md)

---

## Objectif

Restaurer la **complète intégrabilité de Phase 4.2** en trois axes :

1. **Connecter** App.tsx EDIT dispatch → Event Store persist (via append_event Tauri)
2. **Automatiser** PreviewRenderer reload quand editStore events changent
3. **Valider** que sliders → visuels changent en temps réel, données persistent

---

## Périmètre

### ✅ Inclus

- Modifications `src/App.tsx` : intégrer appel `CatalogService.appendEvent()`
- **Create** `CatalogService.appendEvent()` wrapper Tauri
- **Modify** `PreviewRenderer.tsx` : re-subscribe events quand store change
- **Update** `Docs/APP_DOCUMENTATION.md` section 18 : cohérence avec implémentation
- **Tests** : valider pipeline EDIT → render end-to-end

### ❌ Exclus intentionnellement

- WASM integration (Phase B) — reporté à maintenance ultérieure (complexité HIGHER)
- Clarité + Vibrance pixel filters (placeholders) — Phase B+
- Profiling/benchmarks — sera fait après intégration fonctionnelle

---

## Dépendances

- **Phase 4.1** ✅ — Event Sourcing Engine (append_event Tauri command existe déjà)
- **Phase 3.2b** ✅ — DevelopSliders UI (existe)
- **Phase 4.2 (phase A)** ✅ — CSS Filters logic (existe)

---

## Fichiers à Modifier/Créer

### À modifier

1. **`src/App.tsx`** — dispatchEvent() EDIT branch
   - Ajouter appel `CatalogService.appendEvent()`
   - Garder optimistic update local

2. **`src/services/catalogService.ts`** — NEW METHOD
   - `appendEvent(event: EventDTO): Promise<void>`
   - Wrapper Tauri `append_event` command

3. **`src/components/library/PreviewRenderer.tsx`** — useEffect dependency
   - S'abonner à editStore events pour ce imageId
   - Recalculer filters quand events changent

4. **`Docs/APP_DOCUMENTATION.md`** — Section 18
   - Corriger status : "🔄 En cours → En révision"
   - Mettre à jour description du flux pour matcher implémentation réelle
   - Ajouter section "Statut d'Implémentation"

### À tester

5. **`src/services/__tests__/catalogService.test.ts`**
   - Ajouter test `appendEvent()` wrapper

6. **`src/__tests__/App.integration.test.ts`** (créer si absent)
   - E2E test : EDIT dispatch → Event Store → PreviewRenderer reload

---

## Interfaces Publiques

### CatalogService (à ajouter)

```typescript
// src/services/catalogService.ts
export async function appendEvent(event: EventDTO): Promise<void>;
```

**Signature Tauri command** (déjà existante) :

```rust
// src-tauri/src/commands/event_sourcing.rs:34-70
#[tauri::command]
pub fn append_event(event: EventDTO, state: State<AppState>) -> Result<(), CommandError>
```

---

## Architecture Cible

### Flux EDIT Complet

```
User moves slider in DevelopSliders
  ↓
onChange={e => onDispatchEvent('EDIT', {exposure: value})}
  ↓
[App.tsx dispatchEvent() line 189+]
  ↓
1. CatalogService.appendEvent({
     eventType: 'ImageEdited',
     payload: {edits: {exposure: value}},
     targetId: imageId
   })  ← NEW
  ↓
2. [Tauri IPC] → Rust append_event()
  ↓
3. [SQLite] INSERT INTO events(...)
  ↓
4. catalogStore.setImages([...updated...])  ← EXISTING (optimistic)
  ↓
3. PreviewRenderer subscription triggered
  ↓
4. PreviewRenderer useEffect dependency fires
  ↓
5. CatalogService.getEditEvents(imageId)  ← RELOAD
  ↓
6. Rust EventStore.get_events() [from 005_event_sourcing.sql]
  ↓
7. EventDTO[] returned with NEW event
  ↓
8. editStore.setEditEventsForImage(imageId, events)
  ↓
9. eventsToCSSFilters(events)  ← RECALC
  ↓
10. applyCSSFilters(imgElement, filters)  ← RENDER
  ↓
User sees preview update ✅ (latency <16ms per CSS)
↓
Save to disk/DB happens async (handled by Phase 1.2+ CRUD)
```

### Event Flow Sequencing

```
Timeline:

T+0ms   : Slider onChange triggered
T+1ms   : onDispatchEvent('EDIT') called
T+2ms   : App.tsx creates CatalogEvent
T+3ms   : appendEvent() Tauri invoke ASYNC (non-blocking)
T+5ms   : catalogStore optimistic update
T+6ms   : UI re-render with local state
T+7ms   : PreviewRenderer sees editStore change
T+8ms   : React useEffectdependency fires
T+10ms  : getEditEvents() Tauri invoke returns
T+15ms  : eventsToCSSFilters() + applyCSSFilters()
T+16ms  : CSS filter applied to DOM
T+16ms  : Visual feedback = COMPLETE ✅

Meanwhile (background, non-blocking):
T+50ms  : Rust append_event() finishes SQLite INSERT
T+100ms : Event Store updated ✅
```

---

## Tests Requis

### Unitaires

1. **`CatalogService.appendEvent()`**
   - Invoke Tauri properly
   - Handle errors gracefully
   - [x] 1 test

2. **`PreviewRenderer` event subscription**
   - useEffect fires when editStore changes
   - Reloads events + recalculates filters
   - [x] 1 test (update existing)

### Intégration E2E

3. **EDIT dispatch → DB persist → render**
   - User moves slider (simulate)
   - Event persisted to SQLite
   - PreviewRenderer visual changes
   - Data survives page reload
   - [x] 1 integration test

### Non-Régression

4. **Phases 1-4.1 toujours ✅**
   - `npm run test` = 100% pass
   - `cargo test --all` = 100% pass
   - [x] Existing suite

---

## Checkpoints de Validation

Phase se divise en 3 sous-phases claires avec checkpoints avant progression :

### 4.2-Correction-1 : App.tsx + CatalogService.appendEvent()

- [ ] **Checkpoint 1** : `CatalogService.appendEvent()` code créé et compilé
- [ ] **Checkpoint 2** : App.tsx dispatchEvent('EDIT') appelle appendEvent()
- [ ] **Checkpoint 3** : TypeScript compiles sans erreur (`tsc --noEmit`)
- [ ] **Checkpoint 4** : New Tauri IPC invoke dépêchée sans erreur runtime

**Profonda** : Si tous checkpoints ✅, procéder à 4.2-Correction-2. Sinon, debug.

---

### 4.2-Correction-2 : PreviewRenderer subscription

- [ ] **Checkpoint 5** : PreviewRenderer useEffect re-fir quand editStore.editEventsPerImage[imageId] change
- [ ] **Checkpoint 6** : getEditEvents() reloaded avec NEW event from DB
- [ ] **Checkpoint 7** : eventsToCSSFilters() recalculated
- [ ] **Checkpoint 8** : applyCSSFilters() DOM updated visibly

**Profonda** : Visual test simple : slider move → preview filter change => ✅

---

### 4.2-Correction-3 : Documentation + Final Validation

- [ ] **Checkpoint 9** : APP_DOCUMENTATION.md section 18 updated cohérence
- [ ] **Checkpoint 10** : All tests pass (`npm run test`, `cargo test --all`)
- [ ] **Checkpoint 11** : PAGE RELOAD — Édits persistent
- [ ] **Checkpoint 12** : Latency <16ms confirmed (perf test)

**Profonda** : Phase 4.2 functionally complete, data survives reload, UX feedback instant.

---

## Contraintes

### TypeScript

- Strict mode (`"strict": true`)
- Pas de `any` — utiliser `unknown` + type guards
- Props interfaces (suffixe `Props`)
- Error handling : try/catch ou Promise.catch()
- Gestion d'erreur UI : addLog() avec categorie 'error'

### Tauri IPC

- **camelCase** parameters from frontend (Tauri v2 auto-converts)
- Non-blocking invocations (async, no await in React render)
- Timeouts : 10s default (peut être override)
- Error messages: user-friendly + dev logging

### Performance

- EDIT dispatch → visual feedback : <16ms (CSS only, Phase A)
- Tauri IPC latency acceptable : <100ms (background, non-blocking)

---

## Dépendances Externes

**Aucune nouvelle dépendance npm/cargo**

Les Tauri commands + services existent déjà (Phase 4.1 ✅)

---

## Notes Architecturales

### Optimistic Update Pattern

```typescript
// 1. Immediate local update for UX responsiveness
catalogStore.setImages([...withLocalEdits...])  // Fast <5ms

// 2. Async persistence (background)
CatalogService.appendEvent(event)  // Non-blocking <100ms later

// 3. Reload from source of truth (if needed)
// Happens automatically when editStore subscription fires
```

### Error Handling

Si `appendEvent()` fails (network, DB error) :

- ✅ Local UI state kept (optimistic)
- ✅ User sees error notification : `addLog("Failed to save edit...", 'error')`
- ✅ Retry possible manually (save button, or auto-retry)
- ✅ No data loss (editStore cached in memory)

---

## Prochaine Phase

Phase 4.3 — Historique & Snapshots UI (utilise Event Sourcing pour undo/redo)

---

## Notes pour l'Agent Assigné

**Important** : Voir [PHASE-4.2-VALIDATION-REPORT.md](PHASE-4.2-VALIDATION-REPORT.md) pour contexte complet, incluant:

- Rapport de validation détaillé
- Code diff expliqué ligne-par-ligne
- Questions clés vérifiées
- Plan de correction avec effort estimates

**Tester au final** :

1. Slider move → visual feedback in preview (instant)
2. Browser reload → édits persistent (via SQLite)
3. Multiple images → filtres persistent par imageId
4. Error case : appel Tauri failed → graceful fallback

---
