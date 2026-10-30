import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWeatherRealtime, loadSensorCalibration } from '../../hooks/useWeatherRealtime';
import { useBmkgComparison } from '../../hooks/useBmkgComparison';
import { useComparativeAnalytics } from '../../hooks/useComparativeAnalytics';
import { weatherRepository } from '../../core/di';
import { StatusBadge } from '../components/neumorphic/StatusBadge';
import { ChartWidget } from '../components/neumorphic/ChartWidget';
import { BenchmarkCards } from '../components/neumorphic/BenchmarkCards';
import { EtoWidget } from '../components/neumorphic/EtoWidget';
import { LiveClock } from '../components/atomic/atoms/LiveClock';
import { HighlightsGrid } from '../components/dashboard/HighlightsGrid';
import { ForecastComparisonMatrix } from '../components/dashboard/ForecastComparisonMatrix';
import { 
  ExtremesComparisonSection, 
  type TimeframeMode, 
  type TempMinMaxComparisonData 
} from '../components/dashboard/ExtremesComparisonSection';
import { 
  TelemetryLogTable, 
  type TelemetryLogEntry 
} from '../components/dashboard/TelemetryLogTable';
import { downloadTelemetryCsv, downloadTelemetryJson } from '../../core/utils/export.utils';
import { Settings, BarChart3, MapPin, Wifi, Cloud, Clock } from 'lucide-react';
import { LocationService, type LocationItem } from '../../core/services/LocationService';
import { LocationSelectorModal } from '../components/atomic/molecules/LocationSelectorModal';
import type { WeatherTelemetry } from '../../core/types/weather.types';

interface ChartPoint {
  time: string;
  Field: number;
  BMKG: number;
}

export interface DashboardProps {
  onNavigateToSettings?: () => void;
  onNavigateToAnalytics?: () => void;
  onLogsLoaded?: (logs: WeatherTelemetry[]) => void;
}

export function Dashboard({ onNavigateToSettings, onNavigateToAnalytics, onLogsLoaded }: DashboardProps = {}) {
  const { data: realtimeData, connected, mode, setMode, targetIp, setTargetIp, latencyMs } = useWeatherRealtime();
  const [inputIp, setInputIp] = useState<string>(targetIp);

  useEffect(() => {
    setInputIp(targetIp);
  }, [targetIp]);

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputIp.trim()) {
      setTargetIp(inputIp.trim());
    }
  };

  const { 
    bmkgData: liveBmkg, 
    tomorrowForecast,
    todayExtremes,
    allCuacaEntries,
  } = useBmkgComparison(realtimeData);

  const [fieldData, setFieldData] = useState<WeatherTelemetry | null>(null);
  const [bmkgData, setBmkgData] = useState(liveBmkg);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [activeLocation, setActiveLocation] = useState<LocationItem>(LocationService.getActiveLocation());
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);

  // Subscribe to dynamic active location
  useEffect(() => {
    const unsub = LocationService.subscribe((loc) => {
      setActiveLocation(loc);
    });
    return () => unsub();
  }, []);

  const [stationName, setStationName] = useState<string>(() => localStorage.getItem('agrinex_station_name') || 'Stasiun Cuaca Agrinex');
  const [stationElevation, setStationElevation] = useState<number>(() => {
    const saved = localStorage.getItem('agrinex_station_elevation');
    return saved ? Number(saved) : activeLocation.elevation_m;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const n = localStorage.getItem('agrinex_station_name');
      if (n) setStationName(n);
      const e = localStorage.getItem('agrinex_station_elevation');
      if (e) setStationElevation(Number(e));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Calendar display state (initialized synchronously to actual local date)
  const [dayNumber] = useState<string>(() => new Date().getDate().toString());
  const [dayName] = useState<string>(() => new Date().toLocaleDateString('id-ID', { weekday: 'long' }));
  const [monthYearStr] = useState<string>(() => new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));

  // Sync live BMKG data
  useEffect(() => {
    if (liveBmkg) setBmkgData(liveBmkg);
  }, [liveBmkg]);

  // Sync real telemetry data (from Firebase Realtime Stream)
  useEffect(() => {
    if (realtimeData) {
      setFieldData(realtimeData);
      setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsLoading(false);
    }
  }, [realtimeData]);

  // Initial load timeout protection
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Initial load history logs on mount
  useEffect(() => {
    weatherRepository.getHistory(50).then((history) => {
      if (history && history.length > 0) {
        const cal = loadSensorCalibration();
        const calibratedHistory = history.map((item) => {
          if (!cal.enabled) return item;
          // Apply calibration offset if raw uncalibrated DHT22 reading
          const isUncalibrated = item.temperature > 25.0;
          return {
            ...item,
            temperature: isUncalibrated ? Number((item.temperature + cal.tempOffset).toFixed(1)) : item.temperature,
            humidity: isUncalibrated ? Number(Math.min(100, Math.max(0, item.humidity + cal.humOffset)).toFixed(1)) : item.humidity,
          };
        });
        const formattedLogs: TelemetryLogEntry[] = calibratedHistory.map((item, idx) => {
          const dt = item.timestamp ? new Date(item.timestamp) : new Date();
          const displayTime = isNaN(dt.getTime())
            ? (item.timestamp || 'N/A')
            : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return {
            ...item,
            id: `${item.timestamp || Date.now()}-${idx}`,
            displayTime,
          };
        });
        setTelemetryLogs(formattedLogs);
        onLogsLoaded?.(calibratedHistory);
      }
    }).catch(err => console.warn('[Dashboard] History load notice:', err));
  }, [onLogsLoaded]);

  // Append new telemetry entry to logs
  useEffect(() => {
    if (!fieldData) return;
    
    const formatSensorTime = (isoString?: string) => {
      if (!isoString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const displayTime = formatSensorTime(fieldData.timestamp);

    setTelemetryLogs(prev => {
      if (prev.length > 0 && prev[0].timestamp === fieldData.timestamp) return prev;
      const newEntry: TelemetryLogEntry = {
        ...fieldData,
        id: `${fieldData.timestamp || Date.now()}-${Math.random()}`,
        displayTime,
      };
      return [newEntry, ...prev].slice(0, 50);
    });
  }, [fieldData]);

  // Comparative Analytics (ETo, Matched Points, Benchmark Statistics)
  const { continuousChartData, etoResult, benchmarkReport, matchedPoints } = useComparativeAnalytics({
    telemetryLogs,
    allCuacaEntries,
    todayExtremes,
    fieldData,
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

  const tempDelta = useMemo(() => calcDelta(fieldData?.temperature, bmkgData?.temperature), [fieldData?.temperature, bmkgData?.temperature, calcDelta]);
  const humDelta = useMemo(() => calcDelta(fieldData?.humidity, bmkgData?.humidity), [fieldData?.humidity, bmkgData?.humidity, calcDelta]);
  const windDelta = useMemo(() => calcDelta(fieldData?.wind_speed, bmkgData?.wind_speed), [fieldData?.wind_speed, bmkgData?.wind_speed, calcDelta]);

  // Timeframe state for T-Min / T-Max comparison
  const [minMaxTimeframe, setMinMaxTimeframe] = useState<TimeframeMode>('day');

  // Compute T-Min and T-Max for Node vs BMKG
  const tempMinMaxComparison: TempMinMaxComparisonData = useMemo(() => {
    let filteredLogs = telemetryLogs;
    const now = Date.now();

    if (minMaxTimeframe === 'day') {
      filteredLogs = telemetryLogs.filter(l => (now - new Date(l.timestamp).getTime()) <= 24 * 60 * 60 * 1000);
    } else if (minMaxTimeframe === 'week') {
      filteredLogs = telemetryLogs.filter(l => (now - new Date(l.timestamp).getTime()) <= 7 * 24 * 60 * 60 * 1000);
    } else {
      filteredLogs = telemetryLogs.filter(l => (now - new Date(l.timestamp).getTime()) <= 30 * 24 * 60 * 60 * 1000);
    }

    let nodeMin: number | undefined = undefined;
    let nodeMax: number | undefined = undefined;

    if (filteredLogs.length > 0) {
      const temps = filteredLogs.map(l => l.temperature);
      nodeMin = Math.min(...temps);
      nodeMax = Math.max(...temps);
    } else if (fieldData) {
      nodeMin = fieldData.temperature;
      nodeMax = fieldData.temperature;
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
  }, [telemetryLogs, minMaxTimeframe, fieldData, todayExtremes, tomorrowForecast, bmkgData, calcDelta]);

  // Paginated telemetry logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return telemetryLogs.slice(start, start + itemsPerPage);
  }, [telemetryLogs, currentPage, itemsPerPage]);

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Notify parent component about loaded telemetry logs
  useEffect(() => {
    if (telemetryLogs.length > 0 && onLogsLoaded) {
      onLogsLoaded(telemetryLogs);
    }
  }, [telemetryLogs, onLogsLoaded]);

  const handleExportJson = useCallback(() => {
    downloadTelemetryJson(telemetryLogs);
    setExportNotice(`✓ Berhasil mengekspor ${telemetryLogs.length} baris data telemetry ke format JSON.`);
    setTimeout(() => setExportNotice(null), 4000);
  }, [telemetryLogs]);

  const handleExportCsv = useCallback(() => {
    downloadTelemetryCsv(telemetryLogs);
    setExportNotice(`✓ Berhasil mengekspor ${telemetryLogs.length} baris data telemetry ke format CSV (Excel UTF-8 BOM).`);
    setTimeout(() => setExportNotice(null), 4000);
  }, [telemetryLogs]);

  return (
    <div className="min-h-screen p-3 sm:p-6 lg:p-8 pb-32 sm:pb-36 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Status & Single Live Clock Bar */}
      <div className="flex items-center justify-between animate-fade-in pt-1">
        {onNavigateToSettings ? (
          <button 
            type="button" 
            onClick={onNavigateToSettings}
            className="cursor-pointer text-left focus:outline-none transition active:scale-95"
            title="Buka Pengaturan Aliran Data (Cloud / Local IP)"
          >
            <StatusBadge connected={connected} mode={mode} />
          </button>
        ) : (
          <StatusBadge connected={connected} mode={mode} />
        )}
        
        <div className="flex items-center gap-2">
          <LiveClock />

          {onNavigateToAnalytics && (
            <button
              onClick={onNavigateToAnalytics}
              title="Buka Halaman Analisis Agroklimatologi & Validasi Akurasi"
              className="p-1.5 rounded-full neo-flat hover:neo-pressed text-gray-700 hover:text-sky-700 transition cursor-pointer"
            >
              <BarChart3 size={16} />
            </button>
          )}

          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              title="Buka Halaman Pengaturan Pin Sensor, Modul, & Protokol Backend"
              className="p-1.5 rounded-full neo-flat hover:neo-pressed text-gray-700 hover:text-sky-700 transition cursor-pointer"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      {/* LOCAL TARGET IP CONTROL BAR (Persis local-project) */}
      <div className="neo-card p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <StatusBadge connected={connected} mode={mode} />
          {latencyMs !== null && (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-gray-700 neo-pressed px-2.5 py-1 rounded-full">
              <Clock size={12} className="text-gray-700" /> {latencyMs}ms
            </span>
          )}
        </div>

        {/* IP Target Input Form & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleIpSubmit} className="flex items-center gap-1.5 neo-pressed px-2.5 py-1 rounded-xl">
            <Wifi size={14} className="text-gray-700 ml-1" />
            <input
              type="text"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              placeholder="e.g. 192.168.18.3"
              className="bg-transparent text-xs font-mono font-bold text-gray-800 focus:outline-none w-28 sm:w-32 px-1"
            />
            <button 
              type="submit" 
              className="px-2.5 py-1 rounded-lg bg-gray-800 text-white font-bold text-xs cursor-pointer hover:bg-gray-900 transition-colors active:scale-95 shadow-sm"
            >
              Hubungkan
            </button>
          </form>

          <div className="flex items-center neo-pressed p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMode('POLLING')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mode === 'POLLING' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Wifi size={12} /> Local HTTP
            </button>
            <button
              type="button"
              onClick={() => setMode('FIREBASE')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mode === 'FIREBASE' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Cloud size={12} /> Cloud
            </button>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <header className="pt-2 pb-1 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-sm font-extrabold text-gray-900 lowercase tracking-tight block">today.</span>
            <h1 className="text-2xl sm:text-4xl font-light text-gray-700 tracking-tight leading-tight">
              {bmkgData?.weather_desc || 'Memuat Cuaca...'}
            </h1>
            <div className="text-xs text-gray-500 font-normal space-y-0.5 pt-1">
              <p>Humidity {fieldData ? `${fieldData.humidity.toFixed(1)}%` : '--'}</p>
              <p>Wind Speed {fieldData ? `${fieldData.wind_speed.toFixed(1)} km/h` : '--'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-5xl sm:text-7xl font-extralight text-gray-800 tracking-tighter">
              {dayNumber || '29'}
            </span>
            <div className="text-[10px] text-gray-500 font-semibold uppercase leading-tight pt-1">
              <span>{dayName || 'Kamis'}</span>
              <br />
              <span>{monthYearStr || 'Okt 2026'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Location Bar */}
      {/* Station Location Banner */}
      <section className="animate-fade-in" style={{ animationDelay: '0.08s' }}>
        <div className="neo-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--color-neo-text-muted)]">
                {stationName}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
                {stationElevation} mdpl
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight mt-1">
              {activeLocation.village}, {activeLocation.subdistrict}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeLocation.district}
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
        </div>
      </section>

      {/* Organism 1: Highlights Grid (Thermometer, BatteryCard, 3 MetricCards) */}
      <HighlightsGrid
        fieldData={fieldData}
        isLoading={isLoading}
        connected={connected}
        lastUpdate={lastUpdate}
      />

      {/* Organism 2: Tomorrow Forecast & Comparison Matrix */}
      <ForecastComparisonMatrix
        tomorrowForecast={tomorrowForecast}
        fieldData={fieldData}
        bmkgData={bmkgData}
        tempDelta={tempDelta}
        humDelta={humDelta}
        windDelta={windDelta}
        isLoading={isLoading}
        connected={connected}
      />

      {/* Organism 3: Extremes Comparison Section (T-Min, T-Max, Diurnal Range) */}
      <ExtremesComparisonSection
        timeframe={minMaxTimeframe}
        onTimeframeChange={setMinMaxTimeframe}
        data={tempMinMaxComparison}
      />

      {/* Recharts Analytics Widgets */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <ChartWidget data={tempChart} title="Tren Suhu Udara" unit="°C" />
        <ChartWidget data={humChart} title="Tren Kelembapan" unit="%" />
        <ChartWidget data={windChart} title="Tren Kecepatan Angin" unit="m/s" />
      </section>

      {/* Benchmark Statistical Evaluation Cards */}
      <section className="animate-fade-in" style={{ animationDelay: '0.37s' }}>
        <BenchmarkCards report={benchmarkReport} totalPoints={matchedPoints.length} />
      </section>

      {/* FAO-56 Penman-Monteith Evapotranspiration (ETo) */}
      <section className="animate-fade-in" style={{ animationDelay: '0.39s' }}>
        <EtoWidget etoResult={etoResult} elevationM={activeLocation.elevation_m} />
      </section>

      {/* Organism 4: Full Telemetry Log Table + Export + Pagination */}
      <TelemetryLogTable
        logs={paginatedLogs}
        totalLogsCount={telemetryLogs.length}
        isLoading={isLoading}
        exportNotice={exportNotice}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(limit) => {
          setItemsPerPage(limit);
          setCurrentPage(1);
        }}
        fieldData={fieldData}
      />

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--color-neo-text-muted)] pt-6 pb-4 flex flex-col items-center justify-center gap-1">
        <div>Agrinex Weather Station Dashboard v2.0 — Data sensor diperbarui setiap 15 menit (RTOS averaged)</div>
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
}
