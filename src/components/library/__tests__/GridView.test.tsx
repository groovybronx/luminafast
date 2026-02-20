import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GridView } from '../GridView';
import type { CatalogImage} from '../../../types';
import { DEFAULT_EDIT_STATE } from '../../../types';

// Mock Lucide icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  Cloud: () => <div data-testid="icon-cloud" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  Image: () => <div data-testid="icon-image" />,
}));

// Mock @tanstack/react-virtual to simplify testing
// The virtualizer's absolute positioning makes standard testing harder,
// so we mock it to render items in a simpler grid layout for testing
vi.mock('@tanstack/react-virtual', () => {
  const React = require('react');
  return {
    useVirtualizer: vi.fn((config) => {
      const count = config.count;
      const estimateSize = config.estimateSize;
      const items = Array.from({ length: count }, (_, i) => ({
        key: i,
        index: i,
        start: estimateSize() * i,
      }));

      return {
        getTotalSize: () => estimateSize() * count,
        getVirtualItems: () => items,
        measure: vi.fn(),
      };
    }),
  };
});

const mockImages: CatalogImage[] = [
  {
    id: 1,
    hash: 'hash1',
    filename: 'IMG_001.JPG',
    url: 'file://img1.jpg',
    capturedAt: '2023-01-01',
    exif: { iso: 100, fstop: 2.8, shutter: '1/100', lens: '50mm', camera: 'Sony', location: '' },
    state: { rating: 3, flag: null, edits: DEFAULT_EDIT_STATE, isSynced: true, revision: '1', tags: [] },
    sizeOnDisk: '10MB'
  },
  {
    id: 2,
    hash: 'hash2',
    filename: 'IMG_002.JPG',
    url: 'file://img2.jpg',
    capturedAt: '2023-01-02',
    exif: { iso: 200, fstop: 4.0, shutter: '1/200', lens: '85mm', camera: 'Sony', location: '' },
    state: { rating: 5, flag: 'pick', edits: DEFAULT_EDIT_STATE, isSynced: false, revision: '1', tags: [] },
    sizeOnDisk: '12MB'
  }
];

describe('GridView Component', () => {
  beforeEach(() => {
    // Mock clientWidth/clientHeight for dimension calculations (no longer needed with mocked virtualizer)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 600,
    });
  });

  it('renders correct number of images', () => {
    const onToggle = vi.fn();
    const onSetView = vi.fn();

    render(
      <GridView 
        images={mockImages} 
        selection={[]} 
        thumbnailSize={200} 
        onToggleSelection={onToggle}
        onSetActiveView={onSetView}
      />
    );

    const images = screen.getAllByRole('img', { hidden: true });
    expect(images).toHaveLength(2);
  });

  it('displays filenames correctly', () => {
    const onToggle = vi.fn();
    const onSetView = vi.fn();

    render(
      <GridView 
        images={mockImages} 
        selection={[]} 
        thumbnailSize={200} 
        onToggleSelection={onToggle}
        onSetActiveView={onSetView}
      />
    );

    expect(screen.getByText('IMG_001.JPG')).toBeInTheDocument();
    expect(screen.getByText('IMG_002.JPG')).toBeInTheDocument();
  });

  it('handles selection toggle on click', () => {
    const onToggle = vi.fn();
    const onSetView = vi.fn();

    render(
      <GridView 
        images={mockImages} 
        selection={[]} 
        thumbnailSize={200} 
        onToggleSelection={onToggle}
        onSetActiveView={onSetView}
      />
    );

    // Note: The structure is a bit complex, let's target the click handler div directly if possible, 
    // or just click the image which bubbles up.
    
    // Using the filename text to find the container
    fireEvent.click(screen.getByText('IMG_001.JPG'));

    expect(onToggle).toHaveBeenCalledTimes(1);
    // The first argument should be the ID (1)
    expect(onToggle).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('handles double click to switch view', () => {
    const onToggle = vi.fn();
    const onSetView = vi.fn();

    render(
      <GridView 
        images={mockImages} 
        selection={[]} 
        thumbnailSize={200} 
        onToggleSelection={onToggle}
        onSetActiveView={onSetView}
      />
    );

    fireEvent.doubleClick(screen.getByText('IMG_001.JPG'));

    expect(onSetView).toHaveBeenCalledTimes(1);
    expect(onSetView).toHaveBeenCalledWith('develop');
  });

  it('shows selection styling', () => {
    const onToggle = vi.fn();
    const onSetView = vi.fn();

    render(
      <GridView 
        images={mockImages} 
        selection={[1]} // Select the first image
        thumbnailSize={200} 
        onToggleSelection={onToggle}
        onSetActiveView={onSetView}
      />
    );

    // Finding the selected item by looking for the border class or similar
    // This is a bit brittle to CSS class names but validates the logic
    const selectedItemName = screen.getByText('IMG_001.JPG');
    const selectedContainer = selectedItemName.closest('.group');
    
    expect(selectedContainer).toHaveClass('border-blue-500');
  });
});
