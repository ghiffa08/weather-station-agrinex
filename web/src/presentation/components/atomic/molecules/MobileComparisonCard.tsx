import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MobileComparisonCardProps {
  label: string;
  fieldVal?: number;
  bmkgVal?: number;
  delta: { value: number; pct: number };
  icon: React.ReactNode;
}

export const MobileComparisonCard: React.FC<MobileComparisonCardProps> = ({
  label,
  fieldVal,
  bmkgVal,
  delta,
  icon,
}) => {
  const DeltaIcon = delta.value > 0.3 ? TrendingUp : delta.value < -0.3 ? TrendingDown : Minus;

  return (
    <div className="p-3 rounded-2xl neo-pressed flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-bold text-gray-700">{label}</span>
        </div>
        <span className="text-xs font-bold tabular-nums flex items-center gap-0.5 text-gray-700">
          <DeltaIcon size={11} />
          Δ {delta.value > 0 ? '+' : ''}{delta.value} ({delta.pct}%)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-gray-300/30 flex justify-between items-center">
          <span className="text-[10px] text-gray-500 font-medium">⚫ Sensor</span>
          <span className="font-extrabold text-gray-900 tabular-nums">
            {fieldVal !== undefined ? fieldVal.toFixed(1) : '--'}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-gray-200/50 flex justify-between items-center">
          <span className="text-[10px] text-gray-500 font-medium">⚪ BMKG</span>
          <span className="font-extrabold text-gray-600 tabular-nums">
            {bmkgVal !== undefined ? bmkgVal.toFixed(1) : '--'}
          </span>
        </div>
      </div>
    </div>
  );
};
