import { Check, AlertTriangle, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  message: string;
  type: ToastType;
}

export function Toast({ data, onClose }: { data: ToastData | null; onClose: () => void }) {
  const iconMap: Record<ToastType, typeof Check> = {
    success: Check,
    error: XCircle,
    warning: AlertTriangle,
    info: AlertTriangle,
  };
  const Icon = data ? iconMap[data.type] : Check;

  const bgMap: Record<ToastType, string> = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-black',
    info: 'bg-accent text-white',
  };

  return createPortal(
    <div
      className={`fixed top-20 right-4 z-[110] flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs shadow-lg cursor-pointer max-w-[min(90vw,400px)] ${
        data ? bgMap[data.type] : ''
      }`}
      style={{
        opacity: data ? 1 : 0,
        transform: data ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: data ? 'auto' : 'none',
      }}
      onClick={onClose}
    >
      {data && (
        <>
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate" title={data.message}>
            {data.message}
          </span>
        </>
      )}
    </div>,
    document.body
  );
}
