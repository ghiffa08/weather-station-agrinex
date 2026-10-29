import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryData, ConnectionMode, ConnectionStatus, ChartHistoryPoint } from '../types';

const DEFAULT_IP = '192.168.1.50'; // Default fallback target IP
const MAX_HISTORY = 40;

export function useRealtimeSensors(initialIp = DEFAULT_IP) {
  const [targetIp, setTargetIp] = useState<string>(initialIp);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('SSE');
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<ChartHistoryPoint[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [rawLogs, setRawLogs] = useState<string[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);

  // Append raw event logs
  const addRawLog = useCallback((dataStr: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setRawLogs((prev) => [`[${timestamp}] ${dataStr}`, ...prev.slice(0, 49)]);
  }, []);

  // Update history buffer
  const pushHistoryPoint = useCallback((data: TelemetryData) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          timeStr,
          temperature: data.temperature,
          humidity: data.humidity,
          lightLux: data.light_lux,
          windSpeed: data.wind_speed,
        },
      ];
      return next.slice(-MAX_HISTORY);
    });
  }, []);

  // Process incoming telemetry data
  const handleDataReceived = useCallback(
    (data: TelemetryData, rawText: string) => {
      setTelemetry(data);
      setStatus('CONNECTED');
      pushHistoryPoint(data);
      addRawLog(rawText);
    },
    [pushHistoryPoint, addRawLog]
  );

  // Measure HTTP Ping Latency
  const measureLatency = useCallback(async () => {
    if (!targetIp) return;
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://${targetIp}/api/ping`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const duration = Math.round(performance.now() - start);
        setLatencyMs(duration);
      } else {
        setLatencyMs(null);
      }
    } catch {
      setLatencyMs(null);
    }
  }, [targetIp]);

  // Connect SSE
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('RECONNECTING');
    const sseUrl = `http://${targetIp}/events`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('CONNECTED');
      addRawLog(`[SSE] Terhubung ke ${sseUrl}`);
    };

    es.onmessage = (event) => {
      try {
        const parsed: TelemetryData = JSON.parse(event.data);
        handleDataReceived(parsed, event.data);
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    es.onerror = () => {
      setStatus('RECONNECTING');
      addRawLog(`[SSE] Terputus/Error. Reconnecting...`);
    };
  }, [targetIp, handleDataReceived, addRawLog]);

  // Connect REST Polling
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    const poll = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`http://${targetIp}/api/sensors`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          const parsed: TelemetryData = JSON.parse(text);
          handleDataReceived(parsed, text);
        } else {
          setStatus('DISCONNECTED');
        }
      } catch {
        setStatus('DISCONNECTED');
      }
    };

    poll();
    pollingTimerRef.current = window.setInterval(poll, 1200);
  }, [targetIp, handleDataReceived]);

  // Connect manager effect
  useEffect(() => {
    if (!targetIp) return;

    if (connectionMode === 'SSE') {
      connectSSE();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      startPolling();
    }

    // Interval latency ping
    measureLatency();
    pingTimerRef.current = window.setInterval(measureLatency, 4000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
      }
    };
  }, [targetIp, connectionMode, connectSSE, startPolling, measureLatency]);

  return {
    targetIp,
    setTargetIp,
    connectionMode,
    setConnectionMode,
    status,
    telemetry,
    history,
    latencyMs,
    rawLogs,
    reconnect: connectionMode === 'SSE' ? connectSSE : startPolling,
  };
}
