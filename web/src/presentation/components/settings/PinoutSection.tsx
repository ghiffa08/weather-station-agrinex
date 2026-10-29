import React from 'react';
import { Cpu, Settings, Info, CheckCircle2 } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import { PinSelectField } from '../atomic/molecules/PinSelectField';
import type { DeviceConfiguration, BoardType } from '../../../core/types/device-config.types';

interface PinoutSectionProps {
  config: DeviceConfiguration;
  onPinChange: (pinKey: keyof DeviceConfiguration['pins'], val: number) => void;
  onBoardChange?: (board: BoardType) => void;
}

// ──────────── ESP32 Pin Options (Sesuai Skematik EasyEDA ESP-WROOM-32) ────────────
const ESP32_SDA_OPTIONS = [
  { value: 21, label: 'GPIO21 (Pin 20 - Hardware SDA Bus EasyEDA - Default)' },
  { value: 16, label: 'GPIO16 (RX2)' },
  { value: 17, label: 'GPIO17 (TX2)' },
  { value: 32, label: 'GPIO32' },
];

const ESP32_SCL_OPTIONS = [
  { value: 22, label: 'GPIO22 (Pin 17 - Hardware SCL Bus EasyEDA - Default)' },
  { value: 18, label: 'GPIO18' },
  { value: 19, label: 'GPIO19' },
  { value: 33, label: 'GPIO33' },
];

const ESP32_DHT_OPTIONS = [
  { value: 4, label: 'GPIO4 (D4 EasyEDA Pin 26 - Default)' },
  { value: 32, label: 'GPIO32' },
  { value: 33, label: 'GPIO33' },
  { value: 13, label: 'GPIO13' },
  { value: 14, label: 'GPIO14' },
];

const ESP32_ANEMO_OPTIONS = [
  { value: 27, label: 'GPIO27 (CN1 EasyEDA Pin 6 - Interrupt - Default)' },
  { value: 14, label: 'GPIO14 (Hardware Interrupt)' },
  { value: 25, label: 'GPIO25 (Hardware Interrupt)' },
  { value: 26, label: 'GPIO26 (Hardware Interrupt)' },
  { value: 34, label: 'GPIO34 (Input-only Interrupt)' },
];

const ESP32_SD_CS_OPTIONS = [
  { value: 5, label: 'GPIO5 (SD1 EasyEDA Pin 23 - VSPI CS - Default)' },
  { value: 15, label: 'GPIO15' },
  { value: 2, label: 'GPIO2' },
];

// ──────────── ESP8266 Pin Options (NodeMCU v2 Fallback) ────────────
const ESP8266_SDA_OPTIONS = [
  { value: 4, label: 'D2 (GPIO4 - Standar SDA NodeMCU - Default)' },
  { value: 12, label: 'D6 (GPIO12)' },
  { value: 14, label: 'D5 (GPIO14)' },
  { value: 2, label: 'D4 (GPIO2)' },
];

const ESP8266_SCL_OPTIONS = [
  { value: 5, label: 'D1 (GPIO5 - Standar SCL NodeMCU - Default)' },
  { value: 13, label: 'D7 (GPIO13)' },
  { value: 0, label: 'D3 (GPIO0)' },
];

const ESP8266_DHT_OPTIONS = [
  { value: 2, label: 'D4 (GPIO2 - Default NodeMCU)' },
  { value: 0, label: 'D3 (GPIO0)' },
  { value: 14, label: 'D5 (GPIO14)' },
  { value: 12, label: 'D6 (GPIO12)' },
  { value: 13, label: 'D7 (GPIO13)' },
];

const ESP8266_ANEMO_OPTIONS = [
  { value: 0, label: 'D3 (GPIO0 - Hardware Interrupt)' },
  { value: 14, label: 'D5 (GPIO14)' },
  { value: 12, label: 'D6 (GPIO12)' },
  { value: 13, label: 'D7 (GPIO13)' },
  { value: 2, label: 'D4 (GPIO2)' },
];

const ESP8266_SD_CS_OPTIONS = [
  { value: 15, label: 'D8 (GPIO15 - Standar HSPI CS)' },
  { value: 16, label: 'D0 (GPIO16)' },
  { value: 2, label: 'D4 (GPIO2)' },
];

const BH1750_ADDR_OPTIONS = [
  { value: 0x23, label: '0x23 (ADDR pin ke GND - Default)' },
  { value: 0x5C, label: '0x5C (ADDR pin ke VCC 3.3V)' },
];

export const PinoutSection: React.FC<PinoutSectionProps> = ({
  config,
  onPinChange,
  onBoardChange,
}) => {
  const currentBoard = config.board_type ?? 'esp32';
  const isEsp32 = currentBoard === 'esp32';
  const isI2cActive = config.modules.bh1750 || config.modules.rtc_ds3231;

  const sdaOptions = isEsp32 ? ESP32_SDA_OPTIONS : ESP8266_SDA_OPTIONS;
  const sclOptions = isEsp32 ? ESP32_SCL_OPTIONS : ESP8266_SCL_OPTIONS;
  const dhtOptions = isEsp32 ? ESP32_DHT_OPTIONS : ESP8266_DHT_OPTIONS;
  const anemoOptions = isEsp32 ? ESP32_ANEMO_OPTIONS : ESP8266_ANEMO_OPTIONS;
  const sdCsOptions = isEsp32 ? ESP32_SD_CS_OPTIONS : ESP8266_SD_CS_OPTIONS;

  return (
    <Card className="space-y-5">
      <div className="border-b border-gray-300/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Settings size={16} className="text-sky-600" />
            <span>B. Pemetaan Pin GPIO & Bus I2C Perangkat</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Konfigurasi pin fisik sambungan sensor. Pilih arsitektur mikrokontroler yang digunakan di lapangan.
          </p>
        </div>

        {/* Board Selection Toggle */}
        <div className="flex items-center gap-2 bg-gray-200/70 p-1 rounded-xl shrink-0 neo-pressed">
          <button
            type="button"
            onClick={() => onBoardChange?.('esp32')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isEsp32
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cpu size={14} />
            <span>ESP32 (WROOM-32)</span>
            {isEsp32 && <CheckCircle2 size={13} className="text-white ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => onBoardChange?.('esp8266')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isEsp32
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cpu size={14} />
            <span>ESP8266 (NodeMCU)</span>
            {!isEsp32 && <CheckCircle2 size={13} className="text-white ml-0.5" />}
          </button>
        </div>
      </div>

      {/* 1. I2C Bus & Sensor BH1750 */}
      <div className="p-4 rounded-2xl neo-pressed space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            1. Konfigurasi Bus I2C & Sensor Cahaya BH1750
          </h3>
        </div>
        <p className="text-[11px] text-gray-500">
          {isEsp32 ? (
            <>
              Pada skematik EasyEDA ESP32, jalur hardware I2C default adalah{' '}
              <strong className="text-gray-700">GPIO21 (SDA)</strong> dan{' '}
              <strong className="text-gray-700">GPIO22 (SCL)</strong> dengan pull-up 4.7k (R3 & R4).
            </>
          ) : (
            <>
              Pada NodeMCU ESP8266, pin default I2C adalah{' '}
              <strong className="text-gray-700">D2 (GPIO4) untuk SDA</strong> dan{' '}
              <strong className="text-gray-700">D1 (GPIO5) untuk SCL</strong>.
            </>
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <PinSelectField
            label="I2C SDA Pin (Data)"
            value={config.pins.i2c_sda}
            options={sdaOptions}
            isEnabled={isI2cActive}
            onChange={(val) => onPinChange('i2c_sda', val)}
            helperText={isEsp32 ? 'GPIO21: Jalur SDA sensor BH1750, DS3231, INA226' : 'D2: Jalur SDA sensor BH1750, DS3231, INA226'}
          />

          <PinSelectField
            label="I2C SCL Pin (Clock)"
            value={config.pins.i2c_scl}
            options={sclOptions}
            isEnabled={isI2cActive}
            onChange={(val) => onPinChange('i2c_scl', val)}
            helperText={isEsp32 ? 'GPIO22: Jalur SCL sensor BH1750, DS3231, INA226' : 'D1: Jalur SCL sensor BH1750, DS3231, INA226'}
          />

          <PinSelectField
            label="Alamat I2C BH1750 (ADDR Pin)"
            value={config.pins.bh1750_addr ?? 0x23}
            options={BH1750_ADDR_OPTIONS}
            isEnabled={config.modules.bh1750}
            onChange={(val) => onPinChange('bh1750_addr' as any, val)}
            helperText="Sesuai sambungan pin ADDR modul BH1750"
          />
        </div>
      </div>

      {/* 2. Digital Sensor & SPI Pinout */}
      <div className="p-4 rounded-2xl neo-pressed space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            2. Pin Digital DHT22, Anemometer, & MicroSD
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <PinSelectField
            label="DHT22 Data Pin"
            value={config.pins.dht_pin}
            options={dhtOptions}
            isEnabled={config.modules.dht22}
            onChange={(val) => onPinChange('dht_pin', val)}
            helperText={isEsp32 ? 'EasyEDA Pin 26 (D4 / GPIO4)' : 'NodeMCU Pin D4 (GPIO2)'}
          />

          <PinSelectField
            label="Anemometer Pulse Pin"
            value={config.pins.anemo_pin}
            options={anemoOptions}
            isEnabled={config.modules.anemometer}
            onChange={(val) => onPinChange('anemo_pin', val)}
            helperText={isEsp32 ? 'EasyEDA Pin 6 (CN1 / GPIO27 Pull-up 4.7k)' : 'NodeMCU Pin D3 (GPIO0)'}
          />

          <PinSelectField
            label="MicroSD CS Pin (Chip Select)"
            value={config.pins.sd_cs_pin}
            options={sdCsOptions}
            isEnabled={config.modules.sd_card}
            onChange={(val) => onPinChange('sd_cs_pin', val)}
            helperText={isEsp32 ? 'VSPI: CS=GPIO5, SCK=18, MISO=19, MOSI=23' : 'HSPI: CS=D8, SCK=D5, MISO=D6, MOSI=D7'}
          />
        </div>
      </div>

      {/* Hardware Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs">
        <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
        <span>
          <strong>Catatan Hardware I2C:</strong> Sensor BH1750 (0x23), RTC DS3231 (0x68), dan INA226 Battery Monitor (0x40) secara bersamaan terhubung ke bus I2C paralel yang sama pada pin {isEsp32 ? 'GPIO21 (SDA) dan GPIO22 (SCL)' : 'D2 (SDA) dan D1 (SCL)'}. Masing-masing modul memiliki alamat I2C unik dan tidak saling bertabrakan.
        </span>
      </div>
    </Card>
  );
};
