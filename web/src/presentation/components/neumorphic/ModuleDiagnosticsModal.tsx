import React, { useState } from 'react';
import { 
  X, RefreshCw, CheckCircle2, AlertTriangle, XCircle, 
  Thermometer, Sun, Wind, Clock, HardDrive, 
  ShieldCheck, Activity, Info, BatteryCharging, Battery, Zap
} from 'lucide-react';
import type { WeatherTelemetry } from '../../../core/types/weather.types';

interface DiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
  targetIp: string;
  telemetry: WeatherTelemetry | null;
  connected: boolean;
}

interface DiagnosticResponse {
  all_ok: boolean;
  timestamp_ms: number;
  modules?: {
    ina226?: { 
      name: string; 
      bus: string; 
      address: string; 
      connected: boolean; 
      voltage?: number; 
      current_ma?: number; 
      power_mw?: number; 
      percentage?: number; 
      charging?: boolean; 
      message: string 
    };
    dht22?: { name: string; pin: string; connected: boolean; temperature?: number; humidity?: number; message: string };
    bh1750?: { name: string; bus: string; address: string; connected: boolean; light_lux?: number; message: string };
    rtc_ds3231?: { name: string; bus: string; connected: boolean; datetime?: string; message: string };
    sd_card?: { name: string; bus: string; connected: boolean; write_ok?: boolean; message: string };
    anemometer?: { name: string; pin: string; connected: boolean; pulses?: number; wind_speed?: number; message: string };
  };
  system?: {
    ip: string;
    ssid: string;
    rssi: number;
    free_heap: number;
    uptime_sec: number;
  };
}

export function ModuleDiagnosticsModal({ isOpen, onClose, targetIp, telemetry, connected }: DiagnosticsProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [diagData, setDiagData] = useState<DiagnosticResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`http://${targetIp}/api/diagnostics`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: DiagnosticResponse = await res.json();
        setDiagData(data);
      } else {
        throw new Error(`HTTP Error: ${res.status}`);
      }
    } catch (err: any) {
      console.warn('Diagnostics direct API fetch note:', err);
      // Fallback construct from live telemetry if available
      setErrorMsg(`Tidak dapat memanggil /api/diagnostics langsung (${err.message || 'Timeout'}). Menampilkan status dari telemetry aktif.`);
    } finally {
      setLoading(false);
    }
  };

  // Initial trigger on open
  React.useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, targetIp]);

  if (!isOpen) return null;

  // Derive status from diagData OR fallback to telemetry
  const inaOk = diagData?.modules?.ina226?.connected ?? telemetry?.status?.ina226 ?? Boolean(telemetry?.battery?.ok || (telemetry?.battery_voltage && telemetry.battery_voltage > 1.0));
  const dhtOk = diagData?.modules?.dht22?.connected ?? telemetry?.status?.dht22 ?? (telemetry?.temperature !== undefined && telemetry.temperature > 0);
  const bhOk  = diagData?.modules?.bh1750?.connected ?? telemetry?.status?.bh1750 ?? (telemetry?.light_lux !== undefined && telemetry.light_lux >= 0);
  const rtcOk = diagData?.modules?.rtc_ds3231?.connected ?? telemetry?.status?.rtc_ds3231 ?? (telemetry?.rtc_time !== undefined && telemetry.rtc_time !== "");
  const sdOk  = diagData?.modules?.sd_card?.connected ?? telemetry?.status?.sd_card ?? false;
  const anemoOk = diagData?.modules?.anemometer?.connected ?? telemetry?.status?.anemometer ?? true;

  const totalConnected = [inaOk, dhtOk, bhOk, rtcOk, sdOk, anemoOk].filter(Boolean).length;

  const batV = diagData?.modules?.ina226?.voltage ?? telemetry?.battery_voltage ?? telemetry?.battery?.voltage ?? 0;
  const batI = diagData?.modules?.ina226?.current_ma ?? telemetry?.battery_current ?? telemetry?.battery?.current_ma ?? 0;
  const batP = diagData?.modules?.ina226?.power_mw ?? telemetry?.battery_power ?? telemetry?.battery?.power_mw ?? 0;
  const batPct = diagData?.modules?.ina226?.percentage ?? telemetry?.battery_percentage ?? telemetry?.battery?.percentage ?? 0;
  const isCharging = diagData?.modules?.ina226?.charging ?? telemetry?.battery?.charging ?? (batI > 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="neo-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 rounded-3xl border border-white/40 shadow-2xl">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-300/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl neo-pressed text-gray-800">
              <ShieldCheck size={22} className="text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                Pemeriksaan Status Modul & Sensor (ESP32)
              </h2>
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                <span>Target Node:</span>
                <span className="font-mono px-2 py-0.5 rounded-md neo-pressed text-gray-800 font-bold">{targetIp}</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${connected ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ● {connected ? 'Terkoneksi' : 'Terputus'}
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl neo-pressed text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action & Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl neo-pressed">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-gray-700" />
            <span className="text-xs font-bold text-gray-800">
              Ringkasan Health Check: <span className="text-emerald-700 font-extrabold">{totalConnected} dari 6 Modul</span> Aktif
            </span>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 text-white text-xs font-bold hover:bg-gray-900 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Menguji...' : 'Uji Ulang Sekarang'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modules Status List */}
        <div className="space-y-3">

          {/* 1. INA226 Battery & Power Monitor */}
          <div className="neo-card p-4 rounded-2xl flex items-start justify-between gap-3 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${inaOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {isCharging ? <BatteryCharging size={18} className="animate-pulse" /> : <Battery size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-gray-900">INA226 Battery & Power Monitor</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">I2C (D21 SDA, D22 SCL) [0x40]</span>
                  {isCharging && (
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-0.5">
                      <Zap size={10} className="fill-emerald-600 text-emerald-600" /> Charging
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {diagData?.modules?.ina226?.message || (inaOk ? 'Modul INA226 terdeteksi normal dan mengukur baterai.' : 'Sensor INA226 tidak merespon di alamat 0x40.')}
                </p>
                {inaOk && batV > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-gray-700 font-mono">
                    <span>Tegangan: <b>{batV.toFixed(2)} V</b></span>
                    <span>Persentase: <b className="text-emerald-700">{batPct}%</b></span>
                    <span>Arus: <b>{batI.toFixed(1)} mA</b></span>
                    <span>Daya: <b>{batP.toFixed(0)} mW</b></span>
                  </div>
                )}
              </div>
            </div>
            <div>
              {inaOk ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} /> OK (Active)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  <XCircle size={13} /> Offline
                </span>
              )}
            </div>
          </div>

          {/* 2. DHT22 Suhu & Kelembapan */}
          <div className="neo-card p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${dhtOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Thermometer size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">DHT22 Suhu & Kelembapan</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">D4 (GPIO4)</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {diagData?.modules?.dht22?.message || (dhtOk ? 'Komunikasi single-bus normal.' : 'Sensor belum dicolok / dalam tahap pengujian.')}
                </p>
                {telemetry && telemetry.temperature !== undefined && telemetry.humidity !== undefined && (
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-gray-700 font-mono">
                    <span>Suhu: <b>{telemetry.temperature.toFixed(1)}°C</b></span>
                    <span>Kelembapan: <b>{telemetry.humidity.toFixed(1)}%</b></span>
                  </div>
                )}
              </div>
            </div>
            <div>
              {dhtOk ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} /> OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <AlertTriangle size={13} /> Testing
                </span>
              )}
            </div>
          </div>

          {/* 3. BH1750 Intensitas Cahaya */}
          <div className="neo-card p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${bhOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Sun size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">BH1750 Intensitas Cahaya</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">I2C (D21 SDA, D22 SCL) [0x23]</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {diagData?.modules?.bh1750?.message || (bhOk ? 'Bus I2C normal merespon pada alamat 0x23.' : 'Sensor belum dicolok / dalam tahap pengujian.')}
                </p>
                {telemetry && telemetry.light_lux !== undefined && (
                  <div className="mt-2 text-xs font-semibold text-gray-700 font-mono">
                    <span>Cahaya: <b>{telemetry.light_lux.toFixed(0)} Lux</b></span>
                  </div>
                )}
              </div>
            </div>
            <div>
              {bhOk ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} /> OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <AlertTriangle size={13} /> Testing
                </span>
              )}
            </div>
          </div>

          {/* 4. RTC DS3231 */}
          <div className="neo-card p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${rtcOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Clock size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">RTC DS3231 Real-Time Clock</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">I2C (D21 SDA, D22 SCL) [0x68]</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {diagData?.modules?.rtc_ds3231?.message || (rtcOk ? 'Jam presisi aktif dan sinkron.' : 'RTC belum dicolok / dalam tahap pengujian.')}
                </p>
                {(diagData?.modules?.rtc_ds3231?.datetime || telemetry?.rtc_time) && (
                  <div className="mt-2 text-xs font-semibold text-gray-700 font-mono">
                    <span>Waktu Hardware: <b>{diagData?.modules?.rtc_ds3231?.datetime || telemetry?.rtc_time}</b></span>
                  </div>
                )}
              </div>
            </div>
            <div>
              {rtcOk ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} /> OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <AlertTriangle size={13} /> Testing
                </span>
              )}
            </div>
          </div>

          {/* 5. MicroSD Card */}
          <div className="neo-card p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${sdOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <HardDrive size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">MicroSD Card Datalogger</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">SPI (D18 SCK, D19 MISO, D23 MOSI, D5 CS)</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {diagData?.modules?.sd_card?.message || (sdOk ? 'File system FAT32 siap untuk logging /datalog.csv.' : 'Modul MicroSD belum dicolok / dalam tahap pengujian.')}
                </p>
              </div>
            </div>
            <div>
              {sdOk ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} /> OK (Ready)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <AlertTriangle size={13} /> Testing
                </span>
              )}
            </div>
          </div>

          {/* 6. Anemometer */}
          <div className="neo-card p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${anemoOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                <Wind size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">Zhafira Anemometer v1.3</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">Interrupt D27 (GPIO27)</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {diagData?.modules?.anemometer?.message || 'Jalur pulsa interrupt D27 mendengarkan putaran mangkok.'}
                </p>
                {telemetry && (
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-gray-700 font-mono">
                    <span>Kecepatan: <b>{telemetry.wind_speed !== undefined ? `${telemetry.wind_speed.toFixed(1)} km/h` : '--'}</b></span>
                    <span>Total Pulsa: <b>{telemetry.raw_pulses ?? 0}</b></span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={13} /> OK
              </span>
            </div>
          </div>

        </div>

        {/* Troubleshooting Guide Accordion / Note */}
        <div className="p-3.5 rounded-2xl bg-gray-100 text-gray-700 text-xs space-y-1.5 border border-gray-200">
          <div className="font-bold flex items-center gap-1.5 text-gray-900">
            <Info size={14} className="text-blue-600" />
            <span>Petunjuk Wiring ESP32 Sesuai Skematik EasyEDA:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><b>INA226 (Baterai):</b> SDA ke <b>D21</b>, SCL ke <b>D22</b>, VCC ke <b>3V3</b>, GND ke <b>GND</b>. Shunt (IN+/IN-) terhubung seri pada jalur baterai TP5000.</li>
            <li><b>I2C Bus Paralel:</b> SDA (INA226, BH1750, RTC DS3231) ke <b>D21</b>, SCL ke <b>D22</b>. Pull-up resistor R3 & R4 4.7k ke 3V3.</li>
            <li><b>Sensor Lainnya:</b> DHT22 ke <b>D4</b>, Anemometer ke <b>D27</b> (pull-up R1 4.7k).</li>
            <li><b>MicroSD SPI:</b> SCK ke <b>D18</b>, MISO ke <b>D19</b>, MOSI ke <b>D23</b>, dan CS ke <b>D5</b> (pull-up R2 10k).</li>
            <li><b>Catu Daya:</b> Output boost TPS61088 (+5V) ke pin <b>VIN</b> ESP32. Pastikan common ground pada semua pin <b>GND</b>.</li>
          </ul>
        </div>

        {/* Footer Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 text-white font-bold text-xs hover:bg-gray-900 transition-colors cursor-pointer shadow-md"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
