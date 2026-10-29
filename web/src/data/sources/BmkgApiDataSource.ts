import type { BmkgForecastData, TomorrowForecast, BmkgApiResponse, BmkgCuacaEntry } from '../../core/types/bmkg.types';
import { LocationService } from '../../core/services/LocationService';

const BMKG_API_ORIGINAL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
const BMKG_API_PROXY = '/bmkg-api/publik/prakiraan-cuaca';

// Cache untuk menghindari request berlebihan (BMKG limit: 60 req/menit/IP)
let cachedResponse: BmkgApiResponse | null = null;
let cachedAdm4 = '';
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 menit — BMKG update 2x sehari

async function requestBmkgJson(url: string, timeoutMs = 8000): Promise<BmkgApiResponse> {
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
    const activeLoc = LocationService.getActiveLocation();
    const currentAdm4 = activeLoc.adm4;
    
    // Return cache jika masih valid untuk adm4 yang sama
    if (cachedResponse && cachedAdm4 === currentAdm4 && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return cachedResponse;
    }

    const queryParam = `?adm4=${encodeURIComponent(currentAdm4)}`;

    // 1. Pada mode Vite DEV, gunakan local proxy (/bmkg-api) agar bebas CORS & Cloudflare block
    if (import.meta.env.DEV) {
      try {
        const data = await requestBmkgJson(`${BMKG_API_PROXY}${queryParam}`);
        cachedResponse = data;
        cachedAdm4 = currentAdm4;
        cacheTimestamp = now;
        return data;
      } catch (devErr) {
        console.warn('[BMKG] Dev proxy request gagal, mencoba fallback direct...', devErr);
      }
    }

    // 2. Coba direct fetch (untuk production atau jika proxy dev gagal)
    try {
      const data = await requestBmkgJson(`${BMKG_API_ORIGINAL}${queryParam}`);
      cachedResponse = data;
      cachedAdm4 = currentAdm4;
      cacheTimestamp = now;
      return data;
    } catch (directErr) {
      console.warn('[BMKG] Direct fetch gagal (CORS/Cloudflare block), mencoba AllOrigins proxy...', directErr);
    }

    // 3. Fallback CORS proxy via allorigins.win (untuk browser client-side)
    try {
      const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${BMKG_API_ORIGINAL}${queryParam}`)}`;
      const data = await requestBmkgJson(allOriginsUrl, 12000);
      cachedResponse = data;
      cachedAdm4 = currentAdm4;
      cacheTimestamp = now;
      return data;
    } catch (corsErr) {
      // 4. Jika ada cache lama, gunakan sebagai fallback darurat
      if (cachedResponse) {
        console.warn('[BMKG] Semua fetch gagal, menggunakan cache lama:', corsErr);
        return cachedResponse;
      }
      throw corsErr;
    }
  }

  /**
   * Mendapatkan data cuaca terkini berdasarkan jam terdekat dari BMKG.
   */
  async fetchCurrentObservation(): Promise<BmkgForecastData> {
    const apiData = await this.fetchFromApi();
    const todayCuaca = apiData.data[0]?.cuaca[0]; // Hari pertama (hari ini)

    if (!todayCuaca || todayCuaca.length === 0) {
      throw new Error('Tidak ada data cuaca hari ini dari BMKG');
    }

    // Cari entri cuaca terdekat dengan waktu sekarang
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

  /**
   * Mendapatkan prakiraan cuaca besok — agregasi dari semua entri besok.
   */
  async fetchTomorrowForecast(): Promise<TomorrowForecast> {
    const apiData = await this.fetchFromApi();
    const tomorrowCuaca = apiData.data[0]?.cuaca[1]; // Hari kedua (besok)

    if (!tomorrowCuaca || tomorrowCuaca.length === 0) {
      throw new Error('Tidak ada data prakiraan besok dari BMKG');
    }

    // Hitung agregasi dari semua entri besok
    const temps = tomorrowCuaca.map(e => e.t);
    const hums = tomorrowCuaca.map(e => e.hu);
    const winds = tomorrowCuaca.map(e => e.ws);
    const tccs = tomorrowCuaca.map(e => e.tcc);

    // Ambil kondisi cuaca paling sering (mode)
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

    // Parse tanggal besok dari local_datetime
    const tomorrowDateStr = tomorrowCuaca[0].local_datetime.split(' ')[0];
    const tomorrowDate = new Date(tomorrowDateStr + 'T00:00:00+07:00');
    const dateFormatted = tomorrowDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Gunakan tutupan awan rata-rata sebagai proxy probability hujan
    const avgTcc = tccs.reduce((a, b) => a + b, 0) / tccs.length;
    // Jika ada curah hujan (tp > 0) di salah satu entri, naikkan probability
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

  /**
   * Cari entri cuaca terdekat dengan waktu lokal sekarang.
   */
  private findClosestEntry(entries: BmkgCuacaEntry[]): BmkgCuacaEntry {
    const now = new Date();
    let closest = entries[0];
    let minDiff = Infinity;

    for (const entry of entries) {
      // local_datetime format: "YYYY-MM-DD HH:mm:ss"
      const entryTime = new Date(entry.local_datetime.replace(' ', 'T') + '+07:00');
      const diff = Math.abs(now.getTime() - entryTime.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry;
      }
    }

    return closest;
  }

  /**
   * Mengambil semua entri titik waktu cuaca BMKG (hari 1, 2, dan 3) dalam bentuk array flat.
   */
  async fetchAllCuacaEntries(): Promise<BmkgCuacaEntry[]> {
    const apiData = await this.fetchFromApi();
    const cuacaDays = apiData.data[0]?.cuaca || [];
    const allEntries: BmkgCuacaEntry[] = [];
    for (const day of cuacaDays) {
      if (Array.isArray(day)) {
        allEntries.push(...day);
      }
    }
    return allEntries;
  }

  /**
   * Mengambil nilai ekstrem (Min & Max) asli untuk HARI INI dari BMKG.
   */
  async fetchTodayExtremes(): Promise<{
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    avgWind: number;
  }> {
    const apiData = await this.fetchFromApi();
    const todayCuaca = apiData.data[0]?.cuaca[0] || [];
    if (todayCuaca.length === 0) {
      return { tempMin: 22, tempMax: 32, humMin: 60, humMax: 95, avgWind: 5 };
    }
    const temps = todayCuaca.map(e => e.t);
    const hums = todayCuaca.map(e => e.hu);
    const winds = todayCuaca.map(e => e.ws);
    return {
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      humMin: Math.min(...hums),
      humMax: Math.max(...hums),
      avgWind: Number((winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1)),
    };
  }
}
