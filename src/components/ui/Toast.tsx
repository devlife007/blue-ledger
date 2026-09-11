import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
}

const config: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle, bg: 'bg-navy-700', border: 'border-emerald-500/40', text: 'text-emerald-400' },
  error: { icon: XCircle, bg: 'bg-navy-700', border: 'border-red-500/40', text: 'text-red-400' },
  info: { icon: Info, bg: 'bg-navy-700', border: 'border-brand/40', text: 'text-brand' },
};

export default function Toast({ message, type = 'success', onDismiss, duration = 3500 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const { icon: Icon, bg, border, text } = config[type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-sm
        ${bg} ${border}
        transition-all duration-300 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon className={`h-5 w-5 shrink-0 ${text}`} />
      <p className={`text-sm font-medium ${text}`}>{message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className={`ml-2 p-0.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer ${text}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
