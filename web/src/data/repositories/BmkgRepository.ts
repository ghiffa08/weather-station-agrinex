import type { BmkgForecastData } from '../../core/types/bmkg.types';
import { BmkgApiDataSource } from '../sources/BmkgApiDataSource';

export interface IBmkgRepository {
  getLatestObservation(): Promise<BmkgForecastData>;
  getTomorrowForecast(): Promise<import('../../core/types/bmkg.types').TomorrowForecast>;
  getAllCuacaEntries(): Promise<import('../../core/types/bmkg.types').BmkgCuacaEntry[]>;
  getTodayExtremes(): Promise<{
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    avgWind: number;
  }>;
}

export class BmkgRepository implements IBmkgRepository {
  private apiSource: BmkgApiDataSource;

  constructor(apiSource: BmkgApiDataSource) {
    this.apiSource = apiSource;
  }

  async getLatestObservation(): Promise<BmkgForecastData> {
    return this.apiSource.fetchCurrentObservation();
  }

  async getTomorrowForecast(): Promise<import('../../core/types/bmkg.types').TomorrowForecast> {
    return this.apiSource.fetchTomorrowForecast();
  }

  async getAllCuacaEntries(): Promise<import('../../core/types/bmkg.types').BmkgCuacaEntry[]>{
    return this.apiSource.fetchAllCuacaEntries();
  }

  async getTodayExtremes(): Promise<{
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    avgWind: number;
  }> {
    return this.apiSource.fetchTodayExtremes();
  }
}
