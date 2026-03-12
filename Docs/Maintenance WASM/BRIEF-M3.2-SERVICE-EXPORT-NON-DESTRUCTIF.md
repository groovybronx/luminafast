# Phase M3.2 - Service Export Non Destructif

> **Statut** : ✅ Completee
> **Duree estimee** : 1.5 jour

## Objectif

Mettre en place un pipeline export non destructif base sur les parametres d edition (events -> filtres -> rendu final).

## Perimetre

### Inclus dans cette phase

- Resolution des parametres depuis events/snapshots
- Application via moteur core partage
- Ecriture export final (JPEG/TIFF)

### Exclus ou reporte intentionnellement

- RAW developpe complet
- Export batch massif optimise

### Reporte a partir M3.3

- Contrat strict de parite preview/export

## Dependances

### Phases

- M3.1 completee
- Event sourcing disponible

### Ressources externes

- Aucune

### Test Infrastructure

- Rust integration tests

## Fichiers

### A creer

- `src-tauri/src/services/export_pipeline.rs`

### A modifier

- `src-tauri/src/commands/*` commandes export
- `src-tauri/src/services/*` mapping events -> filtres

## Interfaces Publiques

```rust
#[tauri::command]
pub fn export_image_edited(
    image_id: String,
    output_path: String,
    format: String,
) -> Result<ExportResultDTO, String>;
```

## Contraintes Techniques

- Export deterministe a event-set identique
- Gestion erreurs disque/format explicite

## Architecture Cible

- EventStore -> mapping filtres -> core -> writer

## Dependances Externes

- Aucune

## Checkpoints

- [x] Checkpoint 1: pipeline unitaire valide
- [x] Checkpoint 2: commande export fonctionnelle
- [x] Checkpoint 3: fichier export verifie

## Pieges et Risques

- Ecart de mapping events -> filtres

## Solutions Preventives

- Tests dedies de mapping

## Documentation Attendue

- Changelog M3.2 et section export non destructif

## Criteres de Completion

- [x] Tests integration export verts
- [x] Export JPEG/TIFF operationnel

## Resultat de phase

Pipeline livre dans `src-tauri/src/services/export_pipeline.rs` avec resolution source image SQL (`images` + `ingestion_file_status`), reconstruction filtres via snapshots + events, rendu via core partage (`export_rendering`), puis ecriture disque JPEG/TIFF.

Commande Tauri exposee dans `src-tauri/src/commands/export.rs` : `export_image_edited(image_id, output_path, format)` avec reponse `ExportResultDTO`.

Validation executee:

- `cd src-tauri && cargo check` ✅
- `cd src-tauri && cargo test export_pipeline` ✅ (3/3)
- `cd src-tauri && cargo clippy --all-targets -- -D warnings` ✅
