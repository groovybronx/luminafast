import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AppInitializer } from '@/components/AppInitializer';
import { previewService } from '@/services/previewService';

vi.mock('@/services/previewService', () => ({
  previewService: {
    initialize: vi.fn(),
  },
}));

describe('AppInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes preview service and refreshes catalog once', async () => {
    const initializeMock = vi.mocked(previewService.initialize).mockResolvedValue(undefined);
    const refreshCatalog = vi.fn().mockResolvedValue(undefined);
    const addLog = vi.fn();
    const onInitComplete = vi.fn();

    render(
      <AppInitializer
        refreshCatalog={refreshCatalog}
        addLog={addLog}
        onInitComplete={onInitComplete}
      />,
    );

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalledTimes(1);
      expect(refreshCatalog).toHaveBeenCalledTimes(1);
      expect(onInitComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('logs initialization errors when preview init fails', async () => {
    vi.mocked(previewService.initialize).mockRejectedValue(new Error('init failed'));
    const refreshCatalog = vi.fn().mockResolvedValue(undefined);
    const addLog = vi.fn();

    render(<AppInitializer refreshCatalog={refreshCatalog} addLog={addLog} />);

    await waitFor(() => {
      expect(addLog).toHaveBeenCalledWith('Initialization error: Error: init failed', 'error');
      expect(refreshCatalog).not.toHaveBeenCalled();
    });
  });
});
