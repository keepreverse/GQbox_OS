import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import { useLanguage } from '../context/LanguageContext';

type DesktopMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  desktopMaxWidth?: DesktopMaxWidth;
  /** Hide the built-in header (use when content provides its own) */
  noHeader?: boolean;
  /** Add a sticky top "grab-handle" indicator on mobile sheets */
  showGrabHandle?: boolean;
  /** Force a particular variant regardless of viewport */
  variant?: 'auto' | 'sheet' | 'modal';
}

const MAX_WIDTH_CLASS: Record<DesktopMaxWidth, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
};

export default function BottomSheet({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  desktopMaxWidth = 'md',
  noHeader = false,
  showGrabHandle = false,
  variant = 'auto',
}: BottomSheetProps) {
  const { isMobile } = useLayout();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted && !open) return null;

  const useSheet = variant === 'sheet' || (variant === 'auto' && isMobile);
  const maxWidthClass = MAX_WIDTH_CLASS[desktopMaxWidth];

  const renderHeader = () => {
    if (noHeader) return null;
    return (
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border-subtle bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon}
          {typeof title === 'string' || typeof title === 'number' ? (
            <h3 className="text-sm font-medium truncate">{title}</h3>
          ) : (
            title
          )}
        </div>
        <button
          onClick={handleClose}
          className="h-9 w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer flex items-center justify-center flex-shrink-0"
          aria-label={language === 'ru' ? 'Закрыть' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (useSheet) {
    return (
      <AnimatePresence onExitComplete={() => setMounted(false)}>
        {open && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              className="fixed inset-0 z-[99] bg-black/60 cursor-pointer"
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-[100] bg-bg-primary rounded-t-2xl flex flex-col overflow-hidden border-t border-border-subtle shadow-2xl"
              style={{ maxHeight: '85dvh' }}
            >
              {showGrabHandle && (
                <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-border-default" />
                </div>
              )}
              {renderHeader()}
              <div className="overflow-y-auto p-3 sm:p-4 flex-1 min-h-0">
                {children}
              </div>
              {footer && (
                <div className="p-3 border-t border-border-subtle bg-bg-secondary flex-shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {open && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`glass-strong rounded-xl w-full ${maxWidthClass} flex flex-col max-h-[85dvh] border border-border-strong shadow-2xl overflow-hidden`}
          >
            {renderHeader()}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0">
              {children}
            </div>
            {footer && (
              <div className="p-3 sm:p-4 border-t border-border-subtle bg-bg-secondary flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
