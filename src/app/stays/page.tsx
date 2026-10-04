'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  Phone,
  BedDouble,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTimeIST, formatDateIST, getStayStatusAndCountdown } from '@/lib/time';

interface StayListItem {
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
  actualCheckOutAt?: string;
  status: 'checked_in' | 'checked_out';
  isOverstay: boolean;
  amount?: number;
  paymentMode?: string;
  notes?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StaysListPage() {
  const { selectedHotelId, hotels } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [stays, setStays] = useState<StayListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'checked_out' | 'overstay'>('all');
  const [page, setPage] = useState(1);

  const fetchStays = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hotelId: selectedHotelId,
        status: statusFilter,
        page: page.toString(),
        limit: '15',
      });
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const res = await fetch(`/api/stays?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStays(data.stays || []);
        setPagination(data.pagination);
      }
    } catch {
      showToast(isGu ? 'રોકાણ લોડ કરવામાં ભૂલ આવી' : 'Failed to load stays', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, statusFilter, page, searchTerm, showToast, isGu]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status');
      if (s && ['all', 'checked_in', 'checked_out', 'overstay'].includes(s)) {
        setStatusFilter(s as 'all' | 'checked_in' | 'checked_out' | 'overstay');
      }
    }
  }, []);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  // Debounce search input reset to page 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (status: 'all' | 'checked_in' | 'checked_out' | 'overstay') => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{isGu ? 'મહેમાન રોકાણ ડિરેક્ટરી' : 'Guest Stays Directory'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'મહેમાનો અને રોકાણ રેકોર્ડ (Stays)' : 'Stays & Guest Records'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isGu
              ? 'આધાર કાર્ડ ચકાસણી, રોકાણનો સમયગાળો અને તમામ ગેસ્ટ હિસ્ટ્રી જુઓ.'
              : 'Search, filter, and inspect guest registration history and Aadhaar card verifications.'}
          </p>
        </div>

        <Link
          href="/check-in"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition self-stretch sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isGu ? '+ નવો ચેક-ઇન (New Check-in)' : 'New Check-in'}</span>
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isGu ? 'મહેમાનનું નામ, મોબાઈલ, અથવા રૂમ શોધો...' : 'Search by guest name, mobile, or room number...'}
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Status Filter Tabs & Refresh Button grouped together */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: isGu ? 'બધા (All)' : 'All Stays' },
                  { id: 'checked_in', label: isGu ? 'હાજર (Checked In)' : 'Checked In' },
                  { id: 'overstay', label: isGu ? 'સમય પૂરો (Overstay)' : 'Overstay' },
                  { id: 'checked_out', label: isGu ? 'ચેક-આઉટ (Checked Out)' : 'Checked Out' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchStays()}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-xl transition shrink-0 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm">Loading stays...</p>
          </div>
        ) : stays.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No stays found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query, status filters, or hotel selector.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Room &amp; Hotel</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {stays.map((stay) => {
                    const countdown = getStayStatusAndCountdown(
                      stay.status,
                      stay.expectedCheckOutAt,
                      stay.actualCheckOutAt
                    );

                    return (
                      <tr
                        key={stay.id}
                        className={`hover:bg-slate-50/80 transition ${
                          countdown.isOverstay ? 'bg-red-50/40' : ''
                        }`}
                      >
                        {/* Guest */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{stay.guestName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{stay.guestPhone}</span>
                            {stay.guestIdLast4 && (
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[10px]">
                                •••• {stay.guestIdLast4}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Room & Hotel */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            Room {stay.roomNumber} ({stay.roomType})
                          </div>
                          <div className="text-xs text-slate-500">{stay.hotelName}</div>
                        </td>

                        {/* Check-In */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{formatTimeIST(stay.checkInAt)}</div>
                          <div className="text-[11px] text-slate-500">{formatDateIST(stay.checkInAt)}</div>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-semibold text-xs">
                            {stay.durationValue} {stay.durationUnit}
                          </span>
                        </td>

                        {/* Check-Out */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {formatTimeIST(stay.actualCheckOutAt || stay.expectedCheckOutAt)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatDateIST(stay.actualCheckOutAt || stay.expectedCheckOutAt)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <StatusBadge
                            status={countdown.statusBadge}
                            countdownText={countdown.text}
                            isOverstay={countdown.isOverstay}
                          />
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/stays/${stay.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {stays.map((stay) => {
                const countdown = getStayStatusAndCountdown(
                  stay.status,
                  stay.expectedCheckOutAt,
                  stay.actualCheckOutAt
                );

                return (
                  <div key={stay.id} className="p-3.5 sm:p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                          <span>{stay.guestName}</span>
                          {stay.guestIdLast4 && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              •••• {stay.guestIdLast4}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{stay.guestPhone}</span>
                        </div>
                        <div className="text-xs text-blue-700 font-semibold mt-1">
                          Room {stay.roomNumber} ({stay.roomType}) &bull; {stay.hotelName}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge
                          status={countdown.statusBadge}
                          countdownText={countdown.text}
                          isOverstay={countdown.isOverstay}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {isGu ? 'ચેક-ઇન સમય' : 'Check-In'}
                        </span>
                        <span className="font-semibold text-slate-800">{formatTimeIST(stay.checkInAt)}</span>
                        <span className="text-[10px] text-slate-500 block">{formatDateIST(stay.checkInAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {stay.status === 'checked_out'
                            ? (isGu ? 'ચેક-આઉટ' : 'Checked Out')
                            : (isGu ? `વિદાય (${stay.durationValue} ${stay.durationUnit === 'hours' ? 'કલાક' : 'દિવસ'})` : `Expected (${stay.durationValue} ${stay.durationUnit})`)}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatTimeIST(stay.actualCheckOutAt || stay.expectedCheckOutAt)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {formatDateIST(stay.actualCheckOutAt || stay.expectedCheckOutAt)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <Link
                        href={`/stays/${stay.id}`}
                        className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isGu ? 'આધાર ફોટો અને વિગત જુઓ' : 'View Aadhaar Photos & Timeline'}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 gap-2">
                <div className="text-[11px] sm:text-xs">
                  {isGu
                    ? `પેજ ${pagination.page} / ${pagination.totalPages} (કુલ ${pagination.total})`
                    : `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
