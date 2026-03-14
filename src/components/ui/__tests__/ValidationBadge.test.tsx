import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ValidationBadge from '../ValidationBadge';

describe('ValidationBadge', () => {
  it('renders default label from status', () => {
    render(<ValidationBadge status="valid" />);
    expect(screen.getByRole('status')).toHaveTextContent('Valid');
  });

  it('renders custom message when provided', () => {
    render(<ValidationBadge status="error" message="Path is not writable" />);
    expect(screen.getByRole('status')).toHaveTextContent('Path is not writable');
  });
});
