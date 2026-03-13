import React from 'react';

interface SettingToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ label, checked, onChange, disabled }) => (
  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-blue-500"
      disabled={disabled}
    />
    <span>{label}</span>
  </label>
);

export default SettingToggle;
