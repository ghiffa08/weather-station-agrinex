import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChartHistoryPoint } from '../types';
import { LineChart as LineChartIcon, Thermometer, Sun } from 'lucide-react';

interface RealtimeChartProps {
  data: ChartHistoryPoint[];
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tempHum' | 'lightWind'>('all');

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <LineChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Grafik Uji Coba Real-time</h2>
            <p className="text-xs text-slate-400">Stream data telemetry live ({data.length} sampel)</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTab === 'all' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua Metrics
          </button>
          <button
            onClick={() => setActiveTab('tempHum')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTab === 'tempHum' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" /> Temp & Hum
          </button>
          <button
            onClick={() => setActiveTab('lightWind')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTab === 'lightWind' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Cahaya & Angin
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            Menunggu data stream masuk...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeStr" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              {(activeTab === 'all' || activeTab === 'tempHum') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Suhu (°C)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name="Kelembaban (%)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}
              {(activeTab === 'all' || activeTab === 'lightWind') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="windSpeed"
                    name="Angin (km/h)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lightLux"
                    name="Cahaya (Lux)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
