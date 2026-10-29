import React from 'react';
import { Calendar, CloudRain, ArrowUpDown, Thermometer, Droplets, Wind, AlertTriangle } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import { Skeleton, SkeletonTable } from '../neumorphic/Skeleton';
import { ComparisonRow } from '../atomic/molecules/ComparisonRow';
import { MobileComparisonCard } from '../atomic/molecules/MobileComparisonCard';
import { LOCATION_CONFIG } from '../../../core/config/location.config';
import type { WeatherTelemetry } from '../../../core/types/weather.types';
import type { BmkgForecastData, TomorrowForecast } from '../../../core/types/bmkg.types';

interface DeltaResult {
  value: number;
  pct: number;
}

interface ForecastComparisonMatrixProps {
  tomorrowForecast: TomorrowForecast | null;
  fieldData: WeatherTelemetry | null;
  bmkgData: BmkgForecastData | null;
  tempDelta: DeltaResult;
  humDelta: DeltaResult;
  windDelta: DeltaResult;
  isLoading: boolean;
  connected: boolean;
}

export const ForecastComparisonMatrix: React.FC<ForecastComparisonMatrixProps> = ({
  tomorrowForecast,
  fieldData,
  bmkgData,
  tempDelta,
  humDelta,
  windDelta,
  isLoading,
  connected,
}) => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
      {/* Prakiraan Cuaca Besok */}
      <Card className="lg:col-span-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-gray-300/40 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-700" />
              <h2 className="text-xs sm:text-sm font-bold text-gray-700">Prakiraan Besok</h2>
            </div>
            <span className="text-[10px] neo-pressed text-gray-800 px-2 py-0.5 rounded-full font-bold">BMKG</span>
          </div>

          {tomorrowForecast ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-500">{tomorrowForecast.date}</p>

              <div className="flex items-center gap-3 p-3 rounded-2xl neo-pressed">
                <CloudRain size={32} className="text-gray-800 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-gray-800 leading-tight">
                    {tomorrowForecast.condition}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Peluang Hujan: <span className="font-bold text-gray-900">{tomorrowForecast.rainProbability}%</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl neo-pressed">
                  <span className="text-[9px] text-gray-400 block font-bold uppercase">Suhu Min/Max</span>
                  <span className="font-extrabold text-gray-800 text-xs sm:text-sm">
                    {tomorrowForecast.tempMin}° - {tomorrowForecast.tempMax}°C
                  </span>
                </div>
                <div className="p-2.5 rounded-xl neo-pressed">
                  <span className="text-[9px] text-gray-400 block font-bold uppercase">Kelembapan</span>
                  <span className="font-extrabold text-gray-800 text-xs sm:text-sm">
                    {tomorrowForecast.humidityMin}% - {tomorrowForecast.humidityMax}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          )}
        </div>

        <div className="pt-2 text-[10px] text-gray-400 border-t border-gray-300/30 mt-3">
          Wilayah: {LOCATION_CONFIG.name}
        </div>
      </Card>

      {/* Responsive Comparison Section */}
      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-700" />
            <h2 className="text-xs sm:text-base font-bold text-gray-700">Komparasi Sensor vs BMKG</h2>
          </div>
          <span className="text-[10px] text-gray-400 font-semibold uppercase hidden sm:inline">Live Sync</span>
        </div>

        {isLoading ? (
          <SkeletonTable />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-[var(--color-neo-text-muted)] text-[10px] sm:text-xs uppercase tracking-wider border-b border-gray-300/40">
                    <th className="text-left py-2 pr-2 font-semibold">Parameter</th>
                    <th className="text-center py-2 px-2 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-900"></span> Sensor
                      </span>
                    </th>
                    <th className="text-center py-2 px-2 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span> BMKG
                      </span>
                    </th>
                    <th className="text-center py-2 px-2 font-semibold">Delta</th>
                    <th className="text-center py-2 pl-2 font-semibold">Error %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300/30">
                  <ComparisonRow label="Suhu (°C)" fieldVal={fieldData?.temperature} bmkgVal={bmkgData?.temperature} delta={tempDelta} />
                  <ComparisonRow label="Kelembapan (%)" fieldVal={fieldData?.humidity} bmkgVal={bmkgData?.humidity} delta={humDelta} />
                  <ComparisonRow label="Kec. Angin (km/h)" fieldVal={fieldData?.wind_speed} bmkgVal={bmkgData?.wind_speed} delta={windDelta} />
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="sm:hidden space-y-2.5">
              <MobileComparisonCard
                label="Suhu (°C)"
                fieldVal={fieldData?.temperature}
                bmkgVal={bmkgData?.temperature}
                delta={tempDelta}
                icon={<Thermometer size={14} className="text-gray-700" />}
              />
              <MobileComparisonCard
                label="Kelembapan (%)"
                fieldVal={fieldData?.humidity}
                bmkgVal={bmkgData?.humidity}
                delta={humDelta}
                icon={<Droplets size={14} className="text-gray-700" />}
              />
              <MobileComparisonCard
                label="Kec. Angin (km/h)"
                fieldVal={fieldData?.wind_speed}
                bmkgVal={bmkgData?.wind_speed}
                delta={windDelta}
                icon={<Wind size={14} className="text-gray-700" />}
              />
            </div>
          </>
        )}

        {!connected && (
          <p className="flex items-center gap-1 text-[10px] text-[var(--color-neo-text-muted)] mt-3 pt-2 border-t border-gray-300/30">
            <AlertTriangle size={11} className="text-gray-500 shrink-0" />
            Koneksi Firebase offline — menunggu update sensor.
          </p>
        )}
      </Card>
    </section>
  );
};
