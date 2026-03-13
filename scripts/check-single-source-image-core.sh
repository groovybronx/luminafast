#!/bin/bash
#
# check-single-source-image-core.sh
#
# Garde-fou M5.3 : verifie que les algorithmes de traitement image sont
# uniquement definis dans luminafast-image-core (source unique).
#
# Ce script echoue (exit 1) si l une des regles suivantes est violee :
#   1. Un fichier image_processing.rs legacy est reapparu dans src-tauri/src/
#      ou luminafast-wasm/src/
#   2. Une fonction libre apply_filters ou compute_histogram_from_pixels est
#      definie en dehors de luminafast-image-core/
#   3. La dependance luminafast-image-core est absente de src-tauri/Cargo.toml
#      ou luminafast-wasm/Cargo.toml
#
# Usage: bash scripts/check-single-source-image-core.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS=true

echo ""
echo "=========================================="
echo " LuminaFast — Garde-fou source unique"
echo " Verification duplication algorithmique"
echo "=========================================="
echo ""

# ------------------------------------------------------------------
# Regle 1 : Aucun fichier image_processing.rs legacy ne doit exister
# ------------------------------------------------------------------
echo "Regle 1 : Absence de fichiers image_processing.rs legacy..."
LEGACY_FILES=(
  "src-tauri/src/services/image_processing.rs"
  "luminafast-wasm/src/image_processing.rs"
)
for f in "${LEGACY_FILES[@]}"; do
  if [ -f "$ROOT_DIR/$f" ]; then
    echo "  ECHEC : Fichier legacy reintroduit detecte : $f"
    PASS=false
  else
    echo "  OK    : $f absent"
  fi
done

# ------------------------------------------------------------------
# Regle 2 : Aucune fonction algorithmique libre hors du core partage
#
# On cherche les definitions de fonctions libres (debut de ligne, pas
# de retrait = pas de methode) pour :
#   - apply_filters
#   - compute_histogram_from_pixels
# dans src-tauri/src/ et luminafast-wasm/src/
# ------------------------------------------------------------------
echo ""
echo "Regle 2 : Aucune fonction algorithmique libre hors de luminafast-image-core..."
ALGO_MATCHES=$(grep -rn --include="*.rs" \
  -E "^pub fn (apply_filters|compute_histogram_from_pixels)\s*\(" \
  src-tauri/src/ luminafast-wasm/src/ 2>/dev/null || true)
if [ -n "$ALGO_MATCHES" ]; then
  echo "  ECHEC : Fonctions algorithmiques dupliquees hors du core :"
  echo "$ALGO_MATCHES" | sed 's/^/         /'
  PASS=false
else
  echo "  OK    : Aucune fonction algorithmique libre hors de luminafast-image-core"
fi

# ------------------------------------------------------------------
# Regle 3 : luminafast-image-core doit etre declare comme dependance
#           dans les deux crates consommatrices
# ------------------------------------------------------------------
echo ""
echo "Regle 3 : Presence de la dependance luminafast-image-core..."
CONSUMERS=(
  "src-tauri/Cargo.toml"
  "luminafast-wasm/Cargo.toml"
)
for toml in "${CONSUMERS[@]}"; do
  if grep -q "luminafast-image-core" "$ROOT_DIR/$toml"; then
    echo "  OK    : $toml -> luminafast-image-core present"
  else
    echo "  ECHEC : $toml ne declare pas luminafast-image-core comme dependance"
    PASS=false
  fi
done

# ------------------------------------------------------------------
# Resultat final
# ------------------------------------------------------------------
echo ""
echo "=========================================="
if [ "$PASS" = false ]; then
  echo " ECHEC : Source unique algorithmique violee."
  echo " Corriger les violations avant de merger."
  echo "=========================================="
  echo ""
  exit 1
fi
echo " SUCCES : Source unique validee -> luminafast-image-core"
echo "=========================================="
echo ""
exit 0
