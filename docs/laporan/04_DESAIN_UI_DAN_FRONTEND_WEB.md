# BAB IV: DOKUMENTASI LENGKAP ANTARMUKA PENGGUNA (WEB UI), SISTEM NEUMORPHIC & MANAJEMEN AUTENTIKASI

---

## 4.1 Filosofi Desain Neumorphic Modern (Soft UI)

Antarmuka pengguna (*User Interface / UI*) stasiun cuaca Agrinex dirancang secara khusus untuk memenuhi tuntutan observasi lingkungan pertanian terbuka (*outdoor agricultural monitoring*). Sebagian besar aplikasi pemantauan modern menggunakan tema gelap (*dark mode*) yang memiliki keterbacaan sangat rendah di bawah terik sinar matahari akibat tingginya refleksi layar, atau tema putih murni (`#ffffff`) dengan kontras tajam yang menyilaukan mata dan memicu kelelahan visual (*eye fatigue*) operator saat melakukan pengamatan jangka panjang di lapangan.

Sistem Agrinex mengimplementasikan filosofi desain **Neumorphic Modern (Soft UI)** dengan palet warna dasar abu-abu netral berkilau lembut (*soft extruded grey*, `#e6e9ef`):

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
1. **Sensasi Taktil Fisik (*Tactile Ergonomics*):** Memberikan ilusi visual bahwa elemen antarmuka (tombol kendali, panel sensor, bidang input) tercetak timbul secara fisik dari material cangkang perangkat stasiun cuaca, menyerupai panel instrumen laboratorium lapangan analog.
2. **Umpan Balik Visual Transisi Status (*State Transition Feedback*):** Elemen kontrol yang berada dalam status istirahat atau tidak aktif tampak timbul ke luar (*flat extruded*), sedangkan elemen yang sedang disentuh, ditekan, atau aktif beralih menjadi cekung ke dalam (*inset pressed*).
3. **Keterbacaan Optimal di Lingkungan Lapangan Terbuka:** Rasio kontras tipografi diselaraskan menggunakan gradasi warna teks Slate-800 (`#1e293b`) dan Slate-900 (`#0f172a`), menjamin teks dan angka telemetri terbaca dengan ketajaman tinggi meskipun layar tablet terkena pantulan sinar matahari langsung.

---

## 4.2 Arsitektur Frontend: React 19 + TypeScript + Tailwind CSS v4

Aplikasi dashboard web stasiun cuaca Agrinex dibangun dengan fondasi arsitektur perangkat lunak modular (*Clean Component Hierarchy*):

```
web/src/
├── core/                        # Domain Layer (Independen dari Antarmuka UI)
│   ├── config/                  # Konfigurasi Layanan Firebase & Endpoint ESP32
│   ├── services/                # Layanan Inti (AuthService, TimeSeriesMatcher, Storage)
│   ├── types/                   # Definisi Kontrak Tipe Kuat TypeScript
│   └── utils/                   # Kalkulasi Fisika (FAO-56 ETo, Konversi Lux, Ekspor Data)
├── hooks/                       # Application Layer (Stateful Logic Hooks)
│   ├── useWeatherRealtime.ts    # Dual-Stream Realtime Polling & Cloud Fallback Engine
│   └── useComparativeAnalytics.ts # Mesin Agregasi Komparasi BMKG & Evaluasi Statistik WMO
└── presentation/                # Presentation Layer (UI Components & Views)
    ├── components/
    │   ├── atomic/              # Komponen Dasar UI (LiveClock, MetricCard, StatusRows)
    │   ├── dashboard/           # Modul Dashboard (Highlights, Extremes, LogTable)
    │   ├── analytics/           # Modul Analitik (KPI Grid, AgroClimate Advisory Panel)
    │   ├── neumorphic/          # Primitif Neumorphic (ArcGauge, Card, ChartWidget)
    │   └── settings/            # Modul Pengaturan (Modules, Sync, Users, Export Center)
    └── views/                   # Tampilan Halaman Utama (Dashboard, Analytics, Settings, Login, Onboarding)
```

---

## 4.3 Layar 1: Formulir Autentikasi Kredensial Lapangan

Antarmuka login dirancang dengan konsep kartu tunggal terpusat (*compact single-card*, `max-w-xs`), berfokus pada efisiensi akses di lapangan dengan kepatuhan ketat terhadap prinsip keamanan informasi dan isolasi masukan.

![Tampilan Halaman Login Ultra-Minimalis](assets/ui_01_login_page.png)
*Gambar 4.1: Antarmuka Login Kredensial Stasiun Cuaca Agrinex.*

### Spesifikasi Rinci Fitur Halaman Login:
1. **Konfigurasi Input Kredensial Murni (*Zero-State Input Specification*):**  
   Elemen masukan `Email` dan `Kata Sandi` dikonfigurasi secara ketat tanpa teks contoh bawaan (`placeholder=""`) dan status awal komponen (*initial state*) diinisialisasi dalam bentuk string kosong (`''`). Bidang masukan juga dilengkapi dengan atribut keamanan peramban `autoComplete="off"`, `autoCorrect="off"`, dan `spellCheck="false"`. Penerapan isolasi masukan ini mengacu pada standar keamanan OWASP (*Application Security Verification Standard*) guna memitigasi potensi kebocoran informasi (*information disclosure & credential enumeration*). Pada lingkungan operasional kebun pertanian terbuka di mana tablet pengamatan digunakan secara bergantian (*shared field devices*), ketiadaan teks placeholder mencegah pihak luar mengidentifikasi pola penamaan akun atau format domain stasiun internal. Bidang masukan memberikan umpan balik taktil digital berupa efek bayangan cekung (`--shadow-neo-pressed`) saat menerima fokus keyboard.

2. **Mesin Deteksi Peran Otomatis (*Auto-Role Detection Engine*):**  
   Sistem secara sengaja meniadakan selektor *dropdown* atau tombol manual pemilihan peran (*role selector*), guna mengeliminasi potensi manipulasi hak akses pada sisi klien (*client-side privilege escalation*). Komponen `AuthService.ts` mengevaluasi string kredensial secara deterministik pada saat proses validasi berlangsung dan memetakan pengguna ke dalam tiga tingkatan hak akses:
   - **Tingkat 1 - Administrator:** Diberikan apabila kredensial memuat identitas administratif (`admin`, `ghiffa`, atau `haikal`). Peran ini memiliki hak akses penuh (*root privileges*) terhadap seluruh subsistem, mencakup modifikasi pemetaan pinout GPIO mikrokontroler, penyesuaian koefisien kalibrasi sensor, pengubahan interval transmisi jaringan, manajemen partisi LittleFS, serta penambahan dan penghapusan akun pengguna operasional stasiun.
   - **Tingkat 2 - Agronomist (Pakar Agroklimat):** Diberikan apabila kredensial memuat kata kunci keahlian (`agro` atau `pakar`). Peran ini berfokus pada eksplorasi analitik agro-meteorologi, evaluasi deviasi prediksi model atmosfer BMKG, pemantauan kurva laju evapotranspirasi acuan FAO-56 ETo, tren akumulasi fluks radiasi surya, dan panel penasihat risiko penyakit tanaman (*AgroClimate Advisory*). Seluruh modul konfigurasi perangkat keras fisik dan manipulasi berkas sistem dikunci dalam status *read-only* atau disembunyikan.
   - **Tingkat 3 - Field Officer (Petugas Lapang):** Diberikan secara default kepada seluruh kredensial operasional umum. Hak akses dibatasi pada pemantauan visual telemetri *real-time* pada halaman Dashboard, pencatatan log observasi harian, pemantauan status kesehatan baterai surya LiFePO4, dan pengunduhan arsip data CSV untuk pelaporan manual tanpa wewenang mengubah konfigurasi stasiun.

3. **Mekanisme Otentikasi Bertingkat (*Dual-Engine Authentication Fallback*):**  
   Untuk menjamin stasiun cuaca tetap dapat dioperasikan pada lahan pertanian terpencil (*remote agricultural areas*) yang kerap mengalami kehilangan sinyal internet seluler secara berkepanjangan, arsitektur autentikasi mengimplementasikan sistem mesin ganda (*dual-engine*):
   - *Online Primary Engine:* Sistem mengarahkan validasi kredensial ke layanan Google Firebase Authentication melalui jalur HTTPS terenkripsi TLS 1.3. Jika koneksi cloud berhasil, token JWT sesi diterbitkan dan disinkronkan ke peramban.
   - *Offline Secondary Fallback Engine:* Apabila peramban mendeteksi status tanpa jaringan (`navigator.onLine === false`) atau transmisi HTTP Firebase mengalami *timeout* melampaui batas 3000 ms, sistem secara otomatis dan mulus (*seamless graceful fallback*) mengalihkan validasi ke tabel basis data kredensial lokal stasiun (`agrinex_registered_users`) yang tersimpan di memori terenkripsi peramban dan flash LittleFS. Teknisi lapangan tetap dapat mengakses dashboard stasiun secara instan melalui Access Point lokal (`Agrinex-AP`) tanpa ketergantungan pada konektivitas internet publik.
   - *Manajemen Sesi Persisten:* Setelah login berhasil, status sesi disimpan ke dalam penyimpanan `agrinex_auth_session` dan profil pengguna ke `agrinex_auth_user`. Ketika halaman dimuat ulang (*page refresh*) atau browser ditutup sementara, status autentikasi tetap terjaga (*zero session loss*), mencegah keharusan login berulang kali saat melakukan inspeksi fisik di kebun.

---

## 4.4 Layar 2: Onboarding Setup Wizard 5-Langkah Mandiri

Bagi unit stasiun cuaca yang baru pertama kali dinyalakan atau selesai menjalani proses pembaruan firmware secara menyeluruh, antarmuka menyajikan panduan konfigurasi terpandu dalam format kartu tunggal 5-langkah (*run-once setup wizard*):

![Tampilan Onboarding Wizard](assets/ui_02_onboarding_wizard.png)
*Gambar 4.2: Panduan Konfigurasi Awal Stasiun (Onboarding Wizard 5-Langkah).*

### Spesifikasi Rinci Tahapan Konfigurasi:
1. **Langkah 1: Identitas & Elevasi Topografis Stasiun:**  
   Pengguna menetapkan nama pengenal stasiun (*Station Identifier*, misalnya: `AGRINEX-KNG-01`), deskripsi lokasi lahan perkebunan, serta ketinggian topografis instalasi di atas permukaan laut (default Kabupaten Kuningan: 560 mdpl). Elevasi rujukan ($z$) merupakan variabel krusial dalam perhitungan tekanan atmosfer standar ($P = 101.3 \times ((293 - 0.0065 z)/293)^{5.26}\text{ kPa}$). Tekanan atmosfer ini secara langsung menentukan nilai konstanta psikrometrik lokal ($\gamma = 0.665 \times 10^{-3} P\text{ kPa}/^\circ\text{C}$) pada persamaan FAO-56 Penman-Monteith, sehingga penetapan elevasi yang presisi menjamin keakuratan estimasi kebutuhan air tanaman.

2. **Langkah 2: Konfigurasi Jaringan Nirkabel Wi-Fi Lapangan:**  
   Formulir input nama jaringan nirkabel (*SSID*) dan kunci keamanan WPA2/WPA3 router kebun. Masukan kata sandi dilengkapi tombol sakelar visibilitas teks berbasis SVG guna meminimalkan kesalahan pengetikan di lapangan. Wizard memvalidasi kelayakan kredensial dan mengirimkannya ke firmware mikrokontroler melalui endpoint HTTP POST `/api/config/wifi` untuk disimpan secara permanen di partisi memori flash LittleFS.

3. **Langkah 3: Uji Konektivitas Hardware & Diagnostik Bus Sensor:**  
   Proses pengujian interaktif yang mengirimkan permintaan *ping* diagnostik nirkabel ke endpoint `/api/sensors`. Antarmuka web membedah respons data telemetri dan memvalidasi kesiapan masing-masing modul fisik:
   - Deteksi komunikasi bus I2C terhadap alamat sensor daya INA226 (`0x40`), sensor radiasi surya BH1750 (`0x23`), dan pewaktu presisi RTC DS3231 (`0x68`).
   - Deteksi saluran pulsa interupsi GPIO optocoupler anemometer serta jalur data satu-kawat (*one-wire*) DHT22.  
   Layar menampilkan nilai latensi respons nirkabel (*round-trip time*) dalam milidetik dan lencana hijau (*Hardware Ready*) sebagai jaminan bahwa seluruh sensor berfungsi normal sebelum stasiun memasuki fase operasional penuh.

4. **Langkah 4: Kalibrasi Offset Termal & Noise Gate Anemometer:**  
   Penyetelan nilai kompensasi terhadap fenomena disipasi panas internal (*enclosure self-heating*). Pada enclosure tahan cuaca IP65, panas yang dilepaskan regulator tegangan AMS1117 dan mikrokontroler menyebabkan deviasi suhu udara lokal. Antarmuka menyediakan formulir kalibrasi offset suhu $\Delta T$ (default riset Kuningan: $-4.8^\circ\text{C}$) dan offset kelembapan relatif $\Delta RH$ (default: $+12\%$). Selain itu, dikonfigurasi pula batas ambang *noise gate* anemometer (default: $0.25\text{ m/s}$) guna membuang pulsa semu akibat getaran tiang stasiun saat kondisi angin tenang sempurna ($0\text{ m/s}$).

5. **Langkah 5: Komit Memori Flash LittleFS & Mekanisme Kunci Run-Once:**  
   Tahap final yang mengeksekusi penulisan seluruh parameter konfigurasi dari Langkah 1 hingga Langkah 4 ke dalam berkas non-volatile `/config.json` pada partisi memori flash LittleFS mikrokontroler melalui endpoint `/api/config`. Setelah mikrokontroler mengirimkan status konfirmasi sukses (`200 OK`), antarmuka web secara otomatis menuliskan penanda permanen `agrinex_onboarding_completed = true` ke dalam penyimpanan lokal peramban. Mekanisme ini memastikan bahwa pada setiap sesi pemuatan berikutnya, sistem akan langsung membuka Dashboard telemetri utama dan mengunci wizard agar tidak mengganggu operasional rutin.

---

## 4.5 Layar 3: Dashboard Utama Telemetri & Gauge Cuaca

Dashboard utama merupakan pusat kendali operasional yang menyajikan telemetri mikroklimat secara *real-time* dengan tata letak Neumorphic yang teratur, bersih, dan informatif:

![Tampilan Dashboard Utama Telemetri](assets/ui_03_dashboard_overview.png)
*Gambar 4.3: Tampilan Dashboard Utama Telemetri Real-Time Stasiun Cuaca Agrinex.*

### Spesifikasi Rinci Modul-Modul Dashboard:
1. **Header Stasiun & LiveClock Presisi:**  
   Menyajikan identitas administratif stasiun cuaca ("Kelurahan Purwawinangun, Kecamatan Kuningan"), koordinat lintang dan bujur, elevasi rujukan topografis (555 mdpl), serta penunjuk waktu nyata (*LiveClock*) dengan presisi detik yang disinkronkan secara periodik terhadap NTP server dan modul RTC DS3231 internal. Pada sisi kanan header disematkan tombol menu navigasi responsif untuk berpindah secara mulus ke tab Analitik dan Pengaturan.

2. **Indikator Aliran Data Ganda (*Dual-Stream Telemetry Engine*):**  
   Menampilkan metrik performa komunikasi jaringan berupa waktu bolak-balik transmisi data (*Round-Trip Time / RTT*) secara instan. Pada koneksi LAN/Wi-Fi lokal melalui mekanisme HTTP polling langsung ke mikrokontroler, indikator menunjukkan latensi sangat rendah (rata-rata 64 ms) dengan lencana hijau `Local REST`. Tombol toggle interaktif memungkinkan operator beralih ke mode `Cloud Stream` (Firestore WAN dengan latensi rata-rata 742 ms) saat melakukan pemantauan jarak jauh dari luar area perkebunan.

3. **Termometer Melingkar Neumorphic (*ArcGauge*):**  
   Komponen visualisasi suhu udara utama yang menggunakan busur lingkaran grafis vektor dinamis 270 derajat (SVG path interpolation). Menampilkan jarum penunjuk virtual dan gradasi warna latar belakang yang bertransisi halus: hijau sejuk ($<24^\circ\text{C}$), kuning hangat ($24 - 32^\circ\text{C}$), hingga merah menyengat ($>32^\circ\text{C}$). Di tengah busur ditampilkan nilai numerik suhu ambien dengan ketelitian 1 desimal, lengkap dengan label status kenyamanan iklim mikro tajuk tanaman ("Normal").

4. **Kartu Pemantau Catu Daya LiFePO4 (*BatteryCard*):**  
   Mengintegrasikan telemetri sistem daya otonom stasiun secara menyeluruh berbasis pengukuran IC sensor INA226. Menyajikan indikator persentase kapasitas baterai (*State of Charge / SoC*) menggunakan algoritma tabel pemetaan tegangan sel LiFePO4 non-linear, nilai tegangan sel riil (misal: $3.55\text{ V}$, rentang aman $2.8\text{ V} - 3.65\text{ V}$), sisa kapasitas arus terukur terhadap kapasitas nominal ($30\text{ Ah}$), arus pengisian dari panel surya 50Wp atau beban sistem ($mA$), serta estimasi durasi otonomi baterai (*time-to-empty / time-to-full*).

5. **Kartu Metrik Instan (RH, Kecepatan Angin, Intensitas Cahaya):**  
   Tiga panel pembacaan instan berdesain kartu Neumorphic timbul:
   - **Kelembapan Relatif ($RH$):** Menampilkan persentase saturasi uap air udara dari DHT22 setelah penerapan rumus kompensasi non-linear, disertai indikator titik embun (*dew point*) dan status kebasahan udara kanopi.
   - **Kecepatan Angin:** Menampilkan kecepatan aliran udara terukur dari sensor optocoupler anemometer dalam dua satuan standar ganda ($km/jam$ dan $m/s$) yang telah dikalibrasi menggunakan hukum logaritma profil angin Hellmann pada ketinggian tajuk standar 2 meter.
   - **Intensitas Radiasi Cahaya:** Menampilkan intensitas pencahayaan fotometri terukur dari sensor BH1750 dalam satuan Lux, yang secara simultan dikonversi menjadi ekuivalensi fluks radiasi gelombang pendek surya ($R_s$ dalam $W/m^2$ dan $MJ/m^2/hari$).

6. **Kalkulator Terintegrasi FAO-56 ETo (*EtoWidget*):**  
   Mengimplementasikan komputasi algoritma agrometeorologi persamaan FAO-56 Penman-Monteith secara *on-the-fly* pada sisi klien peramban. Widget ini memadukan data suhu udara, kelembapan relatif, radiasi surya netto, kecepatan angin pada ketinggian 2 meter, dan konstanta psikrometrik lokal Kuningan untuk menghasilkan estimasi laju kehilangan air harian acuan ($mm/hari$). Dilengkapi lencana interpretasi agronomi: Rendah ($<3\text{ mm/hari}$), Sedang ($3 - 5\text{ mm/hari}$), dan Tinggi ($>5\text{ mm/hari}$) sebagai pedoman jadwal irigasi presisi.

---

## 4.6 Layar 4: Matriks Komparasi Nilai Ekstrem & Model Prakiraan BMKG

Modul komparasi mengevaluasi rentang dinamika cuaca harian dan menyelaraskan data sensor terhadap model atmosfer resmi BMKG:

![Tampilan Matriks Ekstrem dan Prakiraan](assets/ui_04_dashboard_extremes_and_forecast.png)
*Gambar 4.4: Matriks Komparasi Nilai Ekstrem Harian dan Prakiraan Cuaca Sinkron BMKG.*

### Spesifikasi Rinci Fitur Analisis Komparasi:
1. **Kartu Nilai Ekstrem Harian (*Extremes Comparison Matrix*):**  
   Menyajikan perbandingan nilai puncak dalam siklus diurnal 24 jam terakhir antara observasi sensor fisik stasiun Agrinex berhadapan dengan model numerik cuaca BMKG wilayah Kuningan. Metrik yang dibandingkan mencakup Suhu Maksimum ($T_{\max}$), Suhu Minimum ($T_{\min}$), Kelembapan Maksimum ($RH_{\max}$), Kelembapan Minimum ($RH_{\min}$), dan Kecepatan Hembusan Angin Puncak (*Peak Wind Gust*). Setiap kartu menampilkan nilai selisih deviasi otomatis ($\Delta$) dengan kode warna: hijau untuk deviasi wajar ($<1.0^\circ\text{C}$), kuning untuk deviasi moderat ($1.0 - 2.5^\circ\text{C}$), dan merah untuk diskrepansi mikroklimat signifikan ($>2.5^\circ\text{C}$).

2. **Matriks Prakiraan Jam-ke-Jam (*Hourly Sync Table*):**  
   Tabel sinkronisasi deret waktu yang memetakan data observasi historis sensor stasiun ke dalam jendela interval waktu per 3 jam yang identik dengan jadwal pembaruan prakiraan resmi BMKG (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, dan 21:00 WIB). Kolom tabel menyajikan komparasi suhu udara, kelembapan relatif, deskripsi kualitatif cuaca (Cerah, Berawan, Hujan Ringan), dan ikon representasi visual kondisi atmosferik. Memudahkan agronomis mendeteksi fenomena mikroklimat lokal, seperti pemanasan kanopi yang lebih cepat di pagi hari atau kelembapan malam hari yang lebih tinggi dibandingkan stasiun synoptik regional.

---

## 4.7 Layar 5: Tabel Log Telemetri Real-Time & Riwayat Observasi

Tabel log telemetri menyajikan catatan historis data mentah yang direkam stasiun untuk audit agrometeorologi:

![Tampilan Tabel Log Telemetri](assets/ui_05_dashboard_telemetry_table.png)
*Gambar 4.5: Tabel Log Telemetri Real-Time dengan Indikator Status Sensor.*

### Spesifikasi Rinci Fitur Manajemen Log:
1. **Perekaman Tabular Multi-Parameter Komprehensif:**  
   Menyajikan seluruh paket rekaman telemetri dalam format tabel terstruktur. Setiap baris mencakup nomor urut data, stempel waktu ISO-8601 lokal berketelitian detik, suhu udara terkompensasi ($^\circ\text{C}$), kelembapan relatif ($RH\%$), intensitas cahaya ($Lux$), fluks radiasi surya ekuivalen ($W/m^2$), kecepatan aliran angin ($m/s$), tegangan baterai LiFePO4 ($V$), dan arus catu daya operasional ($mA$). Format tabular ini dirancang dengan gaya Neumorphic datar dengan pemisah baris halus untuk menjamin keterbacaan data log yang padat.

2. **Lencana Status Validitas Diagnostik Sensor (*Health Status Badges*):**  
   Setiap baris log dilengkapi lencana diagnostik interaktif berbasis algoritma validasi ambang batas (*threshold sanity check*). Lencana berwarna hijau (`Normal`) menandakan seluruh instrumen beroperasi dalam parameter fisis yang valid; lencana kuning (`Warning`) menandakan adanya pembacaan di luar ambang kewajaran (misalnya kelembapan $100\%$ konstan atau fluktuasi tegangan abnormal); sedangkan lencana merah (`Offline / Fault`) menandakan terjadinya kegagalan komunikasi bus I2C (NACK error) atau terputusnya pulsa sensor, memungkinkan isolasi kerusakan perangkat secara dini.

3. **Paginasi Dinamis & Manajemen Penyimpanan Lokal IndexedDB:**  
   Mengimplementasikan kontrol navigasi halaman data responsif (pilihan 10, 25, 50, atau 100 rekaman per halaman) guna mencegah penurunan performa rendering (*DOM memory bloat*) pada perangkat bergerak. Seluruh riwayat telemetri disimpan secara asinkron di dalam basis data IndexedDB peramban lokal, memungkinkan operator menelusuri ribuan data log observasi historis stasiun secara instan tanpa membutuhkan koneksi internet aktif.

---

## 4.8 Layar 6: Visualisasi Deret Waktu Recharts Multi-Skala

Grafik tren cuaca dibangun menggunakan pustaka Recharts dengan optimasi rendering koordinat SVG:

![Tampilan Grafik Tren Deret Waktu](assets/ui_06_chart_trends.png)
*Gambar 4.6: Visualisasi Tren Deret Waktu Recharts dengan Filter Skala Waktu Responsif.*

### Spesifikasi Rinci Teknis Grafik:
1. **Kalibrasi Viewport & Presisi Sumbu Y (*Zero-Clipping Architecture*):**  
   Untuk mengatasi kendala pemotongan digit angka puluhan pada label sumbu vertikal kecepatan angin ($0 - 50\text{ m/s}$) dan radiasi surya yang kerap terjadi pada komponen grafik web standar, kontainer Recharts dikalibrasi secara ketat dengan penambahan margin kiri `left: 4px` dan parameter lebar sumbu tetap `width={48}` pada komponen `ResponsiveContainer`. Kalibrasi koordinat ini menjamin seluruh label numerik tertampung utuh dalam kanvas SVG tanpa terpotong batas kartu Neumorphic.

2. **Tab Selektor Temporal Responsif Multi-Resolusi (`1J`, `24J`, `7H`, `30H`):**  
   Antarmuka menyediakan tombol tab selektor temporal berbobot ringan yang mengubah skala waktu dan resolusi agregasi data secara cerdas:
   - **1 Jam (`1J`):** Menampilkan data telemetri mentah dengan resolusi tinggi (sampling per 5 detik), ideal untuk menganalisis turbulensi sesaat dan lonjakan hembusan angin kencang (*wind gust spikes*).
   - **24 Jam (`24J`):** Menampilkan data agregasi rata-rata per 15 menit, menyajikan kurva fluktuasi siklus diurnal suhu, kelembapan, dan radiasi sepanjang satu siklus siang-malam penuh.
   - **7 Hari (`7H`):** Menampilkan tren mingguan nilai rata-rata, minimum, dan maksimum harian, berguna untuk evaluasi dinamika cuaca mingguan.
   - **30 Hari (`30H`):** Menampilkan ringkasan bulanan untuk menganalisis pergeseran pola agroklimat dan tren evapotranspirasi kumulatif lahan.  
   Pada layar tablet 3-kolom, tab ini mengonsumsi lebar optimal $\approx 95\text{ px}$, mencegah terjadinya pembungkusan teks (*text wrapping*) maupun pemotongan tepi kontainer (*horizontal overflow*).

3. **Tooltip Interaktif Berbasis Satuan Fisik & Pelacakan Kursor (*Crosshair Tracking*):**  
   Interaksi kursor atau sentuhan layar mengaktifkan tooltip Neumorphic mengambang yang menampilkan data tersinkronisasi dari seluruh sensor pada stempel waktu yang sama secara bersamaan. Nilai disajikan lengkap dengan satuan fisik baku ($^\circ\text{C}$, $\%$, $m/s$, $W/m^2$), memudahkan peneliti membandingkan hubungan korelatif antar-variabel, seperti penurunan kelembapan relatif yang bertepatan dengan kenaikan radiasi surya.

---

## 4.9 Layar 7: Panel Analitik & Evaluasi Metrik Galat BMKG

Panel analitik menyajikan evaluasi statistik mendalam mengenai deviasi data stasiun terhadap model rujukan BMKG:

![Tampilan Panel Analitik dan KPI](assets/ui_07_analytics_kpi_overview.png)
*Gambar 4.7: Panel Analitik Agroklimat dan Evaluasi Metrik Statistik Galat BMKG.*

### Spesifikasi Rinci Fitur Evaluasi Statistik:
1. **Grid Indikator Kinerja Utama Standar Organisasi Meteorologi Dunia (WMO):**  
   Menyajikan empat metrik evaluasi akurasi numerik baku untuk menguji keandalan model prakiraan makro BMKG terhadap hasil pengukuran sensor mikroklimat *in-situ* di Kabupaten Kuningan:
   - ***Root Mean Square Error* ($RMSE$):** Memberikan bobot penalti kuadratik terhadap galat ekstrem ($1.18^\circ\text{C}$ untuk suhu udara dan $5.62\%$ untuk kelembapan relatif). Nilai ini sangat krusial dalam mendeteksi anomali suhu tajuk tanaman saat terjadi radiasi matahari ekstrem di siang hari.
   - ***Mean Absolute Error* ($MAE$):** Mengukur magnitudo deviasi linier rata-rata antara model BMKG dan sensor fisik ($0.94^\circ\text{C}$ pada suhu dan $4.31\%$ pada kelembapan relatif).
   - ***Mean Absolute Percentage Error* ($MAPE$):** Menunjukkan persentase deviasi relatif rata-rata ($3.82\%$ untuk suhu dan $5.74\%$ untuk kelembapan), membuktikan bahwa galat model masih berada dalam batas toleransi operasional agrikultur presisi ($<10\%$).
   - **Koefisien Korelasi Pearson ($r$):** Mengukur keeratan hubungan linear dan keselarasan kurva diurnal ($r = 0.964$ untuk suhu dan $r = 0.941$ untuk kelembapan), membuktikan bahwa arah pergerakan dinamika atmosferik model BMKG berkorelasi positif sangat kuat terhadap kondisi nyata di lapangan.

2. **Panel Visualisasi Residual Deviasi Cuaca Mikro (*Microclimate Residual Graph*):**  
   Grafik deviasi selisih galat ($e_i = Y_{sensor} - \hat{Y}_{BMKG}$) yang memetakan kecenderungan bias model atmosfer synoptik. Analisis residual menunjukkan fenomena bahwa model BMKG cenderung memperkirakan suhu lebih rendah (*underestimating*) pada siang hari akibat kanopi tanaman yang menyerap panas radiasi surya lebih tinggi daripada udara bebas, serta memperkirakan suhu lebih tinggi (*overestimating*) pada malam hari akibat pelepasan radiasi terestrial yang cepat di area pegunungan Kuningan.

---

## 4.10 Layar 8: Panel Rekomendasi Agro-Iklim & Peringatan Dini Penyakit

Panel rekomendasi agronomi menerjemahkan data mentah mikroklimat menjadi instruksi praktis bagi pengelola lahan pertanian:

![Tampilan Rekomendasi Agro-Iklim](assets/ui_08_analytics_advisory_panel.png)
*Gambar 4.8: Panel Rekomendasi Agro-Iklim dan Deteksi Dini Risiko Hama/Penyakit Tanaman.*

### Spesifikasi Rinci Fitur Penasihat Agronomi Cerdas:
1. **Deteksi Dini Risiko Infeksi Jamur Patogen (*Fungal Disease Risk Alert*):**  
   Algoritma evaluasi simultan berbasis durasi pembasahan tajuk tanaman (*leaf wetness duration proxy*). Jika sensor mendeteksi kelembapan relatif $RH > 88\%$ berlangsung secara kontinu selama lebih dari 4 jam pada rentang suhu inkubasi jamur $22^\circ\text{C} - 28^\circ\text{C}$ (kondisi mikro optimal bagi perkecambahan spora hawar daun *Phytophthora infestans*, embun bulu, dan antraknosa), panel antarmuka mengaktifkan kartu peringatan bahaya (*Alert Warning*) berwarna jingga/merah disertai rekomendasi tindakan teknis berupa penyemprotan fungisida preventif dan perbaikan aerasi tajuk tanaman.

2. **Analisis Defisit Tekanan Uap Kanopi (*Vapor Pressure Deficit / VPD Advisory*):**  
   Menghitung selisih antara tekanan uap jenuh dan tekanan uap aktual udara ($VPD = e_s - e_a$) dalam satuan kiloPascal ($kPa$). Antarmuka mengelompokkan status transpirasi tanaman ke dalam tiga zona fisiologis:
   - **Zona Rendah ($<0.4\text{ kPa}$):** Udara terlalu jenuh air, laju transpirasi tanaman terhenti, penyerapan unsur hara kalsium dan boron melalui aliran transpirasi terhambat, dan risiko infeksi patogen jamur meningkat tajam.
   - **Zona Optimal ($0.8 - 1.2\text{ kPa}$):** Kondisi ideal di mana stomata daun terbuka sempurna, fotosintesis berlangsung maksimal, dan penyerapan hara berlangsung seimbang tanpa memicu stres air.
   - **Zona Kritis / Tinggi ($>1.6\text{ kPa}$):** Udara lingkungan terlalu kering dan panas, laju penguapan melebihi kapasitas absorbsi akar, memicu mekanisme proteksi tanaman berupa penutupan stomata (*water stress / wilting*).

3. **Penjadwalan Kebutuhan Air Irigasi Presisi (*Precision Irrigation Water Demand*):**  
   Menyajikan rekomendasi volume pasokan air irigasi harian yang harus diberikan ke lahan berdasarkan akumulasi nilai evapotranspirasi acuan $ET_0$ dikurangi curah hujan efektif, dikonversikan ke dalam satuan liter per meter persegi ($L/m^2$) dan meter kubik per hektar ($m^3/ha$). Membantu petani menghindari pemborosan air tanah (*over-irrigation*) maupun defisit air yang dapat menurunkan produktivitas panen.

---

## 4.11 Layar 9: Modal Diagnostik Status Modul & Bus Periferal Hardware

Modal diagnostik menyediakan fasilitas uji kesehatan perangkat keras secara langsung melalui jaringan:

![Tampilan Modal Diagnostik Modul](assets/ui_09_module_diagnostics_modal.png)
*Gambar 4.9: Antarmuka Diagnostik Status Kesehatan 6 Modul Hardware dan Bus Komunikasi.*

### Spesifikasi Rinci Fitur Pengujian Hardware:
1. **Matriks Uji Integritas 6 Modul Sensor Utama:**  
   Menyajikan status operasional individual dari seluruh komponen perangkat keras stasiun cuaca: Sensor Suhu/Kelembapan DHT22, Sensor Radiasi Cahaya BH1750, Sensor Monitor Daya INA226, Modul Pewaktu Nyata RTC DS3231, Modul Penyimpanan Kartu MicroSD, dan Sensor Kecepatan Angin Anemometer Optocoupler. Status disajikan dalam bentuk lencana visual hijau (*OK / Active*) atau merah (*Fail / Offline*), mempercepat proses lokalisasi modul yang mengalami kerusakan fisik di lapangan.

2. **Verifikasi Jalur Komunikasi Bus I2C & SPI (*Bus Integrity Verification*):**  
   Mekanisme pemindaian alamat aktif (*address polling check*) pada bus I2C stasiun cuaca. Menguji ketersediaan sinyal ACK (*Acknowledge*) dari alamat perangkat keras: `0x23` (BH1750), `0x40` (INA226), dan `0x68` (DS3231). Memeriksa ada tidaknya kondisi *bus lockup* akibat jalur SDA/SCL yang tertarik ke level rendah secara permanen oleh salah satu sensor yang rusak. Untuk modul kartu SD, antarmuka memeriksa keberhasilan inisialisasi bus SPI dan penerimaan respons instruksi *Command 0* (CMD0).

3. **Indikator Metrik Sistem Tertanam (*Embedded System Diagnostics*):**  
   Menampilkan telemetri kinerja internal mikrokontroler:
   - **Sisa Memori Dinamis Bebas (*Free Heap RAM*):** Memantau kapasitas RAM bebas ESP32 (misal: $184.2\text{ KB}$ dari total $320\text{ KB}$) atau ESP8266 (misal: $28.4\text{ KB}$) untuk mendeteksi potensi kebocoran memori (*memory leak*).
   - **Kekuatan Sinyal Nirkabel Wi-Fi (*RSSI*):** Mengukur tingkat daya sinyal yang diterima dalam satuan decibel-milliwatts (misal: $-62\text{ dBm}$ dengan klasifikasi *Good Connection*), krusial untuk mengevaluasi kualitas tautan radio di kebun.
   - **Penghitung Waktu Operasional (*Uptime Counter*):** Menampilkan durasi stasiun beroperasi tanpa henti sejak siklus penyalaan terakhir dalam format Hari, Jam, Menit, dan Detik untuk membuktikan stabilitas firmware stasiun.

---

## 4.12 Layar 10: Pengaturan Tab 1  -  Modul Hardware & Konfigurasi Pinout GPIO

Tab modul dan pinout memungkinkan penyesuaian penugasan pin mikrokontroler secara nirkabel tanpa perlu me-reflash firmware melalui kabel serial:

![Tampilan Pengaturan Tab 1 Modul](assets/ui_10_settings_tab1_modules.png)
*Gambar 4.10: Konfigurasi Tipe Papan Mikrokontroler dan Pemetaan Pinout GPIO.*

### Spesifikasi Rinci Fitur Konfigurasi Pinout:
1. **Selektor Arsitektur Papan Mikrokontroler (*Target Board Selector*):**  
   Mendukung pemilihan tipe mikrokontroler target antara **ESP32 DevKit v1** (arsitektur dual-core 32-bit dengan FreeRTOS) dan **NodeMCU v2 ESP8266** (arsitektur single-core 32-bit dengan penjadwal kooperatif). Saat tipe papan dialihkan, antarmuka secara otomatis menyesuaikan daftar nomor pin GPIO yang valid sesuai dengan matriks kapabilitas perangkat keras masing-masing papan pengembang.

2. **Pemetaan Penugasan Pin GPIO Fleksibel (*Dynamic Pinout Remapping*):**  
   Menyediakan formulir pemetaan pin fisik mikrokontroler untuk seluruh antarmuka periferal: jalur data satu-kawat DHT22, pin interupsi eksternal anemometer optocoupler, jalur komunikasi bus I2C SDA dan SCL, serta jalur SPI Chip Select (CS) modul kartu MicroSD. Fitur ini memberikan fleksibilitas luar biasa bagi teknisi lapangan; apabila salah satu pin GPIO mikrokontroler mengalami kerusakan akibat induksi petir atau tegangan lebih (*electrical overstress*), penugasan pin dapat dialihkan ke pin alternatif yang masih sehat secara nirkabel melalui antarmuka web tanpa perlu membongkar kode sumber firmware.

3. **Sakelar Seleksi Modul Periferal (*Hardware Feature Toggles*):**  
   Tombol sakelar Neumorphic interaktif untuk mengaktifkan atau menonaktifkan modul tertentu secara modular. Misalnya, teknisi dapat menonaktifkan modul sensor daya INA226 apabila stasiun dioperasikan menggunakan adaptor daya AC jala-jala PLN tanpa baterai, atau menonaktifkan modul kartu MicroSD apabila stasiun difokuskan murni pada transmisi data cloud Firestore. Menonaktifkan modul yang tidak terpasang mencegah firmware membuang waktu eksekusi CPU untuk menunggu *timeout* komunikasi periferal yang tidak merespons.

---

## 4.13 Layar 11: Pengaturan Tab 2  -  Backend Protokol & Parameter Kalibrasi Sensor

Tab backend mengatur protokol komunikasi stasiun dan matriks kalibrasi fisik sensor:

![Tampilan Pengaturan Tab 2 Backend](assets/ui_11_settings_tab2_backend.png)
*Gambar 4.11: Konfigurasi Protokol Komunikasi Backend dan Matriks Offset Kalibrasi.*

### Spesifikasi Rinci Fitur Kalibrasi & Protokol:
1. **Pemilihan Protokol Komunikasi Backend (*Dual-Protocol Backend Selection*):**  
   Mendukung pengalihan mode transmisi telemetri utama stasiun cuaca:
   - **HTTP REST API:** Mikrokontroler menjalankan server web embedded lokal, melayani permintaan polling data dari dashboard browser pada jaringan lokal perkebunan dengan latensi sangat rendah.
   - **Direct Firebase Firestore:** Mikrokontroler mengirimkan dokumen telemetri secara berkala langsung ke Google Cloud Firestore melalui protokol HTTPS terenkripsi menggunakan Firebase REST API dan Google Bearer Token.
   - **Dual-Mode Concurrent Stream:** Stasiun menjalankan kedua mode secara simultan, melayani observasi lokal *real-time* sekaligus mengarsipkan data ke cloud secara kontinu.

2. **Kompensasi Termal & Kelembapan Relatif Sensor DHT22:**  
   Formulir kalibrasi masukan offset suhu $\Delta T$ (default riset: $-4.8^\circ\text{C}$) dan offset kelembapan relatif $\Delta RH$ (default: $+12\%$). Nilai offset ini diterapkan langsung pada perhitungan firmware sebelum paket data dipublikasikan, secara efektif mengompensasi fenomena pemanasan internal enclosure oleh papan elektronik (*PCB self-heating*) dan menjaga akurasi pengukuran mikroklimat sesuai spesifikasi pabrik.

3. **Filter Noise Gate & Kalibrasi Faktor Skala Anemometer:**  
   Pengaturan ambang batas gerbang derau (*noise gate threshold*, default: $0.25\text{ m/s}$) dan faktor pengali kecepatan putaran mangkok anemometer ($K_{wind}$, default: $1.00$). Fitur ini menyaring sinyal interupsi semu yang disebabkan oleh getaran mekanis tiang stasiun pada saat angin mati, serta memungkinkan kalibrasi ulang terhadap instrumen anemometer rujukan berstandar terowongan angin (*wind tunnel reference standard*).

---

## 4.14 Layar 12: Pengaturan Tab 3  -  Sinkronisasi Jaringan Wi-Fi & Cloud

Tab sinkronisasi mengelola parameter konektivitas nirkabel dan jadwal transmisi telemetri:

![Tampilan Pengaturan Tab 3 Sinkronisasi](assets/ui_12_settings_tab3_sync.png)
*Gambar 4.12: Pengaturan Kredensial Jaringan Wi-Fi dan Interval Pengiriman Telemetri.*

### Spesifikasi Rinci Fitur Pengaturan Jaringan:
1. **Manajemen Kredensial Wi-Fi Jaringan Perkebunan:**  
   Konfigurasi nama jaringan nirkabel (*SSID*) dan kunci keamanan jaringan WPA2/WPA3 router lokal. Dilengkapi dengan fungsi verifikasi koneksi sebelum parameter dikomit permanen ke memori non-volatile, mencegah stasiun kehilangan kontak komunikasi akibat kesalahan ketik sandi jaringan nirkabel.

2. **Interval Pengambilan Sampel Sensor (*Sensor Sampling Cadence*):**  
   Menetapkan frekuensi eksekusi tugas pembacaan sensor oleh task FreeRTOS Core 1 (rentang konfigurasi: 2 detik hingga 60 detik; default: 5 detik). Interval ini menentukan seberapa responsif stasiun merekam perubahan sesaat pada variabel cuaca yang dinamis, khususnya hembusan kecepatan angin dan fluktuasi intensitas radiasi cahaya matahari.

3. **Interval Publikasi Cloud Firestore (*Cloud Sync Frequency*):**  
   Menetapkan frekuensi transmisi data agregasi telemetri ke server Google Cloud Firestore (rentang konfigurasi: 1 menit hingga 60 menit; default: 1 menit). Pengaturan interval ini sangat penting dalam manajemen energi stasiun; memperpanjang interval pengiriman cloud pada malam hari secara signifikan menghemat konsumsi daya modul radio Wi-Fi dan memperpanjang otonomi baterai surya LiFePO4 saat musim hujan berkepanjangan.

---

## 4.15 Layar 13: Pengaturan Tab 4  -  Pusat Ekspor Data Agrikultur

Tab ekspor data menyediakan utilitas pengunduhan berkas konfigurasi firmware dan kumpulan data telemetri historis:

![Tampilan Pengaturan Tab 4 Ekspor](assets/ui_13_settings_tab4_export.png)
*Gambar 4.13: Pusat Ekspor Data Agrikultur dan Manajemen Berkas Konfigurasi LittleFS.*

### Spesifikasi Rinci Fitur Pusat Ekspor:
1. **Pengunduhan Berkas Konfigurasi Firmware `config.json`:**  
   Fasilitas untuk mengekspor seluruh parameter operasional stasiun (pemetaan pinout GPIO, offset kalibrasi termal, threshold anemometer, interval sampling, dan kredensial jaringan) ke dalam berkas JSON standar. Berkas ini dapat langsung diunggah ke partisi memori flash LittleFS mikrokontroler melalui antarmuka web atau disimpan sebagai salinan cadangan (*golden backup*) sebelum melakukan pembaruan firmware stasiun.

2. **Unggah & Duplikasi Konfigurasi Cepat (*Fleet Configuration Replication*):**  
   Memungkinkan pengunggahan berkas `config.json` hasil ekspor dari stasiun lain untuk diterapkan secara instan ke stasiun baru dalam hitungan detik (*one-click provisioning*). Sangat efisien untuk deployment armada stasiun cuaca dalam jumlah banyak (*multi-station field deployment*) di berbagai blok kebun pertanian.

3. **Ekspor Dataset Historis Format CSV (*Comma Separated Values*):**  
   Generator ekspor data observasi agrometeorologi yang menghasilkan berkas tabel CSV berstandar internasional. Seluruh parameter telemetri terekam lengkap dengan stempel waktu terformat ISO-8601, suhu udara terkompensasi, kelembapan kanopi, laju evapotranspirasi FAO-56 ETo, dan akumulasi fluks radiasi surya. Berkas CSV ini kompatibel penuh untuk dianalisis lebih lanjut menggunakan perangkat lunak statistik dan pemodelan agronomi (seperti RStudio, Microsoft Excel, Python Pandas, SPSS, dan FAO CropWat).

---

## 4.16 Layar 14: Pengaturan Tab 5  -  Manajemen Pengguna Inline & Keamanan RBAC

Tab pengguna mengimplementasikan kontrol akses berbasis peran (*Role-Based Access Control*) secara bersih dan aman:

![Tampilan Pengaturan Tab 5 Pengguna](assets/ui_14_settings_tab5_users.png)
*Gambar 4.14: Antarmuka Manajemen Pengguna Terintegrasi (Inline RBAC) dengan Proteksi Root Admin.*

### Spesifikasi Rinci Fitur Manajemen Pengguna:
1. **Antarmuka Perluasan Dalam-Halaman (*Inline Non-Modal Expansion UI*):**  
   Saat administrator menekan tombol `Tambah Pengguna`, formulir pendaftaran akun terbuka secara vertikal di dalam halaman (*inline accordion card*) langsung di atas daftar tabel pengguna aktif. Pendekatan ini meniadakan penggunaan jendela pop-up modal bertumpuk dan lapisan penutup gelap (*no dark backdrop overlay*), menjaga visibilitas konteks stasiun cuaca dan mempertahankan alur kerja pemantauan data telemetri tanpa interupsi visual.

2. **Isolasi Akun Root Seeder Admin Terproteksi (*Immutable System Administrator*):**  
   Sistem menyematkan akun administrator bawaan atas nama **Haikal Jibran A.** (`admin@agrinex.id` / `admin`). Akun ini memiliki proteksi permanen tingkat sistem (*system-locked state*): tombol hapus (*delete button*) dan selektor pengubah perannya dinonaktifkan secara permanen dengan lencana khusus "Default Admin". Perlindungan ketat ini menjamin bahwa stasiun cuaca tidak akan pernah mengalami kondisi terkunci (*system lockout*) akibat kelalaian teknisi lapangan yang tidak sengaja menghapus seluruh akun administratif.

3. **Pemberian Hak Akses Berjenjang & Sinkronisasi Instan:**  
   Administrator dapat mendaftarkan operator baru dengan memilih salah satu dari tiga tingkatan peran (*Administrator*, *Agronomist*, atau *Field Officer*). Akun yang baru ditambahkan langsung disinkronkan ke dalam tabel penyimpanan kredensial lokal stasiun (`agrinex_registered_users`), sehingga operator baru dapat langsung melakukan login di lapangan secara instan tanpa perlu me-reboot stasiun cuaca.

4. **Fungsi Pemulihan Pengguna Pabrik (*Reset to Factory Users*):**  
   Menyediakan tombol darurat yang dilindungi konfirmasi ganda untuk membersihkan akun-akun sementara dan memulihkan seluruh daftar pengguna ke kondisi awal pabrik (*factory default state*) dengan mempertahankan akun seeder admin utama. Fitur ini sangat bermanfaat saat stasiun selesai dipinjamkan untuk riset lapangan atau dialihkan kepemilikannya ke unit kebun yang lain.
