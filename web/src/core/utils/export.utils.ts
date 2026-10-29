import type { WeatherTelemetry } from '../types/weather.types';

/**
 * Escapes CSV field value according to RFC 4180:
 * - Wraps with quotes if it contains commas, double quotes, or newlines
 * - Replaces any internal double quote with double double quotes ("")
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports telemetry array as an optimal RFC 4180 compliant CSV file download.
 * Includes UTF-8 BOM (\uFEFF) so Microsoft Excel, LibreOffice Calc, and Google Sheets
 * open accented characters and symbols (°C, %, etc.) seamlessly.
 */
export function downloadTelemetryCsv(
  data: WeatherTelemetry[], 
  filename: string = `telemetry_kuningan_${new Date().toISOString().slice(0, 10)}.csv`
) {
  if (!data || data.length === 0) {
    console.warn('[Export] Data telemetry kosong, download dibatalkan.');
    return;
  }

  const headers = [
    'Waktu (ISO 8601)',
    'Waktu Lokal (WIB)',
    'Suhu Udara (°C)',
    'Kelembapan Relatif (%)',
    'Kecepatan Angin (km/h)',
    'Intensitas Cahaya (Lux)',
    'Tegangan Baterai (V)',
    'Arus Baterai (mA)',
    'Daya Baterai (mW)',
    'Persentase Baterai (%)',
    'Status Pengisian',
    'WiFi RSSI (dBm)',
    'Uptime (detik)',
    'Hardware Status'
  ];

  const rows = data.map(item => {
    let localTimeStr = '';
    try {
      localTimeStr = new Date(item.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    } catch {
      localTimeStr = item.timestamp;
    }

    const bat = item.battery;
    const v = item.battery_voltage ?? bat?.voltage ?? '';
    const cur = item.battery_current ?? bat?.current_ma ?? '';
    const pwr = item.battery_power ?? bat?.power_mw ?? '';
    const pct = item.battery_percentage ?? bat?.percentage ?? '';
    const charging = bat?.charging !== undefined ? (bat.charging ? 'Charging' : 'Discharging') : '';

    const hardwareStatus = item.status ? 
      `DHT:${item.status.dht22 ? 'OK' : 'ERR'}|BH:${item.status.bh1750 ? 'OK' : 'ERR'}|ANEMO:${item.status.anemometer ? 'OK' : 'ERR'}|RTC:${item.status.rtc_ds3231 ? 'OK' : 'OFF'}|SD:${item.status.sd_card ? 'OK' : 'OFF'}` :
      '';

    return [
      escapeCsvValue(item.timestamp),
      escapeCsvValue(localTimeStr),
      escapeCsvValue(item.temperature !== undefined ? item.temperature.toFixed(1) : ''),
      escapeCsvValue(item.humidity !== undefined ? item.humidity.toFixed(1) : ''),
      escapeCsvValue(item.wind_speed !== undefined ? item.wind_speed.toFixed(1) : ''),
      escapeCsvValue(item.light_lux !== undefined ? Math.round(item.light_lux) : ''),
      escapeCsvValue(typeof v === 'number' ? v.toFixed(2) : v),
      escapeCsvValue(typeof cur === 'number' ? cur.toFixed(1) : cur),
      escapeCsvValue(typeof pwr === 'number' ? pwr.toFixed(1) : pwr),
      escapeCsvValue(pct),
      escapeCsvValue(charging),
      escapeCsvValue(item.wifi_rssi ?? ''),
      escapeCsvValue(item.uptime_sec ?? ''),
      escapeCsvValue(hardwareStatus)
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\r\n' + rows.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, filename);
}

/**
 * Exports telemetry data as a structured, pretty-printed JSON file with metadata.
 */
export function downloadTelemetryJson(
  data: WeatherTelemetry[], 
  filename: string = `telemetry_kuningan_${new Date().toISOString().slice(0, 10)}.json`
) {
  if (!data || data.length === 0) {
    console.warn('[Export] Data telemetry kosong, download dibatalkan.');
    return;
  }

  const exportPayload = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      location: 'Kabupaten Kuningan, Jawa Barat',
      station: 'Agrinex Weather Station v2.0',
      total_records: data.length,
      fields: [
        'timestamp', 'temperature', 'humidity', 'wind_speed', 'light_lux',
        'battery_voltage', 'battery_percentage', 'status'
      ]
    },
    data: data
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  triggerBrowserDownload(blob, filename);
}

/**
 * Helper to trigger a safe browser download without memory leaks.
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // Clean up DOM and memory asynchronously
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 150);
}

// Backward-compatibility aliases
export const downloadCsv = downloadTelemetryCsv;
export const downloadJson = downloadTelemetryJson;
