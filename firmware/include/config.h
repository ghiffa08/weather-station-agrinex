#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
//  Agrinex Weather Station — Configuration (ESP32 & ESP8266)
//  Sesuai Skematik EasyEDA ESP32 & NodeMCU v2
// ============================================================

// ---------- WiFi & Private Credentials ----------
#if __has_include("config.private.h")
  #include "config.private.h"
#else
  #define WIFI_SSID         "WiFi 2"
  #define WIFI_PASSWORD     "barcelona"
#endif

// ---------- Firebase Firestore ----------
#define FIREBASE_PROJECT_ID "agrinex-f5ef8"

// ---------- NTP ----------
#define NTP_SERVER        "pool.ntp.org"
#define NTP_GMT_OFFSET    25200       // WIB = UTC+7 = 7*3600
#define NTP_DAYLIGHT      0

// ---------- Pin Definitions Berdasarkan Arsitektur Chip ----------
#if defined(ESP32)
  // 1. Bus I2C: RTC DS3231, BH1750, & INA226 (ESP32 Hardware Wire)
  #define I2C_SDA           21  // GPIO21 (SDA)
  #define I2C_SCL           22  // GPIO22 (SCL)

  // 2. MicroSD Card: Hardware VSPI Bus
  #define SD_CS_PIN         5   // GPIO5 (CS)
  #define SPI_SCK_PIN       18  // GPIO18 (SCK)
  #define SPI_MISO_PIN      19  // GPIO19 (MISO)
  #define SPI_MOSI_PIN      23  // GPIO23 (MOSI)

  // 3. DHT22: Sensor Suhu & Kelembapan
  #define DHTPIN            4   // GPIO4 (D4 EasyEDA Pin 26)
  #define DHTTYPE           DHT22

  // 4. Anemometer: Sensor Kecepatan Angin (Interrupt)
  #define ANEMOMETER_PIN    27  // GPIO27 (CN1 EasyEDA)

  // 5. Onboard LED ESP32
  #define LED_PIN           2   // GPIO2 (Onboard Blue LED)

#else
  // Fallback NodeMCU v2 (ESP8266)
  #define I2C_SDA           D2  // GPIO4
  #define I2C_SCL           D1  // GPIO5
  #define SD_CS_PIN         D8  // GPIO15
  #define SPI_SCK_PIN       D5  // GPIO14
  #define SPI_MISO_PIN      D6  // GPIO12
  #define SPI_MOSI_PIN      D7  // GPIO13
  #define DHTPIN            D4  // GPIO2
  #define DHTTYPE           DHT22
  #define ANEMOMETER_PIN    D3  // GPIO0
  #define LED_PIN           LED_BUILTIN
#endif

// ---------- Konfigurasi Sensor Arus & Tegangan Baterai INA226 ----------
#define INA226_I2C_ADDR         0x40
#define INA226_SHUNT_OHM        0.1f   // Shunt Resistor 0.1 Ohm
#define INA226_MAX_AMPS         0.8f

// ---------- Parameter Baterai 1S LiFePO4 (Nominal 3.2V, 30Ah) ----------
#define BATTERY_CHEMISTRY       "LiFePO4"
#define BATTERY_NOMINAL_VOLTS   3.2f
#define BATTERY_VOLTS_EMPTY     2.60f
#define BATTERY_VOLTS_FULL      3.60f
#define BATTERY_CAPACITY_AH     30.0f

// ---------- Storage & Logging ----------
#define SD_LOG_FILE             "/datalog.csv"

// ---------- Queue & Ring Buffer Limits ----------
#define MAX_QUEUE_FILES         50
#define SAMPLE_BUFFER_SIZE      90
#define DEEP_SLEEP_SECONDS      900

// ---------- Timing & Sleep Defaults ----------
#define ANEMOMETER_DEBOUNCE_US  5000   // 5ms debounce
#define WATCHDOG_INTERVAL_MS    5000   // 5s watchdog
#define WIND_SAMPLE_DURATION_MS 10000  // 10s wind sample
#define ENABLE_DEEP_SLEEP       false  // Default continuous mode

#endif // CONFIG_H
