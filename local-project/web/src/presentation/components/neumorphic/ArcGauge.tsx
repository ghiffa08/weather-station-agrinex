interface ArcGaugeProps {
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  isAvailable?: boolean;
}

export function ArcGauge({ 
  value, 
  min = 10, 
  max = 40, 
  unit = '°C', 
  label = 'Suhu Lapangan',
  isAvailable = true 
}: ArcGaugeProps) {
  const hasValue = isAvailable && value !== undefined && !isNaN(value);
  const percentage = hasValue 
    ? Math.min(1, Math.max(0, ((value as number) - min) / (max - min))) 
    : 0;
  const totalTicks = 40;
  const activeTicks = hasValue ? Math.round(percentage * totalTicks) : 0;

  return (
    <div className="flex flex-col items-center justify-center relative py-2">
      <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
        <div className="absolute top-2 w-44 h-44 rounded-full flex items-center justify-center">
          {Array.from({ length: totalTicks }).map((_, index) => {
            const angle = -120 + (index / (totalTicks - 1)) * 240;
            const isActive = hasValue && index <= activeTicks;
            return (
              <div
                key={index}
                className="absolute w-0.5 h-3 origin-bottom transition-all duration-300"
                style={{
                  transform: `rotate(${angle}deg) translateY(-76px)`,
                  backgroundColor: isActive ? '#374151' : '#cbd5e1',
                  opacity: isActive ? 0.9 : 0.35,
                  height: index % 5 === 0 ? '14px' : '9px',
                  width: index % 5 === 0 ? '2px' : '1.5px',
                }}
              />
            );
          })}
        </div>

        <div className="z-10 text-center pb-1">
          <div className="text-3xl font-extrabold text-gray-800 tracking-tight tabular-nums">
            {hasValue ? (value as number).toFixed(1) : '--'}
            <span className="text-lg font-semibold text-gray-500 ml-0.5">{unit}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-neo-text-muted)] block mt-0.5">
            {hasValue ? label : 'Sensor Belum Terpasang'}
          </span>
          {!hasValue && (
            <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold text-amber-700 bg-amber-100/70">
              Standby (Testing PCB)
            </span>
          )}
        </div>
      </div>

      <div className="w-44 flex justify-between text-[10px] font-semibold text-gray-400 px-2 mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
