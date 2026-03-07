import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { XmpPanel } from '../XmpPanel';
import { XmpService } from '@/services/xmpService';

vi.mock('../../../services/xmpService');

const mockGetXmpStatus = vi.mocked(XmpService.getXmpStatus);
const mockExportImageXmp = vi.mocked(XmpService.exportImageXmp);
const mockImportImageXmp = vi.mocked(XmpService.importImageXmp);

const STATUS_ABSENT = { exists: false, xmpPath: '' };
const STATUS_PRESENT = { exists: true, xmpPath: '/photos/shot.xmp' };
const IMPORT_RESULT = { rating: 4, flag: 'pick', tagsImported: 2 };

describe('XmpPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetXmpStatus.mockResolvedValue(STATUS_ABSENT);
  });

  // ── Rendu de base ────────────────────────────────────────────────────────────

  it('renders the panel title', async () => {
    render(<XmpPanel imageId={1} />);
    await waitFor(() => expect(screen.getByText('Sidecar XMP')).toBeInTheDocument());
  });

  it('calls getXmpStatus on mount', async () => {
    render(<XmpPanel imageId={42} />);
    await waitFor(() => expect(mockGetXmpStatus).toHaveBeenCalledWith(42));
  });

  it('reloads status when imageId changes', async () => {
    const { rerender } = render(<XmpPanel imageId={1} />);
    await waitFor(() => expect(mockGetXmpStatus).toHaveBeenCalledWith(1));

    rerender(<XmpPanel imageId={2} />);
    await waitFor(() => expect(mockGetXmpStatus).toHaveBeenCalledWith(2));
    expect(mockGetXmpStatus).toHaveBeenCalledTimes(2);
  });

  // ── Badge de statut ──────────────────────────────────────────────────────────

  it('shows "Absent" badge when xmp file does not exist', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_ABSENT);
    render(<XmpPanel imageId={1} />);
    await waitFor(() => expect(screen.getByText(/absent/i)).toBeInTheDocument());
  });

  it('shows "Présent" badge when xmp file exists', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_PRESENT);
    render(<XmpPanel imageId={1} />);
    await waitFor(() => expect(screen.getByText(/présent/i)).toBeInTheDocument());
  });

  it('shows xmp filename when sidecar exists', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_PRESENT);
    render(<XmpPanel imageId={1} />);
    await waitFor(() => expect(screen.getByText('shot.xmp')).toBeInTheDocument());
  });

  // ── Bouton Export ────────────────────────────────────────────────────────────

  it('renders Export button', async () => {
    render(<XmpPanel imageId={1} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /exporter/i })).toBeInTheDocument(),
    );
  });

  it('calls exportImageXmp with imageId on Export click', async () => {
    mockExportImageXmp.mockResolvedValue('/photos/shot.xmp');
    mockGetXmpStatus.mockResolvedValueOnce(STATUS_ABSENT).mockResolvedValue(STATUS_PRESENT);

    render(<XmpPanel imageId={7} />);
    await waitFor(() => screen.getByRole('button', { name: /exporter/i }));
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }));

    await waitFor(() => expect(mockExportImageXmp).toHaveBeenCalledWith(7));
  });

  it('shows success feedback after export', async () => {
    mockExportImageXmp.mockResolvedValue('/photos/shot.xmp');
    mockGetXmpStatus.mockResolvedValueOnce(STATUS_ABSENT).mockResolvedValue(STATUS_PRESENT);

    render(<XmpPanel imageId={1} />);
    await waitFor(() => screen.getByRole('button', { name: /exporter/i }));
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }));

    await waitFor(() => {
      const feedbacks = screen.getAllByText(/shot\.xmp/i);
      expect(feedbacks.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows error feedback when export fails', async () => {
    mockExportImageXmp.mockRejectedValue(new Error('Disk full'));
    render(<XmpPanel imageId={1} />);
    await waitFor(() => screen.getByRole('button', { name: /exporter/i }));
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }));

    await waitFor(() => expect(screen.getByText(/disk full/i)).toBeInTheDocument());
  });

  // ── Bouton Import ────────────────────────────────────────────────────────────

  it('Import button is disabled when xmp file is absent', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_ABSENT);
    render(<XmpPanel imageId={1} />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /importer/i });
      expect(btn).toBeDisabled();
    });
  });

  it('Import button is enabled when xmp file is present', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_PRESENT);
    render(<XmpPanel imageId={1} />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /importer/i });
      expect(btn).not.toBeDisabled();
    });
  });

  it('calls importImageXmp with imageId on Import click', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_PRESENT);
    mockImportImageXmp.mockResolvedValue(IMPORT_RESULT);

    render(<XmpPanel imageId={5} />);
    await waitFor(() => screen.getByRole('button', { name: /importer/i }));
    fireEvent.click(screen.getByRole('button', { name: /importer/i }));

    await waitFor(() => expect(mockImportImageXmp).toHaveBeenCalledWith(5));
  });

  it('shows success feedback after import and calls onImportSuccess', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_PRESENT);
    mockImportImageXmp.mockResolvedValue(IMPORT_RESULT);
    const onImportSuccess = vi.fn();

    render(<XmpPanel imageId={5} onImportSuccess={onImportSuccess} />);
    await waitFor(() => screen.getByRole('button', { name: /importer/i }));
    fireEvent.click(screen.getByRole('button', { name: /importer/i }));

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalledWith(IMPORT_RESULT);
      expect(screen.getByText(/2 tag/i)).toBeInTheDocument();
    });
  });

  it('shows error feedback when import fails', async () => {
    mockGetXmpStatus.mockResolvedValue(STATUS_PRESENT);
    mockImportImageXmp.mockRejectedValue(new Error('XMP parse error'));

    render(<XmpPanel imageId={5} />);
    await waitFor(() => screen.getByRole('button', { name: /importer/i }));
    fireEvent.click(screen.getByRole('button', { name: /importer/i }));

    await waitFor(() => expect(screen.getByText(/xmp parse error/i)).toBeInTheDocument());
  });

  // ── Robustesse API ────────────────────────────────────────────────────────────

  it('does not crash when getXmpStatus throws (Tauri unavailable)', async () => {
    mockGetXmpStatus.mockRejectedValue(new Error('Tauri not available'));
    // Aucune exception propagée — le composant affiche juste l'état initial
    render(<XmpPanel imageId={1} />);
    await waitFor(() => expect(screen.getByText('Sidecar XMP')).toBeInTheDocument());
  });
});
