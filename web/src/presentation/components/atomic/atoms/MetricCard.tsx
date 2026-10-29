import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '../../neumorphic/Card';

interface MetricCardProps {
  title: string;
  value?: number;
  unit: string;
  icon: React.ReactNode;
  subtitle?: string;
  isAvailable?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  subtitle,
  isAvailable = true,
}) => {
  return (
    <Card className="flex items-center justify-between p-3.5 sm:p-4 hover:shadow-[var(--shadow-neo-pressed)] cursor-default transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center neo-pressed shrink-0 text-gray-700">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-muted)]">
            {title}
          </p>
          {subtitle && <p className="text-[9px] text-gray-400">{subtitle}</p>}
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-2xl font-extrabold text-gray-800 tabular-nums">
              {!isAvailable ? 'ERR' : value !== undefined ? value.toFixed(1) : '--'}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500">{unit}</span>
          </div>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 shrink-0" />
    </Card>
  );
};
