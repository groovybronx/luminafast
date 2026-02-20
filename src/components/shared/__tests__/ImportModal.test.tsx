import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportModal } from '../ImportModal';
import { useSystemStore } from '@/stores/systemStore';
import { useDiscovery } from '@/hooks/useDiscovery';

// Mock the useDiscovery hook
vi.mock('@/hooks/useDiscovery', () => ({
  useDiscovery: vi.fn(),
}));

// Mock Tauri dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('ImportModal', () => {
  const mockUseDiscovery = vi.mocked(useDiscovery);
  const mockSelectRootFolder = vi.fn();
  const mockStartScan = vi.fn();
  const mockStartIngestion = vi.fn();
  const mockCancel = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    // Reset store
    useSystemStore.setState({
      logs: [],
      importState: {
        isImporting: false,
        progress: 0,
        currentFile: '',
        sessionId: null,
        totalFiles: 0,
        processedFiles: 0,
        stage: 'idle',
        error: null,
      },
      appReady: false,
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Default mock implementation
    mockUseDiscovery.mockReturnValue({
      isScanning: false,
      isIngesting: false,
      isImporting: false,
      progress: 0,
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      stage: 'idle',
      error: null,
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render initial state with folder selection', () => {
    render(<ImportModal onClose={mockOnClose} />);

    expect(screen.getByText('Ingestion Haute Performance')).toBeInTheDocument();
    expect(screen.getByText('Sélectionner un dossier')).toBeInTheDocument();
    expect(screen.getByText('Traitement parallèle de 12 flux RAW simultanés')).toBeInTheDocument();
  });

  it('should handle folder selection', async () => {
    mockSelectRootFolder.mockResolvedValue('/test/path');

    render(<ImportModal onClose={mockOnClose} />);

    const selectButton = screen.getByText('Sélectionner un dossier');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(mockSelectRootFolder).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Dossier sélectionné:')).toBeInTheDocument();
      expect(screen.getByText('/test/path')).toBeInTheDocument();
      expect(screen.getByText('Commencer l\'import')).toBeInTheDocument();
    });
  });

  it('should handle cancelled folder selection', async () => {
    mockSelectRootFolder.mockResolvedValue(null);

    render(<ImportModal onClose={mockOnClose} />);

    const selectButton = screen.getByText('Sélectionner un dossier');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(mockSelectRootFolder).toHaveBeenCalled();
    });

    // Should still show folder selection UI
    expect(screen.getByText('Sélectionner un dossier')).toBeInTheDocument();
  });

  it('should start import when start button clicked', async () => {
    mockSelectRootFolder.mockResolvedValue('/test/path');

    render(<ImportModal onClose={mockOnClose} />);

    // First select folder
    const selectButton = screen.getByText('Sélectionner un dossier');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('Commencer l\'import')).toBeInTheDocument();
    });

    // Then start import
    const startButton = screen.getByText('Commencer l\'import');
    fireEvent.click(startButton);

    expect(mockStartScan).toHaveBeenCalledWith('/test/path');
  });

  it('should show progress during scanning', () => {
    mockUseDiscovery.mockReturnValue({
      isScanning: true,
      isIngesting: false,
      isImporting: true,
      progress: 45,
      totalFiles: 100,
      processedFiles: 45,
      currentFile: '/test/subfolder',
      stage: 'scanning',
      error: null,
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: 'sess_123',
    });

    render(<ImportModal onClose={mockOnClose} />);

    // Check that cancel button is shown for active state
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should show progress during ingestion', () => {
    mockUseDiscovery.mockReturnValue({
      isScanning: false,
      isIngesting: true,
      isImporting: true,
      progress: 75,
      totalFiles: 100,
      processedFiles: 75,
      currentFile: 'IMG_1234.CR3',
      stage: 'ingesting',
      error: null,
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: 'sess_123',
    });

    render(<ImportModal onClose={mockOnClose} />);

    // Check that cancel button is shown for active state
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should show completion state', () => {
    mockUseDiscovery.mockReturnValue({
      isScanning: false,
      isIngesting: false,
      isImporting: false,
      progress: 100,
      totalFiles: 100,
      processedFiles: 100,
      currentFile: '',
      stage: 'completed',
      error: null,
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: 'sess_123',
    });

    render(<ImportModal onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);

    expect(screen.getByText('Import Réussi')).toBeInTheDocument();
    expect(screen.getByText('100 fichiers importés avec succès')).toBeInTheDocument();
    expect(screen.getByText('Fermer')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseDiscovery.mockReturnValue({
      isScanning: false,
      isIngesting: false,
      isImporting: false,
      progress: 25,
      totalFiles: 100,
      processedFiles: 25,
      currentFile: '',
      stage: 'error',
      error: 'Scan failed',
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: null,
    });

    render(<ImportModal onClose={mockOnClose} />);

    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should handle cancel operation', () => {
    mockUseDiscovery.mockReturnValue({
      isScanning: true,
      isIngesting: false,
      isImporting: true,
      progress: 25,
      totalFiles: 100,
      processedFiles: 25,
      currentFile: '/test',
      stage: 'scanning',
      error: null,
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: 'sess_123',
    });

    render(<ImportModal onClose={mockOnClose} />);

    const cancelButton = screen.getByText('Annuler');
    fireEvent.click(cancelButton);

    expect(mockCancel).toHaveBeenCalled();
  });

  it('should handle close operation', () => {
    mockUseDiscovery.mockReturnValue({
      isScanning: false,
      isIngesting: false,
      isImporting: false,
      progress: 0,
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      stage: 'idle',
      error: null,
      selectRootFolder: mockSelectRootFolder,
      startScan: mockStartScan,
      startIngestion: mockStartIngestion,
      cancel: mockCancel,
      sessionId: null,
    });

    render(<ImportModal onClose={mockOnClose} />);

    const closeButton = screen.getByText('Annuler');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should clear selected path when X button clicked', async () => {
    mockSelectRootFolder.mockResolvedValue('/test/path');

    render(<ImportModal onClose={mockOnClose} />);

    // Select folder
    const selectButton = screen.getByText('Sélectionner un dossier');
    fireEvent.click(selectButton);

    // Wait for folder to be selected
    await waitFor(() => {
      expect(screen.getByText('/test/path')).toBeInTheDocument();
    });

    // Clear selection - find and click the clear button by aria-label
    const clearButton = screen.getByRole('button', { name: 'Clear selected folder' });
    fireEvent.click(clearButton);

    // Should return to folder selection
    await waitFor(() => {
      expect(screen.getByText('Sélectionner un dossier')).toBeInTheDocument();
    });
  });

  // NOTE: Auto-start ingestion test removed - this functionality is now 
  // handled internally by useDiscovery hook via startIngestionRef pattern
  // and is tested in useDiscovery.test.ts
});
