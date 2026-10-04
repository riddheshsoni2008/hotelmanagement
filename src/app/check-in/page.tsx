'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  BedDouble,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  Lock,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';
import { ImageUploader } from '@/components/ImageUploader';
import { CompressedImageResult } from '@/lib/image-compressor';
import { calculateExpectedCheckOut, formatToIST, getLocalISTDateTimeInputValue } from '@/lib/time';

interface AvailableRoom {
  id: string;
  roomNumber: string;
  type: string;
  status: string;
  floor?: string;
  pricePerDay?: number;
}

export default function NewCheckInPage() {
  const router = useRouter();
  const { hotels, selectedHotelId, setSelectedHotelId, user } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const isOwner = user?.role === 'owner';

  // Wizard step (1: Guest info, 2: Aadhaar upload, 3: Room & Duration)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [hotelId, setHotelId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [idType, setIdType] = useState('Aadhaar');
  const [idLast4, setIdLast4] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState<number>(1);
  const [guestNotes, setGuestNotes] = useState('');

  // Returning guest lookup
  const [lookingUpPhone, setLookingUpPhone] = useState(false);
  const [returningGuestFound, setReturningGuestFound] = useState<string | null>(null);

  // Images state
  const [aadhaarFront, setAadhaarFront] = useState<CompressedImageResult | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<CompressedImageResult | null>(null);
  const [guestPhoto, setGuestPhoto] = useState<CompressedImageResult | null>(null);

  // Stay info
  const [roomId, setRoomId] = useState('');
  const [checkInAtLocal, setCheckInAtLocal] = useState<string>(getLocalISTDateTimeInputValue(new Date()));
  const [durationValue, setDurationValue] = useState<number>(2);
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | ''>('cash');
  const [stayNotes, setStayNotes] = useState('');

  // Available rooms for selected hotel
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Set default hotel
  useEffect(() => {
    if (selectedHotelId && selectedHotelId !== 'all') {
      setHotelId(selectedHotelId);
    } else if (hotels.length > 0) {
      setHotelId(hotels[0].id);
    }
  }, [selectedHotelId, hotels]);

  // Fetch available rooms whenever hotel changes
  useEffect(() => {
    if (!hotelId) return;

    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch(`/api/rooms?hotelId=${hotelId}&status=available`);
        if (res.ok) {
          const data = await res.json();
          setAvailableRooms(data.rooms || []);
          if (data.rooms && data.rooms.length > 0) {
            setRoomId(data.rooms[0].id);
          } else {
            setRoomId('');
          }
        }
      } catch {
        showToast(isGu ? 'રૂમ લોડ કરવામાં ભૂલ આવી' : 'Error loading rooms', 'error');
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [hotelId, showToast, isGu]);

  // Phone lookup for returning guests
  const handlePhoneLookup = async (phoneToSearch?: string) => {
    const q = phoneToSearch || phone;
    if (q.length < 10) return;

    setLookingUpPhone(true);
    setReturningGuestFound(null);

    try {
      const res = await fetch(`/api/guests/lookup?phone=${encodeURIComponent(q)}&hotelId=${hotelId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.guest) {
          const g = data.guest;
          setFullName(g.fullName || '');
          setEmail(g.email || '');
          setAddress(g.address || '');
          setCity(g.city || '');
          setIdLast4(g.idLast4 || '');
          setNumberOfGuests(g.numberOfGuests || 1);
          setGuestNotes(g.notes || '');

          const msg = isGu
            ? `જૂનો મહેમાન મળ્યો: ${g.fullName} (${g.totalStays} વખત રોકાણ કરેલ છે)`
            : `Returning guest found: ${g.fullName} (${g.totalStays} past stay${g.totalStays > 1 ? 's' : ''})`;
          setReturningGuestFound(msg);
          showToast(msg, 'success');
        }
      }
    } catch {
      // Non-blocking lookup
    } finally {
      setLookingUpPhone(false);
    }
  };

  // Live checkout calculation
  const calculatedExpectedCheckOut = useMemo(() => {
    try {
      const baseDate = new Date(checkInAtLocal);
      return calculateExpectedCheckOut(baseDate, durationValue, durationUnit);
    } catch {
      return new Date();
    }
  }, [checkInAtLocal, durationValue, durationUnit]);

  // Handle final submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hotelId) {
      showToast(isGu ? 'કૃપા કરીને હોટલ પસંદ કરો' : 'Please select a hotel', 'error');
      return;
    }
    if (!fullName.trim()) {
      showToast(isGu ? 'કૃપા કરીને મહેમાનનું નામ દાખલ કરો' : 'Please enter guest name', 'error');
      return;
    }
    if (phone.length < 10) {
      showToast(isGu ? 'કૃપા કરીને માન્ય ૧૦ આંકડાનો મોબાઈલ નંબર નાખો' : 'Please enter a valid 10-digit phone number', 'error');
      return;
    }
    if (!roomId) {
      showToast(isGu ? 'કૃપા કરીને રૂમ પસંદ કરો' : 'Please select a room', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const documentsPayload: Array<{
        kind: 'aadhaar_front' | 'aadhaar_back' | 'guest_photo';
        contentType: string;
        dataBase64: string;
        sizeBytes: number;
      }> = [];

      if (aadhaarFront) {
        documentsPayload.push({
          kind: 'aadhaar_front',
          contentType: aadhaarFront.contentType,
          dataBase64: aadhaarFront.base64Data,
          sizeBytes: aadhaarFront.sizeBytes,
        });
      }

      if (aadhaarBack) {
        documentsPayload.push({
          kind: 'aadhaar_back',
          contentType: aadhaarBack.contentType,
          dataBase64: aadhaarBack.base64Data,
          sizeBytes: aadhaarBack.sizeBytes,
        });
      }

      if (guestPhoto) {
        documentsPayload.push({
          kind: 'guest_photo',
          contentType: guestPhoto.contentType,
          dataBase64: guestPhoto.base64Data,
          sizeBytes: guestPhoto.sizeBytes,
        });
      }

      const payload = {
        hotelId,
        roomId,
        checkInAt: new Date(checkInAtLocal).toISOString(),
        durationValue,
        durationUnit,
        amount: amount ? parseFloat(amount) : undefined,
        paymentMode: paymentMode || undefined,
        notes: stayNotes || guestNotes || undefined,

        // Guest info
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        idType,
        idLast4: idLast4 ? idLast4.trim() : undefined,
        numberOfGuests: Number(numberOfGuests) || 1,

        documents: documentsPayload,
      };

      const res = await fetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; stayId?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Fallback for non-JSON responses
      }

      if (!res.ok) {
        showToast(data.error || (isGu ? 'ચેક-ઇન નિષ્ફળ ગયું' : 'Failed to complete check-in'), 'error');
        return;
      }

      showToast(isGu ? 'મહેમાનનું ચેક-ઇન સફળતાપૂર્વક થઈ ગયું!' : 'Guest checked in successfully!', 'success');
      router.push(`/stays/${data.stayId}`);
    } catch (err: unknown) {
      console.error('Check-in error:', err);
      const msg = err instanceof Error ? err.message : '';
      showToast(msg || (isGu ? 'ચેક-ઇન સબમિટ કરવામાં ભૂલ આવી' : 'Error submitting check-in'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoomObj = availableRooms.find((r) => r.id === roomId);
  const currentAssignedHotel = !isOwner && hotels.length === 1 ? hotels[0] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>{isGu ? 'ઝડપી મહેમાન નોંધણી' : 'Fast Guest Registration'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'નવો મહેમાન ચેક-ઇન (New Check-in)' : 'New Guest Check-in'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isGu
              ? 'મહેમાન વિગતો, આધાર કાર્ડ ફોટો, રૂમ ફાળવણી અને રોકાણનો સમયગાળો દાખલ કરો.'
              : 'Register guest, compress & verify Aadhaar photo, allocate room, and set hourly/daily stay duration.'}
          </p>
        </div>

        {/* Hotel Indicator: Locked for Staff, Dropdown for Owner */}
        {currentAssignedHotel ? (
          <div className="flex items-center gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shrink-0">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-700" />
                <span>{isGu ? 'તમારી હોટલ શાખા' : 'Assigned Property'}</span>
              </div>
              <div className="font-bold text-emerald-950">
                {currentAssignedHotel.name} ({currentAssignedHotel.city})
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="text-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">
                {isGu ? 'હોટલ પસંદ કરો' : 'Select Hotel'}
              </div>
              <select
                aria-label="Select Hotel for Check-in"
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2 text-xs sm:text-sm"
              >
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            currentStep === 1
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
          <span className="hidden sm:inline">{isGu ? '૧. મહેમાન વિગત' : 'Guest Details'}</span>
          <span className="sm:hidden">{isGu ? 'મહેમાન' : 'Guest'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            currentStep === 2
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
          <span className="hidden sm:inline">{isGu ? '૨. આધાર કાર્ડ' : 'Aadhaar Photos'}</span>
          <span className="sm:hidden">{isGu ? 'આધાર' : 'Aadhaar'}</span>
          {(aadhaarFront || aadhaarBack) && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            currentStep === 3
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</span>
          <span className="hidden sm:inline">{isGu ? '૩. રૂમ & સમય' : 'Room & Duration'}</span>
          <span className="sm:hidden">{isGu ? 'રૂમ' : 'Room'}</span>
        </button>
      </div>

      <form onSubmit={handleFinalSubmit} className="space-y-6">
        {/* STEP 1: GUEST DETAILS */}
        {currentStep === 1 && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>{isGu ? 'પગલું ૧: મહેમાનની માહિતી (Guest Details)' : 'Step 1: Guest Information'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isGu
                  ? 'મોબાઈલ નંબર નાખતા જ જો મહેમાન પહેલા રોકાયા હશે તો તેમની વિગત આપોઆપ આવી જશે.'
                  : 'Type mobile number to automatically search returning guest records.'}
              </p>
            </div>

            {/* Phone Lookup Banner */}
            {returningGuestFound && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800 font-medium">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{returningGuestFound}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone with Auto-Lookup */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'મોબાઈલ નંબર (Mobile Number)' : 'Mobile Number'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (val.length === 10) {
                        handlePhoneLookup(val);
                      }
                    }}
                    className="w-full pl-9 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={lookingUpPhone || phone.length < 10}
                    onClick={() => handlePhoneLookup()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {lookingUpPhone ? (isGu ? 'શોધે છે...' : 'Searching...') : (isGu ? 'શોધો' : 'Lookup')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isGu ? '૧૦ આંકડાનો મોબાઈલ નંબર' : '10-digit Indian phone number'}
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'મહેમાનનું પૂરું નામ (Full Name)' : 'Guest Full Name'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={isGu ? 'દા.ત. રમેશભાઈ પટેલ' : 'e.g. Ramesh Kumar'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Number of Guests */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'કુલ વ્યક્તિઓ / મહેમાનો (Total Guests)' : 'Total Guests'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Aadhaar Last 4 Digits Only (Privacy compliant) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'આધાર કાર્ડ છેલ્લા ૪ આંકડા (Aadhaar Last 4)' : 'Aadhaar Last 4 Digits'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4192"
                    value={idLast4}
                    onChange={(e) => setIdLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isGu ? 'સુરક્ષા માટે ફક્ત છેલ્લા ૪ આંકડા જ નોંધવા' : 'Only last 4 digits for privacy & security'}
                </p>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'ઈમેઈલ (Email - મરજિયાત)' : 'Email (Optional)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* City (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'શહેર / ગામ (City - મરજિયાત)' : 'Origin City (Optional)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder={isGu ? 'દા.ત. સુરત, અમદાવાદ, રાજકોટ' : 'e.g. Jaipur, Lucknow, Mumbai'}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Full Address (Optional) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'કાયમી સરનામું (Permanent Address - મરજિયાત)' : 'Permanent Address (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isGu ? 'શેરી, ગામ/વિસ્તાર, સીમાચિહ્ન' : 'Street, locality, landmarks'}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!fullName.trim() || phone.length < 10) {
                    showToast(isGu ? 'કૃપા કરીને નામ અને ૧૦ આંકડાનો મોબાઈલ નંબર નાખો' : 'Please enter guest name and valid 10-digit mobile number', 'error');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <span>{isGu ? 'આધાર કાર્ડ ફોટો અપલોડ પર જાઓ →' : 'Continue to Aadhaar Upload →'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AADHAAR CARD UPLOAD */}
        {currentStep === 2 && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{isGu ? 'પગલું ૨: આધાર કાર્ડ ફોટો (Aadhaar Photos)' : 'Step 2: Aadhaar Card Photos'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isGu
                    ? 'કેમેરા અથવા ગેલેરીમાંથી ફોટો લો. સિસ્ટમ આપોઆપ ફોટો ૪૦ KB થી નાનો કરી દેશે જેથી સ્ટોરેજ બચે.'
                    : 'Takes camera capture or gallery image. Auto-compressed by browser canvas to <= 40KB.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Aadhaar Front */}
              <ImageUploader
                label={isGu ? 'આધાર કાર્ડ આગળનો ફોટો (Front)' : 'Aadhaar Card Front Photo'}
                kind="aadhaar_front"
                value={aadhaarFront}
                onChange={setAadhaarFront}
                required
                helpText={isGu ? 'ફોટો અને નામ સ્પષ્ટ દેખાવું જોઈએ' : 'Clear front view showing photo & name'}
              />

              {/* Aadhaar Back */}
              <ImageUploader
                label={isGu ? 'આધાર કાર્ડ પાછળનો ફોટો (Back)' : 'Aadhaar Card Back Photo'}
                kind="aadhaar_back"
                value={aadhaarBack}
                onChange={setAadhaarBack}
                helpText={isGu ? 'સરનામું અને બારકોડ દેખાતો ફોટો' : 'Back view showing address & barcode'}
              />

              {/* Optional Guest Photo */}
              <div className="sm:col-span-2">
                <ImageUploader
                  label={isGu ? 'મહેમાનનો લાઈવ ફોટો / સેલ્ફી (મરજિયાત)' : 'Guest Live Photo (Optional)'}
                  kind="guest_photo"
                  value={guestPhoto}
                  onChange={setGuestPhoto}
                  helpText={isGu ? 'ચેક-ઇન સમયે મહેમાનનો કેમેરાથી પાડેલો ફોટો' : 'Optional live camera photo of the guest'}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isGu ? 'પાછળ' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <span>{isGu ? 'રૂમ પસંદગી પર જાઓ →' : 'Continue to Room →'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ROOM SELECTION & DURATION */}
        {currentStep === 3 && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-blue-600" />
                <span>{isGu ? 'પગલું ૩: રૂમ અને રોકાણનો સમયગાળો (Room & Duration)' : 'Step 3: Room Allocation & Stay Duration'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isGu
                  ? 'કલાક દીઠ અથવા દિવસ દીઠ બુકિંગ પસંદ કરો. ચેક-આઉટનો સમય આપોઆપ ગણાઈ જશે.'
                  : 'Hourly and daily bookings with live automated check-out calculation.'}
              </p>
            </div>

            {/* Room Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {isGu ? 'ખાલી ઉપલબ્ધ રૂમ પસંદ કરો' : 'Select Available Room'} <span className="text-red-500">*</span>
              </label>

              {loadingRooms ? (
                <div className="text-xs text-slate-500 py-3">{isGu ? 'રૂમ લોડ થઈ રહ્યા છે...' : 'Loading available rooms...'}</div>
              ) : availableRooms.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                  {isGu
                    ? 'આ હોટલમાં હાલ કોઈ રૂમ ખાલી નથી. કૃપા કરીને કોઈ જૂનો સ્ટે ચેક-આઉટ કરો અથવા રૂમ મેનેજમેન્ટ તપાસો.'
                    : 'No rooms are currently marked available in this hotel. Please checkout an existing stay or check Room Management.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {availableRooms.map((room) => {
                    const isSelected = room.id === roomId;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setRoomId(room.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-700 border-blue-700 text-white shadow-md shadow-blue-700/25 scale-[1.02]'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-base leading-tight">
                            {isGu ? 'રૂમ' : 'Room'} {room.roomNumber}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isGu ? 'ખાલી' : 'Available'}
                          </span>
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {room.type}
                        </div>
                        {room.pricePerDay && (
                          <div className={`text-[11px] font-semibold mt-1 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                            ₹{room.pricePerDay} / {isGu ? 'દિવસ' : 'day'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Check-in Time & Duration Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Check-In Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'ચેક-ઇન તારીખ & સમય (IST)' : 'Check-In Date & Time (IST)'}
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={checkInAtLocal}
                    onChange={(e) => setCheckInAtLocal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isGu ? 'હાલનો સમય આપોઆપ આવે છે; જૂનો સમય પણ બદલી શકો છો' : 'Defaults to current time; can be back-dated'}
                </p>
              </div>

              {/* Duration Custom Input & Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'રોકાણનો સમય (Duration)' : 'Duration Booked'} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationValue}
                    onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <div className="flex rounded-xl bg-slate-100 p-1 flex-1">
                    <button
                      type="button"
                      onClick={() => setDurationUnit('hours')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        durationUnit === 'hours'
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isGu ? 'કલાક (Hours)' : 'Hours'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationUnit('days')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        durationUnit === 'days'
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isGu ? 'દિવસ (Days)' : 'Days'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick-Pick Duration Chips */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {isGu ? 'ઝડપી સમય પસંદગી (Quick Select):' : 'Quick-Pick Duration Chips:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: isGu ? '૧ કલાક' : '1 hour', val: 1, unit: 'hours' },
                  { label: isGu ? '૨ કલાક' : '2 hours', val: 2, unit: 'hours' },
                  { label: isGu ? '૩ કલાક' : '3 hours', val: 3, unit: 'hours' },
                  { label: isGu ? '૬ કલાક' : '6 hours', val: 6, unit: 'hours' },
                  { label: isGu ? '૧૨ કલાક' : '12 hours', val: 12, unit: 'hours' },
                  { label: isGu ? '૨૪ કલાક' : '24 hours', val: 24, unit: 'hours' },
                  { label: isGu ? '૧ દિવસ' : '1 day', val: 1, unit: 'days' },
                  { label: isGu ? '૨ દિવસ' : '2 days', val: 2, unit: 'days' },
                  { label: isGu ? '૩ દિવસ' : '3 days', val: 3, unit: 'days' },
                  { label: isGu ? '૫ દિવસ' : '5 days', val: 5, unit: 'days' },
                  { label: isGu ? '૭ દિવસ' : '7 days', val: 7, unit: 'days' },
                ].map((chip) => {
                  const isSelected = durationValue === chip.val && durationUnit === chip.unit;
                  return (
                    <button
                      key={`${chip.val}-${chip.unit}`}
                      type="button"
                      onClick={() => {
                        setDurationValue(chip.val);
                        setDurationUnit(chip.unit as 'hours' | 'days');
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-700 border-blue-700 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE COMPUTED TIMELINE BANNER */}
            <div className="p-3.5 sm:p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                {isGu ? 'લાઈવ રોકાણ ગણતરી (Stay Calculation)' : 'Live Stay Calculation Summary'}
              </div>
              <div className="text-xs sm:text-base font-bold text-slate-900 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>{isGu ? 'ચેક-ઇન:' : 'Check-in:'} {formatToIST(checkInAtLocal)}</span>
                <span className="text-blue-500 font-bold">→</span>
                <span className="text-blue-900">
                  {isGu ? 'અંદાજિત વિદાય:' : 'Expected Check-out:'} {formatToIST(calculatedExpectedCheckOut)}
                </span>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  {durationValue} {isGu ? (durationUnit === 'hours' ? 'કલાક' : 'દિવસ') : durationUnit}
                </span>
              </div>
            </div>

            {/* Amount and Payment mode (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'રૂમ ભાડું / રકમ (₹)' : 'Amount / Tariff (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'ચુકવણીનો પ્રકાર (Payment Mode)' : 'Payment Mode'}
                </label>
                <select
                  aria-label="Payment Mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as 'cash' | 'upi' | 'card')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="cash">{isGu ? 'રોકડ (Cash)' : 'Cash'}</option>
                  <option value="upi">{isGu ? 'UPI (Google Pay / PhonePe)' : 'UPI (GPay / PhonePe / Paytm)'}</option>
                  <option value="card">{isGu ? 'કાર્ડ (Debit / Credit)' : 'Card (Debit / Credit)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isGu ? 'ખાસ નોંધ (Notes - મરજિયાત)' : 'Notes / Instructions'}
                </label>
                <input
                  type="text"
                  placeholder={isGu ? 'દા.ત. વધારાનું ગાદલું આપ્યું' : 'Extra bed, late check-in note, etc.'}
                  value={stayNotes}
                  onChange={(e) => setStayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Final Submission Bar */}
            <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isGu ? 'પાછળ' : 'Back'}</span>
              </button>

              <button
                type="submit"
                disabled={submitting || !roomId}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">
                  {submitting
                    ? isGu
                      ? 'ચેક-ઇન થઈ રહ્યું છે...'
                      : 'Registering...'
                    : isGu
                    ? 'ચેક-ઇન કન્ફર્મ કરો'
                    : 'Complete Check-in'}
                </span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
