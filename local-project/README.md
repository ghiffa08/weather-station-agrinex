# Local Project (Test Bench & Sandbox)

Folder ini berfungsi sebagai **lingkungan pengujian (tester / sandbox)** untuk proyek Weather Station Agrinex sebelum fitur diintegrasikan ke firmware dan web utama.

## Struktur Direktori

- **`firmware/`**:
  - Firmware pengujian berbasis **ESP32 (ESP-WROOM-32)** dan ESP8266.
  - Fitur:
    - Pengujian sensor baterai & daya menggunakan modul **INA226**.
    - Protokol transmisi data real-time via **HTTP Server-Sent Events (SSE)** dan REST API JSON.
    - Integrasi sensor lingkungan (DHT22, BH1750, Anemometer) + RTC DS3231 + SD Card.

- **`web/`**:
  - Web dashboard lokal (React + TypeScript + Vite) yang terhubung langsung ke IP ESP32 melalui SSE stream untuk monitoring performa, diagnostik, dan sensor real-time saat pengujian lokal.

## Penggunaan
1. **Firmware Tester**:
   ```bash
   cd firmware
   pio run -e esp32dev -t upload
   ```
2. **Web Tester**:
   ```bash
   cd web
   npm install
   npm run dev
   ```
