import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthService } from '../../core/services/AuthService';
import { 
  DEFAULT_DEVICE_CONFIG, 
  ESP32_DEFAULT_PINS, 
  ESP8266_DEFAULT_PINS,
  type DeviceConfiguration,
  type BoardType,
  type BackendProtocolType
} from '../../core/types/device-config.types';

interface OnboardingViewProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<number>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('step');
      if (p) {
        const n = parseInt(p, 10);
        if (n >= 1 && n <= 5) return n;
      }
    } catch {}
    return 1;
  });
  const totalSteps = 5;

  // Configuration state
  const [stationName, setStationName] = useState<string>(() => localStorage.getItem('agrinex_station_name') || 'Stasiun Purwawinangun (ESP32-01)');
  const [elevation, setElevation] = useState<number>(() => {
    const saved = localStorage.getItem('agrinex_station_elevation');
    return saved ? Number(saved) : 555;
  });
  const [selectedBoard, setSelectedBoard] = useState<BoardType>('esp32');
  const [wifiSsid, setWifiSsid] = useState<string>('WiFi 2');
  const [wifiPass, setWifiPass] = useState<string>('barcelona');
  const [targetIp, setTargetIp] = useState<string>(() => localStorage.getItem('agrinex_esp_target_ip') || '192.168.18.3');
  const [config, setConfig] = useState<DeviceConfiguration>(() => {
    const saved = localStorage.getItem('agrinex_device_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_DEVICE_CONFIG;
  });

  // Self-test diagnostic state
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [pushingConfig, setPushingConfig] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  // Sync with live ESP32 on mount
  useEffect(() => {
    const fetchLiveConfig = async () => {
      try {
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const url = isHttps ? `/esp32-proxy/api/config` : `http://${targetIp}/api/config`;
        const res = await fetch(url);
        if (res.ok) {
          const live = await res.json();
          if (live && live.modules) {
            setConfig(prev => ({
              ...prev,
              modules: { ...prev.modules, ...live.modules },
              pins: live.pins ? { ...prev.pins, ...live.pins } : prev.pins,
              backend: live.backend ? { ...prev.backend, ...live.backend } : prev.backend
            }));
          }
        }
      } catch {
        // Fallback silently if offline
      }
    };
    fetchLiveConfig();
  }, [targetIp]);

  const handleBoardSelect = (board: BoardType) => {
    setSelectedBoard(board);
    if (board === 'esp32') {
      setConfig(prev => ({
        ...prev,
        pins: { ...ESP32_DEFAULT_PINS }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        pins: { ...ESP8266_DEFAULT_PINS }
      }));
    }
  };

  const handleModuleToggle = (key: keyof DeviceConfiguration['modules']) => {
    setConfig(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: !prev.modules[key]
      }
    }));
  };

  const handleRunSelfTest = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const endpoint = isHttps ? `/esp32-proxy/api/sensors` : `http://${targetIp}/api/sensors`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      } else {
        throw new Error(`Kode: ${res.status}`);
      }
    } catch (err: any) {
      setTestError(`Gagal terhubung (${err.message || 'Timeout'})`);
    } finally {
      setTesting(false);
    }
  };

  const handlePushConfigToDevice = async () => {
    setPushingConfig(true);
    setPushStatus(null);

    try {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const endpoint = isHttps ? `/esp32-proxy/api/config` : `http://${targetIp}/api/config`;

      const payload = {
        ...config,
        station_name: stationName,
        elevation: elevation,
        wifi: { ssid: wifiSsid, password: wifiPass }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setPushStatus('Tersimpan di memori ESP32');
      } else {
        setPushStatus(`Status respons: ${res.status}`);
      }
    } catch (err: any) {
      setPushStatus(`Gagal kirim: ${err.message || 'Offline'}`);
    } finally {
      setPushingConfig(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('agrinex_device_config', JSON.stringify(config));
    localStorage.setItem('agrinex_esp_target_ip', targetIp);
    localStorage.setItem('agrinex_station_name', stationName);
    localStorage.setItem('agrinex_station_elevation', elevation.toString());
    AuthService.setOnboardingCompleted(true);
    window.dispatchEvent(new Event('storage'));
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="neo-card p-6 sm:p-7 space-y-5 rounded-3xl border border-white/60">
          
          {/* Minimalist Top Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    s === step
                      ? 'w-6 bg-gray-900'
                      : s < step
                      ? 'w-2 bg-emerald-600'
                      : 'w-2 bg-gray-300'
                  }`}
                  title={`Langkah ${s}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500">
                {step} / {totalSteps}
              </span>
              {onSkip && (
                <>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={onSkip}
                    className="text-[11px] text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Lewati
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ================= STEP 1: Profil Stasiun ================= */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-gray-900">Profil Stasiun</h2>
                <p className="text-[11px] text-gray-500">Identitas dan elevasi lahan.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider block">
                  Nama Stasiun
                </label>
                <div className="neo-pressed px-3 py-2 rounded-xl">
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="Stasiun Purwawinangun (ESP32-01)"
                    className="w-full bg-transparent text-xs text-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider block">
                  Elevasi (mdpl)
                </label>
                <div className="neo-pressed px-3 py-2 rounded-xl flex items-center justify-between">
                  <input
                    type="number"
                    value={elevation}
                    onChange={(e) => setElevation(Number(e.target.value))}
                    placeholder="555"
                    className="w-full bg-transparent text-xs text-gray-900 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] font-bold text-gray-500">mdpl</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: Mikrokontroler & WiFi ================= */}
          {step === 2 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-gray-900">Hardware &amp; WiFi</h2>
                <p className="text-[11px] text-gray-500">Board mikrokontroler dan jaringan.</p>
              </div>

              {/* Minimal Board Switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleBoardSelect('esp32')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    selectedBoard === 'esp32'
                      ? 'neo-pressed border border-sky-500/50 text-sky-800 font-bold'
                      : 'border border-gray-300/70 bg-white/30 text-gray-700 hover:bg-white/70'
                  }`}
                >
                  ESP32
                </button>
                <button
                  type="button"
                  onClick={() => handleBoardSelect('esp8266')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    selectedBoard === 'esp8266'
                      ? 'neo-pressed border border-sky-500/50 text-sky-800 font-bold'
                      : 'border border-gray-300/70 bg-white/30 text-gray-700 hover:bg-white/70'
                  }`}
                >
                  ESP8266
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider block">
                  WiFi SSID
                </label>
                <div className="neo-pressed px-3 py-2 rounded-xl">
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="WiFi 2"
                    className="w-full bg-transparent text-xs text-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider block">
                  WiFi Password
                </label>
                <div className="neo-pressed px-3 py-2 rounded-xl">
                  <input
                    type="password"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-xs text-gray-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider block">
                  IP Target Node
                </label>
                <div className="neo-pressed px-3 py-2 rounded-xl">
                  <input
                    type="text"
                    value={targetIp}
                    onChange={(e) => setTargetIp(e.target.value)}
                    placeholder="192.168.18.3"
                    className="w-full bg-transparent text-xs text-sky-800 font-bold focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: Sensor Terpasang ================= */}
          {step === 3 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-gray-900">Sensor Lapangan</h2>
                <p className="text-[11px] text-gray-500">Pilih modul yang terpasang.</p>
              </div>

              <div className="space-y-1.5">
                {[
                  { key: 'dht22', label: 'DHT22 (Suhu & Lembap)' },
                  { key: 'anemometer', label: 'Anemometer (Kec. Angin)' },
                  { key: 'bh1750', label: 'BH1750 (Cahaya)' },
                  { key: 'rtc_ds3231', label: 'RTC DS3231 (Jam Presisi)' },
                  { key: 'ina226', label: 'INA226 (Baterai LiFePO4)', required: true },
                  { key: 'sd_card', label: 'MicroSD (Datalogging)' }
                ].map((m) => (
                  <label
                    key={m.key}
                    className="flex items-center justify-between p-2 rounded-xl neo-flat cursor-pointer text-xs select-none"
                  >
                    <span className="text-gray-800 font-medium">{m.label}</span>
                    {m.required ? (
                      <span className="text-[10px] text-emerald-700 font-semibold">Wajib</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={config.modules[m.key as keyof DeviceConfiguration['modules']]}
                        onChange={() => handleModuleToggle(m.key as keyof DeviceConfiguration['modules'])}
                        className="w-3.5 h-3.5 rounded text-sky-600 cursor-pointer"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ================= STEP 4: Backend & Cloud ================= */}
          {step === 4 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-gray-900">Penyimpanan Cloud</h2>
                <p className="text-[11px] text-gray-500">Protokol pengiriman telemetri.</p>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'firebase', label: 'Firebase Firestore', note: 'Default' },
                  { id: 'supabase', label: 'Supabase PostgreSQL', note: 'REST' },
                  { id: 'mqtt', label: 'MQTT Broker', note: 'IoT' },
                  { id: 'http_rest', label: 'HTTP REST Direct', note: 'Webhook' }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setConfig(prev => ({ ...prev, backend: { ...prev.backend, protocol: item.id as BackendProtocolType } }))}
                    className={`p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-between transition ${
                      config.backend.protocol === item.id
                        ? 'neo-pressed font-semibold text-sky-900'
                        : 'neo-flat text-gray-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-gray-500">{item.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= STEP 5: Self-Test & Verifikasi ================= */}
          {step === 5 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-gray-900">Uji Perangkat</h2>
                <p className="text-[11px] text-gray-500">Komunikasi ke ESP32 ({targetIp}).</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRunSelfTest}
                  disabled={testing}
                  className="py-2.5 px-3 rounded-xl border border-gray-300/80 bg-white/40 hover:bg-white/80 active:scale-95 text-xs font-semibold text-gray-900 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition shadow-sm"
                >
                  {testing && <Loader2 size={13} className="animate-spin" />}
                  <span>{testing ? 'Menguji...' : 'Uji ESP32'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushConfigToDevice}
                  disabled={pushingConfig}
                  className="py-2.5 px-3 rounded-xl border border-gray-300/80 bg-white/40 hover:bg-white/80 active:scale-95 text-xs font-semibold text-gray-900 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition shadow-sm"
                >
                  {pushingConfig && <Loader2 size={13} className="animate-spin" />}
                  <span>{pushingConfig ? 'Menyimpan...' : 'Kirim Flash'}</span>
                </button>
              </div>

              {pushStatus && (
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-medium text-center">
                  {pushStatus}
                </div>
              )}

              {testError && (
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700 text-[11px] font-medium text-center">
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="p-2.5 rounded-xl neo-pressed text-[11px] grid grid-cols-4 gap-1 text-center font-mono">
                  <div>
                    <span className="text-[9px] text-gray-500 block">Suhu</span>
                    <span className="font-bold">{testResult.temperature}°</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block">Lembap</span>
                    <span className="font-bold">{testResult.humidity}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block">Angin</span>
                    <span className="font-bold">{testResult.wind_speed}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block">Baterai</span>
                    <span className="font-bold text-emerald-700">{testResult.battery_voltage}V</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-500 text-center pt-1">
                Stasiun siap digunakan.
              </p>
            </div>
          )}

          {/* Minimalist Bottom Navigation inside Card */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-300/40">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer py-1.5"
              >
                Kembali
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="py-2 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-medium text-xs transition shadow-sm cursor-pointer active:scale-[0.99]"
              >
                Lanjut
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition shadow-sm cursor-pointer active:scale-[0.99]"
              >
                Selesai
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
