export interface ModuleToggles {
  dht22: boolean;
  bh1750: boolean;
  anemometer: boolean;
  rtc_ds3231: boolean;
  sd_card: boolean;
}

export interface PinConfig {
  dht_pin: number;
  anemo_pin: number;
  i2c_sda: number;
  i2c_scl: number;
  sd_cs_pin: number;
  bh1750_addr?: number; // 0x23 (default, ADDR GND) or 0x5C (ADDR VCC)
}

export type BackendProtocolType = 'firebase' | 'supabase' | 'mqtt' | 'http_rest';

export interface FirebaseBackendConfig {
  project_id: string;
  collection: string;
}

export interface SupabaseBackendConfig {
  url: string;
  api_key: string;
  table: string;
}

export interface MqttBackendConfig {
  broker: string;
  port: number;
  topic: string;
  username?: string;
  password?: string;
  client_id: string;
}

export interface HttpRestBackendConfig {
  url: string;
  auth_header?: string;
}

export type BoardType = 'esp32' | 'esp8266';

export const ESP32_DEFAULT_PINS: PinConfig = {
  dht_pin: 4,      // GPIO4 (D4 EasyEDA Pin 26)
  anemo_pin: 27,   // GPIO27 (CN1 EasyEDA Pin 6)
  i2c_sda: 21,     // GPIO21 (SDA Pin 20)
  i2c_scl: 22,     // GPIO22 (SCL Pin 17)
  sd_cs_pin: 5,    // GPIO5 (CS Pin 23)
  bh1750_addr: 0x23,
};

export const ESP8266_DEFAULT_PINS: PinConfig = {
  dht_pin: 2,      // D4 (GPIO2)
  anemo_pin: 0,    // D3 (GPIO0)
  i2c_sda: 4,      // D2 (GPIO4)
  i2c_scl: 5,      // D1 (GPIO5)
  sd_cs_pin: 15,   // D8 (GPIO15)
  bh1750_addr: 0x23,
};

export interface DeviceConfiguration {
  board_type?: BoardType;
  modules: ModuleToggles;
  pins: PinConfig;
  backend: {
    protocol: BackendProtocolType;
    firebase: FirebaseBackendConfig;
    supabase: SupabaseBackendConfig;
    mqtt: MqttBackendConfig;
    http_rest: HttpRestBackendConfig;
  };
  timing?: {
    sensor_read_ms: number;
    publish_interval_ms: number;
    enable_deep_sleep: boolean;
  };
}

export const DEFAULT_DEVICE_CONFIG: DeviceConfiguration = {
  board_type: 'esp32',
  modules: {
    dht22: true,
    bh1750: true,
    anemometer: true,
    rtc_ds3231: true,
    sd_card: false, // Default unchecked as user requested
  },
  pins: {
    dht_pin: 4,     // GPIO4 (ESP32 EasyEDA D4)
    anemo_pin: 27,  // GPIO27 (ESP32 EasyEDA CN1 Interrupt)
    i2c_sda: 21,    // GPIO21 (ESP32 Hardware SDA)
    i2c_scl: 22,    // GPIO22 (ESP32 Hardware SCL)
    sd_cs_pin: 5,   // GPIO5 (ESP32 VSPI CS)
    bh1750_addr: 0x23, // 0x23 (Default ADDR pin to GND)
  },
  backend: {
    protocol: 'firebase',
    firebase: {
      project_id: 'agrinex-f5ef8',
      collection: 'telemetry',
    },
    supabase: {
      url: 'https://your-project.supabase.co',
      api_key: '',
      table: 'telemetry',
    },
    mqtt: {
      broker: 'broker.emqx.io',
      port: 1883,
      topic: 'agrinex/weather/telemetry',
      username: '',
      password: '',
      client_id: 'agrinex-station-01',
    },
    http_rest: {
      url: 'https://weatherstation.agrinex.io/api/telemetry',
      auth_header: '',
    },
  },
  timing: {
    sensor_read_ms: 10000,
    publish_interval_ms: 900000,
    enable_deep_sleep: false,
  },
};
