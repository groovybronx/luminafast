import React from 'react';

interface Option {
  label: string;
  value: string | number;
}

interface SettingDropdownProps {
  label: string;
  value: string | number;
  options: Option[];
  onChange?: (value: string | number) => void;
  disabled?: boolean;
}

const SettingDropdown: React.FC<SettingDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  disabled,
}) => (
  <label className="flex flex-col gap-1 text-sm font-medium">
    <span>{label}</span>
    <select
      className="rounded border px-2 py-1 bg-neutral-800 text-white disabled:opacity-60"
      value={value}
      onChange={(e) =>
        onChange?.(typeof value === 'number' ? Number(e.target.value) : e.target.value)
      }
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </label>
);

export default SettingDropdown;
