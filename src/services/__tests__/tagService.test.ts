import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagService } from '@/services/tagService';

const mockTauriInvoke = vi.fn();

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: { invoke: mockTauriInvoke },
  writable: true,
});

describe('TagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTag', () => {
    it('invokes create_tag without parentId', async () => {
      const dto = { id: 1, name: 'Lieu', parentId: null, imageCount: 0 };
      mockTauriInvoke.mockResolvedValue(dto);

      const result = await TagService.createTag('Lieu');

      expect(mockTauriInvoke).toHaveBeenCalledWith('create_tag', { name: 'Lieu', parentId: null });
      expect(result).toEqual(dto);
    });

    it('invokes create_tag with parentId', async () => {
      const dto = { id: 2, name: 'France', parentId: 1, imageCount: 0 };
      mockTauriInvoke.mockResolvedValue(dto);

      const result = await TagService.createTag('France', 1);

      expect(mockTauriInvoke).toHaveBeenCalledWith('create_tag', { name: 'France', parentId: 1 });
      expect(result).toEqual(dto);
    });

    it('propagates Tauri errors', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('already exists'));

      await expect(TagService.createTag('Lieu')).rejects.toThrow('already exists');
    });
  });

  describe('getAllTags', () => {
    it('invokes get_all_tags and returns list', async () => {
      const tags = [
        { id: 1, name: 'Lieu', parentId: null, imageCount: 3 },
        { id: 2, name: 'France', parentId: 1, imageCount: 2 },
      ];
      mockTauriInvoke.mockResolvedValue(tags);

      const result = await TagService.getAllTags();

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_all_tags');
      expect(result).toEqual(tags);
    });

    it('returns empty array when no tags', async () => {
      mockTauriInvoke.mockResolvedValue([]);
      expect(await TagService.getAllTags()).toEqual([]);
    });
  });

  describe('renameTag', () => {
    it('invokes rename_tag with id and newName', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await TagService.renameTag(1, 'Lieux');

      expect(mockTauriInvoke).toHaveBeenCalledWith('rename_tag', { id: 1, newName: 'Lieux' });
    });
  });

  describe('deleteTag', () => {
    it('invokes delete_tag with id', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await TagService.deleteTag(1);

      expect(mockTauriInvoke).toHaveBeenCalledWith('delete_tag', { id: 1 });
    });
  });

  describe('addTagsToImages', () => {
    it('invokes add_tags_to_images with imageIds and tagIds', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await TagService.addTagsToImages([10, 20], [1, 2]);

      expect(mockTauriInvoke).toHaveBeenCalledWith('add_tags_to_images', {
        imageIds: [10, 20],
        tagIds: [1, 2],
      });
    });
  });

  describe('removeTagsFromImages', () => {
    it('invokes remove_tags_from_images with imageIds and tagIds', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await TagService.removeTagsFromImages([10], [1]);

      expect(mockTauriInvoke).toHaveBeenCalledWith('remove_tags_from_images', {
        imageIds: [10],
        tagIds: [1],
      });
    });
  });

  describe('getImageTags', () => {
    it('invokes get_image_tags with imageId', async () => {
      const tags = [{ id: 1, name: 'Voyage', parentId: null, imageCount: 5 }];
      mockTauriInvoke.mockResolvedValue(tags);

      const result = await TagService.getImageTags(42);

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_image_tags', { imageId: 42 });
      expect(result).toEqual(tags);
    });

    it('returns empty array when image has no tags', async () => {
      mockTauriInvoke.mockResolvedValue([]);
      expect(await TagService.getImageTags(99)).toEqual([]);
    });
  });
});
