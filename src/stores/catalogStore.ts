import { create } from 'zustand';
import type { CatalogImage } from '../types';

interface CatalogStore {
  // État
  images: CatalogImage[];
  selection: Set<number>;
  filterText: string;
  activeImageId: number | null;
  
  // Actions
  setImages: (images: CatalogImage[]) => void;
  addImages: (images: CatalogImage[]) => void;
  toggleSelection: (id: number, isMultiSelect?: boolean) => void;
  setSingleSelection: (id: number) => void;
  clearSelection: () => void;
  setFilterText: (text: string) => void;
  setActiveImage: (id: number | null) => void;
  
  // Getters
  getSelectedImages: () => CatalogImage[];
  getActiveImage: () => CatalogImage | null;
  getSelectionArray: () => number[];
  getFilteredImages: () => CatalogImage[];
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  // État initial
  images: [],
  selection: new Set(),
  filterText: '',
  activeImageId: null,
  
  // Actions
  setImages: (images: CatalogImage[]) => set({ images }),
  
  addImages: (newImages: CatalogImage[]) => set((state) => ({
    images: [...newImages, ...state.images]
  })),
  
  toggleSelection: (id: number, isMultiSelect = false) => set((state) => {
    if (!isMultiSelect) {
      return { selection: new Set([id]) };
    }
    
    const newSelection = new Set(state.selection);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    return { selection: newSelection };
  }),
  
  setSingleSelection: (id: number) => set({ selection: new Set([id]) }),
  
  clearSelection: () => set({ selection: new Set() }),
  
  setFilterText: (text: string) => set({ filterText: text }),
  
  setActiveImage: (id: number | null) => set({ activeImageId: id }),
  
  // Getters
  getSelectedImages: () => {
    const { images, selection } = get();
    return images.filter(img => selection.has(img.id));
  },
  
  getActiveImage: () => {
    const { images, activeImageId } = get();
    if (!activeImageId) return null;
    return images.find(img => img.id === activeImageId) ?? null;
  },
  
  getSelectionArray: () => {
    return Array.from(get().selection);
  },
  
  getFilteredImages: () => {
    const { images, filterText } = get();
    if (!filterText) return images;
    
    const q = filterText.toLowerCase();
    return images.filter(img => {
      if (q.startsWith('star')) return img.state.rating >= parseInt(q.split(' ')[1] ?? '0');
      if (q.includes('gfx')) return img.exif.camera.toLowerCase().includes('gfx');
      if (q.includes('iso')) {
        const val = parseInt(q.replace(/[^0-9]/g, ''));
        return img.exif.iso >= val;
      }
      return (
        img.filename.toLowerCase().includes(q) || 
        img.exif.lens.toLowerCase().includes(q) ||
        img.state.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }
}));
