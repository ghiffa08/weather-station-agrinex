# 🌦️ Master Sprint Plan & Algoritma Benchmark: Weather Station Agrinex vs BMKG

Dokumen ini merupakan panduan inisiasi sprint, spesifikasi teknis algoritma komparasi, dan struktur dokumentasi untuk pengembangan web dashboard **Agrinex Weather Station**.

---

## 🎯 1. Visi & Tujuan Proyek

Tujuan utama sistem web ini adalah **melakukan validasi dan benchmarking komparatif antara data aktual in-situ (mikroklimat mikro dari alat IoT Weather Station Agrinex di lahan pertanian) dengan data observasi & prakiraan makroklimat resmi dari API BMKG**.

### Nilai Tambah & Masalah yang Diselesaikan:
1. **Presisi Mikroklimat vs Makroklimat**: Stasiun BMKG umumnya berjarak puluhan kilometer dari lahan pertanian (misal Stasiun Kertajati 96791). Web ini membuktikan dan memetakan disparitas lokal (suhu mikro, kelembapan kanopi, radiasi efektif).
2. **Validasi & Kalibrasi Sensor**: Mengevaluasi tingkat akurasi sensor berbiaya efisien (DHT22, BH1750, Zhafira Anemometer v1.3) terhadap standar referensi meteorologi.
3. **Evapotranspirasi Acuan ($ET_o$) Presisi**: Menghitung kebutuhan air tanaman aktual harian berbasis standar FAO-56 Penman-Monteith menggunakan data sensor lokal vs data BMKG untuk optimasi sistem irigasi pintar (*Smart Drip Agrinex*).

---

## 🧠 2. Brainstorming Algoritma Komparasi & Pengolahan Data

### A. Algoritma Data Preprocessing & Penyelarasan Temporal (Temporal Alignment)
| Masalah | Kondisi Data IoT | Kondisi Data BMKG | Solusi Algoritma |
| :--- | :--- | :--- | :--- |
| **Frekuensi Waktu** | Interval 10 detik dirata-rata ke 15 menit (96 data/hari) | Prakiraan per 3 jam atau agregat harian ($T_{\max}, T_{\min}, T_{\text{mean}}$) | **Resampling & Aggregation**: Agregasi moving average per jam dan harian (Min, Max, Weighted Mean) untuk matched-pair analysis. |
| **Radiasi Surya** | Membaca intensitas cahaya dalam satuan **Lux** (BH1750) | Lama penyinaran matahari ($n$, jam) atau radiasi surya ($R_s, \text{MJ/m}^2/\text{hari}$) | **Luminous Efficacy & Angstrom-Prescott**: Konversi Lux ke Solar Radiation ($R_s$) dan konversi lama penyinaran BMKG ke $R_s$. |
| **Kecepatan Angin** | Dipasang pada ketinggian $z \approx 1.5 - 2.0\text{ m}$ | Standar BMKG / WMO diukur pada ketinggian $10\text{ m}$ | **Logarithmic Wind Profile (FAO-56)**: Normalisasi ke kecepatan angin standar 2 meter ($u_2$). |

#### Formula Konversi Kunci:
1. **Konversi Lux ke Radiasi Surya ($R_s$ dalam $\text{W/m}^2$ dan $\text{MJ/m}^2/\text{hari}$)**:
   $$\text{Solar Irradiance } (I_{\text{solar}}, \text{W/m}^2) \approx \frac{\text{Light Lux}}{120} \quad \text{atau} \quad \text{Light Lux} \times 0.0079$$
   $$\text{Daily } R_s \ (\text{MJ/m}^2/\text{hari}) = \sum_{t=1}^{N} \left( I_{\text{solar}}(t) \times \Delta t \times 10^{-6} \right)$$
2. **Angstrom-Prescott Formula (Untuk Data BMKG)**:
   $$R_s = \left( a_s + b_s \frac{n}{N} \right) R_a$$
   *(Default FAO-56 untuk wilayah tropis: $a_s = 0.25$, $b_s = 0.50$, $n$ = jam penyinaran BMKG, $N$ = panjang hari maksimum teoritis, $R_a$ = radiasi ekstraterestrial).*
3. **Normalisasi Ketinggian Angin ($u_2$)**:
   $$u_2 = u_z \frac{4.87}{\ln(67.8 z - 5.42)}$$

---

### B. Algoritma Metrik Statistik & Benchmark Akurasi
Untuk membandingkan performa sensor alat ($P_i$) terhadap referensi BMKG ($O_i$):

1. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |P_i - O_i|$$
   *Interpretasi*: Menunjukkan rata-rata selisih fisik mutlak (misal selisih rata-rata suhu $\pm 0.8^\circ\text{C}$).
2. **Root Mean Square Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (P_i - O_i)^2}$$
   *Interpretasi*: Menimbang penalti lebih tinggi pada selisih ekstrem/outlier.
3. **Mean Bias Error (MBE)**:
   $$\text{MBE} = \frac{1}{n} \sum_{i=1}^{n} (P_i - O_i)$$
   *Interpretasi*: Mengetahui arah deviasi sensor. Positif ($>0$) berarti alat *overestimate*, negatif ($<0$) berarti *underestimate*.
4. **Koefisien Koreksi Pearson ($r$) & Determinasi ($R^2$)**:
   $$r = \frac{\sum (P_i - \bar{P})(O_i - \bar{O})}{\sqrt{\sum (P_i - \bar{P})^2 \sum (O_i - \bar{O})^2}}$$
   *Interpretasi*: Mengukur keselarasan dinamika dan tren cuaca harian ($r > 0.85$ menandakan korelasi sangat kuat).
5. **Willmott Index of Agreement ($d$)**:
   $$d = 1 - \frac{\sum_{i=1}^n (P_i - O_i)^2}{\sum_{i=1}^n \left( |P_i - \bar{O}| + |O_i - \bar{O}| \right)^2}$$
   *Interpretasi*: Metrik standar klimatologi bernilai 0 (tidak cocok sama sekali) hingga 1 (kesesuaian sempurna).

---

### C. Algoritma Evapotranspirasi Acuan ($ET_o$ Penman-Monteith FAO-56)
Algoritma inti untuk menentukan kebutuhan air irigasi:
$$ET_o = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$
- $\Delta$: Kemiringan kurva tekanan uap jenuh terhadap suhu.
- $R_n$: Radiasi netto permukaan.
- $G$: Fluks panas tanah ($\approx 0$ untuk perhitungan harian).
- $T$: Suhu rata-rata harian ($^\circ\text{C}$).
- $u_2$: Kecepatan angin pada ketinggian 2 meter ($\text{m/s}$).
- $e_s - e_a$: Defisit tekanan uap air (Saturation Vapor Pressure Deficit, VPD).
- $\gamma$: Konstanta psikrometrik.

---

### D. Algoritma Deteksi Anomali & Sensor Drift
1. **Interquartile Range (IQR) & Rolling Z-Score**: Mendeteksi noise atau lonjakan spike abnormal pada sensor DHT22 (misal lonjakan suhu mendadak $> 50^\circ\text{C}$ atau RH $0\%$).
2. **Cumulative Sum (CUSUM) Drift**: Mendeteksi degradasi kalibrasi sensor seiring berjalannya waktu akibat debu/penuaan komponen sensor.

---

## 📑 3. Dokumen Markdown yang Dibutuhkan untuk Proyek Ini

Berikut struktur folder dokumentasi standar sprint yang akan dibuat:

```text
docs/
├── SPRINT_PLAN.md               # [DOKUMEN INI] Master sprint plan & algoritma benchmark
├── PRD.md                       # Product Requirements Document & arsitektur fungsional
├── ALGORITHMS_SPEC.md           # Spesifikasi teknis & detail rumus matematis
├── DATA_CONTRACTS.md            # Schema API BMKG, Payload Firestore, & SQLite
└── ARCHITECTURE.md              # Desain arsitektur frontend, layer data, & caching
```

---

## 🏃 4. Roadmap & Rencana Pembagian Sprint

### 🏁 Sprint 1: Data Ingestion, Normalization & Temporal Alignment
- **Tujuan**: Memastikan data alat (Firestore) dan data BMKG siap disandingkan dalam resolusi waktu yang seimbang.
- **Tasks**:
  1. Integrasi API BMKG client dengan caching (30 menit TTL) dan proxy CORS.
  2. Ingestion pipeline data Firestore (data IoT 15 menitan) ke unified state.
  3. Implementasi service *Time-Series Resampling* (agregasi 1 jam & 24 jam).
  4. Implementasi konversi radiasi Lux $\to \text{W/m}^2 \to R_s \ (\text{MJ/m}^2/\text{hari})$.
- **Deliverable**: Hook React `useComparativeWeather()` yang menyediakan data sepasang (matched timestamp).

### 📊 Sprint 2: Comparative Dashboard & Visual Analytics
- **Tujuan**: Visualisasi perbandingan interaktif antara Alat vs BMKG.
- **Tasks**:
  1. Dual-axis Recharts: Kurva Suhu (IoT vs BMKG), RH (IoT vs BMKG), Radiasi & Angin.
  2. Komponen kartu selisih Delta Real-time ($\Delta T, \Delta RH, \Delta \text{Wind}$).
  3. Indikator akurasi & deviasi harian (kartu metrik MAE, RMSE, Pearson $r$).
  4. Mode perbandingan: Real-time (jam-jaman) vs Historis (harian/mingguan).
- **Deliverable**: Halaman Dashboard Komparasi dengan grafik overlay dan metrik akurasi.

### 💧 Sprint 3: $ET_o$ Penman-Monteith Engine & Rekomendasi Agronomi
- **Tujuan**: Menghitung $ET_o$ dan selisih estimasi kebutuhan air tanaman antara IoT vs BMKG.
- **Tasks**:
  1. Implementasi modul kalkulator FAO-56 Penman-Monteith murni di TypeScript.
  2. Kalkulasi komparasi $ET_o^{\text{IoT}}$ vs $ET_o^{\text{BMKG}}$ harian.
  3. Kalkulasi deviasi volume air irigasi (misal selisih $1.2\text{ mm/hari} \to \text{liter/hektar}$).
  4. Widget rekomendasi durasi siram Smart Drip Agrinex.
- **Deliverable**: Tab Analisis ETo & Rekomendasi Irigasi Lapangan.

### 🛡️ Sprint 4: Sensor Health, Drift Monitoring & Export Reporting
- **Tujuan**: Menjamin kualitas data, deteksi anomali, dan pembuatan laporan validasi resmi.
- **Tasks**:
  1. Implementasi deteksi anomali (IQR filter & outlier badge).
  2. Health score sensor (DHT22, BH1750, Anemometer).
  3. Ekspor laporan validasi akurasi (CSV & PDF Summary).
  4. QA & optimasi performa PWA / responsive mobile.
- **Deliverable**: Sistem siap uji lapangan dan siap rilis produksi.
