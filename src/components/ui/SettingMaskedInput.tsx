import React, { useState } from 'react';

interface SettingMaskedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const SettingMaskedInput: React.FC<SettingMaskedInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 rounded border px-2 py-1 bg-neutral-800 text-white disabled:opacity-60 ${
            error ? 'border-red-500' : 'border-neutral-600'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="rounded border border-neutral-600 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
          disabled={disabled}
          aria-label={visible ? 'Hide value' : 'Show value'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
};

export default SettingMaskedInput;
