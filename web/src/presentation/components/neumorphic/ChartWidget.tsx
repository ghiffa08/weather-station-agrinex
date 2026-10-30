import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, cn } from './Card';
import { BarChart3 } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  Field: number;
  BMKG: number;
}
type TimeRange = '1h' | '1d' | '1w' | '1y';

const TIME_RANGES: { key: TimeRange; short: string; full: string }[] = [
  { key: '1h', short: '1J', full: '1 Jam' },
  { key: '1d', short: '24J', full: '24 Jam' },
  { key: '1w', short: '7H', full: '7 Hari' },
  { key: '1y', short: '30H', full: '30 Hari' },
];

export function ChartWidget({ data, title, fieldKey = 'Field', bmkgKey = 'BMKG', unit = '' }: { 
  data: ChartDataPoint[], 
  title: string,
  fieldKey?: string,
  bmkgKey?: string,
  unit?: string
}) {
  const [activeRange, setActiveRange] = useState<TimeRange>('1h');

  const slicedData = (() => {
    if (!data || data.length === 0) return [];
    switch (activeRange) {
      case '1h': 
        return data.length > 15 ? data.slice(-15) : data;
      case '1d': 
        return data.length > 30 ? data.slice(-30) : data;
      case '1w': 
        return data.length > 60 ? data.slice(-60) : data;
      case '1y': 
        return data;
      default: 
        return data;
    }
  })();

  const safeId = title.replace(/[^a-zA-Z0-9]/g, '');
  const cleanUnit = unit.trim();

  const formatTick = (v: any) => {
    const num = typeof v === 'number' ? v : Number(v);
    if (isNaN(num)) return `${v}`;
    if (cleanUnit === '°C' || cleanUnit === '%') {
      return `${Math.round(num)}${cleanUnit}`;
    }
    return cleanUnit ? `${Math.round(num)} ${cleanUnit}` : `${Math.round(num)}`;
  };

  return (
    <Card className="w-full p-3.5 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <BarChart3 size={15} className="text-gray-800 shrink-0" />
            <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 whitespace-nowrap">
              {title}
            </h3>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[var(--color-neo-text-muted)] truncate">
            Sensor Lapangan vs Model BMKG
          </p>
        </div>

        {/* Time range tabs */}
        <div className="flex rounded-xl shadow-[var(--shadow-neo-pressed)] p-0.5 gap-0.5 shrink-0 bg-[var(--color-neo-bg)]">
          {TIME_RANGES.map(({ key, short, full }) => (
            <button
              key={key}
              type="button"
              title={full}
              onClick={() => setActiveRange(key)}
              className={cn(
                "px-2 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all duration-200 cursor-pointer select-none",
                activeRange === key
                  ? "shadow-[var(--shadow-neo-sm)] text-gray-900 bg-[var(--color-neo-bg)]"
                  : "text-gray-400 hover:text-gray-700"
              )}
            >
              <span className="hidden 2xl:inline">{full}</span>
              <span className="2xl:hidden">{short}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 sm:h-64">
        {(!data || data.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <BarChart3 size={28} className="text-gray-400 mb-1.5 opacity-60" />
            <p className="text-xs font-semibold text-gray-500">Menunggu Deret Data</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Grafik akan terisi otomatis seiring masuknya telemetri.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={slicedData} 
              margin={{ 
                top: 8, 
                right: 12, 
                left: cleanUnit === 'm/s' ? 4 : 0, 
                bottom: 0 
              }}
            >
              <defs>
                <linearGradient id={`grad-f-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111827" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#111827" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id={`grad-b-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25}/>
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
                stroke="#94a3b8" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false}
                tickLine={false}
                width={cleanUnit === 'm/s' ? 48 : 36}
                tickMargin={4}
                domain={cleanUnit === '%' ? [0, 100] : cleanUnit === 'm/s' ? [0, 'auto'] : ['auto', 'auto']}
                tickFormatter={formatTick}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  `${typeof value === 'number' ? value.toFixed(1) : value} ${cleanUnit}`.trim(),
                  name
                ]}
                labelFormatter={(label) => `Waktu: ${label}`}
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
                dot={false} 
                activeDot={{ r: 4, fill: '#111827' }}
              />
              <Area 
                type="monotone" 
                dataKey={bmkgKey}
                name="BMKG" 
                stroke="#94a3b8" 
                strokeWidth={2.5} 
                fill={`url(#grad-b-${safeId})`}
                dot={false} 
                activeDot={{ r: 4, fill: '#94a3b8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
