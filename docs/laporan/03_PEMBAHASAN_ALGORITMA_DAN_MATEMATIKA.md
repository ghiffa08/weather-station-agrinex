# BAB III: PEMBAHASAN MENDALAM ALGORITMA, FISIKA LINGKUNGAN & MODEL PREDIKSI

---

## 3.1 Model Evapotranspirasi Acuan FAO-56 Penman-Monteith ($ET_0$)

Evapotranspirasi acuan (*Reference Evapotranspiration / $ET_0$*) merepresentasikan laju kehilangan air harian dari permukaan tanaman rumput hipotetik dengan tinggi $0.12\text{ meter}$, tahanan tajuk permukaan $70\text{ s/m}$, dan albedo $0.23$, yang tumbuh secara aktif tanpa kekurangan air. Metode **FAO-56 Penman-Monteith** merupakan standar internasional baku yang direkomendasikan oleh *Food and Agriculture Organization (FAO)* dan *World Meteorological Organization (WMO)* untuk perencanaan irigasi presisi.

### 3.1.1 Persamaan Utama FAO-56 Penman-Monteith
Persamaan laju evapotranspirasi acuan harian ($ET_0$ dalam $\text{mm/hari}$):

$$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T_{\text{mean}} + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

Di mana:
- $ET_0$ : Laju evapotranspirasi acuan $[\text{mm/hari}]$.
- $R_n$ : Radiasi surya netto pada permukaan vegetasi $[\text{MJ/m}^2/\text{hari}]$.
- $G$ : Kerapatan fluks panas tanah $[\text{MJ/m}^2/\text{hari}]$ (untuk skala harian, $G \approx 0$).
- $T_{\text{mean}}$ : Suhu rata-rata harian udara $[\,^\circ\text{C}]$, dihitung dari $\frac{T_{\max} + T_{\min}}{2}$.
- $u_2$ : Kecepatan angin terukur pada ketinggian standar 2 meter $[\text{m/s}]$.
- $e_s$ : Tekanan uap jenuh rata-rata $[\text{kPa}]$.
- $e_a$ : Tekanan uap aktual $[\text{kPa}]$.
- $(e_s - e_a)$ : Defisit tekanan uap jenuh (*Vapor Pressure Deficit / VPD*) $[\text{kPa}]$.
- $\Delta$ : Kemiringan kurva tekanan uap terhadap suhu $[\text{kPa/}\,^\circ\text{C}]$.
- $\gamma$ : Konstanta psikrometrik $[\text{kPa/}\,^\circ\text{C}]$.
- $0.408$ : Faktor konversi energi radiasi ($\text{MJ/m}^2/\text{hari}$) menjadi ekuivalen kedalaman air ($\text{mm/hari}$), berasal dari inversi panas laten penguapan air ($\lambda \approx 2.45\text{ MJ/kg}$).

---

### 3.1.2 Komponen Penurunan Matematis

#### 1. Tekanan Uap Jenuh ($e_s$) melalui Persamaan Tetens
Tekanan uap jenuh pada suhu tertentu $T$ dihitung menggunakan formula:
$$e^\circ(T) = 0.6108 \exp\left( \frac{17.27 T}{T + 237.3} \right) \quad [\text{kPa}]$$

Untuk menghindari galat non-linearitas, FAO-56 mewajibkan $e_s$ dihitung sebagai rata-rata tekanan uap pada suhu maksimum ($T_{\max}$) dan suhu minimum ($T_{\min}$), bukan dari $T_{\text{mean}}$:
$$e_s = \frac{e^\circ(T_{\max}) + e^\circ(T_{\min})}{2}$$

#### 2. Tekanan Uap Aktual ($e_a$)
Tekanan uap aktual dihitung dengan mengintegrasikan nilai kelembapan relatif maksimum ($RH_{\max}$) dan minimum ($RH_{\min}$) harian:
$$e_a = \frac{e^\circ(T_{\min}) \left( \frac{RH_{\max}}{100} \right) + e^\circ(T_{\max}) \left( \frac{RH_{\min}}{100} \right)}{2}$$

Apabila data ekstrem tidak lengkap, $e_a$ dapat diestimasi dari kelembapan rata-rata ($RH_{\text{mean}}$):
$$e_a = e_s \times \left( \frac{RH_{\text{mean}}}{100} \right)$$

#### 3. Kemiringan Kurva Tekanan Uap ($\Delta$)
Turunan pertama dari persamaan Tetens terhadap suhu menghasilkan:
$$\Delta = \frac{4098 \left[ 0.6108 \exp\left( \frac{17.27 T_{\text{mean}}}{T_{\text{mean}} + 237.3} \right) \right]}{(T_{\text{mean}} + 237.3)^2} \quad [\text{kPa/}\,^\circ\text{C}]$$

#### 4. Konstanta Psikrometrik ($\gamma$) & Tekanan Barometrik Ketinggian ($P$)
Nilai konstanta psikrometrik bergantung langsung pada tekanan atmosfer lokal ($P$), yang merupakan fungsi dari elevasi stasiun di atas permukaan laut ($z_{\text{elev}}$ dalam meter).

Untuk lokasi Stasiun Agrinex di **Kabupaten Kuningan** dengan elevasi $z_{\text{elev}} = 560\text{ mdpl}$:
$$P = 101.3 \left( \frac{293 - 0.0065 z_{\text{elev}}}{293} \right)^{5.26} = 101.3 \left( \frac{293 - 0.0065(560)}{293} \right)^{5.26} \approx 94.94\text{ kPa}$$

Konstanta psikrometrik dihitung dengan:
$$\gamma = 0.665 \times 10^{-3} P = 0.665 \times 10^{-3} \times 94.94 \approx 0.0631\text{ kPa/}\,^\circ\text{C}$$
*(Sebagai perbandingan, pada permukaan laut $z=0\text{ mdpl}$, nilai standar $\gamma = 0.0673\text{ kPa/}\,^\circ\text{C}$. Penyesuaian ini meningkatkan akurasi perhitungan $ET_0$ sebesar $\approx 6.2\%$).*

---

### 3.1.3 Neraca Radiasi Netto Permukaan ($R_n$)

Radiasi netto ($R_n$) merupakan selisih antara radiasi gelombang pendek bersih yang diserap tajuk ($R_{ns}$) dan radiasi gelombang panjang bersih yang dilepaskan ke atmosfer ($R_{nl}$):
$$R_n = R_{ns} - R_{nl}$$

1. **Radiasi Gelombang Pendek Bersih ($R_{ns}$):**
   $$R_{ns} = (1 - \alpha) R_s = (1 - 0.23) R_s = 0.77 R_s$$
   Di mana $\alpha = 0.23$ adalah koefisien albedo baku untuk tajuk vegetasi rumput hijau acuan, dan $R_s$ adalah radiasi surya global terakumulasi harian ($\text{MJ/m}^2/\text{hari}$).

2. **Radiasi Gelombang Panjang Bersih ($R_{nl}$):**
   Dihitung berdasarkan hukum radiasi benda hitam Stefan-Boltzmann yang dikoreksi oleh kelembapan atmosfer dan tutupan awan:
   $$R_{nl} = \sigma \left[ \frac{(T_{\max} + 273.16)^4 + (T_{\min} + 273.16)^4}{2} \right] \left( 0.34 - 0.14 \sqrt{e_a} \right) \left( 1.35 \frac{R_s}{R_{so}} - 0.35 \right)$$
   Di mana:
   - $\sigma = 4.903 \times 10^{-9}\text{ MJ/K}^4/\text{m}^2/\text{hari}$ (Konstanta Stefan-Boltzmann).
   - $R_{so}$ : Radiasi surya teoritis langit cerah (*clear-sky solar radiation*), dihitung dari ketinggian stasiun:
     $$R_{so} = (0.75 + 2 \times 10^{-5} z_{\text{elev}}) R_a = (0.75 + 2 \times 10^{-5}(560)) R_a = 0.7612 R_a$$
   - $R_a$ : Radiasi ekstraterestrial harian di puncak atmosfer.

---

## 3.2 Algoritma Konversi Fisika Lingkungan

```mermaid
graph LR
    subgraph RawData["Sinyal Mentah Sensor"]
        LUX["Sensor BH1750 (Lux)"]
        WIND["Anemometer v1.3 (km/jam)"]
        BMKG_N["BMKG Sunshine Hours (n jam)"]
    end

    subgraph PhysicsTransform["Transformasi Persamaan Fisika"]
        LUX -->|Faktor Daya Surya (1 W/m² ≈ 120 Lux)| W_M2["Irradiansi Surya I_solar (W/m²)"]
        W_M2 -->|Integrasi Waktu Riemann (dt = 900s)| RS_IOT["Radiasi Harian R_s (MJ/m²/hari)"]
        
        BMKG_N -->|Formula Angstrom-Prescott| RS_BMKG["Model Radiasi R_s BMKG (MJ/m²/hari)"]
        
        WIND -->|Konversi Satuan 1 km/h = 1/3.6 m/s| U_Z["Kecepatan Angin Tiang u_z (m/s)"]
        U_Z -->|Profil Logaritmik Ketinggian z = 1.5m| U_2["Kecepatan Standar 2m u_2 (m/s)"]
    end

    subgraph AgriculturalMetrics["Metrik Agrometeorologi"]
        RS_IOT --> PENMAN["Kalkulator FAO-56 Penman-Monteith (ET_o)"]
        RS_BMKG --> PENMAN
        U_2 --> PENMAN
    end
```

### 3.2.1 Konversi Iluminansi Lux (BH1750) ke Radiasi Surya ($R_s$)
Sensor BH1750 menghasilkan nilai iluminansi fotometrik ($E_v$ dalam satuan Lux), yang ditimbang berdasarkan kurva respon spektral fotopik mata manusia (puncak pada $\lambda = 555\text{ nm}$). Sebaliknya, proses fotosintesis dan evapotranspirasi didorong oleh radiasi radiometrik spektrum penuh (termasuk inframerah dan ultraviolet).

1. **Faktor Konversi Fluks Radiasi Sinar Matahari ($W/m^2$):**
   Berdasarkan penelitian radiasi surya tropis (*illuminance-to-irradiance conversion for outdoor direct sunlight*):
   $$1\text{ W/m}^2 \approx 120 \text{ s/d } 126.7\text{ Lux}$$
   Dalam sistem Agrinex, digunakan konstanta efikasi radiasi surya:
   $$I_{\text{solar}} (\text{W/m}^2) = \frac{\text{Lux}}{120} \approx \text{Lux} \times 0.00833$$

2. **Integrasi Energi Harian ($R_s$ dalam $\text{MJ/m}^2/\text{hari}$):**
   Dengan interval telemetri periodik $\Delta t = 15\text{ menit} = 900\text{ detik}$, total radiasi harian dari $N = 96$ sampel adalah integrasi numerik Riemann:
   $$R_{s, \text{IoT}} = \sum_{i=1}^{96} \left( I_{\text{solar}, i} \times 900\text{ s} \right) \times 10^{-6} \quad [\text{MJ/m}^2/\text{hari}]$$

---

### 3.2.2 Estimasi Radiasi Surya BMKG: Model Angstrom-Prescott
BMKG pada umumnya tidak mempublikasikan nilai radiometer pyranometer langsung, melainkan lama penyinaran matahari aktual harian ($n$, dalam jam). Radiasi surya pembanding ($R_{s, \text{BMKG}}$) diestimasi dengan model **Angstrom-Prescott**:

$$R_{s, \text{BMKG}} = \left( a_s + b_s \frac{n}{N} \right) R_a$$

Di mana:
- $a_s = 0.25$, $b_s = 0.50$ (koefisien baku FAO-56 untuk iklim tropis khatulistiwa).
- $n$ : Lama penyinaran matahari riil BMKG (jam).
- $N$ : Lama penyinaran maksimum teoritis (jam):
  $$N = \frac{24}{\pi} \omega_s$$
- $\omega_s$ : Sudut jam matahari terbenam (*sunset hour angle*) dalam radian:
  $$\omega_s = \arccos\left( -\tan(\phi) \tan(\delta) \right)$$
- $\phi$ : Garis lintang lokasi stasiun (Kuningan: $\phi = -6.9788^\circ = -0.1218\text{ radian}$).
- $\delta$ : Deklinasi matahari pada hari ke-$J$ dalam setahun ($J \in [1, 365]$):
  $$\delta = 0.409 \sin\left( \frac{2\pi}{365} J - 1.39 \right)$$
- $R_a$ : Radiasi surya ekstraterestrial harian ($\text{MJ/m}^2/\text{hari}$):
  $$R_a = \frac{24(60)}{\pi} G_{sc} d_r \left[ \omega_s \sin(\phi) \sin(\delta) + \cos(\phi) \cos(\delta) \sin(\omega_s) \right]$$
  *(Konstanta surya $G_{sc} = 0.0820\text{ MJ/m}^2/\text{menit}$, jarak relatif bumi-matahari $d_r = 1 + 0.033 \cos\left( \frac{2\pi}{365} J \right)$).*

---

### 3.2.3 Normalisasi Profil Logaritmik Kecepatan Angin ($u_2$)
Kecepatan angin bervariasi secara vertikal di atas tajuk tanaman akibat gaya gesek permukaan tanah. Anemometer Agrinex terpasang pada ketinggian tiang $z = 1.5\text{ meter}$. Untuk membandingkannya dengan data standar BMKG dan memasukkannya ke rumus Penman-Monteith, kecepatan angin dinormalisasi ke elevasi standar $2.0\text{ meter}$ menggunakan hukum logaritmik:

$$u_2 = u_z \frac{4.87}{\ln(67.8 z - 5.42)}$$

Untuk ketinggian sensor $z = 1.5\text{ meter}$:
$$u_2 = u_{1.5} \frac{4.87}{\ln(67.8(1.5) - 5.42)} = u_{1.5} \frac{4.87}{\ln(101.7 - 5.42)} = u_{1.5} \frac{4.87}{\ln(96.28)} = u_{1.5} \frac{4.87}{4.567} \approx 1.0663 \times u_{1.5}$$

Kecepatan angin pada ketinggian 1.5 meter dikonversi dari $\text{km/jam}$ ke $\text{m/s}$ lalu dikalikan dengan faktor $1.0663$ untuk menghasilkan $u_2$.

---

## 3.3 Algoritma Kalibrasi Dinamis Sensor Lapangan

### 3.3.1 Kompensasi Panas Disipasi PCB (*PCB Self-Heating*) pada DHT22
Dalam kotak instrumen (*weather enclosure*), komponen elektronik mikrokontroler ESP32 membuang daya panas sebesar $\approx 0.25 - 0.35\text{ Watt}$ secara terus-menerus. Jika sirkulasi udara terbatas atau sensor ditempatkan terlalu dekat dengan sirkuit catu daya, terjadi fenomena pemanasan mandiri (*self-heating artifact*):
- Suhu terukur lebih panas $+2.0^\circ\text{C} \text{ s/d } +5.0^\circ\text{C}$ dibanding suhu udara ambien riil.
- Seiring naiknya suhu udara di sekitar elemen sensor kapasitif tanpa penambahan molekul air, kelembapan relatif ($RH$) yang terukur mengalami penurunan artifisial sebesar $-10\% \text{ s/d } -20\%$.

Algoritma kompensasi dinamis diterapkan secara langsung di tingkat *firmware* dan *software*:
$$T_{\text{cal}} = T_{\text{raw}} + \text{Offset}_T$$
$$RH_{\text{cal}} = \min\left(100, \max\left(0, RH_{\text{raw}} + \text{Offset}_{RH}\right)\right)$$

Berdasarkan kalibrasi empiris stasiun cuaca Agrinex terhadap stasiun pembanding BMKG Kuningan, parameter baku ditetapkan pada:
- $\text{Offset}_T = -4.8^\circ\text{C}$
- $\text{Offset}_{RH} = +14.0\%$

### 3.3.2 Noise Gate Filter Anemometer Dinamis
Untuk mencegah anemometer melaporkan kecepatan angin saat piringan hanya bergetar akibat desakan angin sepoi-sepoi yang belum memutar mangkok:
$$V_{\text{final}} = \begin{cases} 0.0, & \text{jika } \text{Pulsa/detik} \le \text{Threshold}_{\text{NoiseGate}} \\ V_{\text{hitung}}, & \text{jika } \text{Pulsa/detik} > \text{Threshold}_{\text{NoiseGate}} \end{cases}$$
Ambang batas *Noise Gate* dapat dikonfigurasikan dari antarmuka web pengaturan (nilai *default*: $18\text{ Hz}$ saat pengujian filter getaran kuat, atau $2\text{ Hz}$ untuk operasional normal).

---

## 3.4 Metrik Evaluasi Statistik Validasi BMKG

Untuk mengukur derajat kesesuaian dan keandalan data sensor mikroklimat stasiun Agrinex ($P_i$) terhadap data rujukan model BMKG ($O_i$) pada pasangan titik waktu yang bersesuaian sebanyak $n$ sampel, diterapkan 6 metrik statistik komparatif:

| Metrik Statistik | Persamaan Matematis | Interpretasi Ilmiah & Target Kinerja |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | $\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \|P_i - O_i\|$ | Rata-rata selisih absolut antara sensor dan BMKG. Mengukur deviasi fisik riil tanpa memperhitungkan arah deviasi. Target: Suhu $\le 1.0^\circ\text{C}$, Kelembapan $\le 5\%$. |
| **Root Mean Square Error (RMSE)** | $\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (P_i - O_i)^2}$ | Memberikan penalti bobot yang lebih besar terhadap lonjakan galat ekstrem (*outliers*). Target: Suhu $\le 1.5^\circ\text{C}$. |
| **Mean Absolute Percentage Error (MAPE)** | $\text{MAPE} = \frac{100\%}{n} \sum_{i=1}^{n} \left\| \frac{P_i - O_i}{O_i} \right\|$ | Mengukur persentase galat relatif terhadap skala pengukuran. Kategori: $<10\%$ (Sangat Akurat), $10-20\%$ (Baik). |
| **Mean Bias Error (MBE)** | $\text{MBE} = \frac{1}{n} \sum_{i=1}^{n} (P_i - O_i)$ | Mendeteksi kecenderungan sistematis alat. $\text{MBE} > 0$ mengindikasikan stasiun lapangan *overestimate*, sedangkan $\text{MBE} < 0$ menunjukkan *underestimate*. |
| **Pearson Correlation ($r$)** | $r = \frac{\sum_{i=1}^{n} (P_i - \bar{P})(O_i - \bar{O})}{\sqrt{\sum_{i=1}^{n} (P_i - \bar{P})^2 \sum_{i=1}^{n} (O_i - \bar{O})^2}}$ | Mengukur kekuatan korelasi linier dan sinkronisasi tren fluktuasi harian antara stasiun lokal dan BMKG. Rentang $-1 \text{ s/d } +1$. Target: $r \ge 0.85$. |
| **Willmott's Index of Agreement ($d$)** | $d = 1 - \frac{\sum_{i=1}^{n} (P_i - O_i)^2}{\sum_{i=1}^{n} \left( \|P_i - \bar{O}\| + \|O_i - \bar{O}\| \right)^2}$ | Ukuran standar meteorologi untuk derajat kecocokan model empiris terhadap data observasi bebas batas skala. Rentang $0 \text{ s/d } 1$. Target: $d \ge 0.90$. |

---

## 3.5 Algoritma Penyelarasan Waktu & Resampling (*Temporal Window Matching*)

### Kendala Perbedaan Frekuensi Pengambilan Data:
- **Agrinex IoT Station:** Menghasilkan telemetri setiap $15\text{ menit}$ ($96\text{ titik}$ per hari).
- **BMKG API:** Menyediakan titik prakiraan cuaca per $3\text{ jam}$ ($00.00, 03.00, 06.00, 09.00, 12.00, 15.00, 18.00, 21.00\text{ UTC}$).

### Solusi: Jendela Agregasi Rata-rata Bergerak (*Rolling Temporal Window*)
Untuk setiap titik prakiraan BMKG pada waktu $t_{\text{BMKG}}$, sistem mencari himpunan data IoT dalam jendela interval toleransi $\pm 45\text{ menit}$:
$$\mathcal{S}(t_{\text{BMKG}}) = \left\{ P_{\text{IoT}}(t) \;\middle|\; |t - t_{\text{BMKG}}| \le 45\text{ menit} \right\}$$

Nilai pembanding sensor lapangan adalah rata-rata aritmatika dari himpunan tersebut:
$$\bar{P}_{\text{IoT}}(t_{\text{BMKG}}) = \frac{1}{|\mathcal{S}|} \sum_{P \in \mathcal{S}} P$$

Dengan metode ini, perbandingan statistik terlindung dari fluktuasi sesaat (*noise spike*) dan merefleksikan nilai rata-rata kuadran waktu yang sama persis dengan model atmosfer BMKG.
