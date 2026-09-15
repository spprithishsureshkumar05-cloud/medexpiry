import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700/60'
              : toast.type === 'error'
              ? 'bg-red-900/90 text-red-100 border-red-700/60'
              : toast.type === 'warning'
              ? 'bg-amber-900/90 text-amber-100 border-amber-700/60'
              : 'bg-slate-800/95 text-slate-100 border-slate-700/60'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-300" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-300" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-300" />}
          </div>
          <div className="flex-1 text-sm leading-snug font-medium">{toast.message}</div>
          <button
            id={`dismiss-toast-${toast.id}`}
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
