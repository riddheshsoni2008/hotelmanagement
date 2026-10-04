'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  BedDouble,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Clock,
  Eye,
  LogOut,
  Building2,
  Phone,
  Search,
  Crown,
  ShieldCheck,
  BarChart3,
  Users2,
  Settings,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { formatTimeIST, formatDateIST, getStayStatusAndCountdown } from '@/lib/time';

interface ActiveStayItem {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelCity: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestIdLast4?: string;
  numberOfGuests: number;
  roomId: string;
  roomNumber: string;
  roomType: string;
  checkInAt: string;
  durationValue: number;
  durationUnit: 'hours' | 'days';
  expectedCheckOutAt: string;
  isOverstay: boolean;
  amount?: number;
  paymentMode?: string;
  notes?: string;
}

interface DashboardStats {
  currentlyCheckedIn: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  totalRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  overstayCount: number;
}

export default function DashboardPage() {
  const { user, selectedHotelId, setSelectedHotelId, hotels } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeStays, setActiveStays] = useState<ActiveStayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  // Check-out dialog state
  const [checkoutTarget, setCheckoutTarget] = useState<ActiveStayItem | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Extend modal state
  const [extendTarget, setExtendTarget] = useState<ActiveStayItem | null>(null);
  const [extendValue, setExtendValue] = useState<number>(2);
  const [extendUnit, setExtendUnit] = useState<'hours' | 'days'>('hours');
  const [extendNotes, setExtendNotes] = useState('');
  const [extending, setExtending] = useState(false);

  // Ticking effect for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const url = `/api/dashboard/stats?hotelId=${encodeURIComponent(selectedHotelId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setActiveStays(data.activeStays || []);
      }
    } catch {
      showToast(isGu ? 'ડેશબોર્ડ અપડેટ કરવામાં ભૂલ આવી' : 'Failed to refresh dashboard stats', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedHotelId, showToast, isGu]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh interval (30 seconds)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchDashboardData]);

  // Check out handler
  const handleCheckoutConfirm = async () => {
    if (!checkoutTarget) return;
    setCheckingOut(true);

    try {
      const res = await fetch(`/api/stays/${checkoutTarget.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Check-out failed', 'error');
        return;
      }

      showToast(
        isGu
          ? `મહેમાનનું ચેક-આઉટ સફળતાપૂર્વક થઈ ગયું (${data.timingDescription || ''})`
          : `Guest checked out successfully (${data.timingDescription})`,
        'success'
      );
      setCheckoutTarget(null);
      fetchDashboardData(true);
    } catch {
      showToast(isGu ? 'ચેક-આઉટમાં ભૂલ આવી' : 'Error processing check-out', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  // Extend stay handler
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendTarget) return;
    setExtending(true);

    try {
      const res = await fetch(`/api/stays/${extendTarget.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationValue: extendValue,
          durationUnit: extendUnit,
          notes: extendNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to extend stay', 'error');
        return;
      }

      showToast(
        isGu
          ? `સમય ${extendValue} ${extendUnit === 'hours' ? 'કલાક' : 'દિવસ'} લંબાવાયો`
          : `Stay extended by ${extendValue} ${extendUnit}`,
        'success'
      );
      setExtendTarget(null);
      setExtendNotes('');
      fetchDashboardData(true);
    } catch {
      showToast(isGu ? 'સમય લંબાવવામાં ભૂલ આવી' : 'Error extending stay', 'error');
    } finally {
      setExtending(false);
    }
  };

  const filteredStays = activeStays.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.guestName.toLowerCase().includes(term) ||
      s.guestPhone.includes(term) ||
      s.roomNumber.toLowerCase().includes(term) ||
      s.hotelName.toLowerCase().includes(term)
    );
  });

  const isOwner = user?.role === 'owner';
  const selectedHotelObj = hotels.find((h) => h.id === selectedHotelId);
  const currentViewTitle =
    selectedHotelId === 'all'
      ? isGu
        ? 'બધી હોટલો (All Hotels Combined)'
        : 'All Hotels (Combined)'
      : selectedHotelObj?.name || 'Hotel Dashboard';

  return (
    <div className="space-y-6">
      {/* 👑 ADMIN CONTROL PANEL (Visible Strictly to Owner/Admin Only) */}
      {isOwner && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {isGu ? '👑 માલિક એડમિન પેનલ (Admin Control Panel)' : '👑 Owner Admin Control Panel'}
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full tracking-wider">
                    {isGu ? 'માલિક લૉગિન' : 'Owner Only'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isGu
                    ? 'બધી હોટલ શાખાઓ, સ્ટાફ લૉગિન, અને સંપૂર્ણ બિઝનેસ રિપોર્ટ્સનું નિયંત્રણ ફક્ત તમારી પાસે છે.'
                    : 'Master administration: Add properties, configure dedicated staff logins, and view cross-property financial reports.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href="/hotels"
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isGu ? '+ નવી હોટલ & લૉગિન' : '+ Add Hotel & Login'}</span>
              </Link>
            </div>
          </div>

          {/* Admin Navigation Quick-Action Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <Link
              href="/hotels"
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-3 rounded-xl transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                    {isGu ? 'હોટલ શાખાઓ' : 'Hotel Properties'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {hotels.length} {isGu ? 'હોટલ નોંધાયેલ' : 'Hotels'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>

            <Link
              href="/staff"
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-3 rounded-xl transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Users2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                    {isGu ? 'સ્ટાફ લૉગિન' : 'Staff Accounts'}
                  </div>
                  <div className="text-[10px] text-slate-400">{isGu ? 'મેનેજ સ્ટાફ' : 'Manage Logins'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>

            <Link
              href="/reports"
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-3 rounded-xl transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                    {isGu ? 'નાણાકીય રિપોર્ટ' : 'Revenue Reports'}
                  </div>
                  <div className="text-[10px] text-slate-400">{isGu ? 'આવક & હિસાબ' : 'Analytics & CSV'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>

            <Link
              href="/settings"
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-3 rounded-xl transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                    {isGu ? 'સિસ્ટમ સેટિંગ્સ' : 'System Settings'}
                  </div>
                  <div className="text-[10px] text-slate-400">{isGu ? 'ડોક્યુમેન્ટ સફાઈ' : 'Storage Optimizer'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>
          </div>

          {/* Quick Hotel Filter Chips for Owner */}
          <div className="pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-slate-400 font-medium shrink-0 mr-1 text-[11px]">
              {isGu ? 'ઝડપી સ્વિચ:' : 'Quick Filter:'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedHotelId('all')}
              className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition text-xs cursor-pointer ${
                selectedHotelId === 'all'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isGu ? '🏨 બધી હોટલો (All)' : 'All Hotels (Combined)'}
            </button>
            {hotels.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHotelId(h.id)}
                className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition text-xs cursor-pointer ${
                  selectedHotelId === h.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {h.name} ({h.city})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staff Dedicated Branch Banner (Strict Isolation for Staff) */}
      {!isOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-blue-950">
                  {currentViewTitle}
                </h2>
                <span className="text-[10px] bg-blue-200/80 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                  {isGu ? 'તમારી હોટલ શાખા' : 'Assigned Property'}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-0.5">
                {isGu
                  ? `તમે ${user?.name} તરીકે લૉગિન છો. તમે ફક્ત આ હોટલનું કામકાજ જોઈ અને ભરી શકો છો.`
                  : `Logged in as ${user?.name}. You are operating strictly for ${currentViewTitle}.`}
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block shrink-0">
            <span className="text-xs font-semibold text-blue-900 block">{user?.email}</span>
            <span className="text-[10px] text-blue-600 font-medium">Front Desk Staff</span>
          </div>
        </div>
      )}

      {/* Critical Overdue Check-out Alert Banner */}
      {stats && stats.overstayCount > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl p-4 sm:p-5 shadow-xl shadow-red-600/20 border-2 border-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 animate-pulse text-white shadow-inner">
              <AlertTriangle className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-1">
                <span>{isGu ? '🚨 ચેક-આઉટ ચેતવણી' : '🚨 OVERDUE ALERT'}</span>
                <span>•</span>
                <span>{stats.overstayCount} {isGu ? 'રૂમ બાકી' : 'Rooms'}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {isGu
                  ? `${stats.overstayCount} રૂમનો ચેક-આઉટ સમય વીતી ગયો છે!`
                  : `${stats.overstayCount} room(s) have exceeded check-out time!`}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                {isGu
                  ? 'નિર્ધારિત સમય પૂરો થઈ ગયો છે. કૃપા કરીને મહેમાનનો સંપર્ક કરી તાત્કાલિક ચેક-આઉટ કરો અથવા સમય લંબાવો.'
                  : 'Expected departure time has passed. Please contact the guests immediately.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('active-stays-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 text-xs sm:text-sm font-extrabold rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>{isGu ? 'વિલંબિત રૂમની યાદી જુઓ ↓' : 'View Overdue Stays ↓'}</span>
          </button>
        </div>
      )}

      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>{currentViewTitle}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'લાઈવ રિસેપ્શન ડેશબોર્ડ (Dashboard)' : 'Live Reception Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isGu
              ? 'હાલમાં રોકાયેલા મહેમાનો, કલાક દીઠ બાકી સમય, અને ખાલી/ભરેલા રૂમની લાઈવ સ્થિતિ.'
              : 'Real-time active guests, hourly stay countdowns, and room availability.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Auto Refresh toggle */}
          <button
            type="button"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`text-xs px-3 py-2 rounded-xl border font-medium flex items-center gap-1.5 transition cursor-pointer ${
              autoRefreshEnabled
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isGu ? (autoRefreshEnabled ? 'ઓટો-રિફ્રેશ: ચાલુ' : 'ઓટો-રિફ્રેશ: બંધ') : `Auto: ${autoRefreshEnabled ? 'ON' : 'OFF'}`}</span>
          </button>

          {/* Manual refresh button */}
          <button
            type="button"
            disabled={refreshing}
            onClick={() => fetchDashboardData(true)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title={isGu ? 'હમણાં રિફ્રેશ કરો' : 'Refresh now'}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* New Check-in Primary Button */}
          <Link
            href="/check-in"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isGu ? '+ નવો ચેક-ઇન (Check-in)' : 'New Check-in'}</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards (Bilingual English + Gujarati) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Currently Checked In */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isGu ? 'હાલમાં રોકાયેલા' : 'Checked In'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? '-' : stats?.currentlyCheckedIn || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {isGu ? 'રૂમમાં હાજર મહેમાનો' : 'Active guests in rooms'}
            </div>
          </div>
        </div>

        {/* Available Rooms */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isGu ? 'ખાલી રૂમ (ઉપલબ્ધ)' : 'Available Rooms'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {loading ? '-' : stats?.availableRooms || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {isGu ? `કુલ ${stats?.totalRooms || 0} રૂમમાંથી` : `Out of ${stats?.totalRooms || 0} total rooms`}
            </div>
          </div>
        </div>

        {/* Today's Check-ins */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              {isGu ? 'આજના ચેક-ઇન' : "Today's In"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900">
              {loading ? '-' : stats?.todayCheckIns || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {isGu ? 'આજે આવેલા નવા મહેમાન' : 'Arrivals since midnight'}
            </div>
          </div>
        </div>

        {/* Today's Check-outs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isGu ? 'આજના ચેક-આઉટ' : "Today's Out"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-700">
              {loading ? '-' : stats?.todayCheckOuts || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {isGu ? 'આજે પૂર્ણ થયેલ રોકાણ' : 'Departures completed'}
            </div>
          </div>
        </div>

        {/* Overstay Alert Card */}
        <div
          className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
            (stats?.overstayCount || 0) > 0
              ? 'bg-red-50/80 border-red-200 text-red-900 animate-pulse-subtle'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              {isGu ? 'સમય પૂરો (Overstay)' : 'Overstay'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600">
              {loading ? '-' : stats?.overstayCount || 0}
            </div>
            <div className="text-[11px] text-red-700 mt-0.5 font-semibold">
              {(stats?.overstayCount || 0) > 0
                ? isGu
                  ? 'ધ્યાન આપો / ચેક-આઉટ બાકી'
                  : 'Requires attention'
                : isGu
                ? 'બધા મહેમાનો સમયસર છે'
                : 'All stays on track'}
            </div>
          </div>
        </div>
      </div>

      {/* Live Active Stays Table & Cards */}
      <div id="active-stays-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-24">
        {/* Section Header with Search */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {isGu ? `હાલમાં રોકાયેલા મહેમાનો (${filteredStays.length})` : `Currently Checked-in Guests (${filteredStays.length})`}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Live IST
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isGu ? 'મહેમાનનું નામ, રૂમ અથવા ફોન શોધો...' : 'Search guest, room, phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm">{isGu ? 'માહિતી લોડ થઈ રહી છે...' : 'Loading active stays...'}</p>
          </div>
        ) : filteredStays.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {isGu ? 'હાલમાં કોઈ મહેમાન રોકાયેલ નથી' : 'No active checked-in guests found'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? isGu
                  ? 'શોધ પરિણામ મળ્યું નથી.'
                  : 'No results matched your search query.'
                : isGu
                ? 'બધા રૂમ ખાલી છે. નવો ગેસ્ટ ચેક-ઇન કરવા નીચે બટન દબાવો.'
                : 'All rooms are currently vacant.'}
            </p>
            <Link
              href="/check-in"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isGu ? 'નવો ગેસ્ટ ચેક-ઇન કરો' : 'Check In a Guest'}</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">{isGu ? 'રૂમ (Room)' : 'Room'}</th>
                    <th className="py-3 px-4">{isGu ? 'મહેમાન (Guest)' : 'Guest Details'}</th>
                    {selectedHotelId === 'all' && <th className="py-3 px-4">{isGu ? 'હોટલ શાખા' : 'Hotel'}</th>}
                    <th className="py-3 px-4">{isGu ? 'ચેક-ઇન સમય' : 'Check-In'}</th>
                    <th className="py-3 px-4">{isGu ? 'સમયગાળો' : 'Duration'}</th>
                    <th className="py-3 px-4">{isGu ? 'વિદાય સમય' : 'Expected Out'}</th>
                    <th className="py-3 px-4">{isGu ? 'સ્થિતિ / બાકી સમય' : 'Status / Countdown'}</th>
                    <th className="py-3 px-4 text-right">{isGu ? 'ક્રિયાઓ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredStays.map((stay) => {
                    void nowTick;
                    const countdown = getStayStatusAndCountdown('checked_in', stay.expectedCheckOutAt);

                    return (
                      <tr
                        key={stay.id}
                        className={`hover:bg-slate-50/80 transition ${
                          countdown.isOverstay ? 'bg-red-50/40' : ''
                        }`}
                      >
                        {/* Room */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {isGu ? 'રૂમ' : 'Room'} {stay.roomNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">{stay.roomType}</div>
                        </td>

                        {/* Guest */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{stay.guestName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{stay.guestPhone}</span>
                            {stay.guestIdLast4 && (
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[10px]">
                                •••• {stay.guestIdLast4}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Hotel (if all hotels selected) */}
                        {selectedHotelId === 'all' && (
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <div className="font-medium text-slate-800">{stay.hotelName}</div>
                            <div className="text-slate-400 text-[11px]">{stay.hotelCity}</div>
                          </td>
                        )}

                        {/* Check In Time */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{formatTimeIST(stay.checkInAt)}</div>
                          <div className="text-[11px] text-slate-500">{formatDateIST(stay.checkInAt)}</div>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-semibold text-xs">
                            {stay.durationValue} {isGu ? (stay.durationUnit === 'hours' ? 'કલાક' : 'દિવસ') : stay.durationUnit}
                          </span>
                        </td>

                        {/* Expected Check Out */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{formatTimeIST(stay.expectedCheckOutAt)}</div>
                          <div className="text-[11px] text-slate-500">{formatDateIST(stay.expectedCheckOutAt)}</div>
                        </td>

                        {/* Status / Countdown */}
                        <td className="py-3 px-4">
                          <StatusBadge
                            status={countdown.statusBadge}
                            countdownText={countdown.text}
                            isOverstay={countdown.isOverstay}
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/stays/${stay.id}`}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                              title={isGu ? 'આધાર કાર્ડ & વિગત જુઓ' : 'View Details & Aadhaar'}
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setExtendTarget(stay);
                                setExtendValue(2);
                                setExtendUnit('hours');
                                setExtendNotes('');
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                              title={isGu ? 'સમય લંબાવો' : 'Extend Stay'}
                            >
                              {isGu ? 'લંબાવો' : 'Extend'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setCheckoutTarget(stay)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 transition flex items-center gap-1 cursor-pointer"
                              title={isGu ? 'ચેક-આઉટ કરો' : 'Check Out'}
                            >
                              <LogOut className="w-3 h-3" />
                              <span>{isGu ? 'ચેક-આઉટ' : 'Check out'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredStays.map((stay) => {
                const countdown = getStayStatusAndCountdown('checked_in', stay.expectedCheckOutAt);

                return (
                  <div
                    key={stay.id}
                    className={`p-4 space-y-3 ${
                      countdown.isOverstay ? 'bg-red-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900">
                            {isGu ? 'રૂમ' : 'Room'} {stay.roomNumber}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">({stay.roomType})</span>
                        </div>
                        <h4 className="font-semibold text-sm text-slate-800 mt-0.5">{stay.guestName}</h4>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{stay.guestPhone}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <StatusBadge
                          status={countdown.statusBadge}
                          countdownText={countdown.text}
                          isOverstay={countdown.isOverstay}
                        />
                      </div>
                    </div>

                    {/* Check In / Out Timing row */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {isGu ? 'ચેક-ઇન સમય' : 'Checked In'}
                        </span>
                        <span className="font-semibold text-slate-800">{formatTimeIST(stay.checkInAt)}</span>
                        <span className="text-[10px] text-slate-500 block">{formatDateIST(stay.checkInAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {isGu ? 'વિદાય સમય' : 'Expected Out'} ({stay.durationValue} {isGu ? (stay.durationUnit === 'hours' ? 'કલાક' : 'દિવસ') : stay.durationUnit})
                        </span>
                        <span className="font-semibold text-slate-800">{formatTimeIST(stay.expectedCheckOutAt)}</span>
                        <span className="text-[10px] text-slate-500 block">{formatDateIST(stay.expectedCheckOutAt)}</span>
                      </div>
                    </div>

                    {/* Actions Strip */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link
                        href={`/stays/${stay.id}`}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold text-center transition flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>{isGu ? 'આધાર & વિગત' : 'Aadhaar & Details'}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setExtendTarget(stay);
                          setExtendValue(2);
                          setExtendUnit('hours');
                          setExtendNotes('');
                        }}
                        className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                      >
                        {isGu ? 'સમય લંબાવો' : 'Extend'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setCheckoutTarget(stay)}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{isGu ? 'ચેક-આઉટ' : 'Out'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog for Check-out */}
      <ConfirmationDialog
        isOpen={Boolean(checkoutTarget)}
        title={
          isGu
            ? `${checkoutTarget?.guestName || 'મહેમાન'} નું ચેક-આઉટ કરવું છે?`
            : `Check out ${checkoutTarget?.guestName || 'Guest'}?`
        }
        message={
          isGu
            ? `રૂમ ${checkoutTarget?.roomNumber} ખાલી થશે અને સિસ્ટમમાં ચેક-આઉટ સમય નોંધાઈ જશે.`
            : `This will check out the guest from Room ${checkoutTarget?.roomNumber}, mark the room as available, and record the departure time.`
        }
        confirmText={isGu ? 'ચેક-આઉટ કન્ફર્મ કરો' : 'Confirm Check-out'}
        cancelText={isGu ? 'રદ કરો' : 'Cancel'}
        variant="primary"
        loading={checkingOut}
        onConfirm={handleCheckoutConfirm}
        onCancel={() => setCheckoutTarget(null)}
      />

      {/* Extend Stay Modal */}
      {extendTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setExtendTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isGu ? `રોકાણ લંબાવો: ${extendTarget.guestName}` : `Extend Stay: ${extendTarget.guestName}`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isGu ? 'રૂમ' : 'Room'} {extendTarget.roomNumber} &bull; {isGu ? 'હાલનો ચેક-આઉટ સમય' : 'Current expected check-out'}: {formatTimeIST(extendTarget.expectedCheckOutAt)}
              </p>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {isGu ? 'વધારાનો સમય પસંદ કરો' : 'Additional Duration'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={extendValue}
                    onChange={(e) => setExtendValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <div className="flex rounded-xl bg-slate-100 p-1 flex-1">
                    <button
                      type="button"
                      onClick={() => setExtendUnit('hours')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        extendUnit === 'hours'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isGu ? 'કલાક (Hours)' : 'Hours'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtendUnit('days')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        extendUnit === 'days'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isGu ? 'દિવસ (Days)' : 'Days'}
                    </button>
                  </div>
                </div>

                {/* Quick chip selectors */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[1, 2, 3, 6, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setExtendValue(h);
                        setExtendUnit('hours');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                        extendValue === h && extendUnit === 'hours'
                          ? 'bg-blue-600 border-blue-600 text-white font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      +{h} {isGu ? 'કલાક' : 'h'}
                    </button>
                  ))}
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setExtendValue(d);
                        setExtendUnit('days');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                        extendValue === d && extendUnit === 'days'
                          ? 'bg-blue-600 border-blue-600 text-white font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      +{d} {isGu ? 'દિવસ' : `day${d > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'નોંધ / કારણ (મરજિયાત)' : 'Reason / Notes (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isGu ? 'દા.ત. ટ્રેન મોડી છે, વધારાના પૈસા લીધા' : 'e.g. Flight delayed, extra charges collected'}
                  value={extendNotes}
                  onChange={(e) => setExtendNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  {isGu ? 'રદ કરો' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow transition disabled:opacity-70 cursor-pointer"
                >
                  {extending ? (isGu ? 'સેવ થાય છે...' : 'Updating...') : (isGu ? 'સમય સેવ કરો' : 'Save Extension')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
