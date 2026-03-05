import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useTagStore } from '../tagStore';
import { TagService } from '@/services/tagService';

vi.mock('@/services/tagService');

describe('tagStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useTagStore.setState({ tags: [], flatTags: [], isLoading: false, error: null });
    });
  });

  // ── buildTree / flattenTree (via loadTags) ──────────────────────────────────

  describe('loadTags', () => {
    it('builds hierarchical tree from flat list', async () => {
      vi.mocked(TagService.getAllTags).mockResolvedValue([
        { id: 1, name: 'Lieu', parentId: null, imageCount: 0 },
        { id: 2, name: 'France', parentId: 1, imageCount: 0 },
        { id: 3, name: 'Paris', parentId: 2, imageCount: 0 },
      ]);

      await act(async () => {
        await useTagStore.getState().loadTags();
      });

      const { tags, flatTags } = useTagStore.getState();
      expect(tags).toHaveLength(1);
      const lieu = tags[0]!;
      expect(lieu.name).toBe('Lieu');
      expect(lieu.children).toHaveLength(1);
      const france = lieu.children[0]!;
      expect(france.name).toBe('France');
      const paris = france.children[0]!;
      expect(paris.name).toBe('Paris');
      expect(flatTags).toHaveLength(3);
    });

    it('attaches orphan nodes to root', async () => {
      vi.mocked(TagService.getAllTags).mockResolvedValue([
        { id: 10, name: 'Orphan', parentId: 999, imageCount: 0 },
      ]);

      await act(async () => {
        await useTagStore.getState().loadTags();
      });

      const { tags } = useTagStore.getState();
      expect(tags).toHaveLength(1);
      expect(tags[0]!.name).toBe('Orphan');
    });

    it('sets error on failure', async () => {
      vi.mocked(TagService.getAllTags).mockRejectedValue(new Error('DB error'));

      await act(async () => {
        await useTagStore.getState().loadTags();
      });

      expect(useTagStore.getState().error).toBe('DB error');
      expect(useTagStore.getState().isLoading).toBe(false);
    });
  });

  // ── createTag ───────────────────────────────────────────────────────────────

  describe('createTag', () => {
    it('calls TagService.createTag then reloads tags', async () => {
      const dto = { id: 5, name: 'Voyage', parentId: null, imageCount: 0 };
      vi.mocked(TagService.createTag).mockResolvedValue(dto);
      // loadTags is called by createTag — mock it to set state directly
      vi.mocked(TagService.getAllTags).mockResolvedValue([dto]);

      await act(async () => {
        await useTagStore.getState().createTag('Voyage');
      });

      expect(TagService.createTag).toHaveBeenCalledWith('Voyage', undefined);
      // loadTags was called inside createTag, tags should have been updated
      const { flatTags } = useTagStore.getState();
      expect(flatTags.some((t) => t.name === 'Voyage')).toBe(true);
    });
  });

  // ── renameTag (optimistic update) ───────────────────────────────────────────

  describe('renameTag', () => {
    it('renames a root tag optimistically', async () => {
      vi.mocked(TagService.getAllTags).mockResolvedValue([
        { id: 1, name: 'Lieu', parentId: null, imageCount: 0 },
      ]);
      vi.mocked(TagService.renameTag).mockResolvedValue(undefined);

      await act(async () => {
        await useTagStore.getState().loadTags();
        await useTagStore.getState().renameTag(1, 'Lieux');
      });

      const { flatTags } = useTagStore.getState();
      expect(flatTags.find((t) => t.id === 1)?.name).toBe('Lieux');
    });
  });

  // ── deleteTag ───────────────────────────────────────────────────────────────

  describe('deleteTag', () => {
    it('calls TagService.deleteTag then reloads tags', async () => {
      vi.mocked(TagService.getAllTags)
        .mockResolvedValueOnce([
          { id: 1, name: 'Voyage', parentId: null, imageCount: 0 },
          { id: 2, name: 'Paris', parentId: 1, imageCount: 0 },
        ])
        // Second call after deleteTag: both nodes are gone
        .mockResolvedValueOnce([]);
      vi.mocked(TagService.deleteTag).mockResolvedValue(undefined);

      await act(async () => {
        await useTagStore.getState().loadTags();
      });
      expect(useTagStore.getState().flatTags).toHaveLength(2);

      await act(async () => {
        await useTagStore.getState().deleteTag(1);
      });

      expect(TagService.deleteTag).toHaveBeenCalledWith(1);
      expect(useTagStore.getState().flatTags).toHaveLength(0);
    });
  });

  // ── getTagsForImage ─────────────────────────────────────────────────────────

  describe('getTagsForImage', () => {
    it('returns matching nodes from flatTags', async () => {
      vi.mocked(TagService.getAllTags).mockResolvedValue([
        { id: 1, name: 'Voyage', parentId: null, imageCount: 0 },
        { id: 2, name: 'Paris', parentId: 1, imageCount: 0 },
      ]);

      await act(async () => {
        await useTagStore.getState().loadTags();
      });

      const imageTags = [{ id: 1, name: 'Voyage', parentId: null, imageCount: 0 }];
      const result = useTagStore.getState().getTagsForImage(imageTags);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Voyage');
    });
  });
});
