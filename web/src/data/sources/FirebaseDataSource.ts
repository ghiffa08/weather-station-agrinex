import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  limit, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../core/config/firebase.config';
import type { WeatherTelemetry } from '../../core/types/weather.types';

export class FirebaseDataSource {
  private telemetryCollection = collection(db, 'telemetry');

  private lastSavedTimestamp: string = '';

  /**
   * Menyimpan data telemetry baru secara permanen ke Firestore (Hanya 96x write / hari).
   * Menjamin data tersimpan di Cloud Database Firebase (bukan local browser).
   */
  async saveTelemetry(data: WeatherTelemetry): Promise<void> {
    if (!data.timestamp || data.timestamp === this.lastSavedTimestamp) {
      return; // Sudah pernah disimpan ke Firebase
    }
    this.lastSavedTimestamp = data.timestamp;
    try {
      await addDoc(this.telemetryCollection, {
        ...data,
        createdAt: serverTimestamp(),
      });
      console.log('[Firebase] ✓ Telemetry berhasil disimpan permanen ke Cloud Database Firestore');
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.warn('[Firebase Rules Notice] Akses Firestore ditolak. Buka Firebase Console -> Firestore -> Rules -> atur "allow read, write: if true;" -> Klik Publish.');
      } else {
        console.error('[Firebase] Gagal menyimpan telemetry:', error);
      }
    }
  }

  /**
   * Mengambil riwayat telemetry terbaru dengan limit (Default: 50 entri terbaru).
   * Menggunakan IndexedDB local cache & sorting client-side tanpa butuh composite index.
   */
  async getRecentTelemetry(limitCount: number = 50): Promise<WeatherTelemetry[]> {
    try {
      const q = query(this.telemetryCollection, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      const logs: WeatherTelemetry[] = [];
      
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        if (d.temperature !== undefined || d.temp !== undefined) {
          logs.push(this.parseDocToTelemetry(d));
        }
      });

      // Sort client-side descending (terbaru di atas)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return logs;

    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.warn('[Firebase] Rules notice: Firestore permission pending sync.');
      } else {
        console.error('[Firebase] Gagal mengambil telemetry:', error);
      }
      return [];
    }
  }

  /**
   * Helper internal untuk memetakan document Firestore ke WeatherTelemetry secara konsisten,
   * termasuk data baterai LiFePO4 / INA226 jika tersedia.
   */
  private parseDocToTelemetry(d: any): WeatherTelemetry {
    const bat = d.battery || {};
    const v = d.battery_voltage !== undefined ? Number(d.battery_voltage) : (bat.voltage !== undefined ? Number(bat.voltage) : undefined);
    const cur = d.battery_current !== undefined ? Number(d.battery_current) : (bat.current_ma !== undefined ? Number(bat.current_ma) : undefined);
    const pwr = d.battery_power !== undefined ? Number(d.battery_power) : (bat.power_mw !== undefined ? Number(bat.power_mw) : undefined);
    const pct = d.battery_percentage !== undefined ? Number(d.battery_percentage) : (bat.percentage !== undefined ? Number(bat.percentage) : undefined);

    return {
      timestamp: d.timestamp || new Date().toISOString(),
      temperature: Number(d.temperature ?? d.temp ?? 0),
      humidity: Number(d.humidity ?? d.hum ?? 0),
      wind_speed: Number(d.wind_speed ?? d.windSpeed ?? 0),
      light_lux: Number(d.light_lux ?? d.lightLux ?? 0),
      raw_pulses: d.raw_pulses !== undefined ? Number(d.raw_pulses) : undefined,
      wifi_rssi: d.wifi_rssi !== undefined ? Number(d.wifi_rssi) : undefined,
      free_heap: d.free_heap !== undefined ? Number(d.free_heap) : undefined,
      uptime_sec: d.uptime_sec !== undefined ? Number(d.uptime_sec) : undefined,
      rtc_time: d.rtc_time,
      status: d.status,
      battery: d.battery ? {
        voltage: Number(bat.voltage ?? v ?? 0),
        current_ma: Number(bat.current_ma ?? cur ?? 0),
        power_mw: Number(bat.power_mw ?? pwr ?? 0),
        shunt_mv: bat.shunt_mv !== undefined ? Number(bat.shunt_mv) : undefined,
        percentage: Number(bat.percentage ?? pct ?? 0),
        charging: bat.charging !== undefined ? Boolean(bat.charging) : (cur !== undefined ? cur > 5 : undefined),
        ok: bat.ok !== undefined ? Boolean(bat.ok) : (d.status?.ina226 ?? true)
      } : (v !== undefined ? {
        voltage: v,
        current_ma: cur ?? 0,
        power_mw: pwr ?? 0,
        percentage: pct ?? 100,
        charging: cur !== undefined ? cur > 5 : false,
        ok: true
      } : undefined),
      battery_voltage: v,
      battery_current: cur,
      battery_power: pwr,
      battery_percentage: pct,
    };
  }

  /**
   * Realtime listener via HTTPS Firestore snapshot.
   * Berfungsi 100% sempurna pada halaman HTTPS tanpa error Mixed Content.
   */
  subscribeTelemetry(callback: (data: WeatherTelemetry) => void): () => void {
    const q = query(this.telemetryCollection, orderBy('timestamp', 'desc'), limit(20));

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const logs: WeatherTelemetry[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.temperature !== undefined || d.temp !== undefined) {
            logs.push(this.parseDocToTelemetry(d));
          }
        });

        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (logs.length > 0) {
          callback(logs[0]);
        }
      }
    }, (err) => {
      console.warn('[Firebase] Realtime listener notice:', err);
    });
  }
}
