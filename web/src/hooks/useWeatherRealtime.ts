import { useState, useEffect, useRef, useCallback } from 'react';
import type { WeatherTelemetry } from '../core/types/weather.types';
import { weatherRepository } from '../core/di';
import { normalizeBatteryMetrics } from '../core/utils/battery.utils';

export type RealtimeMode = 'FIREBASE' | 'POLLING' | 'SSE';

const HEARTBEAT_TIMEOUT_MS = 4000;

export function useWeatherRealtime(initialIp = '192.168.18.14') {
  const [targetIp, setTargetIpState] = useState<string>(() => {
    return localStorage.getItem('agrinex_esp_target_ip') || initialIp;
  });

  const [mode, setModeState] = useState<RealtimeMode>(() => {
    return (localStorage.getItem('agrinex_realtime_mode') as RealtimeMode) || 'FIREBASE';
  });

  const [data, setData] = useState<WeatherTelemetry | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const lastReceivedTimeRef = useRef<number>(0);
  const consecutiveFailRef = useRef<number>(0);

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

  // Helper untuk parsing payload telemetry dari ESP32 HTTP secara akurat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseTelemetryPayload = useCallback((raw: any): WeatherTelemetry => {
    const normBattery = normalizeBatteryMetrics(raw.battery, {
      voltage: raw.battery_voltage,
      current: raw.battery_current,
      power: raw.battery_power,
      percentage: raw.battery_percentage,
    });

    const dhtAvailable = raw.status?.dht22 !== false && raw.temperature !== null && raw.temperature !== undefined;
    const bhAvailable = raw.status?.bh1750 !== false && raw.light_lux !== null && raw.light_lux !== undefined;

    return {
      timestamp: new Date().toISOString(),
      temperature: dhtAvailable ? raw.temperature : undefined,
      humidity: dhtAvailable ? raw.humidity : undefined,
      wind_speed: raw.wind_speed !== null && raw.wind_speed !== undefined ? raw.wind_speed : 0.0,
      light_lux: bhAvailable ? raw.light_lux : (raw.light_lux !== null && raw.light_lux !== undefined ? raw.light_lux : 0),
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

  // Initial load from Firebase history
  useEffect(() => {
    weatherRepository.getHistory(50).then((history) => {
      if (history && history.length > 0) {
        setData(history[0]);
      }
    }).catch(err => console.warn('[Weather] History fetch notice:', err));
  }, []);

  // Firebase Realtime Stream
  useEffect(() => {
    if (mode !== 'FIREBASE') return;

    setLatencyMs(null);
    const unsubscribeStream = weatherRepository.subscribe((latestData) => {
      if (latestData) {
        setData(latestData);
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
  }, [mode, markDataReceived]);

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
        const res = await fetch(`http://${targetIp}/api/sensors`, {
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
