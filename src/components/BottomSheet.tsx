import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: string;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  ariaLabel?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  maxHeight = '85dvh',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  ariaLabel,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, closeOnEsc]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 z-[99] bg-black/60 cursor-pointer"
            aria-hidden="true"
          />
          <motion.div
            key="bottom-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[100] bg-bg-primary rounded-t-2xl flex flex-col overflow-hidden border-t border-border-subtle shadow-2xl"
            style={{ maxHeight }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-border-subtle bg-bg-secondary shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {icon}
                <h3 className="text-sm font-medium truncate">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5 flex-1 overscroll-contain">
              {children}
            </div>
            {footer && (
              <div className="p-3 sm:p-4 border-t border-border-subtle bg-bg-secondary shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
