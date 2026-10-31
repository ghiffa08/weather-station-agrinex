import { useState, useEffect } from 'react';
import { Dashboard } from './presentation/views/Dashboard';
import { AnalyticsView } from './presentation/views/AnalyticsView';
import { DeviceSettingsView } from './presentation/views/DeviceSettingsView';
import { LoginPage } from './presentation/views/LoginPage';
import { OnboardingView } from './presentation/views/OnboardingView';
import { AuthService, type AuthUser } from './core/services/AuthService';
import type { WeatherTelemetry } from './core/types/weather.types';
import { 
  LayoutDashboard, 
  BarChart3, 
  SlidersHorizontal, 
  LogOut, 
  User
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('demo') === 'admin') {
        return AuthService.loginAsDemo('Administrator');
      }
    } catch {}
    return AuthService.getCurrentUser();
  });

  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    return AuthService.isOnboardingCompleted();
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'settings' | 'onboarding'>(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('view');
      if (param === 'analytics' || param === 'settings' || param === 'onboarding') return param;
    } catch {
      // ignore
    }
    return 'dashboard';
  });
  const [cachedLogs, setCachedLogs] = useState<WeatherTelemetry[]>([]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsub = AuthService.subscribe((updatedUser) => {
      setUser(updatedUser);
      setIsOnboardingCompleted(AuthService.isOnboardingCompleted());
    });
    return () => unsub();
  }, []);

  // 1. Flow: Jika belum login, tampilkan halaman Login
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          setIsOnboardingCompleted(AuthService.isOnboardingCompleted());
        }}
      />
    );
  }

  // 2. Flow: Jika belum pernah onboarding atau membuka manual wizard via ?view=onboarding, tampilkan OnboardingView
  if (!isOnboardingCompleted || currentView === 'onboarding') {
    return (
      <OnboardingView
        onComplete={() => {
          AuthService.setOnboardingCompleted(true);
          setIsOnboardingCompleted(true);
          setCurrentView('dashboard');
        }}
        onSkip={() => {
          AuthService.setOnboardingCompleted(true);
          setIsOnboardingCompleted(true);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // 3. Flow: Tampilan Utama Dashboard Stasiun Cuaca
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
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
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
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
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
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              currentView === 'settings'
                ? 'neo-pressed text-sky-700 font-extrabold shadow-inner scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 active:scale-95'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Pengaturan</span>
          </button>

          {/* Separator */}
          <div className="h-5 w-[1px] bg-gray-400/30 mx-0.5" />

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1 pl-1">
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full neo-pressed text-[11px] font-bold text-gray-700"
              title={`Login sebagai: ${user.displayName} (${user.role})`}
            >
              <User size={12} className="text-sky-600" />
              <span className="truncate max-w-[90px]">{user.displayName.split(' ')[0]}</span>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Keluar dari sistem portal stasiun?')) {
                  AuthService.logout();
                }
              }}
              title="Keluar (Logout)"
              className="p-2 sm:p-2.5 rounded-full text-gray-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer active:scale-95"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;
