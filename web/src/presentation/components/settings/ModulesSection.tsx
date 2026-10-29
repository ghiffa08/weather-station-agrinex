import React from 'react';
import { Cpu } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import type { DeviceConfiguration } from '../../../core/types/device-config.types';

interface ModulesSectionProps {
  config: DeviceConfiguration;
  onToggleModule: (key: keyof DeviceConfiguration['modules']) => void;
}

export const ModulesSection: React.FC<ModulesSectionProps> = ({
  config,
  onToggleModule,
}) => {
  return (
    <Card className="space-y-4">
      <div className="border-b border-gray-300/40 pb-3">
        <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Cpu size={16} className="text-sky-600" />
          <span>A. Status Modul Hardware Aktif</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Uncheck modul yang tidak dipasang secara fisik pada PCB/breadboard untuk mencegah terjadinya SPI timeout atau hang pada loop ESP8266.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* MicroSD Card */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl neo-flat hover:neo-pressed cursor-pointer transition">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-gray-800 text-xs block">MicroSD Card Module</span>
            <span className="text-[10px] text-gray-500 block">Logging offline SPI (Uncheck jika kosong)</span>
          </div>
          <input
            type="checkbox"
            checked={config.modules.sd_card}
            onChange={() => onToggleModule('sd_card')}
            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
          />
        </label>

        {/* RTC DS3231 */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl neo-flat hover:neo-pressed cursor-pointer transition">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-gray-800 text-xs block">RTC DS3231 (I2C 0x68)</span>
            <span className="text-[10px] text-gray-500 block">Pencatat waktu offline (Uncheck = NTP)</span>
          </div>
          <input
            type="checkbox"
            checked={config.modules.rtc_ds3231}
            onChange={() => onToggleModule('rtc_ds3231')}
            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
          />
        </label>

        {/* DHT22 */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl neo-flat hover:neo-pressed cursor-pointer transition">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-gray-800 text-xs block">DHT22 Sensor</span>
            <span className="text-[10px] text-gray-500 block">Suhu Udara & Kelembaban Relatif (RH)</span>
          </div>
          <input
            type="checkbox"
            checked={config.modules.dht22}
            onChange={() => onToggleModule('dht22')}
            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
          />
        </label>

        {/* BH1750 */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl neo-flat hover:neo-pressed cursor-pointer transition">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-gray-800 text-xs block">BH1750 Light Meter</span>
            <span className="text-[10px] text-gray-500 block">Intensitas Radiasi Cahaya (Lux I2C)</span>
          </div>
          <input
            type="checkbox"
            checked={config.modules.bh1750}
            onChange={() => onToggleModule('bh1750')}
            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
          />
        </label>

        {/* Anemometer */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl neo-flat hover:neo-pressed cursor-pointer transition">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-gray-800 text-xs block">Zhafira Anemometer v1.3</span>
            <span className="text-[10px] text-gray-500 block">Sensor Kecepatan Angin (Pulsa Opto/Hall)</span>
          </div>
          <input
            type="checkbox"
            checked={config.modules.anemometer}
            onChange={() => onToggleModule('anemometer')}
            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
          />
        </label>

        {/* INA226 Battery Monitor (Read-only status info) */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl neo-pressed opacity-90">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-gray-800 text-xs block">INA226 LiFePO4 Monitor</span>
            <span className="text-[10px] text-gray-500 block">I2C 0x40 (Otomatis dideteksi oleh bus I2C)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-800">
            I2C Auto
          </span>
        </div>
      </div>
    </Card>
  );
};
