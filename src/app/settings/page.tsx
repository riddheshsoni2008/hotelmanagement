'use client';

import React, { useState } from 'react';
import {
  Settings,
  Database,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { useHotel } from '@/components/HotelContext';
import { useToast } from '@/components/ToastContext';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

export default function SettingsPage() {
  const { user } = useHotel();
  const { showToast } = useToast();

  const [months, setMonths] = useState(6);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

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
            <span>System Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Database &amp; Storage Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Optimize database storage for MongoDB Atlas free tier (512MB) and manage document retention policies.
          </p>
        </div>
      </div>

      {/* Storage Information Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">MongoDB Atlas Free Tier Storage Optimizer</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Your database is optimized to store all guest documents in a separate <code className="text-blue-700 font-mono">GuestDocument</code> collection with a strict 40KB cap per image. Guest profiles and stay logs are always preserved permanently, but older document photos can be purged to keep usage well within the 512MB free tier.
            </p>
          </div>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium block">Document Max Size</span>
            <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">&le; 40 KB per Image</span>
            <span className="text-[10px] text-emerald-700">Enforced by Canvas &amp; Server</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium block">Atlas Free Tier Cap</span>
            <span className="font-extrabold text-blue-800 text-sm mt-0.5 block">512 MB Cluster</span>
            <span className="text-[10px] text-slate-500">Holds ~12,000+ guest cards</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium block">Data Isolation</span>
            <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">Hotel-level Auth</span>
            <span className="text-[10px] text-emerald-700">No public image URLs</span>
          </div>
        </div>
      </div>

      {/* Document Cleanup Tool */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h3 className="text-base font-bold text-slate-900">Aadhaar Document Archive Cleanup</h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-600">
          Delete document binary image buffers for stays that were completed older than the selected retention period. The guest names, phones, stay dates, and billing history will remain completely intact.
        </p>

        {cleanupResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanupResult}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase">Purge photos older than:</span>
            <select
              aria-label="Purge photos older than"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer pr-2"
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months (Recommended)</option>
              <option value={12}>12 Months (1 Year)</option>
              <option value={24}>24 Months (2 Years)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge Old Documents</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirm}
        title="Purge Old Aadhaar Documents?"
        message={`This will permanently remove image photos for stays older than ${months} month${months > 1 ? 's' : ''}. Guest contact records, room logs, and invoices will NOT be deleted.`}
        confirmText="Confirm Purge"
        variant="danger"
        loading={cleaningUp}
        onConfirm={handleCleanupConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
