import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWeatherRealtime } from '../../hooks/useWeatherRealtime';
import { useBmkgComparison } from '../../hooks/useBmkgComparison';
import { Card } from '../components/neumorphic/Card';
import { StatusBadge } from '../components/neumorphic/StatusBadge';
import { ChartWidget } from '../components/neumorphic/ChartWidget';
import { ArcGauge } from '../components/neumorphic/ArcGauge';
import { MetricCard } from '../components/neumorphic/MetricCard';
import { BatteryCard } from '../components/neumorphic/BatteryCard';
import { SkeletonCard, SkeletonGauge, SkeletonTable, Skeleton } from '../components/neumorphic/Skeleton';
import { LOCATION_CONFIG } from '../../core/config/location.config';
import { downloadJson, downloadCsv } from '../../core/utils/export.utils';
import { 
  Thermometer, Droplets, Wind, Sun, 
  TrendingUp, TrendingDown, Minus, 
  ArrowUpDown, CloudSun, 
  AlertTriangle, Calendar, CloudRain, Table,
  Clock, ChevronRight, ChevronLeft, CheckCircle2, FileJson, FileSpreadsheet,
  SlidersHorizontal, Flame, Snowflake, Wifi, Radio, Server, RefreshCw,
  ShieldCheck, Cpu
} from 'lucide-react';
import { ModuleDiagnosticsModal } from '../components/neumorphic/ModuleDiagnosticsModal';
import type { WeatherTelemetry } from '../../core/types/weather.types';
import type { BmkgForecastData } from '../../core/types/bmkg.types';

interface ChartPoint {
  time: string;
  Field: number;
  BMKG: number;
}

interface TelemetryLogEntry extends WeatherTelemetry {
  id: string;
  displayTime: string;
}

// Sub-component untuk Perbandingan Row Desktop Table
function ComparisonRow({ label, fieldVal, bmkgVal, delta }: { label: string; fieldVal?: number; bmkgVal?: number; delta: { value: number; pct: number } }) {
  const isHigher = delta.value > 0;
  const isLower = delta.value < 0;

  return (
    <tr className="hover:bg-white/40 transition-colors">
      <td className="py-2.5 pr-2 font-bold text-gray-800">{label}</td>
      <td className="py-2.5 px-2 text-center font-extrabold text-gray-900 text-sm sm:text-base tabular-nums">
        {fieldVal !== undefined ? fieldVal.toFixed(1) : '--'}
      </td>
      <td className="py-2.5 px-2 text-center font-extrabold text-gray-500 text-sm sm:text-base tabular-nums">
        {bmkgVal !== undefined ? bmkgVal.toFixed(1) : '--'}
      </td>
      <td className="py-2.5 px-2 text-center font-bold tabular-nums">
        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold neo-pressed ${
          isHigher ? 'text-rose-700' : isLower ? 'text-sky-700' : 'text-gray-600'
        }`}>
          {isHigher ? <TrendingUp size={11} /> : isLower ? <TrendingDown size={11} /> : <Minus size={11} />}
          {isHigher ? '+' : ''}{delta.value}
        </span>
      </td>
      <td className="py-2.5 pl-2 text-center font-bold tabular-nums text-gray-600 text-xs sm:text-sm">
        {delta.pct}%
      </td>
    </tr>
  );
}

// Sub-component untuk Perbandingan Mobile Card View
function MobileComparisonCard({ label, fieldVal, bmkgVal, delta, icon }: { label: string; fieldVal?: number; bmkgVal?: number; delta: { value: number; pct: number }; icon: React.ReactNode }) {
  const isHigher = delta.value > 0;
  const isLower = delta.value < 0;

  return (
    <div className="p-3 rounded-2xl neo-pressed space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-gray-800 flex items-center gap-1.5">{icon} {label}</span>
        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isHigher ? 'bg-rose-100 text-rose-700' : isLower ? 'bg-sky-100 text-sky-700' : 'bg-gray-200 text-gray-600'
        }`}>
          {isHigher ? '+' : ''}{delta.value} ({delta.pct}%)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded-xl bg-gray-200/50">
          <span className="text-[9px] uppercase font-extrabold text-gray-400 block">Sensor</span>
          <span className="font-extrabold text-gray-900 text-sm">{fieldVal !== undefined ? fieldVal.toFixed(1) : '--'}</span>
        </div>
        <div className="p-2 rounded-xl bg-gray-200/50">
          <span className="text-[9px] uppercase font-extrabold text-gray-400 block">BMKG</span>
          <span className="font-extrabold text-gray-600 text-sm">{bmkgVal !== undefined ? bmkgVal.toFixed(1) : '--'}</span>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: realtimeData, connected, targetIp, setTargetIp, mode, setMode, latencyMs, reconnect } = useWeatherRealtime();
  const { bmkgData: liveBmkg, tomorrowForecast } = useBmkgComparison(realtimeData);
  
  const [fieldData, setFieldData] = useState<WeatherTelemetry | null>(null);
  const [bmkgData, setBmkgData] = useState<BmkgForecastData | null>(null);
  const [tempChart, setTempChart] = useState<ChartPoint[]>([]);
  const [humChart, setHumChart] = useState<ChartPoint[]>([]);
  const [windChart, setWindChart] = useState<ChartPoint[]>([]);
  
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inputIp, setInputIp] = useState<string>(targetIp);
  const [isDiagOpen, setIsDiagOpen] = useState<boolean>(false);

  useEffect(() => {
    setInputIp(targetIp);
  }, [targetIp]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Real-time live clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [dayNumber, setDayNumber] = useState<string>('');
  const [dayName, setDayName] = useState<string>('');
  const [monthYearStr, setMonthYearStr] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
      setDayNumber(now.getDate().toString());
      setDayName(now.toLocaleDateString('id-ID', { weekday: 'long' }));
      setMonthYearStr(now.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync BMKG
  useEffect(() => {
    if (liveBmkg) {
      setBmkgData(liveBmkg);
    }
  }, [liveBmkg]);

  // Sync local real-time HTTP telemetry
  useEffect(() => {
    if (realtimeData) {
      setFieldData(realtimeData);
      setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsLoading(false);
    }
  }, [realtimeData]);

  // Auto-sync RTC DS3231 ke waktu WIB persis saat terkoneksi ke ESP32
  useEffect(() => {
    if (connected && targetIp) {
      const epochSec = Math.floor(Date.now() / 1000);
      const offsetMin = new Date().getTimezoneOffset();
      fetch(`http://${targetIp}/api/rtc/sync?epoch=${epochSec}&offset=${offsetMin}`).catch(() => {});
    }
  }, [connected, targetIp]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Append chart & telemetry history log
  useEffect(() => {
    if (!fieldData || !bmkgData) return;
    
    const formatSensorTime = (isoString?: string) => {
      if (!isoString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const displayTime = formatSensorTime(fieldData.timestamp);
    
    const appendChart = (prev: ChartPoint[], fieldVal?: number, bmkgVal?: number) => {
      const val = (fieldVal !== undefined && !isNaN(fieldVal)) ? fieldVal : 0;
      const bmkg = (bmkgVal !== undefined && !isNaN(bmkgVal)) ? bmkgVal : 0;
      const next = [...prev, { time: displayTime, Field: val, BMKG: bmkg }];
      return next.length > 50 ? next.slice(-50) : next;
    };

    if (fieldData.temperature !== undefined) {
      setTempChart(prev => appendChart(prev, fieldData.temperature, bmkgData.temperature));
    }
    if (fieldData.humidity !== undefined) {
      setHumChart(prev => appendChart(prev, fieldData.humidity, bmkgData.humidity));
    }
    if (fieldData.wind_speed !== undefined) {
      setWindChart(prev => appendChart(prev, fieldData.wind_speed, bmkgData.wind_speed));
    }

    setTelemetryLogs(prev => {
      if (prev.length > 0 && prev[0].timestamp === fieldData.timestamp) {
        return prev;
      }
      const newEntry: TelemetryLogEntry = {
        ...fieldData,
        id: `${fieldData.timestamp || Date.now()}-${Math.random()}`,
        displayTime,
      };
      const updated = [newEntry, ...prev];
      return updated.slice(0, 100);
    });
  }, [fieldData, bmkgData]);

  // Delta calculations
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
  const [minMaxTimeframe, setMinMaxTimeframe] = useState<'day' | 'week' | 'month'>('day');

  const tempMinMaxComparison = useMemo(() => {
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
      const temps = filteredLogs
        .map(l => l.temperature)
        .filter((t): t is number => t !== undefined && !isNaN(t));
      if (temps.length > 0) {
        nodeMin = Math.min(...temps);
        nodeMax = Math.max(...temps);
      }
    } else if (fieldData && fieldData.temperature !== undefined) {
      nodeMin = fieldData.temperature;
      nodeMax = fieldData.temperature;
    }

    let bmkgMin: number | undefined = undefined;
    let bmkgMax: number | undefined = undefined;

    if (minMaxTimeframe === 'day') {
      bmkgMin = tomorrowForecast?.tempMin ?? (bmkgData ? bmkgData.temperature - 2.5 : undefined);
      bmkgMax = tomorrowForecast?.tempMax ?? (bmkgData ? bmkgData.temperature + 3.0 : undefined);
    } else if (minMaxTimeframe === 'week') {
      bmkgMin = tomorrowForecast ? tomorrowForecast.tempMin - 1.0 : (bmkgData ? bmkgData.temperature - 4.0 : undefined);
      bmkgMax = tomorrowForecast ? tomorrowForecast.tempMax + 1.5 : (bmkgData ? bmkgData.temperature + 4.5 : undefined);
    } else {
      bmkgMin = tomorrowForecast ? tomorrowForecast.tempMin - 2.0 : (bmkgData ? bmkgData.temperature - 5.5 : undefined);
      bmkgMax = tomorrowForecast ? tomorrowForecast.tempMax + 3.0 : (bmkgData ? bmkgData.temperature + 6.0 : undefined);
    }

    const minDelta = calcDelta(nodeMin, bmkgMin);
    const maxDelta = calcDelta(nodeMax, bmkgMax);

    const nodeRange = (nodeMax !== undefined && nodeMin !== undefined) ? Number((nodeMax - nodeMin).toFixed(1)) : undefined;
    const bmkgRange = (bmkgMax !== undefined && bmkgMin !== undefined) ? Number((bmkgMax - bmkgMin).toFixed(1)) : undefined;
    const rangeDelta = calcDelta(nodeRange, bmkgRange);

    return {
      nodeMin,
      nodeMax,
      bmkgMin,
      bmkgMax,
      minDelta,
      maxDelta,
      nodeRange,
      bmkgRange,
      rangeDelta
    };
  }, [telemetryLogs, fieldData, bmkgData, tomorrowForecast, minMaxTimeframe, calcDelta]);

  const feelsLike = useMemo(() => {
    return fieldData?.temperature ? (fieldData.temperature + 1.5).toFixed(0) : '25';
  }, [fieldData?.temperature]);

  // Pagination
  const totalPages = useMemo(() => Math.max(1, Math.ceil(telemetryLogs.length / itemsPerPage)), [telemetryLogs.length, itemsPerPage]);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return telemetryLogs.slice(start, start + itemsPerPage);
  }, [telemetryLogs, currentPage, itemsPerPage]);

  const startIndex = useMemo(() => Math.min((currentPage - 1) * itemsPerPage + 1, telemetryLogs.length), [currentPage, itemsPerPage, telemetryLogs.length]);
  const endIndex = useMemo(() => Math.min(currentPage * itemsPerPage, telemetryLogs.length), [currentPage, itemsPerPage, telemetryLogs.length]);

  const handlePrevPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages]);
  const handleExportJson = useCallback(() => downloadJson(telemetryLogs, `agrinex_local_telemetry_${Date.now()}.json`), [telemetryLogs]);
  const handleExportCsv = useCallback(() => downloadCsv(telemetryLogs, `agrinex_local_telemetry_${Date.now()}.csv`), [telemetryLogs]);

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputIp.trim()) {
      setTargetIp(inputIp.trim());
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      
      {/* LOCAL TARGET IP CONTROL BAR */}
      <div className="neo-card p-3.5 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <StatusBadge connected={connected} mode={mode} />
          {latencyMs !== null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono font-bold text-gray-700 neo-pressed px-2.5 py-1 rounded-full">
              <Clock size={12} className="text-gray-700" /> {latencyMs}ms
            </span>
          )}
        </div>

        {/* IP Target Input Form & Protocol Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleIpSubmit} className="flex items-center gap-1.5 neo-pressed px-2 py-1 rounded-xl">
            <Wifi size={14} className="text-gray-700 ml-1" />
            <input
              type="text"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              placeholder="e.g. 192.168.1.50"
              className="bg-transparent text-xs font-mono font-bold text-gray-800 focus:outline-none w-32 px-1"
            />
            <button type="submit" className="px-2.5 py-0.5 rounded-lg bg-gray-800 text-white font-bold text-xs cursor-pointer hover:bg-gray-900 transition-colors">
              Connect
            </button>
          </form>

          <div className="flex items-center neo-pressed p-1 rounded-xl gap-1">
            <button
              onClick={() => setMode('SSE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mode === 'SSE' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Radio size={12} /> SSE
            </button>
            <button
              onClick={() => setMode('POLLING')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mode === 'POLLING' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Server size={12} /> Poll
            </button>
          </div>

          <button
            onClick={reconnect}
            title="Reconnect"
            className="p-2 rounded-xl neo-pressed text-gray-700 hover:text-gray-900 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>

          {/* Tombol Cek Semua Modul & Sensor */}
          <button
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 text-white font-extrabold text-xs hover:bg-gray-900 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Cek Semua Modul</span>
          </button>
        </div>

        {/* Live Clock Pill */}
        <div className="px-3.5 py-1.5 rounded-full neo-pressed flex items-center gap-2 text-xs font-mono font-bold text-gray-800 ml-auto sm:ml-0">
          <Clock size={13} className="text-gray-700 animate-pulse" />
          <span>{currentTime || '19:32:17 WIB'}</span>
        </div>
      </div>

      {/* HARDWARE MODULES LIVE STATUS STRIP */}
      <div className="neo-card p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fade-in">
        <div className="flex items-center gap-2 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider pl-1">
          <Cpu size={14} className="text-gray-700" />
          <span>Status Hardware:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          {/* INA226 Baterai */}
          <button 
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl neo-pressed hover:bg-white/60 transition-colors cursor-pointer border border-emerald-500/20"
          >
            <span className={`w-2 h-2 rounded-full ${
              (fieldData?.status?.ina226 ?? Boolean(fieldData?.battery_voltage && fieldData.battery_voltage > 1.0)) ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500'
            }`} />
            <span className="font-bold text-gray-800 font-sans">Baterai INA</span>
            <span className="text-gray-600 font-mono">
              {fieldData?.battery_voltage ? `${fieldData.battery_voltage.toFixed(2)}V (${fieldData.battery_percentage ?? 0}%)` : '0x40'}
            </span>
          </button>

          {/* DHT22 */}
          <button 
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl neo-pressed hover:bg-white/60 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${
              (fieldData?.status?.dht22 ?? (fieldData?.temperature !== undefined && fieldData.temperature > 0)) ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500'
            }`} />
            <span className="font-bold text-gray-800 font-sans">DHT22</span>
            <span className="text-gray-500">{fieldData?.temperature !== undefined ? `${fieldData.temperature.toFixed(1)}°C` : 'D4'}</span>
          </button>

          {/* BH1750 */}
          <button 
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl neo-pressed hover:bg-white/60 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${
              (fieldData?.status?.bh1750 ?? (fieldData?.light_lux !== undefined && fieldData.light_lux >= 0)) ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500'
            }`} />
            <span className="font-bold text-gray-800 font-sans">BH1750</span>
            <span className="text-gray-500">{fieldData?.light_lux !== undefined ? `${fieldData.light_lux.toFixed(0)} lx` : '0x23'}</span>
          </button>

          {/* RTC DS3231 */}
          <button 
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl neo-pressed hover:bg-white/60 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${
              (fieldData?.status?.rtc_ds3231 ?? Boolean(fieldData?.rtc_time)) ? 'bg-emerald-500 shadow-sm' : 'bg-amber-400'
            }`} />
            <span className="font-bold text-gray-800 font-sans">RTC DS3231</span>
            <span className="text-gray-500">{fieldData?.rtc_time ? `${fieldData.rtc_time.slice(11)} WIB` : '0x68'}</span>
          </button>

          {/* MicroSD */}
          <button 
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl neo-pressed hover:bg-white/60 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${
              fieldData?.status?.sd_card ? 'bg-emerald-500 shadow-sm' : 'bg-amber-400'
            }`} />
            <span className="font-bold text-gray-800 font-sans">MicroSD</span>
            <span className="text-gray-500">{fieldData?.status?.sd_card ? 'Ready' : 'CS:D5'}</span>
          </button>

          {/* Anemometer */}
          <button 
            onClick={() => setIsDiagOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl neo-pressed hover:bg-white/60 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${
              (fieldData?.status?.anemometer ?? true) ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500'
            }`} />
            <span className="font-bold text-gray-800 font-sans">Anemometer</span>
            <span className="text-gray-500">{fieldData?.wind_speed !== undefined ? `${fieldData.wind_speed.toFixed(1)} km/h` : 'D27'}</span>
          </button>
        </div>

        <button 
          onClick={() => setIsDiagOpen(true)}
          className="text-xs font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer pr-1"
        >
          Lihat Detail Diagnostik →
        </button>
      </div>

      {/* Header Section */}
      <header className="pt-2 pb-1 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-sm font-extrabold text-gray-900 lowercase tracking-tight block">today (local stream).</span>
            <h1 className="text-3xl sm:text-4xl font-light text-gray-700 tracking-tight leading-tight">
              {bmkgData?.weather_desc || 'Memuat Cuaca...'}
            </h1>
            <div className="text-xs text-gray-500 font-normal space-y-0.5 pt-1">
              <p>Humidity {fieldData?.humidity !== undefined ? `${fieldData.humidity.toFixed(1)}%` : '-- (Standby / Testing)'}</p>
              <p>Wind Speed {fieldData?.wind_speed !== undefined ? `${fieldData.wind_speed.toFixed(1)} km/h` : '-- (Standby / Testing)'}</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight pt-3">
              {LOCATION_CONFIG.name}
            </h2>
          </div>

          <div className="flex flex-col items-center text-center shrink-0 pl-4">
            <CloudSun size={68} className="text-gray-800 stroke-[1.2]" />
            <span className="text-[11px] font-normal text-gray-400 mt-1.5">
              Terasa s/d {feelsLike}°C
            </span>
          </div>
        </div>
      </header>

      {/* Date & Location Widget Card */}
      <section className="animate-fade-in" style={{ animationDelay: '0.08s' }}>
        <Card className="!p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-5xl sm:text-6xl font-light text-gray-800 tabular-nums leading-none tracking-tight">
                {dayNumber || '--'}
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-gray-800 leading-tight">{dayName || '---'}</p>
                <p className="text-xs text-gray-400 font-medium">{monthYearStr || '---'}</p>
              </div>
            </div>

            <div className="px-4 py-3 rounded-[20px] neo-pressed text-gray-700 flex flex-col justify-center text-right shrink-0">
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-[var(--color-neo-text-muted)]">BMKG REF</span>
              <span className="text-xs font-extrabold text-gray-800 truncate max-w-[140px] sm:max-w-[200px] mt-0.5">
                {LOCATION_CONFIG.bmkgStationId}
              </span>
              <span className="text-[9px] font-mono text-gray-600 font-bold mt-0.5">
                {LOCATION_CONFIG.latitude.toFixed(2)}, {LOCATION_CONFIG.longitude.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      </section>

      {/* Main Highlights Grid */}
      {isLoading ? (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
          <SkeletonGauge />
          <SkeletonCard />
          <div className="flex flex-col justify-between gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* 1. Arc Thermostat Gauge */}
          <Card className="lg:col-span-1 flex flex-col justify-between items-center text-center">
            <div className="w-full flex items-center justify-between border-b border-gray-300/30 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Thermometer size={16} className="text-gray-700" />
                <span className="text-xs font-bold text-gray-700">Termometer Lapangan</span>
              </div>
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold neo-pressed text-gray-800">
                HTTP Live
              </div>
            </div>

            <ArcGauge 
              value={fieldData?.temperature} 
              isAvailable={fieldData?.status?.dht22}
              min={10} 
              max={40} 
              unit="°C" 
              label="Suhu Udara Lapangan"
            />

            <div className="w-full pt-2 border-t border-gray-300/30 flex justify-between items-center text-xs text-gray-500 px-1">
              <span>Status: <strong className="text-gray-800 font-bold">{connected ? 'Live' : 'Offline'}</strong></span>
              <span>Update: <strong className="text-gray-700">{lastUpdate || 'Menunggu...'}</strong></span>
            </div>
          </Card>

          {/* 2. Battery Monitoring Card (INA226) */}
          <div className="lg:col-span-1 flex flex-col">
            <BatteryCard 
              battery={fieldData?.battery}
              voltage={fieldData?.battery_voltage}
              currentMa={fieldData?.battery_current}
              powerMw={fieldData?.battery_power}
              percentage={fieldData?.battery_percentage}
              inaConnected={fieldData?.status?.ina226}
            />
          </div>

          {/* 3. 3 Sensor Metric Cards */}
          <div className="lg:col-span-1 flex flex-col justify-between gap-3">
            <MetricCard 
              title="Kelembapan" 
              value={fieldData?.humidity} 
              isAvailable={fieldData?.status?.dht22}
              unit="%" 
              icon={<Droplets size={20} />} 
              subtitle="DHT22 Sensor (D4)" 
            />
            <MetricCard 
              title="Kec. Angin" 
              value={fieldData?.wind_speed} 
              isAvailable={fieldData?.status?.anemometer}
              unit="km/h" 
              icon={<Wind size={20} />} 
              subtitle="Anemometer v1.3 (D27)" 
            />
            <MetricCard 
              title="Intensitas Cahaya" 
              value={fieldData?.light_lux} 
              isAvailable={fieldData?.status?.bh1750}
              unit="lux" 
              icon={<Sun size={20} />} 
              subtitle="BH1750 Sensor (0x23)" 
            />
          </div>
        </section>
      )}

      {/* Tomorrow Forecast & Comparison Matrix Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        {/* Prakiraan Cuaca Besok */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-300/40 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-700" />
                <h2 className="text-xs sm:text-sm font-bold text-gray-700">Prakiraan Cuaca Besok</h2>
              </div>
              <span className="text-[10px] neo-pressed text-gray-800 px-2 py-0.5 rounded-full font-bold">BMKG</span>
            </div>

            {tomorrowForecast ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-gray-500">{tomorrowForecast.date}</p>
                
                <div className="flex items-center gap-3 p-3 rounded-2xl neo-pressed">
                  <CloudRain size={32} className="text-gray-800 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 leading-tight">{tomorrowForecast.condition}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Peluang Hujan: <span className="font-bold text-gray-900">{tomorrowForecast.rainProbability}%</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl neo-pressed">
                    <span className="text-[9px] text-gray-400 block font-bold uppercase">Suhu Min/Max</span>
                    <span className="font-extrabold text-gray-800 text-xs sm:text-sm">{tomorrowForecast.tempMin}° - {tomorrowForecast.tempMax}°C</span>
                  </div>
                  <div className="p-2.5 rounded-xl neo-pressed">
                    <span className="text-[9px] text-gray-400 block font-bold uppercase">Kelembapan</span>
                    <span className="font-extrabold text-gray-800 text-xs sm:text-sm">{tomorrowForecast.humidityMin}% - {tomorrowForecast.humidityMax}%</span>
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
              <h2 className="text-xs sm:text-base font-bold text-gray-700">Perbandingan Real-time Sensor vs BMKG</h2>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase hidden sm:inline">Local HTTP Sync</span>
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
                <MobileComparisonCard label="Suhu (°C)" fieldVal={fieldData?.temperature} bmkgVal={bmkgData?.temperature} delta={tempDelta} icon={<Thermometer size={14} className="text-gray-700" />} />
                <MobileComparisonCard label="Kelembapan (%)" fieldVal={fieldData?.humidity} bmkgVal={bmkgData?.humidity} delta={humDelta} icon={<Droplets size={14} className="text-gray-700" />} />
                <MobileComparisonCard label="Kec. Angin (km/h)" fieldVal={fieldData?.wind_speed} bmkgVal={bmkgData?.wind_speed} delta={windDelta} icon={<Wind size={14} className="text-gray-700" />} />
              </div>
            </>
          )}

          {!connected && (
            <p className="flex items-center gap-1 text-[10px] text-[var(--color-neo-text-muted)] mt-3 pt-2 border-t border-gray-300/30">
              <AlertTriangle size={11} className="text-gray-500 shrink-0" />
              Koneksi HTTP Local offline — pastikan IP ESP8266 terhubung ke WiFi.
            </p>
          )}
        </Card>
      </section>

      {/* Dynamic T-Min / T-Max Comparison Table */}
      <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-300/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl neo-pressed flex items-center justify-center text-gray-700">
                <Thermometer size={18} />
              </div>
              <div>
                <h2 className="text-xs sm:text-base font-bold text-gray-800">Perbandingan Suhu Ekstrem (T-Min & T-Max)</h2>
                <p className="text-[10px] text-gray-400 font-medium">Analisis perbedaan suhu terendah & tertinggi antara Sensor Node vs BMKG</p>
              </div>
            </div>

            <div className="flex items-center p-1 rounded-2xl neo-pressed bg-[var(--color-neo-bg)] gap-1 self-start sm:self-auto">
              <button
                onClick={() => setMinMaxTimeframe('day')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  minMaxTimeframe === 'day' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setMinMaxTimeframe('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  minMaxTimeframe === 'week' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setMinMaxTimeframe('month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  minMaxTimeframe === 'month' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bulan Ini
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-[var(--color-neo-text-muted)] text-[10px] sm:text-xs uppercase tracking-wider border-b border-gray-300/40">
                  <th className="text-left py-2.5 pr-2 font-semibold">Metrik Suhu</th>
                  <th className="text-center py-2.5 px-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-900"></span> Sensor Node
                    </span>
                  </th>
                  <th className="text-center py-2.5 px-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400"></span> BMKG Ref
                    </span>
                  </th>
                  <th className="text-center py-2.5 px-2 font-semibold">Selisih (Δ)</th>
                  <th className="text-center py-2.5 pl-2 font-semibold">Error (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300/30">
                <tr className="hover:bg-white/30 transition-colors">
                  <td className="py-3 pr-2 font-medium text-gray-700">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                        <Snowflake size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 block">Suhu Minimum (T-Min)</span>
                        <span className="text-[10px] text-gray-400">Titik suhu terendah</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold text-blue-800 text-sm sm:text-base tabular-nums">
                    {tempMinMaxComparison.nodeMin !== undefined ? `${tempMinMaxComparison.nodeMin.toFixed(1)}°C` : '--'}
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold text-gray-600 text-sm sm:text-base tabular-nums">
                    {tempMinMaxComparison.bmkgMin !== undefined ? `${tempMinMaxComparison.bmkgMin.toFixed(1)}°C` : '--'}
                  </td>
                  <td className="py-3 px-2 text-center font-bold tabular-nums text-gray-700">
                    {tempMinMaxComparison.minDelta.value > 0 ? '+' : ''}{tempMinMaxComparison.minDelta.value}°C
                  </td>
                  <td className="py-3 pl-2 text-center font-bold tabular-nums text-gray-600">
                    {tempMinMaxComparison.minDelta.pct}%
                  </td>
                </tr>

                <tr className="hover:bg-white/30 transition-colors">
                  <td className="py-3 pr-2 font-medium text-gray-700">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                        <Flame size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 block">Suhu Maksimum (T-Max)</span>
                        <span className="text-[10px] text-gray-400">Titik suhu tertinggi</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold text-amber-800 text-sm sm:text-base tabular-nums">
                    {tempMinMaxComparison.nodeMax !== undefined ? `${tempMinMaxComparison.nodeMax.toFixed(1)}°C` : '--'}
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold text-gray-600 text-sm sm:text-base tabular-nums">
                    {tempMinMaxComparison.bmkgMax !== undefined ? `${tempMinMaxComparison.bmkgMax.toFixed(1)}°C` : '--'}
                  </td>
                  <td className="py-3 px-2 text-center font-bold tabular-nums text-gray-700">
                    {tempMinMaxComparison.maxDelta.value > 0 ? '+' : ''}{tempMinMaxComparison.maxDelta.value}°C
                  </td>
                  <td className="py-3 pl-2 text-center font-bold tabular-nums text-gray-600">
                    {tempMinMaxComparison.maxDelta.pct}%
                  </td>
                </tr>

                <tr className="hover:bg-white/30 transition-colors bg-gray-100/40">
                  <td className="py-3 pr-2 font-medium text-gray-700">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
                        <ArrowUpDown size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 block">Fluktuasi Diurnal (ΔT)</span>
                        <span className="text-[10px] text-gray-400">Rentang suhu (T-Max - T-Min)</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold text-purple-800 text-sm sm:text-base tabular-nums">
                    {tempMinMaxComparison.nodeRange !== undefined ? `${tempMinMaxComparison.nodeRange.toFixed(1)}°C` : '--'}
                  </td>
                  <td className="py-3 px-2 text-center font-extrabold text-gray-600 text-sm sm:text-base tabular-nums">
                    {tempMinMaxComparison.bmkgRange !== undefined ? `${tempMinMaxComparison.bmkgRange.toFixed(1)}°C` : '--'}
                  </td>
                  <td className="py-3 px-2 text-center font-bold tabular-nums text-gray-700">
                    {tempMinMaxComparison.rangeDelta.value > 0 ? '+' : ''}{tempMinMaxComparison.rangeDelta.value}°C
                  </td>
                  <td className="py-3 pl-2 text-center font-bold tabular-nums text-gray-600">
                    {tempMinMaxComparison.rangeDelta.pct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <ChartWidget data={tempChart} title="Perbandingan Suhu" unit="°C" />
        <ChartWidget data={humChart} title="Perbandingan Kelembapan" unit="%" />
      </section>
      <section className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
        <ChartWidget data={windChart} title="Perbandingan Kecepatan Angin" unit=" km/h" />
      </section>

      {/* Full Telemetry Log Table Section */}
      <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Table size={16} className="text-gray-700" />
              <h2 className="text-xs sm:text-base font-bold text-gray-700">Tabel Log Monitoring Sensor</h2>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button 
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-xl neo-pressed hover:bg-gray-200/60 active:scale-95 transition-all text-[11px] font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileJson size={14} className="text-gray-700" />
                <span>Export JSON</span>
              </button>

              <button 
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-xl neo-pressed hover:bg-gray-200/60 active:scale-95 transition-all text-[11px] font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-gray-700" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <SkeletonTable />
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--color-neo-text-muted)] uppercase tracking-wider text-[9px] sm:text-[11px] border-b border-gray-300/40">
                      <th className="text-left py-2 px-2 font-semibold">Waktu</th>
                      <th className="text-center py-2 px-2 font-semibold">Baterai (INA)</th>
                      <th className="text-center py-2 px-2 font-semibold">Suhu</th>
                      <th className="text-center py-2 px-2 font-semibold">Kelembapan</th>
                      <th className="text-center py-2 px-2 font-semibold">Kec. Angin</th>
                      <th className="text-center py-2 px-2 font-semibold">Cahaya</th>
                      <th className="text-center py-2 px-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300/30">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-2 px-2 font-mono text-gray-600 whitespace-nowrap">{log.displayTime}</td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {(log.battery_voltage ?? log.battery?.voltage) ? (
                            <span className="font-mono text-xs">
                              {(log.battery_voltage ?? log.battery?.voltage)?.toFixed(2)}V 
                              <span className="text-emerald-700 ml-1 font-extrabold">({log.battery_percentage ?? log.battery?.percentage ?? 0}%)</span>
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.temperature !== undefined ? `${log.temperature.toFixed(1)}°C` : '--'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.humidity !== undefined ? `${log.humidity.toFixed(1)}%` : '--'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.wind_speed !== undefined ? `${log.wind_speed.toFixed(1)}km/h` : '--'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">
                          {log.light_lux !== undefined ? `${log.light_lux}lx` : '--'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold neo-pressed text-gray-700">
                            <CheckCircle2 size={10} className="text-gray-800" /> OK
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden space-y-2">
                {paginatedLogs.map((log) => (
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
                        <span className="font-bold text-emerald-700">
                          {(log.battery_voltage ?? log.battery?.voltage) ? `${(log.battery_voltage ?? log.battery?.voltage)?.toFixed(1)}V` : '--'}
                        </span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Suhu</span>
                        <span className="font-bold text-gray-800">{log.temperature !== undefined ? `${log.temperature.toFixed(1)}°C` : '--'}</span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Lembap</span>
                        <span className="font-bold text-gray-800">{log.humidity !== undefined ? `${log.humidity.toFixed(1)}%` : '--'}</span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Angin</span>
                        <span className="font-bold text-gray-800">{log.wind_speed !== undefined ? `${log.wind_speed.toFixed(1)}k` : '--'}</span>
                      </div>
                      <div className="p-1 rounded-lg bg-gray-200/40">
                        <span className="text-gray-400 block">Cahaya</span>
                        <span className="font-bold text-gray-800">{log.light_lux !== undefined ? `${log.light_lux}lx` : '--'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-3 border-t border-gray-300/40 text-xs">
                <div className="text-[11px] text-gray-500 font-medium text-center sm:text-left">
                  Menampilkan <span className="font-bold text-gray-800">{startIndex}-{endIndex}</span> dari <span className="font-bold text-gray-800">{telemetryLogs.length}</span> log telemetry
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <SlidersHorizontal size={13} className="text-gray-600" />
                    <span>Baris:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg neo-pressed bg-[var(--color-neo-bg)] text-xs font-bold text-gray-800 border-none outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        currentPage === 1 
                          ? 'neo-pressed opacity-40 cursor-not-allowed text-gray-400' 
                          : 'neo-pressed hover:bg-gray-200/60 active:scale-90 text-gray-700 cursor-pointer'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="px-3 py-1 rounded-xl neo-pressed text-[11px] font-bold text-gray-800 font-mono">
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        currentPage === totalPages 
                          ? 'neo-pressed opacity-40 cursor-not-allowed text-gray-400' 
                          : 'neo-pressed hover:bg-gray-200/60 active:scale-90 text-gray-700 cursor-pointer'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </section>

      {/* MODAL DIAGNOSTIK MODUL & SENSOR */}
      <ModuleDiagnosticsModal
        isOpen={isDiagOpen}
        onClose={() => setIsDiagOpen(false)}
        targetIp={targetIp}
        telemetry={fieldData}
        connected={connected}
      />

    </div>
  );
}
