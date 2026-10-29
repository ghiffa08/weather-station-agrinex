export interface BatteryData {
  voltage: number;
  current_ma: number;
  power_mw: number;
  shunt_mv?: number;
  percentage: number;
  charging?: boolean;
  ok: boolean;
}

export interface SensorStatus {
  ina226?: boolean;
  dht22: boolean;
  bh1750: boolean;
  anemometer: boolean;
  rtc_ds3231?: boolean;
  sd_card?: boolean;
}

export interface TelemetryData {
  timestamp_ms: number;
  temperature?: number;
  humidity?: number;
  light_lux?: number;
  wind_speed?: number;
  raw_pulses: number;
  wifi_rssi: number;
  free_heap: number;
  uptime_sec: number;
  rtc_time?: string;
  status: SensorStatus;

  // Realtime Battery Monitoring (INA226)
  battery?: BatteryData;
  battery_voltage?: number;
  battery_current?: number;
  battery_power?: number;
  battery_percentage?: number;
}

export interface DiagnosticModuleInfo {
  name: string;
  pin?: string;
  bus?: string;
  address?: string;
  connected: boolean;
  message: string;
  temperature?: number;
  humidity?: number;
  light_lux?: number;
  datetime?: string;
  write_ok?: boolean;
  pulses?: number;
  wind_speed?: number;

  // INA226 details
  voltage?: number;
  current_ma?: number;
  power_mw?: number;
  percentage?: number;
  charging?: boolean;
}

export interface DiagnosticData {
  timestamp_ms: number;
  all_ok: boolean;
  modules: {
    ina226?: DiagnosticModuleInfo;
    dht22: DiagnosticModuleInfo;
    bh1750: DiagnosticModuleInfo;
    rtc_ds3231: DiagnosticModuleInfo;
    sd_card: DiagnosticModuleInfo;
    anemometer: DiagnosticModuleInfo;
  };
  system: {
    ip: string;
    ssid: string;
    rssi: number;
    free_heap: number;
    uptime_sec: number;
  };
}

export type ConnectionMode = 'SSE' | 'POLLING';

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface ChartHistoryPoint {
  timeStr: string;
  temperature?: number;
  humidity?: number;
  lightLux?: number;
  windSpeed?: number;
}
