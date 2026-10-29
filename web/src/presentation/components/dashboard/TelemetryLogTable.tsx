import React from 'react';
import { Table, FileJson, FileSpreadsheet, CheckCircle2, CheckCircle } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import { SkeletonTable } from '../neumorphic/Skeleton';
import { PaginationBar } from '../atomic/molecules/PaginationBar';
import type { WeatherTelemetry } from '../../../core/types/weather.types';

export interface TelemetryLogEntry extends WeatherTelemetry {
  id: string;
  displayTime: string;
}

interface TelemetryLogTableProps {
  logs: TelemetryLogEntry[];
  totalLogsCount: number;
  isLoading: boolean;
  exportNotice: string | null;
  onExportCsv: () => void;
  onExportJson: () => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (newPage: number) => void;
  onItemsPerPageChange: (newLimit: number) => void;
  fieldData?: WeatherTelemetry | null;
}

export const TelemetryLogTable: React.FC<TelemetryLogTableProps> = ({
  logs,
  totalLogsCount,
  isLoading,
  exportNotice,
  onExportCsv,
  onExportJson,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalLogsCount / itemsPerPage));
  const startIndex = Math.min((currentPage - 1) * itemsPerPage + 1, totalLogsCount);
  const endIndex = Math.min(currentPage * itemsPerPage, totalLogsCount);

  return (
    <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
      <Card>
        {exportNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 flex items-center gap-2 text-xs font-semibold animate-fade-in">
            <CheckCircle size={15} className="shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-gray-700" />
            <h2 className="text-xs sm:text-base font-bold text-gray-700">Tabel Log Monitoring Sensor</h2>
          </div>

          {/* Export Buttons (Clean & Compact) */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={onExportCsv}
              className="px-2.5 py-1.5 rounded-xl neo-pressed hover:bg-gray-200/60 active:scale-95 transition-all text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer"
              title="Unduh data dalam format CSV (Excel)"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" />
              <span>CSV</span>
            </button>

            <button
              onClick={onExportJson}
              className="px-2.5 py-1.5 rounded-xl neo-pressed hover:bg-gray-200/60 active:scale-95 transition-all text-xs font-bold text-purple-800 flex items-center gap-1 cursor-pointer"
              title="Unduh data dalam format JSON"
            >
              <FileJson size={13} className="text-purple-700" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--color-neo-text-muted)] uppercase tracking-wider text-[9px] sm:text-[11px] border-b border-gray-300/40">
                    <th className="text-left py-2 px-2 font-semibold">Waktu</th>
                    <th className="text-center py-2 px-2 font-semibold">Baterai (INA226)</th>
                    <th className="text-center py-2 px-2 font-semibold">Suhu</th>
                    <th className="text-center py-2 px-2 font-semibold">Kelembapan</th>
                    <th className="text-center py-2 px-2 font-semibold">Kec. Angin</th>
                    <th className="text-center py-2 px-2 font-semibold">Cahaya</th>
                    <th className="text-center py-2 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300/30">
                  {logs.map((log) => {
                    const batVolt = log.battery_voltage ?? log.battery?.voltage;
                    const batPct = log.battery_percentage ?? log.battery?.percentage;
                    const isCharging = log.battery?.charging ?? (log.battery_current !== undefined ? log.battery_current > 5 : false);

                    return (
                      <tr key={log.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-2 px-2 font-mono text-gray-600 whitespace-nowrap">{log.displayTime}</td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {batVolt !== undefined ? (
                            <span className="font-mono text-xs inline-flex items-center gap-1 justify-center">
                              {isCharging && <span className="text-amber-500 text-[10px]" title="Charging">⚡</span>}
                              <span>{batVolt.toFixed(2)}V</span>
                              <span className="text-emerald-700 ml-0.5 font-extrabold">({batPct ?? '--'}%)</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono text-xs" title="Modul INA226 tidak mengirim tegangan">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.temperature.toFixed(1)}°C
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.humidity.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.wind_speed.toFixed(1)}km/h
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.light_lux}lx
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold neo-pressed text-gray-700">
                            <CheckCircle2 size={10} className="text-gray-800" /> OK
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Telemetry List Cards */}
            <div className="sm:hidden space-y-2">
              {logs.map((log) => {
                const batVolt = log.battery_voltage ?? log.battery?.voltage;
                const batPct = log.battery_percentage ?? log.battery?.percentage;

                return (
                  <div key={log.id} className="p-3 rounded-2xl neo-pressed space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-gray-600 font-bold">{log.displayTime}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-gray-200/60 text-gray-700">
                        <CheckCircle2 size={10} className="text-gray-800" /> OK
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Baterai</span>
                        <span className="font-bold text-gray-700 font-mono">
                          {batVolt !== undefined ? `${batVolt.toFixed(1)}V (${batPct ?? '--'}%)` : '-'}
                        </span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Suhu</span>
                        <span className="font-bold text-gray-800">{log.temperature.toFixed(1)}°C</span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Lembap</span>
                        <span className="font-bold text-gray-800">{log.humidity.toFixed(1)}%</span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Angin</span>
                        <span className="font-bold text-gray-800">{log.wind_speed.toFixed(1)}k</span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Cahaya</span>
                        <span className="font-bold text-gray-800">{log.light_lux}lx</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reusable Neumorphic Pagination Bar */}
            <PaginationBar
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalLogsCount}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
              onItemsPerPageChange={onItemsPerPageChange}
            />
          </>
        )}
      </Card>
    </section>
  );
};
