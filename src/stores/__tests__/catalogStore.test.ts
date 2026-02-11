import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useCatalogStore } from '../catalogStore';
import { INITIAL_IMAGES } from '../../lib/mockData';

describe('catalogStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useCatalogStore.setState({
        images: [],
        selection: new Set(),
        filterText: '',
        activeImageId: null,
      });
    });
  });

  it('should initialize with empty state', () => {
    expect(useCatalogStore.getState().images).toEqual([]);
    expect(useCatalogStore.getState().selection).toEqual(new Set());
    expect(useCatalogStore.getState().filterText).toBe('');
    expect(useCatalogStore.getState().activeImageId).toBeNull();
  });

  it('should set images', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
    });
    
    expect(useCatalogStore.getState().images).toEqual(INITIAL_IMAGES);
    expect(useCatalogStore.getState().images).toHaveLength(60);
  });

  it('should add images to existing ones', () => {
    const firstBatch = INITIAL_IMAGES.slice(0, 10);
    const secondBatch = INITIAL_IMAGES.slice(10, 15);
    
    act(() => {
      useCatalogStore.getState().setImages(firstBatch);
      useCatalogStore.getState().addImages(secondBatch);
    });
    
    const images = useCatalogStore.getState().images;
    expect(images).toHaveLength(15);
    // Verify IDs to confirm correct images were added
    expect(images.slice(0, 10).map(i => i.id)).toEqual(firstBatch.map(i => i.id));
    expect(images.slice(10, 15).map(i => i.id)).toEqual(secondBatch.map(i => i.id));
  });

  it('should toggle selection in multi-select mode', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      
      // Add first image to selection
      useCatalogStore.getState().toggleSelection(1, true);
    });
    expect(useCatalogStore.getState().selection.has(1)).toBe(true);
    expect(useCatalogStore.getState().selection).toHaveLength(1);
    
    act(() => {
      // Add second image to selection
      useCatalogStore.getState().toggleSelection(2, true);
    });
    expect(useCatalogStore.getState().selection.has(2)).toBe(true);
    expect(useCatalogStore.getState().selection).toHaveLength(2);
    
    act(() => {
      // Remove first image from selection
      useCatalogStore.getState().toggleSelection(1, true);
    });
    expect(useCatalogStore.getState().selection.has(1)).toBe(false);
    expect(useCatalogStore.getState().selection.has(2)).toBe(true);
    expect(useCatalogStore.getState().selection).toHaveLength(1);
  });

  it('should set single selection', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().toggleSelection(1, true);
      useCatalogStore.getState().toggleSelection(2, true);
    });
    expect(useCatalogStore.getState().selection).toHaveLength(2);
    
    act(() => {
      useCatalogStore.getState().setSingleSelection(3);
    });
    expect(useCatalogStore.getState().selection).toHaveLength(1);
    expect(useCatalogStore.getState().selection.has(3)).toBe(true);
  });

  it('should replace selection when not multi-select', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().toggleSelection(1, true);
      useCatalogStore.getState().toggleSelection(2, true);
    });
    expect(useCatalogStore.getState().selection).toHaveLength(2);
    
    // Single selection replaces previous
    act(() => {
      useCatalogStore.getState().toggleSelection(3, false);
    });
    expect(useCatalogStore.getState().selection).toHaveLength(1);
    expect(useCatalogStore.getState().selection.has(3)).toBe(true);
  });

  it('should clear selection', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().toggleSelection(1, true);
      useCatalogStore.getState().toggleSelection(2, true);
    });
    expect(useCatalogStore.getState().selection).toHaveLength(2);
    
    act(() => {
      useCatalogStore.getState().clearSelection();
    });
    expect(useCatalogStore.getState().selection).toHaveLength(0);
  });

  it('should set filter text', () => {
    act(() => {
      useCatalogStore.getState().setFilterText('test filter');
    });
    
    expect(useCatalogStore.getState().filterText).toBe('test filter');
  });

  it('should set active image', () => {
    act(() => {
      useCatalogStore.getState().setActiveImage(5);
    });
    
    expect(useCatalogStore.getState().activeImageId).toBe(5);
    
    act(() => {
      useCatalogStore.getState().setActiveImage(null);
    });
    expect(useCatalogStore.getState().activeImageId).toBeNull();
  });

  it('should get selected images', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().toggleSelection(1, true);
      useCatalogStore.getState().toggleSelection(3, true);
    });
    
    const selectedImages = useCatalogStore.getState().getSelectedImages();
    expect(selectedImages).toHaveLength(2);
    expect(selectedImages.find(i => i.id === 1)).toBeDefined();
    expect(selectedImages.find(i => i.id === 3)).toBeDefined();
  });

  it('should get active image', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().setActiveImage(5);
    });
    const activeImage = useCatalogStore.getState().getActiveImage();
    expect(activeImage?.id).toBe(5);
    
    act(() => {
      useCatalogStore.getState().setActiveImage(999);
    });
    const nonExistentImage = useCatalogStore.getState().getActiveImage();
    expect(nonExistentImage).toBeNull();
  });

  it('should get selection as array', () => {
    act(() => {
      useCatalogStore.getState().toggleSelection(1, true);
      useCatalogStore.getState().toggleSelection(3, true);
      useCatalogStore.getState().toggleSelection(5, true);
    });
    
    const selectionArray = useCatalogStore.getState().getSelectionArray();
    expect(selectionArray).toContain(1);
    expect(selectionArray).toContain(3);
    expect(selectionArray).toContain(5);
    expect(selectionArray).toHaveLength(3);
    expect(Array.isArray(selectionArray)).toBe(true);
  });

  it('should filter images by rating', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().setFilterText('star 4');
    });
    
    const filteredImages = useCatalogStore.getState().getFilteredImages();
    expect(filteredImages.every(img => img.state.rating >= 4)).toBe(true);
  });

  it('should filter images by camera model', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().setFilterText('gfx');
    });
    
    const filteredImages = useCatalogStore.getState().getFilteredImages();
    expect(filteredImages.every(img => 
      img.exif.camera.toLowerCase().includes('gfx')
    )).toBe(true);
  });

  it('should filter images by ISO', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().setFilterText('iso 800');
    });
    
    const filteredImages = useCatalogStore.getState().getFilteredImages();
    expect(filteredImages.every(img => img.exif.iso >= 800)).toBe(true);
  });

  it('should filter images by filename', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
      useCatalogStore.getState().setFilterText('img_001');
    });
    
    const filteredImages = useCatalogStore.getState().getFilteredImages();
    expect(filteredImages.every(img => 
      img.filename.toLowerCase().includes('img_001')
    )).toBe(true);
  });

  it('should return all images when no filter', () => {
    act(() => {
      useCatalogStore.getState().setImages(INITIAL_IMAGES);
    });
    
    const filteredImages = useCatalogStore.getState().getFilteredImages();
    expect(filteredImages).toEqual(INITIAL_IMAGES);
  });
});
