'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  PlusCircle,
  Phone,
  MapPin,
  BedDouble,
  RefreshCw,
  CheckCircle2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  Copy,
  Users2,
  ShieldAlert,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';

interface StaffDetail {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface HotelItemDetail {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isActive: boolean;
  roomCount: number;
  staff?: StaffDetail[];
}

export default function HotelsManagementPage() {
  const { user, refreshAuth } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [hotels, setHotels] = useState<HotelItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields for Hotel
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // Form fields for dedicated Manager / Staff login
  const [createManager, setCreateManager] = useState(true);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Success dialog after creating hotel + login
  const [createdAccountSuccess, setCreatedAccountSuccess] = useState<{
    hotelName: string;
    email: string;
    password?: string;
  } | null>(null);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hotels');
      if (res.ok) {
        const data = await res.json();
        setHotels(data.hotels || []);
      }
    } catch {
      showToast(isGu ? 'હોટલો લોડ કરવામાં ભૂલ આવી' : 'Error loading hotels', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, isGu]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createManager) {
      if (!managerEmail || !managerEmail.includes('@')) {
        showToast(isGu ? 'માન્ય ઈમેઈલ એડ્રેસ નાખો' : 'Please enter a valid login email address', 'error');
        return;
      }
      if (!managerPassword || managerPassword.length < 6) {
        showToast(isGu ? 'પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ' : 'Password must be at least 6 characters long', 'error');
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city,
          address,
          phone,
          isActive: true,
          createManagerAccount: createManager,
          managerName: managerName || `${name} Staff`,
          managerEmail: createManager ? managerEmail : undefined,
          managerPassword: createManager ? managerPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || (isGu ? 'હોટલ સેવ કરવામાં ભૂલ આવી' : 'Failed to create hotel'), 'error');
        return;
      }

      if (data.managerUser) {
        setCreatedAccountSuccess({
          hotelName: name,
          email: data.managerUser.email,
          password: managerPassword,
        });
      } else {
        showToast(isGu ? `હોટલ "${name}" સફળતાપૂર્વક બની ગઈ!` : `Hotel "${name}" created successfully!`, 'success');
      }

      setShowAddModal(false);
      setName('');
      setCity('');
      setAddress('');
      setPhone('');
      setManagerName('');
      setManagerEmail('');
      setManagerPassword('');
      setCreateManager(true);
      fetchHotels();
      refreshAuth();
    } catch {
      showToast(isGu ? 'હોટલ બનાવવામાં ભૂલ આવી' : 'Error creating hotel', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (hotelId: string) => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(isGu ? 'હોટલ સ્થિતિ અપડેટ થઈ' : 'Hotel status updated', 'success');
        fetchHotels();
        refreshAuth();
      }
    } catch {
      showToast(isGu ? 'અપડેટ કરવામાં ભૂલ આવી' : 'Failed to update hotel', 'error');
    }
  };

  if (user && user.role !== 'owner') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">{isGu ? 'પરવાનગી નથી' : 'Access Denied'}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {isGu ? 'આ પાનું ફક્ત હોટલ માલિક (Admin) માટે છે.' : 'This section is restricted to hotel owners only.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>{isGu ? 'મલ્ટી-હોટલ પોર્ટફોલિયો' : 'Multi-Tenant Portfolio'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'હોટલ શાખાઓ અને લૉગિન (Hotels)' : 'Hotel Properties & Logins'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isGu
              ? 'તમારી બધી હોટલ શાખાઓ, સરનામાં અને દરેક શાખા માટે અલગ મેનેજર લૉગિન મેનેજ કરો.'
              : 'Manage your hotel branches and configure dedicated manager login credentials for each property.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setCreateManager(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition cursor-pointer w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isGu ? '+ નવી હોટલ ઉમેરો (Add Hotel)' : 'Add New Hotel'}</span>
        </button>
      </div>

      {/* Hotel Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <p className="text-sm">{isGu ? 'હોટલો લોડ થઈ રહી છે...' : 'Loading hotel properties...'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      hotel.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {hotel.isActive ? (isGu ? 'ચાલુ (Active)' : 'Active') : (isGu ? 'બંધ' : 'Inactive')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{hotel.name}</h3>
                  <div className="text-xs text-blue-700 font-semibold">{hotel.city}</div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{hotel.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{hotel.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <BedDouble className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{hotel.roomCount} {isGu ? 'રૂમ નોંધાયેલ છે' : 'Rooms Registered'}</span>
                  </div>
                </div>

                {/* Assigned Staff Logins Section */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isGu ? `સ્ટાફ લૉગિન (${hotel.staff?.length || 0})` : `Dedicated Logins (${hotel.staff?.length || 0})`}</span>
                    </span>
                    <Link
                      href="/staff"
                      className="text-blue-600 hover:text-blue-800 text-[10px] font-bold normal-case hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>{isGu ? 'સ્ટાફ મેનેજ કરો' : 'Manage Staff'}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  {hotel.staff && hotel.staff.length > 0 ? (
                    <div className="space-y-1">
                      {hotel.staff.map((s) => (
                        <div
                          key={s.id}
                          className="text-xs bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 flex items-center justify-between border border-slate-200/60 transition"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-800 block truncate">{s.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block truncate">{s.email}</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                            Staff
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200/70 flex items-center justify-between gap-2">
                      <span className="text-[11px]">{isGu ? 'હજુ કોઈ સ્ટાફ લૉગિન નથી' : 'No dedicated login yet'}</span>
                      <Link
                        href="/staff"
                        className="text-[11px] font-bold text-amber-900 underline hover:no-underline shrink-0"
                      >
                        {isGu ? '+ લૉગિન ઉમેરો' : '+ Add Login'}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleActive(hotel.id)}
                  className={`py-2 px-3 rounded-xl font-semibold transition text-center cursor-pointer ${
                    hotel.isActive
                      ? 'text-red-700 bg-red-50 hover:bg-red-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {hotel.isActive ? (isGu ? 'શાખા બંધ કરો' : 'Deactivate') : (isGu ? 'શાખા ચાલુ કરો' : 'Activate')}
                </button>

                <Link
                  href="/rooms"
                  className="py-2 px-3 rounded-xl font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 text-center transition flex items-center justify-center gap-1"
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>{isGu ? 'રૂમ જુઓ' : 'View Rooms'}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Hotel Modal with Manager Login Creation (Optimized for Mobile) */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                <span>{isGu ? 'નવી શાખા' : 'New Branch'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isGu ? 'નવી હોટલ પ્રોપર્ટી ઉમેરો' : 'Add New Hotel Property'}
              </h3>
              <p className="text-xs text-slate-500">
                {isGu
                  ? 'હોટલનું સરનામું અને આ શાખા માટે અલગ સ્ટાફ લૉગિન પાસવર્ડ સેટ કરો.'
                  : 'Enter hotel location details and optionally create a manager account to log in to this branch.'}
              </p>
            </div>

            <form onSubmit={handleCreateHotel} className="space-y-4">
              {/* Hotel Information Group */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1">
                  {isGu ? '૧. હોટલની માહિતી' : '1. Hotel Information'}
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'હોટલનું નામ (Hotel Name) *' : 'Hotel Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Grand Residency"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!managerName) {
                        setManagerName(`${e.target.value} Reception`);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isGu ? 'શહેર (City) *' : 'City *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isGu ? 'દા.ત. સુરત' : 'e.g. Udaipur'}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {isGu ? 'ફોન નંબર (Phone) *' : 'Phone *'}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {isGu ? 'પૂરું સરનામું (Full Address) *' : 'Full Address *'}
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder={isGu ? 'પ્લોટ નંબર, રસ્તો, સીમાચિહ્ન' : 'Plot number, street, near landmark'}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>
              </div>

              {/* Manager Login Account Group */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isGu ? '૨. સ્ટાફ લૉગિન એકાઉન્ટ' : '2. Hotel Manager / Staff Login'}</span>
                  </h4>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-700">
                    <input
                      type="checkbox"
                      checked={createManager}
                      onChange={(e) => setCreateManager(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{isGu ? 'લૉગિન બનાવો' : 'Create Login'}</span>
                  </label>
                </div>

                {createManager ? (
                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 sm:p-3.5 space-y-3">
                    <div className="text-[11px] text-blue-800 leading-relaxed font-medium">
                      {isGu
                        ? 'આ યૂઝર ફક્ત આ હોટલનું કામકાજ સંભાળી શકશે. બીજી હોટલનો ડેટા જોઈ શકશે નહીં.'
                        : 'This user will log in at /login and strictly have access only to this hotel property.'}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {isGu ? 'સ્ટાફ / મેનેજરનું નામ' : 'Staff / Manager Name'}
                      </label>
                      <input
                        type="text"
                        placeholder={isGu ? 'દા.ત. રિસેપ્શન સ્ટાફ' : 'e.g. Udaipur Front Desk'}
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {isGu ? 'લૉગિન ઈમેઈલ (Login Email) *' : 'Login Email Address *'}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="email"
                          required={createManager}
                          placeholder="manager@hotel.com"
                          value={managerEmail}
                          onChange={(e) => setManagerEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {isGu ? 'પાસવર્ડ (Password) *' : 'Login Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={createManager}
                          minLength={6}
                          placeholder={isGu ? 'ઓછામાં ઓછો ૬ અક્ષર' : 'Minimum 6 characters'}
                          value={managerPassword}
                          onChange={(e) => setManagerPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {isGu
                          ? 'આ પાસવર્ડ આ હોટલના રિસેપ્શનિસ્ટને લૉગિન માટે આપવો.'
                          : 'Give these credentials to the hotel receptionist.'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                    {isGu
                      ? 'હમણાં લૉગિન બનશે નહીં. તમે સ્ટાફ પેજ પરથી પાછળથી પણ સ્ટાફ ઉમેરી શકો છો.'
                      : 'No login will be created now. You can assign staff members later from the Staff page.'}
                  </div>
                )}
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {isGu ? 'રદ કરો' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md shadow-blue-700/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isGu ? 'સેવ થાય છે...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{isGu ? 'હોટલ & લૉગિન સેવ કરો' : 'Save Hotel & Login'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal showing Created Login Credentials (Mobile Optimized) */}
      {createdAccountSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isGu ? 'હોટલ & લૉગિન બની ગયું! 🎉' : 'Hotel & Login Created! 🎉'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-800">{createdAccountSuccess.hotelName}</span>{' '}
                {isGu ? 'સક્રિય થઈ ગયું છે. આ લૉગિન વિગતો સ્ટાફને આપો:' : 'is now active. Share these credentials with your staff:'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{isGu ? 'હોટલ શાખા:' : 'Hotel Branch:'}</span>
                <span className="font-bold text-slate-800">{createdAccountSuccess.hotelName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{isGu ? 'ઈમેઈલ:' : 'Login Email:'}</span>
                <span className="font-mono font-bold text-blue-700">{createdAccountSuccess.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{isGu ? 'પાસવર્ડ:' : 'Password:'}</span>
                <span className="font-mono font-bold text-slate-800">{createdAccountSuccess.password}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-500 font-medium">{isGu ? 'પરવાનગી:' : 'Scope:'}</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {isGu ? `ફક્ત ${createdAccountSuccess.hotelName}` : `Only ${createdAccountSuccess.hotelName}`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Hotel: ${createdAccountSuccess.hotelName}\nEmail: ${createdAccountSuccess.email}\nPassword: ${createdAccountSuccess.password}\nLogin at: http://localhost:3000/login`
                  );
                  showToast(isGu ? 'લૉગિન વિગત કૉપી થઈ ગઈ!' : 'Login credentials copied to clipboard!', 'success');
                }}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Copy className="w-4 h-4" />
                <span>{isGu ? 'લૉગિન વિગત કૉપી કરો' : 'Copy Credentials to Clipboard'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedAccountSuccess(null)}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                {isGu ? 'પૂર્ણ થયું (Done)' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
