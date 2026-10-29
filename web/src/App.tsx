import { useState } from 'react';
import { Dashboard } from './presentation/views/Dashboard';
import { AnalyticsView } from './presentation/views/AnalyticsView';
import { DeviceSettingsView } from './presentation/views/DeviceSettingsView';
import type { WeatherTelemetry } from './core/types/weather.types';
import { LayoutDashboard, BarChart3, SlidersHorizontal } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'settings'>('dashboard');
  const [cachedLogs, setCachedLogs] = useState<WeatherTelemetry[]>([]);

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] flex flex-col relative">
      {/* Main Page View Content */}
      <main className="flex-1 pb-28 sm:pb-32">
        {currentView === 'dashboard' && (
          <Dashboard 
            onNavigateToSettings={() => setCurrentView('settings')}
            onNavigateToAnalytics={() => setCurrentView('analytics')}
            onLogsLoaded={(logs) => setCachedLogs(logs)}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            onBack={() => setCurrentView('dashboard')}
            telemetryLogs={cachedLogs}
          />
        )}

        {currentView === 'settings' && (
          <DeviceSettingsView
            onBack={() => setCurrentView('dashboard')}
            telemetryLogs={cachedLogs}
            onConfigSaved={(cfg) => {
              console.log('[App] New Device Configuration saved:', cfg);
            }}
          />
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Neumorphic Dock) */}
      <nav 
        aria-label="Navigasi Utama"
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in w-auto max-w-[95vw]"
      >
        <div 
          className="p-1.5 rounded-full neo-flat flex items-center gap-1 sm:gap-1.5 backdrop-blur-lg border border-white/70 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
          style={{ background: 'rgba(224, 229, 236, 0.94)' }}
        >
          {/* 1. Dashboard Tab */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentView('dashboard');
            }}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              currentView === 'dashboard'
                ? 'neo-pressed text-sky-700 font-extrabold shadow-inner scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 active:scale-95'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </button>

          {/* 2. Analisis Tab */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentView('analytics');
            }}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              currentView === 'analytics'
                ? 'neo-pressed text-sky-700 font-extrabold shadow-inner scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 active:scale-95'
            }`}
          >
            <BarChart3 size={15} />
            <span>Analisis</span>
          </button>

          {/* 3. Pengaturan Tab */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentView('settings');
            }}
            className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              currentView === 'settings'
                ? 'neo-pressed text-sky-700 font-extrabold shadow-inner scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 active:scale-95'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Pengaturan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
