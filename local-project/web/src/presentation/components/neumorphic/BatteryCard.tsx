import { Battery, BatteryCharging, BatteryWarning, Zap, ArrowDownRight, ArrowUpRight, Clock, SunMedium } from 'lucide-react';
import { Card } from './Card';
import type { BatteryData } from '../../../core/types/weather.types';
import { calculateBatteryEstimates, LIFEPO4_CHARGING_THRESHOLD_V } from '../../../core/utils/battery.utils';

interface BatteryCardProps {
  battery?: BatteryData;
  voltage?: number;
  currentMa?: number;
  powerMw?: number;
  percentage?: number;
  inaConnected?: boolean;
}

export function BatteryCard({
  battery,
  voltage,
  currentMa,
  powerMw,
  percentage,
  inaConnected = true
}: BatteryCardProps) {
  const v = voltage ?? battery?.voltage ?? 0;
  const i = currentMa ?? battery?.current_ma ?? 0;
  const p = powerMw ?? battery?.power_mw ?? 0;
  
  // Status pengisian solar sejati: tegangan >= 3.45V adalah indikator utama pengisian TP5000 aktif
  const isCharging = (battery?.charging ?? false) || (v >= LIFEPO4_CHARGING_THRESHOLD_V);
  const isOk = (battery?.ok ?? inaConnected) && v > 0.5;
  const pct = Math.max(0, Math.min(100, Math.round(percentage ?? battery?.percentage ?? 0)));

  // Estimasi Cerdas Lengkap (Smartphone-Style Fuel Gauge)
  const estimates = calculateBatteryEstimates(pct, i, isCharging, v);

  return (
    <Card className="flex flex-col justify-between relative overflow-hidden transition-all duration-300">
      {/* Background Subtle Gradient Glow when Charging */}
      {isCharging && (
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none animate-pulse" />
      )}

      {/* Header Widget */}
      <div>
        <div className="flex items-center justify-between border-b border-gray-300/40 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl neo-pressed ${isCharging ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700'}`}>
              {isCharging ? (
                <BatteryCharging size={18} className="animate-pulse" />
              ) : pct <= 20 ? (
                <BatteryWarning size={18} className="text-rose-600 animate-bounce" />
              ) : (
                <Battery size={18} />
              )}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 tracking-tight">Status Daya & Baterai</h3>
              <p className="text-[10px] font-semibold text-emerald-700 font-mono">LiFePO4 3.2V (30 Ah)</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isCharging ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold neo-pressed text-emerald-800 bg-emerald-100/70 shadow-sm animate-pulse">
                <Zap size={11} className="fill-emerald-600 text-emerald-600" />
                Solar Charging
              </span>
            ) : isOk ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold neo-pressed text-gray-700 bg-gray-200/50">
                <ArrowDownRight size={10} className="text-sky-600" />
                Discharging
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neo-pressed text-amber-700 bg-amber-100/60">
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Main Battery Level Display (Smartphone Fuel Gauge Style) */}
        <div className="p-3.5 rounded-2xl neo-pressed mb-3 space-y-2.5">
          <div className="flex justify-between items-baseline">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sisa Baterai</span>
                {isOk && (
                  <span className="text-[10px] font-mono text-gray-600 font-semibold px-1.5 py-0.2 rounded bg-gray-200/60">
                    {estimates.remainingAh} Ah / 30 Ah
                  </span>
                )}
              </div>
              
              {/* Estimasi Waktu (Seperti di Smartphone) */}
              {isOk && (
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {isCharging ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md shadow-xs">
                      <SunMedium size={11} className="text-amber-600 animate-spin" />
                      {estimates.estimateLabel}: <b className="font-mono text-emerald-900">{estimates.estimateValue}</b>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded-md">
                      <Clock size={11} className="text-gray-600" />
                      {estimates.estimateLabel}: <b className="font-mono text-emerald-800">{estimates.estimateValue}</b>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Angka Persentase Besar */}
            <div className="flex items-baseline gap-1 text-right">
              <span className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight ${
                pct <= 20 && !isCharging ? 'text-rose-600' : 'text-gray-900'
              }`}>
                {isOk ? pct : '--'}
              </span>
              <span className="text-base font-bold text-gray-500">%</span>
            </div>
          </div>

          {/* Neumorphic Level Bar */}
          <div className="w-full h-3.5 rounded-full bg-gray-200/90 p-0.5 shadow-inner relative overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${
                isCharging ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400' :
                pct <= 20 ? 'bg-rose-500' :
                pct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${isOk ? pct : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detail Metrics Grid: Tegangan, Arus, Daya */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        {/* Tegangan Bus */}
        <div className="p-2.5 rounded-xl neo-pressed">
          <span className="text-[9px] uppercase font-extrabold text-gray-600 block">Tegangan</span>
          <span className="font-extrabold text-gray-900 text-xs sm:text-sm tabular-nums mt-0.5 block">
            {isOk ? `${v.toFixed(2)}` : '--'} <span className="text-[10px] font-bold text-gray-600">V</span>
          </span>
          <span className="text-[9px] font-medium text-gray-500 block truncate">
            {isCharging ? 'Float 3.6V' : 'LiFePO4 1S'}
          </span>
        </div>

        {/* Arus Masuk / Beban Sistem */}
        <div className="p-2.5 rounded-xl neo-pressed">
          <span className="text-[9px] uppercase font-extrabold text-gray-600 block">Arus</span>
          <span className={`font-extrabold text-xs sm:text-sm tabular-nums mt-0.5 block ${
            isCharging ? 'text-emerald-700' : 'text-gray-900'
          }`}>
            {isOk ? (
              <span className="inline-flex items-center gap-0.5">
                {isCharging ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} className="text-sky-600" />}
                {Math.abs(i).toFixed(0)}
              </span>
            ) : '--'} <span className="text-[10px] font-bold text-gray-600">mA</span>
          </span>
          <span className="text-[9px] font-medium text-gray-500 block truncate">
            {isCharging ? 'Pengisian Solar' : 'Beban Sistem'}
          </span>
        </div>

        {/* Daya Terpakai / Disuplai */}
        <div className="p-2.5 rounded-xl neo-pressed">
          <span className="text-[9px] uppercase font-extrabold text-gray-600 block">Daya</span>
          <span className="font-extrabold text-gray-900 text-xs sm:text-sm tabular-nums mt-0.5 block">
            {isOk ? `${Math.abs(p).toFixed(0)}` : '--'} <span className="text-[10px] font-bold text-gray-600">mW</span>
          </span>
          <span className="text-[9px] font-medium text-gray-500 block truncate">
            {isCharging ? 'TP5000 Solar' : 'Konsumsi ESP'}
          </span>
        </div>
      </div>
    </Card>
  );
}
