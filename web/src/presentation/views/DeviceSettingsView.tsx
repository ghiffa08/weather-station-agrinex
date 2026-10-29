import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Cpu, 
  Send, 
  Database, 
  FileSpreadsheet,
  RotateCcw,
  Check,
  CheckCircle, 
  AlertCircle
} from 'lucide-react';
import { 
  DEFAULT_DEVICE_CONFIG,
  ESP32_DEFAULT_PINS,
  ESP8266_DEFAULT_PINS
} from '../../core/types/device-config.types';
import type { 
  DeviceConfiguration, 
  BackendProtocolType,
  BoardType
} from '../../core/types/device-config.types';
import type { WeatherTelemetry } from '../../core/types/weather.types';
import { ModulesSection } from '../components/settings/ModulesSection';
import { PinoutSection } from '../components/settings/PinoutSection';
import { BackendSection } from '../components/settings/BackendSection';
import { SyncSection } from '../components/settings/SyncSection';
import { ExportCenterSection } from '../components/settings/ExportCenterSection';

interface DeviceSettingsViewProps {
  onBack: () => void;
  telemetryLogs?: WeatherTelemetry[];
  onConfigSaved?: (config: DeviceConfiguration) => void;
}

const LOCAL_STORAGE_KEY = 'agrinex_device_config';

export const DeviceSettingsView: React.FC<DeviceSettingsViewProps> = ({
  onBack,
  telemetryLogs = [],
  onConfigSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'backend' | 'sync' | 'export'>(() => {
    try {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'modules' || tabParam === 'backend' || tabParam === 'sync' || tabParam === 'export') {
        return tabParam;
      }
    } catch {
      // ignore
    }
    return 'modules';
  });
  const [config, setConfig] = useState<DeviceConfiguration>(DEFAULT_DEVICE_CONFIG);
  const [deviceIp, setDeviceIp] = useState<string>('192.168.4.1');
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ 
          ...prev, 
          ...parsed,
          pins: {
            ...prev.pins,
            ...(parsed.pins || {}),
            bh1750_addr: parsed.pins?.bh1750_addr ?? 0x23
          }
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleModuleToggle = (key: keyof DeviceConfiguration['modules']) => {
    setConfig(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: !prev.modules[key],
      },
    }));
  };

  const handleBoardChange = (board: BoardType) => {
    const newPins = board === 'esp32' ? ESP32_DEFAULT_PINS : ESP8266_DEFAULT_PINS;
    setConfig(prev => ({
      ...prev,
      board_type: board,
      pins: {
        ...newPins,
        bh1750_addr: prev.pins.bh1750_addr ?? 0x23,
      },
    }));
  };

  const handlePinChange = (pinKey: keyof DeviceConfiguration['pins'], value: number) => {
    setConfig(prev => ({
      ...prev,
      pins: {
        ...prev.pins,
        [pinKey]: value,
      },
    }));
  };

  const handleProtocolChange = (protocol: BackendProtocolType) => {
    setConfig(prev => ({
      ...prev,
      backend: {
        ...prev.backend,
        protocol,
      },
    }));
  };

  const handleSaveLocal = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
      onConfigSaved?.(config);
      setPushStatus({ success: true, message: '✓ Konfigurasi tersimpan di dashboard browser!' });
      setTimeout(() => setPushStatus(null), 3500);
    } catch {
      setPushStatus({ success: false, message: 'Gagal menyimpan ke penyimpanan lokal browser.' });
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('Kembalikan semua pengaturan ke konfigurasi default pabrik?')) {
      setConfig(DEFAULT_DEVICE_CONFIG);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_DEVICE_CONFIG));
      setPushStatus({ success: true, message: '✓ Konfigurasi telah di-reset ke nilai default.' });
      setTimeout(() => setPushStatus(null), 3000);
    }
  };

  const handleDownloadConfig = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadConfigFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.modules && parsed.pins && parsed.backend) {
          setConfig(parsed);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          setPushStatus({ success: true, message: '✓ File config.json berhasil dimuat!' });
        } else {
          setPushStatus({ success: false, message: 'Format file config.json tidak valid.' });
        }
      } catch {
        setPushStatus({ success: false, message: 'Gagal membaca format JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  const handlePushToDevice = async () => {
    if (!deviceIp.trim()) {
      setPushStatus({ success: false, message: 'Masukkan IP Address ESP8266 terlebih dahulu.' });
      return;
    }
    setIsPushing(true);
    setPushStatus(null);
    try {
      const cleanIp = deviceIp.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const endpoint = `http://${cleanIp}/api/config`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setPushStatus({ 
          success: true, 
          message: '✓ Konfigurasi terkirim ke ESP8266! Perangkat sedang merestart dengan konfigurasi baru...' 
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
        onConfigSaved?.(config);
      } else {
        const txt = await res.text();
        setPushStatus({ success: false, message: `Alat menolak konfigurasi (${res.status}): ${txt}` });
      }
    } catch {
      setPushStatus({ 
        success: false, 
        message: `Koneksi gagal ke http://${deviceIp}. Pastikan laptop & ESP8266 terhubung di jaringan WiFi yang sama.` 
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 lg:p-8 pb-32 sm:pb-36 max-w-6xl mx-auto space-y-5 animate-fade-in">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl neo-pressed hover:bg-gray-200/70 text-gray-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[var(--color-neo-text-muted)]">
                Agrinex Station
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-sky-600">
                Pengaturan Perangkat
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2 mt-0.5">
              <span>Pengaturan Alat & Backend</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleResetDefault}
            className="px-3 py-2 rounded-xl neo-pressed hover:bg-gray-200/60 active:scale-95 text-xs font-bold text-gray-600 flex items-center gap-1.5 cursor-pointer transition"
            title="Reset ke Default Pabrik"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Default</span>
          </button>
          <button
            onClick={handleSaveLocal}
            className="px-4 py-2 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-sky-700 flex items-center gap-1.5 cursor-pointer transition shadow-sm"
          >
            <Check size={15} />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {/* Alert Status Banner */}
      {pushStatus && (
        <div 
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in ${
            pushStatus.success 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800' 
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-800'
          }`}
        >
          {pushStatus.success ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span>{pushStatus.message}</span>
        </div>
      )}

      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-800 flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle size={16} className="shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main Navigation Segmented Control */}
      <div className="flex rounded-2xl p-1.5 neo-pressed gap-1 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'modules' ? 'neo-flat text-sky-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Cpu size={14} />
          <span>1. Modul</span>
        </button>
        <button
          onClick={() => setActiveTab('backend')}
          className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'backend' ? 'neo-flat text-sky-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database size={14} />
          <span>2. Backend</span>
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sync' ? 'neo-flat text-sky-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Send size={14} />
          <span>3. Sinkron</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'export' ? 'neo-flat text-sky-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>4. Ekspor</span>
        </button>
      </div>

      {/* TAB 1: MODUL & PIN SENSOR */}
      {activeTab === 'modules' && (
        <div className="space-y-6 animate-fade-in">
          <ModulesSection 
            config={config} 
            onToggleModule={handleModuleToggle} 
          />
          <PinoutSection 
            config={config} 
            onPinChange={handlePinChange} 
            onBoardChange={handleBoardChange}
          />
        </div>
      )}

      {/* TAB 2: PROTOKOL BACKEND */}
      {activeTab === 'backend' && (
        <BackendSection 
          config={config} 
          onProtocolChange={handleProtocolChange} 
          onConfigChange={setConfig} 
        />
      )}

      {/* TAB 3: SINKRONISASI OTA & FILE MANAGEMENT */}
      {activeTab === 'sync' && (
        <SyncSection 
          deviceIp={deviceIp}
          onDeviceIpChange={setDeviceIp}
          isPushing={isPushing}
          onPushToDevice={handlePushToDevice}
          onDownloadConfig={handleDownloadConfig}
          onUploadConfigFile={handleUploadConfigFile}
        />
      )}

      {/* TAB 4: EKSPOR DATA SENSOR */}
      {activeTab === 'export' && (
        <ExportCenterSection 
          telemetryLogs={telemetryLogs}
          onNotice={(msg) => {
            setExportNotice(msg);
            setTimeout(() => setExportNotice(null), 4000);
          }}
        />
      )}
    </div>
  );
};
