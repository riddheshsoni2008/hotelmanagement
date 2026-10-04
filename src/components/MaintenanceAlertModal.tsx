'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Sparkles,
  BedDouble,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useHotel } from './HotelContext';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';

interface CompletedMaintenanceRoom {
  id: string;
  hotelId: string;
  hotelName: string;
  roomNumber: string;
  type: string;
  floor?: string;
  pricePerDay?: number;
  maintenanceReason?: string;
  overdueMinutes: number;
}

// Gentle pleasant chime synthesizer
function playCompletionChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Two pleasant ascending notes (C5 -> G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
    gain2.gain.setValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch {
    // Audio context may be restricted by browser policy
  }
}

export function MaintenanceAlertModal() {
  const { user, selectedHotelId } = useHotel();
  const { isGu } = useLanguage();
  const { showToast } = useToast();

  const [completedRooms, setCompletedRooms] = useState<CompletedMaintenanceRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Snooze tracking so we don't spam if dismissed
  const snoozedUntilRef = useRef<number>(0);

  const fetchMaintenanceStatus = useCallback(async () => {
    if (!user) return;
    if (Date.now() < snoozedUntilRef.current) return;

    try {
      const params = new URLSearchParams();
      if (selectedHotelId && selectedHotelId !== 'all') {
        params.set('hotelId', selectedHotelId);
      }

      const res = await fetch(`/api/rooms/maintenance?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      const completed: CompletedMaintenanceRoom[] = data.completedRooms || [];

      if (completed.length > 0) {
        setCompletedRooms(completed);
        // Pre-select all completed rooms for immediate 1-click release
        setSelectedRoomIds(new Set(completed.map((r) => r.id)));
        setIsOpen(true);

        if (soundEnabled) {
          playCompletionChime();
        }
      } else {
        setCompletedRooms([]);
        setIsOpen(false);
      }
    } catch {
      // Quiet fail on network hiccups
    }
  }, [user, selectedHotelId, soundEnabled]);

  // Polling check every 15 seconds
  useEffect(() => {
    fetchMaintenanceStatus();
    const interval = setInterval(fetchMaintenanceStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchMaintenanceStatus]);

  // Toggle selection for a room
  const toggleSelectRoom = (id: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedRoomIds.size === completedRooms.length) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(completedRooms.map((r) => r.id)));
    }
  };

  // Handle Release to Available (Yes Button)
  const handleMarkAvailable = async () => {
    const ids = Array.from(selectedRoomIds);
    if (ids.length === 0) {
      showToast(isGu ? 'કૃપા કરીને ઓછામાં ઓછો એક રૂમ પસંદ કરો' : 'Please select at least one room', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomIds: ids }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update rooms', 'error');
        return;
      }

      const roomListStr = data.roomNumbers?.join(', ') || 'Rooms';
      showToast(
        isGu
          ? `🎉 રૂમ ${roomListStr} હવે મહેમાનો માટે ખાલી (Available) થઈ ગયા છે!`
          : `🎉 Room(s) ${roomListStr} are now Available!`,
        'success'
      );

      setIsOpen(false);
      fetchMaintenanceStatus();

      // Trigger custom event so rooms page refreshes instantly
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rooms-updated'));
      }
    } catch {
      showToast(isGu ? 'રૂમ અપડેટ કરવામાં એરર આવી' : 'Error updating rooms', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Snooze alert for 2 minutes
  const handleSnooze = () => {
    snoozedUntilRef.current = Date.now() + 2 * 60 * 1000;
    setIsOpen(false);
    showToast(isGu ? 'એલર્ટ ૨ મિનિટ માટે સ્નૂઝ કરાયું' : 'Alert snoozed for 2 minutes', 'info');
  };

  if (!isOpen || completedRooms.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[99990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-900 border border-slate-750 text-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge & Close */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>{isGu ? 'સમારકામ પૂરું થયું' : 'Maintenance Completed'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {isGu ? 'રૂમ ખાલી કરવા માટે તૈયાર છે!' : 'Rooms Ready for Guests!'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              aria-label="Close"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Explanatory Banner */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200 space-y-1">
          <p className="font-semibold text-emerald-100 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isGu
                ? `કુલ ${completedRooms.length} રૂમનો સમારકામ સમય પૂરો થઈ ગયો છે.`
                : `${completedRooms.length} room(s) have finished their maintenance duration.`}
            </span>
          </p>
          <p className="text-[11px] text-emerald-300/80">
            {isGu
              ? 'શું તમે આ રૂમોને મહેમાનોના નવા ચેક-ઇન માટે ખાલી (Available) કરવા માંગો છો?'
              : 'Would you like to release these rooms and mark them Available for check-in?'}
          </p>
        </div>

        {/* Room Selection List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span>{isGu ? 'રૂમ પસંદ કરો:' : 'Select rooms:'}</span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              {selectedRoomIds.size === completedRooms.length
                ? (isGu ? 'બધા અનચેક કરો' : 'Deselect All')
                : (isGu ? 'બધા પસંદ કરો' : 'Select All')}
            </button>
          </div>

          {completedRooms.map((room) => {
            const isSelected = selectedRoomIds.has(room.id);
            return (
              <div
                key={room.id}
                onClick={() => toggleSelectRoom(room.id)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-900/20 border-emerald-500/50 shadow-inner'
                    : 'bg-slate-800/40 border-slate-750 hover:bg-slate-800/80 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent onClick
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer shrink-0 accent-emerald-500"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-base">
                        Room {room.roomNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {isGu ? 'તૈયાર' : 'Ready'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {room.type} {room.floor && `• ${room.floor}`}
                    </div>
                    {room.maintenanceReason && (
                      <div className="text-[10px] text-amber-300 font-medium mt-0.5 truncate">
                        🔧 {room.maintenanceReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-300">
                    {room.pricePerDay ? `₹${room.pricePerDay}` : ''}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {room.hotelName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleSnooze}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
          >
            {isGu ? 'પછી કરીશું (Snooze 2m)' : 'Remind Later'}
          </button>

          <button
            type="button"
            disabled={submitting || selectedRoomIds.size === 0}
            onClick={handleMarkAvailable}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting
                ? (isGu ? 'ખાલી થઈ રહ્યા છે...' : 'Updating...')
                : isGu
                ? `હા, પસંદ કરેલ (${selectedRoomIds.size}) રૂમ ખાલી જાહેર કરો`
                : `Yes, Mark (${selectedRoomIds.size}) Room(s) Available`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
