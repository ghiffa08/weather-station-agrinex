import React from 'react';
import { FileSpreadsheet, FileJson, Download } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import type { WeatherTelemetry } from '../../../core/types/weather.types';
import { downloadTelemetryCsv, downloadTelemetryJson } from '../../../core/utils/export.utils';

interface ExportCenterSectionProps {
  telemetryLogs: WeatherTelemetry[];
  onNotice?: (msg: string) => void;
}

export const ExportCenterSection: React.FC<ExportCenterSectionProps> = ({
  telemetryLogs,
  onNotice
}) => {
  const triggerExportCsv = () => {
    downloadTelemetryCsv(telemetryLogs);
    onNotice?.(`Berhasil mengekspor ${telemetryLogs.length} data telemetry ke format CSV.`);
  };

  const triggerExportJson = () => {
    downloadTelemetryJson(telemetryLogs);
    onNotice?.(`Berhasil mengekspor ${telemetryLogs.length} data telemetry ke format JSON.`);
  };

  return (
    <Card className="space-y-5 animate-fade-in">
      <div className="border-b border-gray-300/40 pb-3">
        <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-sky-600" />
          <span>Ekspor Data Telemetry Sensor (CSV & JSON)</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Ekspor seluruh riwayat pengamatan sensor lapangan ke format data tabel yang kompatibel dengan Excel atau analisis pemrograman data science.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export CSV Card */}
        <div className="p-5 rounded-2xl neo-pressed space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl neo-flat text-emerald-700">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-800">Format CSV (Excel & Calc)</h3>
                <span className="text-[10px] text-gray-500 font-mono">RFC 4180 + UTF-8 BOM Compliant</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Menyertakan UTF-8 BOM agar Microsoft Excel di Windows dapat langsung membuka data tanpa encoding rusak. Kolom meliputi timestamp ISO, waktu lokal WIB, Suhu, Kelembapan, Kec. Angin, Radiasi Cahaya, Tegangan/Arus Baterai LiFePO4, dan RSSI.
            </p>
            <div className="text-[11px] text-gray-500">
              Total baris siap diekspor: <strong className="text-gray-800 font-bold">{telemetryLogs.length} data</strong>
            </div>
          </div>

          <button
            onClick={triggerExportCsv}
            className="w-full py-2.5 px-4 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 cursor-pointer transition shadow-sm mt-2"
          >
            <Download size={14} />
            <span>Unduh CSV</span>
          </button>
        </div>

        {/* Export JSON Card */}
        <div className="p-5 rounded-2xl neo-pressed space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl neo-flat text-purple-700">
                <FileJson size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-800">Format JSON (Data Science & API)</h3>
                <span className="text-[10px] text-gray-500 font-mono">Standard JSON Array + Metadata</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Format objek JSON berstruktur rapi yang ideal untuk diolah menggunakan Python (Pandas/NumPy), MATLAB, atau diimpor kembali ke database backend alternatif. Dilengkapi metadata stasiun dan koordinat lokasi.
            </p>
            <div className="text-[11px] text-gray-500">
              Total baris siap diekspor: <strong className="text-gray-800 font-bold">{telemetryLogs.length} data</strong>
            </div>
          </div>

          <button
            onClick={triggerExportJson}
            className="w-full py-2.5 px-4 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-purple-800 flex items-center justify-center gap-2 cursor-pointer transition shadow-sm mt-2"
          >
            <Download size={14} />
            <span>Unduh JSON</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
