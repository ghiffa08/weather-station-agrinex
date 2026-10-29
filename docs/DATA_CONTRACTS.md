# 📋 Data Contracts & Schema: Agrinex Weather Station vs BMKG

Dokumen ini mendefinisikan format kontrak data, model tipe data TypeScript, skema API BMKG, dan skema Firestore / SQLite yang digunakan dalam proyek ini.

---

## 1. Sumber Data 1: Telemetri IoT Weather Station (Firestore & Local SSE)

### A. Payload Real-time / 15-Menit
Dikirimkan dari mikrokontroler ESP8266 / ESP32 ke Firebase Firestore (koleksi: `weather_telemetry`) atau melalui HTTP SSE pada mode tester:

```typescript
export interface WeatherTelemetry {
  timestamp: string;      // Format ISO 8601 (WIB): "2026-10-29T13:45:00+07:00"
  temperature: number;    // Suhu udara DHT22 (°C)
  humidity: number;       // Kelembapan relatif DHT22 (%)
  wind_speed: number;     // Kecepatan angin Anemometer v1.3 (m/s atau km/h)
  light_lux: number;      // Intensitas cahaya BH1750 (Lux)
  raw_pulses?: number;    // Jumlah pulsa optocoupler anemometer
  status?: {
    dht22: boolean;
    bh1750: boolean;
    anemometer: boolean;
    rtc_ds3231?: boolean;
    sd_card?: boolean;
    ina226?: boolean;     // Monitor baterai (pada modul tester ESP32)
  };
  battery?: {
    voltage: number;      // Tegangan baterai Li-ion / Solar (V)
    current_ma: number;   // Arus (mA)
    power_mw: number;     // Daya (mW)
  };
  wifi_rssi?: number;
  uptime_sec?: number;
}
```

---

## 2. Sumber Data 2: API BMKG (Prakiraan Cuaca Indonesia)

### A. Endpoint & Parameter
- **Base URL**: `https://api.bmkg.go.id/publik/prakiraan-cuaca`
- **Query Param**: `?adm4={KODE_WILAYAH_KECAMATAN_DESA}`
  - Lokasi Agrinex default: `LOCATION_CONFIG.bmkgAdm4` (Kabupaten Majalengka / Kertajati)
- **TTL Cache**: 30 Menit (BMKG memperbarui data model 2x sehari).

### B. Struktur Data Ekstraksi BMKG
```typescript
export interface BmkgForecastPoint {
  datetime_utc: string;       // "2026-10-29 06:00:00"
  datetime_local: string;     // "2026-10-29 13:00:00"
  t_celsius: number;          // Suhu udara (°C)
  rh_percent: number;         // Kelembapan relatif (%)
  weather_code: number;       // Kode cuaca BMKG (misal 1: Cerah Berawan, 60: Hujan Ringan)
  weather_desc: string;       // Deskripsi: "Cerah Berawan", "Hujan Sedang"
  wind_speed_ms: number;      // Kecepatan angin (m/s)
  wind_dir_deg: number;       // Arah angin (derajat 0-360)
}

export interface BmkgDailySummary {
  date: string;               // "2026-10-29"
  tmax_c: number;             // Suhu maksimum
  tmin_c: number;             // Suhu minimum
  tmean_c: number;            // Suhu rata-rata harian
  rh_percent: number;         // Kelembapan rata-rata harian
  sunshine_hours?: number;    // Lama penyinaran (jam)
  wind_speed_ms?: number;     // Rata-rata angin harian
}
```

---

## 3. Data Contract: Komparasi Berpasangan (Matched Comparative Model)

Data gabungan hasil *resampling* dan penyelarasan temporal yang siap ditampilkan di grafik dan metrik statistik:

```typescript
export interface MatchedWeatherComparison {
  timestamp: string;          // ISO Date / Hour: "2026-10-29 12:00"
  
  // Suhu Udara
  temp_iot: number;
  temp_bmkg: number;
  delta_temp: number;         // temp_iot - temp_bmkg
  
  // Kelembapan Relatif
  rh_iot: number;
  rh_bmkg: number;
  delta_rh: number;           // rh_iot - rh_bmkg
  
  // Radiasi Surya (Hasil Konversi)
  solar_irradiance_iot_wm2: number; // Dari Lux / 120
  solar_irradiance_bmkg_wm2?: number;
  
  // Kecepatan Angin (Normalisasi 2m)
  wind_speed_iot_u2: number;
  wind_speed_bmkg_u2: number;
  delta_wind: number;
  
  // Flag Kualitas Data
  is_anomalous: boolean;
  anomaly_reason?: string;
}

export interface BenchmarkMetricsReport {
  period_start: string;
  period_end: string;
  sample_count: number;
  
  temperature: {
    mae: number;
    rmse: number;
    mape: number;
    mbe: number;
    pearson_r: number;
    index_of_agreement: number;
  };
  
  humidity: {
    mae: number;
    rmse: number;
    mape: number;
    mbe: number;
    pearson_r: number;
    index_of_agreement: number;
  };
  
  evapotranspiration_eto: {
    eto_iot_mm: number;
    eto_bmkg_mm: number;
    delta_eto_mm: number;
    delta_water_m3_per_hectare: number; // Selisih kebutuhan air irigasi per hektar
  };
}
```

---

## 4. Skema Database SQLite Historis (`tools/database/database_eto.db`)

Untuk keperluan analisis offline, pelatihan model koreksi bias, dan validasi jangka panjang:

1. **`data_node_sensor`**: Menyimpan log sensor mentah 15 menitan.
2. **`data_bmkg_harian`**: Menyimpan observasi cuaca harian resmi Stasiun Kertajati 96791.
3. **`deployment_log`**: Catatan status insiden (pemadaman, restart, penggantian baterai, kalibrasi).

---

## 5. Skema Konfigurasi Dinamis Perangkat (`config.json` di LittleFS)

Konfigurasi runtime untuk hardware modul, pemetaan pin GPIO, dan engine ingestion backend tanpa hardcode:

```json
{
  "modules": {
    "dht22": true,
    "bh1750": true,
    "anemometer": true,
    "rtc_ds3231": true,
    "sd_card": false
  },
  "pins": {
    "dht_pin": 2,
    "anemo_pin": 0,
    "i2c_sda": 4,
    "i2c_scl": 5,
    "sd_cs_pin": 15
  },
  "backend": {
    "protocol": "firebase",
    "firebase": {
      "project_id": "agrinex-f5ef8",
      "collection": "telemetry"
    },
    "supabase": {
      "url": "https://xyzcompany.supabase.co",
      "api_key": "eyJhbGciOi...",
      "table": "telemetry"
    },
    "mqtt": {
      "broker": "broker.emqx.io",
      "port": 1883,
      "topic": "agrinex/weather/telemetry",
      "username": "",
      "password": "",
      "client_id": "agrinex-esp8266"
    },
    "http_rest": {
      "url": "https://weatherstation.agrinex.io/api/telemetry",
      "auth_header": "Bearer token123"
    }
  },
  "timing": {
    "sensor_read_ms": 10000,
    "publish_interval_ms": 900000,
    "enable_deep_sleep": false
  }
}
```

