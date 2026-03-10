import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewCollectionInput } from '../NewCollectionInput';

describe('NewCollectionInput', () => {
  it('confirms trimmed value on Enter', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<NewCollectionInput onConfirm={onConfirm} onCancel={onCancel} />);

    const input = screen.getByPlaceholderText('Nom de la collection...');
    fireEvent.change(input, { target: { value: '  Portfolio  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onConfirm).toHaveBeenCalledWith('Portfolio');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels on Escape', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<NewCollectionInput onConfirm={onConfirm} onCancel={onCancel} />);

    const input = screen.getByPlaceholderText('Nom de la collection...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('enables confirm button only with non-empty input', () => {
    const onConfirm = vi.fn();

    render(<NewCollectionInput onConfirm={onConfirm} onCancel={vi.fn()} />);

    const confirmButton = screen.getByLabelText('Valider');
    expect(confirmButton).toBeDisabled();

    const input = screen.getByPlaceholderText('Nom de la collection...');
    fireEvent.change(input, { target: { value: 'Nature' } });

    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('Nature');
  });
});
