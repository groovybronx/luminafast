# Analyse : Gestion des Formats de Previews par Vue d'Affichage

**Statut** : 🔴 **Lacune Majeure** — Seuls les Thumbnails sont utilisés partout
**Date d'analyse** : 2026-03-03
**Modifié par** : Master-Validator

---

## 1. Résumé Exécutif

### Le problème

La **Phase 2.3** définit une architecture pyramidale de 3 formats de previews :

| Type          | Dimensions        | Qualité  | Cas d'usage                              |
| ------------- | ----------------- | -------- | ---------------------------------------- |
| **Thumbnail** | 240px bord long   | JPEG q75 | Grille (GridView) — visualisation rapide |
| **Standard**  | 1440px bord long  | JPEG q85 | Affichage plein écran (DevelopView)      |
| **OneToOne**  | Résolution native | JPEG q90 | Zoom pixel (non implémenté)              |

**Reality Check** : Le code utilise **UNIQUEMENT les Thumbnails** pour tous les affichages.

```
Phase 2.3 (Brief)     : Thumbnail ✅ + Standard ✅ + OneToOne ✅
Code réel             : Thumbnail SEULEMENT ❌
```

### Impact technique

1. **DevelopView** affiche des previews 240px au lieu de 1440px → dégradation qualité/netteté
2. **Composants ignorants** : Aucun composant ne sait quel type de preview il affiche
3. **API incomplète** : `CatalogImage.url` ne peut pas représenter 3 formats différents
4. **Zéro flexibilité** : Impossible d'implémenter un zoom 1:1 ou changer de format dynamiquement

---

## 2. Architecture Définie vs Réalité

### 2.1 Types TypeScript (Phase 2.3 — ✅ **Bien défini**)

**Fichier** : [src/types/preview.ts](src/types/preview.ts)

```typescript
export enum PreviewType {
  Thumbnail = 'thumbnail', // 240px, q75
  Standard = 'standard', // 1440px, q85
  OneToOne = 'one_to_one', // Résolution native, q90
}

export interface PreviewResult {
  path: string;
  preview_type: PreviewType; // ← Type toujours présent
  size: [number, number];
  // ...
}
```

**Verdict** : ✅ API est complete et bien structurée.

---

### 2.2 Service Rust (Phase 2.3 — ✅ **Bien implémenté**)

**Fichier** : [src-tauri/src/models/preview.rs](src-tauri/src/models/preview.rs)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PreviewType {
    Thumbnail,  // (240, 240), q75
    Standard,   // (1440, 1080), q85
    OneToOne,   // (0, 0) = native, q90
}

impl PreviewType {
    pub fn dimensions(&self) -> (u32, u32) {
        match self {
            PreviewType::Thumbnail => (240, 240),
            PreviewType::Standard => (1440, 1080),
            PreviewType::OneToOne => (0, 0), // Native
        }
    }

    pub fn jpeg_quality(&self) -> u8 {
        match self {
            PreviewType::Thumbnail => 75,
            PreviewType::Standard => 85,
            PreviewType::OneToOne => 90,
        }
    }
}
```

**Verdict** : ✅ Service Rust support complet des 3 formats.

---

### 2.3 Model TypeScript CatalogImage (Phase 2.4+ — ❌ **Incomplete**)

**Fichier** : [src/types/image.ts](src/types/image.ts)

```typescript
export interface CatalogImage {
  id: number;
  hash: string;
  filename: string;
  url: string; // ← ❌ UN SEUL URL (toujours Thumbnail)
  capturedAt: string;
  exif: ExifData;
  state: ImageState;
  sizeOnDisk: string;
}
```

**Verdict** : ❌ **Critique** — Pas de support pour les 3 formats.

- `url: string` ne peut contenir qu'UN SEUL format
- Les composants n'ont aucun moyen de savoir quel type de preview est chargé
- Impossible de charger/basculer entre Thumbnail/Standard/OneToOne

**Ce qui aurait dû exister** :

```typescript
export interface CatalogImage {
  id: number;
  hash: string;
  filename: string;

  // MANQUANT: URLs pour tous les formats
  urls: {
    thumbnail: string; // 240px, q75
    standard: string; // 1440px, q85
    oneToOne?: string; // Résolution native, q90
  };

  // OU (alternative)
  previewUrls: Map<PreviewType, string>;

  capturedAt: string;
  exif: ExifData;
  state: ImageState;
  sizeOnDisk: string;
}
```

---

## 3. Points d'Implémentation Manqués

### 3.1 Hook `useCatalog` — Phase 2.4

**Fichier** : [src/hooks/useCatalog.ts](src/hooks/useCatalog.ts:75-80)

**Code actuel** :

```typescript
const catalogImages = await Promise.all(
  images.map(async (img: ImageDTO) => {
    let thumbnailUrl = '';
    try {
      const preview = await previewService.getPreviewPath(
        img.blake3_hash,
        PreviewType.Thumbnail,  // ← ❌ HARDCODED: Toujours Thumbnail
      );
      // ... conversion asset://
      thumbnailUrl = assetUrl;
    }
    // ...
    return {
      id: img.id,
      hash: img.blake3_hash,
      filename: img.filename,
      url: thumbnailUrl,  // ← ❌ Assigné au seul champ `url`
      // ...
    };
  }),
);
```

**Verdict** : ❌ **Majeure** — Charge UNIQUEMENT Thumbnail, ignore Standard et OneToOne.

**Ce qui aurait dû être fait** :

```typescript
// Phase 2.4: Charger les 3 formats de previews pour chaque image
const catalogImages = await Promise.all(
  images.map(async (img: ImageDTO) => {
    // Charger les 3 formats EN PARALLELE
    const [thumbnailPath, standardPath, oneToOnePath] = await Promise.all([
      previewService.getPreviewPath(img.blake3_hash, PreviewType.Thumbnail),
      previewService.getPreviewPath(img.blake3_hash, PreviewType.Standard),
      previewService.getPreviewPath(img.blake3_hash, PreviewType.OneToOne),
    ]);

    return {
      id: img.id,
      hash: img.blake3_hash,
      filename: img.filename,

      // ✅ URLs MULTIPLES par type de preview
      urls: {
        thumbnail: convertFileSrc(thumbnailPath),
        standard: convertFileSrc(standardPath),
        oneToOne: convertFileSrc(oneToOnePath),
      },

      // ... reste inchangé
    };
  }),
);
```

**Dépendances** :

- Phase 2.3 (génération de previews) — ✅ Complétée
- CatalogImage type doit être mis à jour d'abord

---

### 3.2 Composant `GridView` — Phase 2.4

**Fichier** : [src/components/library/GridView.tsx](src/components/library/GridView.tsx:1-130)

**Code actuel** :

```tsx
export const GridView = ({ images, ... }: GridViewProps) => {
  // ...
  {cells.map((img) => (
    <LazyLoadedImageCard
      key={img.id}
      image={img}  // ← img.url est toujours Thumbnail
      // ...
    />
  ))}
};
```

**Issue** : ❌ Transmet simplement `CatalogImage` (avec `url` = Thumbnail) sans option de sélection de format.

**Ce qui aurait dû être fait** :

```tsx
export const GridView = ({ images, ... }: GridViewProps) => {
  // ✅ Composant SAIT qu'il utilise des Thumbnails
  const PREVIEW_TYPE_FOR_GRID = PreviewType.Thumbnail;

  return (
    // ...
    {cells.map((img) => (
      <LazyLoadedImageCard
        key={img.id}
        image={img}
        previewType={PREVIEW_TYPE_FOR_GRID}  // ← Explicite
        previewUrl={img.urls.thumbnail}      // ← Utilise bon format
        // ...
      />
    ))}
  );
};
```

---

### 3.3 Composant `DevelopView` — Phase 4.2+

**Fichier** : [src/components/develop/DevelopView.tsx](src/components/develop/DevelopView.tsx#L1-30)

**Code actuel** :

```tsx
export const DevelopView = ({ activeImg, showBeforeAfter }: DevelopViewProps) => (
  <div>
    {showBeforeAfter && (
      <PreviewRenderer
        imageId={activeImg.id}
        previewUrl={activeImg.url} // ← ❌ Toujours Thumbnail (240px)
        className="... w-full h-full ..."
        isSelected={false}
      />
    )}
    <PreviewRenderer
      imageId={activeImg.id}
      previewUrl={activeImg.url} // ← ❌ Même 240px pour "Après"
      className="... w-full h-full ..."
      isSelected={true}
    />
  </div>
);
```

**Problem** :

- Affiche une preview **240px dans un écran haute résolution** (dégradation qualité)
- Devrait utiliser **Standard (1440px)** au lieu de Thumbnail (240px)

**Ce qui aurait dû être fait** :

```tsx
export const DevelopView = ({ activeImg, showBeforeAfter }: DevelopViewProps) => {
  // ✅ DevelopView SAIT qu'il utilise Standard previews
  const PREVIEW_TYPE_FOR_DEVELOP = PreviewType.Standard;

  return (
    <div>
      {showBeforeAfter && (
        <PreviewRenderer
          imageId={activeImg.id}
          previewUrl={activeImg.urls.standard} // ← 1440px au lieu de 240px
          previewType={PREVIEW_TYPE_FOR_DEVELOP} // ← Explicite
          className="... w-full h-full ..."
          isSelected={false}
        />
      )}
      <PreviewRenderer
        imageId={activeImg.id}
        previewUrl={activeImg.urls.standard} // ← 1440px
        previewType={PREVIEW_TYPE_FOR_DEVELOP} // ← Explicite
        className="... w-full h-full ..."
        isSelected={true}
      />
    </div>
  );
};
```

**Impact** :
-DevelopView obtient 6x meilleure résolution (1440px vs 240px)

- Rendu beaucoup plus net et détaillé
- Cohérent avec la hiérarchie Phase 2.3

---

### 3.4 Composant `LazyLoadedImageCard` — Phase 2.4

**Fichier** : [src/components/library/LazyLoadedImageCard.tsx](src/components/library/LazyLoadedImageCard.tsx#L1-50)

**Code actuel** :

```tsx
interface LazyLoadedImageCardProps {
  image: CatalogImage;
  isSelected: boolean;
  // ...
}

export const LazyLoadedImageCard = ({ image, ... }: LazyLoadedImageCardProps) => {
  const hasPreview = isVisible && image.url && image.url.length > 0;
  // ...
  <PreviewRenderer
    imageId={image.id}
    previewUrl={image.url}  // ← ❌ Toujours Thumbnail, pas d'option
    // ...
  />
};
```

**Verdict** : ❌ **Mineure** — Pas conscient du type de preview utilisé.

**Ce qui aurait dû être fait** :

```tsx
interface LazyLoadedImageCardProps {
  image: CatalogImage;
  previewType?: PreviewType;  // ← Nouveau paramètre optionnel
  previewUrl?: string;         // ← Nouveau paramètre explicite
  isSelected: boolean;
  // ...
}

export const LazyLoadedImageCard = ({
  image,
  previewType = PreviewType.Thumbnail,  // Défaut Thumbnail
  previewUrl = image.urls.thumbnail,     // Utilise le bon URL
  ...
}: LazyLoadedImageCardProps) => {
  const hasPreview = isVisible && previewUrl && previewUrl.length > 0;
  // ...
  <PreviewRenderer
    imageId={image.id}
    previewUrl={previewUrl}
    previewType={previewType}  // ← Passe le type
    // ...
  />
};
```

---

### 3.5 Composant `PreviewRenderer` — Phase 4.2

**Fichier** : [src/components/library/PreviewRenderer.tsx](src/components/library/PreviewRenderer.tsx#L1-50)

**Code actuel** :

```tsx
interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean;
  // ← Aucune info sur le type de preview utilisé
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  imageId,
  previewUrl, // ← Reçoit URL sans contexte
  className = '',
  isSelected = false,
  useWasm = true,
}) => {
  // ... composant ne sait pas si c'est Thumbnail/Standard/OneToOne
};
```

**Verdict** : ❌ **Mineure** — Pas conscient du type, mais pas bloquant si caller le sait.

**Ce qui aurait dû être fait** :

```tsx
interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  previewType: PreviewType; // ← Nouveau paramètre
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean;
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  imageId,
  previewUrl,
  previewType, // ← Reçoit info sur type
  className = '',
  isSelected = false,
  useWasm = true,
}) => {
  // Peut optimiser rendu en fonction du type:
  // - Thumbnail: optimé pour petit cache, refresh rapide
  // - Standard: optimé pour qualité moyenne
  // - OneToOne: pixel-perfect, pas de scaling

  // Option 1: Adapter className en fonction du type
  const adaptedClassName = `
    ${className}
    ${previewType === PreviewType.Thumbnail ? 'preview-thumbnail' : ''}
    ${previewType === PreviewType.Standard ? 'preview-standard' : ''}
    ${previewType === PreviewType.OneToOne ? 'preview-one-to-one' : ''}
  `;

  // Option 2: Logs distincts par type
  if (import.meta.env.DEV) {
    console.warn(`[PreviewRenderer] Rendering ${previewType} for imageId=${imageId}`);
  }
};
```

---

## 4. Architecture Correcte (Récapitulatif)

### 4.1 Flux Correct

```
1. Backend (Rust)
   ├─ Phase 2.3: Génère 3 formats pour chaque image ✅
   │  ├─ Thumbnail (240px, q75)
   │  ├─ Standard (1440px, q85)
   │  └─ OneToOne (native, q90)
   │
   └─ Commandes Tauri: get_preview_path(hash, preview_type) ✅

2. Frontend Hook (useCatalog) — ❌ MANQUANT
   ├─ Pour chaque image, charger les 3 formats EN PARALLELE
   ├─ Retourner CatalogImage avec urls.thumbnail/standard/oneToOne
   │
   └─ Dépend de CatalogImage type update

3. Frontend Components
   ├─ GridView
   │  └─ Utilise PreviewType.Thumbnail (240px)
   │
   ├─ DevelopView (showBeforeAfter=true)
   │  └─ Utilise PreviewType.Standard (1440px)
   │
   ├─ Zoom 1:1 View (futur)
   │  └─ Utilise PreviewType.OneToOne (native)
   │
   └─ LazyLoadedImageCard + PreviewRenderer
      └─ Reçoivent previewType + previewUrl du parent
```

### 4.2 Types Corrects

```typescript
// src/types/image.ts — MISE à JOUR
export interface CatalogImage {
  id: number;
  hash: string;
  filename: string;

  // ✅ Support pour 3 formats de previews
  urls: {
    thumbnail: string; // 240px, q75 | obligatoire
    standard: string; // 1440px, q85 | obligatoire
    oneToOne?: string; // Résolution native, q90 | optionnel
  };

  capturedAt: string;
  exif: ExifData;
  state: ImageState;
  sizeOnDisk: string;
}

// Compatibilité backward (helper property)
export interface CatalogImage {
  get url(): string;
  // ✅ Code existant qui utilise image.url continue de fonctionner (fallback)
}
```

---

## 5. Checklist de Conformité Phase 2.3 vs Réalité

### Brief Phase 2.3

| Critère                                             | Demande | Réalité                | Status |
| --------------------------------------------------- | ------- | ---------------------- | ------ |
| Génération Thumbnails (240px, q75)                  | Oui     | ✅ Implémenté          | ✅     |
| Génération Standard (1440px, q85)                   | Oui     | ✅ Implémenté          | ✅     |
| Génération OneToOne (native, q90)                   | Oui     | ✅ Implémenté          | ✅     |
| Cache structuré BLAKE3                              | Oui     | ✅ Implémenté          | ✅     |
| Types TypeScript PreviewType                        | Oui     | ✅ Implémenté          | ✅     |
| Service Rust avec support 3 formats                 | Oui     | ✅ Implémenté          | ✅     |
| Commandes Tauri (get_preview_path)                  | Oui     | ✅ Implémenté          | ✅     |
| API : CatalogImage avec 3 URLs                      | **Oui** | ❌ Seul `url: string`  | ❌     |
| Integration Frontend : GridView utilise Thumbnail   | **Oui** | ❌ Hardcoded           | ❌     |
| Integration Frontend : DevelopView utilise Standard | **Oui** | ❌ Hardcoded Thumbnail | ❌     |
| Tests : Preview type selection                      | **Oui** | ❌ Pas de tests        | ❌     |

**Verdict** : Phase 2.3 est ✅ **50% complète** (backend ok, frontend lacunaire).

---

## 6. Recommandations de Correction

### Ordre de Priorité

| \#  | Phase                                     | Criticité   | Description                                          |
| --- | ----------------------------------------- | ----------- | ---------------------------------------------------- |
| 1   | **MAINTENANCE-PREVIEW-TYPE-SELECTION**    | 🔴 Cririque | Mettre à jour `CatalogImage.urls` et `useCatalog.ts` |
| 2   | **MAINTENANCE-GRIDVIEW-PREVIEW-TYPES**    | 🟠 Majeure  | Passer `PreviewType.Thumbnail` à GridView            |
| 3   | **MAINTENANCE-DEVELOPVIEW-PREVIEW-TYPES** | 🟠 Majeure  | Utiliser `PreviewType.Standard` dans DevelopView     |
| 4   | **MAINTENANCE-PREVIEW-RENDERER-TYPES**    | 🟡 Mineure  | Ajouter paramètre `previewType` à PreviewRenderer    |
| 5   | **MAINTENANCE-PREVIEW-TYPE-TESTS**        | 🟡 Mineure  | Tests pour sélection du type correct par vue         |

### A Créer

**Fichier** : `Docs/briefs/MAINTENANCE-PREVIEW-TYPE-SELECTION.md`

```yaml
Title: Implémentation de la Sélection de Type de Preview par Vue d'Affichage
Phases Bloquantes:
  - PHASE-2.3 ✅
  - PHASE-2.4 (partielle) ⚠️
Criticité: 🔴 Critique
Files à modifier:
  - src/types/image.ts (CatalogImage interface)
  - src/hooks/useCatalog.ts (charger 3 formats)
  - src/components/library/GridView.tsx (pas de changement conceptuel)
  - src/components/develop/DevelopView.tsx (utiliser Standard)
  - src/components/library/LazyLoadedImageCard.tsx (accepter previewType)
  - src/components/library/PreviewRenderer.tsx (accepter previewType)
  - Tests: src/components/__tests__/PreviewTypeSelection.test.tsx (nouveau)
```

---

## 7. Résumé des Lacunes

| Composant               | Fichier                                          | Lacune                                                              | Impact                               |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------ |
| **CatalogImage**        | `src/types/image.ts`                             | `url: string` ❌ au lieu de `urls: {thumbnail, standard, oneToOne}` | Impossible de charger 3 formats      |
| **useCatalog**          | `src/hooks/useCatalog.ts`                        | Charge UNIQUEMENT Thumbnail ❌                                      | Standard/OneToOne jamais disponibles |
| **GridView**            | `src/components/library/GridView.tsx`            | Pas conscient du type utilisé                                       | Incision mineure                     |
| **DevelopView**         | `src/components/develop/DevelopView.tsx`         | Utilise Thumbnail (240px) au lieu de Standard (1440px)              | Dégradation qualité                  |
| **LazyLoadedImageCard** | `src/components/library/LazyLoadedImageCard.tsx` | Pas de paramètre `previewType`                                      | Incision mineure                     |
| **PreviewRenderer**     | `src/components/library/PreviewRenderer.tsx`     | Pas conscience du type                                              | Possible amélioration, pas bloquant  |

---

## Conclusion

Le brief **Phase 2.3** déclare une hiérarchie pyramidale de 3 formats de previews, mais l'intégration frontend n'a jamais été complétée. Le code implémente UNIQUEMENT les Thumbnails, ce qui :

✅ **Fonctionne** pour GridView (cas d'usage prévu)
❌ **Dégénère** pour DevelopView (affiche 240px instead of 1440px)
❌ **Bloque** tout zoom 1:1 ou sélection dynamique de format

**Action requise** : Créer une phase de maintenance pour compléter l'intégration frontend et permettre aux composants de sélectionner le bon format selon leur contexte d'affichage.
