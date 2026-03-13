# Rapport Pilote RAW (M4.3)

Date: 2026-03-13
Phase: M4.3 - Pilote RAW Reel
Statut: valide sur scope pilote backend (avec protocole dataset reel reproductible)

## 1. Scope pilote retenu

Formats RAW pilotes (backend export):

- arw (Sony)
- raf (Fujifilm)
- dng (Adobe)

Formats explicitement hors scope M4.3 (retour erreur dediee):

- cr3, cr2, nef, orf, pef, rw2

## 2. Decodeur concret selectionne

Decodeur: rsraw (crate Rust existante du backend)
Integration:

- implementation backend d un decodeur concret branchant le contrat core `RawDecoder`
- conversion RAW -> `LinearImage` -> RGBA via `decode_raw_to_rgba8`
- application des edits non destructifs via le pipeline export existant

## 3. Validation pilote

### 3.1 Validation automatisee locale

Commande executee:

- `cd src-tauri && cargo test export_pipeline`

Resultat:

- 8/8 tests verts

Cas verifies:

- export standard jpeg (non-regression)
- export tiff avec snapshot (non-regression)
- export RAW pilote via mock decodeur (raf)
- rejet source non-RAW pour commande `export_raw_edited`
- rejet format RAW hors scope pilote (ex: cr3)
- propagation erreur decodeur RAW
- test integration dataset reel optionnel (skip si dataset absent)

### 3.2 Validation dataset reel (reproductible)

Test d integration reel disponible:

- `test_export_raw_pilot_real_dataset_if_configured`

Pre-requis:

- variable d environnement `LUMINAFAST_TEST_RAW` pointant vers un fichier RAW reel
- extension recommandee: arw, raf ou dng

Execution:

- `cd src-tauri && cargo test export_pipeline -- --nocapture`

Observation locale M4.3:

- dataset reel execute depuis `/Users/davidmichels/Desktop/deepprime_images`
- echantillons executes:
  - ARW: `Copyright_© Kah-Wai Lin 02.ARW` -> PASS
  - DNG: `Copyright_© Kah-Wai Lin 01.DNG` -> PASS
  - RAF: `Copyright_ © Agathe Poupeney.RAF` -> PASS
  - NEF: `Copyright_© Kah-Wai Lin 03.NEF` -> PASS (rejet attendu hors scope pilote)
  - ORF: `Copyright_© Petr Bambousek 01.ORF` -> PASS (rejet attendu hors scope pilote)
- resultat global: 5/5 executions vertes du test `test_export_raw_pilot_real_dataset_if_configured`

## 4. Compatibilite et limites

Compatibilite pilote backend:

- flux operationnel confirme pour les extensions pilotes arw/raf/dng
- commande dediee disponible: `export_raw_edited`

Limites connues:

- couverture boitiers/fournisseurs volontairement reduite au scope pilote
- absence de benchmark perf RAW final dans cette phase
- validation capteur/boitier reel depend d un dataset externe fourni par l equipe

## 5. Plan d extension apres M4.3

- elargir progressivement les extensions RAW hors scope pilote
- consolider la matrice boitier/fichier RAW reel
- ajouter mesures perf et qualite perceptuelle par boitier
- preparer suppression de chemins legacy en M5.1
