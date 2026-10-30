import { useState, useEffect, useRef, useCallback } from 'react';
import type { WeatherTelemetry } from '../core/types/weather.types';
import { weatherRepository } from '../core/di';
import { normalizeBatteryMetrics } from '../core/utils/battery.utils';

export type RealtimeMode = 'FIREBASE' | 'POLLING' | 'SSE';

export interface SensorCalibrationConfig {
  enabled: boolean;
  tempOffset: number;   // °C (Default -4.8°C untuk kompensasi panas regulator/PCB)
  humOffset: number;    // %  (Default +14.0% untuk kompensasi penurunan RH akibat pemanasan)
  windNoiseGate: number; // Pulsa/detik ambang batas noise diam (Default 18 pulsa/s)
}

export const CALIBRATION_STORAGE_KEY = 'agrinex_sensor_calibration';

export const DEFAULT_SENSOR_CALIBRATION: SensorCalibrationConfig = {
  enabled: true,
  tempOffset: -4.8,
  humOffset: 14.0,
  windNoiseGate: 18,
};

export function loadSensorCalibration(): SensorCalibrationConfig {
  try {
    const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: parsed.enabled ?? DEFAULT_SENSOR_CALIBRATION.enabled,
        tempOffset: typeof parsed.tempOffset === 'number' ? parsed.tempOffset : DEFAULT_SENSOR_CALIBRATION.tempOffset,
        humOffset: typeof parsed.humOffset === 'number' ? parsed.humOffset : DEFAULT_SENSOR_CALIBRATION.humOffset,
        windNoiseGate: typeof parsed.windNoiseGate === 'number' ? parsed.windNoiseGate : DEFAULT_SENSOR_CALIBRATION.windNoiseGate,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SENSOR_CALIBRATION;
}

const HEARTBEAT_TIMEOUT_MS = 4000;

export function useWeatherRealtime(initialIp = '192.168.18.3') {
  const [targetIp, setTargetIpState] = useState<string>(() => {
    return localStorage.getItem('agrinex_esp_target_ip') || initialIp;
  });

  const [mode, setModeState] = useState<RealtimeMode>(() => {
    return (localStorage.getItem('agrinex_realtime_mode') as RealtimeMode) || 'POLLING';
  });

  const [data, setData] = useState<WeatherTelemetry | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const lastReceivedTimeRef = useRef<number>(0);
  const consecutiveFailRef = useRef<number>(0);
  const prevPulsesRef = useRef<number | null>(null);
  const prevPulseTimeRef = useRef<number>(0);

  const setTargetIp = useCallback((ip: string) => {
    localStorage.setItem('agrinex_esp_target_ip', ip);
    setTargetIpState(ip);
  }, []);

  const setMode = useCallback((m: RealtimeMode) => {
    localStorage.setItem('agrinex_realtime_mode', m);
    setModeState(m);
  }, []);

  const markDataReceived = useCallback(() => {
    lastReceivedTimeRef.current = Date.now();
    consecutiveFailRef.current = 0;
    setConnected(true);
  }, []);

  // Helper untuk parsing payload telemetry dari ESP32 HTTP secara akurat + Kalibrasi DHT22 & Filter Noise Anemometer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseTelemetryPayload = useCallback((raw: any): WeatherTelemetry => {
    const cal = loadSensorCalibration();
    const normBattery = normalizeBatteryMetrics(raw.battery, {
      voltage: raw.battery_voltage,
      current: raw.battery_current,
      power: raw.battery_power,
      percentage: raw.battery_percentage,
    });

    const dhtAvailable = raw.status?.dht22 !== false && raw.temperature !== null && raw.temperature !== undefined;

    // 1. Kalibrasi Suhu & Kelembapan DHT22 (jika firmware belum mengkalibrasi langsung)
    let calibratedTemp: number | undefined = dhtAvailable ? Number(raw.temperature) : undefined;
    let calibratedHum: number | undefined = dhtAvailable ? Number(raw.humidity) : undefined;

    if (cal.enabled && !raw.calibrated) {
      if (calibratedTemp !== undefined) {
        calibratedTemp = Number((calibratedTemp + cal.tempOffset).toFixed(1));
      }
      if (calibratedHum !== undefined) {
        calibratedHum = Number(Math.min(100, Math.max(0, calibratedHum + cal.humOffset)).toFixed(1));
      }
    }

    // 2. Kecepatan Angin Anemometer (Sesuai local-project: 0.0 km/h saat diam / tidak diputar)
    let windSpeed = 0.0;
    const currentPulses = typeof raw.raw_pulses === 'number' ? raw.raw_pulses : 0;

    if (raw.fw_v && raw.fw_v >= 2) {
      windSpeed = typeof raw.wind_speed === 'number' ? raw.wind_speed : 0.0;
    } else {
      // Jika sensor diam (noise statis ~180-200 Hz atau pulsa tidak diputar), jangan gerak sendiri!
      const rawSpeed = typeof raw.wind_speed === 'number' ? raw.wind_speed : 0.0;
      const nowMs = performance.now();
      if (prevPulsesRef.current !== null && prevPulseTimeRef.current > 0) {
        const elapsedSec = (nowMs - prevPulseTimeRef.current) / 1000.0;
        if (elapsedSec >= 0.5 && elapsedSec <= 10.0) {
          const diffPulses = currentPulses >= prevPulsesRef.current ? (currentPulses - prevPulsesRef.current) : 0;
          const pps = diffPulses / elapsedSec;
          // Noise lantai ESP32 tanpa filter adalah ~180-195 Hz. Jika pps > 215 Hz, berarti ada putaran nyata!
          if (pps > 215) {
            const spinPps = pps - 190;
            const mPerSec = (spinPps * 0.0875) + 0.1;
            windSpeed = Number((mPerSec * 3.6).toFixed(1));
          } else {
            windSpeed = 0.0; // Diam = 0.0 km/h persis seperti local-project
          }
        }
      } else {
        // Jika belum ada delta pulsa (awal load atau mode Firebase): jika speed di rentang noise lama 40-65 km/h, kunci ke 0.0
        if (rawSpeed >= 40 && rawSpeed <= 68) {
          windSpeed = 0.0;
        } else {
          windSpeed = rawSpeed;
        }
      }
      prevPulsesRef.current = currentPulses;
      prevPulseTimeRef.current = nowMs;
    }

    // 3. Sensor Cahaya BH1750 (Sesuai local-project: jika offline/tidak terdeteksi, jadikan undefined agar UI tampil '-- Standby')
    const bhConnected = raw.status?.bh1750 === true || (raw.light_lux !== null && raw.light_lux !== undefined && raw.light_lux > 0);
    const lightLux = bhConnected && typeof raw.light_lux === 'number' && !Number.isNaN(raw.light_lux)
      ? Number(raw.light_lux)
      : undefined;

    const normalizedStatus = {
      dht22: raw.status?.dht22 ?? true,
      bh1750: bhConnected,
      anemometer: raw.status?.anemometer ?? true,
      ina226: raw.status?.ina226 ?? (normBattery.voltage !== undefined && normBattery.voltage > 0.5),
      rtc_ds3231: raw.status?.rtc_ds3231 ?? false,
      sd_card: raw.status?.sd_card ?? false,
    };

    return {
      timestamp: new Date().toISOString(),
      temperature: calibratedTemp ?? 0,
      humidity: calibratedHum ?? 0,
      wind_speed: windSpeed,
      light_lux: lightLux,
      raw_pulses: currentPulses,
      wifi_rssi: raw.wifi_rssi,
      free_heap: raw.free_heap,
      uptime_sec: raw.uptime_sec,
      rtc_time: raw.rtc_time,
      status: normalizedStatus,
      battery: normBattery,
      battery_voltage: normBattery.voltage,
      battery_current: normBattery.current_ma,
      battery_power: normBattery.power_mw,
      battery_percentage: normBattery.percentage,
    };
  }, []);

  // Initial load from Firebase history
  useEffect(() => {
    weatherRepository.getHistory(50).then((history) => {
      if (history && history.length > 0 && mode === 'FIREBASE') {
        const parsed = parseTelemetryPayload(history[0]);
        setData(parsed);
      }
    }).catch(err => console.warn('[Weather] History fetch notice:', err));
  }, [mode, parseTelemetryPayload]);

  // Firebase Realtime Stream
  useEffect(() => {
    if (mode !== 'FIREBASE') return;

    setLatencyMs(null);
    const unsubscribeStream = weatherRepository.subscribe((latestData) => {
      if (latestData) {
        const parsed = parseTelemetryPayload(latestData);
        setData(parsed);
        markDataReceived();
      }
    });

    const unsubscribeConnection = weatherRepository.onConnectionChange((isOnline) => {
      setConnected(isOnline);
    });

    return () => {
      unsubscribeStream();
      unsubscribeConnection();
    };
  }, [mode, markDataReceived, parseTelemetryPayload]);

  // Connect SSE
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const url = isHttps ? `/esp32-proxy/events` : `http://${targetIp}/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      markDataReceived();
    };

    es.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const parsed = parseTelemetryPayload(raw);
        setData(parsed);
        markDataReceived();
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      if (Date.now() - lastReceivedTimeRef.current > HEARTBEAT_TIMEOUT_MS) {
        setConnected(false);
        consecutiveFailRef.current += 1;
      }
    };
  }, [targetIp, markDataReceived, parseTelemetryPayload]);

  // REST Polling
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    const poll = async () => {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const fetchUrl = isHttps ? `/esp32-proxy/api/sensors` : `http://${targetIp}/api/sensors`;
        const res = await fetch(fetchUrl, {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const raw = await res.json();
          const latency = Math.round(performance.now() - start);
          setLatencyMs(latency);

          const parsed = parseTelemetryPayload(raw);
          setData(parsed);
          markDataReceived();
        } else {
          consecutiveFailRef.current += 1;
          if (Date.now() - lastReceivedTimeRef.current > HEARTBEAT_TIMEOUT_MS) {
            setConnected(false);
            setLatencyMs(null);
          }
        }
      } catch {
        consecutiveFailRef.current += 1;
        if (Date.now() - lastReceivedTimeRef.current > HEARTBEAT_TIMEOUT_MS) {
          setConnected(false);
          setLatencyMs(null);
        }
      }
    };

    poll();
    pollingTimerRef.current = window.setInterval(poll, 1000);
  }, [targetIp, markDataReceived, parseTelemetryPayload]);

  // Connection Manager for Local HTTP modes
  useEffect(() => {
    if (mode === 'FIREBASE') return;
    if (!targetIp) return;

    if (mode === 'SSE') {
      connectSSE();
    } else if (mode === 'POLLING') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      startPolling();
    }

    const watchdogTimer = setInterval(() => {
      if (lastReceivedTimeRef.current > 0 && Date.now() - lastReceivedTimeRef.current > HEARTBEAT_TIMEOUT_MS) {
        setConnected(false);
      }
    }, 1500);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      clearInterval(watchdogTimer);
    };
  }, [targetIp, mode, connectSSE, startPolling]);

  const reconnect = useCallback(() => {
    if (mode === 'SSE') connectSSE();
    else if (mode === 'POLLING') startPolling();
  }, [mode, connectSSE, startPolling]);

  return {
    data,
    connected,
    targetIp,
    setTargetIp,
    mode,
    setMode,
    latencyMs,
    reconnect,
  };
}
