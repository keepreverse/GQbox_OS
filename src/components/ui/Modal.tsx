import { useEffect, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MODAL_BACKDROP_DURATION_MS, MODAL_SHEET_DURATION_MS } from '@constants/timing';
import { MODAL_NARROW_PX } from '@constants/breakpoints';
import { useMediaQuery } from '@hooks/useMediaQuery';

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

const TRANSITION = `opacity ${MODAL_BACKDROP_DURATION_MS}ms ease, transform ${MODAL_SHEET_DURATION_MS}ms ease`;

function ModalComponent({
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
  const isNarrow = useMediaQuery(`(max-width: ${MODAL_NARROW_PX - 1}px)`);
  const resolvedVariant: 'centered' | 'bottom-sheet' =
    variant === 'auto' ? (isNarrow ? 'bottom-sheet' : 'centered') : variant;

  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        setIsMounted(false);
        onExitComplete?.();
      }, MODAL_BACKDROP_DURATION_MS);
    }
  }, [open, onExitComplete]);

  // ─── Focus management ─────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    lastActiveElementRef.current =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    const id = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        panel.focus();
      }
    });
    return () => {
      window.cancelAnimationFrame(id);
      const last = lastActiveElementRef.current;
      if (last && typeof last.focus === 'function') {
        last.focus();
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !closeOnEsc) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isVisible, onClose, closeOnEsc]);

  useEffect(() => {
    if (!isVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center">
      {/* Backdrop */}
      <div
        style={{
          opacity: isVisible ? 1 : 0,
          transition: TRANSITION,
        }}
        onClick={closeOnBackdropClick ? onClose : undefined}
        className={
          resolvedVariant === 'bottom-sheet'
            ? 'absolute inset-0 bg-black/60'
            : 'absolute inset-0 bg-black/40 backdrop-blur-sm'
        }
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          opacity: isVisible ? 1 : 0,
          transform:
            resolvedVariant === 'centered'
              ? isVisible
                ? 'scale(1)'
                : 'scale(0.96)'
              : isVisible
                ? 'translateY(0)'
                : 'translateY(100%)',
          transition: TRANSITION,
          ...(pinned
            ? { contain: 'layout paint', height }
            : { contain: 'layout paint', maxHeight: height }),
        }}
        onClick={(e) => e.stopPropagation()}
        className={
          resolvedVariant === 'centered'
            ? `relative glass-strong rounded-xl w-full mx-4 border border-border-strong shadow-2xl flex flex-col overflow-hidden ${WIDTH_MAP[width]} ${className}`
            : `relative glass-strong rounded-t-2xl w-full border-t border-border-subtle shadow-2xl flex flex-col overflow-hidden ${className}`
        }
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
          style={{ contain: 'layout paint' }}
        >
          {children}
        </div>
        {footer && (
          <div className="p-3 sm:p-4 border-t border-border-subtle bg-bg-secondary shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default memo(ModalComponent);
