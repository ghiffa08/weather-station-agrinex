import { useMemo } from 'react';
import type { WeatherTelemetry } from '../core/types/weather.types';
import type { BmkgCuacaEntry, BmkgForecastData } from '../core/types/bmkg.types';
import { TimeSeriesMatcher } from '../core/services/TimeSeriesMatcher';
import { BenchmarkCalculator, type ComprehensiveBenchmarkReport } from '../core/services/BenchmarkCalculator';
import { EtoCalculator, type EtoComparisonResult } from '../core/services/EtoCalculator';
import { LOCATION_CONFIG } from '../core/config/location.config';
import { EnvironmentalPhysics } from '../core/services/EnvironmentalPhysics';

interface UseComparativeAnalyticsProps {
  telemetryLogs: WeatherTelemetry[];
  allCuacaEntries: BmkgCuacaEntry[];
  todayExtremes: {
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    avgWind: number;
  } | null;
  fieldData: WeatherTelemetry | null;
  bmkgData: BmkgForecastData | null;
}

export function useComparativeAnalytics({
  telemetryLogs,
  allCuacaEntries,
  todayExtremes,
  fieldData,
  bmkgData,
}: UseComparativeAnalyticsProps) {
  // 1. Deret perbandingan kontinu untuk grafik real-time
  const continuousChartData = useMemo(() => {
    return TimeSeriesMatcher.generateContinuousComparison(
      telemetryLogs,
      allCuacaEntries,
      30
    );
  }, [telemetryLogs, allCuacaEntries]);

  // 2. Titik-titik berpasangan temporal matched untuk validasi statistik
  const matchedPoints = useMemo(() => {
    const directMatched = TimeSeriesMatcher.matchSeries(telemetryLogs, allCuacaEntries);
    if (directMatched.length >= 2) {
      return directMatched;
    }
    // Jika data bucket time window masih sedikit, gunakan continuous series sebagai sampel
    return continuousChartData;
  }, [telemetryLogs, allCuacaEntries, continuousChartData]);

  // 3. Evaluasi metrik statistik (MAE, RMSE, MAPE, MBE, Pearson r)
  const benchmarkReport = useMemo<ComprehensiveBenchmarkReport | null>(() => {
    if (matchedPoints.length < 2) return null;
    return BenchmarkCalculator.generateComprehensiveReport(
      matchedPoints.map((p) => ({
        temp_iot: p.Field_Temp,
        temp_bmkg: p.BMKG_Temp,
        hum_iot: p.Field_Hum,
        hum_bmkg: p.BMKG_Hum,
        wind_iot: p.Field_Wind,
        wind_bmkg: p.BMKG_Wind,
      }))
    );
  }, [matchedPoints]);

  // 4. Perhitungan ETo FAO-56 Penman-Monteith (IoT vs BMKG)
  const etoResult = useMemo<EtoComparisonResult | null>(() => {
    if (!fieldData || !bmkgData) return null;

    // Nilai suhu ekstrem dari IoT logs hari ini
    const todayLogs = telemetryLogs.filter((l) => {
      const d = new Date(l.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });

    const iotTemps = todayLogs.length > 0 ? todayLogs.map((l) => l.temperature) : [fieldData.temperature];
    const iotHums = todayLogs.length > 0 ? todayLogs.map((l) => l.humidity) : [fieldData.humidity];
    const iotWinds = todayLogs.length > 0 ? todayLogs.map((l) => l.wind_speed) : [fieldData.wind_speed];
    const iotLux = todayLogs.length > 0 ? todayLogs.map((l) => l.light_lux) : [fieldData.light_lux];

    const iotTmin = Math.min(...iotTemps);
    const iotTmax = Math.max(...iotTemps);
    const iotRhMean = iotHums.reduce((a, b) => a + b, 0) / iotHums.length;
    const iotWindAvgMs = EnvironmentalPhysics.normalizeWindTo2Meters(
      EnvironmentalPhysics.kmhToMs(iotWinds.reduce((a, b) => a + b, 0) / iotWinds.length),
      1.5
    );

    // Integrasi radiasi harian dari Lux
    const avgLux = iotLux.reduce((a, b) => a + b, 0) / iotLux.length;
    const avgSolarWm2 = EnvironmentalPhysics.luxToSolarIrradiance(avgLux);
    // 12 jam penyinaran efektif rata-rata: W/m² * 12 * 3600 * 10^-6 MJ/m²
    const iotRs = Number(((avgSolarWm2 * 12 * 3600) / 1e6).toFixed(2));

    // Nilai ekstrem BMKG asli
    const bmkgTmin = todayExtremes?.tempMin ?? (bmkgData.temperature - 3);
    const bmkgTmax = todayExtremes?.tempMax ?? (bmkgData.temperature + 4);
    const bmkgRhMean = todayExtremes?.humMin
      ? (todayExtremes.humMin + todayExtremes.humMax) / 2
      : bmkgData.humidity;
    const bmkgWindMs = EnvironmentalPhysics.kmhToMs(todayExtremes?.avgWind ?? bmkgData.wind_speed);

    // Estimasi Rs BMKG
    const { Ra } = EnvironmentalPhysics.calculateExtraterrestrialRa(LOCATION_CONFIG.latitude);
    const bmkgRs = EnvironmentalPhysics.estimateSolarRadiationFromCloud(65, Ra);

    return EtoCalculator.compareEto(
      {
        tMax: iotTmax,
        tMin: iotTmin,
        tMean: (iotTmax + iotTmin) / 2,
        rhMean: iotRhMean,
        windSpeed2m: iotWindAvgMs,
        solarRadiationRs: Math.max(8, iotRs),
        elevationMeters: LOCATION_CONFIG.elevation_m,
        latitudeDeg: LOCATION_CONFIG.latitude,
      },
      {
        tMax: bmkgTmax,
        tMin: bmkgTmin,
        tMean: (bmkgTmax + bmkgTmin) / 2,
        rhMean: bmkgRhMean,
        windSpeed2m: bmkgWindMs,
        solarRadiationRs: Math.max(8, bmkgRs),
        elevationMeters: LOCATION_CONFIG.elevation_m,
        latitudeDeg: LOCATION_CONFIG.latitude,
      }
    );
  }, [fieldData, bmkgData, telemetryLogs, todayExtremes]);

  return {
    continuousChartData,
    matchedPoints,
    benchmarkReport,
    etoResult,
  };
}
