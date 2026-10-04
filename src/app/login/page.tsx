'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Languages, Crown } from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import { useHotel } from '@/components/HotelContext';
import { useLanguage } from '@/components/LanguageContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const { showToast } = useToast();
  const { refreshAuth } = useHotel();
  const { isGu, setLang } = useLanguage();

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        const err = data.error || (isGu ? 'લૉગિન નિષ્ફળ ગયું. કૃપા કરીને વિગતો તપાસો.' : 'Login failed. Please check credentials.');
        setErrorMessage(err);
        showToast(err, 'error');
        return;
      }

      showToast(isGu ? `સ્વાગત છે, ${data.user.name}!` : `Welcome back, ${data.user.name}!`, 'success');
      await refreshAuth();
      router.push('/dashboard');
    } catch {
      const netErr = isGu ? 'નેટવર્ક એરર આવી. કૃપા કરીને ફરી પ્રયાસ કરો.' : 'Network error occurred. Please try again.';
      setErrorMessage(netErr);
      showToast(netErr, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillAndSubmitDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 text-white shadow-xl shadow-blue-700/25 mb-1">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Atithi<span className="text-blue-600">Stay</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {isGu
              ? 'મલ્ટી-હોટલ ગેસ્ટ મેનેજમેન્ટ & આધાર કાર્ડ વેરિફિકેશન સિસ્ટમ'
              : 'Multi-Hotel Guest Management & Aadhaar Verification System'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 space-y-5">
          {/* Language Toggle Header in Card */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">
              {isGu ? 'લૉગઇન એકાઉન્ટ (Sign In)' : 'Sign In to System'}
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setLang('gu')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  isGu
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  !isGu
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {isGu ? 'ઈમેઈલ એડ્રેસ (Email Address)' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hotel.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {isGu ? 'પાસવર્ડ (Password)' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-700/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <span>{isGu ? 'લૉગિન થઈ રહ્યું છે...' : 'Signing in...'}</span>
              ) : (
                <>
                  <span>{isGu ? 'લૉગઇન કરો (Sign In)' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              {isGu ? 'ડેમો લૉગિન (૧-ક્લિક)' : 'Demo Credentials (1-Click Login)'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillAndSubmitDemo('owner@demo.com', 'Demo@1234')}
                className="flex items-center justify-start gap-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 transition text-left cursor-pointer active:scale-98"
              >
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {isGu ? 'હોટલ માલિક (Admin)' : 'Hotel Owner'}
                  </div>
                  <div className="text-[10px] text-blue-600">
                    {isGu ? 'બધી હોટલો & એડમિન પેનલ' : 'All Hotels & Reports'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillAndSubmitDemo('staff@demo.com', 'Demo@1234')}
                className="flex items-center justify-start gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition text-left cursor-pointer active:scale-98"
              >
                <UserCheck className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {isGu ? 'રિસેપ્શન સ્ટાફ' : 'Front Desk Staff'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isGu ? 'ફક્ત સોંપેલ હોટલ' : 'Single Hotel Desk'}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {isGu
              ? 'દરેક હોટલનો ડેટા સંપૂર્ણ સુરક્ષિત અને અલગ રાખવામાં આવે છે'
              : 'Each hotel data is strictly isolated and secure'}
          </span>
        </div>
      </div>
    </div>
  );
}
