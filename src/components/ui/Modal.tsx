import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MODAL_BACKDROP_DURATION_S, MODAL_SHEET_DURATION_S, LAYOUT_EASE } from '@constants/timing';

type ModalVariant = 'auto' | 'centered' | 'bottom-sheet';
type ModalWidth = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onExitComplete?: () => void;
  variant?: ModalVariant;
  width?: ModalWidth;
  height?: string;
  pinned?: boolean;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  ariaLabel?: string;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
}

const WIDTH_MAP: Record<ModalWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const BACKDROP_EASE = LAYOUT_EASE;
const BACKDROP_DUR = MODAL_BACKDROP_DURATION_S;
const SHEET_EASE = LAYOUT_EASE;
const SHEET_DUR = MODAL_SHEET_DURATION_S;

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const handle = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handle);
    setIsNarrow(mql.matches);
    return () => mql.removeEventListener('change', handle);
  }, []);
  return isNarrow;
}

export default function Modal({
  open,
  onClose,
  onExitComplete,
  variant = 'auto',
  width = 'md',
  height = 'min(85dvh, 560px)',
  pinned = false,
  title,
  icon,
  footer,
  children,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  ariaLabel,
  showCloseButton = true,
  className = '',
  contentClassName = '',
}: ModalProps) {
  const isNarrow = useIsNarrow();
  const resolvedVariant: 'centered' | 'bottom-sheet' =
    variant === 'auto' ? (isNarrow ? 'bottom-sheet' : 'centered') : variant;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div
          key="modal-root"
          className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center"
        >
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: BACKDROP_DUR, ease: BACKDROP_EASE }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="modal-panel"
            initial={
              resolvedVariant === 'centered'
                ? { opacity: 0, scale: 0.96 }
                : { opacity: 0, y: '100%' }
            }
            animate={
              resolvedVariant === 'centered' ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }
            }
            exit={
              resolvedVariant === 'centered'
                ? { opacity: 0, scale: 0.96 }
                : { opacity: 0, y: '100%' }
            }
            transition={{ duration: SHEET_DUR, ease: SHEET_EASE }}
            onClick={(e) => e.stopPropagation()}
            className={
              resolvedVariant === 'centered'
                ? `relative glass-strong rounded-xl w-full mx-4 border border-border-strong shadow-2xl flex flex-col overflow-hidden ${WIDTH_MAP[width]} ${className}`
                : `relative glass-strong rounded-t-2xl w-full border-t border-border-subtle shadow-2xl flex flex-col overflow-hidden ${className}`
            }
            style={pinned ? { height } : { maxHeight: height }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-border-subtle bg-bg-secondary shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {icon}
                  <h3 className="text-sm font-medium truncate">{title}</h3>
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer flex items-center justify-center shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div
              data-modal-content
              className={`flex-1 overflow-y-auto overscroll-contain ${contentClassName || 'p-4 sm:p-5'}`}
            >
              {children}
            </div>
            {footer && (
              <div className="p-3 sm:p-4 border-t border-border-subtle bg-bg-secondary shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
