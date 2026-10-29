import { useState, useEffect, useRef, useCallback } from 'react';
import type { WeatherTelemetry } from '../core/types/weather.types';
import { normalizeBatteryMetrics } from '../core/utils/battery.utils';

const CANDIDATE_IPS = ['192.168.18.2', '192.168.18.3'];
const HEARTBEAT_TIMEOUT_MS = 4000;

export function useWeatherRealtime(initialIp = '192.168.18.2') {
  const [targetIp, setTargetIpState] = useState<string>(() => {
    return localStorage.getItem('agrinex_esp_target_ip') || initialIp;
  });
  // Default to POLLING: far more stable on ESP microcontrollers
  const [mode, setMode] = useState<'SSE' | 'POLLING'>('POLLING');
  const [data, setData] = useState<WeatherTelemetry | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const lastReceivedTimeRef = useRef<number>(0);
  const consecutiveFailRef = useRef<number>(0);
  const isProbingRef = useRef<boolean>(false);

  const setTargetIp = useCallback((ip: string) => {
    localStorage.setItem('agrinex_esp_target_ip', ip);
    setTargetIpState(ip);
  }, []);

  // Update connection state with watchdog to prevent flickering/looping
  const markDataReceived = useCallback(() => {
    lastReceivedTimeRef.current = Date.now();
    consecutiveFailRef.current = 0;
    setConnected(true);
  }, []);

  // Helper untuk parsing payload telemetry dari ESP32 secara akurat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseTelemetryPayload = useCallback((raw: any): WeatherTelemetry => {
    // Normalisasi metrik baterai INA226
    const normBattery = normalizeBatteryMetrics(raw.battery, {
      voltage: raw.battery_voltage,
      current: raw.battery_current,
      power: raw.battery_power,
      percentage: raw.battery_percentage,
    });

    // Sanitasi pembacaan sensor cuaca:
    // Jika sensor belum terpasang pada PCB (status === false), jadikan undefined agar UI tidak menampilkan 0.0 palsu
    const dhtAvailable = raw.status?.dht22 !== false && raw.temperature !== null && raw.temperature !== undefined;
    const bhAvailable = raw.status?.bh1750 !== false && raw.light_lux !== null && raw.light_lux !== undefined;

    return {
      timestamp: new Date().toISOString(),
      temperature: dhtAvailable ? raw.temperature : undefined,
      humidity: dhtAvailable ? raw.humidity : undefined,
      wind_speed: raw.wind_speed !== null && raw.wind_speed !== undefined ? raw.wind_speed : undefined,
      light_lux: bhAvailable ? raw.light_lux : undefined,
      raw_pulses: raw.raw_pulses,
      wifi_rssi: raw.wifi_rssi,
      free_heap: raw.free_heap,
      uptime_sec: raw.uptime_sec,
      rtc_time: raw.rtc_time,
      status: raw.status,
      battery: normBattery,
      battery_voltage: normBattery.voltage,
      battery_current: normBattery.current_ma,
      battery_power: normBattery.power_mw,
      battery_percentage: normBattery.percentage,
    };
  }, []);

  // Auto-Probe IP alternatif jika IP saat ini tidak merespon
  const probeAlternativeIps = useCallback(async () => {
    if (isProbingRef.current) return;
    isProbingRef.current = true;

    for (const candidate of CANDIDATE_IPS) {
      if (candidate === targetIp) continue;
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1000);
        const res = await fetch(`http://${candidate}/api/sensors`, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(tid);
        if (res.ok) {
          setTargetIp(candidate);
          break;
        }
      } catch {
        // continue
      }
    }
    isProbingRef.current = false;
  }, [targetIp, setTargetIp]);

  // Connect SSE
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `http://${targetIp}/events`;
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
        if (consecutiveFailRef.current >= 2) {
          probeAlternativeIps();
        }
      }
    };
  }, [targetIp, markDataReceived, parseTelemetryPayload, probeAlternativeIps]);

  // REST Polling (Mengukur data + latency sekaligus tanpa collision)
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    const poll = async () => {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`http://${targetIp}/api/sensors`, { 
          signal: controller.signal,
          cache: 'no-store'
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
          if (consecutiveFailRef.current >= 2) {
            probeAlternativeIps();
          }
        }
      } catch {
        consecutiveFailRef.current += 1;
        if (Date.now() - lastReceivedTimeRef.current > HEARTBEAT_TIMEOUT_MS) {
          setConnected(false);
          setLatencyMs(null);
        }
        if (consecutiveFailRef.current >= 2) {
          probeAlternativeIps();
        }
      }
    };

    poll();
    pollingTimerRef.current = window.setInterval(poll, 1000);
  }, [targetIp, markDataReceived, parseTelemetryPayload, probeAlternativeIps]);

  // Connection manager effect
  useEffect(() => {
    if (!targetIp) return;

    if (mode === 'SSE') {
      connectSSE();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      startPolling();
    }

    // Watchdog check interval
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

  return {
    data,
    connected,
    targetIp,
    setTargetIp,
    mode,
    setMode,
    latencyMs,
    reconnect: mode === 'SSE' ? connectSSE : startPolling,
  };
}
