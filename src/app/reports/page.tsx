'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Users,
  IndianRupee,
  Building2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';
import { format, subDays } from 'date-fns';

interface ReportSummary {
  totalStays: number;
  totalGuests: number;
  totalRevenue: number;
  startDate: string;
  endDate: string;
}

interface HotelBreakdown {
  hotelName: string;
  staysCount: number;
  guestsCount: number;
  revenue: number;
}

interface DayBreakdown {
  date: string;
  staysCount: number;
  revenue: number;
}

export default function ReportsPage() {
  const { user, selectedHotelId, hotels } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [perHotel, setPerHotel] = useState<HotelBreakdown[]>([]);
  const [perDay, setPerDay] = useState<DayBreakdown[]>([]);

  // Date filters
  const today = format(new Date(), 'yyyy-MM-dd');
  const past30Days = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(past30Days);
  const [endDate, setEndDate] = useState(today);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hotelId: selectedHotelId,
        startDate,
        endDate,
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setPerHotel(data.perHotel || []);
        setPerDay(data.perDay || []);
      }
    } catch {
      showToast(isGu ? 'રિપોર્ટ બનાવવામાં ભૂલ આવી' : 'Error generating reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, startDate, endDate, showToast, isGu]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDownloadCsv = () => {
    const params = new URLSearchParams({
      hotelId: selectedHotelId,
      startDate,
      endDate,
      format: 'csv',
    });
    window.location.href = `/api/reports?${params.toString()}`;
  };

  if (user && user.role !== 'owner') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">{isGu ? 'પ્રવેશ પ્રતિબંધિત' : 'Access Denied'}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {isGu ? 'આ વિભાગ ફક્ત હોટલ માલિક (એડમિન) માટે જ છે.' : 'This section is restricted to hotel owners only.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isGu ? 'બિઝનેસ અને આવક એનાલિટિક્સ' : 'Business Analytics'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'નાણાકીય અને રોકાણ રિપોર્ટ્સ (Reports)' : 'Reports & Occupancy'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isGu
              ? 'દૈનિક રોકાણ, હોટલ શાખા મુજબ આવક અને CSV ઓડિટ ફાઇલ ડાઉનલોડ કરો.'
              : 'View stays per day, revenue per hotel branch, and export audit CSV.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 active:scale-95 transition self-stretch sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isGu ? 'CSV રિપોર્ટ ડાઉનલોડ (Export CSV)' : 'Export CSV Report'}</span>
        </button>
      </div>

      {/* Date Filter Strip - Clean, tight on mobile with no awkward spacing */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {isGu ? 'આ તારીખથી (From):' : 'From Date:'}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              {isGu ? 'આ તારીખ સુધી (To):' : 'To Date:'}
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                setEndDate(today);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg active:scale-95 transition cursor-pointer"
            >
              {isGu ? 'છેલ્લા ૭ દિવસ' : 'Last 7 Days'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(past30Days);
                setEndDate(today);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg active:scale-95 transition cursor-pointer"
            >
              {isGu ? 'છેલ્લા ૩૦ દિવસ' : 'Last 30 Days'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchReports()}
            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-xl transition shrink-0 cursor-pointer"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Stays */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {isGu ? 'કુલ રોકાયેલા મહેમાનો (Stays)' : 'Total Stays Booked'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? '-' : summary?.totalStays || 0}
            </div>
            <span className="text-[11px] text-slate-400">
              {isGu ? 'કુલ બુકિંગ' : 'Completed stays'}
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Guests */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {isGu ? 'કુલ વ્યક્તિઓ (Total Guests)' : 'Total Guests Accommodated'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mt-1">
              {loading ? '-' : summary?.totalGuests || 0}
            </div>
            <span className="text-[11px] text-slate-400">
              {isGu ? 'મહેમાનોની કુલ સંખ્યા' : 'Individual people'}
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {isGu ? 'કુલ આવક (Total Revenue)' : 'Total Revenue Collected'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
              {loading ? '-' : `₹${summary?.totalRevenue?.toLocaleString('en-IN') || 0}`}
            </div>
            <span className="text-[11px] text-slate-400">
              {isGu ? 'કુલ વસૂલાત' : 'Net collection'}
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Stays per Hotel + Stays per Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Stays Per Hotel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>{isGu ? 'હોટલ શાખા મુજબ આવક & રોકાણ' : 'Performance by Hotel Branch'}</span>
            </h3>
          </div>

          {perHotel.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              {isGu ? 'પસંદ કરેલ તારીખમાં કોઈ ડેટા નથી.' : 'No data for selected date range.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {perHotel.map((h, idx) => (
                <div key={idx} className="py-2.5 sm:py-3 flex items-center justify-between text-xs sm:text-sm gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">{h.hotelName}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {h.staysCount} {isGu ? 'રોકાણ' : 'Stays'} &bull; {h.guestsCount} {isGu ? 'મહેમાનો' : 'Guests'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 text-sm sm:text-base">
                      ₹{h.revenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stays Per Day */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{isGu ? 'દૈનિક રોકાણ વિગત' : 'Daily Occupancy Breakdown'}</span>
            </h3>
          </div>

          {perDay.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              {isGu ? 'આ સમયગાળામાં કોઈ રોકાણ નોંધાયું નથી.' : 'No daily activity recorded in this period.'}
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
              {perDay.map((d, idx) => (
                <div key={idx} className="py-2 sm:py-2.5 flex items-center justify-between text-xs gap-2">
                  <div>
                    <span className="font-bold text-slate-800">{d.date}</span>
                    <span className="text-slate-500 text-[11px] block">
                      {d.staysCount} {isGu ? 'રોકાણ' : `stay${d.staysCount > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    ₹{d.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
