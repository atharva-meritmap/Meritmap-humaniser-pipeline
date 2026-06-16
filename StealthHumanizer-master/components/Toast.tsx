'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast as ToastType } from '@/lib/types';

interface ToastProps {
  toast: ToastType;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-green-500/20 border-green-500/50 text-green-400',
  error: 'bg-red-500/20 border-red-500/50 text-red-400',
  info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
};

const iconColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

export default function Toast({ toast, onClose }: ToastProps) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[toast.type]} backdrop-blur-sm shadow-lg toast-enter max-w-sm`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <p className="text-sm text-dark-100 flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="p-1 hover:bg-dark-700/50 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-dark-400" />
      </button>
    </div>
  );
}
