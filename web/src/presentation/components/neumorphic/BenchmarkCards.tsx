import React from 'react';
import { Card } from './Card';
import type { ComprehensiveBenchmarkReport, VariableMetrics } from '../../../core/services/BenchmarkCalculator';
import { Award, HelpCircle } from 'lucide-react';

interface BenchmarkCardsProps {
  report: ComprehensiveBenchmarkReport | null;
  totalPoints: number;
}

export const BenchmarkCards: React.FC<BenchmarkCardsProps> = ({ report, totalPoints }) => {
  if (!report || totalPoints < 2) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <HelpCircle className="w-5 h-5 text-gray-400" />
          <p className="text-sm">
            Menunggu akumulasi minimal 2 titik data komparasi berpasangan untuk menghitung metrik statistik validasi akurasi (MAE, RMSE, Pearson r).
          </p>
        </div>
      </Card>
    );
  }

  const renderMetricRow = (
    title: string,
    unit: string,
    metrics: VariableMetrics
  ) => {
    const isOver = metrics.mbe > 0.1;
    const isUnder = metrics.mbe < -0.1;

    return (
      <div className="p-4 rounded-2xl bg-[#e6ecf4] shadow-[inset_3px_3px_6px_#caced5,inset_-3px_-3px_6px_#ffffff] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{title}</span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
            metrics.status === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-700' :
            metrics.status === 'Baik' ? 'bg-blue-100 text-blue-700' :
            metrics.status === 'Cukup' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {metrics.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="p-2 rounded-xl bg-[#ecf0f7] shadow-[2px_2px_4px_#caced5,-2px_-2px_4px_#ffffff]">
            <span className="text-[10px] text-gray-400 block">MAE (Rata-rata Selisih)</span>
            <span className="font-extrabold text-gray-800 text-sm">±{metrics.mae} {unit}</span>
          </div>
          <div className="p-2 rounded-xl bg-[#ecf0f7] shadow-[2px_2px_4px_#caced5,-2px_-2px_4px_#ffffff]">
            <span className="text-[10px] text-gray-400 block">RMSE (Penalti Ekstrem)</span>
            <span className="font-extrabold text-gray-800 text-sm">{metrics.rmse} {unit}</span>
          </div>
          <div className="p-2 rounded-xl bg-[#ecf0f7] shadow-[2px_2px_4px_#caced5,-2px_-2px_4px_#ffffff]">
            <span className="text-[10px] text-gray-400 block">Korelasi Pearson (r)</span>
            <span className={`font-extrabold text-sm ${metrics.pearsonR >= 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {metrics.pearsonR}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-[#ecf0f7] shadow-[2px_2px_4px_#caced5,-2px_-2px_4px_#ffffff]">
            <span className="text-[10px] text-gray-400 block">Index Agreement (d)</span>
            <span className="font-extrabold text-gray-800 text-sm">{metrics.indexOfAgreement}</span>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-200/60 flex items-center justify-between">
          <span>Bias (MBE):</span>
          <span className={`font-semibold ${isOver ? 'text-amber-600' : isUnder ? 'text-blue-600' : 'text-gray-600'}`}>
            {metrics.mbe > 0 ? `+${metrics.mbe}` : metrics.mbe} {unit}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500 shrink-0" />
            <h3 className="font-extrabold text-gray-800 text-sm sm:text-base">
              Benchmark Validasi Akurasi Ilmiah
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Evaluasi komparasi {totalPoints} titik waktu berpasangan Sensor IoT (Agrinex) vs BMKG.
          </p>
        </div>
        <div className="px-3 py-1 rounded-xl bg-[#ecf0f7] shadow-[inset_2px_2px_4px_#caced5,inset_-2px_-2px_4px_#ffffff] text-xs font-bold text-gray-600 self-start sm:self-auto shrink-0">
          WMO &amp; FAO-56
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderMetricRow('Suhu Udara (DHT22)', '°C', report.temperature)}
        {renderMetricRow('Kelembapan Relatif (DHT22)', '%', report.humidity)}
        {renderMetricRow('Kecepatan Angin (Anemometer u2)', 'm/s', report.windSpeed)}
      </div>
    </Card>
  );
};
