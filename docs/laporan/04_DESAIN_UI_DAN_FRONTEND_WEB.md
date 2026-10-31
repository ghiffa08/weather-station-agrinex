# BAB IV: DOKUMENTASI LENGKAP ANTARMUKA PENGGUNA (WEB UI), SISTEM NEUMORPHIC & MANAJEMEN AUTENTIKASI

---

## 4.1 Filosofi Desain Neumorphic Modern (Soft UI)

Antarmuka pengguna (*User Interface / UI*) stasiun cuaca Agrinex dirancang secara khusus untuk kebutuhan observasi lapangan di lingkungan terbuka (*outdoor agricultural monitoring*). Sebagian besar aplikasi pemantauan modern menggunakan tema gelap (*dark mode*) yang sulit dibaca di bawah paparan sinar matahari terik, atau tema putih murni (`#ffffff`) yang menyilaukan mata dan melelahkan operator/agronomis.

Sistem Agrinex mengimplementasikan gaya **Neumorphic Modern (Soft UI)** dengan palet dasar abu-abu netral berkilau lembut (`#e6e9ef`):

```css
:root {
  --color-neo-bg: #e6e9ef;
  --color-neo-card: #e6e9ef;
  --color-neo-text: #1f2937;
  --color-neo-text-muted: #64748b;
  
  /* Dual-Shadow Neumorphic: Sumber Cahaya Virtual dari Sudut Kiri-Atas */
  --shadow-neo-flat: 6px 6px 14px rgba(163, 177, 198, 0.6), -6px -6px 14px rgba(255, 255, 255, 0.8);
  --shadow-neo-pressed: inset 4px 4px 8px rgba(163, 177, 198, 0.6), inset -4px -4px 8px rgba(255, 255, 255, 0.8);
  --shadow-neo-sm: 3px 3px 6px rgba(163, 177, 198, 0.5), -3px -3px 6px rgba(255, 255, 255, 0.7);
}
```

### Keunggulan Karakteristik Neumorphic:
1. **Sensasi Taktil Fisik (*Tactile Ergonomics*):** Memberikan ilusi bahwa elemen kontrol (tombol, input, kartu) tercetak langsung timbul dari material dasar fisik stasiun, menyerupai panel instrumen laboratorium lapangan.
2. **Umpan Balik Visual yang Jelas (*State Transition*):** Tombol yang tidak aktif tampak timbul (*flat extruded*), sedangkan tombol yang sedang aktif/ditekan beralih menjadi cekung ke dalam (*inset pressed*).
3. **Keterbacaan Tinggi di Luar Ruangan:** Rasio kontras teks menggunakan tingkat kegelapan Slate-800 (`#1e293b`) dan Slate-900 (`#0f172a`), menjamin keterbacaan yang tajam bahkan saat layar tablet terkena refleksi cahaya luar.

---

## 4.2 Arsitektur Frontend: React 19 + TypeScript + Tailwind CSS v4

Aplikasi dibangun di atas fondasi arsitektur perangkat lunak modular (*Clean Component Hierarchy*):

```
web/src/
├── core/                        # Domain Layer (Independen dari UI)
│   ├── config/                  # Konfigurasi Firebase & Endpoint ESP32
│   ├── services/                # Layanan Inti (AuthService, TimeSeriesMatcher)
│   ├── types/                   # Definisi Kontrak Tipe TypeScript
│   └── utils/                   # Kalkulasi Fisika (ETo, Konversi Lux, Ekspor CSV/JSON)
├── hooks/                       # Application Layer (Stateful Logic Hooks)
│   ├── useWeatherRealtime.ts    # Dual-Stream Realtime Polling & Cloud Fallback
│   └── useComparativeAnalytics.ts # Mesin Agregasi Komparasi BMKG & Statistik
└── presentation/                # Presentation Layer (UI Components & Views)
    ├── components/
    │   ├── atomic/              # Atom & Molekul UI (LiveClock, MetricCard, Rows)
    │   ├── dashboard/           # Modul Dashboard (Highlights, Extremes, LogTable)
    │   ├── analytics/           # Modul Analitik (KPI Grid, AgroClimate Advisory)
    │   ├── neumorphic/          # Komponen Neumorphic (ArcGauge, Card, ChartWidget)
    │   └── settings/            # Modul Pengaturan (Modules, Sync, Users, Export)
    └── views/                   # Tampilan Halaman Utama (Dashboard, Analytics, Settings, Login, Onboarding)
```

---

## 4.3 Layar 1: Formulir Autentikasi Kredensial Lapangan

Antarmuka login didesain dengan konsep kartu tunggal terpusat (*compact single-card*, `max-w-xs`), berfokus pada kecepatan otentikasi di lapangan dengan mematuhi prinsip keamanan informasi.

![Tampilan Halaman Login Ultra-Minimalis](./assets/ui_01_login_page.png)
*Gambar 4.1: Antarmuka Login Kredensial Stasiun Cuaca Agrinex.*

### Spesifikasi Fitur Halaman Login:
1. **Konfigurasi Input Kredensial Murni (*Zero-State Input Specification*):**  
   Elemen masukan `Email` dan `Kata Sandi` dikonfigurasi secara ketat tanpa teks contoh bawaan (`placeholder=""`) dan status awal komponen (*initial state*) diinisialisasi dalam bentuk string kosong (`''`). Penerapan isolasi masukan ini bertujuan mencegah kebocoran informasi (*information disclosure mitigation*) terkait struktur domain atau penamaan akun stasiun pada perangkat terminal lapangan yang digunakan secara bersama (*shared field devices*).
2. **Mesin Deteksi Peran Otomatis (*Auto-Role Detection Engine*):**  
   Meniadakan selektor dropdown peran manual. Sistem mengevaluasi kredensial saat divalidasi dan menetapkan izin hak akses:
   - Identitas administratif (`admin`, `ghiffa`, atau `haikal`) $\implies$ **Administrator** (Akses penuh ke konfigurasi hardware, pinout, kalibrasi, dan manajemen user).
   - Identitas agroklimat (`agro` atau `pakar`) $\implies$ **Agronomist** (Fokus pada analitik perbandingan model BMKG, kurva ETo, dan log cuaca).
   - Identitas operasional umum $\implies$ **Field Officer / Petugas Lapang** (Akses operasional monitoring telemetri *real-time*).
3. **Mekanisme Otentikasi Bertingkat (*Dual-Engine Authentication Fallback*):**  
   Sistem memvalidasi kredensial via Google Firebase Authentication saat terkoneksi internet. Apabila stasiun berada di area luar jangkauan (offline), sistem secara otomatis mengalihkan autentikasi ke basis data lokal stasiun (`agrinex_registered_users`), menjamin stasiun tetap dapat diakses tanpa hambatan jaringan.

---

## 4.4 Layar 2: Onboarding Setup Wizard 5-Langkah Mandiri

Bagi stasiun cuaca yang baru pertama kali dinyalakan atau selesai di-flash ulang, antarmuka menyajikan wizard penyiapan terpandu berdesain kartu tunggal 5-langkah (*run-once setup wizard*):

![Tampilan Onboarding Wizard](./assets/ui_02_onboarding_wizard.png)
*Gambar 4.2: Panduan Konfigurasi Awal Stasiun (Onboarding Wizard 5-Langkah).*

### Tahapan Konfigurasi Terpandu:
1. **Langkah 1: Identitas & Elevasi Stasiun:** Penetapan nama stasiun mikroklimat dan input ketinggian lokasi di atas permukaan laut (default: Kuningan, 560 mdpl) untuk perhitungan konstanta psikrometrik $\gamma$.
2. **Langkah 2: Konfigurasi Jaringan Wi-Fi:** Pengisian SSID dan kata sandi router lokal untuk koneksi ESP32.
3. **Langkah 3: Uji Konektivitas Hardware:** Memeriksa respons komunikasi HTTP sensor melalui endpoint `/api/sensors`.
4. **Langkah 4: Kalibrasi Offset Termal:** Menyetel offset kompensasi panas PCB DHT22 ($\Delta T = -4.8^\circ\text{C}$) dan threshold noise gate anemometer.
5. **Langkah 5: Komit Memori Flash LittleFS:** Menyimpan seluruh parameter konfigurasi dalam format JSON ke partisi flash internal ESP32. Begitu selesai, flag `agrinex_onboarding_completed = true` disimpan permanen di penyimpanan peramban.

---

## 4.5 Layar 3: Dashboard Utama Telemetri & Gauge Cuaca

Dashboard utama merupakan pusat kendali operasional yang menyajikan telemetri mikroklimat secara *real-time* dengan tata letak Neumorphic yang teratur dan bersih:

![Tampilan Dashboard Utama Telemetri](./assets/ui_03_dashboard_overview.png)
*Gambar 4.3: Tampilan Dashboard Utama Telemetri Real-Time Stasiun Cuaca Agrinex.*

### Modul-Modul Utama Dashboard:
1. **Header Stasiun & Live Clock:** Menampilkan identitas stasiun ("Kelurahan Kuningan, Kecamatan Kuningan"), elevasi rujukan (560 mdpl), penunjuk waktu nyata (*LiveClock*), dan tombol menu navigasi.
2. **Indikator Aliran Data Ganda (*Dual-Stream Indicator*):** Menampilkan latensi koneksi HTTP polling lokal (misal: `64ms`) dan tombol alih ke mode *Cloud Stream* (Firestore).
3. **Termometer Lingkaran Neumorphic (*ArcGauge*):** Menampilkan visualisasi suhu udara dalam bentuk gauge busur melingkar bergradasi warna halus lengkap dengan status kenyamanan ambien.
4. **Kartu Pemantau Baterai LiFePO4 (*BatteryCard*):** Menampilkan status kapasitas baterai (%), sisa kapasitas dalam Ah ($30\text{ Ah}$ nominal), tegangan sel riil dari INA226 (misal: $3.55\text{ V}$), arus pengisian/beban surya ($mA$), dan estimasi durasi pengisian penuh.
5. **Kartu Metrik Instan:** Menampilkan nilai real-time Kelembapan Relatif ($RH$), Kecepatan Angin ($km/jam$ dan $m/s$), serta Intensitas Cahaya ($Lux$).
6. **Kalkulator Terintegrasi FAO-56 ETo (*EtoWidget*):** Menampilkan estimasi kehilangan air harian acuan secara otomatis berdasarkan kombinasi data sensor terkini.

---

## 4.6 Layar 4: Matriks Komparasi Nilai Ekstrem & Model Prakiraan BMKG

Modul komparasi mengevaluasi rentang dinamika cuaca harian dan menyelaraskan data sensor terhadap model atmosfer resmi BMKG:

![Tampilan Matriks Ekstrem dan Prakiraan](./assets/ui_04_dashboard_extremes_and_forecast.png)
*Gambar 4.4: Matriks Komparasi Nilai Ekstrem Harian dan Prakiraan Cuaca Sinkron BMKG.*

### Fitur Analisis Komparasi:
1. **Kartu Nilai Ekstrem Harian (*Extremes Comparison*):** Menyajikan perbandingan Suhu Maksimum/Minimum ($T_{\max}, T_{\min}$), Kelembapan Ekstrem ($RH_{\max}, RH_{\min}$), dan Kecepatan Angin Puncak (*Peak Gust*) antara data stasiun vs model BMKG dalam 24 jam terakhir.
2. **Matriks Prakiraan Jam-ke-Jam (*Forecast Comparison Matrix*):** Tabel komparasi deret waktu yang menyelaraskan pembacaan sensor lapangan dengan interval prakiraan BMKG setiap 3 jam, memudahkan inspeksi anomali cuaca mikro di tingkat kebun.

---

## 4.7 Layar 5: Tabel Log Telemetri Real-Time & Riwayat Observasi

Tabel log telemetri menyajikan catatan historis data mentah yang direkam stasiun untuk audit agrometeorologi:

![Tampilan Tabel Log Telemetri](./assets/ui_05_dashboard_telemetry_table.png)
*Gambar 4.5: Tabel Log Telemetri Real-Time dengan Indikator Status Sensor.*

### Fitur Manajemen Log:
1. **Perekaman Tabular Real-Time:** Menampilkan cap waktu (*timestamp*), suhu terkalibrasi, kelembapan, radiasi surya, kecepatan angin, dan tegangan catu daya secara terstruktur.
2. **Badge Status Validitas Sensor:** Setiap baris dilengkapi label status sensor (misal: `Normal`, `Warning`, `Offline`) untuk deteksi dini malfungsi instrumen.
3. **Paginasi & Kontrol Tampilan:** Dilengkapi kontrol navigasi halaman data dan indikator kapasitas log lokal yang disimpan di memori IndexedDB browser.

---

## 4.8 Layar 6: Visualisasi Deret Waktu Recharts Multi-Skala

Grafik tren cuaca dibangun menggunakan pustaka Recharts dengan optimasi rendering koordinat SVG:

![Tampilan Grafik Tren Deret Waktu](./assets/ui_06_chart_trends.png)
*Gambar 4.6: Visualisasi Tren Deret Waktu Recharts dengan Filter Skala Waktu Responsif.*

### Spesifikasi Teknis Grafik:
1. **Kalibrasi Viewport & Presisi Sumbu Y:**  
   Untuk menjamin seluruh rentang numerik kecepatan angin ($0 - 50\text{ m/s}$) dan suhu tertampung utuh dalam batas render SVG tanpa terpotong (*zero-clipping*), kontainer Recharts dikalibrasi dengan margin kiri `left: 4px` dan parameter lebar sumbu tetap `width={48}`.
2. **Tab Selektor Temporal Responsif:**  
   Pilihan jendela agregasi waktu menggunakan format responsif berbobot rendah: `[ 1J | 24J | 7H | 30H ]`. Pada resolusi tablet 3-kolom, tab ini mengonsumsi lebar optimal $\approx 95\text{ px}$, mencegah terjadinya pembungkusan teks (*text wrapping*) maupun *overflow* terhadap batas kontainer Neumorphic.
3. **Tooltip Interaktif Berbasis Satuan Fisik:**  
   Interaksi kursor (*hover/touch*) memicu tooltip Neumorphic mengambang yang menyajikan label waktu terindeks dan satuan fisik riil (`°C`, `%`, `m/s`).

---

## 4.9 Layar 7: Panel Analitik & Evaluasi Metrik Galat BMKG

Panel analitik menyajikan evaluasi statistik mendalam mengenai deviasi data stasiun terhadap model rujukan BMKG:

![Tampilan Panel Analitik dan KPI](./assets/ui_07_analytics_kpi_overview.png)
*Gambar 4.7: Panel Analitik Agroklimat dan Evaluasi Metrik Statistik Galat BMKG.*

### Fitur Evaluasi Statistik:
1. **Grid Indikator Kinerja Utama (KPI Grid):** Menampilkan metrik validasi standar WMO secara langsung:
   - *Root Mean Square Error* ($RMSE$) untuk mengukur magnitudo galat kuadratik.
   - *Mean Absolute Error* ($MAE$) untuk mengukur deviasi rata-rata absolut.
   - *Mean Absolute Percentage Error* ($MAPE$) untuk mengukur persentase galat relatif.
   - Koefisien Korelasi Pearson ($r$) dan *Willmott Index of Agreement* ($d$) untuk membuktikan keselarasan pola kurva diurnal.
2. **Status Validasi Akurasi:** Menampilkan lencana kepatuhan standar akurasi meteorologi (misal: "Sesuai Standar WMO $\pm 0.5^\circ\text{C}$").

---

## 4.10 Layar 8: Panel Rekomendasi Agro-Iklim & Peringatan Dini Penyakit

Panel rekomendasi agronomi menerjemahkan data mentah mikroklimat menjadi instruksi praktis bagi pengelola lahan pertanian:

![Tampilan Rekomendasi Agro-Iklim](./assets/ui_08_analytics_advisory_panel.png)
*Gambar 4.8: Panel Rekomendasi Agro-Iklim dan Deteksi Dini Risiko Hama/Penyakit Tanaman.*

### Fitur Penasihat Agronomi Cerdas:
1. **Deteksi Dini Risiko Infeksi Jamur (*Fungal Disease Risk Alert*):** Menganalisis durasi kelembapan relatif tinggi ($RH > 85\%$) yang bertepatan dengan suhu $20 - 26^\circ\text{C}$ untuk memperingatkan potensi serangan jamur bercak daun (*late blight*) atau blas padi.
2. **Analisis Defisit Tekanan Uap Kanopi (*VPD Advisory*):** Menilai apakah laju transpirasi tanaman berada pada zona optimal ($0.8 - 1.2\text{ kPa}$) atau mengalami stres kekeringan/kejenuhan uap.
3. **Rekomendasi Debit Irigasi Presisi:** Memberikan estimasi kebutuhan volume air siram harian (liter/m² atau m³/hektar) berbasis komputasi evapotranspirasi acuan $ET_0$.

---

## 4.11 Layar 9: Modal Diagnostik Status Modul & Bus Periferal Hardware

Modal diagnostik menyediakan fasilitas uji kesehatan perangkat keras secara langsung melalui jaringan:

![Tampilan Modal Diagnostik Modul](./assets/ui_09_module_diagnostics_modal.png)
*Gambar 4.9: Antarmuka Diagnostik Status Kesehatan 6 Modul Hardware dan Bus Komunikasi.*

### Fitur Pengujian Hardware:
1. **Uji Integritas 6 Modul Sensor:** Menampilkan status konektivitas perangkat keras secara individual: Sensor Suhu/RH DHT22, Sensor Cahaya BH1750, Sensor Daya INA226, Modul RTC DS3231, Modul Kartu SD, dan Anemometer.
2. **Verifikasi Bus Komunikasi:** Menguji keandalan bus I2C (deteksi alamat `0x23`, `0x40`, `0x68`) dan bus SPI kartu SD.
3. **Telemetri Sistem Tertanam:** Memantau kapasitas memori heap bebas ESP32 (*Free Heap RAM*), waktu aktif operasional (*Uptime* dalam detik), serta kekuatan sinyal Wi-Fi (*RSSI dBm*).

---

## 4.12 Layar 10: Pengaturan Tab 1  -  Modul Hardware & Konfigurasi Pinout GPIO

Tab modul dan pinout memungkinkan penyesuaian penugasan pin mikrokontroler secara nirkabel tanpa perlu me-reflash firmware melalui kabel serial:

![Tampilan Pengaturan Tab 1 Modul](./assets/ui_10_settings_tab1_modules.png)
*Gambar 4.10: Konfigurasi Tipe Papan Mikrokontroler dan Pemetaan Pinout GPIO.*

### Fitur Konfigurasi Pinout:
1. **Selektor Arsitektur Papan:** Mendukung pemilihan arsitektur mikrokontroler target antara **ESP32 DevKit v1** (default) dan **NodeMCU v2 (ESP8266)**.
2. **Pemetaan GPIO Fleksibel:** Pengaturan nomor pin GPIO untuk data DHT22, interupsi anemometer, jalur I2C SDA/SCL, dan jalur SPI Chip Select (CS) kartu SD.
3. **Toggle Modul Terpasang:** Administrator dapat mengaktifkan atau menonaktifkan modul tertentu (misal: menonaktifkan kartu SD jika stasiun beroperasi tanpa modul SD eksternal).

---

## 4.13 Layar 11: Pengaturan Tab 2  -  Backend Protokol & Parameter Kalibrasi Sensor

Tab backend mengatur protokol komunikasi stasiun dan matriks kalibrasi fisik sensor:

![Tampilan Pengaturan Tab 2 Backend](./assets/ui_11_settings_tab2_backend.png)
*Gambar 4.11: Konfigurasi Protokol Komunikasi Backend dan Matriks Offset Kalibrasi.*

### Fitur Kalibrasi & Protokol:
1. **Pemilihan Protokol Backend:** Mendukung pengalihan mode transmisi data antara **HTTP REST API**, **MQTT Broker**, dan **Direct Firebase Firestore**.
2. **Kompensasi Termal PCB DHT22:** Input parameter offset suhu $\Delta T$ (default: $-4.8^\circ\text{C}$) dan offset kelembapan $\Delta RH$ (default: $+14\%$) untuk mengompensasi disipasi panas sirkuit regulator daya mikrokontroler.
3. **Filter Noise Gate Anemometer:** Pengaturan ambang frekuensi pulsa (Hz) minimum agar getaran mekanis tiang saat angin tenang ($0\text{ m/s}$) tidak terhitung sebagai hembusan angin semu.

---

## 4.14 Layar 12: Pengaturan Tab 3  -  Sinkronisasi Jaringan Wi-Fi & Cloud

Tab sinkronisasi mengelola parameter konektivitas nirkabel dan jadwal transmisi telemetri:

![Tampilan Pengaturan Tab 3 Sinkronisasi](./assets/ui_12_settings_tab3_sync.png)
*Gambar 4.12: Pengaturan Kredensial Jaringan Wi-Fi dan Interval Pengiriman Telemetri.*

### Fitur Pengaturan Jaringan:
1. **Konfigurasi Wi-Fi Lapangan:** Pengaturan SSID stasiun dan kata sandi WPA2/WPA3 jaringan nirkabel kebun.
2. **Interval Pengambilan Sampel Sensor:** Menetapkan frekuensi pembacaan sensor oleh FreeRTOS Core 1 (rentang: 2 hingga 60 detik).
3. **Interval Publikasi Cloud:** Menetapkan frekuensi pengunggahan rata-rata telemetri ke server cloud Firestore (rentang: 1 hingga 60 menit) untuk menghemat konsumsi energi baterai surya.

---

## 4.15 Layar 13: Pengaturan Tab 4  -  Pusat Ekspor Data Agrikultur

Tab ekspor data menyediakan utilitas pengunduhan berkas konfigurasi firmware dan kumpulan data telemetri historis:

![Tampilan Pengaturan Tab 4 Ekspor](./assets/ui_13_settings_tab4_export.png)
*Gambar 4.13: Pusat Ekspor Data Agrikultur dan Manajemen Berkas Konfigurasi LittleFS.*

### Fitur Pusat Ekspor:
1. **Unduh Berkas `config.json`:** Mengunduh seluruh konfigurasi stasiun dalam format JSON baku untuk langsung diunggah ke partisi memori LittleFS ESP32.
2. **Unggah & Pulihkan Konfigurasi:** Mengunggah berkas `config.json` eksternal untuk menduplikasi pengaturan ke stasiun cuaca baru dalam hitungan detik.
3. **Ekspor Telemetri ke CSV / JSON:** Mengekspor seluruh riwayat pencatatan sensor ke format tabel CSV (*Comma Separated Values*) yang kompatibel dengan Microsoft Excel, RStudio, SPSS, atau pustaka Python Pandas untuk keperluan pengolahan data penelitian lanjutan.

---

## 4.16 Layar 14: Pengaturan Tab 5  -  Manajemen Pengguna Inline & Keamanan RBAC

Tab pengguna mengimplementasikan kontrol akses berbasis peran (*Role-Based Access Control*) secara bersih dan aman:

![Tampilan Pengaturan Tab 5 Pengguna](./assets/ui_14_settings_tab5_users.png)
*Gambar 4.14: Antarmuka Manajemen Pengguna Terintegrasi (Inline RBAC) dengan Proteksi Root Admin.*

### Fitur Manajemen Pengguna:
1. **Antarmuka Perluasan Dalam-Halaman (*Inline Expansion UI*):**  
   Saat tombol `Tambah Pengguna` ditekan, formulir input terbuka langsung di atas daftar pengguna tanpa menggunakan dialog modal sembul (*popup*) maupun lapisan penutup gelap (*no backdrop overlay*), menjaga visibilitas konteks stasiun cuaca.
2. **Akun Root Seeder Admin Terproteksi:**  
   Sistem menyematkan akun administrator bawaan atas nama **Haikal Jibran Al-Ghiffarry** (`admin@agrinex.id`). Akun ini memiliki proteksi permanen (*system-locked*) di mana tombol hapusnya dinonaktifkan agar stasiun cuaca tidak pernah kehilangan akses administratif.
3. **Pemberian Hak Akses Berjenjang:**  
   Administrator dapat menambahkan operator baru dengan peran **Administrator**, **Agronomist**, atau **Field Officer**. Akun yang baru didaftarkan langsung tersinkronisasi ke memori otentikasi lokal stasiun dan dapat langsung digunakan untuk login di lapangan.
4. **Tombol Pulihkan Pengguna Pabrik (*Reset to Factory Users*):**  
   Menyediakan fungsi pemulihan darurat untuk mengembalikan daftar akun ke kondisi default dengan akun seeder admin utama.
