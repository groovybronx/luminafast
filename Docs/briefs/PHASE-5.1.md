# Phase 5.1 — Panneau EXIF Connecté

> **Statut** : 🔄 **En cours**
> **Durée libre**

---

## Objectif

Connecter le panneau EXIF de la sidebar droite aux vraies données stockées en SQLite.
Remplacer l'histogramme fictif (sinus mock) par un histogramme calculé en temps réel depuis les pixels du preview via Canvas HTML5. Afficher conditionnellement les sections selon la disponibilité des données (GPS, color space).

---

## Périmètre

### ✅ Inclus dans cette phase

- Commande Tauri `get_image_exif(id)` → retourne EXIF complet (incl. GPS, color_space) depuis DB
- Hook `useExif` — charge l'EXIF détaillé depuis Tauri quand l'imageId change
- **ExifGrid amélioré** : focalLength, colorSpace, GPS conditionnel, formatage shutter speed corrigé
- **Bug fix** : conversion log2 → secondes dans `useCatalog.ts` (shutter_speed stocké en log2)
- **Histogramme réel** : calcul depuis pixels canvas du preview (R/G/B), composant `Histogram` accepte `previewUrl`
- **RightSidebar** : inject `imageId` + `previewUrl` dans les composants EXIF/Histogram
- Tests unitaires + intégration pour tous les livrables

### ❌ Exclus intentionnellement

- Écriture/modification des données EXIF (Phase 5.4 Sidecar XMP)
- Tags hiérarchiques (Phase 5.2)
- Rating/Flagging (Phase 5.3)
- Histogramme WASM (utiliser Canvas HTML5 — suffisant pour Phase 5.1)
- Affichage des données GPS sur carte (future phase)

### 📋 Dépend de

- Phase 2.2 ✅ : EXIF stocké dans `exif_metadata` en SQLite
- Phase 3.1 ✅ : Preview images disponibles en tant qu'URLs asset://

---

## Dépendances

### Phases

- Phase 2.2 ✅ — `exif_metadata` peuplé lors de l'ingestion
- Phase 4.2 ✅ — Previews format pyramid disponibles (thumbnail/standard)
- Phase 4.3 ✅ — `get_image_detail` command existante (réutilisation partielle)

### Ressources Externes

- Canvas HTML5 API (natif navigateur, pas de dépendance)

### Test Infrastructure

- Vitest + Testing Library installés ✅
- Mock `@tauri-apps/api/core` existant ✅
- Rust test framework prêt ✅

---

## Fichiers

### À créer

- `src/hooks/useExif.ts` — Hook React fetching l'EXIF détaillé par imageId ; retourne `{ exif, isLoading, error }`
- `src/hooks/__tests__/useExif.test.ts` — Tests unitaires du hook (mock Tauri)
- `src/components/metadata/__tests__/ExifGrid.test.tsx` — Tests du composant ExifGrid amélioré
- `src/components/metadata/__tests__/Histogram.test.tsx` — Tests du composant Histogram réel

### À modifier

- `src-tauri/src/commands/catalog.rs` — Ajouter `get_image_exif(id)` command
- `src-tauri/src/commands/mod.rs` — Re-exporter `get_image_exif`
- `src-tauri/src/lib.rs` — Enregistrer `get_image_exif` dans Tauri
- `src/hooks/useCatalog.ts` — **Fix bug** : conversion log2 → secondes pour `shutter_speed`
- `src/components/metadata/ExifGrid.tsx` — Ajouter focalLength, colorSpace, GPS conditionnel
- `src/components/metadata/Histogram.tsx` — Histogramme réel depuis pixels canvas
- `src/components/layout/RightSidebar.tsx` — Transmettre `imageId` + `previewUrl`

---

## Interfaces Publiques

### Tauri Commands

```rust
// Nouvelle commande Phase 5.1
#[tauri::command]
pub async fn get_image_exif(id: u32, state: State<'_, AppState>) -> CommandResult<ExifMetadataDTO>
// Retourne les données complètes depuis exif_metadata y compris GPS et color_space
```

### TypeScript — Hook useExif

```typescript
interface UseExifReturn {
  exif: ExifData | null;
  isLoading: boolean;
  error: string | null;
}

function useExif(imageId: number | null): UseExifReturn;
```

### TypeScript — Histogram Props

```typescript
interface HistogramProps {
  previewUrl?: string; // asset:// URL du preview
}
```

### TypeScript — ExifGrid Props (inchangé, ExifData déjà complet)

```typescript
interface ExifGridProps {
  exif: ExifData; // ExifData type already has gpsLat, gpsLon, colorSpace, focalLength
}
```

---

## Critères de Validation

1. ✅ `cargo check` — 0 erreurs, 0 warnings
2. ✅ `cargo test --lib get_image_exif` — tests Rust passent
3. ✅ `npm run type-check` — 0 erreurs TypeScript
4. ✅ Tous les tests Vitest passent (non-régression + nouveaux)
5. ✅ Pour une image réelle importée, le panneau EXIF affiche les données SQLite (pas les mocks)
6. ✅ L'histogramme se calcule depuis les pixels du preview (pas la courbe sinusoïdale)
7. ✅ Si une image n'a pas de GPS : la section GPS n'est pas affichée
8. ✅ La vitesse d'obturation s'affiche correctement (ex: `1/125` pour log2 ≈ -6.97)

---

## Notes Techniques

### Bug shutter_speed

- DB stocke `shutter_speed` en **log2(seconds)** (ex: 1/125s → -6.97)
- `useCatalog.ts` traite actuellement cette valeur comme des secondes directes → BUG
- Correction : `const seconds = Math.pow(2, rawLog2Value)`
- Puis : `seconds >= 1 ? "${seconds.toFixed(1)}s" : "1/${Math.round(1/seconds)}"`

### Histogramme Canvas

```typescript
// Algorithme dans Histogram.tsx
const image = new Image();
image.crossOrigin = 'anonymous';
image.onload = () => {
  offscreenCanvas.drawImage(image, 0, 0, 256, 256);
  const pixels = offscreenCanvas.getImageData(0, 0, 256, 256).data;
  // Remplir bins[R/G/B][0..255]
};
```

### Affichage conditionnel ExifGrid

- Section GPS : visible seulement si `exif.gpsLat != null`
- Section color space : visible seulement si `exif.colorSpace != null`
- Section camera : visible seulement si `exif.cameraMake || exif.cameraModel`
