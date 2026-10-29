import React from 'react';
import { Card } from './Card';
import type { EtoComparisonResult } from '../../../core/services/EtoCalculator';
import { Droplet, Waves, Sparkles, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface EtoWidgetProps {
  etoResult: EtoComparisonResult | null;
  elevationM: number;
}

export const EtoWidget: React.FC<EtoWidgetProps> = ({ etoResult, elevationM }) => {
  if (!etoResult) {
    return null;
  }

  const isMoreWater = etoResult.deltaEtoMmDay > 0;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-cyan-600 shrink-0" />
            <h3 className="font-extrabold text-gray-800 text-sm sm:text-base">
              Evapotranspirasi Acuan (ETo) &amp; Irigasi
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Model standar <strong>FAO-56 Penman-Monteith</strong> (Elevasi {elevationM} mdpl).
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200/60 text-cyan-800 text-xs font-bold self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span>Smart Drip Agrinex</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
        {/* ETo IoT */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ecf0f7] shadow-[2px_2px_5px_#caced5,-2px_-2px_5px_#ffffff] flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-semibold">ETo Sensor Lapangan (IoT)</span>
          <div className="my-1.5 sm:my-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{etoResult.etoIotMmDay}</span>
            <span className="text-xs font-bold text-gray-500 ml-1.5">mm/hari</span>
          </div>
          <span className="text-[11px] text-gray-400">Mikroklimat kanopi tajuk</span>
        </div>

        {/* ETo BMKG */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ecf0f7] shadow-[2px_2px_5px_#caced5,-2px_-2px_5px_#ffffff] flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-semibold">ETo Referensi BMKG</span>
          <div className="my-1.5 sm:my-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-700 tracking-tight">{etoResult.etoBmkgMmDay}</span>
            <span className="text-xs font-bold text-gray-500 ml-1.5">mm/hari</span>
          </div>
          <span className="text-[11px] text-gray-400">Prakiraan makro regional</span>
        </div>

        {/* Delta ETo */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#e6ecf4] shadow-[inset_3px_3px_6px_#caced5,inset_-3px_-3px_6px_#ffffff] flex flex-col justify-between">
          <span className="text-xs text-gray-600 font-semibold">Disparitas Kehilangan Air (ΔETo)</span>
          <div className="my-1.5 sm:my-2 flex items-baseline">
            <span className={`text-2xl sm:text-3xl font-black ${isMoreWater ? 'text-amber-600' : 'text-emerald-600'}`}>
              {etoResult.deltaEtoMmDay > 0 ? `+${etoResult.deltaEtoMmDay}` : etoResult.deltaEtoMmDay}
            </span>
            <span className="text-xs font-bold text-gray-500 ml-1.5">mm/hari</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold">
            {isMoreWater ? (
              <>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600">Lahan lebih kering</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Lahan lebih lembap</span>
              </>
            )}
          </div>
        </div>

        {/* Selisih Volume Irigasi */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ecf0f7] shadow-[2px_2px_5px_#caced5,-2px_-2px_5px_#ffffff] flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-semibold">Selisih Volume per Hektar</span>
          <div className="my-1.5 sm:my-2">
            <span className="text-xl sm:text-2xl font-black text-cyan-700 tracking-tight">
              {etoResult.deltaVolumeLiterPerHa > 0 ? `+${etoResult.deltaVolumeLiterPerHa.toLocaleString('id-ID')}` : etoResult.deltaVolumeLiterPerHa.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-gray-500 ml-1">L/ha</span>
          </div>
          <span className="text-[11px] text-gray-400">
            Setara {etoResult.deltaVolumeM3PerHa > 0 ? `+${etoResult.deltaVolumeM3PerHa}` : `${etoResult.deltaVolumeM3PerHa}`} m³/ha
          </span>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className={`p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isMoreWater ? 'bg-amber-50 border border-amber-200/80 text-amber-900' : 'bg-emerald-50 border border-emerald-200/80 text-emerald-900'
      }`}>
        <div className="flex items-start sm:items-center gap-2.5">
          <Droplet className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 sm:mt-0 ${isMoreWater ? 'text-amber-600' : 'text-emerald-600'}`} />
          <p className="text-xs font-medium leading-relaxed">
            {etoResult.irrigationAdvisory}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-gray-600" />
          <span>
            {etoResult.smartDripDurationAdjustmentMinutes > 0 ? `+${etoResult.smartDripDurationAdjustmentMinutes}` : etoResult.smartDripDurationAdjustmentMinutes} Menit Siram
          </span>
        </div>
      </div>
    </Card>
  );
};
