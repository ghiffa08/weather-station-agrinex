/**
 * Agrinex Weather Station — Statistical Benchmark & Accuracy Evaluation Engine
 * Standar: WMO & Evaluasi Model Meteorologi
 */

export interface VariableMetrics {
  sampleCount: number;
  mae: number;              // Mean Absolute Error
  rmse: number;             // Root Mean Square Error
  mape: number;             // Mean Absolute Percentage Error (%)
  mbe: number;              // Mean Bias Error (Bias: >0 overestimate, <0 underestimate)
  pearsonR: number;         // Korelasi Pearson (-1 s/d 1)
  rSquared: number;         // Koefisien Determinasi (0 s/d 1)
  indexOfAgreement: number; // Willmott Index of Agreement d (0 s/d 1)
  status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Kalibrasi';
  biasSummary: string;
}

export interface ComprehensiveBenchmarkReport {
  timestampGenerated: string;
  totalMatchedPoints: number;
  temperature: VariableMetrics;
  humidity: VariableMetrics;
  windSpeed: VariableMetrics;
}

export class BenchmarkCalculator {
  /**
   * Menghitung kumpulan metrik statistik untuk satu pasang deret data (Predicted vs Observed).
   */
  static evaluateSeries(fieldSeries: number[], bmkgSeries: number[]): VariableMetrics {
    const n = Math.min(fieldSeries.length, bmkgSeries.length);

    if (n < 2) {
      return {
        sampleCount: n,
        mae: 0,
        rmse: 0,
        mape: 0,
        mbe: 0,
        pearsonR: 1,
        rSquared: 1,
        indexOfAgreement: 1,
        status: 'Cukup',
        biasSummary: 'Data sampel belum mencukupi (minimal 2 titik waktu)',
      };
    }

    let sumDiffAbs = 0;
    let sumDiffSq = 0;
    let sumDiff = 0;
    let sumPctErr = 0;

    let sumField = 0;
    let sumBmkg = 0;

    for (let i = 0; i < n; i++) {
      const p = fieldSeries[i];
      const o = bmkgSeries[i];
      const diff = p - o;

      sumDiff += diff;
      sumDiffAbs += Math.abs(diff);
      sumDiffSq += diff * diff;

      if (Math.abs(o) > 0.001) {
        sumPctErr += Math.abs(diff / o);
      }

      sumField += p;
      sumBmkg += o;
    }

    const meanField = sumField / n;
    const meanBmkg = sumBmkg / n;

    const mae = Number((sumDiffAbs / n).toFixed(2));
    const rmse = Number(Math.sqrt(sumDiffSq / n).toFixed(2));
    const mbe = Number((sumDiff / n).toFixed(2));
    const mape = Number(((sumPctErr / n) * 100).toFixed(1));

    // Perhitungan Pearson r & Willmott d
    let numeratorR = 0;
    let denomFieldSq = 0;
    let denomBmkgSq = 0;
    let denomWillmott = 0;

    for (let i = 0; i < n; i++) {
      const p = fieldSeries[i];
      const o = bmkgSeries[i];

      const diffP = p - meanField;
      const diffO = o - meanBmkg;

      numeratorR += diffP * diffO;
      denomFieldSq += diffP * diffP;
      denomBmkgSq += diffO * diffO;

      const willmottTerm = Math.abs(p - meanBmkg) + Math.abs(o - meanBmkg);
      denomWillmott += willmottTerm * willmottTerm;
    }

    const denomR = Math.sqrt(denomFieldSq * denomBmkgSq);
    const pearsonR = denomR > 0 ? Number((numeratorR / denomR).toFixed(3)) : 0;
    const rSquared = Number((pearsonR * pearsonR).toFixed(3));

    const indexOfAgreement = denomWillmott > 0
      ? Number(Math.max(0, Math.min(1, 1 - (sumDiffSq / denomWillmott))).toFixed(3))
      : 1;

    // Evaluasi status kualitas kecocokan
    let status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Kalibrasi' = 'Baik';
    if (indexOfAgreement >= 0.90 && (mape < 10 || mae < 1.0)) {
      status = 'Sangat Baik';
    } else if (indexOfAgreement >= 0.75) {
      status = 'Baik';
    } else if (indexOfAgreement >= 0.50) {
      status = 'Cukup';
    } else {
      status = 'Perlu Kalibrasi';
    }

    let biasSummary = 'Netral (Deviasi seimbang)';
    if (mbe > 0.2) {
      biasSummary = `Sensor cenderung overestimate (+${mbe} dari BMKG)`;
    } else if (mbe < -0.2) {
      biasSummary = `Sensor cenderung underestimate (${mbe} dari BMKG)`;
    }

    return {
      sampleCount: n,
      mae,
      rmse,
      mape,
      mbe,
      pearsonR,
      rSquared,
      indexOfAgreement,
      status,
      biasSummary,
    };
  }

  /**
   * Menghasilkan laporan lengkap untuk semua variabel cuaca.
   */
  static generateComprehensiveReport(
    matchedPoints: {
      temp_iot: number;
      temp_bmkg: number;
      hum_iot: number;
      hum_bmkg: number;
      wind_iot: number;
      wind_bmkg: number;
    }[]
  ): ComprehensiveBenchmarkReport {
    const tempsIot = matchedPoints.map(p => p.temp_iot);
    const tempsBmkg = matchedPoints.map(p => p.temp_bmkg);

    const humsIot = matchedPoints.map(p => p.hum_iot);
    const humsBmkg = matchedPoints.map(p => p.hum_bmkg);

    const windsIot = matchedPoints.map(p => p.wind_iot);
    const windsBmkg = matchedPoints.map(p => p.wind_bmkg);

    return {
      timestampGenerated: new Date().toISOString(),
      totalMatchedPoints: matchedPoints.length,
      temperature: this.evaluateSeries(tempsIot, tempsBmkg),
      humidity: this.evaluateSeries(humsIot, humsBmkg),
      windSpeed: this.evaluateSeries(windsIot, windsBmkg),
    };
  }
}
