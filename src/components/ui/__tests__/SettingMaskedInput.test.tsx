import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingMaskedInput from '../SettingMaskedInput';

describe('SettingMaskedInput', () => {
  it('uses password type by default and toggles visibility', () => {
    render(<SettingMaskedInput label="API key" value="secret" onChange={vi.fn()} />);

    const input = screen.getByLabelText(/api key/i);
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show value/i }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide value/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when user edits value', () => {
    const onChange = vi.fn();
    render(<SettingMaskedInput label="API key" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/api key/i), {
      target: { value: 'sk-123' },
    });

    expect(onChange).toHaveBeenCalledWith('sk-123');
  });
});
