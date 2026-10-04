import React from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'checked_in' | 'checked_out' | 'overstay';
  countdownText?: string;
  isOverstay?: boolean;
}

export function StatusBadge({ status, countdownText, isOverstay }: StatusBadgeProps) {
  if (isOverstay || status === 'overstay') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 shadow-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
        <span>Overstay</span>
        {countdownText && <span className="text-[11px] font-medium text-red-700">({countdownText})</span>}
      </span>
    );
  }

  if (status === 'checked_in') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Checked In</span>
        {countdownText && <span className="text-[11px] font-medium text-emerald-700">({countdownText})</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
      <Clock className="w-3.5 h-3.5 text-slate-500" />
      <span>Checked Out</span>
      {countdownText && <span className="text-[11px] text-slate-500">({countdownText})</span>}
    </span>
  );
}

export default StatusBadge;
