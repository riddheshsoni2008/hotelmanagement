'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  BedDouble,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Eye,
  LogOut,
  RefreshCw,
  Edit3,
  Trash2,
  Upload,
  History,
  ShieldCheck,
  ZoomIn,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ImageUploader } from '@/components/ImageUploader';
import { formatToIST, formatDateIST, formatTimeIST, getStayStatusAndCountdown } from '@/lib/time';

interface StayDetailData {
  stay: {
    id: string;
    hotelId: string;
    hotel: { name: string; city: string; address: string; phone: string };
    guestId: string;
    guest: {
      fullName: string;
      phone: string;
      email?: string;
      address?: string;
      city?: string;
      idType: string;
      idLast4?: string;
      numberOfGuests: number;
      notes?: string;
    };
    roomId: string;
    room: { roomNumber: string; type: string; floor?: string; pricePerDay?: number };
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
  };
  documents: Array<{
    id: string;
    kind: 'aadhaar_front' | 'aadhaar_back' | 'guest_photo';
    contentType: string;
    sizeBytes: number;
    url: string;
    createdAt: string;
  }>;
  pastStays: Array<{
    id: string;
    hotelName: string;
    roomNumber: string;
    roomType: string;
    checkInAt: string;
    expectedCheckOutAt: string;
    actualCheckOutAt?: string;
    durationValue: number;
    durationUnit: string;
    status: 'checked_in' | 'checked_out';
  }>;
}

export default function StayDetailPage() {
  const params = useParams();
  const stayId = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [data, setData] = useState<StayDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Check-out dialog
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Extend stay modal
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendValue, setExtendValue] = useState<number>(2);
  const [extendUnit, setExtendUnit] = useState<'hours' | 'days'>('hours');
  const [extendNotes, setExtendNotes] = useState('');
  const [extending, setExtending] = useState(false);

  // Edit details modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIdLast4, setEditIdLast4] = useState('');
  const [editNumberOfGuests, setEditNumberOfGuests] = useState(1);
  const [editStayNotes, setEditStayNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Upload/Replace document modal
  const [uploadDocKind, setUploadDocKind] = useState<'aadhaar_front' | 'aadhaar_back' | 'guest_photo' | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const fetchStayDetail = useCallback(async () => {
    if (!stayId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/stays/${stayId}`);
      if (!res.ok) {
        showToast(isGu ? 'રોકાણ રેકોર્ડ મળ્યો નથી' : 'Stay record not found or access denied', 'error');
        router.push('/stays');
        return;
      }
      const json = await res.json();
      setData(json);

      // Pre-fill edit modal values
      if (json.stay?.guest) {
        setEditFullName(json.stay.guest.fullName || '');
        setEditPhone(json.stay.guest.phone || '');
        setEditEmail(json.stay.guest.email || '');
        setEditCity(json.stay.guest.city || '');
        setEditAddress(json.stay.guest.address || '');
        setEditIdLast4(json.stay.guest.idLast4 || '');
        setEditNumberOfGuests(json.stay.guest.numberOfGuests || 1);
      }
      if (json.stay) {
        setEditStayNotes(json.stay.notes || '');
      }
    } catch {
      showToast(isGu ? 'વિગત લોડ કરવામાં ભૂલ આવી' : 'Error loading stay details', 'error');
    } finally {
      setLoading(false);
    }
  }, [stayId, router, showToast, isGu]);

  useEffect(() => {
    fetchStayDetail();
  }, [fetchStayDetail]);

  // Check-out handler
  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/stays/${stayId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const resData = await res.json();
      if (!res.ok) {
        showToast(resData.error || 'Check-out failed', 'error');
        return;
      }

      showToast(`Checked out successfully! (${resData.timingDescription})`, 'success');
      setShowCheckoutDialog(false);
      fetchStayDetail();
    } catch {
      showToast('Error executing checkout', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  // Extend stay handler
  const handleExtendStay = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtending(true);
    try {
      const res = await fetch(`/api/stays/${stayId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationValue: extendValue,
          durationUnit: extendUnit,
          notes: extendNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        showToast(resData.error || 'Extension failed', 'error');
        return;
      }

      showToast(`Stay successfully extended by ${extendValue} ${extendUnit}`, 'success');
      setShowExtendModal(false);
      setExtendNotes('');
      fetchStayDetail();
    } catch {
      showToast('Error extending stay', 'error');
    } finally {
      setExtending(false);
    }
  };

  // Edit guest details handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSavingEdit(true);

    try {
      // 1. Update guest
      const guestRes = await fetch(`/api/guests/${data.stay.guestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName,
          phone: editPhone,
          email: editEmail,
          city: editCity,
          address: editAddress,
          idLast4: editIdLast4,
          numberOfGuests: editNumberOfGuests,
        }),
      });

      // 2. Update stay notes
      const stayRes = await fetch(`/api/stays/${stayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editStayNotes }),
      });

      if (guestRes.ok && stayRes.ok) {
        showToast('Guest details updated successfully', 'success');
        setShowEditModal(false);
        fetchStayDetail();
      } else {
        showToast('Failed to update some fields', 'error');
      }
    } catch {
      showToast('Error updating details', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete document handler
  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Document deleted successfully', 'success');
        setDeleteDocId(null);
        fetchStayDetail();
      } else {
        showToast('Failed to delete document', 'error');
      }
    } catch {
      showToast('Error deleting document', 'error');
    }
  };

  // Upload/Replace document directly
  const handleUploadNewDocument = async (
    kind: 'aadhaar_front' | 'aadhaar_back' | 'guest_photo',
    result: import('@/lib/image-compressor').CompressedImageResult | null
  ) => {
    if (!result || !data) return;

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: data.stay.guestId,
          kind,
          contentType: result.contentType,
          dataBase64: result.base64Data,
        }),
      });

      if (res.ok) {
        showToast('Document updated successfully', 'success');
        setUploadDocKind(null);
        fetchStayDetail();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to upload document', 'error');
      }
    } catch {
      showToast('Error uploading document', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="text-sm font-medium">Loading stay records and Aadhaar photos...</p>
      </div>
    );
  }

  if (!data) return null;

  const { stay, documents, pastStays } = data;
  const countdown = getStayStatusAndCountdown(
    stay.status,
    stay.expectedCheckOutAt,
    stay.actualCheckOutAt
  );

  const aadhaarFrontDoc = documents.find((d) => d.kind === 'aadhaar_front');
  const aadhaarBackDoc = documents.find((d) => d.kind === 'aadhaar_back');
  const guestPhotoDoc = documents.find((d) => d.kind === 'guest_photo');

  return (
    <div className="space-y-5">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/stays"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isGu ? '← પાછા જાઓ (રોકાણ યાદી)' : 'Back to Stays Directory'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <StatusBadge
            status={countdown.statusBadge}
            countdownText={countdown.text}
            isOverstay={countdown.isOverstay}
          />
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>{stay.hotel.name} ({stay.hotel.city})</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
            <span>{stay.guest.fullName}</span>
            <span className="text-slate-400 font-normal">&bull;</span>
            <span className="text-blue-700 font-extrabold">Room {stay.room.roomNumber}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {stay.room.type} &bull; {stay.guest.numberOfGuests} {isGu ? 'મહેમાન' : `Guest${stay.guest.numberOfGuests > 1 ? 's' : ''}`} &bull; ID: {stay.id.slice(-6).toUpperCase()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isGu ? 'વિગત બદલો' : 'Edit Details'}</span>
          </button>

          {stay.status === 'checked_in' && (
            <>
              <button
                type="button"
                onClick={() => setShowExtendModal(true)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isGu ? 'સમય લંબાવો' : 'Extend Stay'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCheckoutDialog(true)}
                className="col-span-2 sm:col-span-1 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isGu ? 'ચેક-આઉટ કરો (Check-out)' : 'Check-out Now'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SIDE-BY-SIDE MAIN GRID (Core Requirement 1 & 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Guest Details, Stay Timeline, Previous History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Guest Personal Information */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>{isGu ? 'મહેમાનની વિગતો (Guest Details)' : 'Guest Details'}</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{isGu ? 'વેરિફાઈડ' : 'Verified'}</span>
              </span>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50 gap-2">
                <span className="text-slate-500 font-medium">{isGu ? 'પૂરું નામ (Name)' : 'Full Name'}</span>
                <span className="font-bold text-slate-900 text-right">{stay.guest.fullName}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50 gap-2">
                <span className="text-slate-500 font-medium">{isGu ? 'મોબાઈલ નંબર' : 'Mobile Number'}</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{stay.guest.phone}</span>
                </span>
              </div>

              {stay.guest.idLast4 && (
                <div className="flex justify-between py-1 border-b border-slate-50 gap-2">
                  <span className="text-slate-500 font-medium">{isGu ? 'આધાર છેલ્લા ૪' : 'Aadhaar Last 4'}</span>
                  <span className="font-mono font-bold text-slate-900 tracking-wider">
                    •••• •••• {stay.guest.idLast4}
                  </span>
                </div>
              )}

              {stay.guest.email && (
                <div className="flex justify-between py-1 border-b border-slate-50 gap-2">
                  <span className="text-slate-500 font-medium">{isGu ? 'ઈમેઈલ' : 'Email'}</span>
                  <span className="text-slate-800 truncate">{stay.guest.email}</span>
                </div>
              )}

              {stay.guest.city && (
                <div className="flex justify-between py-1 border-b border-slate-50 gap-2">
                  <span className="text-slate-500 font-medium">{isGu ? 'મૂળ શહેર' : 'Origin City'}</span>
                  <span className="text-slate-800">{stay.guest.city}</span>
                </div>
              )}

              {stay.guest.address && (
                <div className="flex justify-between py-1 border-b border-slate-50 gap-2">
                  <span className="text-slate-500 font-medium">{isGu ? 'કાયમી સરનામું' : 'Permanent Address'}</span>
                  <span className="text-slate-800 text-right max-w-[200px]">{stay.guest.address}</span>
                </div>
              )}

              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 font-medium">{isGu ? 'મહેમાનોની સંખ્યા' : 'Number of Guests'}</span>
                <span className="font-semibold text-slate-900">{stay.guest.numberOfGuests}</span>
              </div>
            </div>
          </div>

          {/* Stay Timeline & Booking Info */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{isGu ? 'રોકાણ સમયરેખા (Stay Timeline IST)' : 'Stay Timeline (IST)'}</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {/* Check In */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-slate-500 font-medium block">{isGu ? 'ચેક-ઇન સમય' : 'Check-in'}</span>
                  <span className="text-slate-400 text-[11px]">{formatDateIST(stay.checkInAt)}</span>
                </div>
                <span className="font-bold text-slate-900">{formatTimeIST(stay.checkInAt)}</span>
              </div>

              {/* Booked Duration */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">{isGu ? 'રોકાણ ગાળો' : 'Booked Duration'}</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                  {stay.durationValue} {stay.durationUnit === 'hours' ? (isGu ? 'કલાક' : 'hours') : (isGu ? 'દિવસ' : 'days')}
                </span>
              </div>

              {/* Expected Check-Out */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-slate-500 font-medium block">{isGu ? 'વિદાય સમય (અપેક્ષિત)' : 'Expected Check-out'}</span>
                  <span className="text-slate-400 text-[11px]">{formatDateIST(stay.expectedCheckOutAt)}</span>
                </div>
                <span className="font-bold text-slate-900">{formatTimeIST(stay.expectedCheckOutAt)}</span>
              </div>

              {/* Actual Check-out (if checked out) */}
              {stay.actualCheckOutAt && (
                <div className="flex items-start justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 gap-2">
                  <div>
                    <span className="text-slate-600 font-semibold block">{isGu ? 'વાસ્તવિક ચેક-આઉટ' : 'Actual Check-out'}</span>
                    <span className="text-slate-400 text-[11px]">{formatDateIST(stay.actualCheckOutAt)}</span>
                  </div>
                  <span className="font-bold text-emerald-700">{formatTimeIST(stay.actualCheckOutAt)}</span>
                </div>
              )}

              {/* Billing / Tariff */}
              {(stay.amount || stay.paymentMode) && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">{isGu ? 'ભાડું અને ચુકવણી' : 'Tariff & Payment'}</span>
                  <span className="font-bold text-slate-900">
                    {stay.amount ? `₹${stay.amount}` : '-'}
                    {stay.paymentMode && (
                      <span className="ml-1 text-xs font-semibold text-slate-500 uppercase">
                        ({stay.paymentMode})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Notes */}
              {stay.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium block text-xs mb-1">{isGu ? 'નોંધ (Notes):' : 'Notes:'}</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs italic">
                    {stay.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Previous Stay History (Matched by Phone) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>{isGu ? `મહેમાનનો ઇતિહાસ (${pastStays.length})` : `Guest Stay History (${pastStays.length})`}</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] text-slate-400">
                {isGu ? 'ફોન દ્વારા મેચ' : 'Matched by phone'}
              </span>
            </div>

            {pastStays.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                {isGu ? 'આ મહેમાન પહેલી વાર રોકાઈ રહ્યા છે.' : 'First time stay for this guest.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-2 max-h-56 overflow-y-auto pr-1">
                {pastStays.map((pst) => (
                  <div key={pst.id} className="pt-2 flex items-center justify-between text-xs gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {pst.hotelName} &bull; Room {pst.roomNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDateIST(pst.checkInAt)} ({pst.durationValue} {pst.durationUnit})
                      </div>
                    </div>
                    <Link
                      href={`/stays/${pst.id}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                    >
                      {isGu ? 'જુઓ' : 'View'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Aadhaar Card Photos & Zoom Lightbox (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{isGu ? 'આધાર કાર્ડ ફોટો અને ચકાસણી' : 'Aadhaar Card Photos & Verification'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isGu
                    ? 'સુરક્ષિત બાઈનરી ડેટાબેઝ સ્ટોરેજ (≤ 40KB). મોટો ફોટો જોવા ક્લિક કરો.'
                    : 'Stored securely as binary buffer (≤ 40KB). Click any photo to zoom in full resolution.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Aadhaar Front Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {isGu ? 'આધાર કાર્ડ આગળ (Front)' : 'Aadhaar Front'}
                  </span>
                  {aadhaarFrontDoc ? (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {(aadhaarFrontDoc.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {isGu ? 'અપલોડ નથી થયેલ' : 'Not uploaded'}
                    </span>
                  )}
                </div>

                {aadhaarFrontDoc ? (
                  <div className="space-y-2">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-[4/3] flex items-center justify-center">
                      <img
                        src={aadhaarFrontDoc.url}
                        alt="Aadhaar Front"
                        className="w-full h-full object-contain cursor-pointer transition group-hover:scale-105"
                        onClick={() =>
                          setLightboxImage({
                            url: aadhaarFrontDoc.url,
                            title: `Aadhaar Front - ${stay.guest.fullName}`,
                          })
                        }
                      />

                      {/* Desktop hover overlay */}
                      <div className="hidden sm:flex absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: aadhaarFrontDoc.url,
                              title: `Aadhaar Front - ${stay.guest.fullName}`,
                            })
                          }
                          className="p-2 bg-white text-slate-800 rounded-lg text-xs font-semibold shadow hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                          <span>Zoom</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadDocKind('aadhaar_front')}
                          className="p-2 bg-white text-slate-800 rounded-lg text-xs font-semibold shadow hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDocId(aadhaarFrontDoc.id)}
                          className="p-2 bg-red-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-red-700 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Touch Action Buttons (Visible directly without hovering) */}
                    <div className="flex sm:hidden items-center justify-between gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: aadhaarFrontDoc.url,
                            title: `Aadhaar Front - ${stay.guest.fullName}`,
                          })
                        }
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>{isGu ? 'ઝૂમ કરો' : 'Zoom'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadDocKind('aadhaar_front')}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>{isGu ? 'બદલો' : 'Replace'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteDocId(aadhaarFrontDoc.id)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg active:scale-95 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center space-y-2 bg-white">
                    <p className="text-xs text-slate-500">
                      {isGu ? 'આગળનો ફોટો અપલોડ નથી' : 'No front image uploaded'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setUploadDocKind('aadhaar_front')}
                      className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 cursor-pointer"
                    >
                      {isGu ? '+ આગળનો ફોટો ચડાવો' : '+ Upload Front'}
                    </button>
                  </div>
                )}
              </div>

              {/* Aadhaar Back Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {isGu ? 'આધાર કાર્ડ પાછળ (Back)' : 'Aadhaar Back'}
                  </span>
                  {aadhaarBackDoc ? (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {(aadhaarBackDoc.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {isGu ? 'અપલોડ નથી થયેલ' : 'Not uploaded'}
                    </span>
                  )}
                </div>

                {aadhaarBackDoc ? (
                  <div className="space-y-2">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-[4/3] flex items-center justify-center">
                      <img
                        src={aadhaarBackDoc.url}
                        alt="Aadhaar Back"
                        className="w-full h-full object-contain cursor-pointer transition group-hover:scale-105"
                        onClick={() =>
                          setLightboxImage({
                            url: aadhaarBackDoc.url,
                            title: `Aadhaar Back - ${stay.guest.fullName}`,
                          })
                        }
                      />

                      {/* Desktop hover overlay */}
                      <div className="hidden sm:flex absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: aadhaarBackDoc.url,
                              title: `Aadhaar Back - ${stay.guest.fullName}`,
                            })
                          }
                          className="p-2 bg-white text-slate-800 rounded-lg text-xs font-semibold shadow hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                          <span>Zoom</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadDocKind('aadhaar_back')}
                          className="p-2 bg-white text-slate-800 rounded-lg text-xs font-semibold shadow hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDocId(aadhaarBackDoc.id)}
                          className="p-2 bg-red-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-red-700 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Touch Action Buttons */}
                    <div className="flex sm:hidden items-center justify-between gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: aadhaarBackDoc.url,
                            title: `Aadhaar Back - ${stay.guest.fullName}`,
                          })
                        }
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>{isGu ? 'ઝૂમ કરો' : 'Zoom'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadDocKind('aadhaar_back')}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>{isGu ? 'બદલો' : 'Replace'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteDocId(aadhaarBackDoc.id)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg active:scale-95 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center space-y-2 bg-white">
                    <p className="text-xs text-slate-500">
                      {isGu ? 'પાછળનો ફોટો અપલોડ નથી' : 'No back image uploaded'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setUploadDocKind('aadhaar_back')}
                      className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 cursor-pointer"
                    >
                      {isGu ? '+ પાછળનો ફોટો ચડાવો' : '+ Upload Back'}
                    </button>
                  </div>
                )}
              </div>

              {/* Guest Live Photo (if exists) */}
              {guestPhotoDoc && (
                <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {isGu ? 'મહેમાનનો લાઈવ ફોટો (Photo)' : 'Guest Live Photo'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {(guestPhotoDoc.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white max-h-60 aspect-video flex items-center justify-center">
                      <img
                        src={guestPhotoDoc.url}
                        alt="Guest Live Photo"
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() =>
                          setLightboxImage({
                            url: guestPhotoDoc.url,
                            title: `Live Photo - ${stay.guest.fullName}`,
                          })
                        }
                      />
                    </div>

                    <div className="flex sm:hidden items-center justify-center pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: guestPhotoDoc.url,
                            title: `Live Photo - ${stay.guest.fullName}`,
                          })
                        }
                        className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>{isGu ? 'મોટો ફોટો જુઓ (Zoom)' : 'Zoom Photo'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document upload / replace widget if triggered */}
            {uploadDocKind && (
              <div className="mt-4 p-4 border border-blue-200 bg-blue-50/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    Upload new photo for {uploadDocKind.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadDocKind(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
                <ImageUploader
                  label={`Replace ${uploadDocKind}`}
                  kind={uploadDocKind}
                  value={null}
                  onChange={(res) => handleUploadNewDocument(uploadDocKind, res)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL (Click to Zoom in full resolution) */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <span className="font-semibold text-sm">{lightboxImage.title}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-white text-base font-bold px-2 py-1"
              >
                &times; Close
              </button>
            </div>

            <div className="flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Secure authenticated stream from /api/documents</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition"
              >
                Close Zoom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK-OUT CONFIRMATION MODAL */}
      <ConfirmationDialog
        isOpen={showCheckoutDialog}
        title={`Check out ${stay.guest.fullName}?`}
        message={`Room ${stay.room.roomNumber} will be marked available and departure recorded as current time.`}
        confirmText="Confirm Check-out"
        loading={checkingOut}
        onConfirm={handleCheckOut}
        onCancel={() => setShowCheckoutDialog(false)}
      />

      {/* EXTEND STAY MODAL */}
      {showExtendModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowExtendModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Extend Stay: {stay.guest.fullName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current check-out: {formatTimeIST(stay.expectedCheckOutAt)} ({formatDateIST(stay.expectedCheckOutAt)})
              </p>
            </div>

            <form onSubmit={handleExtendStay} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Additional Duration
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
                      Hours
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
                      Days
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[1, 2, 3, 6, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setExtendValue(h);
                        setExtendUnit('hours');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                        extendValue === h && extendUnit === 'hours'
                          ? 'bg-blue-600 border-blue-600 text-white font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      +{h}h
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
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                        extendValue === d && extendUnit === 'days'
                          ? 'bg-blue-600 border-blue-600 text-white font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Extension Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guest requested evening departure"
                  value={extendNotes}
                  onChange={(e) => setExtendNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow"
                >
                  {extending ? 'Updating...' : 'Save Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GUEST & STAY MODAL */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Guest &amp; Stay Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Update guest contact info or notes.</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Aadhaar Last 4</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editIdLast4}
                    onChange={(e) => setEditIdLast4(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stay Notes</label>
                <textarea
                  rows={2}
                  value={editStayNotes}
                  onChange={(e) => setEditStayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DOCUMENT CONFIRMATION */}
      <ConfirmationDialog
        isOpen={Boolean(deleteDocId)}
        title="Delete this document photo?"
        message="This will permanently delete this document image from the database."
        confirmText="Delete Document"
        variant="danger"
        onConfirm={() => deleteDocId && handleDeleteDocument(deleteDocId)}
        onCancel={() => setDeleteDocId(null)}
      />
    </div>
  );
}
