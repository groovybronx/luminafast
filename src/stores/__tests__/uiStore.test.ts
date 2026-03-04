import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUiStore } from '../uiStore';

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

  describe('Phase 4.4 - Comparison Mode', () => {
    beforeEach(() => {
      // Reset comparison state
      act(() => {
        useUiStore.setState({
          comparisonMode: 'split',
          splitViewPosition: 50,
          overlayOpacity: 50,
        });
      });
    });

    describe('comparisonMode', () => {
      it('should initialize with split mode', () => {
        const mode = useUiStore.getState().comparisonMode;
        expect(mode).toBe('split');
      });

      it('should set comparison mode to overlay', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setComparisonMode('overlay');
        });

        expect(useUiStore.getState().comparisonMode).toBe('overlay');
      });

      it('should set comparison mode to sideBySide', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setComparisonMode('sideBySide');
        });

        expect(useUiStore.getState().comparisonMode).toBe('sideBySide');
      });

      it('should toggle between all modes', () => {
        const store = useUiStore.getState();

        act(() => {
          store.setComparisonMode('split');
        });
        expect(useUiStore.getState().comparisonMode).toBe('split');

        act(() => {
          store.setComparisonMode('overlay');
        });
        expect(useUiStore.getState().comparisonMode).toBe('overlay');

        act(() => {
          store.setComparisonMode('sideBySide');
        });
        expect(useUiStore.getState().comparisonMode).toBe('sideBySide');
      });
    });

    describe('splitViewPosition', () => {
      it('should initialize with 50 percent', () => {
        expect(useUiStore.getState().splitViewPosition).toBe(50);
      });

      it('should set split position', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setSplitViewPosition(30);
        });

        expect(useUiStore.getState().splitViewPosition).toBe(30);
      });

      it('should clamp position to minimum 0', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setSplitViewPosition(-50);
        });

        expect(useUiStore.getState().splitViewPosition).toBe(0);
      });

      it('should clamp position to maximum 100', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setSplitViewPosition(150);
        });

        expect(useUiStore.getState().splitViewPosition).toBe(100);
      });

      it('should accept valid range positions', () => {
        const store = useUiStore.getState();
        const validPositions = [0, 25, 50, 75, 100];

        validPositions.forEach((pos) => {
          act(() => {
            store.setSplitViewPosition(pos);
          });
          expect(useUiStore.getState().splitViewPosition).toBe(pos);
        });
      });
    });

    describe('overlayOpacity', () => {
      it('should initialize with 50 percent', () => {
        expect(useUiStore.getState().overlayOpacity).toBe(50);
      });

      it('should set overlay opacity', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setOverlayOpacity(75);
        });

        expect(useUiStore.getState().overlayOpacity).toBe(75);
      });

      it('should clamp opacity to minimum 0', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setOverlayOpacity(-25);
        });

        expect(useUiStore.getState().overlayOpacity).toBe(0);
      });

      it('should clamp opacity to maximum 100', () => {
        const store = useUiStore.getState();
        act(() => {
          store.setOverlayOpacity(200);
        });

        expect(useUiStore.getState().overlayOpacity).toBe(100);
      });

      it('should accept valid range opacities', () => {
        const store = useUiStore.getState();
        const validOpacities = [0, 20, 50, 80, 100];

        validOpacities.forEach((opacity) => {
          act(() => {
            store.setOverlayOpacity(opacity);
          });
          expect(useUiStore.getState().overlayOpacity).toBe(opacity);
        });
      });
    });

    describe('state independence', () => {
      it('should not affect other state when changing comparison mode', () => {
        const store = useUiStore.getState();
        const initialPosition = store.splitViewPosition;

        act(() => {
          store.setComparisonMode('overlay');
        });

        expect(useUiStore.getState().splitViewPosition).toBe(initialPosition);
      });

      it('should not affect other state when changing split position', () => {
        const store = useUiStore.getState();
        const initialMode = store.comparisonMode;

        act(() => {
          store.setSplitViewPosition(25);
        });

        expect(useUiStore.getState().comparisonMode).toBe(initialMode);
      });

      it('should allow independent updates to position and opacity', () => {
        const store = useUiStore.getState();

        act(() => {
          store.setSplitViewPosition(30);
          store.setOverlayOpacity(70);
        });

        expect(useUiStore.getState().splitViewPosition).toBe(30);
        expect(useUiStore.getState().overlayOpacity).toBe(70);
      });
    });
  });
});
