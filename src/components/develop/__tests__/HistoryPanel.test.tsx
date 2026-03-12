import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryPanel } from '../HistoryPanel';
import { useEditStore } from '@/stores/editStore';
import * as snapshotService from '@/services/snapshotService';
import type { EventDTO } from '@/services/eventService';

vi.mock('../../../stores/editStore');
vi.mock('../../../services/snapshotService');

const mockUseEditStore = useEditStore as unknown as ReturnType<typeof vi.fn>;

interface MockEditStoreState {
  editEventsPerImage: Record<number, EventDTO[]>;
  restoreToEvent: ReturnType<typeof vi.fn>;
  setEditEventsForImage: ReturnType<typeof vi.fn>;
  setSnapshots: ReturnType<typeof vi.fn>;
  addSnapshot: ReturnType<typeof vi.fn>;
  deleteSnapshotLocal: ReturnType<typeof vi.fn>;
}

let mockEditStoreState: MockEditStoreState;

function makeEvent(id: string, targetId: number, eventType = 'edit_applied'): EventDTO {
  return {
    id,
    timestamp: Date.now(),
    eventType,
    payload: { edits: { exposure: 0.5 } },
    targetType: 'image',
    targetId,
    userId: undefined,
    createdAt: new Date().toISOString(),
  };
}

function installStoreSelectorMock() {
  mockUseEditStore.mockImplementation((selector?: (state: MockEditStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockEditStoreState);
    }
    return mockEditStoreState;
  });
}

describe('HistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEditStoreState = {
      editEventsPerImage: {},
      restoreToEvent: vi.fn(),
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
      deleteSnapshotLocal: vi.fn(),
    };
    installStoreSelectorMock();

    // Setup default mocks for snapshotService
    vi.mocked(snapshotService.getSnapshots).mockResolvedValue([]);
    vi.mocked(snapshotService.deleteSnapshot).mockResolvedValue(undefined);
    vi.mocked(snapshotService.renameSnapshot).mockResolvedValue(undefined);
    vi.mocked(snapshotService.createSnapshot).mockResolvedValue({
      id: 0,
      imageId: 0,
      name: '',
      snapshotData: '',
      eventIds: [],
      createdAt: '',
    });
    vi.mocked(snapshotService.getSnapshot).mockResolvedValue(null);
  });

  it('should render empty state when no selectedImageId', () => {
    render(<HistoryPanel />);

    expect(screen.getByText(/select an image to view history/i)).toBeInTheDocument();
  });

  it('should render event timeline when image is selected', async () => {
    mockEditStoreState.editEventsPerImage[100] = [makeEvent('evt-1', 100, 'exposure')];

    render(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      expect(screen.getByText(/Historique/i)).toBeInTheDocument();
    });
  });

  it('should load snapshots when image changes', async () => {
    const mockSnapshots = [
      {
        id: 1,
        imageId: 100,
        name: 'Before color grade',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      },
    ];

    vi.mocked(snapshotService.getSnapshots).mockResolvedValue(mockSnapshots);

    render(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      expect(vi.mocked(snapshotService.getSnapshots)).toHaveBeenCalledWith(100);
    });
  });

  it('should handle no events gracefully', () => {
    render(<HistoryPanel selectedImageId={100} />);

    // Component should render without errors
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
  });

  it('should call restoreToEvent when event is clicked', async () => {
    const mockRestoreToEvent = vi.fn();
    mockEditStoreState.restoreToEvent = mockRestoreToEvent;
    mockEditStoreState.editEventsPerImage[100] = [makeEvent('evt-1', 100, 'exposure')];

    render(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      // Find the event button (not reset/snapshot)
      const eventButton = buttons.find((btn) => btn.textContent?.includes('exposure'));
      if (eventButton) {
        fireEvent.click(eventButton);
      }
    });

    expect(mockRestoreToEvent).toHaveBeenCalledWith(100, expect.any(Number));
  });

  it('should display snapshots list when they exist', async () => {
    const mockSnapshots = [
      {
        id: 1,
        imageId: 100,
        name: 'Test Snapshot',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      },
    ];

    vi.mocked(snapshotService.getSnapshots).mockResolvedValue(mockSnapshots);

    render(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      expect(screen.getByText('Test Snapshot')).toBeInTheDocument();
    });
  });

  it('should update timeline when store events change for same image', async () => {
    const { rerender } = render(<HistoryPanel selectedImageId={100} />);

    expect(screen.getByText(/No edits recorded yet/i)).toBeInTheDocument();

    mockEditStoreState.editEventsPerImage[100] = [makeEvent('evt-2', 100, 'contrast_changed')];
    rerender(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      expect(screen.getByText(/contrast_changed/i)).toBeInTheDocument();
    });
  });
});
