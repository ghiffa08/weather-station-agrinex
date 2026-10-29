import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonRowProps {
  label: string;
  fieldVal?: number;
  bmkgVal?: number;
  delta: { value: number; pct: number };
}

export const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  fieldVal,
  bmkgVal,
  delta,
}) => {
  const DeltaIcon = delta.value > 0.3 ? TrendingUp : delta.value < -0.3 ? TrendingDown : Minus;

  return (
    <tr className="hover:bg-white/30 transition-colors text-xs sm:text-sm">
      <td className="py-2.5 pr-2 font-medium text-gray-700">{label}</td>
      <td className="py-2.5 px-2 text-center font-bold text-gray-900 tabular-nums whitespace-nowrap">
        {fieldVal !== undefined ? fieldVal.toFixed(1) : '--'}
      </td>
      <td className="py-2.5 px-2 text-center font-bold text-gray-500 tabular-nums whitespace-nowrap">
        {bmkgVal !== undefined ? bmkgVal.toFixed(1) : '--'}
      </td>
      <td className="py-2.5 px-2 text-center font-bold tabular-nums whitespace-nowrap text-gray-700">
        <span className="inline-flex items-center gap-0.5">
          <DeltaIcon size={12} />
          {delta.value > 0 ? '+' : ''}{delta.value}
        </span>
      </td>
      <td className="py-2.5 pl-2 text-center font-semibold tabular-nums whitespace-nowrap text-gray-600">
        {delta.pct}%
      </td>
    </tr>
  );
};
