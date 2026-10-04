'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  Clock,
  Phone,
  BedDouble,
  User,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  BellOff,
  PlusCircle,
  Copy,
  Check,
  CreditCard,
  X,
  Calendar,
} from 'lucide-react';
import { useHotel } from './HotelContext';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { formatToIST } from '@/lib/time';

export interface OverdueStayItem {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelCity: string;
  hotelPhone: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestIdLast4: string;
  numberOfGuests: number;
  roomId: string;
  roomNumber: string;
  roomType: string;
  roomFloor?: string;
  checkInAt: string;
  expectedCheckOutAt: string;
  durationValue: number;
  durationUnit: string;
  amount?: number;
  paymentMode?: string;
  notes?: string;
  overdueMinutes: number;
  isCritical: boolean;
}

// Native audio synthesizer for alert chime (no external audio files needed)
function playAlertChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (523Hz - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (880Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.2);
    gain2.gain.setValueAtTime(0.3, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.6);
  } catch {
    // Autoplay restrictions may suppress audio on some browsers
  }
}

export function CheckOutAlertModal() {
  const { user, selectedHotelId } = useHotel();
  const { isGu } = useLanguage();
  const { showToast } = useToast();

  const [overdueList, setOverdueList] = useState<OverdueStayItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Quick Action Sub-panels inside modal
  const [activeTab, setActiveTab] = useState<'details' | 'checkout' | 'extend'>('details');

  // Quick Check-out state
  const [checkoutAmount, setCheckoutAmount] = useState<string>('');
  const [checkoutPaymentMode, setCheckoutPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  // Quick Extend state
  const [extendValue, setExtendValue] = useState<number>(1);
  const [extendUnit, setExtendUnit] = useState<'hours' | 'days'>('hours');
  const [extendNotes, setExtendNotes] = useState('');
  const [processingExtend, setProcessingExtend] = useState(false);

  const prevCriticalCountRef = useRef(0);

  // Initialize sound preference
  useEffect(() => {
    const saved = localStorage.getItem('atithi_sound_muted');
    if (saved === 'true') setSoundMuted(true);
  }, []);

  const toggleSound = () => {
    setSoundMuted((prev) => {
      const next = !prev;
      localStorage.setItem('atithi_sound_muted', String(next));
      if (!next) {
        playAlertChime();
      }
      return next;
    });
  };

  // Poll for overdue stays every 25 seconds
  const fetchOverdueStays = useCallback(async () => {
    if (!user) return;
    try {
      const hotelParam = selectedHotelId ? `?hotelId=${encodeURIComponent(selectedHotelId)}` : '';
      const res = await fetch(`/api/stays/overdue${hotelParam}`);
      if (!res.ok) return;

      const data = await res.json();
      const criticals: OverdueStayItem[] = data.criticalStays || [];
      setOverdueList(criticals);

      // Auto-open modal if there are critical overdue stays (10+ mins) and not currently snoozed
      if (criticals.length > 0) {
        const now = Date.now();
        const isSnoozed = snoozedUntil !== null && now < snoozedUntil;

        if (!isSnoozed) {
          // If modal is not open, open it
          setIsOpen((wasOpen) => {
            if (!wasOpen && !soundMuted) {
              playAlertChime();
            }
            return true;
          });
        }

        // If new critical stay appeared
        if (criticals.length > prevCriticalCountRef.current && !soundMuted) {
          playAlertChime();
        }
      } else {
        // No critical stays left
        setIsOpen(false);
      }

      prevCriticalCountRef.current = criticals.length;
    } catch {
      // Background poll silently fails
    }
  }, [user, selectedHotelId, snoozedUntil, soundMuted]);

  useEffect(() => {
    fetchOverdueStays();
    const interval = setInterval(fetchOverdueStays, 25000);
    return () => clearInterval(interval);
  }, [fetchOverdueStays]);

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= overdueList.length) {
      setCurrentIndex(Math.max(0, overdueList.length - 1));
    }
  }, [overdueList.length, currentIndex]);

  const currentStay = overdueList[currentIndex];

  // Sync quick checkout amount when stay changes
  useEffect(() => {
    if (currentStay) {
      setCheckoutAmount(currentStay.amount !== undefined ? String(currentStay.amount) : '');
      setCheckoutPaymentMode((currentStay.paymentMode as 'cash' | 'upi' | 'card') || 'cash');
      setCheckoutNotes('');
      setExtendNotes('');
    }
  }, [currentStay]);

  // Handle Snooze (5 minutes)
  const handleSnooze = () => {
    const snoozeTime = Date.now() + 5 * 60 * 1000;
    setSnoozedUntil(snoozeTime);
    setIsOpen(false);
    showToast(
      isGu
        ? 'ચેક-આઉટ એલર્ટ ૫ મિનિટ માટે સ્નૂઝ કરવામાં આવ્યું છે.'
        : 'Check-out alert snoozed for 5 minutes.',
      'info'
    );
  };

  // Handle Quick Check-out Confirm
  const handleQuickCheckout = async () => {
    if (!currentStay) return;
    setProcessingCheckout(true);

    try {
      const res = await fetch(`/api/stays/${currentStay.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: checkoutAmount ? Number(checkoutAmount) : undefined,
          paymentMode: checkoutPaymentMode,
          notes: checkoutNotes
            ? `Late Check-out Alert: ${checkoutNotes}`
            : 'Checked out via Overdue Alert',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Check-out failed');
      }

      showToast(
        isGu
          ? `રૂમ નં. ${currentStay.roomNumber} (${currentStay.guestName}) નું ચેક-આઉટ સફળતાપૂર્વક થઈ ગયું!`
          : `Room ${currentStay.roomNumber} (${currentStay.guestName}) checked out successfully!`,
        'success'
      );

      // Refresh list
      setActiveTab('details');
      await fetchOverdueStays();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error checking out';
      showToast(msg, 'error');
    } finally {
      setProcessingCheckout(false);
    }
  };

  // Handle Quick Extend
  const handleQuickExtend = async (customVal?: number, customUnit?: 'hours' | 'days') => {
    if (!currentStay) return;
    setProcessingExtend(true);

    const val = customVal || extendValue;
    const unit = customUnit || extendUnit;

    try {
      const res = await fetch(`/api/stays/${currentStay.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationValue: val,
          durationUnit: unit,
          notes: extendNotes || 'Extended via Overdue Alert',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Extension failed');
      }

      showToast(
        isGu
          ? `રૂમ નં. ${currentStay.roomNumber} નો સમય +${val} ${unit === 'hours' ? 'કલાક' : 'દિવસ'} લંબાવવામાં આવ્યો છે.`
          : `Room ${currentStay.roomNumber} extended by +${val} ${unit}.`,
        'success'
      );

      setActiveTab('details');
      await fetchOverdueStays();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error extending stay';
      showToast(msg, 'error');
    } finally {
      setProcessingExtend(false);
    }
  };

  const copyPhoneNumber = (phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    showToast(isGu ? 'મોબાઈલ નંબર કૉપી કર્યો!' : 'Phone number copied!', 'success');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Overdue readable time string
  const formatOverdueString = (minutes: number) => {
    if (minutes < 60) {
      return isGu ? `${minutes} મિનિટ મોડું` : `${minutes} mins overdue`;
    }
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    if (remMins === 0) {
      return isGu ? `${hours} કલાક મોડું` : `${hours} hrs overdue`;
    }
    return isGu
      ? `${hours} કલાક ${remMins} મિનિટ મોડું`
      : `${hours}h ${remMins}m overdue`;
  };

  return (
    <>
      {/* 1. FLOATING PERSISTENT BADGE (When modal is closed/snoozed but overdue stays exist) */}
      {!isOpen && overdueList.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 animate-bounce">
          <button
            type="button"
            onClick={() => {
              setSnoozedUntil(null);
              setIsOpen(true);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-full shadow-2xl shadow-red-600/50 border-2 border-white cursor-pointer transition"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span>
              {isGu
                ? `🚨 ${overdueList.length} રૂમ ચેક-આઉટ બાકી (૧૦+ મિ.)`
                : `🚨 ${overdueList.length} Overdue Check-out (10m+)`}
            </span>
            <span className="bg-red-800 text-[11px] px-2 py-0.5 rounded-full font-extrabold">
              {isGu ? 'જુઓ →' : 'View →'}
            </span>
          </button>
        </div>
      )}

      {/* 2. THE BIG MODAL ALERT (બહુ જ મોટો મેસેજ / પોપઅપ) */}
      {isOpen && currentStay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-red-500 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
            {/* Pulsing Top Header Strip */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 relative overflow-hidden">
              {/* Background alert pattern */}
              <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                <AlertTriangle className="w-36 h-36" />
              </div>

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 animate-pulse text-white shadow-inner">
                    <AlertTriangle className="w-7 h-7 text-yellow-300" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 text-[11px] font-black tracking-wider uppercase shadow-sm">
                      <span>{isGu ? '⚠️ તાત્કાલિક એલર્ટ' : '⚠️ Critical Alert'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        {isGu ? '૧૦ મિનિટથી વધુ મોડું' : '10+ Mins Overdue'}
                      </span>
                    </div>
                    <h2
                      id="alert-modal-title"
                      className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-tight tracking-tight"
                    >
                      {isGu
                        ? 'ચેક-આઉટનો સમય થઈ ગયો છે!'
                        : 'Check-out Time Exceeded!'}
                    </h2>
                    <p className="text-xs text-red-100 font-medium">
                      {isGu
                        ? 'મહેમાનનો નિર્ધારિત સમય પૂરો થઈ ગયો છે અને ૧૦ મિનિટ કરતાં વધુ વિલંબ થયો છે.'
                        : 'Guest has exceeded expected check-out by more than 10 minutes.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Sound mute/unmute button */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    title={soundMuted ? 'અવાજ ચાલુ કરો (Unmute)' : 'અવાજ બંધ કરો (Mute)'}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                  >
                    {soundMuted ? (
                      <VolumeX className="w-4 h-4 text-red-200" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-yellow-300" />
                    )}
                  </button>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Multi-overdue room pager */}
              {overdueList.length > 1 && (
                <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-xs text-red-100 font-semibold">
                  <span>
                    {isGu
                      ? `કુલ ${overdueList.length} રૂમ વિલંબમાં છે (રૂમ ${currentIndex + 1}/${overdueList.length})`
                      : `Total ${overdueList.length} overdue rooms (Room ${currentIndex + 1} of ${overdueList.length})`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => {
                        setCurrentIndex((prev) => Math.max(0, prev - 1));
                        setActiveTab('details');
                      }}
                      className="p-1 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentIndex === overdueList.length - 1}
                      onClick={() => {
                        setCurrentIndex((prev) => Math.min(overdueList.length - 1, prev + 1));
                        setActiveTab('details');
                      }}
                      className="p-1 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
              {/* BIG HIGHLIGHT CARD: Room & Overdue Time */}
              <div className="bg-white p-4 rounded-2xl border-2 border-red-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex flex-col items-center justify-center font-black">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-600">
                      {isGu ? 'રૂમ' : 'ROOM'}
                    </span>
                    <span className="text-xl sm:text-2xl leading-none">
                      {currentStay.roomNumber}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {currentStay.roomType || 'Standard Room'}
                      {currentStay.roomFloor
                        ? ` • ${currentStay.roomFloor.toLowerCase().includes('floor') ? currentStay.roomFloor : `${currentStay.roomFloor} Floor`}`
                        : ''}
                    </div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentStay.hotelName} ({currentStay.hotelCity})</span>
                    </div>
                  </div>
                </div>

                {/* Overdue Badge */}
                <div className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 flex flex-col items-start sm:items-end">
                  <span className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isGu ? 'વિલંબનો સમય' : 'Overdue By'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-red-700">
                    {formatOverdueString(currentStay.overdueMinutes)}
                  </span>
                </div>
              </div>

              {/* Tab Selector: Details / Direct Check-out / Extend */}
              <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'details'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isGu ? 'વિગત (Details)' : 'Guest Details'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('checkout')}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'checkout'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isGu ? 'ચેક-આઉટ (Out)' : 'Check-Out'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('extend')}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'extend'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isGu ? 'લંબાવો (Extend)' : 'Extend'}</span>
                </button>
              </div>

              {/* TAB 1: GUEST DETAILS & ONE-TOUCH CALL */}
              {activeTab === 'details' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isGu ? 'મહેમાનનું નામ' : 'Guest Name'}
                        </span>
                        <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{currentStay.guestName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {currentStay.numberOfGuests} {isGu ? 'મહેમાન' : 'guests'}
                          </span>
                        </div>
                      </div>

                      {currentStay.guestIdLast4 && (
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isGu ? 'આધાર કાર્ડ' : 'Aadhaar'}
                          </span>
                          <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            XXXX-XXXX-{currentStay.guestIdLast4}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PHONE & DIRECT CALL ACTION */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            {isGu ? 'મહેમાનનો મોબાઈલ નંબર' : 'Guest Phone'}
                          </div>
                          <div className="text-sm font-bold text-slate-900 font-mono">
                            {currentStay.guestPhone || 'No phone provided'}
                          </div>
                        </div>
                      </div>

                      {currentStay.guestPhone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyPhoneNumber(currentStay.guestPhone)}
                            title="Copy Phone"
                            className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                          >
                            {copiedPhone ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <a
                            href={`tel:${currentStay.guestPhone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{isGu ? 'કૉલ કરો' : 'Call'}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* STAY TIMELINE INFO */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          {isGu ? 'ચેક-ઇન સમય' : 'Checked In'}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatToIST(currentStay.checkInAt)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block mb-0.5">
                          {isGu ? 'ચેક-આઉટ સમય હતો' : 'Expected Check-Out'}
                        </span>
                        <span className="font-bold text-red-700">
                          {formatToIST(currentStay.expectedCheckOutAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK ACTION BUTTONS AT BOTTOM OF DETAILS TAB */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('checkout')}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isGu ? 'હમણાં જ ચેક-આઉટ કરો →' : 'Check-Out Now →'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('extend')}
                      className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{isGu ? 'સમય લંબાવો (+1 કલાક) →' : 'Extend Stay →'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECT CHECK-OUT INSIDE MODAL */}
              {activeTab === 'checkout' && (
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold">
                      {isGu
                        ? `રૂમ નં. ${currentStay.roomNumber} નું તાત્કાલિક ચેક-આઉટ કરો`
                        : `Instant Check-Out for Room ${currentStay.roomNumber}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isGu ? 'કુલ ભાડું / રકમ (₹)' : 'Final Tariff Amount (₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={checkoutAmount}
                        onChange={(e) => setCheckoutAmount(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isGu ? 'ચુકવણી મોડ' : 'Payment Mode'}
                      </label>
                      <select
                        aria-label="Payment Mode"
                        value={checkoutPaymentMode}
                        onChange={(e) =>
                          setCheckoutPaymentMode(e.target.value as 'cash' | 'upi' | 'card')
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      >
                        <option value="cash">{isGu ? 'રોકડ (Cash)' : 'Cash'}</option>
                        <option value="upi">{isGu ? 'UPI (Google Pay / PhonePe)' : 'UPI'}</option>
                        <option value="card">{isGu ? 'કાર્ડ (Card)' : 'Card'}</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isGu ? 'ચેક-આઉટ નોંધ / વિલંબનું કારણ' : 'Check-Out Remarks (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={checkoutNotes}
                        onChange={(e) => setCheckoutNotes(e.target.value)}
                        placeholder={
                          isGu
                            ? 'દા.ત. વધારાનો ચાર્જ લીધો / રૂમ કી જમા થઈ'
                            : 'e.g. Extra 30 mins charged, room key received'
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer"
                    >
                      {isGu ? 'પાછળ' : 'Back'}
                    </button>

                    <button
                      type="button"
                      disabled={processingCheckout}
                      onClick={handleQuickCheckout}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {processingCheckout
                          ? isGu
                            ? 'ચેક-આઉટ થઈ રહ્યું છે...'
                            : 'Checking out...'
                          : isGu
                          ? 'કન્ફર્મ ચેક-આઉટ કરો'
                          : 'Confirm Check-Out'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DIRECT EXTEND INSIDE MODAL */}
              {activeTab === 'extend' && (
                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-800">
                    <PlusCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-bold">
                      {isGu
                        ? `રૂમ નં. ${currentStay.roomNumber} નો સમયગાળો લંબાવો`
                        : `Extend Stay for Room ${currentStay.roomNumber}`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {isGu ? 'ત્વરિત સમય પસંદ કરો (Quick Extend)' : 'Quick Extend Options'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '+1 કલાક', en: '+1 Hr', val: 1, unit: 'hours' as const },
                        { label: '+2 કલાક', en: '+2 Hrs', val: 2, unit: 'hours' as const },
                        { label: '+4 કલાક', en: '+4 Hrs', val: 4, unit: 'hours' as const },
                        { label: '+1 દિવસ', en: '+1 Day', val: 1, unit: 'days' as const },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setExtendValue(item.val);
                            setExtendUnit(item.unit);
                            handleQuickExtend(item.val, item.unit);
                          }}
                          disabled={processingExtend}
                          className="py-2 px-1 text-center bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition cursor-pointer disabled:opacity-50"
                        >
                          {isGu ? item.label : item.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isGu ? 'કસ્ટમ સંખ્યા' : 'Value'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={extendValue}
                        onChange={(e) => setExtendValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isGu ? 'એકમ' : 'Unit'}
                      </label>
                      <select
                        aria-label="Extension Unit"
                        value={extendUnit}
                        onChange={(e) => setExtendUnit(e.target.value as 'hours' | 'days')}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      >
                        <option value="hours">{isGu ? 'કલાક (Hours)' : 'Hours'}</option>
                        <option value="days">{isGu ? 'દિવસ (Days)' : 'Days'}</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {isGu ? 'નોંધ (મરજિયાત)' : 'Note (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={extendNotes}
                        onChange={(e) => setExtendNotes(e.target.value)}
                        placeholder={
                          isGu
                            ? 'દા.ત. ટ્રેન મોડી પડી એટલે વધારાનું ભાડું લીધું'
                            : 'e.g. Flight delay stopover'
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer"
                    >
                      {isGu ? 'પાછળ' : 'Back'}
                    </button>

                    <button
                      type="button"
                      disabled={processingExtend}
                      onClick={() => handleQuickExtend()}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>
                        {processingExtend
                          ? isGu
                            ? 'લંબાવી રહ્યું છે...'
                            : 'Extending...'
                          : isGu
                          ? 'કન્ફર્મ લંબાવો'
                          : 'Confirm Extension'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Modal Footer: Snooze & Dismiss */}
            <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSnooze}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5 text-slate-500" />
                <span>{isGu ? '૫ મિનિટ પછી યાદ કરાવો' : 'Remind in 5 Mins'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                {isGu ? 'બંધ કરો' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
