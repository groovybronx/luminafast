import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingTextInput from '../SettingTextInput';

describe('SettingTextInput', () => {
  it('renders label and value', () => {
    render(<SettingTextInput label="Full name" value="Alice" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<SettingTextInput label="Email" value="" onChange={onChange} type="email" />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alice@example.com' },
    });

    expect(onChange).toHaveBeenCalledWith('alice@example.com');
  });

  it('shows error message and invalid state', () => {
    render(
      <SettingTextInput label="Email" value="bad-email" onChange={vi.fn()} error="Invalid email" />,
    );

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
