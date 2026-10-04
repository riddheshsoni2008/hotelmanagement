'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users2, PlusCircle, Building2, Mail, ShieldCheck, UserCheck, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'staff';
  isActive: boolean;
  hotelIds: Array<{ id: string; name: string }>;
  createdAt: string;
}

export default function StaffManagementPage() {
  const { user, hotels } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');
  const [assignedHotelIds, setAssignedHotelIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.users || []);
      }
    } catch {
      showToast(isGu ? 'સ્ટાફ લોડ કરવામાં ભૂલ આવી' : 'Error loading staff', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, isGu]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'staff' && assignedHotelIds.length === 0) {
      showToast(
        isGu
          ? 'કૃપા કરીને આ સ્ટાફ માટે ઓછામાં ઓછી ૧ હોટલ શાખા પસંદ કરો'
          : 'Please assign at least one hotel to this staff member',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          hotelIds: role === 'owner' ? hotels.map((h) => h.id) : assignedHotelIds,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create staff', 'error');
        return;
      }

      showToast(
        isGu
          ? `સ્ટાફ સભ્ય ${name} સફળતાપૂર્વક ઉમેરાઈ ગયા!`
          : `Staff member ${name} created successfully!`,
        'success'
      );
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setAssignedHotelIds([]);
      fetchStaff();
    } catch {
      showToast(isGu ? 'સ્ટાફ બનાવવામાં ભૂલ આવી' : 'Error creating staff', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHotelSelection = (hId: string) => {
    setAssignedHotelIds((prev) =>
      prev.includes(hId) ? prev.filter((id) => id !== hId) : [...prev, hId]
    );
  };

  if (user && user.role !== 'owner') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">{isGu ? 'પ્રવેશ પ્રતિબંધિત' : 'Access Denied'}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {isGu
            ? 'આ વિભાગ ફક્ત હોટલ એડમિન માટે જ ઉપલબ્ધ છે.'
            : 'This section is restricted to hotel owners only.'}
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
            <Users2 className="w-3.5 h-3.5" />
            <span>{isGu ? 'સ્ટાફ સંચાલન' : 'Staff Administration'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'સ્ટાફ અને રિસેપ્શનિસ્ટ (Staff Accounts)' : 'Staff & Receptionists'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isGu
              ? 'લૉગિન વિગતો, પાસવર્ડ અને હોટલ શાખા ફાળવણી નિયંત્રિત કરો.'
              : 'Control login credentials, assign hotel branches, and manage receptionist permissions.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition self-stretch sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isGu ? '+ નવો સ્ટાફ ઉમેરો (Add Staff)' : 'Add Staff Member'}</span>
        </button>
      </div>

      {/* Main Staff Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm">{isGu ? 'સ્ટાફ લોડ થઈ રહ્યો છે...' : 'Loading staff members...'}</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users2 className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-semibold text-slate-800">
              {isGu ? 'કોઈ સ્ટાફ મળ્યા નથી' : 'No staff members found'}
            </h3>
            <p className="text-xs text-slate-500">
              {isGu ? 'નવા સ્ટાફ સભ્ય ઉમેરવા ઉપરના બટન પર ક્લિક કરો.' : 'Click Add Staff Member above to create logins.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">{isGu ? 'નામ' : 'Name'}</th>
                    <th className="py-3 px-4">{isGu ? 'હોદ્દો' : 'Role'}</th>
                    <th className="py-3 px-4">{isGu ? 'ઈમેઈલ' : 'Email'}</th>
                    <th className="py-3 px-4">{isGu ? 'સોંપાયેલ હોટલો' : 'Assigned Hotels'}</th>
                    <th className="py-3 px-4">{isGu ? 'સ્થિતિ' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            st.role === 'owner'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {st.role === 'owner' ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {st.role === 'owner' ? (isGu ? 'એડમિન (Admin)' : 'Admin') : (isGu ? 'સ્ટાફ (Staff)' : 'Staff')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">{st.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {st.role === 'owner' ? (
                            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-medium">
                              {isGu ? 'બધી હોટલો (સંપૂર્ણ અધિકાર)' : 'All Hotels (Full Access)'}
                            </span>
                          ) : st.hotelIds.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">{isGu ? 'કોઈ શાખા નથી' : 'None assigned'}</span>
                          ) : (
                            st.hotelIds.map((h) => (
                              <span
                                key={h.id}
                                className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {h.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            st.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {st.isActive ? (isGu ? 'ચાલુ (Active)' : 'Active') : (isGu ? 'બંધ (Disabled)' : 'Disabled')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) - Clean, tight, no horizontal overflow */}
            <div className="md:hidden divide-y divide-slate-100">
              {staffList.map((st) => (
                <div key={st.id} className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-base flex items-center gap-1.5 flex-wrap">
                        <span>{st.name}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            st.role === 'owner'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {st.role === 'owner' ? <ShieldCheck className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                          {st.role === 'owner' ? (isGu ? 'એડમિન' : 'Admin') : (isGu ? 'સ્ટાફ' : 'Staff')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-mono">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{st.email}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        st.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {st.isActive ? (isGu ? 'સક્રિય' : 'Active') : (isGu ? 'બંધ' : 'Disabled')}
                    </span>
                  </div>

                  {/* Assigned Hotels List */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {isGu ? 'સોંપાયેલ હોટલ શાખાઓ:' : 'Assigned Hotel Branches:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {st.role === 'owner' ? (
                        <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                          {isGu ? 'બધી હોટલો (સંપૂર્ણ અધિકાર)' : 'All Hotels (Full Access)'}
                        </span>
                      ) : st.hotelIds.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">
                          {isGu ? 'કોઈ હોટલ સોંપાઈ નથી' : 'No hotels assigned'}
                        </span>
                      ) : (
                        st.hotelIds.map((h) => (
                          <span
                            key={h.id}
                            className="text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                          >
                            {h.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                <Users2 className="w-4 h-4" />
                <span>{isGu ? 'નવું સ્ટાફ એકાઉન્ટ' : 'Staff Account'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isGu ? 'નવો સ્ટાફ / રિસેપ્શનિસ્ટ ઉમેરો' : 'Add Staff Member'}
              </h3>
              <p className="text-xs text-slate-500">
                {isGu
                  ? 'લૉગિન ઈમેઈલ અને પાસવર્ડ બનાવી હોટલ શાખા સોંપો.'
                  : 'Create login account and assign hotel branches.'}
              </p>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'પૂરું નામ (Full Name)' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'ઈમેઈલ (Email / Username)' : 'Email'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@hotel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'પાસવર્ડ (Password - ઓછામાં ઓછા ૬ અક્ષર)' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {isGu ? 'હોદ્દો (Role)' : 'Role'}
                </label>
                <select
                  aria-label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'owner' | 'staff')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="staff">
                    {isGu ? 'રિસેપ્શન સ્ટાફ (ફક્ત સોંપાયેલ હોટલ જોઈ શકે)' : 'Staff (Assigned hotels only)'}
                  </option>
                  <option value="owner">
                    {isGu ? 'હોટલ એડમિન (બધી હોટલો અને એડમિન પેનલ)' : 'Admin (Full access to all hotels)'}
                  </option>
                </select>
              </div>

              {role === 'staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    {isGu ? 'હોટલ શાખા સોંપો (Assign Hotels):' : 'Assign Hotels:'}
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {hotels.map((h) => (
                      <label key={h.id} className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignedHotelIds.includes(h.id)}
                          onChange={() => handleToggleHotelSelection(h.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span>{h.name} ({h.city})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? (isGu ? 'બનાવી રહ્યા છીએ...' : 'Creating...')
                    : (isGu ? 'ખાતું બનાવો' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
