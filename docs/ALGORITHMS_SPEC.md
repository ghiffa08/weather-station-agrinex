# 📐 Spesifikasi Teknis Algoritma & Benchmark Cuaca: Agrinex vs BMKG

Dokumen ini berisi spesifikasi matematis, konversi fisika, dan implementasi algoritma untuk membandingkan data sensor mikroklimat **Weather Station Agrinex** terhadap data resmi **BMKG**.

---

## 1. Algoritma Penyelarasan Waktu & Resampling (Temporal Matching)

### Masalah:
- **Alat IoT (Agrinex)**: Mengirim data rata-rata tiap 15 menit ($N = 96$ sampel per hari).
- **BMKG API**: Menyediakan data prakiraan cuaca per 3 jam atau rangkuman harian ($T_{\max}, T_{\min}, T_{\text{mean}}$).

### Algoritma:
1. **Penyelarasan Jam-jaman (Hourly Bucket Resampling)**:
   Untuk membandingkan interval 1 jam, agregasikan 4 data IoT dalam jendela $[H:00, H:59]$:
   $$\bar{T}_{\text{IoT}}(H) = \frac{1}{k} \sum_{i=1}^{k} T_{\text{IoT}}(H, i) \quad (k \le 4)$$
2. **Penyelarasan 3 Jam (BMKG Forecast Window)**:
   Ambil rata-rata data IoT dalam rentang waktu $\pm 1.5$ jam dari timestamp titik prakiraan BMKG.
3. **Penyelarasan Harian (Daily Aggregation)**:
   - $T_{\max, \text{IoT}} = \max_{t \in \text{Hari}} (T_{\text{IoT}}(t))$
   - $T_{\min, \text{IoT}} = \min_{t \in \text{Hari}} (T_{\text{IoT}}(t))$
   - $T_{\text{mean, IoT}} = \frac{T_{\max, \text{IoT}} + T_{\min, \text{IoT}}}{2}$ *(sesuai standar WMO/FAO-56)*

---

## 2. Fisika & Konversi Parameter Lingkungan

### A. Konversi Intensitas Cahaya (BH1750) ke Radiasi Surya ($R_s$)
Sensor BH1750 mengukur iluminansi dalam satuan **Lux**, sedangkan perhitungan agrometeorologi membutuhkan daya radiasi matahari ($R_s$) dalam satuan $\text{W/m}^2$ atau energi harian $\text{MJ/m}^2/\text{hari}$.

1. **Konversi Lux ke Irradiansi Sinar Matahari ($W/m^2$)**:
   $$\text{Solar Irradiance } I_{\text{solar}} (\text{W/m}^2) \approx \frac{\text{Lux}}{120} \approx \text{Lux} \times 0.0079$$
   *(Faktor konversi sinar matahari spektrum penuh untuk illuminated daylight: $1\text{ W/m}^2 \approx 120 - 126\text{ Lux}$).*

2. **Integrasi Energi Harian ($R_s$ dalam $\text{MJ/m}^2/\text{hari}$)**:
   $$R_{s, \text{IoT}} = \sum_{i=1}^{N} \left( I_{\text{solar}, i} \times \Delta t_i \right) \times 10^{-6}$$
   Untuk interval $\Delta t = 15\text{ menit} = 900\text{ detik}$:
   $$R_{s, \text{IoT}} = \left( \sum_{i=1}^{96} I_{\text{solar}, i} \right) \times 900 \times 10^{-6} \quad (\text{MJ/m}^2/\text{hari})$$

### B. Estimasi Radiasi Surya BMKG (Formula Angstrom-Prescott)
BMKG seringkali hanya mencatat lama penyinaran matahari aktual ($n$, dalam jam) per hari:
$$R_{s, \text{BMKG}} = \left( a_s + b_s \frac{n}{N} \right) R_a$$
- $a_s = 0.25$, $b_s = 0.50$ (koefisien baku FAO-56 untuk iklim tropis).
- $n$: Jam penyinaran matahari aktual dari BMKG.
- $N$: Lama penyinaran maksimum teoritis (jam):
  $$N = \frac{24}{\pi} \omega_s$$
- $\omega_s$: Sudut jam matahari terbenam (sunset hour angle dalam radian):
  $$\omega_s = \arccos(-\tan(\phi) \tan(\delta))$$
- $\phi$: Lintang lokasi (Lintang Kabupaten Kuningan $\approx -6.9788^\circ = -0.1218\text{ rad}$, Elevasi $560\text{ mdpl}$).
- $\delta$: Deklinasi matahari berdasarkan hari ke-$J$ dalam setahun ($J = 1 \dots 365$):
  $$\delta = 0.409 \sin\left(\frac{2\pi}{365} J - 1.39\right)$$
- $R_a$: Radiasi ekstraterestrial harian ($\text{MJ/m}^2/\text{hari}$):
  $$R_a = \frac{24(60)}{\pi} G_{sc} d_r \left[ \omega_s \sin(\phi)\sin(\delta) + \cos(\phi)\cos(\delta)\sin(\omega_s) \right]$$
  *(Konstanta surya $G_{sc} = 0.0820\text{ MJ/m}^2/\text{menit}$, jarak relatif bumi-matahari $d_r = 1 + 0.033\cos\left(\frac{2\pi}{365}J\right)$).*

### C. Normalisasi Kecepatan Angin ke Ketinggian Standar 2 Meter ($u_2$)
Kecepatan angin yang diukur anemometer pada ketinggian tiang $z$ (misal $z = 1.5\text{ m}$) dinormalisasi ke standar FAO-56 / BMKG ketinggian 2 meter:
$$u_2 = u_z \frac{4.87}{\ln(67.8 z - 5.42)}$$
Jika anemometer dipasang pada ketinggian $z = 1.5\text{ m}$:
$$u_2 \approx u_{1.5} \times 1.056$$

---

## 3. Metrik Statistik Validasi & Benchmark Akurasi

Untuk setiap variabel cuaca ($X \in \{ \text{Suhu, Kelembapan, Radiasi, Angin} \}$), dihitung metrik perbandingan antara nilai sensor IoT ($P_i$) dan referensi BMKG ($O_i$):

| Metrik | Formula Matematis | Makna & Target Akurasi |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | $\text{MAE} = \frac{1}{n} \sum \|P_i - O_i\|$ | Rata-rata selisih fisik mutlak. Target suhu: $\le 1.0^\circ\text{C}$, RH: $\le 5\%$. |
| **Root Mean Square Error (RMSE)** | $\text{RMSE} = \sqrt{\frac{1}{n} \sum (P_i - O_i)^2}$ | Penalti tinggi jika ada lonjakan/kesalahan ekstrem. Target suhu: $\le 1.5^\circ\text{C}$. |
| **Mean Absolute Percentage Error (MAPE)** | $\text{MAPE} = \frac{100\%}{n} \sum \left\| \frac{P_i - O_i}{O_i} \right\|$ | Persentase error relatif. Target: $< 10\%$ (Kategori Akurasi Sangat Baik). |
| **Mean Bias Error (MBE)** | $\text{MBE} = \frac{1}{n} \sum (P_i - O_i)$ | Kecenderungan bias alat. $\text{MBE} > 0 \implies$ alat overestimate, $\text{MBE} < 0 \implies$ underestimate. |
| **Pearson Correlation ($r$)** | $r = \frac{\sum (P_i - \bar{P})(O_i - \bar{O})}{\sqrt{\sum (P_i - \bar{P})^2 \sum (O_i - \bar{O})^2}}$ | Keselarasan tren harian. Target: $r \ge 0.85$. |
| **Index of Agreement ($d$)** | $d = 1 - \frac{\sum (P_i - O_i)^2}{\sum \left( \|P_i - \bar{O}\| + \|O_i - \bar{O}\| \right)^2}$ | Kesesuaian model meteorologi (rentang 0 s/d 1). Target: $d \ge 0.90$. |

---

## 4. Algoritma Evapotranspirasi Acuan ($ET_o$ Penman-Monteith FAO-56)

Formula lengkap perhitungan laju kehilangan air harian acuan ($ET_o$, $\text{mm/hari}$):
$$ET_o = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T_{\text{mean}} + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

### Komponen Turunan:
1. **Tekanan Uap Jenuh Rata-rata ($e_s$)**:
   $$e^\circ(T) = 0.6108 \exp\left( \frac{17.27 T}{T + 237.3} \right)$$
   $$e_s = \frac{e^\circ(T_{\max}) + e^\circ(T_{\min})}{2}$$
2. **Tekanan Uap Aktual ($e_a$)**:
   $$e_a = \frac{e^\circ(T_{\min}) \frac{RH_{\max}}{100} + e^\circ(T_{\max}) \frac{RH_{\min}}{100}}{2} \quad \text{atau} \quad e_a = e_s \times \frac{RH_{\text{mean}}}{100}$$
3. **Kemiringan Kurva Tekanan Uap ($\Delta$)**:
   $$\Delta = \frac{4098 \left[ 0.6108 \exp\left( \frac{17.27 T_{\text{mean}}}{T_{\text{mean}} + 237.3} \right) \right]}{(T_{\text{mean}} + 237.3)^2}$$
4. **Konstanta Psikrometrik ($\gamma$)**:
   $$\gamma = 0.665 \times 10^{-3} P$$
   *(Tekanan atmosfer $P$ pada elevasi $z_{\text{elev}}$ mdpl: $P = 101.3 \left( \frac{293 - 0.0065 z_{\text{elev}}}{293} \right)^{5.26}$).*
5. **Radiasi Netto Permukaan ($R_n = R_{ns} - R_{nl}$)**:
   - Radiasi gelombang pendek netto: $R_{ns} = (1 - \alpha) R_s$ (albedo rumput acuan $\alpha = 0.23$).
   - Radiasi gelombang panjang netto $R_{nl}$ dihitung dari suhu Stefan-Boltzmann, kelembapan uap air $e_a$, dan tutupan awan relatif ($R_s / R_{so}$).

---

## 5. Algoritma Filter Kualitas Data & Deteksi Anomali Sensor

Sebelum data sensor IoT dikomparasikan, pipeline validasi membersihkan anomali:
1. **Physical Boundary Check**:
   - Suhu: $15^\circ\text{C} \le T \le 45^\circ\text{C}$
   - Kelembapan: $10\% \le RH \le 100\%$
   - Radiasi: $0 \le \text{Lux} \le 130{,}000$
   - Kecepatan Angin: $0 \le u \le 35\text{ m/s}$
2. **Spike / Rate of Change Anomaly**:
   $$|\Delta T| > 5^\circ\text{C} / 15\text{ menit} \implies \text{Flawed reading / Noise flag}$$
3. **Sensor Health Confidence Index**:
   Skor integritas ($0 - 100\%$) dihitung berdasarkan persentase paket valid yang diterima tanpa *missing interval* per hari.
