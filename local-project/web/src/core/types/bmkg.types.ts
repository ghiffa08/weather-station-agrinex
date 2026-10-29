export interface BmkgForecastData {
  timestamp: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather_desc: string;
  weather_icon: string;
}

export interface TomorrowForecast {
  date: string;
  condition: string;
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
  windSpeed: number;
  rainProbability: number;
}

export interface BmkgApiResponse {
  lokasi: BmkgLokasi;
  data: BmkgDataEntry[];
}

export interface BmkgLokasi {
  adm1: string;
  adm2: string;
  adm3: string;
  adm4: string;
  provinsi: string;
  kotkab: string;
  kecamatan: string;
  desa: string;
  lon: number;
  lat: number;
  timezone: string;
}

export interface BmkgDataEntry {
  lokasi: BmkgLokasi & { type: string };
  cuaca: BmkgCuacaEntry[][];
}

export interface BmkgCuacaEntry {
  datetime: string;
  local_datetime: string;
  t: number;
  hu: number;
  ws: number;
  wd: string;
  wd_to: string;
  wd_deg: number;
  weather: number;
  weather_desc: string;
  weather_desc_en: string;
  tcc: number;
  tp: number;
  vs: number;
  vs_text: string;
  image: string;
  analysis_date: string;
  time_index: string;
}
