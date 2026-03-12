# Phase M2.3 - Parite Visuelle WASM

> **Statut** : ⬜ En attente
> **Duree estimee** : 1 jour

## Objectif

Garantir que le rendu WASM apres migration core reste visuellement equivalent au rendu de reference.

## Perimetre

### Inclus dans cette phase

- Dataset image de reference
- Presets de reference
- Comparaison sortie pre/post migration
- Seuils de tolerance formalises

### Exclus ou reporte intentionnellement

- Optimisations non liees
- Changement algorithmes

### Reporte a partir M3.3

- Contrat preview/export global

## Dependances

### Phases

- M2.2 completee
- M0.2 completee

### Ressources externes

- Dataset de reference

### Test Infrastructure

- Tests automatises comparaison

## Fichiers

### A creer

- `Docs/Maintenance WASM/PARITE-VISUELLE-WASM.md`

### A modifier

- `src/services/__tests__/wasmRenderingService.test.ts`

## Interfaces Publiques

- Aucune nouvelle interface

## Contraintes Techniques

- Mesure reproductible
- Seuil de delta explicite

## Architecture Cible

- Validation objective de non-regression visuelle

## Dependances Externes

- Aucune

## Checkpoints

- [ ] Checkpoint 1: dataset reference en place
- [ ] Checkpoint 2: comparaison automatisee executee
- [ ] Checkpoint 3: seuil respecte

## Pieges et Risques

- Faux positifs lies a recompression

## Solutions Preventives

- Comparaison sur buffers non recompresses

## Documentation Attendue

- Rapport parite WASM

## Criteres de Completion

- [ ] Rapport valide
- [ ] Aucun ecart bloquant
