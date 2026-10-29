import React from 'react';
import { Send, Wifi, Download, Upload } from 'lucide-react';
import { Card } from '../neumorphic/Card';

interface SyncSectionProps {
  deviceIp: string;
  onDeviceIpChange: (newIp: string) => void;
  isPushing: boolean;
  onPushToDevice: () => void;
  onDownloadConfig: () => void;
  onUploadConfigFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SyncSection: React.FC<SyncSectionProps> = ({
  deviceIp,
  onDeviceIpChange,
  isPushing,
  onPushToDevice,
  onDownloadConfig,
  onUploadConfigFile,
}) => {
  return (
    <Card className="space-y-5 animate-fade-in">
      <div className="border-b border-gray-300/40 pb-3">
        <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Send size={16} className="text-sky-600" />
          <span>Sinkronisasi Nirkabel (OTA) & Manajemen File Konfigurasi</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Kirim konfigurasi langsung ke ESP8266 melalui WiFi lokal atau backup file config.json untuk di-flash ke LittleFS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Direct OTA Push */}
        <div className="p-4 rounded-2xl neo-pressed space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wifi size={16} className="text-sky-600" />
              <h3 className="text-xs font-bold text-gray-800">1. Push Konfigurasi via WiFi (OTA)</h3>
            </div>
            <p className="text-[11px] text-gray-500">
              ESP8266 menjalankan REST Server di port 80. Masukkan alamat IP alat untuk sinkronisasi seketika tanpa mencolokkan kabel USB.
            </p>

            <div className="space-y-1 pt-1 text-xs">
              <label className="font-bold text-gray-700 block">IP Address ESP8266 di Jaringan Lokal</label>
              <input
                type="text"
                value={deviceIp}
                onChange={(e) => onDeviceIpChange(e.target.value)}
                placeholder="192.168.1.105"
                className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={onPushToDevice}
            disabled={isPushing}
            className="w-full py-2.5 px-4 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-sky-700 flex items-center justify-center gap-2 cursor-pointer transition shadow-sm mt-3"
          >
            {isPushing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Mengirim ke Alat...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Sinkronkan ke ESP8266 & Restart</span>
              </>
            )}
          </button>
        </div>

        {/* Offline File Export / Import */}
        <div className="p-4 rounded-2xl neo-pressed space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold text-gray-800">2. Backup File config.json (LittleFS)</h3>
            </div>
            <p className="text-[11px] text-gray-500">
              Download file JSON untuk disimpan di kartu memori atau di-upload langsung ke folder data LittleFS PlatformIO.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={onDownloadConfig}
              className="flex-1 py-2.5 px-3 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
            >
              <Download size={14} />
              <span>Download config.json</span>
            </button>

            <label className="flex-1 py-2.5 px-3 rounded-xl neo-flat hover:neo-pressed active:scale-95 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm text-center">
              <Upload size={14} />
              <span>Upload config.json</span>
              <input
                type="file"
                accept=".json"
                onChange={onUploadConfigFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </Card>
  );
};
