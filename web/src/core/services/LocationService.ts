/**
 * Agrinex Weather Station — Dynamic BMKG Location & Administrative Hierarchy Service
 * Mengelola referensi lokasi BMKG (Kabupaten/Kota, Kecamatan, Kelurahan/Desa)
 * Terintegrasi langsung dengan parameter adm4 API BMKG Nasional.
 */

export interface LocationItem {
  adm4: string;           // Kode Kemendagri ADM4, misal "32.08.09.1002"
  province: string;       // Provinsi, misal "Jawa Barat"
  district: string;       // Kab/Kota, misal "Kabupaten Kuningan"
  subdistrict: string;    // Kecamatan, misal "Kecamatan Kuningan"
  village: string;        // Desa/Kelurahan, misal "Kelurahan Kuningan"
  latitude: number;
  longitude: number;
  elevation_m: number;
}

export const DEFAULT_LOCATION: LocationItem = {
  adm4: '32.08.09.1006',
  province: 'Jawa Barat',
  district: 'Kabupaten Kuningan',
  subdistrict: 'Kecamatan Kuningan',
  village: 'Kelurahan Purwawinangun',
  latitude: -6.9721,
  longitude: 108.4801,
  elevation_m: 555,
};

// Katalog Referensi Wilayah Populer (Hirarki Kabupaten, Kecamatan, Desa)
export const BMKG_LOCATION_CATALOG: LocationItem[] = [
  // --- KABUPATEN KUNINGAN ---
  {
    adm4: '32.08.09.1002',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Kuningan',
    latitude: -6.9788,
    longitude: 108.4771,
    elevation_m: 560,
  },
  {
    adm4: '32.08.09.1005',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Cijoho',
    latitude: -6.9654,
    longitude: 108.4832,
    elevation_m: 540,
  },
  {
    adm4: '32.08.09.1006',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Purwawinangun',
    latitude: -6.9721,
    longitude: 108.4801,
    elevation_m: 555,
  },
  {
    adm4: '32.08.09.1003',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Winduhaji',
    latitude: -6.9874,
    longitude: 108.4987,
    elevation_m: 580,
  },
  {
    adm4: '32.08.09.1001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Citangtu',
    latitude: -7.0019,
    longitude: 108.4924,
    elevation_m: 620,
  },
  {
    adm4: '32.08.09.1007',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Cigintung',
    latitude: -6.9589,
    longitude: 108.4745,
    elevation_m: 530,
  },
  {
    adm4: '32.08.09.1004',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kuningan',
    village: 'Kelurahan Windusengkahan',
    latitude: -6.9942,
    longitude: 108.4910,
    elevation_m: 590,
  },
  {
    adm4: '32.08.01.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Kadugede',
    village: 'Desa Sindangjawa',
    latitude: -7.0286,
    longitude: 108.4566,
    elevation_m: 640,
  },
  {
    adm4: '32.08.02.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Ciniru',
    village: 'Desa Pinara',
    latitude: -7.0816,
    longitude: 108.5186,
    elevation_m: 480,
  },
  {
    adm4: '32.08.06.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Luragung',
    village: 'Desa Dukuhpicung',
    latitude: -7.0527,
    longitude: 108.6260,
    elevation_m: 210,
  },
  {
    adm4: '32.08.10.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Ciawigebang',
    village: 'Desa Geresik',
    latitude: -6.9620,
    longitude: 108.5721,
    elevation_m: 310,
  },
  {
    adm4: '32.08.11.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Cidahu',
    village: 'Desa Cihideunggirang',
    latitude: -6.9766,
    longitude: 108.6165,
    elevation_m: 230,
  },
  {
    adm4: '32.08.12.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Jalaksana',
    village: 'Desa Sukamukti',
    latitude: -6.9233,
    longitude: 108.4413,
    elevation_m: 610,
  },
  {
    adm4: '32.08.14.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Mandirancan',
    village: 'Desa Cirea',
    latitude: -6.8030,
    longitude: 108.4600,
    elevation_m: 350,
  },
  {
    adm4: '32.08.15.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Kuningan',
    subdistrict: 'Kecamatan Selajambe',
    village: 'Desa Selajambe',
    latitude: -7.1137,
    longitude: 108.4614,
    elevation_m: 520,
  },

  // --- KOTA CIREBON ---
  {
    adm4: '32.74.01.1001',
    province: 'Jawa Barat',
    district: 'Kota Cirebon',
    subdistrict: 'Kecamatan Kejaksan',
    village: 'Kelurahan Kejaksan',
    latitude: -6.7063,
    longitude: 108.5570,
    elevation_m: 5,
  },

  // --- KABUPATEN BOGOR (DRAMAGA/IPB) ---
  {
    adm4: '32.01.29.2001',
    province: 'Jawa Barat',
    district: 'Kabupaten Bogor',
    subdistrict: 'Kecamatan Dramaga',
    village: 'Desa Mekarjaya',
    latitude: -6.5823,
    longitude: 106.7321,
    elevation_m: 250,
  },

  // --- DKI JAKARTA PUSAT ---
  {
    adm4: '31.71.01.1001',
    province: 'DKI Jakarta',
    district: 'Jakarta Pusat',
    subdistrict: 'Kecamatan Gambir',
    village: 'Kelurahan Gambir',
    latitude: -6.1754,
    longitude: 106.8272,
    elevation_m: 10,
  },
];

const LOCAL_STORAGE_LOCATION_KEY = 'agrinex_selected_bmkg_location';

class LocationServiceClass {
  private activeLocation: LocationItem = DEFAULT_LOCATION;
  private listeners: Array<(loc: LocationItem) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LOCATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.adm4) {
          this.activeLocation = parsed;
        }
      }
    } catch {
      // fallback to DEFAULT_LOCATION
    }
  }

  getActiveLocation(): LocationItem {
    return this.activeLocation;
  }

  setActiveLocation(location: LocationItem) {
    this.activeLocation = location;
    try {
      localStorage.setItem(LOCAL_STORAGE_LOCATION_KEY, JSON.stringify(location));
    } catch {
      // ignore
    }
    this.notify();
  }

  subscribe(listener: (loc: LocationItem) => void): () => void {
    this.listeners.push(listener);
    listener(this.activeLocation);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.activeLocation);
    }
  }

  /**
   * Mengambil metadata wilayah secara online dari API BMKG berdasarkan kode adm4.
   */
  async resolveAdm4FromApi(adm4Code: string): Promise<LocationItem | null> {
    const cleanCode = adm4Code.trim();
    if (!cleanCode) return null;

    // Cek katalog lokal terlebih dahulu
    const found = BMKG_LOCATION_CATALOG.find(l => l.adm4 === cleanCode);
    if (found) return found;

    try {
      const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(cleanCode)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const json = await res.json();
      const loc = json.lokasi || json.data?.[0]?.lokasi;
      if (!loc) return null;

      const newItem: LocationItem = {
        adm4: cleanCode,
        province: loc.provinsi || 'Indonesia',
        district: loc.kotkab ? (loc.kotkab.toLowerCase().includes('kota') || loc.kotkab.toLowerCase().includes('kabupaten') ? loc.kotkab : `Kab. ${loc.kotkab}`) : 'Kabupaten',
        subdistrict: loc.kecamatan ? `Kec. ${loc.kecamatan}` : 'Kecamatan',
        village: loc.desa ? (loc.desa.toLowerCase().includes('desa') || loc.desa.toLowerCase().includes('kelurahan') ? loc.desa : `Desa ${loc.desa}`) : 'Kelurahan',
        latitude: Number(loc.lat) || DEFAULT_LOCATION.latitude,
        longitude: Number(loc.lon) || DEFAULT_LOCATION.longitude,
        elevation_m: 500, // default estimate jika tidak tersedia
      };
      return newItem;
    } catch {
      return null;
    }
  }
}

export const LocationService = new LocationServiceClass();
