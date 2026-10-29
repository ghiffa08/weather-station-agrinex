# Production Firmware (ESP8266 v2.0) ⚡

Firmware utama untuk modul Weather Station Agrinex yang dideploy di lapangan.

## Fitur Utama
- **Microcontroller**: NodeMCU ESP8266 (v2)
- **Sensor Terintegrasi**:
  - DHT22 (Suhu & Kelembapan Relatif)
  - BH1750 (Intensitas Cahaya / Lux)
  - Zhafira Anemometer v1.3 (Kecepatan Angin)
  - RTC DS3231 (Sinkronisasi Waktu Offline)
- **Zero Data Loss (LittleFS Offline Queue)**:
  - Data diakumulasikan per 15 menit dan disimpan di Flash internal LittleFS terlebih dahulu sebelum diunggah ke Firebase Firestore.
  - Jika internet putus atau listrik mati, antrean data tetap tersimpan dan otomatis terkirim saat koneksi pulih.

## Perintah PlatformIO
```bash
# 1. Compile firmware
pio run -e nodemcuv2

# 2. Upload firmware via USB
pio run -e nodemcuv2 -t upload

# 3. Buka Serial Monitor
pio device monitor -b 115200
```
