import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingFileInput from '../SettingFileInput';

describe('SettingFileInput', () => {
  it('calls onChange when path is edited', () => {
    const onChange = vi.fn();

    render(<SettingFileInput label="Previews path" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/previews path/i), {
      target: { value: '/tmp/previews' },
    });

    expect(onChange).toHaveBeenCalledWith('/tmp/previews');
  });

  it('calls onBrowse when browse button is clicked', () => {
    const onBrowse = vi.fn();

    render(
      <SettingFileInput
        label="Database path"
        value="/tmp/lumina.db"
        onChange={vi.fn()}
        onBrowse={onBrowse}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /browse/i }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });
});
