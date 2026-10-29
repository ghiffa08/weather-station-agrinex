import { useState, useEffect } from 'react';
import type { BmkgForecastData, TomorrowForecast } from '../core/types/bmkg.types';
import type { WeatherTelemetry } from '../core/types/weather.types';
import { bmkgDataSource } from '../data/sources/BmkgApiDataSource';

export function useBmkgComparison(_fieldData: WeatherTelemetry | null) {
  const [bmkgData, setBmkgData] = useState<BmkgForecastData | null>(null);
  const [tomorrowForecast, setTomorrowForecast] = useState<TomorrowForecast | null>(null);

  useEffect(() => {
    const fetchBmkg = async () => {
      try {
        const obs = await bmkgDataSource.fetchCurrentObservation();
        const forecast = await bmkgDataSource.fetchTomorrowForecast();
        setBmkgData(obs);
        setTomorrowForecast(forecast);
      } catch (e) {
        console.error('Failed to fetch BMKG:', e);
      }
    };

    fetchBmkg();
    const interval = setInterval(fetchBmkg, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { bmkgData, tomorrowForecast };
}
