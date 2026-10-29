import React from 'react';
import { Award, Waves, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import type { ComprehensiveBenchmarkReport } from '../../../core/services/BenchmarkCalculator';
import type { EtoComparisonResult } from '../../../core/services/EtoCalculator';

interface AnalyticsKpiGridProps {
  benchmarkReport: ComprehensiveBenchmarkReport | null;
  etoResult: EtoComparisonResult | null;
  totalPoints: number;
}

export const AnalyticsKpiGrid: React.FC<AnalyticsKpiGridProps> = ({
  benchmarkReport,
  etoResult,
  totalPoints,
}) => {
  const hasBenchmark = benchmarkReport !== null && totalPoints >= 2;
  const tempPearson = benchmarkReport?.temperature?.pearsonR;
  const tempMae = benchmarkReport?.temperature?.mae;
  const tempRmse = benchmarkReport?.temperature?.rmse;
  const statusLabel = benchmarkReport?.temperature?.status ?? 'Menunggu Akumulasi';

  const hasEto = etoResult !== null && typeof etoResult.etoIotMmDay === 'number';
  const etoVal = etoResult?.etoIotMmDay;
  const waterReq = etoResult?.etoIotMmDay;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {/* KPI 1: Status Validasi Sensor */}
      <div className="p-4 rounded-2xl neo-flat flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
            Validasi Sensor
          </span>
          <div className="p-1.5 rounded-xl neo-pressed text-emerald-600">
            <Award size={16} />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            <span>{hasBenchmark ? statusLabel : 'Mengumpulkan Data'}</span>
            {hasBenchmark ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={18} className="text-amber-500 shrink-0 animate-spin" />
            )}
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
            {hasBenchmark 
              ? `Standar WMO (${totalPoints} titik)` 
              : `${totalPoints} titik tersinkronisasi`}
          </p>
        </div>
        <div className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md self-start">
          {hasBenchmark ? `RMSE Suhu: ${tempRmse?.toFixed(1)} °C` : 'Evaluasi 15m'}
        </div>
      </div>

      {/* KPI 2: Korelasi Spektral */}
      <div className="p-4 rounded-2xl neo-flat flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
            Korelasi Lapangan-BMKG
          </span>
          <div className="p-1.5 rounded-xl neo-pressed text-sky-600">
            <TrendingUp size={16} />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-sky-700 tracking-tight">
            {hasBenchmark && tempPearson !== undefined ? `r = ${tempPearson.toFixed(2)}` : 'r = --'}
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
            {hasBenchmark && tempMae !== undefined ? `MAE Rata-rata: ±${tempMae.toFixed(1)} °C` : 'Menghitung galat...'}
          </p>
        </div>
        <div className="text-[10px] font-mono font-semibold text-sky-700 bg-sky-500/10 px-2 py-0.5 rounded-md self-start">
          {hasBenchmark 
            ? (tempPearson !== undefined && tempPearson >= 0.8
                ? 'Korelasi Sangat Kuat'
                : tempPearson !== undefined && tempPearson >= 0.5
                ? 'Korelasi Moderat'
                : tempPearson !== undefined && tempPearson > 0
                ? 'Korelasi Lemah'
                : 'Fluktuasi Datar (r = 0.0)')
            : 'Menunggu deret waktu'}
        </div>
      </div>

      {/* KPI 3: Evapotranspirasi Acuan */}
      <div className="p-4 rounded-2xl neo-flat flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
            Evapotranspirasi (ETo)
          </span>
          <div className="p-1.5 rounded-xl neo-pressed text-cyan-600">
            <Waves size={16} />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {hasEto && etoVal !== undefined ? (
              <>
                {etoVal.toFixed(2)} <span className="text-xs font-bold text-gray-500">mm/hari</span>
              </>
            ) : (
              <span className="text-gray-400">-- <span className="text-xs">mm/hari</span></span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
            FAO-56 Penman-Monteith
          </p>
        </div>
        <div className="text-[10px] font-mono font-semibold text-cyan-700 bg-cyan-500/10 px-2 py-0.5 rounded-md self-start">
          {hasEto ? 'Radiasi Mikro-Kanopi' : 'Kalkulasi radiasi surya'}
        </div>
      </div>

      {/* KPI 4: Kebutuhan Irigasi */}
      <div className="p-4 rounded-2xl neo-flat flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
            Kebutuhan Air Irigasi
          </span>
          <div className="p-1.5 rounded-xl neo-pressed text-purple-600">
            <Waves size={16} />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
            {hasEto && waterReq !== undefined ? (
              <>
                {waterReq.toFixed(1)} <span className="text-xs font-bold text-gray-500">L/m²/hari</span>
              </>
            ) : (
              <span className="text-gray-400">-- <span className="text-xs">L/m²/hari</span></span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
            Rekomendasi Drip / Sprinkler
          </p>
        </div>
        <div className="text-[10px] font-mono font-semibold text-purple-700 bg-purple-500/10 px-2 py-0.5 rounded-md self-start">
          {hasEto ? 'Efisiensi Irigasi 90%' : 'Menunggu data lapangan'}
        </div>
      </div>
    </div>
  );
};
