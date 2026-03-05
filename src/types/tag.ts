// Types pour le système de tags hiérarchiques — Phase 5.2

/** DTO retourné par le backend Rust pour un tag */
export interface TagDTO {
  id: number;
  name: string;
  parentId: number | null;
  imageCount: number;
}

/** Nœud d'arbre hiérarchique (construit en mémoire depuis la liste plate) */
export interface TagNode extends TagDTO {
  children: TagNode[];
}

/** Payload pour créer un tag */
export interface CreateTagPayload {
  name: string;
  parentId?: number;
}
