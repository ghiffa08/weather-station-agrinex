// ==============================================================================
//  Agrinex Weather Station — ESP32 Real-time Firmware with INA226 Battery Monitor
//  Platform: ESP32 (ESP-WROOM-32)
//  Schematic: EasyEDA ESP32 Weather Station (V1.0)
//  Features: INA226 (Battery & Power), DHT22, BH1750, Anemometer, RTC DS3231, SD Card
//  Protocol: HTTP SSE Stream & REST API JSON
// ==============================================================================

#include <Arduino.h>

#if defined(ESP32)
  #include <WiFi.h>
  #include <WebServer.h>
  typedef WebServer WebServerType;
#else
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
  typedef ESP8266WebServer WebServerType;
#endif

#include <Wire.h>
#include <DHT.h>
#include <BH1750.h>
#include <RTClib.h>
#include <INA226.h>
#include <SPI.h>
#include <SD.h>
#include <ArduinoJson.h>
#include <time.h>
#include "config.h"

// ──────────── Global Objects & Variables ────────────
DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;
RTC_DS3231 rtc;
INA226 ina(INA226_I2C_ADDR);
WebServerType server(80);

// Hardware status flags
bool rtcInitialized = false;
bool sdInitialized  = false;
bool inaInitialized = false;

// Anemometer ISR Variables
volatile uint32_t anemoPulseCount = 0;
volatile unsigned long anemoLastPulseUs = 0;

// Sensor & Battery Readings Struct
struct SensorData {
  float temperature;
  float humidity;
  float lightLux;
  float windSpeed;
  uint32_t rawPulses;
  
  // INA226 Battery Data
  float batteryVoltage;    // Volt (V)
  float batteryCurrent;    // mA (Positif = Mengisi / Charger, Negatif = Penggunaan)
  float batteryPower;      // mW
  float batteryShuntMv;    // mV
  int   batteryPercentage; // 0 - 100 %
  bool  isCharging;        // true jika arus pengisian terdeteksi

  // Diagnostics Flags
  bool dhtOk;
  bool bh1750Ok;
  bool anemometerOk;
  bool rtcOk;
  bool sdOk;
  bool inaOk;

  char rtcTimeStr[32];
  unsigned long timestampMs;
};

SensorData currentData = {
  0.0f, 0.0f, 0.0f, 0.0f, 0,
  0.0f, 0.0f, 0.0f, 0.0f, 0, false,
  false, false, false, false, false, false,
  "", 0
};

// Scheduler Timestamps
unsigned long lastSensorReadMs = 0;
unsigned long lastSsePushMs    = 0;
unsigned long lastAnemoCalcMs  = 0;
uint32_t      lastAnemoCount   = 0;

// SSE Client Active Flag
bool sseActive = false;

// Forward Declarations
#if defined(ESP32)
void IRAM_ATTR anemoIsr();
#else
IRAM_ATTR void anemoIsr();
#endif
void connectWiFi();
void initSensors();
void readSensors();
int calculateBatteryPercent(float volts);
void handleRoot();
void handleApiSensors();
void handleApiPing();
void handleApiDiagnostics();
void handleApiRtcSync();
bool syncRtcWithNtp();
void handleSseEvents();
void handleCorsOptions();
void broadcastSseData();
String buildJsonPayload();
void logDataToSd();

// ================================================================
//  SETUP
// ================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("╔════════════════════════════════════════════════════════╗"));
  Serial.println(F("║  Agrinex Weather Station — ESP32 & INA226 Real-time    ║"));
  Serial.println(F("║  Battery Monitoring & Sensor Test Firmware             ║"));
  Serial.println(F("╚════════════════════════════════════════════════════════╝"));
  Serial.println();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // OFF / Idle

  // 1. Connect WiFi
  connectWiFi();

  // 2. Inisialisasi Sensor & Modul Hardware (termasuk INA226)
  initSensors();

  // 3. Setup Web Server Endpoints
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/sensors", HTTP_GET, handleApiSensors);
  server.on("/api/sensors", HTTP_OPTIONS, handleCorsOptions);
  server.on("/api/ping", HTTP_GET, handleApiPing);
  server.on("/api/diagnostics", HTTP_GET, handleApiDiagnostics);
  server.on("/api/diagnostics", HTTP_OPTIONS, handleCorsOptions);
  server.on("/api/rtc/sync", HTTP_GET, handleApiRtcSync);
  server.on("/api/rtc/sync", HTTP_POST, handleApiRtcSync);
  server.on("/api/rtc/sync", HTTP_OPTIONS, handleCorsOptions);
  server.on("/events", HTTP_GET, handleSseEvents);
  server.on("/events", HTTP_OPTIONS, handleCorsOptions);

  server.onNotFound([]() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(404, "application/json", "{\"error\":\"Not Found\"}");
  });

  server.begin();
  Serial.println(F("[HTTP] Web Server started on port 80"));
  Serial.printf("[HTTP] SSE Endpoint       : http://%s/events\n", WiFi.localIP().toString().c_str());
  Serial.printf("[HTTP] REST Endpoint      : http://%s/api/sensors\n", WiFi.localIP().toString().c_str());
  Serial.printf("[HTTP] Diagnostics Check  : http://%s/api/diagnostics\n\n", WiFi.localIP().toString().c_str());

  // Sinkronkan waktu RTC ke WIB via NTP saat setup jika WiFi sudah terhubung
  if (WiFi.status() == WL_CONNECTED) {
    syncRtcWithNtp();
  }

  lastSensorReadMs = millis();
  lastAnemoCalcMs  = millis();
}

// ================================================================
//  LOOP — Non-blocking Cooperative Execution
// ================================================================
void loop() {
  server.handleClient();

  unsigned long now = millis();

  // Task 1: Read Sensors & Battery Every 1 Second
  if (now - lastSensorReadMs >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadMs = now;
    readSensors();
  }

  // Task 2: Push SSE Stream if client connected
  if (sseActive) {
    if (server.client().connected()) {
      if (now - lastSsePushMs >= SSE_PUSH_INTERVAL_MS) {
        lastSsePushMs = now;
        broadcastSseData();
      }
    } else {
      sseActive = false;
      Serial.println(F("[SSE] Client disconnected"));
    }
  }

  yield();
}

// ================================================================
//  ISR: Anemometer Pulse Counter
// ================================================================
#if defined(ESP32)
void IRAM_ATTR anemoIsr() {
#else
IRAM_ATTR void anemoIsr() {
#endif
  unsigned long now = micros();
  if (now - anemoLastPulseUs >= ANEMOMETER_DEBOUNCE_US) {
    anemoPulseCount++;
    anemoLastPulseUs = now;
  }
}

// ================================================================
// ================================================================
//  Estimasi Persentase Baterai LiFePO4 1S (3.2V 30Ah)
//  Algoritma Smartphone Fuel Gauge: Kompensasi Tegangan Float TP5000
// ================================================================
static float smoothedBatteryPct = -1.0f; // Cache State-of-Charge persisten

int calculateBatteryPercent(float volts, bool isCharging) {
  if (volts <= 2.60f) return 0;

  // Jika solar panel / charger TP5000 aktif, tegangan terminal naik semu ke 3.55V - 3.65V.
  // Kompensasikan delta tegangan charging (~0.40V) agar persentase tidak melompat semu ke 99%.
  float effectiveOcv = volts;
  if (isCharging && volts >= 3.40f) {
    effectiveOcv = max(2.60f, volts - 0.40f);
  }

  int targetPct = 0;
  if (effectiveOcv >= 3.42f) {
    targetPct = 100;
  } else if (effectiveOcv >= 3.36f) {
    targetPct = 95 + (int)((effectiveOcv - 3.36f) / (3.42f - 3.36f) * 5.0f);
  } else if (effectiveOcv >= 3.33f) {
    targetPct = 80 + (int)((effectiveOcv - 3.33f) / (3.36f - 3.33f) * 15.0f);
  } else if (effectiveOcv >= 3.30f) {
    targetPct = 60 + (int)((effectiveOcv - 3.30f) / (3.33f - 3.30f) * 20.0f);
  } else if (effectiveOcv >= 3.28f) {
    targetPct = 40 + (int)((effectiveOcv - 3.28f) / (3.30f - 3.28f) * 20.0f);
  } else if (effectiveOcv >= 3.25f) {
    targetPct = 25 + (int)((effectiveOcv - 3.25f) / (3.28f - 3.25f) * 15.0f);
  } else if (effectiveOcv >= 3.20f) {
    targetPct = 15 + (int)((effectiveOcv - 3.20f) / (3.25f - 3.20f) * 10.0f);
  } else if (effectiveOcv >= 3.10f) {
    // 3.10V - 3.20V: Kapasitas 7% - 15% (3.12V ~ 9%)
    targetPct = 7 + (int)((effectiveOcv - 3.10f) / (3.20f - 3.10f) * 8.0f);
  } else if (effectiveOcv >= 2.90f) {
    targetPct = 2 + (int)((effectiveOcv - 2.90f) / (3.10f - 2.90f) * 5.0f);
  } else {
    targetPct = (int)((effectiveOcv - 2.60f) / (2.90f - 2.60f) * 2.0f);
  }

  targetPct = constrain(targetPct, 0, 100);

  // Inisialisasi awal saat pertama kali terbaca
  if (smoothedBatteryPct < 0.0f) {
    smoothedBatteryPct = (float)targetPct;
    return targetPct;
  }

  // Rate Limiting halus seperti HP: persentase tidak boleh melompat drastis
  if (isCharging) {
    if (targetPct > smoothedBatteryPct) {
      smoothedBatteryPct += 0.05f; // Naik bertahap selama charging
    } else {
      smoothedBatteryPct = max(smoothedBatteryPct, (float)targetPct);
    }
  } else {
    float diff = (float)targetPct - smoothedBatteryPct;
    smoothedBatteryPct += diff * 0.1f; // Transisi halus saat discharging
  }

  smoothedBatteryPct = constrain(smoothedBatteryPct, 0.0f, 100.0f);
  return (int)round(smoothedBatteryPct);
}

// ================================================================
//  Hardware Sensor & Module Initialization
// ================================================================
void initSensors() {
  // --- Inisialisasi Bus I2C (ESP32: D21 SDA, D22 SCL) ---
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  delay(200); // Waktu stabilisasi sirkuit daya & pull-up I2C slave

  Serial.println(F("[I2C] Scanning I2C bus (SDA: D21, SCL: D22)..."));
  bool foundBh1750 = false;
  bool foundRtc    = false;
  bool foundIna    = false;
  byte bhAddr      = 0x23;
  byte inaAddr     = INA226_I2C_ADDR;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.printf("[I2C] ✓ Device terdeteksi pada 0x%02X", address);
      if (address == 0x23 || address == 0x5C) {
        Serial.println(F(" (BH1750 Light Sensor)"));
        foundBh1750 = true;
        bhAddr = address;
      } else if (address == 0x68) {
        Serial.println(F(" (DS3231 Real-Time Clock)"));
        foundRtc = true;
      } else if (address >= 0x40 && address <= 0x45) {
        Serial.println(F(" (INA226 Battery & Power Monitor)"));
        foundIna = true;
        inaAddr = address;
      } else {
        Serial.println();
      }
    }
  }

  // --- 1. INA226 Battery & Power Monitor ---
  if (foundIna || true) {
    ina = INA226(inaAddr);
    if (ina.begin()) {
      inaInitialized = true;
      currentData.inaOk = true;
      // Konfigurasi Shunt Resistor (0.1 Ohm) & Maksimal Arus (0.8 A)
      int calErr = ina.setMaxCurrentShunt(INA226_MAX_AMPS, INA226_SHUNT_OHM);
      Serial.printf("[INIT] INA226 Battery Monitor: OK (I2C 0x%02X, Shunt: %.2f Ohm, CalStatus: 0x%04X)\n", inaAddr, INA226_SHUNT_OHM, calErr);
    } else {
      inaInitialized = false;
      currentData.inaOk = false;
      Serial.printf("[INIT] INA226 Battery Monitor: FAIL (Tidak merespon pada 0x%02X)\n", inaAddr);
    }
  }

  // --- 2. BH1750 Ambient Light Sensor ---
  bool bh1750Ok = false;
  if (foundBh1750) {
    bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, bhAddr);
  } else {
    bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23);
  }
  currentData.bh1750Ok = bh1750Ok;
  Serial.printf("[INIT] BH1750 Light Sensor: %s\n", bh1750Ok ? "OK (I2C)" : "OFFLINE / TESTING (Periksa kabel)");

  // --- 3. RTC DS3231 ---
  if (rtc.begin()) {
    rtcInitialized = true;
    currentData.rtcOk = true;
    if (rtc.lostPower()) {
      Serial.println(F("[INIT] RTC DS3231 lost power! Setting compile time..."));
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    DateTime now = rtc.now();
    snprintf(currentData.rtcTimeStr, sizeof(currentData.rtcTimeStr),
             "%04d-%02d-%02d %02d:%02d:%02d",
             now.year(), now.month(), now.day(),
             now.hour(), now.minute(), now.second());
    Serial.printf("[INIT] RTC DS3231: OK (%s)\n", currentData.rtcTimeStr);
  } else {
    rtcInitialized = false;
    currentData.rtcOk = false;
    strcpy(currentData.rtcTimeStr, "--:--:--");
    Serial.println(F("[INIT] RTC DS3231: OFFLINE / TESTING (0x68)"));
  }

  // --- 4. MicroSD Card SPI (CS: D5) ---
  pinMode(SD_CS_PIN, OUTPUT);
  digitalWrite(SD_CS_PIN, HIGH);
  #if defined(ESP32)
  SPI.begin(SPI_SCK_PIN, SPI_MISO_PIN, SPI_MOSI_PIN, SD_CS_PIN);
  #endif
  if (SD.begin(SD_CS_PIN)) {
    sdInitialized = true;
    currentData.sdOk = true;
    Serial.println(F("[INIT] MicroSD Card: OK (SPI CS: D5)"));
    
    // Header jika file log baru
    if (!SD.exists("/datalog.csv")) {
      File f = SD.open("/datalog.csv", FILE_WRITE);
      if (f) {
        f.println(F("Timestamp,Temperature_C,Humidity_Pct,WindSpeed_kmh,Light_lux,Battery_V,Battery_mA,Battery_Pct"));
        f.close();
      }
    }
  } else {
    sdInitialized = false;
    currentData.sdOk = false;
    Serial.println(F("[INIT] MicroSD Card: OFFLINE / TESTING (Periksa kartu SD & pin D5)"));
  }

  // --- 5. DHT22 Suhu & Kelembapan ---
  dht.begin();
  Serial.println(F("[INIT] DHT22 Temp & Humidity Sensor: Started (D4)"));

  // --- 6. Anemometer Interrupt ---
  pinMode(ANEMOMETER_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), anemoIsr, RISING);
  currentData.anemometerOk = true;
  Serial.println(F("[INIT] Anemometer Pulse Counter: Attached (D27)"));
}

// ================================================================
//  Sensor & Battery Reading Logic
// ================================================================
void readSensors() {
  // --- 1. INA226 Battery & Power Reading (dengan Auto-Reconnect) ---
  if (!inaInitialized) {
    Wire.beginTransmission(INA226_I2C_ADDR);
    if (Wire.endTransmission() == 0) {
      ina = INA226(INA226_I2C_ADDR);
      if (ina.begin()) {
        inaInitialized = true;
        ina.setMaxCurrentShunt(INA226_MAX_AMPS, INA226_SHUNT_OHM);
        Serial.println(F("[I2C] ✓ INA226 Battery Monitor auto-connected & calibrated!"));
      }
    }
  }

  if (inaInitialized) {
    float vbus = ina.getBusVoltage();          // Tegangan Bus Baterai (V)
    float shuntMv = ina.getShuntVoltage_mV();    // Drop Tegangan Shunt (mV)
    float current = 0.0f;

    // Baca dari register internal INA226 jika terkalibrasi
    if (ina.isCalibrated()) {
      current = ina.getCurrent_mA();
    }
    // Fallback presisi hardware: I (mA) = Vshunt (mV) / Rshunt (Ohm)
    if (abs(current) < 0.1f && abs(shuntMv) > 0.005f) {
      current = shuntMv / INA226_SHUNT_OHM;
    }

    float power = abs(vbus * current);

    // Validasi pembacaan (baterai terhubung jika vbus > 0.5V)
    if (!isnan(vbus) && vbus > 0.5f && vbus <= 36.0f) {
      // Deteksi pengisian solar: TP5000 LiFePO4 mode float/absorpsi menghasilkan >= 3.45V
      bool isSolarCharging = (vbus >= 3.45f);

      currentData.batteryVoltage    = vbus;
      currentData.batteryCurrent    = current;
      currentData.batteryPower      = power;
      currentData.batteryShuntMv    = shuntMv;
      currentData.isCharging        = isSolarCharging;
      currentData.batteryPercentage = calculateBatteryPercent(vbus, isSolarCharging);
      currentData.inaOk             = true;
    } else {
      currentData.batteryVoltage    = 0.0f;
      currentData.batteryCurrent    = 0.0f;
      currentData.batteryPower      = 0.0f;
      currentData.batteryPercentage = 0;
      currentData.inaOk             = false;
    }
  } else {
    currentData.batteryVoltage    = 0.0f;
    currentData.batteryCurrent    = 0.0f;
    currentData.batteryPower      = 0.0f;
    currentData.batteryPercentage = 0;
    currentData.inaOk             = false;
  }

  // --- 2. DHT22 Read ---
  static unsigned long lastDhtSampleMs = 0;
  if (millis() - lastDhtSampleMs >= 2000 || lastDhtSampleMs == 0) {
    lastDhtSampleMs = millis();
    float temp = dht.readTemperature(false, true);
    float hum  = dht.readHumidity(true);
    bool dhtValid = (!isnan(temp) && !isnan(hum) && temp > -40.0f && temp < 85.0f && hum >= 0.0f && hum <= 100.0f);

    if (dhtValid) {
      currentData.temperature = temp;
      currentData.humidity    = hum;
      currentData.dhtOk       = true;
    } else {
      currentData.dhtOk       = false;
    }
  }

  // --- 3. BH1750 Read ---
  if (currentData.bh1750Ok) {
    float lux = lightMeter.readLightLevel();
    if (lux >= 0.0f && lux < 120000.0f) {
      currentData.lightLux = lux;
    }
  }

  // --- 4. RTC DS3231 Read ---
  if (rtcInitialized) {
    DateTime now = rtc.now();
    if (now.year() >= 2024 && now.year() <= 2040) {
      currentData.rtcOk = true;
      snprintf(currentData.rtcTimeStr, sizeof(currentData.rtcTimeStr),
               "%04d-%02d-%02d %02d:%02d:%02d",
               now.year(), now.month(), now.day(),
               now.hour(), now.minute(), now.second());
    }
  }

  // --- 5. Anemometer Velocity Calculation ---
  unsigned long nowMs = millis();
  unsigned long deltaMs = nowMs - lastAnemoCalcMs;
  if (deltaMs == 0) deltaMs = 1;

  noInterrupts();
  uint32_t currentPulses = anemoPulseCount;
  interrupts();

  uint32_t diffPulses = (currentPulses >= lastAnemoCount) ?
                         (currentPulses - lastAnemoCount) : currentPulses;

  float pulsesPerSec = (float)diffPulses / ((float)deltaMs / 1000.0f);
  float mPerSec = 0.0f;
  if (pulsesPerSec > 0.0f) {
    mPerSec = (pulsesPerSec * 0.0875f) + 0.1f;
  }
  float windKmh = mPerSec * 3.6f;

  currentData.windSpeed   = windKmh;
  currentData.rawPulses   = currentPulses;
  currentData.timestampMs = nowMs;

  lastAnemoCount  = currentPulses;
  lastAnemoCalcMs = nowMs;

  // Blink LED indicator on sensor read
  digitalWrite(LED_PIN, HIGH);
  delay(15);
  digitalWrite(LED_PIN, LOW);

  // Serial Monitor Log Output
  Serial.printf("[SENSOR] BAT: %.2fV (%d%%) | I: %.1fmA | P: %.1fmW | T: %.1fC | H: %.1f%% | Lux: %.0f | Wind: %.1f km/h | INA: %s\n",
                currentData.batteryVoltage, currentData.batteryPercentage,
                currentData.batteryCurrent, currentData.batteryPower,
                currentData.temperature, currentData.humidity, currentData.lightLux,
                currentData.windSpeed,
                currentData.inaOk ? "OK" : "NO");
}

// ================================================================
//  HTTP Handlers & Endpoints
// ================================================================
void handleCorsOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void handleRoot() {
  String html = F("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Agrinex ESP32 Sensor & Battery Test</title>"
                  "<style>body{font-family:sans-serif;background:#e6e9ef;color:#1f2937;padding:2rem;text-align:center;}"
                  ".card{background:#e6e9ef;padding:1.5rem;margin:1rem auto;max-width:550px;border-radius:24px;box-shadow:8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff;}"
                  "h1{color:#111827;}a{color:#2563eb;text-decoration:none;font-weight:bold;}.badge{padding:4px 8px;border-radius:8px;font-size:12px;background:#d1d5db;}</style></head><body>"
                  "<h1>🌱 Agrinex ESP32 & INA226 Tester</h1>"
                  "<div class='card'>"
                  "<h3>Node Status & Endpoints</h3>"
                  "<p>IP Address: <b>");
  html += WiFi.localIP().toString();
  html += F("</b></p><hr style='border:0;border-top:1px solid #d1d5db;margin:1rem 0;'>"
            "<p>📡 SSE Stream: <a href='/events'>/events</a></p>"
            "<p>⚡ REST JSON API: <a href='/api/sensors'>/api/sensors</a></p>"
            "<p>🔍 Hardware Diagnostics: <a href='/api/diagnostics'>/api/diagnostics</a></p>"
            "<p>⏱️ Ping Test: <a href='/api/ping'>/api/ping</a></p>"
            "</div></body></html>");

  server.send(200, "text/html", html);
}

String buildJsonPayload() {
  JsonDocument doc;
  doc["timestamp_ms"]  = currentData.timestampMs;

  if (currentData.dhtOk) {
    doc["temperature"] = (double)((int)(currentData.temperature * 10)) / 10.0;
    doc["humidity"]    = (double)((int)(currentData.humidity * 10)) / 10.0;
  } else {
    doc["temperature"] = nullptr;
    doc["humidity"]    = nullptr;
  }

  if (currentData.bh1750Ok) {
    doc["light_lux"]   = (int)currentData.lightLux;
  } else {
    doc["light_lux"]   = nullptr;
  }

  if (currentData.anemometerOk && currentData.rawPulses > 0) {
    doc["wind_speed"]  = (double)((int)(currentData.windSpeed * 10)) / 10.0;
  } else {
    doc["wind_speed"]  = nullptr;
  }
  doc["raw_pulses"]    = currentData.rawPulses;
  doc["wifi_rssi"]     = WiFi.RSSI();
  #if defined(ESP32)
  doc["free_heap"]     = ESP.getFreeHeap();
  #else
  doc["free_heap"]     = ESP.getFreeHeap();
  #endif
  doc["uptime_sec"]    = millis() / 1000;
  doc["rtc_time"]      = currentData.rtcOk ? currentData.rtcTimeStr : "";

  // Battery Top-level fields
  doc["battery_voltage"]    = (double)((int)(currentData.batteryVoltage * 100)) / 100.0;
  doc["battery_current"]    = (double)((int)(currentData.batteryCurrent * 10)) / 10.0;
  doc["battery_power"]      = (double)((int)(currentData.batteryPower * 10)) / 10.0;
  doc["battery_percentage"] = currentData.batteryPercentage;

  // Battery Detailed Object
  JsonObject bat = doc["battery"].to<JsonObject>();
  bat["voltage"]    = (double)((int)(currentData.batteryVoltage * 100)) / 100.0;
  bat["current_ma"] = (double)((int)(currentData.batteryCurrent * 10)) / 10.0;
  bat["power_mw"]   = (double)((int)(currentData.batteryPower * 10)) / 10.0;
  bat["shunt_mv"]   = (double)((int)(currentData.batteryShuntMv * 100)) / 100.0;
  bat["percentage"] = currentData.batteryPercentage;
  bat["charging"]   = currentData.isCharging;
  bat["ok"]         = currentData.inaOk;
  bat["chemistry"]  = BATTERY_CHEMISTRY;
  bat["capacity_ah"] = BATTERY_CAPACITY_AH;

  // Hardware Status
  JsonObject status = doc["status"].to<JsonObject>();
  status["ina226"]     = currentData.inaOk;
  status["dht22"]      = currentData.dhtOk;
  status["bh1750"]     = currentData.bh1750Ok;
  status["anemometer"] = currentData.anemometerOk;
  status["rtc_ds3231"] = currentData.rtcOk;
  status["sd_card"]    = currentData.sdOk;

  String json;
  serializeJson(doc, json);
  return json;
}

void handleApiSensors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache");
  server.sendHeader("Connection", "close");
  server.send(200, "application/json", buildJsonPayload());
}

void handleApiPing() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache");
  server.sendHeader("Connection", "close");
  server.send(200, "application/json", "{\"pong\":true,\"time\":" + String(millis()) + "}");
}

// Full Hardware Self-Test / Diagnostics Endpoint
void handleApiDiagnostics() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache");
  server.sendHeader("Connection", "close");

  // Re-verify I2C devices
  Wire.beginTransmission(INA226_I2C_ADDR);
  bool inaFound = (Wire.endTransmission() == 0);

  Wire.beginTransmission(0x23);
  bool bhFound = (Wire.endTransmission() == 0);
  if (!bhFound) {
    Wire.beginTransmission(0x5C);
    bhFound = (Wire.endTransmission() == 0);
  }

  Wire.beginTransmission(0x68);
  bool rtcFound = (Wire.endTransmission() == 0);

  // Test SD Card Write
  bool sdWriteOk = false;
  if (sdInitialized) {
    File f = SD.open("/diag.txt", FILE_WRITE);
    if (f) {
      f.println("DIAG_OK");
      f.close();
      sdWriteOk = true;
      SD.remove("/diag.txt");
    }
  }

  JsonDocument doc;
  doc["timestamp_ms"] = millis();
  doc["all_ok"]       = (inaFound && currentData.dhtOk && bhFound && rtcFound && sdInitialized);

  JsonObject modules = doc["modules"].to<JsonObject>();

  // INA226 Battery Monitor
  JsonObject inaObj = modules["ina226"].to<JsonObject>();
  inaObj["name"]        = "INA226 Battery & Power Monitor";
  inaObj["bus"]         = "I2C (D21 SDA, D22 SCL)";
  inaObj["address"]     = "0x40";
  inaObj["connected"]   = inaFound;
  inaObj["voltage"]     = (double)((int)(currentData.batteryVoltage * 100)) / 100.0;
  inaObj["current_ma"]  = (double)((int)(currentData.batteryCurrent * 10)) / 10.0;
  inaObj["power_mw"]    = (double)((int)(currentData.batteryPower * 10)) / 10.0;
  inaObj["percentage"]  = currentData.batteryPercentage;
  inaObj["charging"]    = currentData.isCharging;
  inaObj["message"]     = inaFound ? 
    ("Normal (Tegangan: " + String(currentData.batteryVoltage, 2) + "V, " + String(currentData.batteryPercentage) + "%)") :
    "Sensor INA226 tidak merespon di I2C 0x40. Periksa D21 (SDA), D22 (SCL), VCC 3.3V & GND.";

  // DHT22
  JsonObject dhtObj = modules["dht22"].to<JsonObject>();
  dhtObj["name"]        = "DHT22 Suhu & Kelembapan";
  dhtObj["pin"]         = "D4 (GPIO4)";
  dhtObj["connected"]   = currentData.dhtOk;
  dhtObj["temperature"] = currentData.temperature;
  dhtObj["humidity"]    = currentData.humidity;
  dhtObj["message"]     = currentData.dhtOk ? "Normal" : "Sensor DHT22 belum terhubung / dalam tahap testing.";

  // BH1750
  JsonObject bhObj = modules["bh1750"].to<JsonObject>();
  bhObj["name"]      = "BH1750 Intensitas Cahaya";
  bhObj["bus"]       = "I2C (D21 SDA, D22 SCL)";
  bhObj["address"]   = bhFound ? "0x23 / 0x5C" : "Not Found";
  bhObj["connected"] = bhFound;
  bhObj["light_lux"] = currentData.lightLux;
  bhObj["message"]   = bhFound ? "Normal" : "Sensor BH1750 belum terhubung / dalam tahap testing.";

  // RTC DS3231
  JsonObject rtcObj = modules["rtc_ds3231"].to<JsonObject>();
  rtcObj["name"]      = "RTC DS3231 Real-Time Clock";
  rtcObj["bus"]       = "I2C (0x68)";
  rtcObj["connected"] = rtcFound;
  rtcObj["datetime"]  = currentData.rtcOk ? currentData.rtcTimeStr : "Unset / Offline";
  rtcObj["message"]   = rtcFound ? "Normal" : "Modul RTC DS3231 belum terpasang / dalam tahap testing.";

  // MicroSD
  JsonObject sdObj = modules["sd_card"].to<JsonObject>();
  sdObj["name"]      = "MicroSD Card Module";
  sdObj["bus"]       = "SPI (D18 SCK, D19 MISO, D23 MOSI, D5 CS)";
  sdObj["connected"] = sdInitialized;
  sdObj["write_ok"]  = sdWriteOk;
  sdObj["message"]   = sdInitialized ? (sdWriteOk ? "Normal (Read/Write OK)" : "Card mounted, Write failed") 
                                     : "MicroSD Card belum terpasang / dalam tahap testing.";

  // Anemometer
  JsonObject anemoObj = modules["anemometer"].to<JsonObject>();
  anemoObj["name"]       = "Zhafira Anemometer v1.3";
  anemoObj["pin"]        = "D27 (GPIO27 Interrupt)";
  anemoObj["connected"]  = true;
  anemoObj["pulses"]     = currentData.rawPulses;
  anemoObj["wind_speed"] = currentData.windSpeed;
  anemoObj["message"]    = "Interrupt aktif pada D27.";

  // System
  JsonObject sysObj = doc["system"].to<JsonObject>();
  sysObj["ip"]          = WiFi.localIP().toString();
  sysObj["ssid"]        = WiFi.SSID();
  sysObj["rssi"]        = WiFi.RSSI();
  #if defined(ESP32)
  sysObj["free_heap"]   = ESP.getFreeHeap();
  #else
  sysObj["free_heap"]   = ESP.getFreeHeap();
  #endif
  sysObj["uptime_sec"]  = millis() / 1000;

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

// Persistent SSE Stream Handler
void handleSseEvents() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "text/event-stream");
  server.sendHeader("Cache-Control", "no-cache");
  server.sendHeader("Connection", "keep-alive");
  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "text/event-stream", "");

  sseActive = true;
  Serial.println(F("[SSE] New EventSource client connected!"));

  broadcastSseData();
}

void broadcastSseData() {
  if (!sseActive || !server.client().connected()) return;

  String json = buildJsonPayload();
  String message = "event: message\ndata: " + json + "\n\n";

  server.sendContent(message);
}

// ================================================================
//  WiFi Connection Manager
// ================================================================
void connectWiFi() {
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WIFI] Connected! Local IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());

    // Konfigurasi NTP Timezone WIB (UTC+7 Jam = 7 * 3600 detik = 25200 detik)
    configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com", "id.pool.ntp.org");
    Serial.println(F("[NTP] Memulai sinkronisasi waktu Internet (WIB / GMT+7)..."));
  } else {
    Serial.println();
    Serial.println(F("[WIFI] Failed to connect to WiFi! Retrying in background..."));
  }
}

// Sinkronkan RTC DS3231 ke waktu WIB via NTP
bool syncRtcWithNtp() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 2000)) {
    if (timeinfo.tm_year + 1900 >= 2024) {
      rtc.adjust(DateTime(timeinfo.tm_year + 1900,
                          timeinfo.tm_mon + 1,
                          timeinfo.tm_mday,
                          timeinfo.tm_hour,
                          timeinfo.tm_min,
                          timeinfo.tm_sec));
      DateTime now = rtc.now();
      snprintf(currentData.rtcTimeStr, sizeof(currentData.rtcTimeStr),
               "%04d-%02d-%02d %02d:%02d:%02d",
               now.year(), now.month(), now.day(),
               now.hour(), now.minute(), now.second());
      currentData.rtcOk = true;
      Serial.printf("[NTP] ✓ RTC DS3231 berhasil disinkronkan ke WIB: %s\n", currentData.rtcTimeStr);
      return true;
    }
  }
  return false;
}

// Handler API sinkronisasi waktu RTC (dari browser atau NTP)
void handleApiRtcSync() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  bool synced = false;
  if (server.hasArg("epoch")) {
    time_t epoch = (time_t)server.arg("epoch").toInt();
    if (epoch > 1700000000) {
      // Offset dalam detik: default +7 jam (25200 detik) untuk WIB
      long offsetSec = server.hasArg("offset") ? (server.arg("offset").toInt() * -60) : (7 * 3600);
      time_t localEpoch = epoch + offsetSec;
      rtc.adjust(DateTime(localEpoch));
      synced = true;
    }
  }

  if (!synced) {
    synced = syncRtcWithNtp();
  }

  if (rtcInitialized || rtc.begin()) {
    DateTime now = rtc.now();
    snprintf(currentData.rtcTimeStr, sizeof(currentData.rtcTimeStr),
             "%04d-%02d-%02d %02d:%02d:%02d",
             now.year(), now.month(), now.day(),
             now.hour(), now.minute(), now.second());
    currentData.rtcOk = true;
  }

  String res = "{\"success\":" + String(synced ? "true" : "false") + ",\"rtc_time\":\"" + String(currentData.rtcTimeStr) + "\"}";
  server.send(200, "application/json", res);
}
