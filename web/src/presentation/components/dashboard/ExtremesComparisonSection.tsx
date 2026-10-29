import React from 'react';
import { Thermometer, Snowflake, Flame, ArrowUpDown } from 'lucide-react';
import { Card } from '../neumorphic/Card';

export type TimeframeMode = 'day' | 'week' | 'month';

interface DeltaResult {
  value: number;
  pct: number;
}

export interface TempMinMaxComparisonData {
  nodeMin?: number;
  nodeMax?: number;
  bmkgMin?: number;
  bmkgMax?: number;
  minDelta: DeltaResult;
  maxDelta: DeltaResult;
  nodeRange?: number;
  bmkgRange?: number;
  rangeDelta: DeltaResult;
}

interface ExtremesComparisonSectionProps {
  timeframe: TimeframeMode;
  onTimeframeChange: (newTimeframe: TimeframeMode) => void;
  data: TempMinMaxComparisonData;
}

export const ExtremesComparisonSection: React.FC<ExtremesComparisonSectionProps> = ({
  timeframe,
  onTimeframeChange,
  data,
}) => {
  return (
    <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-300/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl neo-pressed flex items-center justify-center text-gray-700">
              <Thermometer size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-800">
                Suhu Ekstrem (T-Min &amp; T-Max)
              </h2>
              <p className="text-[10px] text-gray-500 font-medium">
                Komparasi suhu ekstrem harian
              </p>
            </div>
          </div>

          {/* Timeframe Filter Tabs */}
          <div className="flex items-center p-1 rounded-2xl neo-pressed bg-[var(--color-neo-bg)] gap-1 self-start sm:self-auto">
            <button
              onClick={() => onTimeframeChange('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                timeframe === 'day' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => onTimeframeChange('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                timeframe === 'week' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => onTimeframeChange('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                timeframe === 'month' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-[var(--color-neo-text-muted)] text-[10px] uppercase tracking-wider border-b border-gray-300/40">
                <th className="text-left py-2 pr-1 font-bold">Metrik</th>
                <th className="text-center py-2 px-1 font-bold">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-900"></span> Sensor
                  </span>
                </th>
                <th className="text-center py-2 px-1 font-bold">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span> BMKG
                  </span>
                </th>
                <th className="text-center py-2 px-1 font-bold">Selisih</th>
                <th className="text-center py-2 pl-1 font-bold">Galat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300/30">
              {/* T-Min Row */}
              <tr className="hover:bg-white/30 transition-colors">
                <td className="py-2.5 pr-1 font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                      <Snowflake size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 block text-xs sm:text-sm">T-Min</span>
                      <span className="hidden sm:block text-[9px] text-gray-400">Suhu terendah</span>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-1 text-center font-extrabold text-blue-800 text-xs sm:text-sm tabular-nums">
                  {data.nodeMin !== undefined ? `${data.nodeMin.toFixed(1)}°C` : '--'}
                </td>
                <td className="py-2.5 px-1 text-center font-extrabold text-gray-600 text-xs sm:text-sm tabular-nums">
                  {data.bmkgMin !== undefined ? `${data.bmkgMin.toFixed(1)}°C` : '--'}
                </td>
                <td className="py-2.5 px-1 text-center font-bold tabular-nums text-gray-700 text-xs">
                  {data.minDelta.value > 0 ? '+' : ''}{data.minDelta.value}°C
                </td>
                <td className="py-2.5 pl-1 text-center font-bold tabular-nums text-gray-600 text-xs">
                  {data.minDelta.pct}%
                </td>
              </tr>

              {/* T-Max Row */}
              <tr className="hover:bg-white/30 transition-colors">
                <td className="py-2.5 pr-1 font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Flame size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 block text-xs sm:text-sm">T-Max</span>
                      <span className="hidden sm:block text-[9px] text-gray-400">Suhu tertinggi</span>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-1 text-center font-extrabold text-amber-800 text-xs sm:text-sm tabular-nums">
                  {data.nodeMax !== undefined ? `${data.nodeMax.toFixed(1)}°C` : '--'}
                </td>
                <td className="py-2.5 px-1 text-center font-extrabold text-gray-600 text-xs sm:text-sm tabular-nums">
                  {data.bmkgMax !== undefined ? `${data.bmkgMax.toFixed(1)}°C` : '--'}
                </td>
                <td className="py-2.5 px-1 text-center font-bold tabular-nums text-gray-700 text-xs">
                  {data.maxDelta.value > 0 ? '+' : ''}{data.maxDelta.value}°C
                </td>
                <td className="py-2.5 pl-1 text-center font-bold tabular-nums text-gray-600 text-xs">
                  {data.maxDelta.pct}%
                </td>
              </tr>

              {/* Rentang Suhu (Fluktuasi Diurnal) Row */}
              <tr className="hover:bg-white/30 transition-colors bg-gray-100/40">
                <td className="py-2.5 pr-1 font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
                      <ArrowUpDown size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 block text-xs sm:text-sm">Diurnal (ΔT)</span>
                      <span className="hidden sm:block text-[9px] text-gray-400">Rentang fluktuasi</span>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-1 text-center font-extrabold text-purple-800 text-xs sm:text-sm tabular-nums">
                  {data.nodeRange !== undefined ? `${data.nodeRange.toFixed(1)}°C` : '--'}
                </td>
                <td className="py-2.5 px-1 text-center font-extrabold text-gray-600 text-xs sm:text-sm tabular-nums">
                  {data.bmkgRange !== undefined ? `${data.bmkgRange.toFixed(1)}°C` : '--'}
                </td>
                <td className="py-2.5 px-1 text-center font-bold tabular-nums text-gray-700 text-xs">
                  {data.rangeDelta.value > 0 ? '+' : ''}{data.rangeDelta.value}°C
                </td>
                <td className="py-2.5 pl-1 text-center font-bold tabular-nums text-gray-600 text-xs">
                  {data.rangeDelta.pct}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};
