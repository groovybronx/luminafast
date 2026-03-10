import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickFilters } from '../QuickFilters';

describe('QuickFilters', () => {
  it('sets rating filter when clicking a star', () => {
    const onSetRatingFilter = vi.fn();

    render(
      <QuickFilters
        ratingFilter={null}
        flagFilter={null}
        onSetRatingFilter={onSetRatingFilter}
        onSetFlagFilter={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Filtrer 3 etoile(s) minimum'));
    expect(onSetRatingFilter).toHaveBeenCalledWith(3);
  });

  it('toggles pick flag filter', () => {
    const onSetFlagFilter = vi.fn();

    render(
      <QuickFilters
        ratingFilter={null}
        flagFilter={'pick'}
        onSetRatingFilter={vi.fn()}
        onSetFlagFilter={onSetFlagFilter}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Filtrer les picks'));
    expect(onSetFlagFilter).toHaveBeenCalledWith(null);
  });

  it('shows and triggers reset action when filters are active', () => {
    const onReset = vi.fn();

    render(
      <QuickFilters
        ratingFilter={2}
        flagFilter={null}
        onSetRatingFilter={vi.fn()}
        onSetFlagFilter={vi.fn()}
        onReset={onReset}
      />,
    );

    const resetButton = screen.getByLabelText('Réinitialiser les filtres');
    fireEvent.click(resetButton);

    expect(onReset).toHaveBeenCalled();
  });
});
