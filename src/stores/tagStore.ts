import { create } from 'zustand';
import type { TagDTO, TagNode } from '@/types/tag';
import { TagService } from '@/services/tagService';

/** Construit l'arbre hiérarchique depuis la liste plate de TagDTO */
function buildTree(flat: TagDTO[]): TagNode[] {
  const map = new Map<number, TagNode>();
  flat.forEach((t) => map.set(t.id, { ...t, children: [] }));

  const roots: TagNode[] = [];
  map.forEach((node) => {
    if (node.parentId == null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent introuvable → attacher à la racine
        roots.push(node);
      }
    }
  });

  return roots;
}

/** Aplatit un arbre de TagNode en liste (pour l'auto-complétion) */
function flattenTree(nodes: TagNode[]): TagNode[] {
  const result: TagNode[] = [];
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    result.push(node);
    stack.push(...node.children);
  }
  return result;
}

interface TagStore {
  // État
  tags: TagNode[];
  /** Liste aplatie pour l'auto-complétion */
  flatTags: TagNode[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTags: () => Promise<void>;
  createTag: (name: string, parentId?: number) => Promise<TagNode>;
  renameTag: (id: number, newName: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  addTagsToImages: (imageIds: number[], tagIds: number[]) => Promise<void>;
  removeTagsFromImages: (imageIds: number[], tagIds: number[]) => Promise<void>;
  /** Retourne les tags associés à une image depuis la liste plate en mémoire */
  getTagsForImage: (imageTags: TagDTO[]) => TagNode[];
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  flatTags: [],
  isLoading: false,
  error: null,

  loadTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const flat = await TagService.getAllTags();
      const tree = buildTree(flat);
      set({ tags: tree, flatTags: flattenTree(tree), isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des tags';
      set({ error: message, isLoading: false });
    }
  },

  createTag: async (name: string, parentId?: number) => {
    const dto = await TagService.createTag(name, parentId);
    const newNode: TagNode = { ...dto, children: [] };
    // Recharger l'arbre complet pour obtenir les comptages à jour
    await get().loadTags();
    // Retrouver le nœud créé dans la liste aplatie
    const found = get().flatTags.find((t) => t.id === newNode.id);
    return found ?? newNode;
  },

  renameTag: async (id: number, newName: string) => {
    await TagService.renameTag(id, newName);
    set((state) => {
      // Mise à jour optimiste dans l'arbre
      const updateName = (nodes: TagNode[]): TagNode[] =>
        nodes.map((n) =>
          n.id === id ? { ...n, name: newName } : { ...n, children: updateName(n.children) },
        );
      const updated = updateName(state.tags);
      return { tags: updated, flatTags: flattenTree(updated) };
    });
  },

  deleteTag: async (id: number) => {
    await TagService.deleteTag(id);
    // Recharger pour refléter la suppression en cascade
    await get().loadTags();
  },

  addTagsToImages: async (imageIds: number[], tagIds: number[]) => {
    await TagService.addTagsToImages(imageIds, tagIds);
    // Recharger pour mettre à jour les comptages
    await get().loadTags();
  },

  removeTagsFromImages: async (imageIds: number[], tagIds: number[]) => {
    await TagService.removeTagsFromImages(imageIds, tagIds);
    await get().loadTags();
  },

  getTagsForImage: (imageTags: TagDTO[]) => {
    const { flatTags } = get();
    return imageTags
      .map((t) => flatTags.find((ft) => ft.id === t.id))
      .filter((t): t is TagNode => t != null);
  },
}));
