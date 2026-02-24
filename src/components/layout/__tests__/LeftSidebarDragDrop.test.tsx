import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { LeftSidebar } from '../LeftSidebar';
import * as collectionStore from '../../../stores/collectionStore';
import * as folderStore from '../../../stores/folderStore';

/**
 * Tests for drag & drop functionality in LeftSidebar (drop target)
 * Phase 3.2b: Accepting image drops on collections
 */

vi.mock('../../../stores/collectionStore');
vi.mock('../../../stores/folderStore');

// Mock DataTransfer for drag & drop tests
class MockDataTransfer {
  data: Map<string, string> = new Map();
  dropEffect = '';
  effectAllowed = '';

  getData(format: string): string {
    return this.data.get(format) || '';
  }

  setData(format: string, value: string): void {
    this.data.set(format, value);
  }

  clearData(): void {
    this.data.clear();
  }
}

describe('LeftSidebar Drag & Drop (Target)', () => {
  const mockCollections = [
    {
      id: 1,
      name: 'Voyage Maroc',
      collection_type: 'static' as const,
      parent_id: null,
      image_count: 5,
      smart_query: null,
    },
  ];

  const mockAddImagesToCollection = vi.fn();
  const mockLoadCollections = vi.fn();
  const mockDeleteCollection = vi.fn();
  const mockRenameCollection = vi.fn();
  const mockSetActiveCollection = vi.fn();
  const mockClearActiveCollection = vi.fn();
  const mockCreateCollection = vi.fn();
  const mockCreateSmartCollection = vi.fn();

  const mockFolderStore = {
    folderTree: [],
    loadFolderTree: vi.fn(),
    setActiveFolder: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(collectionStore, 'useCollectionStore').mockReturnValue({
      collections: mockCollections,
      activeCollectionId: null,
      activeCollectionImageIds: null,
      isLoading: false,
      error: null,
      loadCollections: mockLoadCollections,
      createCollection: mockCreateCollection,
      createSmartCollection: mockCreateSmartCollection,
      deleteCollection: mockDeleteCollection,
      renameCollection: mockRenameCollection,
      updateSmartCollection: vi.fn(),
      addImagesToCollection: mockAddImagesToCollection,
      removeImagesFromCollection: vi.fn(),
      setActiveCollection: mockSetActiveCollection,
      clearActiveCollection: mockClearActiveCollection,
    } as unknown as ReturnType<typeof collectionStore.useCollectionStore>);

    vi.spyOn(folderStore, 'useFolderStore').mockReturnValue(
      mockFolderStore as unknown as ReturnType<typeof folderStore.useFolderStore>,
    );

    mockLoadCollections.mockResolvedValue(undefined);
    mockAddImagesToCollection.mockResolvedValue(undefined);
  });

  it('should accept drop on collection', async () => {
    render(
      <LeftSidebar
        sidebarOpen={true}
        imageCount={100}
        onSetFilterText={vi.fn()}
        onShowImport={vi.fn()}
      />,
    );

    const collection = screen.getByText('Voyage Maroc');
    const collectionContainer = collection.closest('div');
    if (!collectionContainer) throw new Error('Collection container not found');

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', JSON.stringify({ type: 'image', ids: [1, 2] }));

    await act(async () => {
      fireEvent.drop(collectionContainer, { dataTransfer } as unknown as DragEvent);
    });

    await waitFor(() => {
      expect(mockAddImagesToCollection).toHaveBeenCalledWith(1, [1, 2]);
    });
  });

  it('should highlight collection on drag over', () => {
    render(
      <LeftSidebar
        sidebarOpen={true}
        imageCount={100}
        onSetFilterText={vi.fn()}
        onShowImport={vi.fn()}
      />,
    );

    const collection = screen.getByText('Voyage Maroc');
    const collectionContainer = collection.closest('div');
    if (!collectionContainer) throw new Error('Collection container not found');

    const dataTransfer = new MockDataTransfer();

    // dragEnter is required first to increment the drag counter
    fireEvent.dragEnter(collectionContainer, { dataTransfer } as unknown as DragEvent);
    fireEvent.dragOver(collectionContainer, { dataTransfer } as unknown as DragEvent);

    // Check for drag-over styles
    expect(collectionContainer).toHaveClass('bg-blue-500/30');
    expect(collectionContainer).toHaveClass('border-dashed');
  });

  it('should remove highlight on drag leave', () => {
    render(
      <LeftSidebar
        sidebarOpen={true}
        imageCount={100}
        onSetFilterText={vi.fn()}
        onShowImport={vi.fn()}
      />,
    );

    const collection = screen.getByText('Voyage Maroc');
    const collectionContainer = collection.closest('div');
    if (!collectionContainer) throw new Error('Collection container not found');

    const dataTransfer = new MockDataTransfer();

    // dragEnter is required first to increment the drag counter
    fireEvent.dragEnter(collectionContainer, { dataTransfer } as unknown as DragEvent);
    fireEvent.dragOver(collectionContainer, { dataTransfer } as unknown as DragEvent);
    fireEvent.dragLeave(collectionContainer);

    // After drag leave, highlight should be removed
    expect(collectionContainer).not.toHaveClass('bg-blue-500/30');
  });

  it('should silently ignore invalid drag data', async () => {
    render(
      <LeftSidebar
        sidebarOpen={true}
        imageCount={100}
        onSetFilterText={vi.fn()}
        onShowImport={vi.fn()}
      />,
    );

    const collection = screen.getByText('Voyage Maroc');
    const collectionContainer = collection.closest('div');
    if (!collectionContainer) throw new Error('Collection container not found');

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', 'not json');

    await act(async () => {
      fireEvent.drop(collectionContainer, { dataTransfer } as unknown as DragEvent);
    });

    // Should not call addImagesToCollection with invalid data
    expect(mockAddImagesToCollection).not.toHaveBeenCalled();
  });

  it('should not add images with empty IDs array', async () => {
    render(
      <LeftSidebar
        sidebarOpen={true}
        imageCount={100}
        onSetFilterText={vi.fn()}
        onShowImport={vi.fn()}
      />,
    );

    const collection = screen.getByText('Voyage Maroc');
    const collectionContainer = collection.closest('div');
    if (!collectionContainer) throw new Error('Collection container not found');

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', JSON.stringify({ type: 'image', ids: [] }));

    await act(async () => {
      fireEvent.drop(collectionContainer, { dataTransfer } as unknown as DragEvent);
    });

    // Should not call addImagesToCollection with empty array
    expect(mockAddImagesToCollection).not.toHaveBeenCalled();
  });

  it('should work with multi-select drag', async () => {
    render(
      <LeftSidebar
        sidebarOpen={true}
        imageCount={100}
        onSetFilterText={vi.fn()}
        onShowImport={vi.fn()}
      />,
    );

    const collection = screen.getByText('Voyage Maroc');
    const collectionContainer = collection.closest('div');
    if (!collectionContainer) throw new Error('Collection container not found');

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', JSON.stringify({ type: 'image', ids: [1, 2, 3] }));

    await act(async () => {
      fireEvent.drop(collectionContainer, { dataTransfer } as unknown as DragEvent);
    });

    await waitFor(() => {
      expect(mockAddImagesToCollection).toHaveBeenCalledWith(1, [1, 2, 3]);
    });
  });
});
