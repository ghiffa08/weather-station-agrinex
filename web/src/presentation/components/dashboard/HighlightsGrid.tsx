import React from 'react';
import { Thermometer, Droplets, Wind, Sun } from 'lucide-react';
import { Card } from '../neumorphic/Card';
import { ArcGauge } from '../neumorphic/ArcGauge';
import { BatteryCard } from '../neumorphic/BatteryCard';
import { MetricCard } from '../atomic/atoms/MetricCard';
import { SkeletonGauge, SkeletonCard } from '../neumorphic/Skeleton';
import type { WeatherTelemetry } from '../../../core/types/weather.types';

interface HighlightsGridProps {
  fieldData: WeatherTelemetry | null;
  isLoading: boolean;
  connected: boolean;
  lastUpdate: string;
}

export const HighlightsGrid: React.FC<HighlightsGridProps> = ({
  fieldData,
  isLoading,
  connected,
  lastUpdate,
}) => {
  if (isLoading) {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
        <SkeletonGauge />
        <SkeletonCard />
        <div className="flex flex-col justify-between gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      {/* 1. Arc Thermostat Gauge */}
      <Card className="lg:col-span-1 flex flex-col justify-between items-center text-center">
        <div className="w-full flex items-center justify-between border-b border-gray-300/30 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Thermometer size={16} className="text-gray-700" />
            <span className="text-xs font-bold text-gray-700">Termometer Lapangan</span>
          </div>
          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold neo-pressed text-gray-800">
            {connected ? 'Live Stream' : 'Offline'}
          </div>
        </div>

        <ArcGauge
          value={fieldData?.temperature}
          min={10}
          max={40}
          unit="°C"
          label="Suhu Udara Lapangan"
        />

        <div className="w-full pt-2 border-t border-gray-300/30 flex justify-between items-center text-xs text-gray-500 px-1">
          <span>Status: <strong className="text-gray-800 font-bold">Normal</strong></span>
          <span>Update: <strong className="text-gray-700">{lastUpdate || 'Menunggu...'}</strong></span>
        </div>
      </Card>

      {/* 2. Battery Monitoring Card (INA226 / LiFePO4) */}
      <div className="lg:col-span-1 flex flex-col">
        <BatteryCard
          battery={fieldData?.battery}
          voltage={fieldData?.battery_voltage ?? fieldData?.battery?.voltage}
          currentMa={fieldData?.battery_current ?? fieldData?.battery?.current_ma}
          powerMw={fieldData?.battery_power ?? fieldData?.battery?.power_mw}
          percentage={fieldData?.battery_percentage ?? fieldData?.battery?.percentage}
          inaConnected={fieldData?.status?.ina226 ?? (fieldData?.battery_voltage !== undefined || fieldData?.battery !== undefined)}
        />
      </div>

      {/* 3. 3 Sensor Metric Cards */}
      <div className="lg:col-span-1 flex flex-col justify-between gap-3">
        <MetricCard
          title="Kelembapan"
          value={fieldData?.humidity}
          unit="%"
          icon={<Droplets size={20} />}
          subtitle="Relatif (RH)"
          isAvailable={fieldData?.status?.dht22 ?? true}
        />
        <MetricCard
          title="Kec. Angin"
          value={fieldData?.wind_speed}
          unit="km/h"
          icon={<Wind size={20} />}
          subtitle="Anemometer v1.3"
          isAvailable={fieldData?.status?.anemometer ?? true}
        />
        <MetricCard
          title="Intensitas Cahaya"
          value={fieldData?.light_lux}
          unit="lux"
          icon={<Sun size={20} />}
          subtitle="BH1750 Sensor (0x23)"
          isAvailable={fieldData?.status?.bh1750 ?? (fieldData?.light_lux !== undefined && fieldData.light_lux > 0)}
        />
      </div>
    </section>
  );
};
