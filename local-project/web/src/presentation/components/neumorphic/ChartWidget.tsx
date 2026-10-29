import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, cn } from './Card';
import { BarChart3, Activity } from 'lucide-react';

export interface ChartDataPoint {
  time: string;
  Field: number;
  BMKG: number;
}

type TimeRange = '1h' | '1d' | '1w' | '1y';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': '1 Jam',
  '1d': '1 Hari',
  '1w': '1 Minggu',
  '1y': '1 Tahun',
};

export function ChartWidget({ data, title, fieldKey = 'Field', bmkgKey = 'BMKG', unit = '' }: { 
  data: ChartDataPoint[], 
  title: string,
  fieldKey?: string,
  bmkgKey?: string,
  unit?: string
}) {
  const [activeRange, setActiveRange] = useState<TimeRange>('1h');

  const slicedData = useMemo(() => {
    switch (activeRange) {
      case '1h': return data;
      case '1d': return data.slice(-25);
      case '1w': return data.slice(-15);
      case '1y': return data.slice(-10);
      default: return data;
    }
  }, [data, activeRange]);

  const latestPoint = useMemo(() => {
    if (slicedData.length === 0) return null;
    return slicedData[slicedData.length - 1];
  }, [slicedData]);

  // Calculate dynamic Y-axis min/max to highlight small real-time fluctuations
  const yDomain = useMemo(() => {
    if (slicedData.length === 0) return ['auto', 'auto'];
    const fieldVals = slicedData.map(d => d.Field).filter(v => typeof v === 'number' && !isNaN(v));
    const bmkgVals = slicedData.map(d => d.BMKG).filter(v => typeof v === 'number' && !isNaN(v));
    const allVals = [...fieldVals, ...bmkgVals];
    if (allVals.length === 0) return ['auto', 'auto'];

    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const padding = Math.max((max - min) * 0.15, 1);
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [slicedData]);

  const safeId = title.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <Card className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart3 size={16} className="text-gray-800" />
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            {/* Live Indicator Pulse */}
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full neo-pressed">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              REALTIME LIVE
            </span>
          </div>

          {/* Latest Real-time Values Badge Bar */}
          <div className="flex items-center gap-3 text-xs text-[var(--color-neo-text-muted)] mt-1 font-mono">
            <span>
              Sensor: <strong className="text-gray-900 font-extrabold">{latestPoint ? `${latestPoint.Field.toFixed(1)}${unit}` : '--'}</strong>
            </span>
            <span>|</span>
            <span>
              BMKG: <strong className="text-gray-600 font-extrabold">{latestPoint ? `${latestPoint.BMKG.toFixed(1)}${unit}` : '--'}</strong>
            </span>
          </div>
        </div>

        {/* Time range tabs */}
        <div className="flex rounded-xl shadow-[var(--shadow-neo-pressed)] p-1 gap-0.5 self-start sm:self-auto">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 cursor-pointer",
                activeRange === range
                  ? "shadow-[var(--shadow-neo-sm)] text-gray-900 bg-[var(--color-neo-bg)]"
                  : "text-gray-400 hover:text-gray-700"
              )}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 sm:h-64">
        {slicedData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs font-mono gap-2">
            <Activity className="w-5 h-5 animate-pulse text-gray-400" />
            <span>Menunggu data stream real-time...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={slicedData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-f-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111827" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#111827" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id={`grad-b-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={yDomain}
                stroke="#94a3b8" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}${unit}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#e0e5ec', 
                  borderRadius: '12px', 
                  boxShadow: '4px 4px 8px rgba(163,177,198,0.5), -4px -4px 8px rgba(255,255,255, 0.5)',
                  border: 'none',
                  color: '#1f2937',
                  fontSize: '12px',
                  padding: '8px 14px'
                }} 
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
              <Area 
                type="monotone" 
                dataKey={fieldKey}
                name="Sensor Lapangan" 
                stroke="#111827" 
                strokeWidth={2.5} 
                fill={`url(#grad-f-${safeId})`}
                isAnimationActive={false}
                dot={false} 
                activeDot={{ r: 5, fill: '#111827' }}
              />
              <Area 
                type="monotone" 
                dataKey={bmkgKey}
                name="BMKG" 
                stroke="#94a3b8" 
                strokeWidth={2.5} 
                fill={`url(#grad-b-${safeId})`}
                isAnimationActive={false}
                dot={false} 
                activeDot={{ r: 5, fill: '#94a3b8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
