import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CollectionDTO } from '@/types';
import { SmartCollectionItem } from '../SmartCollectionItem';

describe('SmartCollectionItem', () => {
  const collection: CollectionDTO = {
    id: 42,
    name: 'Top Picks',
    collection_type: 'smart',
    image_count: 9,
  };

  it('selects collection on main click', () => {
    const onSelect = vi.fn();

    render(
      <SmartCollectionItem
        collection={collection}
        isActive={false}
        onSelect={onSelect}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Top Picks'));
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('deletes collection from delete button', () => {
    const onDelete = vi.fn();

    render(
      <SmartCollectionItem
        collection={collection}
        isActive={false}
        onSelect={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByLabelText('Supprimer Top Picks'));
    expect(onDelete).toHaveBeenCalledWith(42);
  });
});
