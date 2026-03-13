# Maintenance : Accélération Génération Previews (libvips + batch)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `maintenance/preview-acceleration`
**Type** : Maintenance (performance)

## Résumé

**Cause racine** : Génération de previews lente sur gros volumes.

**Solution** : Utilisation de libvips + batch processing.

## Fichiers modifiés

- `src-tauri/src/services/preview.rs` — batch libvips
- `src/components/PreviewGrid.tsx` — tests performance

## Critères de validation

- [x] Previews générées rapidement
- [x] Tests frontend passent (68/68 ✅)
