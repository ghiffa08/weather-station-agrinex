import React from 'react';
import { TelemetryData } from '../types';
import { Cpu, HardDrive, Wifi, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

interface DiagnosticPanelProps {
  telemetry: TelemetryData | null;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({ telemetry }) => {
  if (!telemetry) {
    return (
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-mono">
        Menunggu status diagnostik dari hardware ESP8266...
      </div>
    );
  }

  const { status, free_heap, uptime_sec, wifi_rssi, raw_pulses } = telemetry;
  const freeHeapKb = (free_heap / 1024).toFixed(1);
  const uptimeMin = Math.floor(uptime_sec / 60);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100">Diagnostik Hardware ESP8266</h2>
          <p className="text-xs text-slate-400">Health Check & Status Sensor Live</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* DHT22 Status */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">DHT22 Temp/Hum</div>
            <div className="text-[10px] text-slate-400 font-mono">Pin D4 (GPIO2)</div>
          </div>
          {status.dht22 ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" /> OK
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Error
            </span>
          )}
        </div>

        {/* BH1750 Status */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">BH1750 Light</div>
            <div className="text-[10px] text-slate-400 font-mono">I2C 0x23 (D1/D2)</div>
          </div>
          {status.bh1750 ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" /> OK
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Error
            </span>
          )}
        </div>

        {/* Anemometer Status */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Anemometer Interrupt</div>
            <div className="text-[10px] text-slate-400 font-mono">Pulses: {raw_pulses} (D3)</div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
            <Activity className="w-3.5 h-3.5" /> Active
          </span>
        </div>

        {/* Free RAM Heap */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">Free Heap RAM</div>
              <div className="text-[10px] text-slate-400 font-mono">{free_heap} bytes</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-purple-300">{freeHeapKb} KB</span>
        </div>

        {/* Uptime */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">System Uptime</div>
            <div className="text-[10px] text-slate-400 font-mono">{uptime_sec} detik</div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">{uptimeMin} menit</span>
        </div>

        {/* WiFi RSSI */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">Sinyal WiFi</div>
              <div className="text-[10px] text-slate-400 font-mono">RSSI Power</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">{wifi_rssi} dBm</span>
        </div>
      </div>
    </div>
  );
};
