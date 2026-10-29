import React from 'react';
import { Database, Flame, Radio, Globe } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import type { DeviceConfiguration, BackendProtocolType } from '../../../core/types/device-config.types';

interface BackendSectionProps {
  config: DeviceConfiguration;
  onProtocolChange: (proto: BackendProtocolType) => void;
  onConfigChange: React.Dispatch<React.SetStateAction<DeviceConfiguration>>;
}

export const BackendSection: React.FC<BackendSectionProps> = ({
  config,
  onProtocolChange,
  onConfigChange,
}) => {
  return (
    <Card className="space-y-5 animate-fade-in">
      <div className="border-b border-gray-300/40 pb-3">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Database size={16} className="text-sky-600" />
          <span>Protokol Backend</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pilih tujuan pengiriman data telemetri stasiun
        </p>
      </div>

      {/* 4 Protocol Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Firebase */}
        <div
          onClick={() => onProtocolChange('firebase')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            config.backend.protocol === 'firebase'
              ? 'neo-pressed border-2 border-sky-500 bg-sky-500/5'
              : 'neo-flat hover:neo-pressed'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Flame size={20} className="text-amber-500" />
            <span className="font-extrabold text-gray-800 text-xs">Cloud Firestore</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Direct REST API Google Firebase (Realtime HTTPS).
          </p>
        </div>

        {/* 2. Supabase */}
        <div
          onClick={() => onProtocolChange('supabase')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            config.backend.protocol === 'supabase'
              ? 'neo-pressed border-2 border-emerald-500 bg-emerald-500/5'
              : 'neo-flat hover:neo-pressed'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Database size={20} className="text-emerald-600" />
            <span className="font-extrabold text-gray-800 text-xs">Supabase (PostgreSQL)</span>
          </div>
          <p className="text-[11px] text-gray-500">
            PostgREST REST API dengan API Key & Authorization.
          </p>
        </div>

        {/* 3. MQTT Broker */}
        <div
          onClick={() => onProtocolChange('mqtt')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            config.backend.protocol === 'mqtt'
              ? 'neo-pressed border-2 border-purple-500 bg-purple-500/5'
              : 'neo-flat hover:neo-pressed'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Radio size={20} className="text-purple-600" />
            <span className="font-extrabold text-gray-800 text-xs">MQTT Broker</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Pub/Sub Messaging (EMQX, Mosquitto, HiveMQ).
          </p>
        </div>

        {/* 4. Custom REST Webhook */}
        <div
          onClick={() => onProtocolChange('http_rest')}
          className={`p-4 rounded-2xl cursor-pointer transition-all ${
            config.backend.protocol === 'http_rest'
              ? 'neo-pressed border-2 border-rose-500 bg-rose-500/5'
              : 'neo-flat hover:neo-pressed'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe size={20} className="text-rose-600" />
            <span className="font-extrabold text-gray-800 text-xs">HTTPS Webhook</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Custom REST API endpoint (Node.js, Flask, FastAPI).
          </p>
        </div>
      </div>

      {/* Dynamic Configuration Form */}
      <div className="p-4 rounded-2xl neo-pressed space-y-4">
        {config.backend.protocol === 'firebase' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Konfigurasi Cloud Firestore
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Project ID Firebase</label>
                <input
                  type="text"
                  value={config.backend.firebase.project_id}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        firebase: { ...prev.backend.firebase, project_id: e.target.value },
                      },
                    }))
                  }
                  placeholder="agrinex-f5ef8"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Collection Name</label>
                <input
                  type="text"
                  value={config.backend.firebase.collection}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        firebase: { ...prev.backend.firebase, collection: e.target.value },
                      },
                    }))
                  }
                  placeholder="telemetry"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {config.backend.protocol === 'supabase' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Konfigurasi Supabase (PostgREST)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Supabase Project URL</label>
                <input
                  type="text"
                  value={config.backend.supabase.url}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        supabase: { ...prev.backend.supabase, url: e.target.value },
                      },
                    }))
                  }
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Supabase Anon Key</label>
                  <input
                    type="password"
                    value={config.backend.supabase.api_key}
                    onChange={(e) =>
                      onConfigChange((prev) => ({
                        ...prev,
                        backend: {
                          ...prev.backend,
                          supabase: { ...prev.backend.supabase, api_key: e.target.value },
                        },
                      }))
                    }
                    placeholder="eyJhbGciOi..."
                    className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Table Name</label>
                  <input
                    type="text"
                    value={config.backend.supabase.table}
                    onChange={(e) =>
                      onConfigChange((prev) => ({
                        ...prev,
                        backend: {
                          ...prev.backend,
                          supabase: { ...prev.backend.supabase, table: e.target.value },
                        },
                      }))
                    }
                    placeholder="telemetry"
                    className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {config.backend.protocol === 'mqtt' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Konfigurasi MQTT Broker
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-700 block">Broker Host</label>
                <input
                  type="text"
                  value={config.backend.mqtt.broker}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        mqtt: { ...prev.backend.mqtt, broker: e.target.value },
                      },
                    }))
                  }
                  placeholder="broker.emqx.io"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Port</label>
                <input
                  type="number"
                  value={config.backend.mqtt.port}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        mqtt: { ...prev.backend.mqtt, port: Number(e.target.value) },
                      },
                    }))
                  }
                  placeholder="1883"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-700 block">Publish Topic</label>
                <input
                  type="text"
                  value={config.backend.mqtt.topic}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        mqtt: { ...prev.backend.mqtt, topic: e.target.value },
                      },
                    }))
                  }
                  placeholder="agrinex/kuningan/telemetry"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Client ID</label>
                <input
                  type="text"
                  value={config.backend.mqtt.client_id}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        mqtt: { ...prev.backend.mqtt, client_id: e.target.value },
                      },
                    }))
                  }
                  placeholder="agrinex-station-01"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {config.backend.protocol === 'http_rest' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Konfigurasi Custom HTTPS Webhook REST
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Webhook Destination URL</label>
                <input
                  type="text"
                  value={config.backend.http_rest.url}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        http_rest: { ...prev.backend.http_rest, url: e.target.value },
                      },
                    }))
                  }
                  placeholder="https://api.domain.com/v1/weather/telemetry"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Authorization Header (Opsional)</label>
                <input
                  type="text"
                  value={config.backend.http_rest.auth_header || ''}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      backend: {
                        ...prev.backend,
                        http_rest: { ...prev.backend.http_rest, auth_header: e.target.value },
                      },
                    }))
                  }
                  placeholder="Bearer token_secret_key"
                  className="w-full p-2.5 rounded-xl neo-flat bg-transparent font-mono text-gray-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
