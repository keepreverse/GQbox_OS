/**
 * Lightbox component for viewing media files.
 *
 * Features:
 * - Counter (1 / 5)
 * - Primary toggle
 * - Delete
 * - Download
 * - Keyboard navigation (Left / Right arrows)
 */

import { useEffect, useCallback } from 'react';
import Modal from './Modal';
import { useLanguage } from '@context/LanguageContext';
import { MediaFile, MediaLink } from '@app-types';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

interface LightboxProps {
  open: boolean;
  files: MediaFile[];
  links: MediaLink[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  onTogglePrimary?: (fileId: string, variantId: string) => void;
  onDelete?: (fileId: string) => void;
  /** Optional variantId to determine which link is primary */
  variantId?: string;
}

export default function Lightbox({
  open,
  files,
  links,
  currentIndex,
  onClose,
  onChangeIndex,
  onTogglePrimary,
  onDelete,
  variantId,
}: LightboxProps) {
  const { t } = useLanguage();
  const file = files[currentIndex];

  const total = files.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const goPrev = useCallback(() => {
    if (!isFirst) onChangeIndex(currentIndex - 1);
  }, [isFirst, currentIndex, onChangeIndex]);

  const goNext = useCallback(() => {
    if (!isLast) onChangeIndex(currentIndex + 1);
  }, [isLast, currentIndex, onChangeIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goPrev, goNext, onClose]);

  if (!file) return null;

  const isPrimary =
    variantId &&
    links.some((l) => l.fileId === file.id && l.variantId === variantId && l.isPrimary);

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="centered"
      width="xl"
      height="auto"
      closeOnBackdropClick
      closeOnEsc
      showCloseButton
      contentClassName="p-0 overflow-hidden"
      className="bg-black/80 backdrop-blur-md"
    >
      <div className="relative flex flex-col items-center justify-center min-h-[50vh] max-h-[85vh]">
        {/* Image */}
        <img
          src={file.url}
          alt={file.originalName}
          className="max-w-full max-h-[70vh] object-contain rounded-md"
          loading="eager"
        />

        {/* Top bar: counter + actions */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-black/60 text-white text-xs font-medium pointer-events-auto">
            {currentIndex + 1} / {total}
          </span>
          <div className="flex items-center gap-2 pointer-events-auto">
            {onTogglePrimary && variantId && (
              <button
                onClick={() => onTogglePrimary(file.id, variantId)}
                className={`p-2 rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${
                  isPrimary ? 'text-yellow-400' : ''
                }`}
                title={t('media.primary')}
              >
                <Star className="w-4 h-4" fill={isPrimary ? 'currentColor' : 'none'} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(file.id)}
                className="p-2 rounded-full bg-black/60 text-white transition-colors hover:bg-danger/80"
                title={t('media.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <a
              href={file.url}
              download={file.originalName}
              className="p-2 rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              title={t('media.download')}
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={isFirst}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('media.prev')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              disabled={isLast}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('media.next')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Filename */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white/80 text-xs">
          <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{file.originalName}</span>
          <span className="flex-shrink-0 ml-auto">{formatSize(file.sizeBytes)}</span>
        </div>
      </div>
    </Modal>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
