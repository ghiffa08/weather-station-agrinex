/**
 * Agrinex Weather Station — Environmental Physics & Conversions
 * Standar: WMO & FAO-56 Penman-Monteith
 */

export class EnvironmentalPhysics {
  /**
   * Konversi intensitas cahaya BH1750 (Lux) ke Solar Irradiance (W/m²).
   * Nilai konversi sinar matahari spektrum penuh (daylight): 1 W/m² ≈ 120 - 126 Lux.
   * Faktor: Lux / 120 atau Lux * 0.0079
   */
  static luxToSolarIrradiance(lux: number): number {
    if (lux <= 0) return 0;
    return Number((lux / 120).toFixed(1));
  }

  /**
   * Konversi kecepatan angin dari km/jam ke m/s.
   */
  static kmhToMs(kmh: number): number {
    return Number((kmh / 3.6).toFixed(2));
  }

  /**
   * Konversi kecepatan angin dari m/s ke km/jam.
   */
  static msToKmh(ms: number): number {
    return Number((ms * 3.6).toFixed(1));
  }

  /**
   * Normalisasi profil kecepatan angin logaritmik (FAO-56 Eq. 47)
   * Mengonversi kecepatan angin terukur pada ketinggian z (meter) ke standar ketinggian 2 meter (u2).
   *
   * Formula: u2 = u_z * 4.87 / ln(67.8 * z - 5.42)
   * Untuk tiang z = 1.5 m -> faktor ≈ 1.056
   */
  static normalizeWindTo2Meters(uz: number, measuredHeightMeters: number = 1.5): number {
    if (uz <= 0) return 0;
    if (measuredHeightMeters === 2) return uz;
    const factor = 4.87 / Math.log(67.8 * measuredHeightMeters - 5.42);
    return Number((uz * factor).toFixed(2));
  }

  /**
   * Menghitung Radiasi Ekstraterestrial Harian (Ra) dan Lama Penyinaran Maksimum (N)
   * Berdasarkan FAO-56 Penman-Monteith untuk koordinat lintang dan hari dalam setahun (DOY).
   */
  static calculateExtraterrestrialRa(latitudeDeg: number, date: Date = new Date()): { Ra: number; N: number } {
    const phi = (latitudeDeg * Math.PI) / 180; // Konversi lintang ke radian
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const J = Math.floor(diff / (1000 * 60 * 60 * 24)); // Day of Year (1 - 365)

    // Jarak relatif bumi-matahari (dr) & deklinasi surya (delta)
    const dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365);
    const delta = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39);

    // Sudut jam terbenam matahari (sunset hour angle, ws)
    const tanTan = -Math.tan(phi) * Math.tan(delta);
    const ws = Math.acos(Math.max(-1, Math.min(1, tanTan)));

    // Radiasi ekstraterestrial harian (Ra) dalam MJ/m²/hari (Gsc = 0.0820 MJ/m²/menit)
    const Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (
      ws * Math.sin(phi) * Math.sin(delta) +
      Math.cos(phi) * Math.cos(delta) * Math.sin(ws)
    );

    // Panjang hari maksimum teoritis (N, jam)
    const N = (24 / Math.PI) * ws;

    return {
      Ra: Number(Ra.toFixed(2)),
      N: Number(N.toFixed(1)),
    };
  }

  /**
   * Estimasi radiasi surya harian (Rs) dari tutupan awan BMKG (%) dan Ra.
   * Menggunakan formula Angstrom-Prescott terbalik berdasarkan Total Cloud Cover (TCC %).
   */
  static estimateSolarRadiationFromCloud(tccPercent: number, Ra: number): number {
    // Sunshine ratio n/N diperkirakan dari 1 - (TCC / 100)
    const sunshineRatio = Math.max(0, Math.min(1, 1 - (tccPercent / 100)));
    const as = 0.25;
    const bs = 0.50;
    const Rs = (as + bs * sunshineRatio) * Ra;
    return Number(Rs.toFixed(2));
  }
}
