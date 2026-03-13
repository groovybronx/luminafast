# Phase M4.3 - Pilote RAW Reel

> **Statut** : ✅ Completee
> **Duree estimee** : 1.5 jour

## Objectif

Valider en conditions reelles l'architecture RAW-ready sur un sous-ensemble cible de formats et boitiers.

## Perimetre

### Inclus dans cette phase

- Selection formats/cameras pilotes
- Integration decodeur concret backend
- Exports de validation sur dataset cible
- Rapport de compatibilite

### Exclus ou reporte intentionnellement

- Couverture complete de tous formats RAW
- Optimisation perf finale

### Reporte a partir phase RAW suivante

- Generalisation a l'ensemble du parc boitiers

## Dependances

### Phases

- M4.2 completee

### Ressources externes

- Dataset RAW de test

### Test Infrastructure

- Tests integration backend

## Fichiers

### A modifier

- `src-tauri/src/services/export_pipeline.rs`
- `src-tauri/src/commands/*` (commandes export RAW)

### A creer

- `Docs/Maintenance WASM/RAPPORT-PILOTE-RAW.md`

## Interfaces Publiques

```rust
#[tauri::command]
pub fn export_raw_edited(
    image_id: String,
    output_path: String,
    format: String,
) -> Result<ExportResultDTO, String>;
```

## Contraintes Techniques

- Scope pilote strict et mesure
- Resultats reproductibles

## Architecture Cible

- Premier flux RAW operationnel sous controle

## Dependances Externes

- Decodeur RAW selectionne (a documenter)

## Checkpoints

- [x] Checkpoint 1: pilote compile
- [x] Checkpoint 2: exports RAW pilotes valides
- [x] Checkpoint 3: rapport compatibilite produit

## Pieges et Risques

- Variabilite capteurs
- Differences de rendu par boitier

## Solutions Preventives

- Scope de boitiers limite
- Rapport de limites explicite

## Documentation Attendue

- Rapport pilote dans `Docs/Maintenance WASM/RAPPORT-PILOTE-RAW.md`

## Criteres de Completion

- [x] Pilote valide sur scope defini
- [x] Limites et extension future documentees
