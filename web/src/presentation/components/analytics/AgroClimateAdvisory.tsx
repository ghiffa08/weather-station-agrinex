import React from 'react';
import { Sparkles, Droplets, Wind, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import type { WeatherTelemetry } from '../../../core/types/weather.types';

interface AgroClimateAdvisoryProps {
  fieldData: WeatherTelemetry | null;
  etoMmDay?: number;
}

export const AgroClimateAdvisory: React.FC<AgroClimateAdvisoryProps> = ({
  fieldData,
  etoMmDay,
}) => {
  const hasTemp = fieldData && typeof fieldData.temperature === 'number' && !isNaN(fieldData.temperature);
  const hasHum = fieldData && typeof fieldData.humidity === 'number' && !isNaN(fieldData.humidity);
  const hasWind = fieldData && typeof fieldData.wind_speed === 'number' && !isNaN(fieldData.wind_speed);

  const temp = hasTemp ? fieldData.temperature : undefined;
  const rh = hasHum ? fieldData.humidity : undefined;
  const windKmh = hasWind ? fieldData.wind_speed : undefined;

  // Vapor Pressure Deficit (VPD in kPa)
  let vpd: number | undefined = undefined;
  let vpdStatus = { 
    label: 'Menunggu Data', 
    color: 'text-gray-600 bg-gray-500/10 border-gray-500/20', 
    note: 'Menunggu telemetri suhu dan kelembapan dari stasiun lapangan.' 
  };

  if (temp !== undefined && rh !== undefined && temp > -20 && rh > 0) {
    const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const ea = es * (rh / 100);
    vpd = Math.max(0, es - ea);

    if (vpd < 0.4) {
      vpdStatus = { 
        label: 'Lembap Berlebih', 
        color: 'text-amber-700 bg-amber-500/10 border-amber-500/20', 
        note: 'Transpirasi lambat. Waspadai risiko infeksi cendawan/jamur pada daun basah.' 
      };
    } else if (vpd > 1.2) {
      vpdStatus = { 
        label: 'Stres Transpirasi', 
        color: 'text-rose-700 bg-rose-500/10 border-rose-500/20', 
        note: 'Udara terlalu kering. Tanaman menutup stomata untuk cegah dehidrasi.' 
      };
    } else {
      vpdStatus = { 
        label: 'Optimal', 
        color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', 
        note: 'Stomata tanaman terbuka sempurna untuk penyerapan hara dan fotosintesis.' 
      };
    }
  }

  // Spraying safety
  const canSpray = windKmh !== undefined ? windKmh < 12 : undefined;

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-300/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl neo-pressed text-emerald-700 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight">
              Panduan Agroklimat &amp; Rekomendasi Budidaya
            </h3>
            <p className="text-xs text-gray-500">
              Rekomendasi mikroklimat presisi untuk fertigasi, irigasi, dan proteksi tanaman.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full neo-pressed text-sky-800 font-bold self-start sm:self-auto shrink-0">
          Model Agrinex
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Advisory 1: VPD / Stres Transpirasi */}
        <div className="p-4 rounded-2xl neo-pressed space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Droplets size={14} className="text-sky-600" />
                Vapor Pressure Deficit (VPD)
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${vpdStatus.color}`}>
                {vpdStatus.label}
              </span>
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight pt-1">
              {vpd !== undefined ? (
                <>
                  {vpd.toFixed(2)} <span className="text-xs font-semibold text-gray-500">kPa</span>
                </>
              ) : (
                <span className="text-gray-400">-- <span className="text-xs">kPa</span></span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {vpdStatus.note}
            </p>
          </div>
          <div className="text-[10px] text-gray-500 border-t border-gray-300/30 pt-1.5 font-medium">
            Suhu daun estimasi: <strong>{temp !== undefined ? `${(temp - 1.2).toFixed(1)}°C` : '--'}</strong>
          </div>
        </div>

        {/* Advisory 2: Jadwal Irigasi Presisi */}
        <div className="p-4 rounded-2xl neo-pressed space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Droplets size={14} className="text-cyan-600" />
                Jadwal Irigasi Presisi
              </span>
              {etoMmDay !== undefined ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-800 border border-cyan-500/20">
                  {etoMmDay.toFixed(1)} mm/d
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  -- mm/d
                </span>
              )}
            </div>
            <div className="text-base font-extrabold text-gray-900 tracking-tight pt-1">
              06:30 - 08:30 WIB <span className="text-xs font-normal text-gray-500">&amp; Sore</span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Penyiraman pagi memaksimalkan serapan hara saat bukaan stomata puncak dan menekan kehilangan air akibat evaporasi terik siang hari.
            </p>
          </div>
          <div className="text-[10px] text-gray-500 border-t border-gray-300/30 pt-1.5 font-medium">
            Volume: <strong>{etoMmDay !== undefined ? `${(etoMmDay * 10).toFixed(0)} m³/hektar/hari` : 'Menunggu kalkulasi ETo'}</strong>
          </div>
        </div>

        {/* Advisory 3: Proteksi Semprot & Pestisida */}
        <div className="p-4 rounded-2xl neo-pressed space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Wind size={14} className="text-purple-600" />
                Kondisi Aplikasi Semprot
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                canSpray === true ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' :
                canSpray === false ? 'bg-rose-500/10 text-rose-800 border-rose-500/20' :
                'bg-gray-200 text-gray-600 border-gray-300'
              }`}>
                {canSpray === true ? 'Aman (Ideal)' : canSpray === false ? 'Waspada Drift' : 'Sensor Angin Offline'}
              </span>
            </div>
            <div className="text-base font-extrabold text-gray-900 tracking-tight pt-1 flex items-center gap-1.5">
              <span>{windKmh !== undefined ? `${windKmh.toFixed(1)} km/jam` : '-- km/jam'}</span>
              {canSpray === true ? (
                <ShieldCheck size={16} className="text-emerald-600" />
              ) : canSpray === false ? (
                <AlertCircle size={16} className="text-rose-600" />
              ) : (
                <HelpCircle size={16} className="text-gray-400" />
              )}
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {canSpray === true
                ? 'Kecepatan angin rendah (< 12 km/jam), sangat minim resiko kabut droplet terbawa angin (spray drift).'
                : canSpray === false
                ? 'Kecepatan angin melebihi ambang batas aman. Tunda penyemprotan pestisida/pupuk daun.'
                : 'Data anemometer belum terdeteksi. Pastikan tiang sensor angin terpasang.'}
            </p>
          </div>
          <div className="text-[10px] text-gray-500 border-t border-gray-300/30 pt-1.5 font-medium">
            Kelembapan kanopi: <strong>{rh !== undefined ? `${rh.toFixed(0)}%` : '--'}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
};
