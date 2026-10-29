export interface BatteryData {
  voltage: number;
  current_ma: number;
  power_mw: number;
  shunt_mv?: number;
  percentage: number;
  charging?: boolean;
  ok?: boolean;
}

export interface SensorHardwareStatus {
  ina226?: boolean;
  dht22: boolean;
  bh1750: boolean;
  anemometer: boolean;
  rtc_ds3231?: boolean;
  sd_card?: boolean;
}

export interface WeatherTelemetry {
  timestamp: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  light_lux?: number;
  raw_pulses?: number;
  wifi_rssi?: number;
  free_heap?: number;
  uptime_sec?: number;
  rtc_time?: string;
  status?: SensorHardwareStatus;

  // Realtime Battery Monitoring (INA226 / LiFePO4)
  battery?: BatteryData;
  battery_voltage?: number;
  battery_current?: number;
  battery_power?: number;
  battery_percentage?: number;
}
