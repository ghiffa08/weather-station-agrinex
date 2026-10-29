import { cn } from './Card';
import { Cloud, CloudOff, Wifi, Radio } from 'lucide-react';

export type RealtimeMode = 'FIREBASE' | 'POLLING' | 'SSE';

export function StatusBadge({ connected, mode = 'FIREBASE' }: { connected: boolean; mode?: RealtimeMode }) {
  return (
    <div className="flex items-center">
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs tracking-wide uppercase shadow-[var(--shadow-neo-sm)] transition-all",
        connected ? "text-gray-800" : "text-gray-400"
      )}>
        {connected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-700"></span>
            </span>
            <span className="flex items-center gap-1.5">
              {mode === 'FIREBASE' ? (
                <>
                  <Cloud size={13} className="text-gray-700" />
                  <span>Firebase Live</span>
                </>
              ) : mode === 'SSE' ? (
                <>
                  <Radio size={13} className="text-gray-700" />
                  <span>Local SSE</span>
                </>
              ) : (
                <>
                  <Wifi size={13} className="text-gray-700" />
                  <span>Local IP Poll</span>
                </>
              )}
            </span>
          </>
        ) : (
          <>
            <CloudOff size={13} className="text-gray-400" />
            <span>Offline</span>
          </>
        )}
      </div>
    </div>
  );
}

