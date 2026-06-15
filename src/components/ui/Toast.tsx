import { Check, AlertTriangle, XCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ToastEntry } from '@hooks/useToast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  message: string;
  type: ToastType;
}

const ICON_MAP: Record<ToastType, typeof Check> = {
  success: Check,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const BG_MAP: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-black',
  info: 'bg-accent text-white',
};

interface ToastStackProps {
  toasts: ToastEntry[];
  onDismiss: (id: number) => void;
}

const MAX_VISIBLE = 3;

export function Toast({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  const visible = toasts.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, toasts.length - MAX_VISIBLE);

  return createPortal(
    <div
      className="fixed right-4 z-[10000] flex flex-col gap-2 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 88px)' }}
    >
      {visible.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs shadow-lg cursor-pointer max-w-[min(90vw,400px)] pointer-events-auto ${
            BG_MAP[entry.type]
          } ${entry.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          onClick={() => onDismiss(entry.id)}
        >
          {(() => {
            const Icon = ICON_MAP[entry.type];
            return <Icon className="w-4 h-4 flex-shrink-0" />;
          })()}
          <span className="truncate flex-1" title={entry.message}>
            {entry.message}
          </span>
          {entry.id === visible[0].id && overflow > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-black/25 text-[10px] font-medium flex-shrink-0">
              +{overflow}
            </span>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}