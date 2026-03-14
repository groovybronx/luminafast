import React from 'react';

interface SettingFileInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBrowse?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const SettingFileInput: React.FC<SettingFileInputProps> = ({
  label,
  value,
  onChange,
  onBrowse,
  placeholder,
  disabled,
  error,
}) => (
  <label className="flex flex-col gap-1 text-sm font-medium">
    <span>{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="text"
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
        onClick={onBrowse}
        disabled={disabled || !onBrowse}
        className="rounded border border-neutral-600 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
      >
        Browse...
      </button>
    </div>
    {error ? <span className="text-xs text-red-400">{error}</span> : null}
  </label>
);

export default SettingFileInput;
