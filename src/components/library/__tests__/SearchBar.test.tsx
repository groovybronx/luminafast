import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  it('affiche le champ de recherche', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByPlaceholderText(/recherche/i)).toBeInTheDocument();
  });

  it('appelle onSearch avec requête parsée lors du submit', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText(/recherche/i);
    fireEvent.change(input, { target: { value: 'iso:>3200 star:4' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '',
          filters: expect.arrayContaining([
            expect.objectContaining({ field: 'iso', operator: '>', value: 3200 }),
            expect.objectContaining({ field: 'star', operator: ':', value: 4 }),
          ]),
        }),
      );
    });
  });

  it('appelle onSearch après 500ms de debounce au changement', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText(/recherche/i);
    fireEvent.change(input, { target: { value: 'vacances' } });

    // Avant le debounce
    expect(onSearch).not.toHaveBeenCalled();

    // Après le debounce
    await waitFor(
      () => {
        expect(onSearch).toHaveBeenCalledWith(
          expect.objectContaining({ text: 'vacances', filters: [] }),
        );
      },
      { timeout: 1000 },
    );
  });

  it('est désactivée pendant la recherche', () => {
    render(<SearchBar onSearch={vi.fn()} isLoading={true} />);
    const input = screen.getByPlaceholderText(/recherche/i);
    expect(input).toBeDisabled();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
