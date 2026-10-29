// ============================================================
//  Agrinex Weather Station — ESP8266 Firmware v2.0
//
//  Arsitektur: Cooperative Multitasking (millis-based scheduler)
//  Scheduler:
//    Job 1: Sensor Read        — Baca semua sensor setiap 10 detik
//    Job 2: Firebase Publish   — Kirim rata-rata data setiap 15 menit
//    Job 3: Watchdog/LED       — Health check & LED indicator setiap 5s
//
//  Payload Cloud Firebase Firestore:
//    { timestamp, temperature, humidity, wind_speed, light_lux, createdAt }
// ============================================================

#include <Arduino.h>
#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
  #include <WebServer.h>
  typedef WebServer WebServerType;
#else
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <WiFiClientSecure.h>
  #include <ESP8266WebServer.h>
  typedef ESP8266WebServer WebServerType;
#endif
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <RTClib.h>
#include <DHT.h>
#include <BH1750.h>
#include <INA226.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <PubSubClient.h>
#include <time.h>
#include <sys/time.h>
#include "config.h"
#include "device_config.h"
#include "web_portal.h"

// ──────────── Global Configuration & Servers ────────────
DeviceConfig deviceConfig;
WebServerType webServer(80);
WiFiClient mqttNetClient;
PubSubClient mqttClient(mqttNetClient);
INA226 ina(INA226_I2C_ADDR);
bool inaOk = false;
bool bh1750Ok = false;

// ──────────── FreeRTOS Dual-Core Handles (ESP32) ────────────
#if defined(ESP32)
  #include "freertos/FreeRTOS.h"
  #include "freertos/task.h"
  #include "freertos/semphr.h"

  TaskHandle_t hSensorTask  = nullptr;
  TaskHandle_t hNetworkTask = nullptr;
  SemaphoreHandle_t sensorMutex = nullptr;

  void sensorTask(void* pvParameters);
  void networkTask(void* pvParameters);
#endif

// ──────────── Sensor Objects ────────────
DHT* dht = nullptr;
BH1750 lightMeter;
RTC_DS3231 rtc;
WiFiClient wifiClient;

// ──────────── LED Polarity ────────────
#if defined(ESP32)
  #define LED_ON  HIGH
  #define LED_OFF LOW
#else
  #define LED_ON  LOW
  #define LED_OFF HIGH
#endif

// ──────────── Hardware Status Flags ────────────
bool rtcOk = false;
bool sdOk  = false;

// ──────────── Anemometer ISR Variables ────────────
volatile uint32_t anemoPulseCount = 0;
volatile unsigned long anemoLastPulseUs = 0;

// ──────────── Sensor Ring Buffer (Defined in config.h) ────────────

// Ring buffer untuk averaging
SensorSample sampleBuffer[SAMPLE_BUFFER_SIZE];
int sampleWriteIdx = 0;
int sampleCount = 0;

// Latest single reading (for serial debug & fallback)
SensorSample latestReading = {0, 0, 0, 0, 0, 0, 0, 0, false};

// ──────────── Scheduler Timestamps ────────────
unsigned long lastSensorReadMs  = 0;
unsigned long lastPublishMs     = 0;
unsigned long lastWatchdogMs    = 0;
unsigned long lastAnemoCalcMs   = 0;
uint32_t      lastAnemoCount    = 0;

// ──────────── State Flags ────────────
bool ntpSynced        = false;
bool firstPublishDone = false;

// ──────────── Forward Declarations ────────────
void connectWiFi();
void syncNtpTime();
String getIso8601Timestamp();
IRAM_ATTR void anemoIsr();
int calculateBatteryPercent(float volts, bool isCharging);
void jobSensorRead();
void jobFirebasePublish();
void processOfflineQueue();
void jobWatchdog();
bool publishTelemetry(const String& isoTime, float temp, float hum, float wind, float lux,
                      float batVolts = 0.0f, int batPct = 0, float batCur = 0.0f, float batPwr = 0.0f);
bool postToFirestoreDirect(const String& isoTime, float temp, float hum, float wind, float lux,
                           float batVolts = 0.0f, int batPct = 0, float batCur = 0.0f, float batPwr = 0.0f);
bool postToSupabaseDirect(const String& isoTime, float temp, float hum, float wind, float lux,
                          float batVolts = 0.0f, int batPct = 0, float batCur = 0.0f, float batPwr = 0.0f);
bool postToMqtt(const String& isoTime, float temp, float hum, float wind, float lux,
                float batVolts = 0.0f, int batPct = 0, float batCur = 0.0f, float batPwr = 0.0f);
bool postToRestDirect(const String& isoTime, float temp, float hum, float wind, float lux,
                      float batVolts = 0.0f, int batPct = 0, float batCur = 0.0f, float batPwr = 0.0f);
void postToWebIngress(const String& isoTime, float temp, float hum, float wind, float lux,
                     float batVolts = 0.0f, int batPct = 0, float batCur = 0.0f, float batPwr = 0.0f);
bool logToSdCard(const String& isoTime, float temp, float hum, float wind, float lux, const char* status);
void runDeepSleepCycle();

// Algoritma State-of-Charge LiFePO4 1S (3.2V 30Ah) dengan Kompensasi Charging
int calculateBatteryPercent(float volts, bool isCharging) {
  if (volts <= 2.60f) return 0;
  float effectiveOcv = volts;
  if (isCharging && volts >= 3.40f) {
    effectiveOcv = (volts - 0.40f > 2.60f) ? (volts - 0.40f) : 2.60f;
  }
  if (effectiveOcv >= 3.42f) return 100;
  if (effectiveOcv >= 3.36f) return 95 + (int)((effectiveOcv - 3.36f) / (3.42f - 3.36f) * 5.0f);
  if (effectiveOcv >= 3.33f) return 80 + (int)((effectiveOcv - 3.33f) / (3.36f - 3.33f) * 15.0f);
  if (effectiveOcv >= 3.30f) return 60 + (int)((effectiveOcv - 3.30f) / (3.33f - 3.30f) * 20.0f);
  if (effectiveOcv >= 3.28f) return 40 + (int)((effectiveOcv - 3.28f) / (3.30f - 3.28f) * 20.0f);
  if (effectiveOcv >= 3.20f) return 20 + (int)((effectiveOcv - 3.20f) / (3.28f - 3.20f) * 20.0f);
  if (effectiveOcv >= 3.00f) return 10 + (int)((effectiveOcv - 3.00f) / (3.20f - 3.00f) * 10.0f);
  return (int)((effectiveOcv - 2.60f) / (3.00f - 2.60f) * 10.0f);
}

// ================================================================
//  SETUP
// ================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("╔══════════════════════════════════════════════╗"));
  Serial.println(F("║  Agrinex Weather Station (ESP32 & ESP8266)  ║"));
  Serial.println(F("║  RTC DS3231 + MicroSD + INA226 Battery      ║"));
  Serial.println(F("╚══════════════════════════════════════════════╝"));
  Serial.println();

  // LED pin (aktif sesuaikan polaritas chip)
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);

  // --- 0. LittleFS Init & Muat Konfigurasi Dinamis (DeviceConfig) ---
  if (!LittleFS.begin()) {
    Serial.println(F("[INIT] LittleFS Mount Failed! Memformat..."));
    LittleFS.format();
    LittleFS.begin();
  }
  Serial.println(F("[INIT] LittleFS ✓"));
  if (!LittleFS.exists("/q")) {
    LittleFS.mkdir("/q");
  }
  loadDeviceConfig(deviceConfig);

  // --- 1. I2C Bus Init (Dinamis sesuai pin konfigurasi) ---
  Wire.begin(deviceConfig.pins.i2c_sda, deviceConfig.pins.i2c_scl);
  Wire.setClock(100000); // 100kHz standard I2C speed
  delay(200); // Waktu stabilisasi sirkuit daya & pull-up I2C slave (persis local-project)

  Serial.printf("[I2C] Scanning I2C bus pada SDA(GPIO%d) / SCL(GPIO%d)...\n", 
                deviceConfig.pins.i2c_sda, deviceConfig.pins.i2c_scl);
  byte i2cDevicesFound = 0;
  byte bh1750Addr = 0;
  bool rtcDetected = false;
  bool inaDetected = false;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.printf("[I2C] ✓ Device terdeteksi pada 0x%02X\n", address);
      i2cDevicesFound++;
      if (address == 0x23 || address == 0x5C) {
        bh1750Addr = address;
      }
      if (address == 0x68) {
        rtcDetected = true;
      }
      if (address >= 0x40 && address <= 0x45) {
        inaDetected = true;
      }
    }
  }

  // --- Inisialisasi INA226 Battery & Power Monitor ---
  ina = INA226(INA226_I2C_ADDR);
  if (ina.begin()) {
    inaOk = true;
    ina.setMaxCurrentShunt(INA226_MAX_AMPS, INA226_SHUNT_OHM);
    Serial.println(F("[INIT] INA226 Battery Monitor (I2C 0x40) ✓"));
  } else {
    Serial.println(F("[INIT] INA226 belum merespons di awal — akan auto-reconnect saat baca sensor"));
    inaOk = false;
  }

  // --- 2. Inisialisasi RTC DS3231 (Kondisional Checkbox) ---
  if (deviceConfig.modules.rtc_ds3231) {
    if (rtcDetected && rtc.begin()) {
      rtcOk = true;
      Serial.println(F("[INIT] RTC DS3231 (I2C 0x68) ✓"));
      if (rtc.lostPower()) {
        Serial.println(F("[RTC] ⚠ RTC lost power, setting compile time..."));
        rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
      }
      DateTime rtcNow = rtc.now();
      if (rtcNow.year() >= 2024 && rtcNow.year() <= 2099) {
        time_t rtcTimeSec = rtcNow.unixtime();
        timeval tv = { rtcTimeSec, 0 };
        settimeofday(&tv, nullptr);
        Serial.printf("[RTC] ✓ Waktu sistem disetel dari RTC: %04d-%02d-%02d %02d:%02d:%02d\n",
                      rtcNow.year(), rtcNow.month(), rtcNow.day(),
                      rtcNow.hour(), rtcNow.minute(), rtcNow.second());
      }
    } else {
      Serial.println(F("[INIT] RTC DS3231 ✗ — periksa sambungan I2C"));
      rtcOk = false;
    }
  } else {
    Serial.println(F("[CONFIG] RTC DS3231 dinonaktifkan (Unchecked) — Waktu sistem mengandalkan NTP."));
    rtcOk = false;
  }

  // --- 3. Inisialisasi BH1750 (Kondisional Checkbox & Configurable I2C Addr) ---
  if (deviceConfig.modules.bh1750) {
    uint8_t targetAddr = (deviceConfig.pins.bh1750_addr == 0x5C || deviceConfig.pins.bh1750_addr == 92) ? 0x5C : 0x23;
    if (bh1750Addr != 0) targetAddr = bh1750Addr; // Prioritize hardware scan if detected

    bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, targetAddr);
    if (!bh1750Ok) {
      uint8_t altAddr = (targetAddr == 0x23) ? 0x5C : 0x23;
      bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, altAddr);
    }
    if (bh1750Ok) {
      Serial.printf("[INIT] BH1750 Light Sensor ✓ (Addr: 0x%02X)\n", targetAddr);
    } else {
      Serial.println(F("[INIT] BH1750 ✗ — periksa sambungan kabel SDA/SCL"));
    }
  } else {
    Serial.println(F("[CONFIG] BH1750 dinonaktifkan (Unchecked)."));
  }

  // --- 4. Inisialisasi MicroSD Card (Kondisional Checkbox: Tanpa hang jika tidak dipasang) ---
  if (deviceConfig.modules.sd_card) {
    SPI.begin();
    pinMode(deviceConfig.pins.sd_cs_pin, OUTPUT);
    digitalWrite(deviceConfig.pins.sd_cs_pin, HIGH);
    if (SD.begin(deviceConfig.pins.sd_cs_pin)) {
      sdOk = true;
      Serial.printf("[INIT] MicroSD Card (SPI CS pin %d) ✓\n", deviceConfig.pins.sd_cs_pin);
      if (!SD.exists(SD_LOG_FILE)) {
        File f = SD.open(SD_LOG_FILE, FILE_WRITE);
        if (f) {
          f.println(F("timestamp,temperature,humidity,wind_speed,light_lux,status"));
          f.close();
          Serial.println(F("[SD] Header datalog.csv berhasil dibuat."));
        }
      }
    } else {
      Serial.printf("[INIT] MicroSD Card ✗ — periksa modul MicroSD / CS pin %d\n", deviceConfig.pins.sd_cs_pin);
      sdOk = false;
    }
  } else {
    Serial.println(F("[CONFIG] MicroSD Card dinonaktifkan (Unchecked) — Melewati inisialisasi SPI SD."));
    sdOk = false;
  }

  // --- 5. DHT22 (Kondisional Checkbox & Pin Dinamis) ---
  if (deviceConfig.modules.dht22) {
    dht = new DHT(deviceConfig.pins.dht_pin, DHTTYPE);
    dht->begin();
    Serial.printf("[INIT] DHT22 (Pin GPIO%d) ✓\n", deviceConfig.pins.dht_pin);
  } else {
    Serial.println(F("[CONFIG] DHT22 dinonaktifkan (Unchecked)."));
  }

  // --- 6. Anemometer (Kondisional Checkbox & Pin Dinamis) ---
  if (deviceConfig.modules.anemometer) {
    pinMode(deviceConfig.pins.anemo_pin, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(deviceConfig.pins.anemo_pin), anemoIsr, RISING);
    Serial.printf("[INIT] Anemometer (Pin GPIO%d) ✓\n", deviceConfig.pins.anemo_pin);
  } else {
    Serial.println(F("[CONFIG] Anemometer dinonaktifkan (Unchecked)."));
  }

  // --- 7. Cabang Mode: Deep Sleep vs Continuous ---
  if (deviceConfig.enable_deep_sleep || ENABLE_DEEP_SLEEP) {
    runDeepSleepCycle();
    return; // Kode di bawah tidak dieksekusi jika deep sleep aktif
  }

  // --- 8. Mode Non-Sleep: Hubungkan WiFi, NTP, & Start Web Config Portal ---
  connectWiFi();
  syncNtpTime();

  // Aktifkan Local Web Server untuk konfigurasi via browser di IP lokal
  setupWebServerRoutes();
  webServer.begin();
  Serial.println(F("[HTTP] ✓ Local Web Config Server berjalan pada port 80"));
  Serial.printf("[HTTP] Akses http://%s/settings di browser untuk mengubah pin & backend\n", WiFi.localIP().toString().c_str());

  // --- Init buffer & timestamps ---
  memset(sampleBuffer, 0, sizeof(sampleBuffer));
  unsigned long now = millis();
  lastSensorReadMs = now;
  lastPublishMs    = now;
  lastWatchdogMs   = now;
  lastAnemoCalcMs  = now;

#if defined(ESP32)
  // --- Inisialisasi Mutex & FreeRTOS Dual-Core Tasks (ESP32) ---
  sensorMutex = xSemaphoreCreateMutex();

  // Task 1: SensorTask di Core 1 (APP_CPU), Priority 3 (High, Real-Time deterministik)
  xTaskCreatePinnedToCore(sensorTask, "SensorTask", 4096, NULL, 3, &hSensorTask, 1);

  // Task 2: NetworkTask di Core 0 (PRO_CPU), Priority 1 (Background Ingestion bersama WiFi/LwIP)
  xTaskCreatePinnedToCore(networkTask, "NetworkTask", 8192, NULL, 1, &hNetworkTask, 0);

  Serial.println(F("[RTOS] ✓ Dual-Core FreeRTOS Tasks aktif:"));
  Serial.printf("       - SensorTask  : Core 1, Priority 3 (Real-time setiap %u detik)\n", deviceConfig.sensor_read_ms / 1000);
  Serial.printf("       - NetworkTask : Core 0, Priority 1 (Publish setiap %u menit via %s)\n", deviceConfig.publish_interval_ms / 60000, protocolToString(deviceConfig.protocol));
  Serial.println(F("       - WebServer   : Core 1, Priority 1 (Event-driven port 80)"));
#else
  Serial.println();
  Serial.println(F("[SCHED] Scheduler ESP8266 Non-Sleep dimulai:"));
  Serial.printf("  Sensor read      : setiap %u detik\n", deviceConfig.sensor_read_ms / 1000);
  Serial.printf("  Publish backend  : %s (setiap %u menit)\n", protocolToString(deviceConfig.protocol), deviceConfig.publish_interval_ms / 60000);
  Serial.println(F("  Watchdog         : setiap 5 detik"));
#endif

  Serial.println();
  Serial.println(F("time,temperature,humidity,wind_speed,light_lux,battery_v,battery_pct"));
}

// ================================================================
//  LOOP — Non-blocking cooperative scheduler
// ================================================================
void loop() {
  // Layani request web server lokal (pengaturan pin/modul/backend via browser)
  webServer.handleClient();

  // Layani koneksi MQTT jika backend MQTT aktif
  if (deviceConfig.protocol == BackendProtocol::MQTT) {
    mqttClient.loop();
  }

#if defined(ESP32)
  // Pada ESP32, Sensor & Network dikelola mandiri oleh FreeRTOS task di Core 0 & Core 1.
  // loopTask di Core 1 hanya menangani Web Server, Watchdog, dan istirahat sejenak (10ms)
  unsigned long now = millis();
  if (now - lastWatchdogMs >= WATCHDOG_INTERVAL_MS) {
    lastWatchdogMs = now;
    jobWatchdog();
  }
  vTaskDelay(pdMS_TO_TICKS(10));
#else
  // Fallback cooperative scheduler untuk ESP8266 (Single-Core)
  unsigned long now = millis();

  // Job 1: Sensor Read (every 10s)
  if (now - lastSensorReadMs >= deviceConfig.sensor_read_ms) {
    lastSensorReadMs = now;
    jobSensorRead();
  }

  // Job 2: Backend Publish (setiap 15 min & publikasi awal pada boot)
  if (!firstPublishDone && sampleCount > 0) {
    lastPublishMs = now;
    jobFirebasePublish();
  } else if (now - lastPublishMs >= deviceConfig.publish_interval_ms) {
    lastPublishMs = now;
    jobFirebasePublish();
  }

  // Job 3: Watchdog / LED status (every 5s)
  if (now - lastWatchdogMs >= WATCHDOG_INTERVAL_MS) {
    lastWatchdogMs = now;
    jobWatchdog();
  }

  // Yield ke ESP8266 WiFi/TCP stack (WAJIB untuk stabilitas)
  yield();
#endif
}

// ================================================================
//  ISR: Anemometer Pulse Counter
// ================================================================
IRAM_ATTR void anemoIsr() {
  unsigned long now = micros();
  if (now - anemoLastPulseUs >= ANEMOMETER_DEBOUNCE_US) {
    anemoPulseCount++;
    anemoLastPulseUs = now;
  }
}

// Helper function: Baca DHT22 dengan safe yield & retry (Kondisional pointer & modul)
bool readDhtSensor(float &temp, float &hum) {
  if (!dht || !deviceConfig.modules.dht22) {
    temp = 0.0f;
    hum  = 0.0f;
    return false;
  }

  temp = dht->readTemperature(false, false);
  hum  = dht->readHumidity(false);

  if (!isnan(temp) && !isnan(hum) && temp > -20.0f && temp < 80.0f && hum >= 0.0f && hum <= 100.0f) {
    return true;
  }

  for (int retry = 0; retry < 2; retry++) {
    delay(1500);
    yield();
    temp = dht->readTemperature(false, true);
    hum  = dht->readHumidity(true);
    if (!isnan(temp) && !isnan(hum) && temp > -20.0f && temp < 80.0f && hum >= 0.0f && hum <= 100.0f) {
      return true;
    }
  }
  return false;
}

// ================================================================
//  JOB 1: Sensor Read
//  Membaca DHT22, BH1750, Anemometer dan menyimpan ke ring buffer.
// ================================================================
void jobSensorRead() {
  // --- Baca DHT22 ---
  float temp = 0.0f, hum = 0.0f;
  bool dhtOk = false;
  if (deviceConfig.modules.dht22) {
    dhtOk = readDhtSensor(temp, hum);
    if (!dhtOk) {
      Serial.printf("[SENSOR] DHT22 gagal baca (Pin GPIO%d) — periksa kabel & power 3.3V\n", deviceConfig.pins.dht_pin);
      temp = 0.0f;
      hum  = 0.0f;
    }
  } else {
    dhtOk = true; // Jika DHT dinonaktifkan, data tetap valid untuk lux & angin
  }

  // --- Auto-reconnect & Baca BH1750 (Kondisional) ---
  float lux = 0.0f;
  if (deviceConfig.modules.bh1750) {
    if (!bh1750Ok) {
      if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23) ||
          lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C)) {
        bh1750Ok = true;
        Serial.println(F("[I2C] ✓ BH1750 auto-reconnected!"));
      }
    }
    if (bh1750Ok) {
      lux = lightMeter.readLightLevel();
      if (lux < 0 || lux >= 54612.0f) {
        delay(150);
        yield();
        lux = lightMeter.readLightLevel();
      }
      if (lux < 0 || lux >= 54612.0f) {
        lux = 0.0f;
        bh1750Ok = false; // Coba reconnect pada siklus berikutnya
      }
    }
  }

  // --- Hitung kecepatan angin (Kondisional) ---
  float windKmh = 0.0f;
  if (deviceConfig.modules.anemometer) {
    unsigned long nowMs = millis();
    float elapsedSec = (nowMs - lastAnemoCalcMs) / 1000.0f;

    noInterrupts();
    uint32_t currentPulses = anemoPulseCount;
    interrupts();

    uint32_t pulsesDelta = currentPulses - lastAnemoCount;
    float rotasiPerDetik = (elapsedSec > 0) ? (float)pulsesDelta / elapsedSec : 0.0f;

    // Zhafira Anemometer 1.3 Formula
    float mPerSec = (-0.0181f * rotasiPerDetik * rotasiPerDetik) +
                    (1.3859f * rotasiPerDetik) + 1.4055f;
    if (mPerSec <= 1.5f) mPerSec = 0.0f;
    windKmh = mPerSec * 3.6f;

    lastAnemoCount = currentPulses;
    lastAnemoCalcMs = nowMs;
  }

  // --- Auto-reconnect & Baca INA226 Battery & Power Monitor ---
  if (!inaOk) {
    Wire.beginTransmission(INA226_I2C_ADDR);
    if (Wire.endTransmission() == 0) {
      ina = INA226(INA226_I2C_ADDR);
      if (ina.begin()) {
        inaOk = true;
        ina.setMaxCurrentShunt(INA226_MAX_AMPS, INA226_SHUNT_OHM);
        Serial.println(F("[I2C] ✓ INA226 auto-reconnected!"));
      }
    }
  }

  float batVolts = 0.0f;
  float batCurrent = 0.0f;
  float batPower = 0.0f;
  int batPct = 0;
  if (inaOk) {
    float vbus = ina.getBusVoltage();
    float shuntMv = ina.getShuntVoltage_mV();
    float cur = ina.getCurrent_mA();
    if (abs(cur) < 0.1f && abs(shuntMv) > 0.005f) {
      cur = shuntMv / INA226_SHUNT_OHM;
    }
    float pwr = abs(vbus * cur);

    if (!isnan(vbus) && vbus > 0.5f) {
      batVolts = vbus;
      batCurrent = cur;
      batPower = pwr;
      bool isSolarCharging = (vbus >= 3.45f || cur < -10.0f);
      batPct = calculateBatteryPercent(vbus, isSolarCharging);
    }
  }

  // --- Simpan ke ring buffer ---
  SensorSample sample;
  sample.temperature    = dhtOk ? temp : 0.0f;
  sample.humidity       = dhtOk ? hum : 0.0f;
  sample.windSpeed      = windKmh;
  sample.lightLux       = lux;
  sample.batteryVolts   = batVolts;
  sample.batteryCurrent = batCurrent;
  sample.batteryPower   = batPower;
  sample.batteryPct     = batPct;
  sample.valid          = dhtOk;

#if defined(ESP32)
  if (sensorMutex) xSemaphoreTake(sensorMutex, portMAX_DELAY);
#endif
  sampleBuffer[sampleWriteIdx] = sample;
  sampleWriteIdx = (sampleWriteIdx + 1) % SAMPLE_BUFFER_SIZE;
  if (sampleCount < SAMPLE_BUFFER_SIZE) sampleCount++;
  latestReading = sample;
#if defined(ESP32)
  if (sensorMutex) xSemaphoreGive(sensorMutex);
#endif

  // --- Serial debug output (CSV) ---
  Serial.printf("%lu,%.1f,%.1f,%.1f,%.0f,%.2fV,%d%%\n",
                millis(), sample.temperature, sample.humidity,
                sample.windSpeed, sample.lightLux, sample.batteryVolts, sample.batteryPct);
}

#if defined(ESP32)
// ──────────── FreeRTOS Task 1: Sensor & Power Acquisition (Core 1) ────────────
void sensorTask(void* pvParameters) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  while (true) {
    jobSensorRead();
    uint32_t periodMs = (deviceConfig.sensor_read_ms > 0) ? deviceConfig.sensor_read_ms : 10000;
    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(periodMs));
  }
}

// ──────────── FreeRTOS Task 2: Network & Cloud Ingestion (Core 0) ────────────
void networkTask(void* pvParameters) {
  // Delay awal 3 detik agar pembacaan sensor pertama stabil
  vTaskDelay(pdMS_TO_TICKS(3000));
  TickType_t xLastWakeTime = xTaskGetTickCount();
  while (true) {
    if (WiFi.status() == WL_CONNECTED) {
      jobFirebasePublish();
    }
    uint32_t periodMs = (deviceConfig.publish_interval_ms > 0) ? deviceConfig.publish_interval_ms : 900000;
    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(periodMs));
  }
}
#endif

// ──────────── 1. Backend Ingestion: Firebase Firestore ────────────
bool postToFirestoreDirect(const String& isoTime, float temp, float hum, float wind, float lux,
                           float batVolts, int batPct, float curMa, float pwrMw) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
#if defined(ESP8266)
  client.setBufferSizes(512, 512);
#endif

  HTTPClient http;
  http.setTimeout(10000);

  String projectId = strlen(deviceConfig.firebase.project_id) > 0 ? deviceConfig.firebase.project_id : FIREBASE_PROJECT_ID;
  String coll = strlen(deviceConfig.firebase.collection) > 0 ? deviceConfig.firebase.collection : "telemetry";
  String url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/" + coll;

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    JsonObject fields = doc["fields"].to<JsonObject>();
    fields["timestamp"]["stringValue"] = isoTime;
    fields["temperature"]["doubleValue"] = (double)((int)(temp * 10)) / 10.0;
    fields["humidity"]["doubleValue"] = (double)((int)(hum * 10)) / 10.0;
    fields["wind_speed"]["doubleValue"] = (double)((int)(wind * 10)) / 10.0;
    fields["light_lux"]["integerValue"] = (int)lux;
    fields["createdAt"]["timestampValue"] = isoTime;

    if (batVolts > 0.1f) {
      fields["battery_voltage"]["doubleValue"] = (double)((int)(batVolts * 100)) / 100.0;
      fields["battery_percentage"]["integerValue"] = batPct;
      fields["battery_current"]["doubleValue"] = (double)((int)(curMa * 10)) / 10.0;
      fields["battery_power"]["doubleValue"] = (double)((int)(pwrMw * 10)) / 10.0;
    }

    JsonObject statusMap = fields["status"]["mapValue"]["fields"].to<JsonObject>();
    statusMap["dht22"]["booleanValue"] = true;
    statusMap["bh1750"]["booleanValue"] = (lux > 0.0f || deviceConfig.modules.bh1750);
    statusMap["ina226"]["booleanValue"] = (batVolts > 0.1f || inaOk);
    statusMap["anemometer"]["booleanValue"] = deviceConfig.modules.anemometer;
    statusMap["rtc_ds3231"]["booleanValue"] = rtcOk;

    String jsonBody;
    serializeJson(doc, jsonBody);

    int httpCode = http.POST(jsonBody);
    bool success = false;
    if (httpCode >= 200 && httpCode < 300) {
      Serial.printf("[FIREBASE] ✓ Firestore Direct Save success (code %d)\n", httpCode);
      digitalWrite(LED_PIN, LOW);   // Blink LED indicator on success
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      firstPublishDone = true;
      success = true;
    } else {
      Serial.printf("[FIREBASE] ✗ Firestore Save error (code %d)\n", httpCode);
    }
    http.end();
    return success;
  }
  return false;
}

// ──────────── 2. Backend Ingestion: Supabase Database (PostgREST) ────────────
bool postToSupabaseDirect(const String& isoTime, float temp, float hum, float wind, float lux,
                          float batVolts, int batPct, float curMa, float pwrMw) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
#if defined(ESP8266)
  client.setBufferSizes(512, 512);
#endif

  HTTPClient http;
  http.setTimeout(10000);

  String url = String(deviceConfig.supabase.url) + "/rest/v1/" + String(deviceConfig.supabase.table);
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", deviceConfig.supabase.api_key);
    String auth = "Bearer " + String(deviceConfig.supabase.api_key);
    http.addHeader("Authorization", auth.c_str());
    http.addHeader("Prefer", "return=minimal");

    JsonDocument doc;
    doc["timestamp"]   = isoTime;
    doc["temperature"] = (double)((int)(temp * 10)) / 10.0;
    doc["humidity"]    = (double)((int)(hum * 10)) / 10.0;
    doc["wind_speed"]  = (double)((int)(wind * 10)) / 10.0;
    doc["light_lux"]   = (int)lux;

    String jsonBody;
    serializeJson(doc, jsonBody);

    int httpCode = http.POST(jsonBody);
    bool success = (httpCode >= 200 && httpCode < 300);
    if (success) {
      Serial.printf("[SUPABASE] ✓ Supabase Save success (code %d)\n", httpCode);
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      firstPublishDone = true;
    } else {
      Serial.printf("[SUPABASE] ✗ Supabase error (code %d)\n", httpCode);
    }
    http.end();
    return success;
  }
  return false;
}

// ──────────── 3. Backend Ingestion: MQTT Broker ────────────
bool postToMqtt(const String& isoTime, float temp, float hum, float wind, float lux,
                float batVolts, int batPct, float batCur, float batPwr) {
  if (WiFi.status() != WL_CONNECTED) return false;

  if (!mqttClient.connected()) {
    mqttClient.setServer(deviceConfig.mqtt.broker, deviceConfig.mqtt.port);
    bool conn = false;
    if (strlen(deviceConfig.mqtt.username) > 0) {
      conn = mqttClient.connect(deviceConfig.mqtt.client_id, deviceConfig.mqtt.username, deviceConfig.mqtt.password);
    } else {
      conn = mqttClient.connect(deviceConfig.mqtt.client_id);
    }
    if (!conn) {
      Serial.printf("[MQTT] ✗ Gagal connect ke broker %s:%d\n", deviceConfig.mqtt.broker, deviceConfig.mqtt.port);
      return false;
    }
  }

  JsonDocument doc;
  doc["timestamp"]   = isoTime;
  doc["temperature"] = (double)((int)(temp * 10)) / 10.0;
  doc["humidity"]    = (double)((int)(hum * 10)) / 10.0;
  doc["wind_speed"]  = (double)((int)(wind * 10)) / 10.0;
  doc["light_lux"]   = (int)lux;
  if (batVolts > 0.1f) {
    doc["battery_voltage"] = (double)((int)(batVolts * 100)) / 100.0;
    doc["battery_percentage"] = batPct;
    doc["battery_current"] = (double)((int)(batCur * 10)) / 10.0;
    doc["battery_power"] = (double)((int)(batPwr * 10)) / 10.0;
  }

  String body;
  serializeJson(doc, body);

  bool published = mqttClient.publish(deviceConfig.mqtt.topic, body.c_str());
  if (published) {
    Serial.printf("[MQTT] ✓ Published ke %s\n", deviceConfig.mqtt.topic);
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    firstPublishDone = true;
  } else {
    Serial.println(F("[MQTT] ✗ Gagal publish pesan"));
  }
  return published;
}

// ──────────── 4. Backend Ingestion: Custom HTTPS REST Webhook ────────────
bool postToRestDirect(const String& isoTime, float temp, float hum, float wind, float lux,
                      float batVolts, int batPct, float batCur, float batPwr) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
#if defined(ESP8266)
  client.setBufferSizes(512, 512);
#endif

  HTTPClient http;
  http.setTimeout(10000);

  if (http.begin(client, deviceConfig.http_rest.url)) {
    http.addHeader("Content-Type", "application/json");
    if (strlen(deviceConfig.http_rest.auth_header) > 0) {
      http.addHeader("Authorization", deviceConfig.http_rest.auth_header);
    }

    JsonDocument doc;
    doc["timestamp"]   = isoTime;
    doc["temperature"] = (double)((int)(temp * 10)) / 10.0;
    doc["humidity"]    = (double)((int)(hum * 10)) / 10.0;
    doc["wind_speed"]  = (double)((int)(wind * 10)) / 10.0;
    doc["light_lux"]   = (int)lux;
    if (batVolts > 0.1f) {
      doc["battery_voltage"] = (double)((int)(batVolts * 100)) / 100.0;
      doc["battery_percentage"] = batPct;
      doc["battery_current"] = (double)((int)(batCur * 10)) / 10.0;
      doc["battery_power"] = (double)((int)(batPwr * 10)) / 10.0;
    }

    String body;
    serializeJson(doc, body);

    int httpCode = http.POST(body);
    bool success = (httpCode >= 200 && httpCode < 300);
    if (success) {
      Serial.printf("[REST] ✓ REST Webhook success (code %d)\n", httpCode);
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      firstPublishDone = true;
    } else {
      Serial.printf("[REST] ✗ REST Webhook error (code %d)\n", httpCode);
    }
    http.end();
    return success;
  }
  return false;
}

// ──────────── Multi-Protocol Dispatcher (Tanpa Hardcode) ────────────
bool publishTelemetry(const String& isoTime, float temp, float hum, float wind, float lux,
                      float batVolts, int batPct, float batCur, float batPwr) {
  switch (deviceConfig.protocol) {
    case BackendProtocol::SUPABASE:
      return postToSupabaseDirect(isoTime, temp, hum, wind, lux, batVolts, batPct, batCur, batPwr);
    case BackendProtocol::MQTT:
      return postToMqtt(isoTime, temp, hum, wind, lux, batVolts, batPct, batCur, batPwr);
    case BackendProtocol::HTTP_REST:
      return postToRestDirect(isoTime, temp, hum, wind, lux, batVolts, batPct, batCur, batPwr);
    case BackendProtocol::FIREBASE:
    default:
      return postToFirestoreDirect(isoTime, temp, hum, wind, lux, batVolts, batPct, batCur, batPwr);
  }
}

// Function: Direct HTTPS POST to Vercel Web Ingestion Endpoint (Backup)
void postToWebIngress(const String& isoTime, float temp, float hum, float wind, float lux,
                     float batVolts, int batPct, float batCur, float batPwr) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
#if defined(ESP8266)
  client.setBufferSizes(512, 512);
#endif

  HTTPClient http;
  http.setTimeout(10000);

  String url = F("https://weatherstation.agrinex.io/api/telemetry");

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["timestamp"]   = isoTime;
    doc["temperature"] = (double)((int)(temp * 10)) / 10.0;
    doc["humidity"]    = (double)((int)(hum * 10)) / 10.0;
    doc["wind_speed"]  = (double)((int)(wind * 10)) / 10.0;
    doc["light_lux"]   = (int)lux;
    if (batVolts > 0.1f) {
      doc["battery_voltage"] = (double)((int)(batVolts * 100)) / 100.0;
      doc["battery_percentage"] = batPct;
      doc["battery_current"] = (double)((int)(batCur * 10)) / 10.0;
      doc["battery_power"] = (double)((int)(batPwr * 10)) / 10.0;
    }

    String jsonBody;
    serializeJson(doc, jsonBody);

    int httpCode = http.POST(jsonBody);
    if (httpCode > 0) {
      Serial.printf("[WEB-INGRESS] ✓ Web Ingestion success (code %d)\n", httpCode);
    }
    http.end();
  }
}

// ================================================================
//  JOB 2: Firebase Firestore Direct Publish (with LittleFS Queue)
// ================================================================
void jobFirebasePublish() {
  if (sampleCount == 0 && !firstPublishDone) return;

  // Pastikan NTP tersinkronisasi sebelum membuat data file
  String isoTime = getIso8601Timestamp();
  if (isoTime == "") {
     Serial.println(F("[QUEUE] Waktu NTP belum tersinkronisasi. Mencoba sync..."));
     syncNtpTime();
     isoTime = getIso8601Timestamp();
     if (isoTime == "") {
       Serial.println(F("[QUEUE] ⚠ Gagal sync NTP. Tunda pencatatan data ke memori Flash."));
       return; // Biarkan data terakumulasi di RAM
     }
  }

  // --- Hitung rata-rata dari buffer (Thread-safe) ---
  if (sampleCount > 0) {
    float avgTemp = 0, avgHum = 0, avgWind = 0, avgLux = 0;
    float avgBatVolts = 0, avgBatCur = 0, avgBatPwr = 0;
    int avgBatPct = 0;
    int validCount = 0;

#if defined(ESP32)
    if (sensorMutex) xSemaphoreTake(sensorMutex, portMAX_DELAY);
#endif
    for (int i = 0; i < sampleCount; i++) {
      if (sampleBuffer[i].valid) {
        avgTemp += sampleBuffer[i].temperature;
        avgHum  += sampleBuffer[i].humidity;
        avgWind += sampleBuffer[i].windSpeed;
        avgLux  += sampleBuffer[i].lightLux;
        avgBatVolts += sampleBuffer[i].batteryVolts;
        avgBatCur   += sampleBuffer[i].batteryCurrent;
        avgBatPwr   += sampleBuffer[i].batteryPower;
        avgBatPct   += sampleBuffer[i].batteryPct;
        validCount++;
      }
    }

    sampleCount = 0;
    sampleWriteIdx = 0;
#if defined(ESP32)
    if (sensorMutex) xSemaphoreGive(sensorMutex);
#endif

    if (validCount > 0) {
      avgTemp /= validCount;
      avgHum  /= validCount;
      avgWind /= validCount;
      avgLux  /= validCount;
      avgBatVolts /= validCount;
      avgBatCur   /= validCount;
      avgBatPwr   /= validCount;
      avgBatPct   /= validCount;
    } else {
      avgTemp = latestReading.temperature;
      avgHum  = latestReading.humidity;
      avgWind = latestReading.windSpeed;
      avgLux  = latestReading.lightLux;
      avgBatVolts = latestReading.batteryVolts;
      avgBatCur   = latestReading.batteryCurrent;
      avgBatPwr   = latestReading.batteryPower;
      avgBatPct   = latestReading.batteryPct;
    }

    // Simpan ke Flash dengan format CSV (termasuk baterai LiFePO4)
    String queueLine = isoTime + "," + String(avgTemp, 1) + "," + String(avgHum, 1) + "," + 
                       String(avgWind, 1) + "," + String(avgLux, 0) + "," + 
                       String(avgBatVolts, 2) + "," + String(avgBatPct) + "," + 
                       String(avgBatCur, 1) + "," + String(avgBatPwr, 1);
    
    time_t now = time(nullptr);
    String filepath = "/q/" + String(now) + ".csv";
    File file = LittleFS.open(filepath, "w");
    if (file) {
      file.print(queueLine);
      file.close();
      Serial.printf("[QUEUE] ✓ Data rata-rata aman di Flash: %s\n", filepath.c_str());
    } else {
      Serial.printf("[QUEUE] ✗ Gagal menyimpan ke Flash: %s\n", filepath.c_str());
    }

    // Simpan juga ke MicroSD Card fisik
    logToSdCard(isoTime, avgTemp, avgHum, avgWind, avgLux, "PERIODIC_AVG");
  }

  // Kirim antrean ke Firebase
  processOfflineQueue();
}

// ================================================================
//  Proses Antrean Offline (LittleFS -> Firebase)
// ================================================================
void processOfflineQueue() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[QUEUE] ⚠ Menunggu WiFi untuk mengirim antrean..."));
    return;
  }

#if defined(ESP32)
  File rootDir = LittleFS.open("/q");
  if (!rootDir || !rootDir.isDirectory()) return;
  File qEntry = rootDir.openNextFile();
  while (qEntry) {
    String filename = qEntry.name();
    String filepath = filename.startsWith("/") ? filename : ("/q/" + filename);
    String line = qEntry.readStringUntil('\n');
    qEntry.close();
#else
  Dir dir = LittleFS.openDir("/q");
  while (dir.next()) {
    String filename = dir.fileName();
    String filepath = "/q/" + filename;
    
    File file = LittleFS.open(filepath, "r");
    if (!file) continue;
    
    String line = file.readStringUntil('\n');
    file.close();
#endif
    
    // Parse CSV (Format: isoTime,temp,hum,wind,lux[,batVolts,batPct,batCur,batPwr])
    int comma1 = line.indexOf(',');
    int comma2 = line.indexOf(',', comma1 + 1);
    int comma3 = line.indexOf(',', comma2 + 1);
    int comma4 = line.indexOf(',', comma3 + 1);
    
    if (comma1 > 0 && comma2 > 0 && comma3 > 0 && comma4 > 0) {
      String isoTime = line.substring(0, comma1);
      float temp = line.substring(comma1 + 1, comma2).toFloat();
      float hum = line.substring(comma2 + 1, comma3).toFloat();
      float wind = line.substring(comma3 + 1, comma4).toFloat();
      
      float lux = 0.0f, batVolts = 0.0f, batCur = 0.0f, batPwr = 0.0f;
      int batPct = 0;
      int comma5 = line.indexOf(',', comma4 + 1);
      if (comma5 > 0) {
        lux = line.substring(comma4 + 1, comma5).toFloat();
        int comma6 = line.indexOf(',', comma5 + 1);
        int comma7 = line.indexOf(',', comma6 + 1);
        int comma8 = line.indexOf(',', comma7 + 1);
        if (comma6 > 0 && comma7 > 0 && comma8 > 0) {
          batVolts = line.substring(comma5 + 1, comma6).toFloat();
          batPct   = line.substring(comma6 + 1, comma7).toInt();
          batCur   = line.substring(comma7 + 1, comma8).toFloat();
          batPwr   = line.substring(comma8 + 1).toFloat();
        }
      } else {
        lux = line.substring(comma4 + 1).toFloat();
      }
      
      Serial.printf("[QUEUE] ⏳ Mengirim antrean %s ke backend (%s)...\n", 
                    filename.c_str(), protocolToString(deviceConfig.protocol));
      
      bool successFS = publishTelemetry(isoTime, temp, hum, wind, lux, batVolts, batPct, batCur, batPwr);
      
      if (successFS) {
         LittleFS.remove(filepath);
         Serial.printf("[QUEUE] ✓ Berhasil menghapus antrean dari flash: %s\n", filename.c_str());
         
         // Backup Ingestion (Opsional)
         if (deviceConfig.protocol != BackendProtocol::HTTP_REST) {
           postToWebIngress(isoTime, temp, hum, wind, lux);
         }
      } else {
         Serial.printf("[QUEUE] ✗ Publish ke %s gagal (network error/timeout). Berhenti kirim antrean siklus ini.\n",
                       protocolToString(deviceConfig.protocol));
         break; // Berhenti memproses antrean agar tidak spam error
      }
    } else {
      Serial.printf("[QUEUE] ⚠ Format file corrupt, menghapus: %s\n", filename.c_str());
      LittleFS.remove(filepath);
    }
    
    yield(); // Watchdog reset prevention
#if defined(ESP32)
    qEntry = rootDir.openNextFile();
#endif
  }
}

// ================================================================
//  JOB 3: Watchdog / LED Status
// ================================================================
void jobWatchdog() {
  bool wifiOk = (WiFi.status() == WL_CONNECTED);

  // LED heartbeat pattern (active LOW pada NodeMCU)
  if (wifiOk) {
    // Slow single blink: sehat
    digitalWrite(LED_PIN, LOW);   // ON
    delay(80);
    digitalWrite(LED_PIN, HIGH);  // OFF
  } else {
    // Fast triple blink: masalah WiFi
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, LOW);
      delay(40);
      digitalWrite(LED_PIN, HIGH);
      delay(40);
    }
  }

  // Log status berkala setiap 30 detik (6 x 5s interval)
  static int watchdogCounter = 0;
  watchdogCounter++;
  if (watchdogCounter % 6 == 0) {
    uint32_t freeHeap = ESP.getFreeHeap();
    unsigned long uptimeSec = millis() / 1000;
    unsigned long uptimeMin = uptimeSec / 60;

    Serial.printf("[STATUS] Uptime: %lum%lus | Heap: %u bytes | WiFi: %s (RSSI %d) | Samples: %d\n",
                  uptimeMin, uptimeSec % 60,
                  freeHeap,
                  wifiOk ? "OK" : "DISCONNECTED",
                  WiFi.RSSI(),
                  sampleCount);

    if (freeHeap < 8000) {
      Serial.printf("[WATCHDOG] ⚠ Low memory: %u bytes — consider restarting\n", freeHeap);
    }
    if (freeHeap < 4000) {
      Serial.println(F("[WATCHDOG] CRITICAL: Restarting ESP..."));
      ESP.restart();
    }
  }

  // WiFi auto-reconnect
  if (!wifiOk) {
    Serial.println(F("[WATCHDOG] WiFi lost, reconnecting..."));
    connectWiFi();
  }
}

// ================================================================
//  WiFi Connection (with retry)
// ================================================================
void connectWiFi() {
  Serial.printf("[WIFI] Menghubungkan ke %s", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
    yield();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WIFI] ✓ Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println(F("[WIFI] ✗ Gagal terhubung. Akan retry nanti..."));
  }
}

// ================================================================
//  NTP Time Sync (with RTC DS3231 Sync & Fallback)
// ================================================================
void syncNtpTime() {
  Serial.println(F("[NTP] Sinkronisasi waktu internet..."));
  configTime(NTP_GMT_OFFSET, NTP_DAYLIGHT, NTP_SERVER, "time.google.com");

  int retries = 0;
  time_t now = 0;
  while (now < 1000000000L && retries < 15) {
    Serial.print(".");
    delay(1000);
    yield();
    now = time(nullptr);
    retries++;
  }

  if (now >= 1000000000L) {
    struct tm* timeinfo = localtime(&now);
    char buf[30];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", timeinfo);
    Serial.printf("\n[NTP] ✓ Waktu: %s WIB\n", buf);
    ntpSynced = true;

    // Sinkronkan waktu internet ke RTC DS3231
    if (rtcOk) {
      rtc.adjust(DateTime((uint32_t)now));
      Serial.println(F("[RTC] ✓ Waktu RTC DS3231 berhasil disinkronkan dari NTP"));
    }
  } else {
    Serial.println(F("\n[NTP] ✗ Gagal sync waktu via internet."));
    ntpSynced = false;

    // Fallback ke RTC DS3231 jika tersedia
    if (rtcOk) {
      DateTime rtcNow = rtc.now();
      if (rtcNow.year() >= 2024 && rtcNow.year() <= 2099) {
        time_t rtcSec = rtcNow.unixtime();
        timeval tv = { rtcSec, 0 };
        settimeofday(&tv, nullptr);
        Serial.printf("[RTC] ✓ Waktu sistem disetel dari RTC DS3231 (%04d-%02d-%02d %02d:%02d:%02d)\n",
                      rtcNow.year(), rtcNow.month(), rtcNow.day(),
                      rtcNow.hour(), rtcNow.minute(), rtcNow.second());
      }
    }
  }
}

// ================================================================
//  ISO 8601 Timestamp Generator (NTP + RTC Fallback)
// ================================================================
String getIso8601Timestamp() {
  time_t now = time(nullptr);
  if (now >= 1000000000L) {
    struct tm* timeinfo = localtime(&now);
    char buf[30];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+07:00", timeinfo);
    return String(buf);
  }

  // Fallback langsung membaca dari RTC DS3231 jika time() belum tervalidasi
  if (rtcOk) {
    DateTime rtcNow = rtc.now();
    if (rtcNow.year() >= 2024 && rtcNow.year() <= 2099) {
      char buf[35];
      snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02d+07:00",
               rtcNow.year(), rtcNow.month(), rtcNow.day(),
               rtcNow.hour(), rtcNow.minute(), rtcNow.second());
      return String(buf);
    }
  }
  return "";
}

// ================================================================
//  MicroSD Card Logging Helper
// ================================================================
bool logToSdCard(const String& isoTime, float temp, float hum, float wind, float lux, const char* status) {
  if (!sdOk) return false;

  File f = SD.open(SD_LOG_FILE, FILE_WRITE);
  if (!f) {
    Serial.println(F("[SD] ✗ Gagal membuka file log di SD Card"));
    return false;
  }

  // Format: timestamp,temperature,humidity,wind_speed,light_lux,status
  f.printf("%s,%.1f,%.1f,%.1f,%.0f,%s\r\n",
           isoTime.c_str(), temp, hum, wind, lux, status);
  f.flush();
  f.close();
  Serial.printf("[SD] ✓ Data tercatat ke MicroSD (%s): %.1f°C, %.1f%%, %.1f km/h, %.0f lux [%s]\n",
                SD_LOG_FILE, temp, hum, wind, lux, status);
  return true;
}

// ================================================================
// ──────────── Deep Sleep RTC State ────────────
#if defined(ESP32)
  RTC_DATA_ATTR static int sleepCycleCount = 0;
#else
  static int sleepCycleCount = 0;
#endif

// ================================================================
//  DEEP SLEEP CYCLE (Optimized Low-Power Operation)
// ================================================================
void runDeepSleepCycle() {
  sleepCycleCount++;
  Serial.println();
  Serial.println(F("╔══════════════════════════════════════════════════╗"));
  Serial.printf("║  MODE DEEP SLEEP (LOW POWER) — Siklus #%-6d     ║\n", sleepCycleCount);
  Serial.println(F("╚══════════════════════════════════════════════════╝"));

#if defined(ESP32)
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER) {
    Serial.println(F("[DEEP-SLEEP] Bangun otomatis dari RTC Timer Wakeup ✓"));
  }
#endif

  Serial.printf("[DEEP-SLEEP] Mengukur sensor & putaran angin selama %d detik...\n",
                (int)(WIND_SAMPLE_DURATION_MS / 1000));

  unsigned long startSampleMs = millis();
  lastAnemoCalcMs = startSampleMs;
  lastAnemoCount = 0;
  noInterrupts();
  anemoPulseCount = 0;
  interrupts();

  float temp = 0.0f, hum = 0.0f;
  bool dhtOk = false;

  // Sampling period untuk menghitung putaran anemometer sambil membaca DHT22
  while (millis() - startSampleMs < WIND_SAMPLE_DURATION_MS) {
    if (!dhtOk) {
      dhtOk = readDhtSensor(temp, hum);
    }
    delay(50);
    yield();
  }

  // Baca sensor cahaya BH1750
  float lux = lightMeter.readLightLevel();
  if (lux < 0 || lux >= 54612.0f) lux = 0.0f;

  // Baca sensor INA226 Battery & Power Monitor
  float batVolts = 0.0f;
  int batPct = 0;
  if (inaOk) {
    float vbus = ina.getBusVoltage();
    if (!isnan(vbus) && vbus > 0.5f) {
      batVolts = vbus;
      bool isSolarCharging = (vbus >= 3.45f);
      batPct = calculateBatteryPercent(vbus, isSolarCharging);
    }
  }

  // Hitung kecepatan angin dari akumulasi pulsa interrupt
  unsigned long elapsedMs = millis() - startSampleMs;
  float elapsedSec = (elapsedMs > 0) ? (float)elapsedMs / 1000.0f : 1.0f;

  noInterrupts();
  uint32_t pulses = anemoPulseCount;
  interrupts();

  float rotasiPerDetik = (float)pulses / elapsedSec;
  float mPerSec = (-0.0181f * rotasiPerDetik * rotasiPerDetik) +
                  (1.3859f * rotasiPerDetik) + 1.4055f;
  if (mPerSec <= 1.5f) mPerSec = 0.0f;
  float windKmh = mPerSec * 3.6f;

  if (!dhtOk) {
    temp = 0.0f;
    hum = 0.0f;
  }

  Serial.printf("[DEEP-SLEEP] Hasil: Suhu=%.1f°C, Hum=%.1f%%, Angin=%.1f km/h, Lux=%.0f, Bat=%.2fV (%d%%)\n",
                temp, hum, windKmh, lux, batVolts, batPct);

  // Dapatkan timestamp dari RTC DS3231 terlebih dahulu
  String isoTime = getIso8601Timestamp();

  // 1. Catat ke MicroSD Card fisik sebelum menyalakan WiFi
  if (isoTime != "") {
    logToSdCard(isoTime, temp, hum, windKmh, lux, "DEEP_SLEEP");
  }

  // 2. Hubungkan WiFi & Kirim data ke Cloud
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    syncNtpTime();
    String ntpTime = getIso8601Timestamp();
    if (ntpTime != "") isoTime = ntpTime;

    bool sent = publishTelemetry(isoTime, temp, hum, windKmh, lux, batVolts, batPct);
    if (deviceConfig.protocol != BackendProtocol::HTTP_REST) {
      postToWebIngress(isoTime, temp, hum, windKmh, lux, batVolts, batPct);
    }
    processOfflineQueue();

    if (!sent && isoTime != "") {
      time_t now = time(nullptr);
      String filepath = "/q/" + String(now) + ".csv";
      String queueLine = isoTime + "," + String(temp, 1) + "," + String(hum, 1) + "," + String(windKmh, 1) + "," + String(lux, 0);
      File file = LittleFS.open(filepath, "w");
      if (file) {
        file.print(queueLine);
        file.close();
      }
    }
  } else {
    // Jika WiFi tidak tersedia di lokasi lapangan, simpan ke antrean LittleFS
    if (isoTime != "") {
      time_t now = time(nullptr);
      String filepath = "/q/" + String(now) + ".csv";
      String queueLine = isoTime + "," + String(temp, 1) + "," + String(hum, 1) + "," + String(windKmh, 1) + "," + String(lux, 0);
      File file = LittleFS.open(filepath, "w");
      if (file) {
        file.print(queueLine);
        file.close();
      }
    }
  }

  // 3. Matikan Radio WiFi & Masuk Deep Sleep (Ultra Low Power)
  Serial.printf("[DEEP-SLEEP] Selesai siklus #%d. Tidur selama %d detik (%d menit)...\n",
                sleepCycleCount, DEEP_SLEEP_SECONDS, DEEP_SLEEP_SECONDS / 60);
  Serial.flush();

  // Matikan modul WiFi untuk memangkas konsumsi daya ke level mikroampere (<20uA)
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

#if defined(ESP32)
  Serial.println(F("[DEEP-SLEEP] 💡 ESP32 timer wakeup dikonfigurasi. Memulai deep sleep (<20uA)..."));
  Serial.flush();
  esp_sleep_enable_timer_wakeup((uint64_t)DEEP_SLEEP_SECONDS * 1000000ULL);
  esp_deep_sleep_start();
#else
  Serial.println(F("[DEEP-SLEEP] 💡 Catatan: Hubungkan pin D0 (GPIO16) ke pin RST agar ESP8266 dapat bangun otomatis."));
  Serial.flush();
  ESP.deepSleep((uint64_t)DEEP_SLEEP_SECONDS * 1000000ULL, WAKE_RF_DEFAULT);
#endif
}
