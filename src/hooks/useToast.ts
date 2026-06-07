import { useState, useCallback, useRef } from 'react';
import type { ToastData, ToastType } from '@components/ui/Toast';

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, type });
      timerRef.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
