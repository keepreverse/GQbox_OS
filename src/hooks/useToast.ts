import { useState, useCallback, useRef } from 'react';
import type { ToastType } from '@components/ui/Toast';

export interface ToastEntry {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

let nextId = 0;

export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timerRefs.current.set(id, timer);
    },
    [duration, dismiss]
  );

  const hideToast = useCallback(() => {
    setToasts((prev) => {
      prev.forEach((t) => {
        const timer = timerRefs.current.get(t.id);
        if (timer) {
          clearTimeout(timer);
          timerRefs.current.delete(t.id);
        }
      });
      return [];
    });
  }, []);

  return { toasts, showToast, hideToast, dismiss };
}