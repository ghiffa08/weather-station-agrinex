/**
 * Agrinex Weather Station — Time Series Matcher & Resampling Engine
 * Standar: WMO Temporal Aggregation & Matched-Pair Validation
 */

import type { WeatherTelemetry } from '../types/weather.types';
import type { BmkgCuacaEntry } from '../types/bmkg.types';
import { EnvironmentalPhysics } from './EnvironmentalPhysics';

export interface MatchedComparisonPoint {
  timeLabel: string;          // e.g. "14:00"
  fullTimestamp: string;      // e.g. "2026-10-29 14:00"
  dateLabel: string;          // e.g. "29 Okt"

  // Suhu (°C)
  Field_Temp: number;
  BMKG_Temp: number;
  delta_temp: number;

  // Kelembapan (%)
  Field_Hum: number;
  BMKG_Hum: number;
  delta_hum: number;

  // Kecepatan Angin (m/s)
  Field_Wind: number;
  BMKG_Wind: number;
  delta_wind: number;

  // Radiasi Surya (W/m²)
  Field_Solar_Wm2: number;
  BMKG_Estimated_Solar_Wm2?: number;

  weatherDesc: string;
  tccCloudCover?: number;
}

export class TimeSeriesMatcher {
  /**
   * Menyelaraskan data telemetri IoT (15 menit) dengan titik prakiraan BMKG (3 jam).
   * Melakukan bucket averaging pada telemetri IoT dalam rentang ±90 menit dari setiap titik BMKG.
   */
  static matchSeries(
    telemetryHistory: WeatherTelemetry[],
    bmkgEntries: BmkgCuacaEntry[]
  ): MatchedComparisonPoint[] {
    if (!bmkgEntries || bmkgEntries.length === 0) {
      return [];
    }

    const matched: MatchedComparisonPoint[] = [];

    // Urutkan BMKG entries secara kronologis
    const sortedBmkg = [...bmkgEntries].sort((a, b) => {
      const timeA = new Date(a.datetime || a.local_datetime).getTime();
      const timeB = new Date(b.datetime || b.local_datetime).getTime();
      return timeA - timeB;
    });

    for (const bPoint of sortedBmkg) {
      const bTime = new Date(bPoint.datetime || bPoint.local_datetime).getTime();
      if (isNaN(bTime)) continue;

      // Cari semua log IoT dalam jendela toleransi ±90 menit (1.5 jam)
      const windowMs = 90 * 60 * 1000;
      const matchingIot = telemetryHistory.filter((t) => {
        if (!t.timestamp) return false;
        const iTime = new Date(t.timestamp).getTime();
        return Math.abs(iTime - bTime) <= windowMs;
      });

      if (matchingIot.length > 0) {
        // Hitung rata-rata sampel IoT dalam bucket
        let sumTemp = 0;
        let sumHum = 0;
        let sumWind = 0;
        let sumLux = 0;

        for (const log of matchingIot) {
          sumTemp += log.temperature ?? 0;
          sumHum += log.humidity ?? 0;
          sumWind += log.wind_speed ?? 0;
          sumLux += log.light_lux ?? 0;
        }

        const count = matchingIot.length;
        const avgTempIot = Number((sumTemp / count).toFixed(1));
        const avgHumIot = Number((sumHum / count).toFixed(1));
        const avgLuxIot = sumLux / count;

        // Normalisasi kecepatan angin IoT (km/h ke m/s dan tinggi 2m)
        const windIotMs = EnvironmentalPhysics.kmhToMs(sumWind / count);
        const normWindIotU2 = EnvironmentalPhysics.normalizeWindTo2Meters(windIotMs, 1.5);

        // Angin BMKG: dikonversi dari km/h ke m/s
        const windBmkgMs = EnvironmentalPhysics.kmhToMs(bPoint.ws);

        // Radiasi Surya dari Lux
        const solarWm2 = EnvironmentalPhysics.luxToSolarIrradiance(avgLuxIot);

        const d = new Date(bPoint.local_datetime || bPoint.datetime);
        const timeLabel = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        matched.push({
          timeLabel,
          fullTimestamp: bPoint.local_datetime || bPoint.datetime,
          dateLabel,
          Field_Temp: avgTempIot,
          BMKG_Temp: Number(bPoint.t.toFixed(1)),
          delta_temp: Number((avgTempIot - bPoint.t).toFixed(1)),

          Field_Hum: avgHumIot,
          BMKG_Hum: Number(bPoint.hu.toFixed(1)),
          delta_hum: Number((avgHumIot - bPoint.hu).toFixed(1)),

          Field_Wind: normWindIotU2,
          BMKG_Wind: windBmkgMs,
          delta_wind: Number((normWindIotU2 - windBmkgMs).toFixed(1)),

          Field_Solar_Wm2: solarWm2,
          weatherDesc: bPoint.weather_desc,
          tccCloudCover: bPoint.tcc,
        });
      }
    }

    return matched;
  }

  /**
   * Menghasilkan deret perbandingan kontinu untuk grafik real-time (Interleaved Recent Points).
   * Menggabungkan log riwayat IoT 15 menitan terbaru dengan ramalan BMKG terdekat.
   */
  static generateContinuousComparison(
    telemetryHistory: WeatherTelemetry[],
    bmkgEntries: BmkgCuacaEntry[],
    maxPoints: number = 30
  ): MatchedComparisonPoint[] {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return [];
    }

    // Urutkan telemetri dari terlama ke terbaru
    const sortedLogs = [...telemetryHistory]
      .filter((t) => t.timestamp && !isNaN(new Date(t.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-maxPoints);

    if (sortedLogs.length === 0) return [];

    return sortedLogs.map((log) => {
      const logDate = new Date(log.timestamp);
      const logTime = logDate.getTime();

      // Cari titik BMKG terdekat dengan waktu log ini
      let closestBmkg: BmkgCuacaEntry | null = null;
      let minDiff = Infinity;

      for (const b of bmkgEntries) {
        const bTime = new Date(b.datetime || b.local_datetime).getTime();
        const diff = Math.abs(bTime - logTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestBmkg = b;
        }
      }

      const bmkgTemp = closestBmkg ? closestBmkg.t : log.temperature;
      const bmkgHum = closestBmkg ? closestBmkg.hu : log.humidity;
      const bmkgWindMs = closestBmkg ? EnvironmentalPhysics.kmhToMs(closestBmkg.ws) : 0;

      const rawWindKmh = log.wind_speed ?? 0;
      const windIotMs = Math.min(50, EnvironmentalPhysics.kmhToMs(rawWindKmh > 180 ? 180 : rawWindKmh));
      const normWindIot = EnvironmentalPhysics.normalizeWindTo2Meters(windIotMs, 1.5);
      const solarWm2 = EnvironmentalPhysics.luxToSolarIrradiance(log.light_lux ?? 0);

      const timeLabel = logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dateLabel = logDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      return {
        timeLabel,
        fullTimestamp: log.timestamp,
        dateLabel,
        Field_Temp: Number(log.temperature.toFixed(1)),
        BMKG_Temp: Number(bmkgTemp.toFixed(1)),
        delta_temp: Number((log.temperature - bmkgTemp).toFixed(1)),

        Field_Hum: Number(log.humidity.toFixed(1)),
        BMKG_Hum: Number(bmkgHum.toFixed(1)),
        delta_hum: Number((log.humidity - bmkgHum).toFixed(1)),

        Field_Wind: normWindIot,
        BMKG_Wind: bmkgWindMs,
        delta_wind: Number((normWindIot - bmkgWindMs).toFixed(1)),

        Field_Solar_Wm2: solarWm2,
        weatherDesc: closestBmkg?.weather_desc || 'Normal',
        tccCloudCover: closestBmkg?.tcc,
      };
    });
  }

  /**
   * Menghitung nilai ekstrem harian (T-Min, T-Max, RH-Min, RH-Max) asli dari array BMKG.
   */
  static extractRealBmkgExtremes(entries: BmkgCuacaEntry[]): {
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    avgWindKmh: number;
  } {
    if (!entries || entries.length === 0) {
      return { tempMin: 22, tempMax: 32, humMin: 55, humMax: 95, avgWindKmh: 5 };
    }

    const temps = entries.map((e) => e.t);
    const hums = entries.map((e) => e.hu);
    const winds = entries.map((e) => e.ws);

    return {
      tempMin: Number(Math.min(...temps).toFixed(1)),
      tempMax: Number(Math.max(...temps).toFixed(1)),
      humMin: Number(Math.min(...hums).toFixed(1)),
      humMax: Number(Math.max(...hums).toFixed(1)),
      avgWindKmh: Number((winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1)),
    };
  }
}
