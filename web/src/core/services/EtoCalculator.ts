/**
 * Agrinex Weather Station — FAO-56 Penman-Monteith Evapotranspiration (ETo) Engine
 * Standar: Food and Agriculture Organization (FAO) Irrigation and Drainage Paper No. 56
 */

import { EnvironmentalPhysics } from './EnvironmentalPhysics';

export interface EtoInputParams {
  tMax: number;          // Suhu maksimum (°C)
  tMin: number;          // Suhu minimum (°C)
  tMean?: number;        // Suhu rata-rata (°C), default: (tMax + tMin) / 2
  rhMean: number;        // Kelembapan relatif rata-rata (%)
  windSpeed2m: number;   // Kecepatan angin pada ketinggian 2 meter (m/s)
  solarRadiationRs: number; // Radiasi surya harian (MJ/m²/hari)
  elevationMeters: number;  // Ketinggian lokasi di atas permukaan laut (mdpl)
  latitudeDeg: number;      // Lintang lokasi (derajat desimal)
  date?: Date;
}

export interface EtoComparisonResult {
  etoIotMmDay: number;
  etoBmkgMmDay: number;
  deltaEtoMmDay: number;          // etoIot - etoBmkg
  deltaVolumeM3PerHa: number;     // Selisih volume air (m³/hektar)
  deltaVolumeLiterPerHa: number;  // Selisih volume air (Liter/hektar)
  irrigationAdvisory: string;
  smartDripDurationAdjustmentMinutes: number; // Rekomendasi penyesuaian menit siram
}

export class EtoCalculator {
  /**
   * Menghitung laju Evapotranspirasi Acuan (ETo) dalam mm/hari
   * Berdasarkan formula standar FAO-56 Penman-Monteith.
   */
  static calculateDailyEto(params: EtoInputParams): number {
    const {
      tMax,
      tMin,
      rhMean,
      windSpeed2m,
      solarRadiationRs,
      elevationMeters,
      latitudeDeg,
      date = new Date(),
    } = params;

    const tMean = params.tMean ?? (tMax + tMin) / 2;

    // 1. Tekanan Atmosfer (P, kPa)
    const P = 101.3 * Math.pow((293 - 0.0065 * elevationMeters) / 293, 5.26);

    // 2. Konstanta Psikrometrik (gamma, kPa/°C)
    const gamma = 0.665e-3 * P;

    // 3. Kemiringan Kurva Tekanan Uap Jenuh (Delta, kPa/°C)
    const deltaNumerator = 4098 * (0.6108 * Math.exp((17.27 * tMean) / (tMean + 237.3)));
    const deltaDenominator = Math.pow(tMean + 237.3, 2);
    const Delta = deltaNumerator / deltaDenominator;

    // 4. Tekanan Uap Jenuh Rata-rata (es, kPa)
    const eSatMax = 0.6108 * Math.exp((17.27 * tMax) / (tMax + 237.3));
    const eSatMin = 0.6108 * Math.exp((17.27 * tMin) / (tMin + 237.3));
    const es = (eSatMax + eSatMin) / 2;

    // 5. Tekanan Uap Aktual (ea, kPa)
    const ea = es * (Math.max(5, Math.min(100, rhMean)) / 100);

    // 6. Radiasi Ekstraterestrial (Ra)
    const { Ra } = EnvironmentalPhysics.calculateExtraterrestrialRa(latitudeDeg, date);

    // 7. Radiasi Bersih Permukaan (Rn, MJ/m²/hari)
    // a. Radiasi gelombang pendek netto (Rns) dengan albedo rumput acuan alpha = 0.23
    const Rns = (1 - 0.23) * solarRadiationRs;

    // b. Radiasi surya langit cerah (Rso)
    const Rso = (0.75 + 2e-5 * elevationMeters) * Ra;

    // c. Rasio tutupan relatif Rs / Rso (dibatasi 0.3 s/d 1.0)
    const relativeSolar = Rso > 0 ? Math.max(0.3, Math.min(1.0, solarRadiationRs / Rso)) : 0.7;

    // d. Radiasi gelombang panjang netto (Rnl)
    const sigma = 4.903e-9; // Konstanta Stefan-Boltzmann dalam MJ K^-4 m^-2 hari^-1
    const tMaxK4 = Math.pow(tMax + 273.16, 4);
    const tMinK4 = Math.pow(tMin + 273.16, 4);
    const termTemp = sigma * ((tMaxK4 + tMinK4) / 2);
    const termHumidity = 0.34 - 0.14 * Math.sqrt(Math.max(0, ea));
    const termCloud = 1.35 * relativeSolar - 0.35;
    const Rnl = termTemp * termHumidity * Math.max(0.05, termCloud);

    // e. Radiasi Netto (Rn)
    const Rn = Rns - Rnl;

    // 8. Fluks Panas Tanah (G ≈ 0 untuk langkah harian)
    const G = 0;

    // 9. Komponen Pembilang & Penyebut Persamaan FAO-56
    const radiationTerm = 0.408 * Delta * (Rn - G);
    const aerodynamicTerm = gamma * (900 / (tMean + 273)) * windSpeed2m * (es - ea);
    const numerator = radiationTerm + aerodynamicTerm;
    const denominator = Delta + gamma * (1 + 0.34 * windSpeed2m);

    const eto = numerator / denominator;
    return Number(Math.max(0.5, Math.min(12.0, eto)).toFixed(2));
  }

  /**
   * Menghitung komparasi kebutuhan air antara IoT Lapangan vs Referensi BMKG.
   */
  static compareEto(
    iotParams: EtoInputParams,
    bmkgParams: EtoInputParams,
    dripFlowRateLph: number = 5000 // Rata-rata kapasitas sistem drip per hektar
  ): EtoComparisonResult {
    const etoIot = this.calculateDailyEto(iotParams);
    const etoBmkg = this.calculateDailyEto(bmkgParams);

    const deltaEto = Number((etoIot - etoBmkg).toFixed(2));

    // 1 mm kedalaman air pada 1 hektar (10.000 m²) = 10 m³ = 10.000 Liter
    const deltaVolumeM3PerHa = Number((deltaEto * 10).toFixed(1));
    const deltaVolumeLiterPerHa = Math.round(deltaEto * 10000);

    // Penyesuaian durasi siram dalam menit
    const durationAdjustmentMinutes = Math.round((deltaVolumeLiterPerHa / dripFlowRateLph) * 60);

    let advisory = 'Laju transpirasi seimbang antara mikroklimat lahan dan BMKG.';
    if (deltaEto > 0.4) {
      advisory = `Mikroklimat lahan lebih terik/kering (+${deltaEto} mm/hari). Disarankan menambah durasi siram +${durationAdjustmentMinutes} menit agar tanaman tidak stres air.`;
    } else if (deltaEto < -0.4) {
      advisory = `Lahan lebih lembap/teduh (${deltaEto} mm/hari). Jadwal irigasi dapat dikurangi ${Math.abs(durationAdjustmentMinutes)} menit untuk menghemat air dan nutrisi.`;
    }

    return {
      etoIotMmDay: etoIot,
      etoBmkgMmDay: etoBmkg,
      deltaEtoMmDay: deltaEto,
      deltaVolumeM3PerHa,
      deltaVolumeLiterPerHa,
      irrigationAdvisory: advisory,
      smartDripDurationAdjustmentMinutes: durationAdjustmentMinutes,
    };
  }
}
