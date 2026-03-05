import type { TagDTO } from '@/types/tag';

/**
 * Service pour les opérations sur les tags — Phase 5.2
 * Wraps les commandes Tauri pour la communication frontend↔backend
 */
export class TagService {
  private static getInvoke() {
    if (typeof window !== 'undefined') {
      const tauriWindow = window as unknown as {
        __TAURI__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
        __TAURI_INTERNALS__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      };
      if (tauriWindow.__TAURI__?.invoke) return tauriWindow.__TAURI__.invoke;
      if (tauriWindow.__TAURI_INTERNALS__?.invoke) return tauriWindow.__TAURI_INTERNALS__.invoke;
    }
    throw new Error('Tauri API not available');
  }

  /** Crée un nouveau tag (racine ou enfant) */
  static async createTag(name: string, parentId?: number): Promise<TagDTO> {
    const invoke = this.getInvoke();
    const result = await invoke('create_tag', { name, parentId: parentId ?? null });
    return result as TagDTO;
  }

  /** Charge tous les tags avec leur comptage d'images */
  static async getAllTags(): Promise<TagDTO[]> {
    const invoke = this.getInvoke();
    const result = await invoke('get_all_tags');
    return result as TagDTO[];
  }

  /** Renomme un tag */
  static async renameTag(id: number, newName: string): Promise<void> {
    const invoke = this.getInvoke();
    await invoke('rename_tag', { id, newName });
  }

  /** Supprime un tag et tous ses enfants récursivement */
  static async deleteTag(id: number): Promise<void> {
    const invoke = this.getInvoke();
    await invoke('delete_tag', { id });
  }

  /** Assigne des tags à plusieurs images en batch */
  static async addTagsToImages(imageIds: number[], tagIds: number[]): Promise<void> {
    const invoke = this.getInvoke();
    await invoke('add_tags_to_images', { imageIds, tagIds });
  }

  /** Retire des tags de plusieurs images en batch */
  static async removeTagsFromImages(imageIds: number[], tagIds: number[]): Promise<void> {
    const invoke = this.getInvoke();
    await invoke('remove_tags_from_images', { imageIds, tagIds });
  }

  /** Retourne les tags d'une image spécifique */
  static async getImageTags(imageId: number): Promise<TagDTO[]> {
    const invoke = this.getInvoke();
    const result = await invoke('get_image_tags', { imageId });
    return result as TagDTO[];
  }
}
