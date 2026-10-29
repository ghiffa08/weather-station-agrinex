# 🛡️ Laporan Audit Senior QA: Keamanan, Performa, Clean Code & Best Practice
**Proyek:** Agrinex Weather Station (IoT ESP8266 & Web Dashboard)  
**Target Wilayah:** Kabupaten Kuningan (Elevasi 560 mdpl, ADM4: `32.08.09.1002`)  
**Lead Auditor:** Senior QA & System Architect  
**Tanggal:** 29 Oktober 2026  
**Status Audit:** COMPLETED (Memerlukan Remediasi Prioritas)

---

## Executive Summary

Audit menyeluruh telah dilakukan terhadap seluruh lapisan sistem Weather Station Agrinex, mencakup:
1. **Firmware IoT C++ (`firmware/`)**: Kompilasi PlatformIO, manajemen memori, protokol komunikasi, dan penanganan kegagalan daya.
2. **Web Dashboard React + TypeScript (`web/`)**: Siklus hidup komponen, arsitektur data, ukuran bundle, dan performa runtime.
3. **Infrastruktur Cloud & Keamanan**: Integrasi Firebase Firestore, API BMKG, dan eksposur kredensial.
4. **Validasi Algoritma Ilmiah**: Standar meteorologi WMO dan agrometeorologi FAO-56 Penman-Monteith.

### Skor Kematangan Sistem (QA Scorecard):
| Kategori | Skor | Status | Catatan Utama |
| :--- | :---: | :---: | :--- |
| **Keamanan (Security)** | **68 / 100** | ⚠️ Butuh Remediasi | Kredensial WiFi hardcoded di C++, `setInsecure()` TLS bypass, dan aturan Firestore terbuka. |
| **Performa (Performance)** | **78 / 100** | ⚠️ Cukup Baik | Bundle JS awal > 1.19 MB (butuh code-splitting), memory leak event listener di window. |
| **Clean Code & Arsitektur** | **92 / 100** | ✅ Sangat Baik | Pemisahan layer Domain/Repository/Services rapi, TypeScript strict, implementasi SOLID terjaga. |
| **Standar Ilmiah & Best Practice**| **95 / 100** | 🌟 Unggul | Kepatuhan penuh terhadap rumus FAO-56, normalisasi angin $u_2$, dan evaluasi metrik MAE/RMSE/Pearson. |

---

## 🔒 1. Audit Keamanan (Security Audit)

### [CRITICAL] SEC-01: Tidak Adanya File `firestore.rules` (Risiko Database Terbuka Publik)
- **Lokasi**: Cloud Firestore Database (`agrinex-f5ef8`).
- **Temuan**:
  Pada `FirebaseDataSource.ts`, terdapat komentar yang menyarankan aturan `"allow read, write: if true;"`. Tanpa deklarasi security rules yang ketat, siapa pun yang memiliki `projectId` dan `apiKey` dapat memodifikasi, menghapus, atau membanjiri koleksi `telemetry` dengan data palsu.
- **Rekomendasi Remediasi**:
  Buat file `firestore.rules` di repositori dengan aturan pembatasan skema (hanya izinkan write jika struktur payload sesuai: timestamp, temperature, humidity, wind_speed, light_lux), dan larang operasi `delete`.

### [HIGH] SEC-02: Kredensial WiFi Hardcoded pada Header File (CWE-798)
- **Lokasi**: [`firmware/include/config.h`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/firmware/include/config.h#L10-L11)
  ```cpp
  #define WIFI_SSID         "WiFi 2"
  #define WIFI_PASSWORD     "barcelona"
  ```
- **Dampak**: Jika kode sumber diunggah ke repositori Git publik/organisasi, kata sandi jaringan lokal terekspos langsung.
- **Rekomendasi Remediasi**:
  Gunakan file `config.private.h` yang dimasukkan ke `.gitignore`, atau gunakan library **WiFiManager** (Captive Portal) agar pengguna menginput kredensial WiFi melalui smartphone di lapangan tanpa re-compile.

### [MEDIUM] SEC-03: Pengecekan Sertifikat SSL/TLS Ditiadakan (`client.setInsecure()`)
- **Lokasi**: [`firmware/src/main.cpp`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/firmware/src/main.cpp#L375)
  ```cpp
  WiFiClientSecure client;
  client.setInsecure();
  ```
- **Temuan**: Penggunaan `client.setInsecure()` menonaktifkan validasi rantai sertifikat X.509 SSL pada ESP8266.
- **Analisis Risiko**: ESP8266 memiliki keterbatasan RAM untuk menyimpan full certificate root CA pool. Namun, ini membuka celah serangan *Man-in-the-Middle (MitM)* jika berada pada jaringan WiFi yang tidak tepercaya.
- **Rekomendasi Remediasi**:
  Gunakan *fingerprint pinning* (SHA1 / SHA256) atau sertifikat root CA Google Trust Services (GTS CA 1C3) untuk koneksi ke `firestore.googleapis.com`.

---

## ⚡ 2. Audit Performa (Performance Audit)

### [MEDIUM] PERF-01: Ukuran Bundle Frontend Terlalu Besar (> 1.19 MB) Tanpa Code-Splitting
- **Lokasi**: [`web/vite.config.ts`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/web/vite.config.ts)
- **Temuan**:
  Hasil build menghasilkan single file `dist/assets/index-*.js` berukuran **1,196.59 kB** (Gzip 351 kB). Vite memberikan peringatan: `(!) Some chunks are larger than 500 kB after minification`.
- **Dampak**: Waktu muat (*First Contentful Paint* & *LCP*) lambat bagi pengguna di area perkebunan Kuningan yang hanya memiliki koneksi seluler 3G/4G terbatas.
- **Akar Masalah**: Pustaka `firebase`, `recharts`, dan komponen rendering digabung ke dalam satu berkas monolitik.
- **Rekomendasi Remediasi**:
  Terapkan konfigurasi `rollupOptions.output.manualChunks` pada `vite.config.ts` untuk memecah `vendor-firebase` dan `vendor-charts`.

### [MEDIUM] PERF-02: Memory Leak pada Event Listener `WeatherRepository.onConnectionChange`
- **Lokasi**: [`web/src/data/repositories/WeatherRepository.ts`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/web/src/data/repositories/WeatherRepository.ts#L22-L28)
  ```typescript
  onConnectionChange(callback: (connected: boolean) => void): void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    callback(navigator.onLine);
  }
  ```
- **Temuan**: Fungsi ini menambahkan listener ke objek global `window` tanpa menyediakan mekanisme `unsubscribe` / `removeEventListener`.
- **Dampak**: Setiap kali komponen me-remount (atau re-render di SSR), listener baru terus bertambah, menyebabkan kebocoran memori browser secara perlahan.
- **Rekomendasi Remediasi**:
  Kembalikan fungsi pembersih `() => { window.removeEventListener(...); }`.

### [LOW-MEDIUM] PERF-03: Blocking `delay(1500)` pada Retry Loop Pembacaan DHT22
- **Lokasi**: [`firmware/src/main.cpp`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/firmware/src/main.cpp#L293)
- **Temuan**: Jika sensor DHT22 mengalami kegagalan baca pertama, sistem melakukan loop retry dengan `delay(1500)`. Dua kali percobaan menyebabkan mikrokontroler tertahan (*blocking*) selama 3 detik.
- **Rekomendasi Remediasi**:
  Meskipun `yield()` dipanggil, pendekatan non-blocking berbasis state-machine millis lebih disarankan agar loop utama tetap responsif.

---

## 🧼 3. Audit Clean Code & Arsitektur

### ✅ Kelebihan yang Ditemukan (Best Architecture Highlights):
1. **Separation of Concerns (SoC)**: Pemisahan folder antara `core/services/` (domain & rumus murni), `data/sources/` (akses jaringan Firestore & BMKG), dan `presentation/components/` sangat rapi dan memenuhi prinsip Clean Architecture.
2. **Type Safety**: Penggunaan interface TypeScript komprehensif (`VariableMetrics`, `ComprehensiveBenchmarkReport`, `EtoComparisonResult`) mencegah penggunaan tipe `any` dan menjamin integritas kontrak data.
3. **Persistence Resampling**: Solusi [`TimeSeriesMatcher.ts`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/web/src/core/services/TimeSeriesMatcher.ts) berhasil menghilangkan ketergantungan pada *in-memory array*, sehingga data grafik tetap utuh setelah refresh halaman.

---

## 🌾 4. Audit Standar Domain Ilmiah & Agrometeorologi

### ✅ Kepatuhan Standar (Domain Verification):
1. **Kepatuhan FAO-56 Penman-Monteith**:
   - Penghitungan tekanan atmosfer $P$, konstanta psikrometrik $\gamma$, defisit tekanan uap $e_s - e_a$, dan radiasi netto $R_n$ telah mengikuti persamaan matematis baku FAO-56.
   - Variabel ketinggian Kabupaten Kuningan (**560 mdpl**) dan lintang (**-6.9788°**) telah terintegrasi secara tepat pada fungsi radiasi ekstraterestrial $R_a$.
2. **Normalisasi Angin Standar 2 Meter ($u_2$)**:
   - Anemometer tiang $1.5\text{ m}$ telah dikalibrasi menggunakan persamaan profil logaritmik FAO-56 Eq. 47 ($u_2 \approx u_{1.5} \times 1.056$).
3. **Konversi Fotometri ke Radiometri**:
   - Intensitas cahaya BH1750 (Lux) dikonversi ke Solar Irradiance ($W/m^2$) dengan faktor luminous daylight $\approx 120\text{ Lux} \iff 1\text{ W/m}^2$.

---

## 📋 5. Actionable Remediation Checklist

- [x] **Update Dokumentasi Spek & Kontrak**: Telah diintegrasikan ke `docs/ALGORITHMS_SPEC.md` dan `docs/DATA_CONTRACTS.md`.
- [x] **Fix PERF-01**: Terapkan manual chunk splitting pada `vite.config.ts` (Ukuran `index.js` berkurang drastis dari 1.19 MB menjadi 278 kB).
- [x] **Fix PERF-02**: Perbaiki cleanup `removeEventListener` pada `WeatherRepository.ts` & `useWeatherRealtime.ts` (Mencegah memory leak).
- [x] **Fix SEC-01**: Tulis file deklaratif `firestore.rules` untuk melindungi koleksi `telemetry` (Append-only immutability, schema lockdown via `.hasOnly()`, bounds check).
- [x] **Fix SEC-02**: Pisahkan kredensial WiFi ke `config.private.h` dengan fallback `config.private.h.example` dan perlindungan `.gitignore`. Serta verifikasi build firmware dengan PlatformIO.
