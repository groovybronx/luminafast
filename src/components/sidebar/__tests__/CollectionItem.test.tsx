import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CollectionDTO } from '@/types';
import { CollectionItem } from '../CollectionItem';

class MockDataTransfer {
  private data = new Map<string, string>();
  dropEffect = '';

  getData(format: string): string {
    return this.data.get(format) ?? '';
  }

  setData(format: string, value: string): void {
    this.data.set(format, value);
  }
}

describe('CollectionItem', () => {
  const collection: CollectionDTO = {
    id: 7,
    name: 'Favorites',
    collection_type: 'static',
    image_count: 3,
  };

  it('selects collection on click', () => {
    const onSelect = vi.fn();

    render(
      <CollectionItem
        collection={collection}
        isActive={false}
        isDragOver={false}
        onSelect={onSelect}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onDrop={vi.fn().mockResolvedValue(undefined)}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Favorites'));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('renames collection from inline editor', async () => {
    const onRename = vi.fn();

    render(
      <CollectionItem
        collection={collection}
        isActive={false}
        isDragOver={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={onRename}
        onDrop={vi.fn().mockResolvedValue(undefined)}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Renommer Favorites'));

    const input = screen.getByTitle('Renommer la collection');
    fireEvent.change(input, { target: { value: 'Travel Picks' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith(7, 'Travel Picks');
    });
  });

  it('deletes collection from delete button', () => {
    const onDelete = vi.fn();

    render(
      <CollectionItem
        collection={collection}
        isActive={false}
        isDragOver={false}
        onSelect={vi.fn()}
        onDelete={onDelete}
        onRename={vi.fn()}
        onDrop={vi.fn().mockResolvedValue(undefined)}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Supprimer Favorites'));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it('cancels rename on Escape without persisting', () => {
    const onRename = vi.fn();

    render(
      <CollectionItem
        collection={collection}
        isActive={false}
        isDragOver={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={onRename}
        onDrop={vi.fn().mockResolvedValue(undefined)}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Renommer Favorites'));

    const input = screen.getByTitle('Renommer la collection');
    fireEvent.change(input, { target: { value: 'Should Not Save' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onRename).not.toHaveBeenCalled();
  });

  it('accepts valid image drag payload', async () => {
    const onDrop = vi.fn().mockResolvedValue(undefined);
    const onDragLeave = vi.fn();

    const { container } = render(
      <CollectionItem
        collection={collection}
        isActive={false}
        isDragOver={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onDrop={onDrop}
        onDragOver={vi.fn()}
        onDragLeave={onDragLeave}
      />,
    );

    const root = container.firstElementChild;
    if (!root) {
      throw new Error('CollectionItem root not found');
    }

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', JSON.stringify({ type: 'image', ids: [1, 2] }));

    fireEvent.drop(root, { dataTransfer } as unknown as DragEvent);

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalledWith(7, { type: 'image', ids: [1, 2] });
    });
    expect(onDragLeave).toHaveBeenCalled();
  });

  it('ignores invalid drop payload', async () => {
    const onDrop = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <CollectionItem
        collection={collection}
        isActive={false}
        isDragOver={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onDrop={onDrop}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
      />,
    );

    const root = container.firstElementChild;
    if (!root) {
      throw new Error('CollectionItem root not found');
    }

    const dataTransfer = new MockDataTransfer();
    dataTransfer.setData('application/json', 'not-json');

    fireEvent.drop(root, { dataTransfer } as unknown as DragEvent);

    await waitFor(() => {
      expect(onDrop).not.toHaveBeenCalled();
    });
  });
});
