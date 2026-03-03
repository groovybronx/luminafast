import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryPanel } from '../HistoryPanel';
import { useEditStore } from '../../../stores/editStore';
import * as snapshotService from '../../../services/snapshotService';

vi.mock('../../../stores/editStore');
vi.mock('../../../services/snapshotService');

const mockUseEditStore = useEditStore as unknown as ReturnType<typeof vi.fn>;

describe('HistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
    mockUseEditStore.mockReturnValue({
      getAppliedEdits: vi.fn(() => []),
      restoreToEvent: vi.fn(),
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
    });

    render(<HistoryPanel />);

    expect(screen.getByText(/select an image to view history/i)).toBeInTheDocument();
  });

  it('should render event timeline when image is selected', async () => {
    const mockEvents = [
      {
        id: 'evt-1',
        type: 'exposure',
        targetType: 'image' as const,
        targetId: 100,
        timestamp: new Date('2025-03-02T12:00:00Z'),
        payload: 0.5,
        eventType: 'exposure',
        createdAt: '2025-03-02T12:00:00Z',
      },
    ];

    mockUseEditStore.mockReturnValue({
      getAppliedEdits: vi.fn(() => mockEvents),
      restoreToEvent: vi.fn(),
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
    });

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

    mockUseEditStore.mockReturnValue({
      getAppliedEdits: vi.fn(() => []),
      restoreToEvent: vi.fn(),
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
    });

    vi.mocked(snapshotService.getSnapshots).mockResolvedValue(mockSnapshots);

    render(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      expect(vi.mocked(snapshotService.getSnapshots)).toHaveBeenCalledWith(100);
    });
  });

  it('should handle no events gracefully', () => {
    mockUseEditStore.mockReturnValue({
      getAppliedEdits: vi.fn(() => []),
      restoreToEvent: vi.fn(),
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
    });

    render(<HistoryPanel selectedImageId={100} />);

    // Component should render without errors
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
  });

  it('should call restoreToEvent when event is clicked', async () => {
    const mockRestoreToEvent = vi.fn();
    const mockEvents = [
      {
        id: 'evt-1',
        type: 'exposure',
        targetType: 'image' as const,
        targetId: 100,
        timestamp: new Date('2025-03-02T12:00:00Z'),
        payload: 0.5,
        eventType: 'exposure',
        createdAt: '2025-03-02T12:00:00Z',
      },
    ];

    mockUseEditStore.mockReturnValue({
      getAppliedEdits: vi.fn(() => mockEvents),
      restoreToEvent: mockRestoreToEvent,
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
    });

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

    mockUseEditStore.mockReturnValue({
      getAppliedEdits: vi.fn(() => []),
      restoreToEvent: vi.fn(),
      setEditEventsForImage: vi.fn(),
      setSnapshots: vi.fn(),
      addSnapshot: vi.fn(),
    });

    vi.mocked(snapshotService.getSnapshots).mockResolvedValue(mockSnapshots);

    render(<HistoryPanel selectedImageId={100} />);

    await waitFor(() => {
      expect(screen.getByText('Test Snapshot')).toBeInTheDocument();
    });
  });
});
