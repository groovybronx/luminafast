# Phase M2.2 - Non-Regression Frontend WASM

> **Statut** : ⬜ En attente
> **Duree estimee** : 0.5 jour

## Objectif

Verifier que le frontend conserve le meme comportement apres migration interne WASM -> core partage.

## Perimetre

### Inclus dans cette phase

- Validation `loadWasmModule`, `hasWasmSupport`, `renderWithWasm`
- Validation fallback CSS si WASM indisponible
- Validation normalisation filtres UI -> moteur

### Exclus ou reporte intentionnellement

- Evolution UX
- Nouveaux filtres

### Reporte a partir M2.3

- Parite visuelle formelle

## Dependances

### Phases

- M2.1 completee

### Ressources externes

- Aucune

### Test Infrastructure

- Vitest

## Fichiers

### A modifier

- `src/services/wasmRenderingService.ts`
- `src/services/__tests__/wasmRenderingService.test.ts`

## Interfaces Publiques

```typescript
export async function loadWasmModule(): Promise<void>;
export function hasWasmSupport(): boolean;
export async function renderWithWasm(...): Promise<void>;
```

## Contraintes Techniques

- API TS publique inchangee
- Strict TypeScript (pas de any)

## Architecture Cible

- Frontend independant de l implementation interne du moteur

## Dependances Externes

- Aucune

## Checkpoints

- [ ] Checkpoint 1: tests service WASM verts
- [ ] Checkpoint 2: fallback CSS valide
- [ ] Checkpoint 3: `tsc --noEmit` vert

## Pieges et Risques

- Mismatch ranges entre UI et core

## Solutions Preventives

- Tests explicites de normalisation

## Documentation Attendue

- Note de non-regression dans changelog maintenance

## Criteres de Completion

- [ ] Type-check vert
- [ ] Tests service verts
- [ ] Fallback confirme
