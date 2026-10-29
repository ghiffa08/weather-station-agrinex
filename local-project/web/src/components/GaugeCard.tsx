import React from 'react';

interface GaugeCardProps {
  title: string;
  value: number | undefined;
  min: number;
  max: number;
  unit: string;
  color: string; // Hex or CSS color
}

export const GaugeCard: React.FC<GaugeCardProps> = ({
  title,
  value = 0,
  min,
  max,
  unit,
  color,
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * (circumference * 0.75); // 270 degree arc

  return (
    <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center relative">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-225" viewBox="0 0 100 100">
          {/* Background Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          {/* Active Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Value Label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold font-mono text-slate-100">{value.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">{unit}</span>
        </div>
      </div>

      <div className="flex justify-between w-full text-[10px] text-slate-400 font-mono mt-1 px-2">
        <span>{min}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};
