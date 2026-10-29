# Audit Pra-Rilis & Solusi Zero Data Loss (ESP8266)

Berdasarkan audit QA terhadap `src/main.cpp` dan respon atas insiden hilangnya data semalam saat listrik dicabut, saya menemukan akar masalah (*root cause*) dan telah menyusun rencana perbaikan (remediasi) menyeluruh.

## 🐛 Root Cause Analysis (Penyebab Hilangnya Data)

1. **Buffer Dikosongkan Tanpa Verifikasi (Logic Error):**
   Pada fungsi `jobFirebasePublish()`, kode melakukan *reset buffer* (`sampleCount = 0;`) **sebelum** mengecek apakah data berhasil terkirim ke Firebase. Akibatnya, jika WiFi/Internet putus saat jadwal pengiriman 15 menit tiba, data tersebut langsung dihapus dari RAM dan hilang selamanya.
2. **Volatilitas RAM (Hilang saat Mati Listrik):**
   Seluruh antrean (*queue*) data sensor saat ini hanya disimpan di memori RAM (melalui array `sampleBuffer`). Sifat RAM adalah *volatile* (sementara). Saat alat dicabut dari listrik atau restart (watchdog reset), semua data yang belum terkirim otomatis musnah.
3. **Sinkronisasi Waktu (NTP) saat Boot Offline:**
   Jika saat listrik menyala namun WiFi sedang bermasalah, alat tidak bisa mendapatkan waktu asli dari NTP server, sehingga data yang terekam akan memiliki timestamp `1970-01-01`, yang dapat mengacaukan grafik Firebase.

## ⚠️ User Review Required

> [!WARNING]  
> **Flash Wear & LittleFS:** Solusi yang saya ajukan melibatkan penyimpanan data ke memori Flash internal ESP8266 (LittleFS) setiap kali koneksi internet gagal. Memori Flash memiliki batas usia *write/erase cycle* (~100,000 kali). Namun, karena kita hanya menyimpan rata-rata per 15 menit, penulisan ke memori hanya terjadi maksimal 96 kali sehari, sehingga memori akan awet berpuluh-puluh tahun. Apakah Anda setuju dengan pendekatan ini?

## 💡 Proposed Changes

### 1. ESP8266 Firmware (C++ Backend)

#### [MODIFY] [src/main.cpp](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/src/main.cpp)
- **Integrasi LittleFS (Sistem File Internal):** Menginisialisasi `LittleFS` pada `setup()` untuk menggunakan memori flash ESP8266 sebagai media penyimpanan persisten.
- **Offline Queue System (Anti-Mati Listrik):**
  - Mengubah fungsi `jobFirebasePublish()`: Alih-alih langsung mengirim ke Firebase, setiap rata-rata 15 menit akan dibungkus menjadi JSON dan disimpan/di-*append* terlebih dahulu ke file `/offline_queue.txt` di LittleFS.
  - Setelah tersimpan aman di memori (tidak hilang meski dicabut dari listrik), alat akan mencoba membaca antrean dari file tersebut dan mengirimkannya satu per satu ke Firestore menggunakan `postToFirestoreDirect()`.
  - Jika Firebase mengembalikan status `200 OK`, baris JSON tersebut akan dihapus dari antrean. Jika gagal (WiFi putus), antrean tetap aman di dalam Flash untuk dicoba lagi pada siklus berikutnya.
- **NTP Retry & Validasi:** Memodifikasi `getIso8601Timestamp()` dan alur koneksi. Jika `ntpSynced` `false`, sistem tidak akan men-generate data palsu tahun 1970, melainkan akan melakukan retry sync NTP di background hingga berhasil.

#### [MODIFY] [platformio.ini](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/platformio.ini)
- Menambahkan konfigurasi `board_build.filesystem = littlefs` untuk mengalokasikan partisi memori file system di ESP8266.

## 🧪 Verification Plan

### Automated Tests
- Menjalankan `pio run` untuk memastikan firmware terkompilasi sukses dengan library `<LittleFS.h>`.

### Manual Verification
1. **Simulasi Network Drop:** Mematikan router internet saat ESP menyala dan menunggu hingga 2 periode (30 menit). Memastikan data tersimpan di Flash.
2. **Simulasi Power Cut:** Saat WiFi sedang mati dan ada data di antrean (offline queue), memutus power ESP (mencabut kabel USB). Menyalakan kembali dan menyalakan WiFi, untuk membuktikan data sebelumnya terkirim ke Firestore dan tidak ada `data semalam kemana` lagi.
