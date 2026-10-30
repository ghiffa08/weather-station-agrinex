import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthService, type AuthUser } from '../../core/services/AuthService';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('admin@agrinex.id');
  const [password, setPassword] = useState<string>('agrinex2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const user = await AuthService.loginWithEmail(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Email atau kata sandi tidak sesuai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-xs animate-fade-in">
        <div className="neo-card p-6 sm:p-7 space-y-5 rounded-3xl border border-white/60">
          
          {/* Minimal Header */}
          <div className="text-center space-y-0.5">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Agrinex
            </h1>
            <p className="text-[11px] text-gray-600">
              Masuk ke akun Anda
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] text-center font-medium animate-fade-in">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block">
                Email
              </label>
              <div className="neo-pressed px-3 py-2 rounded-xl">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@agrinex.id"
                  className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider block">
                Kata Sandi
              </label>
              <div className="neo-pressed px-3 py-2 rounded-xl flex items-center gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-900 transition cursor-pointer"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-medium text-xs tracking-wide transition shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                'Masuk'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
