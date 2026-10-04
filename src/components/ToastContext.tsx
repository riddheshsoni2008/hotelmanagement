'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isExiting?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);

      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Top Center Floating Notification Island */}
      <div
        className="fixed top-3 sm:top-5 left-0 right-0 z-[99999] flex flex-col items-center gap-2.5 px-3 sm:px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              role="alert"
              onClick={() => dismissToast(toast.id)}
              className={`pointer-events-auto relative w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden flex flex-col transition-all cursor-pointer select-none active:scale-[0.98] ${
                toast.isExiting ? 'toast-exit' : 'toast-enter'
              } ${
                isError
                  ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-950/40'
                  : isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/40'
                  : 'bg-slate-900/95 border-slate-700/80 text-white shadow-slate-950/40'
              }`}
            >
              <div className="flex items-start gap-3 p-3.5">
                {/* Glowing Badge Icon */}
                <div
                  className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                    isError
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : isSuccess
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  }`}
                >
                  {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isError && <AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" />}
                  {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-400" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        isError
                          ? 'bg-rose-400'
                          : isSuccess
                          ? 'bg-emerald-400'
                          : 'bg-blue-400'
                      }`}
                    />
                    <span>
                      {isError ? 'ધ્યાન આપો (Alert)' : isSuccess ? 'સફળતા (Success)' : 'માહિતી (Notice)'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-0.5 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>

                {/* Dismiss X button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  aria-label="Close notification"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Smooth Bottom Auto-Dismiss Progress Bar */}
              <div className="w-full bg-slate-800/60 h-1 overflow-hidden">
                <div
                  className={`h-full toast-progress ${
                    isError
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                      : isSuccess
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-blue-500 to-blue-400'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
