import React from 'react';
import { LucideIcon, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | undefined;
  unit: string;
  icon: LucideIcon;
  colorScheme: 'rose' | 'sky' | 'amber' | 'emerald' | 'indigo';
  sensorOk?: boolean;
  subtitle?: string;
  precision?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  colorScheme,
  sensorOk = true,
  subtitle,
  precision = 1,
}) => {
  const getThemeClasses = () => {
    switch (colorScheme) {
      case 'rose':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          accentText: 'text-rose-400',
          glow: 'group-hover:shadow-rose-500/10',
          border: 'border-rose-500/20',
        };
      case 'sky':
        return {
          iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          accentText: 'text-sky-400',
          glow: 'group-hover:shadow-sky-500/10',
          border: 'border-sky-500/20',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          accentText: 'text-amber-400',
          glow: 'group-hover:shadow-amber-500/10',
          border: 'border-amber-500/20',
        };
      case 'indigo':
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          accentText: 'text-indigo-400',
          glow: 'group-hover:shadow-indigo-500/10',
          border: 'border-indigo-500/20',
        };
      default:
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          accentText: 'text-emerald-400',
          glow: 'group-hover:shadow-emerald-500/10',
          border: 'border-emerald-500/20',
        };
    }
  };

  const theme = getThemeClasses();
  const displayVal = value !== undefined ? value.toFixed(precision) : '--';

  return (
    <div className={`glass-card group p-5 rounded-2xl relative overflow-hidden ${theme.glow}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-slate-100 tracking-tight font-mono">
          {displayVal}
        </span>
        <span className={`text-sm font-semibold ${theme.accentText}`}>{unit}</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <span className="text-slate-400">{subtitle || 'Real-time Feed'}</span>
        {sensorOk ? (
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sensor Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-rose-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Check Hardware
          </span>
        )}
      </div>
    </div>
  );
};
