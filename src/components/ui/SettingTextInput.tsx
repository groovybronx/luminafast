import React from 'react';

interface SettingTextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

const SettingTextInput: React.FC<SettingTextInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  error,
  helperText,
}) => (
  <label className="flex flex-col gap-1 text-sm font-medium">
    <span>{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`rounded border px-2 py-1 bg-neutral-800 text-white disabled:opacity-60 ${
        error ? 'border-red-500' : 'border-neutral-600'
      }`}
    />
    {error ? <span className="text-xs text-red-400">{error}</span> : null}
    {!error && helperText ? <span className="text-xs text-neutral-400">{helperText}</span> : null}
  </label>
);

export default SettingTextInput;
