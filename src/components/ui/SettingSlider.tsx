import React from 'react';

interface SettingSliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  disabled?: boolean;
}

const SettingSlider: React.FC<SettingSliderProps> = ({
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  disabled,
}) => (
  <label className="flex flex-col gap-1 text-sm font-medium">
    <span>
      {label} <span className="ml-2 text-xs text-neutral-400">{value}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-blue-500"
      disabled={disabled}
    />
  </label>
);

export default SettingSlider;
