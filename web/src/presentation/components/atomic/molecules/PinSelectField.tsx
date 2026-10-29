import React from 'react';

interface PinOption {
  value: number;
  label: string;
}

interface PinSelectFieldProps {
  label: string;
  value: number;
  options: PinOption[];
  isEnabled: boolean;
  onChange: (val: number) => void;
  helperText?: string;
}

export const PinSelectField: React.FC<PinSelectFieldProps> = ({
  label,
  value,
  options,
  isEnabled,
  onChange,
  helperText,
}) => {
  return (
    <div className={`space-y-1 transition-opacity ${!isEnabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <label className="font-bold text-gray-700 text-xs block">{label}</label>
        {!isEnabled && (
          <span className="text-[9px] font-semibold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
            Nonaktif
          </span>
        )}
      </div>

      <select
        value={value}
        disabled={!isEnabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-xs text-gray-800 focus:outline-none transition-all ${
          !isEnabled ? 'cursor-not-allowed bg-gray-200/40 text-gray-400' : 'cursor-pointer hover:neo-pressed'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {helperText && <span className="text-[10px] text-gray-400 block">{helperText}</span>}
    </div>
  );
};
