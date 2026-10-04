'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  User,
  Sparkles,
  MapPin,
  BedDouble,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import { useHotel } from '@/components/HotelContext';
import { useLanguage } from '@/components/LanguageContext';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state (Free-style owner setup)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regHotelName, setRegHotelName] = useState('');
  const [regCity, setRegCity] = useState('બોટાદ');
  const [autoRooms, setAutoRooms] = useState(true);
  const [roomCount, setRoomCount] = useState(10);
  const [defaultPrice, setDefaultPrice] = useState('1500');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const { showToast } = useToast();
  const { refreshAuth } = useHotel();
  const { isGu, setLang } = useLanguage();

  const cityOptions = ['બોટાદ', 'અમદાવાદ', 'રાજકોટ', 'સુરત', 'વડોદરા', 'ભાવનગર', 'મુંબઈ'];

  // Handle Login
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
        const err = data.error || (isGu ? 'લૉગિન નિષ્ફળ ગયું. વિગતો તપાસો.' : 'Login failed. Please check credentials.');
        setErrorMessage(err);
        showToast(err, 'error');
        return;
      }

      showToast(isGu ? `સ્વાગત છે, ${data.user.name}!` : `Welcome, ${data.user.name}!`, 'success');
      await refreshAuth();
      router.push('/dashboard');
    } catch {
      const netErr = isGu ? 'કનેક્શન એરર આવી. ફરી પ્રયાસ કરો.' : 'Network error occurred. Please try again.';
      setErrorMessage(netErr);
      showToast(netErr, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Free-style Owner Registration (Automated)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim()) {
      showToast(isGu ? 'કૃપા કરીને તમારું નામ લખો' : 'Please enter your name', 'error');
      return;
    }
    if (!regEmail.trim()) {
      showToast(isGu ? 'કૃપા કરીને ઈમેઈલ લખો' : 'Please enter an email address', 'error');
      return;
    }
    if (regPassword.length < 6) {
      showToast(isGu ? 'પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો રાખો (Min 6 Characters)' : 'Password must be at least 6 characters', 'error');
      return;
    }
    if (!regHotelName.trim()) {
      showToast(isGu ? 'કૃપા કરીને તમારી હોટલનું નામ લખો' : 'Please enter your hotel name', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        hotelName: regHotelName.trim(),
        hotelCity: regCity.trim() || 'City',
        autoGenerateRooms: autoRooms,
        roomCount: Number(roomCount) || 10,
        defaultPrice: Number(defaultPrice) || 1500,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const err = data.error || (isGu ? 'નોંધણી નિષ્ફળ ગઈ.' : 'Registration failed.');
        setErrorMessage(err);
        showToast(err, 'error');
        return;
      }

      showToast(
        isGu
          ? `અભિનંદન! હોટલ અને ${data.roomsCreated || 0} રૂમ સફળતાપૂર્વક બની ગયા!`
          : `Success! Hotel and ${data.roomsCreated || 0} rooms ready!`,
        'success'
      );

      await refreshAuth();
      window.location.href = '/dashboard';
    } catch {
      const netErr = isGu ? 'નોંધણીમાં એરર આવી.' : 'Error during registration.';
      setErrorMessage(netErr);
      showToast(netErr, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-5">
        {/* Brand header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-xl shadow-blue-700/25 mb-1">
            <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Atithi<span className="text-blue-600">Stay</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {isGu
              ? 'હોટલ ગેસ્ટ મેનેજમેન્ટ & ઝડપી ચેક-ઇન સિસ્ટમ'
              : 'Multi-Hotel Guest Management & Fast Check-in System'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-5 sm:p-7 space-y-5">
          {/* Top Bar: Mode Switcher + Language Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
            {/* Mode Switch Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isGu ? 'લૉગઇન' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{isGu ? 'નવું રજીસ્ટ્રેશન' : 'Register'}</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setLang('gu')}
                className={`text-[11px] px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  isGu ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`text-[11px] px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  !isGu ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 font-medium animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isGu ? 'ઈમેઈલ એડ્રેસ' : 'Email Address'}
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
                  {isGu ? 'પાસવર્ડ' : 'Password'}
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
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md shadow-blue-700/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <span>{isGu ? 'લૉગઇન થઈ રહ્યું છે...' : 'Signing in...'}</span>
                ) : (
                  <>
                    <span>{isGu ? 'લૉગઇન કરો (Sign In)' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  {isGu ? 'નવું રજીસ્ટ્રેશન કરો (Register New Hotel) →' : 'New here? Register in 30 seconds →'}
                </button>
              </div>
            </form>
          ) : (
            /* 2. FAST-TRACK AUTOMATED REGISTRATION */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>{isGu ? 'ઝડપી હોટલ રજીસ્ટ્રેશન (Quick Registration)' : 'Fast 1-Click Hotel Launch'}</span>
                </div>
                <p className="text-[11px] text-blue-700">
                  {isGu
                    ? 'તમારું નામ, પાસવર્ડ અને હોટલની વિગતો ભરો. રૂમ આપોઆપ બની જશે!'
                    : 'Set your name, password and hotel. 10 rooms are generated automatically!'}
                </p>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isGu ? 'તમારું પૂરું નામ (Full Name)' : 'Your Name'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Riddhesh Soni"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isGu ? 'ઈમેઈલ (Email)' : 'Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="owner@hotel.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Password */}
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {isGu ? 'તમારી પસંદગીનો પાસવર્ડ (Set Your Password)' : 'Create Your Password'}
                  </label>
                  {regPassword.length > 0 && regPassword.length < 6 && (
                    <span className="text-[11px] font-bold text-rose-600 animate-pulse">
                      {isGu
                        ? `ઓછામાં ઓછા ૬ અક્ષર (વધુ ${6 - regPassword.length} અક્ષર બાકી)`
                        : `${6 - regPassword.length} more chars needed`}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="ઓછામાં ઓછા ૬ અક્ષર (Min 6 chars)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={`w-full pl-9 pr-10 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                      regPassword.length > 0 && regPassword.length < 6
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Hotel Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'હોટલનું નામ (Hotel Name)' : 'Hotel Property Name'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Krishna Residency & Guest House"
                    value={regHotelName}
                    onChange={(e) => setRegHotelName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* City with Quick-Pick Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'શહેર (City)' : 'City / Location'}
                </label>
                <div className="relative mb-1.5">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cityOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRegCity(c)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition cursor-pointer ${
                        regCity === c
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* ⚡ 1-Click Auto Room Generation Preset */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRooms}
                    onChange={(e) => setAutoRooms(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <BedDouble className="w-4 h-4 text-emerald-600" />
                    <span>{isGu ? '⚡ ઓટોમેટીક રૂમ બનાવો (Auto Generate Rooms)' : '⚡ Auto Generate 10 Rooms'}</span>
                  </span>
                </label>

                {autoRooms && (
                  <div className="pt-1.5 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                        {isGu ? 'રૂમ સંખ્યા (Count)' : 'Room Count'}
                      </span>
                      <select
                        aria-label="Room Count"
                        value={roomCount}
                        onChange={(e) => setRoomCount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                      >
                        <option value={5}>5 Rooms (101 - 105)</option>
                        <option value={10}>10 Rooms (101 - 110)</option>
                        <option value={20}>20 Rooms (101 - 210)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                        {isGu ? 'દૈનિક ભાડું (Tariff ₹)' : 'Tariff (₹)'}
                      </span>
                      <input
                        type="number"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-700/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
              >
                {loading ? (
                  <span>{isGu ? 'હોટલ બની રહી છે...' : 'Setting up hotel...'}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isGu ? '✨ હોટલ શરૂ કરો (Launch Hotel in 1-Click)' : 'Launch Hotel in 1-Click'}</span>
                  </>
                )}
              </button>
            </form>
          )}
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
