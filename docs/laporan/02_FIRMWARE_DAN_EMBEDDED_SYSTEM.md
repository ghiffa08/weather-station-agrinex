# BAB II: DOKUMENTASI LENGKAP ARSITEKTUR FIRMWARE & EMBEDDED REAL-TIME OPERATING SYSTEM

---

## 2.1 Paradigma Pengembangan Firmware & PlatformIO Dual-Environment

*Firmware* stasiun cuaca Agrinex dikembangkan dengan standar bahasa pemrograman **C++17** menggunakan ekosistem terpadu **PlatformIO Core**. Pendekatan ini memungkinkan stasiun cuaca mendukung dua varian perangkat keras mikrokontroler target secara serentak (*dual-environment build matrix*): **ESP32 (ESP-WROOM-32)** sebagai target performa tinggi berarsitektur dual-core, dan **NodeMCU v2 (ESP8266)** sebagai target varian efisiensi biaya.

### 2.1.1 Konfigurasi Kompilasi (`platformio.ini`)
```ini
; PlatformIO Project Configuration File
; Project: Agrinex Weather Station  -  Dual ESP32 & ESP8266 Support
; Target: ESP32 (ESP-WROOM-32) & NodeMCU v2 (ESP8266)

[platformio]
default_envs = esp32dev, nodemcuv2

[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
upload_speed = 115200
board_build.filesystem = littlefs
lib_ldf_mode = deep+
build_flags = 
    -std=gnu++17
    -D CORE_DEBUG_LEVEL=0
lib_deps = 
    adafruit/DHT sensor library @ ^1.4.7
    adafruit/Adafruit Unified Sensor @ ^1.1.15
    claws/BH1750 @ ^1.3.0
    bblanchon/ArduinoJson @ ^7.4.1
    adafruit/RTClib @ ^2.1.4
    knolleary/PubSubClient @ ^2.8
    robtillaart/INA226 @ ^0.6.6
    SPI
    SD

[env:nodemcuv2]
platform = espressif8266
board = nodemcuv2
framework = arduino
monitor_speed = 115200
upload_speed = 115200
board_build.filesystem = littlefs
lib_ldf_mode = deep+
lib_deps = 
    adafruit/DHT sensor library @ ^1.4.7
    adafruit/Adafruit Unified Sensor @ ^1.1.15
    claws/BH1750 @ ^1.3.0
    bblanchon/ArduinoJson @ ^7.4.1
    adafruit/RTClib @ ^2.1.4
    knolleary/PubSubClient @ ^2.8
    robtillaart/INA226 @ ^0.6.6
    SPI
    SD
```

---

## 2.2 Arsitektur Multi-Tasking & FreeRTOS Dual-Core Scheduling

Untuk memastikan bahwa pembacaan sensor berkecepatan tinggi tidak terganggu oleh latensi transmisi jaringan Wi-Fi, *firmware* mengimplementasikan penjadwalan multithreading berbasis **FreeRTOS** pada ESP32, serta penjadwal kooperatif non-blocking berbasis `millis()` pada ESP8266.

```mermaid
flowchart LR
    subgraph Core1["CORE 1 (App CPU): Task Sensorik & Kalkulasi"]
        ISR["Anemometer ISR (GPIO 27)<br/>Pengukuran Pulsa Mikrodetik"] --> Q["Ring Buffer Pulsa"]
        T_Sensor["TaskAkuisisiSensor (Priority 2)<br/>Loop 1000 ms"] --> SensorRead["Baca DHT22, BH1750, INA226, RTC"]
        Q --> T_Sensor
        T_Sensor --> BusCheck{"Cek Status Bus I2C"}
        BusCheck -- Macet --> Recovery["Eksekusi 9-Clock Recovery"]
        BusCheck -- Normal --> MutexLock["Kunci Mutex Telemetri"]
        MutexLock --> TelemetryStruct["Update Data Telemetri Global"]
    end

    subgraph Core0["CORE 0 (Pro CPU): Task Jaringan & Web Server"]
        WebServer["TaskWebServer (Priority 1)<br/>ESP32 WebServer (Port 80)"]
        TelemetryStruct --> WebServer
        WebServer --> EP_Sensors["GET /api/sensors (JSON)"]
        WebServer --> EP_Config["GET & POST /api/config (LittleFS)"]
        WebServer --> CloudSync["Sync Cloud Telemetry (Firestore)"]
        WebServer --> MqttPublish["Publish MQTT Telemetry"]
    end
```

### Pemisahan Tanggung Jawab Core (ESP32):
1. **Core 1 (App CPU):**
   - **Prioritas Tinggi (Priority 2):** Eksekusi siklik pembacaan sensor setiap 1000 ms.
   - Melayani rutinitas penanganan interupsi (*Interrupt Service Routine / ISR*) perangkat keras untuk anemometer secara langsung dari RAM internal (*IRAM_ATTR*).
   - Memastikan tidak ada latensi atau *jitter* waktu saat menghitung laju putaran anemometer.
2. **Core 0 (Pro CPU):**
   - **Prioritas Standar (Priority 1):** Mengelola koneksi jaringan Wi-Fi, tumpukan TCP/IP, sinkronisasi cloud Firestore, dan permintaan HTTP masuk pada REST API Web Server.
   - Menghindari pembekuan CPU (*watchdog trigger*) saat terjadi *timeout* jaringan internet atau koneksi Wi-Fi yang melemah.

---

## 2.3 State Machine Pemulihan Bus I2C (*I2C Bus Recovery Machine*)

### 2.3.1 Masalah Pembekuan Bus (*I2C Bus Lockup*)
Pada implementasi sensor lapangan, modul I2C (BH1750, DS3231, INA226) yang terhubung pada jalur SDA/SCL yang sama rentan mengalami kondisi *lockup*. Kondisi ini terjadi ketika mikroprosesor mengalami *reset* atau *brownout* saat sensor *slave* sedang mengirimkan bit data bernilai `0` (SDA ditarik ke level *LOW*). Akibatnya, jalur SDA tertahan *LOW* tanpa henti, dan pustaka I2C perangkat keras ESP32 akan membeku (*hang*) saat mencoba melakukan inisialisasi `Wire.begin()`.

### 2.3.2 Algoritma Pemulihan 9-Clock Pulses Bit-Banging
Untuk menanggulangi masalah ini secara otomatis tanpa intervensi tombol reset fisik, *firmware* menyematkan algoritma pemulihan otomatis sebelum bus I2C diinisialisasi:

```cpp
bool recoverI2CBus(int sdaPin, int sclPin) {
    pinMode(sdaPin, INPUT_PULLUP);
    pinMode(sclPin, INPUT_PULLUP);
    delayMicroseconds(10);

    // Cek apakah SDA macet di level LOW
    if (digitalRead(sdaPin) == LOW) {
        Serial.println(F("[I2C RECOVERY] Terdeteksi Bus Lockup: SDA tertahan LOW!"));
        
        // Alihkan SCL ke mode OUTPUT untuk melakukan bit-banging 9 clock pulses
        pinMode(sclPin, OUTPUT);
        for (int i = 0; i < 9; i++) {
            digitalWrite(sclPin, LOW);
            delayMicroseconds(10);
            digitalWrite(sclPin, HIGH);
            delayMicroseconds(10);
            
            // Jika slave telah melepaskan SDA kembali ke HIGH, hentikan pulsa
            if (digitalRead(sdaPin) == HIGH) {
                Serial.printf(F("[I2C RECOVERY] Slave melepaskan SDA pada clock ke-%d\n"), i + 1);
                break;
            }
        }
        
        // Bangkitkan kondisi I2C STOP secara manual: SCL HIGH lalu SDA HIGH
        pinMode(sdaPin, OUTPUT);
        digitalWrite(sdaPin, LOW);
        delayMicroseconds(10);
        digitalWrite(sclPin, HIGH);
        delayMicroseconds(10);
        digitalWrite(sdaPin, HIGH);
        delayMicroseconds(10);
    }
    
    // Kembalikan ke mode Wire I2C standar
    Wire.begin(sdaPin, sclPin);
    Wire.setClock(100000); // 100 kHz standard mode
    return (digitalRead(sdaPin) == HIGH && digitalRead(sclPin) == HIGH);
}
```

---

## 2.4 Algoritma Debounce & Microsecond Pulse-Width Filter Anemometer

### 2.4.1 Analisis Masalah Derau Transien & Kontak Mengambang
Anemometer tipe mangkok berputar (*cup anemometer*) v1.3 menggunakan piringan celah optik (*optical chopper disk*) atau sensor reed switch yang terhubung ke pin interupsi GPIO 27. Saat kondisi hening (*calm / no wind*), mangkok anemometer sering kali berhenti tepat di batas ambang sensor (*optical edge transition*). Hembusan angin mikro yang sangat kecil dapat menyebabkan sinyal berosilasi bolak-balik puluhan kali dalam hitungan milidetik (*switch chatter*). Ditambah lagi dengan kabel sensor sepanjang 2 meter yang menangkap derau induksi elektromagnetik (EMI), pin interupsi dapat memicu ribuan interupsi palsu yang mengakibatkan lonjakan pembacaan angin palsu (*abnormal wind spike* hingga ratusan km/jam).

### 2.4.2 Implementasi Filter Diskriminasi Lebar Pulsa Mikrodetik
Untuk mengeliminasi sinyal palsu secara presisi tanpa kehilangan pulsa rotasi nyata, *firmware* menerapkan filter berbasis waktu di tingkat interupsi (*hardware ISR*) dan *noise gate* frekuensi di tingkat perangkat lunak:

```cpp
volatile uint32_t g_validPulses = 0;
volatile uint32_t g_rejectedGlitches = 0;
volatile uint32_t g_lastInterruptUs = 0;
volatile uint32_t g_lastLowWidthUs = 0;

// ISR dieksekusi dari IRAM untuk kecepatan respons instan
void IRAM_ATTR anemometerISR() {
    uint32_t now = micros();
    uint32_t delta = now - g_lastInterruptUs;
    
    // 1. Filter Interval Minimum (Dead-Time Filter):
    // Kecepatan angin maksimum fisik 180 km/jam ekuivalen dengan frekuensi ~75 Hz (interval ~13.3 ms).
    // Pulsa dengan interval < 10 ms (10.000 µs) dipastikan merupakan pantulan derau (glitch).
    if (delta < 10000) {
        g_rejectedGlitches++;
        return;
    }
    
    // 2. Filter Lebar Pulsa Rendah (Pulse Width Discrimination):
    // Mengukur apakah transisi LOW bertahan cukup lama (> 500 µs) untuk membuktikan rotasi mekanis
    uint32_t lowStart = micros();
    while (digitalRead(ANEMOMETER_PIN) == LOW && (micros() - lowStart) < 2000) {
        // Tunggu transisi atau batas maksimum
    }
    uint32_t pulseWidth = micros() - lowStart;
    g_lastLowWidthUs = pulseWidth;
    
    if (pulseWidth < 500) { // Durasi transisi terlalu pendek (< 500 µs), tolak derau transien
        g_rejectedGlitches++;
        return;
    }
    
    g_validPulses++;
    g_lastInterruptUs = now;
}
```

### 2.4.3 Konversi Pulsa ke Kecepatan Angin
Setiap interval pengukuran $1\text{ detik}$, jumlah pulsa valid dihitung dan dikalibrasi:
$$V_{\text{km/jam}} = \left( \frac{\text{Pulsa Valid}}{\Delta t} \right) \times K_{\text{faktor}}$$
Dengan nilai konstanta $K_{\text{faktor}} = 2.4\text{ km/jam per Hz}$. Jika pulsa per detik berada di bawah ambang *Noise Gate* yang ditetapkan pengguna (contoh: $\le 2\text{ Hz}$), kecepatan angin otomatis dinolkan ($0.0\text{ km/jam}$).

---

## 2.5 Penyimpanan Konfigurasi Non-Volatile LittleFS

Konfigurasi stasiun tidak disimpan pada memori EEPROM terbatas, melainkan pada partisi berkas **LittleFS**.

### Keunggulan LittleFS:
1. **Ketahanan Kegagalan Daya (*Power-Loss Resilience*):** Menjamin integritas sistem berkas meskipun daya listrik mati mendadak di tengah proses penulisan konfigurasi.
2. **Wear Leveling Dinamis:** Menyebarkan siklus penulisan secara merata di seluruh sektor flash memory 4 MB, memperpanjang usia pakai chip ESP32 hingga puluhan tahun.
3. **Struktur Data JSON Terbuka:** Konfigurasi disimpan dalam berkas `/config.json` yang dapat dibaca, diedit, diunduh, dan dipulihkan langsung melalui web browser:

```json
{
  "station_name": "Kelurahan Purwawinangun, Kecamatan Kuningan",
  "elevation_m": 555,
  "latitude": -6.9721,
  "longitude": 108.4801,
  "sensor_interval_sec": 15,
  "cal_temp_offset": -4.8,
  "cal_hum_offset": 14.0,
  "cal_wind_noise_gate": 18,
  "pins": {
    "dht_pin": 4,
    "anemo_pin": 27,
    "i2c_sda": 21,
    "i2c_scl": 22,
    "sd_cs": 5
  },
  "backend": {
    "protocol": "HTTP_REST",
    "mqtt_broker": "broker.emqx.io",
    "mqtt_port": 1883
  }
}
```

---

## 2.6 Arsitektur Embedded Web Server & REST API Portal

ESP32 menjalankan server web HTTP asinkron mandiri pada port `80` yang menyediakan antarmuka pemrograman aplikasi (REST API) lengkap:

| Metode HTTP | Jalur URL Endpoint | Fungsi & Deskripsi | Format Respon |
| :---: | :--- | :--- | :---: |
| `GET` | `/api/sensors` | Mengembalikan nilai pembacaan seluruh sensor terkini, waktu RTC, status baterai, dan diagnostik bus secara instan (latensi $< 50\text{ ms}$). | JSON |
| `GET` | `/api/telemetry` | Mengambil data telemetri rata-rata buffer terbaru beserta cap waktu ISO 8601. | JSON |
| `GET` | `/api/config` | Mengambil seluruh konfigurasi stasiun yang tersimpan di berkas LittleFS. | JSON |
| `POST` | `/api/config` | Memperbarui parameter kalibrasi, nama stasiun, dan pinout, lalu menyimpannya secara permanen ke LittleFS. | JSON Status |
| `OPTIONS` | `/api/*` | Penanganan *CORS Preflight* otomatis untuk mengizinkan permintaan peramban lintas domain dari web app luar (Vercel/Cloudflare). | HTTP 204 |
| `GET` | `/api/status` | Menampilkan uptime sistem, sisa memori Free Heap, status modul I2C, dan jumlah *rejected glitches* anemometer. | JSON |
| `GET` | `/api/diagnostics` | Menjalankan *self-test routine* terhadap seluruh modul hardware dan mengembalikan laporan status kesehatan 6 modul. | JSON |
| `POST` | `/api/restart` | Melakukan *software reboot* mikrokontroler secara aman. | JSON Status |

### Penanganan Keamanan CORS (Cross-Origin Resource Sharing)
Untuk mengizinkan aplikasi web modern mengakses REST API ESP32 tanpa diblokir oleh kebijakan keamanan peramban (*Same-Origin Policy*), setiap respons web portal menyematkan *header* standar:
```cpp
void sendCorsHeaders() {
    webServer.sendHeader("Access-Control-Allow-Origin", "*");
    webServer.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    webServer.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
```

---

## 2.7 Protokol Transmisi Awan: Sinkronisasi Google Cloud Firestore

Untuk fasilitas pemantauan jarak jauh via internet publik, firmware menyematkan modul transmisi HTTPS mandiri langsung ke REST API **Google Cloud Firestore**:

```cpp
void publishToFirestore(const SensorSample& data) {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure(); // Mengabaikan validasi root CA untuk memangkas memori RAM SSL

    HTTPClient https;
    String url = "https://firestore.googleapis.com/v1/projects/" + String(FIREBASE_PROJECT_ID) +
                 "/databases/(default)/documents/telemetry";

    if (https.begin(client, url)) {
        https.addHeader("Content-Type", "application/json");

        // Pembentukan Payload Dokumen Firestore Baku
        JsonDocument doc;
        JsonObject fields = doc["fields"].to<JsonObject>();
        fields["temperature"]["doubleValue"] = data.temperature;
        fields["humidity"]["doubleValue"]    = data.humidity;
        fields["wind_speed"]["doubleValue"]  = data.wind_speed;
        fields["light_lux"]["doubleValue"]   = data.light_lux;
        fields["timestamp"]["stringValue"]   = data.isoTimestamp;

        String requestBody;
        serializeJson(doc, requestBody);
        
        int httpCode = https.POST(requestBody);
        if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
            Serial.println(F("[FIRESTORE] Telemetri berhasil tersinkronisasi ke Cloud!"));
        } else {
            Serial.printf(F("[FIRESTORE ERROR] Gagal mengirim data, kode HTTP: %d\n"), httpCode);
        }
        https.end();
    }
}
```

---

## 2.8 Sistem Pencatatan Cadangan Kartu SD Offline (*Fault-Tolerant Logging*)

Apabila koneksi jaringan lokal dan internet terputus secara serentak, stasiun cuaca Agrinex tidak akan kehilangan satu pun titik data observasi. Data telemetri secara otomatis dicatat ke dalam media penyimpanan eksternal kartu MicroSD via antarmuka SPI:

1. **Format Berkas CSV Harian:** Berkas disimpan secara terpartisi harian dengan penamaan `YYYYMMDD.csv` berdasarkan waktu jam presisi DS3231 RTC.
2. **Buffer Baris Tabular:** Setiap baris memuat cap waktu UNIX, ISO string, suhu, kelembapan, radiasi, kecepatan angin, tegangan rel baterai, dan kode checksum.
3. **Mekanisme Auto-Sync:** Saat jaringan Wi-Fi kembali terhubung, firmware menyediakan endpoint untuk mem-flush data yang tertimbun di kartu SD ke server awan.

---

## 2.9 Matriks Pemetaan Pinout Hardware (ESP32 vs NodeMCU v2)

Tabel berikut menyajikan pemetaan referensi pinout hardware antara varian ESP32 dan ESP8266:

| Modul / Sensor | Jalur Sinyal | Pinout ESP32 DevKit (Rekomendasi) | Pinout NodeMCU v2 (ESP8266) | Keterangan Sirkuit |
| :--- | :---: | :---: | :---: | :--- |
| **DHT22** | DATA | `GPIO 4` | `D4 (GPIO 2)` | Pull-up resistor $4.7\text{ k}\Omega$ ke 3.3V |
| **Anemometer v1.3** | PULSE / SIGNAL | `GPIO 27` (Hardware Interrupt) | `D1 (GPIO 5)` (Interrupt) | Input filter mikrodetik IRAM_ATTR |
| **BH1750 (Cahaya)** | SDA / SCL | `GPIO 21` (SDA) / `GPIO 22` (SCL) | `D2 (GPIO 4)` / `D1 (GPIO 5)` | Alamat I2C: `0x23` |
| **INA226 (Daya)** | SDA / SCL | `GPIO 21` (SDA) / `GPIO 22` (SCL) | `D2 (GPIO 4)` / `D1 (GPIO 5)` | Alamat I2C: `0x40` |
| **DS3231 RTC** | SDA / SCL | `GPIO 21` (SDA) / `GPIO 22` (SCL) | `D2 (GPIO 4)` / `D1 (GPIO 5)` | Alamat I2C: `0x68` (Baterai CR2032 backup) |
| **MicroSD Card** | SPI (MOSI/MISO/CLK/CS) | `GPIO 23 / 19 / 18 / 5 (CS)` | `D7 / D6 / D5 / D8 (CS)` | Antarmuka SPI Hardware High-Speed |
| **LED Status Indikator**| STATUS | `GPIO 2` (On-board LED) | `D0 (GPIO 16)` | Indikasi Heartbeat & Transmisi Data |
