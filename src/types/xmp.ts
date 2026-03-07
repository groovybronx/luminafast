// Types pour le sidecar XMP — Phase 5.4

/** Statut du sidecar XMP pour une image */
export interface XmpStatus {
  /** true si le fichier .xmp existe sur le disque */
  exists: boolean;
  /** Chemin absolu du fichier sidecar (calculé côté Rust) */
  xmpPath: string;
}

/** Résultat d'une importation XMP vers la DB */
export interface XmpImportResult {
  /** Note importée (null si absente dans le XMP) */
  rating: number | null;
  /** Flag importé ("pick" / "reject" / null) */
  flag: string | null;
  /** Nombre de tags importés */
  tagsImported: number;
}
