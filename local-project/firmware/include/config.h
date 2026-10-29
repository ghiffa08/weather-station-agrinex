#ifndef CONFIG_H
#define CONFIG_H

// ==============================================================================
//  Agrinex Weather Station — ESP32 & INA226 Battery Real-time Configuration
//  Sesuai Skematik EasyEDA: ESP-WROOM-32 (V1.0)
// ==============================================================================

// ---------- WiFi Credentials ----------
#define WIFI_SSID         "WiFi 2"
#define WIFI_PASSWORD     "barcelona"

// ---------- Pin Definitions Berdasarkan Skematik EasyEDA ----------
#if defined(ESP32)
  // 1. Bus I2C: RTC DS3231, BH1750, & INA226 (Paralel dengan Pull-up R3 & R4 4.7k ke VCC)
  //   D21 = GPIO21 → SDA (Pin 20 ESP32)
  //   D22 = GPIO22 → SCL (Pin 17 ESP32)
  #define I2C_SDA           21  // GPIO21 (SDA)
  #define I2C_SCL           22  // GPIO22 (SCL)

  // 2. MicroSD Card: Jalur Hardware SPI & Chip Select (SD1)
  //   D5  = GPIO5  → CS (Pin 23 ESP32, dengan R2 10k pull-up)
  //   D18 = GPIO18 → SCK (Pin 22 ESP32)
  //   D19 = GPIO19 → MISO (Pin 21 ESP32)
  //   D23 = GPIO23 → MOSI (Pin 16 ESP32)
  #define SD_CS_PIN         5   // GPIO5 (CS)
  #define SPI_SCK_PIN       18  // GPIO18 (SCK)
  #define SPI_MISO_PIN      19  // GPIO19 (MISO)
  #define SPI_MOSI_PIN      23  // GPIO23 (MOSI)

  // 3. DHT22: Sensor Suhu & Kelembapan
  //   D4 = GPIO4 → DATA / OUT (Pin 26 ESP32)
  #define DHTPIN            4   // GPIO4 (D4)
  #define DHTTYPE           DHT22

  // 4. Anemometer: Sensor Kecepatan Angin (CN1)
  //   D27 = GPIO27 → PULSE (Pin 6 ESP32, dengan R1 4.7k pull-up)
  #define ANEMOMETER_PIN    27  // GPIO27

  // 5. Built-in LED ESP32
  #define LED_PIN           2   // GPIO2 (Onboard Blue LED)

#else
  // Fallback ESP8266 (NodeMCU)
  #define I2C_SDA           D2
  #define I2C_SCL           D1
  #define SD_CS_PIN         D8
  #define SPI_SCK_PIN       D5
  #define SPI_MISO_PIN      D6
  #define SPI_MOSI_PIN      D7
  #define DHTPIN            D4
  #define DHTTYPE           DHT22
  #define ANEMOMETER_PIN    D3
  #define LED_PIN           LED_BUILTIN
#endif

// ---------- Konfigurasi Sensor Arus & Tegangan Baterai INA226 ----------
// INA226 Module: I2C Address default 0x40 (A0=GND, A1=GND)
#define INA226_I2C_ADDR         0x40
// Nilai Shunt Resistor pada modul PCB (R100 = 0.1 Ohm)
#define INA226_SHUNT_OHM        0.1f   
// Maksimum Arus Ukur: 0.8A (karena max shunt voltage INA226 = 81.92mV / 0.1 Ohm = 0.819A)
#define INA226_MAX_AMPS         0.8f   

// ---------- Parameter Baterai 1S LiFePO4 (Nominal 3.2V, 30Ah) ----------
// Charger TP5000 diset mode LiFePO4 (Jumper F short/terhubung): Full = 3.60V
#define BATTERY_CHEMISTRY       "LiFePO4"
#define BATTERY_NOMINAL_VOLTS   3.2f   // Nominal 3.2V
#define BATTERY_VOLTS_EMPTY     2.60f  // 0% (Cut-off aman LiFePO4)
#define BATTERY_VOLTS_FULL      3.60f  // 100% (TP5000 LiFePO4 mode float / full)
#define BATTERY_CAPACITY_AH     30.0f  // Kapasitas 30 Ah (30.000 mAh, 96 Wh)

// ---------- Catu Daya & Power Routing (EasyEDA) ----------
// - Pengisian Daya  : Modul TP5000 Type-C (U6) ke Baterai (B+, B-)
// - Monitoring      : INA226 terhubung pada jalur Baterai (IN+, IN-, VBS)
// - Boost Regulator : TPS61088 (U2) menaikkan tegangan baterai ke +5V
// - Input ESP32     : +5V masuk ke pin VIN ESP32 (Pin 1)
// - Sensor VCC      : Menggunakan tegangan 3.3V dari pin 3V3 ESP32 (Pin 30)

// ---------- Timing Intervals ----------
#define SENSOR_READ_INTERVAL_MS 1000   // Baca sensor & baterai setiap 1 detik
#define SSE_PUSH_INTERVAL_MS    1000   // Stream data SSE ke Web setiap 1 detik
#define ANEMOMETER_DEBOUNCE_US  5000   // 5ms debounce

#endif // CONFIG_H
