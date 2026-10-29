import type { BmkgForecastData, TomorrowForecast, BmkgApiResponse, BmkgCuacaEntry } from '../../core/types/bmkg.types';
import { LOCATION_CONFIG } from '../../core/config/location.config';

const BMKG_API_ORIGINAL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
const BMKG_API_PROXY = '/bmkg-api/publik/prakiraan-cuaca';

let cachedResponse: BmkgApiResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

let inFlightPromise: Promise<BmkgApiResponse> | null = null;

async function requestBmkgJson(url: string, timeoutMs = 15000): Promise<BmkgApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`BMKG HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export class BmkgApiDataSource {

  private async fetchFromApi(): Promise<BmkgApiResponse> {
    const now = Date.now();
    
    if (cachedResponse && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return cachedResponse;
    }

    if (inFlightPromise) {
      return inFlightPromise;
    }

    const queryParam = `?adm4=${LOCATION_CONFIG.bmkgAdm4}`;

    inFlightPromise = (async () => {
      // 1. In Dev mode, always use Vite server proxy to avoid CORS
      if ((import.meta as any).env?.DEV) {
        try {
          const data = await requestBmkgJson(`${BMKG_API_PROXY}${queryParam}`);
          cachedResponse = data;
          cacheTimestamp = Date.now();
          return data;
        } catch (devErr) {
          console.warn('[BMKG] Dev proxy request gagal:', devErr);
        }
      }

      // 2. Try AllOrigins CORS proxy for reliable browser fetching
      try {
        const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${BMKG_API_ORIGINAL}${queryParam}`)}`;
        const data = await requestBmkgJson(allOriginsUrl, 15000);
        cachedResponse = data;
        cacheTimestamp = Date.now();
        return data;
      } catch (corsErr) {
        console.warn('[BMKG] AllOrigins fetch gagal:', corsErr);
      }

      // 3. Fallback to cached response if available
      if (cachedResponse) {
        return cachedResponse;
      }

      throw new Error('Semua koneksi ke BMKG gagal atau diblokir CORS.');
    })().finally(() => {
      inFlightPromise = null;
    });

    return inFlightPromise;
  }

  async fetchCurrentObservation(): Promise<BmkgForecastData> {
    const apiData = await this.fetchFromApi();
    const todayCuaca = apiData.data[0]?.cuaca[0];

    if (!todayCuaca || todayCuaca.length === 0) {
      throw new Error('Tidak ada data cuaca hari ini dari BMKG');
    }

    const closest = this.findClosestEntry(todayCuaca);

    return {
      timestamp: closest.local_datetime,
      temperature: closest.t,
      humidity: closest.hu,
      wind_speed: closest.ws,
      weather_desc: closest.weather_desc,
      weather_icon: closest.image,
    };
  }

  async fetchTomorrowForecast(): Promise<TomorrowForecast> {
    const apiData = await this.fetchFromApi();
    const tomorrowCuaca = apiData.data[0]?.cuaca[1];

    if (!tomorrowCuaca || tomorrowCuaca.length === 0) {
      throw new Error('Tidak ada data prakiraan besok dari BMKG');
    }

    const temps = tomorrowCuaca.map(e => e.t);
    const hums = tomorrowCuaca.map(e => e.hu);
    const winds = tomorrowCuaca.map(e => e.ws);
    const tccs = tomorrowCuaca.map(e => e.tcc);

    const conditionCounts = new Map<string, number>();
    for (const entry of tomorrowCuaca) {
      conditionCounts.set(entry.weather_desc, (conditionCounts.get(entry.weather_desc) || 0) + 1);
    }
    let dominantCondition = tomorrowCuaca[0].weather_desc;
    let maxCount = 0;
    for (const [desc, count] of conditionCounts) {
      if (count > maxCount) {
        dominantCondition = desc;
        maxCount = count;
      }
    }

    const tomorrowDateStr = tomorrowCuaca[0].local_datetime.split(' ')[0];
    const tomorrowDate = new Date(tomorrowDateStr + 'T00:00:00+07:00');
    const dateFormatted = tomorrowDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const avgTcc = tccs.reduce((a, b) => a + b, 0) / tccs.length;
    const hasRain = tomorrowCuaca.some(e => e.tp > 0);
    const rainProb = hasRain ? Math.min(90, avgTcc + 15) : Math.round(avgTcc * 0.6);

    return {
      date: dateFormatted,
      condition: dominantCondition,
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      humidityMin: Math.min(...hums),
      humidityMax: Math.max(...hums),
      windSpeed: Number((winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1)),
      rainProbability: rainProb,
    };
  }

  private findClosestEntry(entries: BmkgCuacaEntry[]): BmkgCuacaEntry {
    const now = new Date();
    let closest = entries[0];
    let minDiff = Infinity;

    for (const entry of entries) {
      const entryTime = new Date(entry.local_datetime.replace(' ', 'T') + '+07:00');
      const diff = Math.abs(now.getTime() - entryTime.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry;
      }
    }

    return closest;
  }
}

export const bmkgDataSource = new BmkgApiDataSource();
