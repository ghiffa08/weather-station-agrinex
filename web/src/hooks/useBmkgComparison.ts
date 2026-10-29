import { useState, useEffect } from 'react';
import type { BmkgForecastData, TomorrowForecast, BmkgCuacaEntry } from '../core/types/bmkg.types';
import type { WeatherTelemetry } from '../core/types/weather.types';
import { weatherService } from '../core/di';

export interface TodayExtremes {
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  avgWind: number;
}

import { LocationService } from '../core/services/LocationService';

export function useBmkgComparison(fieldData: WeatherTelemetry | null) {
  const [bmkgData, setBmkgData] = useState<BmkgForecastData | null>(null);
  const [tomorrowForecast, setTomorrowForecast] = useState<TomorrowForecast | null>(null);
  const [todayExtremes, setTodayExtremes] = useState<TodayExtremes | null>(null);
  const [allCuacaEntries, setAllCuacaEntries] = useState<BmkgCuacaEntry[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchBmkg = async () => {
      try {
        const [obs, forecast, extremes, allEntries] = await Promise.all([
          weatherService.getBmkgObservation(),
          weatherService.getTomorrowForecast().catch(() => null),
          weatherService.getTodayExtremes().catch(() => null),
          weatherService.getAllCuacaEntries().catch(() => []),
        ]);

        if (isMounted) {
          setBmkgData(obs);
          setTomorrowForecast(forecast);
          setTodayExtremes(extremes);
          setAllCuacaEntries(allEntries);
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to fetch BMKG', e);
        if (isMounted) setLoading(false);
      }
    };

    const interval = setInterval(fetchBmkg, 15 * 60 * 1000); // 15 menit
    const unsub = LocationService.subscribe(() => {
      if (isMounted) setLoading(true);
      fetchBmkg();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (fieldData && bmkgData) {
      setMetrics(weatherService.calculateComparison(fieldData, bmkgData));
    }
  }, [fieldData, bmkgData]);

  return { bmkgData, tomorrowForecast, todayExtremes, allCuacaEntries, metrics, loading };
}
