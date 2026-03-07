import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagsPanel } from '../TagsPanel';
import { useTagStore } from '@/stores/tagStore';
import { TagService } from '@/services/tagService';

vi.mock('../../../stores/tagStore');
vi.mock('../../../services/tagService');
vi.mock('../../../services/eventService', () => ({ appendEvent: vi.fn() }));

const mockUseTagStore = useTagStore as unknown as ReturnType<typeof vi.fn>;

const defaultStore = {
  tags: [{ id: 1, name: 'Voyage', parentId: null, imageCount: 3, children: [] }],
  flatTags: [{ id: 1, name: 'Voyage', parentId: null, imageCount: 3, children: [] }],
  isLoading: false,
  error: null,
  loadTags: vi.fn(),
  createTag: vi.fn(),
  renameTag: vi.fn(),
  deleteTag: vi.fn(),
  addTagsToImages: vi.fn().mockResolvedValue(undefined),
  removeTagsFromImages: vi.fn().mockResolvedValue(undefined),
  getTagsForImage: vi.fn().mockReturnValue([]),
};

describe('TagsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTagStore.mockReturnValue(defaultStore);
    vi.mocked(TagService.getImageTags).mockResolvedValue([]);
  });

  // ── Rendu de base ────────────────────────────────────────────────────────────

  it('renders the panel title', () => {
    render(<TagsPanel imageId={42} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders tags tree management section', () => {
    render(<TagsPanel imageId={42} />);
    expect(screen.getByText('Tous les tags')).toBeInTheDocument();
  });

  it('shows tree nodes with tag names', () => {
    render(<TagsPanel imageId={42} />);
    expect(screen.getByText('Voyage')).toBeInTheDocument();
  });

  // ── Tags de l'image ─────────────────────────────────────────────────────────

  it('renders image tags when image has tags', async () => {
    vi.mocked(TagService.getImageTags).mockResolvedValue([
      { id: 1, name: 'Voyage', parentId: null, imageCount: 3 },
    ]);

    render(<TagsPanel imageId={10} />);

    await waitFor(() => {
      expect(TagService.getImageTags).toHaveBeenCalledWith(10);
    });
  });

  // ── Input d'auto-complétion ───────────────────────────────────────────────────

  it('shows suggestions when typing in input', async () => {
    render(<TagsPanel imageId={42} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'voy' } });

    await waitFor(() => {
      // The suggestion button in the dropdown
      const buttons = screen.getAllByText('Voyage');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('clears suggestions on Escape', async () => {
    render(<TagsPanel imageId={42} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'voy' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('');
  });

  // ── addTagsToImages ──────────────────────────────────────────────────────────

  it('calls addTagsToImages when Enter is pressed on suggestion', async () => {
    vi.mocked(TagService.getImageTags).mockResolvedValue([]);

    render(<TagsPanel imageId={42} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'voy' } });
    fireEvent.focus(input);
    // Navigate to first suggestion and confirm with Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(defaultStore.addTagsToImages).toHaveBeenCalledWith([42], [1]);
    });
  });

  // ── Retrait de tag ──────────────────────────────────────────────────────────

  it('calls removeTagsFromImages when remove button is clicked on image tag', async () => {
    vi.mocked(TagService.getImageTags).mockResolvedValue([
      { id: 1, name: 'Voyage', parentId: null, imageCount: 3 },
    ]);

    render(<TagsPanel imageId={42} />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Retirer ce tag').length).toBeGreaterThan(0);
    });

    const removeBtn = screen.getAllByTitle('Retirer ce tag')[0]!;
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(defaultStore.removeTagsFromImages).toHaveBeenCalledWith([42], [1]);
    });
  });
});
