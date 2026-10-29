import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  BarChart3, 
  Download, 
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { useWeatherRealtime } from '../../hooks/useWeatherRealtime';
import { useBmkgComparison } from '../../hooks/useBmkgComparison';
import { useComparativeAnalytics } from '../../hooks/useComparativeAnalytics';
import { weatherRepository } from '../../core/di';
import { LocationService, type LocationItem } from '../../core/services/LocationService';
import { LocationSelectorModal } from '../components/atomic/molecules/LocationSelectorModal';
import type { WeatherTelemetry } from '../../core/types/weather.types';
import { LiveClock } from '../components/atomic/atoms/LiveClock';
import { AnalyticsKpiGrid } from '../components/analytics/AnalyticsKpiGrid';
import { AgroClimateAdvisory } from '../components/analytics/AgroClimateAdvisory';
import { EtoWidget } from '../components/neumorphic/EtoWidget';
import { BenchmarkCards } from '../components/neumorphic/BenchmarkCards';
import { ChartWidget } from '../components/neumorphic/ChartWidget';
import { 
  ExtremesComparisonSection,
  type TimeframeMode, 
  type TempMinMaxComparisonData 
} from '../components/dashboard/ExtremesComparisonSection';
import { ForecastComparisonMatrix } from '../components/dashboard/ForecastComparisonMatrix';
import { downloadTelemetryCsv, downloadTelemetryJson } from '../../core/utils/export.utils';

interface AnalyticsViewProps {
  onBack: () => void;
  telemetryLogs?: WeatherTelemetry[];
}

interface ChartPoint {
  time: string;
  Field: number;
  BMKG: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onBack,
  telemetryLogs: initialLogs = [],
}) => {
  const { data: realtimeData, connected } = useWeatherRealtime();
  const { 
    bmkgData, 
    tomorrowForecast, 
    todayExtremes, 
    allCuacaEntries,
    loading: bmkgLoading 
  } = useBmkgComparison(realtimeData);

  const [logs, setLogs] = useState<WeatherTelemetry[]>(initialLogs);
  const [isLoading, setIsLoading] = useState<boolean>(initialLogs.length === 0);
  const [minMaxTimeframe, setMinMaxTimeframe] = useState<TimeframeMode>('day');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationItem>(LocationService.getActiveLocation());
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);

  // Subscribe to dynamic active location
  useEffect(() => {
    const unsub = LocationService.subscribe((loc) => {
      setLocation(loc);
    });
    return () => unsub();
  }, []);

  // Load telemetry history if not provided
  useEffect(() => {
    if (initialLogs.length > 0) {
      setLogs(initialLogs);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    weatherRepository.getHistory(50)
      .then((history) => {
        if (isMounted) {
          setLogs(history || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[AnalyticsView] History fetch error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialLogs]);

  // Comparative Analytics (ETo, Matched Points, Benchmark Statistics)
  const { continuousChartData, etoResult, benchmarkReport, matchedPoints } = useComparativeAnalytics({
    telemetryLogs: logs,
    allCuacaEntries,
    todayExtremes,
    fieldData: realtimeData,
    bmkgData,
  });

  // Split continuous continuousChartData for Recharts
  const tempChart: ChartPoint[] = useMemo(() => {
    if (continuousChartData && continuousChartData.length > 0) {
      return continuousChartData.map((p: any) => ({
        time: p.timeLabel,
        Field: p.Field_Temp,
        BMKG: p.BMKG_Temp,
      }));
    }
    return [];
  }, [continuousChartData]);

  const humChart: ChartPoint[] = useMemo(() => {
    if (continuousChartData && continuousChartData.length > 0) {
      return continuousChartData.map((p: any) => ({
        time: p.timeLabel,
        Field: p.Field_Hum,
        BMKG: p.BMKG_Hum,
      }));
    }
    return [];
  }, [continuousChartData]);

  const windChart: ChartPoint[] = useMemo(() => {
    if (continuousChartData && continuousChartData.length > 0) {
      return continuousChartData.map((p: any) => ({
        time: p.timeLabel,
        Field: p.Field_Wind,
        BMKG: p.BMKG_Wind,
      }));
    }
    return [];
  }, [continuousChartData]);

  // Memoized delta calculations
  const calcDelta = useCallback((a?: number, b?: number) => {
    if (a === undefined || b === undefined) return { value: 0, pct: 0 };
    const delta = a - b;
    const pct = b !== 0 ? (Math.abs(delta) / b) * 100 : 0;
    return { value: Number(delta.toFixed(1)), pct: Number(pct.toFixed(1)) };
  }, []);

  const tempDelta = useMemo(() => calcDelta(realtimeData?.temperature, bmkgData?.temperature), [realtimeData?.temperature, bmkgData?.temperature, calcDelta]);
  const humDelta = useMemo(() => calcDelta(realtimeData?.humidity, bmkgData?.humidity), [realtimeData?.humidity, bmkgData?.humidity, calcDelta]);
  const windDelta = useMemo(() => calcDelta(realtimeData?.wind_speed, bmkgData?.wind_speed), [realtimeData?.wind_speed, bmkgData?.wind_speed, calcDelta]);

  // Compute T-Min and T-Max for Node vs BMKG
  const tempMinMaxComparison: TempMinMaxComparisonData = useMemo(() => {
    let filteredLogs = logs;
    const now = Date.now();

    if (minMaxTimeframe === 'day') {
      filteredLogs = logs.filter(l => (now - new Date(l.timestamp).getTime()) <= 24 * 60 * 60 * 1000);
    } else if (minMaxTimeframe === 'week') {
      filteredLogs = logs.filter(l => (now - new Date(l.timestamp).getTime()) <= 7 * 24 * 60 * 60 * 1000);
    } else {
      filteredLogs = logs.filter(l => (now - new Date(l.timestamp).getTime()) <= 30 * 24 * 60 * 60 * 1000);
    }

    let nodeMin: number | undefined = undefined;
    let nodeMax: number | undefined = undefined;

    if (filteredLogs.length > 0) {
      const temps = filteredLogs.map(l => l.temperature);
      nodeMin = Math.min(...temps);
      nodeMax = Math.max(...temps);
    } else if (realtimeData) {
      nodeMin = realtimeData.temperature;
      nodeMax = realtimeData.temperature;
    }

    let bmkgMin: number | undefined = undefined;
    let bmkgMax: number | undefined = undefined;

    if (minMaxTimeframe === 'day') {
      bmkgMin = todayExtremes?.tempMin ?? tomorrowForecast?.tempMin ?? bmkgData?.temperature;
      bmkgMax = todayExtremes?.tempMax ?? tomorrowForecast?.tempMax ?? bmkgData?.temperature;
    } else if (minMaxTimeframe === 'week') {
      const minVals = [todayExtremes?.tempMin, tomorrowForecast?.tempMin].filter((v): v is number => v !== undefined);
      const maxVals = [todayExtremes?.tempMax, tomorrowForecast?.tempMax].filter((v): v is number => v !== undefined);
      bmkgMin = minVals.length > 0 ? Math.min(...minVals) : bmkgData?.temperature;
      bmkgMax = maxVals.length > 0 ? Math.max(...maxVals) : bmkgData?.temperature;
    } else {
      bmkgMin = todayExtremes?.tempMin ?? tomorrowForecast?.tempMin ?? bmkgData?.temperature;
      bmkgMax = todayExtremes?.tempMax ?? tomorrowForecast?.tempMax ?? bmkgData?.temperature;
    }

    const minDelta = calcDelta(nodeMin, bmkgMin);
    const maxDelta = calcDelta(nodeMax, bmkgMax);

    const nodeRange = (nodeMax !== undefined && nodeMin !== undefined) ? Number((nodeMax - nodeMin).toFixed(1)) : undefined;
    const bmkgRange = (bmkgMax !== undefined && bmkgMin !== undefined) ? Number((bmkgMax - bmkgMin).toFixed(1)) : undefined;
    const rangeDelta = calcDelta(nodeRange, bmkgRange);

    return { nodeMin, nodeMax, bmkgMin, bmkgMax, minDelta, maxDelta, nodeRange, bmkgRange, rangeDelta };
  }, [logs, minMaxTimeframe, realtimeData, todayExtremes, tomorrowForecast, bmkgData, calcDelta]);

  const handleExportCsv = () => {
    downloadTelemetryCsv(logs);
    setExportNotice(`✓ Berhasil mengekspor ${logs.length} data laporan analisis.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportJson = () => {
    downloadTelemetryJson(logs);
    setExportNotice(`✓ Berhasil mengekspor format JSON untuk data science & analisis.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 lg:p-8 pb-32 sm:pb-36 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      {/* Top Header & Breadcrumb */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-2xl neo-pressed hover:bg-gray-200/70 text-gray-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm shrink-0"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[var(--color-neo-text-muted)]">
                Agrinex Station
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-sky-600">
                Pusat Analisis
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2 mt-0.5">
              <span>Analisis Agroklimat &amp; Validasi BMKG</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <LiveClock />
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300/40">
            <button
              onClick={handleExportCsv}
              className="p-2 sm:px-3 sm:py-2 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer transition shadow-sm"
              title="Ekspor CSV Analisis"
            >
              <Download size={13} className="text-sky-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="p-2 sm:px-3 sm:py-2 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-purple-700 flex items-center gap-1.5 cursor-pointer transition shadow-sm"
              title="Ekspor JSON Analisis"
            >
              <Download size={13} className="text-purple-600" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </header>

      {/* Export Notice Banner */}
      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-800 flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-sky-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Location & Station Metadata Banner */}
      <section className="neo-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--color-neo-text-muted)]">
              Stasiun &amp; Referensi BMKG
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
              {location.elevation_m} mdpl
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight mt-1">
            {location.village}, {location.subdistrict}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {location.district}
          </p>
        </div>

        <button
          onClick={() => setIsLocModalOpen(true)}
          className="self-start sm:self-center px-3.5 py-2 rounded-xl neo-flat hover:neo-pressed text-xs font-bold text-sky-700 flex items-center gap-1.5 cursor-pointer transition active:scale-95 shrink-0 shadow-sm"
          title="Ubah Referensi Wilayah BMKG"
        >
          <MapPin size={14} className="text-sky-600" />
          <span>Ubah Wilayah</span>
        </button>
      </section>

      {/* 1. Analytics KPI Grid (High Level Metrics) */}
      <AnalyticsKpiGrid
        benchmarkReport={benchmarkReport}
        etoResult={etoResult}
        totalPoints={matchedPoints.length}
      />

      {/* 2. Smart Agronomic Advisory (VPD, Irrigation, Spraying) */}
      <AgroClimateAdvisory
        fieldData={realtimeData}
        etoMmDay={etoResult?.etoIotMmDay}
      />

      {/* 3. Detailed FAO-56 Penman-Monteith Evapotranspiration */}
      <section className="space-y-3">
        <EtoWidget etoResult={etoResult} elevationM={location.elevation_m} />
      </section>

      {/* 4. Comprehensive Benchmark Statistics (MAE, RMSE, MAPE, MBE, Pearson r) */}
      <section className="space-y-3">
        <BenchmarkCards report={benchmarkReport} totalPoints={matchedPoints.length} />
      </section>

      {/* 5. Time Series Comparative Recharts */}
      <section className="space-y-4">
        <div className="border-b border-gray-300/40 pb-2">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-sky-600" />
            <span>Grafik Tren Cuaca</span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Komparasi deret waktu sensor stasiun vs model BMKG
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <ChartWidget data={tempChart} title="Tren Suhu Udara" unit="°C" />
          <ChartWidget data={humChart} title="Tren Kelembapan" unit="%" />
          <ChartWidget data={windChart} title="Tren Kecepatan Angin" unit=" m/s" />
        </div>
      </section>

      {/* 6. Extremes & Diurnal Temperature Range (DTR) */}
      <section className="space-y-3">
        <ExtremesComparisonSection
          timeframe={minMaxTimeframe}
          onTimeframeChange={setMinMaxTimeframe}
          data={tempMinMaxComparison}
        />
      </section>

      {/* 7. Forecast Comparison Matrix (Tomorrow Forecast & Field Delta) */}
      <section className="space-y-3">
        <ForecastComparisonMatrix
          tomorrowForecast={tomorrowForecast}
          fieldData={realtimeData}
          bmkgData={bmkgData}
          tempDelta={tempDelta}
          humDelta={humDelta}
          windDelta={windDelta}
          isLoading={isLoading || bmkgLoading}
          connected={connected}
        />
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--color-neo-text-muted)] pt-6 pb-4 flex flex-col items-center justify-center gap-1">
        <div>Agrinex Weather Station Analytics Engine — Mengadopsi Standar WMO Guide No. 8 &amp; FAO Paper 56</div>
        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          Developed by{' '}
          <a
            href="https://ghiffa.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 transition"
          >
            ghiffa.dev
          </a>
        </div>
      </footer>

      {/* Dynamic BMKG Location Selector Modal */}
      <LocationSelectorModal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
      />
    </div>
  );
};
