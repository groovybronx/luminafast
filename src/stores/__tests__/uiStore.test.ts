import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUiStore } from '../uiStore';
import type { ActiveView } from '../../types';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useUiStore.setState({
        activeView: 'library',
        leftSidebarOpen: true,
        rightSidebarOpen: true,
        thumbnailSize: 5,
        rightSidebarTab: 'develop',
        showImport: false,
        showBeforeAfter: false,
      });
    });
  });

  it('should initialize with default state', () => {
    const store = useUiStore.getState();
    expect(store.activeView).toBe('library');
    expect(store.leftSidebarOpen).toBe(true);
    expect(store.rightSidebarOpen).toBe(true);
    expect(store.thumbnailSize).toBe(5);
    expect(store.rightSidebarTab).toBe('develop');
    expect(store.showImport).toBe(false);
    expect(store.showBeforeAfter).toBe(false);
  });

  it('should set active view', () => {
    const store = useUiStore.getState();
    
    act(() => {
      store.setActiveView('develop');
    });
    expect(useUiStore.getState().activeView).toBe('develop');
    
    act(() => {
      store.setActiveView('library');
    });
    expect(useUiStore.getState().activeView).toBe('library');
  });

  it('should toggle left sidebar', () => {
    const store = useUiStore.getState();
    expect(useUiStore.getState().leftSidebarOpen).toBe(true);
    
    act(() => {
      store.toggleLeftSidebar();
    });
    expect(useUiStore.getState().leftSidebarOpen).toBe(false);
    
    act(() => {
      store.toggleLeftSidebar();
    });
    expect(useUiStore.getState().leftSidebarOpen).toBe(true);
  });

  it('should toggle right sidebar', () => {
    const store = useUiStore.getState();
    expect(useUiStore.getState().rightSidebarOpen).toBe(true);
    
    act(() => {
      store.toggleRightSidebar();
    });
    expect(useUiStore.getState().rightSidebarOpen).toBe(false);
    
    act(() => {
      store.toggleRightSidebar();
    });
    expect(useUiStore.getState().rightSidebarOpen).toBe(true);
  });

  it('should set thumbnail size within bounds', () => {
    const store = useUiStore.getState();
    
    // Valid size
    act(() => {
      store.setThumbnailSize(8);
    });
    expect(useUiStore.getState().thumbnailSize).toBe(8);
    
    // Minimum bound
    act(() => {
      store.setThumbnailSize(-5);
    });
    expect(useUiStore.getState().thumbnailSize).toBe(1);
    
    // Maximum bound
    act(() => {
      store.setThumbnailSize(15);
    });
    expect(useUiStore.getState().thumbnailSize).toBe(10);
    
    // Edge cases
    act(() => {
      store.setThumbnailSize(0);
    });
    expect(useUiStore.getState().thumbnailSize).toBe(1);
    
    act(() => {
      store.setThumbnailSize(10);
    });
    expect(useUiStore.getState().thumbnailSize).toBe(10);
  });

  it('should set right sidebar tab', () => {
    const store = useUiStore.getState();
    expect(useUiStore.getState().rightSidebarTab).toBe('develop');
    
    act(() => {
      store.setRightSidebarTab('metadata');
    });
    expect(useUiStore.getState().rightSidebarTab).toBe('metadata');
    
    act(() => {
      store.setRightSidebarTab('history');
    });
    expect(useUiStore.getState().rightSidebarTab).toBe('history');
    
    act(() => {
      store.setRightSidebarTab('develop');
    });
    expect(useUiStore.getState().rightSidebarTab).toBe('develop');
  });

  it('should show and hide import modal', () => {
    const store = useUiStore.getState();
    expect(useUiStore.getState().showImport).toBe(false);
    
    act(() => {
      store.setShowImport(true);
    });
    expect(useUiStore.getState().showImport).toBe(true);
    
    act(() => {
      store.setShowImport(false);
    });
    expect(useUiStore.getState().showImport).toBe(false);
  });

  it('should toggle before/after mode', () => {
    const store = useUiStore.getState();
    expect(useUiStore.getState().showBeforeAfter).toBe(false);
    
    act(() => {
      store.toggleBeforeAfter();
    });
    expect(useUiStore.getState().showBeforeAfter).toBe(true);
    
    act(() => {
      store.toggleBeforeAfter();
    });
    expect(useUiStore.getState().showBeforeAfter).toBe(false);
  });

  it('should handle multiple state changes', () => {
    const store = useUiStore.getState();
    
    // Change multiple properties
    act(() => {
      store.setActiveView('develop');
      store.setThumbnailSize(8);
      store.setRightSidebarTab('metadata');
      store.setShowImport(true);
      store.toggleBeforeAfter();
    });
    
    expect(useUiStore.getState().activeView).toBe('develop');
    expect(useUiStore.getState().thumbnailSize).toBe(8);
    expect(useUiStore.getState().rightSidebarTab).toBe('metadata');
    expect(useUiStore.getState().showImport).toBe(true);
    expect(useUiStore.getState().showBeforeAfter).toBe(true);
    
    // Original values should remain unchanged
    expect(useUiStore.getState().leftSidebarOpen).toBe(true);
    expect(useUiStore.getState().rightSidebarOpen).toBe(true);
  });
});
