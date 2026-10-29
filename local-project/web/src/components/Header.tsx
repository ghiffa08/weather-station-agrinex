import React, { useState } from 'react';
import { Wifi, Activity, RefreshCw, Radio, Server, Clock } from 'lucide-react';
import { ConnectionMode, ConnectionStatus } from '../types';

interface HeaderProps {
  targetIp: string;
  onIpChange: (ip: string) => void;
  mode: ConnectionMode;
  onModeChange: (mode: ConnectionMode) => void;
  status: ConnectionStatus;
  latencyMs: number | null;
  onReconnect: () => void;
  wifiRssi?: number;
}

export const Header: React.FC<HeaderProps> = ({
  targetIp,
  onIpChange,
  mode,
  onModeChange,
  status,
  latencyMs,
  onReconnect,
  wifiRssi,
}) => {
  const [inputIp, setInputIp] = useState(targetIp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputIp.trim()) {
      onIpChange(inputIp.trim());
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Terhubung (Live)
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Menghubungkan...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Terputus
          </span>
        );
    }
  };

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-800 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Agrinex Sensor Tester
              <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono">ESP8266 v2</span>
            </h1>
            <p className="text-xs text-slate-400">Real-time HTTP Sensor Stream (SSE / REST API)</p>
          </div>
        </div>

        {/* IP Target Input Form & Connection Mode Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 px-2.5 text-slate-400">
              <Wifi className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-mono">IP:</span>
            </div>
            <input
              type="text"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              placeholder="e.g. 192.168.1.50"
              className="bg-transparent text-xs font-mono text-slate-100 focus:outline-none w-32 md:w-36 py-1"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
            >
              Connect
            </button>
          </form>

          {/* Protocol Toggle (SSE vs Polling) */}
          <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            <button
              onClick={() => onModeChange('SSE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mode === 'SSE'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              SSE Stream
            </button>
            <button
              onClick={() => onModeChange('POLLING')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mode === 'POLLING'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              REST Poll
            </button>
          </div>

          {/* Status Badge & Latency */}
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {latencyMs !== null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 text-slate-300 border border-slate-800">
                <Clock className="w-3 h-3 text-sky-400" />
                {latencyMs}ms
              </span>
            )}
            {wifiRssi !== undefined && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 text-emerald-400 border border-slate-800">
                {wifiRssi} dBm
              </span>
            )}
            <button
              onClick={onReconnect}
              title="Manual Reconnect"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
