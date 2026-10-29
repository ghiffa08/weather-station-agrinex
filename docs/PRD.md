# 📋 Product Requirement Document (PRD): Web Komparasi Weather Station Agrinex vs BMKG

## 1. Latar Belakang & Masalah
Petani modern dan pengelola perkebunan memerlukan estimasi iklim mikro lokal yang akurat untuk mengatur jadwal irigasi presisi (*precision fertigation*). Saat ini:
1. Data resmi BMKG (misal dari Stasiun Kertajati) berjarak puluhan kilometer dari perkebunan dan merefleksikan cuaca regional/makro, bukan mikroklimat tajuk tanaman di lapangan.
2. Alat Weather Station Agrinex berbasis IoT telah dipasang di lapangan, namun pengguna memerlukan dashboard web yang menyandingkan data alat dengan data BMKG untuk memvalidasi akurasi, memantau deviasi lokal, dan menghitung selisih kebutuhan air tanaman ($ET_o$).

---

## 2. Pengguna Utama (User Personas)
- **Agronomist / Field Manager**: Membutuhkan informasi selisih suhu, kelembapan, dan evaporasi harian untuk menyesuaikan dosis irigasi tetes (*Smart Drip*).
- **IoT / Hardware Engineer**: Membutuhkan informasi deviasi akurasi sensor (apakah sensor drift/mengalami deviasi), pemantauan baterai, dan log konektivitas.
- **Peneliti / Akademisi**: Memerlukan ekspor data perbandingan metrik validasi ($R^2$, RMSE, MAE, MBE) untuk analisis ilmiah atau laporan studi pendahuluan.

---

## 3. Fitur Utama & Kebutuhan Fungsional (Functional Requirements)

### Modul 1: Dashboard Komparasi Real-time & Multi-Variable
- **FR-1.1 Dual-Series Charts**: Grafik interaktif (menggunakan Recharts) yang menampilkan kurva Suhu, Kelembapan, Radiasi Surya, dan Kecepatan Angin (Alat vs BMKG) pada skala waktu yang sama.
- **FR-1.2 Delta Cards**: Kartu indikator selisih seketika ($\Delta T = T_{\text{IoT}} - T_{\text{BMKG}}$, $\Delta RH$, dll) dengan indikator visual (hijau jika wajar, oranye/merah jika disparitas signifikan).
- **FR-1.3 Mode Switcher**: Kemudahan beralih antara Mode Jam-jaman (24 jam terakhir) dan Mode Rangkuman Harian (7 hari / 30 hari).

### Modul 2: Mesin Evaluasi Akurasi & Statistik (Benchmark Engine)
- **FR-2.1 Statistical Cards**: Menampilkan metrik MAE, RMSE, MAPE, MBE, dan Pearson Correlation ($r$).
- **FR-2.2 Calibration / Bias Indicator**: Memberikan rekomendasi offset kalibrasi (misal: "Suhu sensor IoT rata-rata $+0.6^\circ\text{C}$ lebih hangat dari BMKG karena efek pantulan tanah").

### Modul 3: Evapotranspirasi Acuan ($ET_o$) & Estimasi Kebutuhan Irigasi
- **FR-3.1 Perhitungan $ET_o$ Otomatis**: Menghitung $ET_o$ harian berbasis rumus baku FAO-56 Penman-Monteith untuk kedua sumber data.
- **FR-3.2 Konversi Kebutuhan Air Lapangan**: Menghitung selisih volume air per hektar ($\text{m}^3/\text{ha}$ atau $\text{liter/pohon}$) akibat perbedaan mikroklimat vs makroklimat.

### Modul 4: Manajemen Kualitas Data & Deteksi Anomali
- **FR-4.1 Deteksi Outlier / Sensor Malfunction**: Memberi penanda peringatan jika salah satu sensor mengalami kebocoran data, flatline, atau lonjakan yang tidak wajar.
- **FR-4.2 Ekspor Laporan**: Fitur ekspor komparasi berpasangan ke format CSV / PDF.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)
- **Performa & Caching**: Cache BMKG API selama 30 menit untuk menghemat kuota limit BMKG (60 req/menit/IP).
- **Responsif & Mobile-First**: Tampilan neumorphic / modern dashboard yang nyaman diakses via smartphone mandor di lapangan maupun desktop di kantor.
- **Toleransi Kegagalan (Graceful Degradation)**: Jika API BMKG offline, sistem tetap menampilkan data telemetri alat dengan peringatan status koneksi BMKG.
