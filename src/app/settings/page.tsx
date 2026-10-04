'use client';

import React, { useState } from 'react';
import {
  Settings,
  Database,
  Trash2,
  CheckCircle2,
  User,
  Lock,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { useLanguage } from '@/components/LanguageContext';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

export default function SettingsPage() {
  const { user, refreshAuth } = useHotel();
  const { showToast } = useToast();
  const { isGu } = useLanguage();

  // Profile update state
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Document cleanup state
  const [months, setMonths] = useState(6);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // Full database reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Handle Profile & Password Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);

    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = {};
      if (name.trim()) payload.name = name.trim();
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || (isGu ? 'પ્રોફાઇલ અપડેટ નિષ્ફળ ગઈ' : 'Failed to update profile'), 'error');
        return;
      }

      showToast(isGu ? 'પ્રોફાઇલ સફળતાપૂર્વક સાચવવામાં આવી!' : 'Profile updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      await refreshAuth();
    } catch {
      showToast(isGu ? 'અપડેટમાં ભૂલ આવી' : 'Error updating profile', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle Document Cleanup
  const handleCleanupConfirm = async () => {
    setCleaningUp(true);
    setCleanupResult(null);

    try {
      const res = await fetch('/api/settings/cleanup-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanMonths: months }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Cleanup failed', 'error');
        return;
      }

      setCleanupResult(data.message);
      showToast(data.message, 'success');
      setShowConfirm(false);
    } catch {
      showToast('Error during document cleanup', 'error');
    } finally {
      setCleaningUp(false);
    }
  };

  // Handle Full Database Reset (Wipes all demo stays & guests)
  const handleResetConfirm = async () => {
    setResetting(true);

    try {
      const res = await fetch('/api/settings/reset-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preserveRooms: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Reset failed', 'error');
        return;
      }

      showToast(data.message, 'success');
      setShowResetConfirm(false);
      window.location.reload();
    } catch {
      showToast('Error resetting database', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (user && user.role !== 'owner') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1">This section is restricted to hotel owners only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5" />
            <span>{isGu ? 'સિસ્ટમ & એકાઉન્ટ સેટિંગ્સ' : 'System Administration'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {isGu ? 'પ્રોફાઇલ, પાસવર્ડ & ડેટાબેઝ સેટિંગ્સ' : 'Profile, Password & Database Settings'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isGu
              ? 'તમારું નામ, પાસવર્ડ બદલો અને ડેટાબેઝ મેનેજ કરો.'
              : 'Update your owner profile, change password, and manage storage retention.'}
          </p>
        </div>
      </div>

      {/* 1. Owner Profile & Password Form */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">
            {isGu ? 'પ્રોફાઇલ અને પાસવર્ડ સેટિંગ્સ (Profile & Password)' : 'Profile & Password'}
          </h3>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isGu ? 'તમારું નામ (Full Name)' : 'Your Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Riddhesh Soni"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isGu ? 'ઈમેઈલ (Email Address)' : 'Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Change Password Block */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isGu ? 'હાલનો પાસવર્ડ (Current Password)' : 'Current Password (if changing)'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isGu ? 'નવો પાસવર્ડ (New Password)' : 'New Password (min 6 characters)'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="નવો પાસવર્ડ સેટ કરો"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updatingProfile}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-700/20 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              <span>{updatingProfile ? (isGu ? 'સાચવી રહ્યા છીએ...' : 'Saving...') : (isGu ? 'ફેરફાર સાચવો (Save Changes)' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Storage Information Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isGu ? 'MongoDB એટલાસ સ્ટોરેજ ઓપ્ટિમાઇઝર' : 'MongoDB Atlas Storage Optimizer'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {isGu
                ? 'બધા આધાર કાર્ડ ફોટો મહત્તમ 40KB સાઈઝમાં સંગ્રહાય છે. તમારા 512MB ફ્રી ડેટાબેઝમાં ૧૨,૦૦૦+ મહેમાનોના કાર્ડ સરળતાથી સમાઈ જાય છે.'
                : 'All guest documents are strictly compressed under 40KB per image, ensuring you stay easily within the 512MB free tier for over 12,000+ guest cards.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Document Cleanup Tool */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h3 className="text-base font-bold text-slate-900">
            {isGu ? 'જૂના આધાર ડોક્યુમેન્ટ સફાઈ (Archive Cleanup)' : 'Aadhaar Document Archive Cleanup'}
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600">
          {isGu
            ? 'પસંદ કરેલા મહિના કરતાં જૂના પૂર્ણ થયેલ રોકાણના ફોટો ડીલીટ કરો. મહેમાનનું નામ, ફોન અને બિલિંગ વિગતો હંમેશા સચવાયેલી રહેશે.'
            : 'Delete document image files for stays completed older than the selected retention period. Billing history and contacts remain permanently intact.'}
        </p>

        {cleanupResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanupResult}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase">
              {isGu ? 'આટલા મહિનાથી જૂના:' : 'Older than:'}
            </span>
            <select
              aria-label="Purge photos older than"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer pr-2"
            >
              <option value={1}>1 {isGu ? 'મહિનો' : 'Month'}</option>
              <option value={3}>3 {isGu ? 'મહિના' : 'Months'}</option>
              <option value={6}>6 {isGu ? 'મહિના' : 'Months'}</option>
              <option value={12}>12 {isGu ? 'મહિના (૧ વર્ષ)' : 'Months'}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isGu ? 'જૂના ફોટો સાફ કરો' : 'Purge Old Documents'}</span>
          </button>
        </div>
      </div>

      {/* 4. Reset & Clear All Demo Stays (Full Clean) */}
      <div className="bg-amber-50/70 border border-amber-300/80 rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-900">
          <RotateCcw className="w-4 h-4 text-amber-700" />
          <h3 className="text-base font-bold">
            {isGu ? 'ડેમો ડેટા સાફ કરો (Clear Demo Stays & Guests)' : 'Reset Demo Records'}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
          {isGu
            ? 'બધા ડેમો મહેમાનો, જૂના રોકાણો અને ફોટો ૧-ક્લિકમાં સાફ કરી દો જેથી તમારી સિસ્ટમ સાચા ગ્રાહકો માટે એકદમ નવી અને ખાલી થઈ જાય. બધા રૂમ ખાલી થઈ જશે.'
            : 'Wipe all test/demo guest check-ins and stays. All rooms will be reset to vacant/available status, giving you a 100% clean production start.'}
        </p>
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isGu ? 'બધા ડેમો રેકોર્ડ સાફ કરો (Clean Demo Data)' : 'Clean All Demo Data'}</span>
        </button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showConfirm}
        title={isGu ? 'જૂના આધાર ફોટો ડીલીટ કરવા છે?' : 'Purge Old Aadhaar Documents?'}
        message={`This will permanently remove image photos for stays older than ${months} month(s). Guest contact records and billing logs will remain intact.`}
        confirmText="Confirm Purge"
        variant="danger"
        loading={cleaningUp}
        onConfirm={handleCleanupConfirm}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmationDialog
        isOpen={showResetConfirm}
        title={isGu ? 'બધા ડેમો રેકોર્ડ સાફ કરવા છે?' : 'Wipe All Demo Stays & Guests?'}
        message="This will delete all test guest check-ins, documents, and stay history. All rooms will be reset to available. Your login and hotel settings will remain intact."
        confirmText={isGu ? 'હા, સાફ કરો' : 'Yes, Wipe Demo Data'}
        variant="danger"
        loading={resetting}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
