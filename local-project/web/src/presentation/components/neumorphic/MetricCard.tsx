import React from 'react';
import { Card } from './Card';

interface MetricCardProps {
  title: string;
  value?: number;
  unit: string;
  icon: React.ReactNode;
  subtitle?: string;
  isAvailable?: boolean;
}

export function MetricCard({ title, value, unit, icon, subtitle, isAvailable = true }: MetricCardProps) {
  const hasValue = isAvailable && value !== undefined && !isNaN(value);

  return (
    <Card className="flex flex-col justify-between h-full">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-[var(--color-neo-text-muted)] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight tabular-nums">
            {hasValue ? value.toFixed(1) : '--'}
            <span className="text-sm font-semibold text-gray-500 ml-1">{unit}</span>
          </div>
        </div>
        <div className="p-3 rounded-2xl neo-pressed text-gray-700">
          {icon}
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium pt-3 mt-2 border-t border-gray-300/30">
        <span>{subtitle || ''}</span>
        {!hasValue && (
          <span className="px-2 py-0.5 rounded-full font-bold text-amber-700 bg-amber-100/70">
            Standby / Testing
          </span>
        )}
      </div>
    </Card>
  );
}
