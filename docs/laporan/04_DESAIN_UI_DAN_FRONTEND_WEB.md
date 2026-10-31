# BAB IV: ARSITEKTUR FRONTEND, SISTEM UI NEUMORPHIC & MANAJEMEN AUTENTIKASI

---

## 4.1 Filosofi Desain Neumorphic Modern (Soft UI)

Antarmuka pengguna (*User Interface / UI*) stasiun cuaca Agrinex dirancang secara khusus untuk kebutuhan observasi lapangan di lingkungan terbuka (*outdoor agricultural monitoring*). Sebagian besar aplikasi pemantauan modern menggunakan tema gelap (*dark mode*) yang sulit dibaca di bawah paparan sinar matahari terik, atau tema putih murni (`#ffffff`) yang menyilaukan mata dan melelahkan petani/agronomis.

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
    │   ├── neumorphic/          # Komponen Dasar (Card, Gauge, ChartWidget)
    │   └── settings/            # Modul Pengaturan (Modules, Sync, Users)
    └── views/                   # Tampilan Halaman (Dashboard, Analytics, Settings, Login, Onboarding)
```

---

## 4.3 Arsitektur Autentikasi & Kontrol Akses Berbasis Peran (RBAC)

Antarmuka autentikasi stasiun cuaca direkayasa menggunakan pendekatan kartu tunggal ringkas (*compact single-card*, `max-w-xs`), berfokus pada efisiensi akses operasional lapangan dengan mematuhi standar keamanan perangkat lunak.

![Tampilan Halaman Login Ultra-Minimalis](./assets/01_login_page.png)

### 4.3.1 Spesifikasi Formulir Autentikasi & Proteksi Kredensial

Dalam evaluasi rancang bangun antarmuka, subsistem formulir login mengimplementasikan parameter teknis berikut:

1. **Konfigurasi Input Kredensial Murni (*Zero-State Input Specification*):**  
   Elemen masukan `Email` dan `Kata Sandi` dikonfigurasi secara ketat tanpa teks contoh bawaan (`placeholder=""`) dan status awal komponen (*initial state*) diinisialisasi dalam bentuk string kosong (`''`). Penerapan isolasi masukan ini bertujuan mencegah kebocoran informasi (*information disclosure mitigation*) terkait struktur domain atau penamaan akun stasiun pada perangkat terminal lapangan yang digunakan secara bersama (*shared field devices*).

2. **Mesin Deteksi Peran Otomatis (*Auto-Role Detection Engine*):**  
   Untuk meminimalkan beban kognitif operator (*cognitive load reduction*) serta meniadakan kerentanan pemalsuan hak akses di sisi klien (*client-side role tampering*), antarmuka meniadakan pemilih peran manual. Penentuan hak akses (*Role-Based Access Control / RBAC*) dieksekusi secara otomatis dan deterministik saat kredensial divalidasi oleh sistem:
   - **Kredensial Administratif (`admin`, `ghiffa`, atau `haikal`):**  
     $\implies$ Diberikan hak **Administrator** (Akses penuh ke konfigurasi perangkat keras, pemetaan pinout GPIO, kalibrasi sensorik, dan manajemen akun pengguna).
   - **Kredensial Agroklimat (`agro` atau `pakar`):**  
     $\implies$ Diberikan hak **Agronomist** (Akses terfokus pada analitik perbandingan model BMKG, pemodelan kurva evapotranspirasi $ET_0$, analisis defisit tekanan uap VPD, dan telaah log historis).
   - **Kredensial Operasional Umum:**  
     $\implies$ Diberikan hak **Field Officer / Petugas Lapang** (Akses operasional pemantauan telemetri *real-time* dan pelaporan status sensor).

---

## 4.4 Arsitektur Sesi Persisten Terverifikasi (Session Resilience & Multi-Tier Auth)

Untuk menjamin ketersediaan akses dashboard pada stasiun cuaca yang beroperasi di lingkungan agrikultur terisolasi (*isolated/intermittent connectivity*), arsitektur sesi dirancang independen terhadap siklus sinkronisasi eksternal.

### 4.4.1 Evaluasi Karakteristik Sinkronisasi Sesi
Pada aplikasi web satu halaman (*single-page application* / SPA), mekanisme pendengar status asinkron standar (*asynchronous auth state observer*) umumnya memicu status awal bernilai `null` sebelum resolusi penyimpanan peramban selesai:

```ts
// Evaluasi Alur Listener Asinkron Standar:
onAuthStateChanged(auth, (fbUser) => {
  if (fbUser) {
    this.setUser(mappedUser);
  } else if (!this.currentUser?.isDemo) {
    this.setUser(null); // Menghapus sesi jika jaringan eksternal belum siap
  }
});
```

Karakteristik propagasi `null` sesaat tersebut berpotensi menyebabkan deregistrasi sesi lokal (*session drops*) pada kondisi jaringan lokal tanpa akses internet publik.

### 4.4.2 Implementasi Sesi Deterministik 30 Hari & Inisialisasi Sinkron State
Sistem mengimplementasikan struktur sesi independen pada modul [`AuthService.ts`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/web/src/core/services/AuthService.ts):

```ts
export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number; // Masa berlaku 30 Hari
}
```

1. **Inisialisasi Sinkron pada React State:**  
   Pada `App.tsx`, state pengguna dimuat secara sinkron dari penyimpanan lokal terverifikasi sebelum siklus render pertama dieksekusi:
   ```tsx
   const [user, setUser] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
   ```
   Hal ini menjamin status otentikasi langsung tersedia tanpa memicu peralihan sementara (*screen flickering*) ke halaman login.
2. **Isolasi Terhadap Callback Asinkron:**  
   Resolusi status lokal diproteksi terhadap fluktuasi koneksi jaringan awan, sehingga stasiun tetap dapat diakses penuh dalam jaringan lokal tertutup.
3. **Terminasi Sesi Eksplisit:**  
   Penghapusan token otentikasi hanya dieksekusi melalui aksi keluar (*explicit logout*) yang diinisiasi oleh pengguna terotentikasi.

---

## 4.5 Onboarding Setup Wizard Sekali Pakai (*Run-Once Setup*)

Bagi stasiun cuaca yang baru pertama kali dinyalakan atau belum dikonfigurasi, sistem menyediakan wizard penyiapan terpandu berdesain kartu tunggal terpusat 5-langkah:

![Tampilan Onboarding Wizard](./assets/07_onboarding_wizard.png)

### Tahapan Konfigurasi:
1. **Langkah 1: Identitas Stasiun:** Penamaan stasiun dan penetapan elevasi lokal (Kuningan, 560 mdpl).
2. **Langkah 2: Konfigurasi Wi-Fi:** Pengaturan SSID dan kata sandi jaringan nirkabel lapangan.
3. **Langkah 3: Uji Koneksi Sensor:** Menguji respons perangkat keras via endpoint `/api/sensors`.
4. **Langkah 4: Kalibrasi Awal:** Pengisian parameter offset termal DHT22 dan *noise gate* anemometer.
5. **Langkah 5: Finalisasi & Flashing LittleFS:** Mengirimkan payload JSON konfigurasi ke endpoint `/api/config` ESP32 untuk disimpan permanen ke LittleFS.

### Jaminan Sekali Pakai (*Run-Once Guarantee*):
Begitu penyiapan selesai atau pengguna berhasil login, kunci `agrinex_onboarding_completed = 'true'` disimpan di storage permanen. Pengguna tidak akan pernah dialihkan kembali ke halaman onboarding saat me-refresh browser.

---

## 4.6 Dashboard Real-Time & Kartu Telemetri Lapangan

Dashboard utama menyajikan visualisasi data cuaca mikroklimat yang padat informasi, bersih, dan mudah dipahami:

![Tampilan Dashboard Utama](./assets/02_dashboard_overview.png)

### Modul-Modul Utama Dashboard:
1. **Header Lokasi & Waktu:** Menampilkan nama wilayah ("Kelurahan Kuningan, Kecamatan Kuningan"), elevasi acuan (560 mdpl), serta waktu sinkronisasi data terkini.
2. **Pemilih Aliran Data (*Dual-Stream Indicator*):** Menampilkan latensi aktual koneksi HTTP polling lokal (misal: `40ms`) dan tombol alih ke mode *Cloud Stream*.
3. **Termometer Lapangan Neumorphic:** Menampilkan suhu udara dalam bentuk *gauge* busur melingkar bergradasi halus dengan status ambien ("Normal").
4. **Status Daya & Baterai LiFePO4:** Menampilkan persentase kapasitas baterai, sisa daya dalam Ah ($30\text{ Ah}$ nominal), tegangan sel riil dari INA226 (misal: $3.55\text{ V}$), arus pengisian/beban surya ($mA$), serta estimasi waktu pengisian penuh dari panel surya TP5000.
5. **Kartu Sensor Cepat:** Kelembapan Relatif ($RH$), Kecepatan Angin ($km/jam$), dan Intensitas Cahaya ($Lux$).
6. **Kalkulator Terintegrasi FAO-56 ETo:** Menampilkan estimasi kehilangan air harian acuan secara otomatis berdasarkan kombinasi data sensor terkini.

---

## 4.7 Visualisasi Deret Waktu Recharts & Optimasi Viewport Sumbu Y

Sistem menyajikan tiga grafik deret waktu (*time-series*) yang mengomparasikan sensor fisik mikroklimat terhadap model atmosfer resmi BMKG:

![Tampilan Grafik Tren Cuaca](./assets/03_chart_trends.png)

![Tampilan Analisis Tren Komprehensif](./assets/04_analytics_view.png)

### Spesifikasi Teknis Rendering Grafik ([`ChartWidget.tsx`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/web/src/presentation/components/neumorphic/ChartWidget.tsx)):
1. **Kalibrasi Viewport & Presisi Sumbu Y:**  
   Untuk menjamin seluruh rentang numerik kecepatan angin ($0 - 50\text{ m/s}$) dan suhu tertampung utuh dalam batas render SVG tanpa terpotong (*zero-clipping*), kontainer Recharts dikalibrasi dengan margin kiri `left: 4px` dan parameter lebar sumbu tetap `width={48}`.
2. **Tab Selektor Temporal Responsif:**  
   Pilihan jendela agregasi waktu menggunakan format responsif berbobot rendah: `[ 1J | 24J | 7H | 30H ]`. Pada resolusi tablet 3-kolom, tab ini mengonsumsi lebar optimal $\approx 95\text{ px}$, mencegah terjadinya pembungkusan teks (*text wrapping*) maupun *overflow* terhadap batas kontainer Neumorphic.
3. **Tooltip Interaktif Berbasis Satuan Fisik:**  
   Interaksi kursor (*hover/touch*) memicu tooltip Neumorphic mengambang yang menyajikan label waktu terindeks dan satuan fisik riil (`°C`, `%`, `m/s`).

---

## 4.8 Arsitektur Manajemen Pengguna Non-Modal (*Inline Expansion*)

Modul pengelolaan pengguna pada tab **`5. Pengguna`** menerapkan pola antarmuka perluasan dalam-halaman (*Inline Expansion UI*), meniadakan penggunaan dialog modal sembul (*non-modal architecture*) maupun lapisan latar penutup gelap (*backdrop-free*). Pendekatan ini menjaga kesinambungan visual konteks telemetri stasiun cuaca saat administrator melakukan pembaruan profil pengguna.

![Tampilan Tab Kelola Pengguna Inline](./assets/05_settings_users.png)

![Tampilan Kalibrasi Sensor dan Pengaturan Hardware](./assets/06_settings_calibration.png)

### Karakteristik Desain Pengguna Inline ([`UserManagementSection.tsx`](file:///home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/web/src/presentation/components/settings/UserManagementSection.tsx)):
1. **Integrasi Langsung dalam Halaman (*In-Page Expansion*):**  
   Saat tombol **`Tambah Pengguna`** atau ikon **Edit** ditekan, formulir input terbuka secara mulus langsung di atas daftar pengguna dalam kontainer *neo-pressed* 2-kolom yang proporsional.
2. **Akun Seeder Utama Bawaan (`admin@agrinex.id`):**  
   Sistem secara otomatis menginjeksi 1 akun seeder admin superuser dengan nama `Haikal Jibran Al-Ghiffarry` dan peran `Administrator`. Kredensial bawaan: kata sandi `admin` atau `agrinex2026`.
3. **Mekanisme Perlindungan Keamanan (*Safety Guards*):**  
   - Akun seeder utama diberi label khusus `Seeder` dan tombol hapusnya dinonaktifkan secara permanen agar stasiun cuaca tidak pernah kehilangan akses administrator.
   - Akun yang sedang aktif digunakan login diberi penanda `Anda (Aktif)` dan tidak dapat dihapus oleh diri sendiri.
4. **Tombol Pulihkan Seeder (*Reset Seeder*):**  
   Menyediakan tombol darurat untuk mereset seluruh daftar pengguna kembali ke kondisi pabrik dengan 1 akun seeder admin awal.
5. **Sinkronisasi Otentikasi Instan:**  
   Setiap akun baru yang ditambahkan langsung tersimpan ke memori otentikasi lokal stasiun (`agrinex_registered_users`), sehingga akun tersebut dapat langsung digunakan untuk masuk melalui halaman login.
