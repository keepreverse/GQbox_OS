import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import {
  Upload,
  Grid,
  List,
  FileImage,
  Trash2,
  Download,
  Check,
  Loader2,
  X as XIcon,
  AlertCircle,
  ImagePlus,
  Unlink,
  Link as LinkIcon,
  Star,
} from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import { useLanguage } from '@context/LanguageContext';
import { useLayout } from '@context/LayoutContext';
import Modal from '@components/ui/Modal';
import { ResponsiveTable } from '@components/ui/ResponsiveTable';
import ProductSelector from '@components/ui/ProductSelector';
import Lightbox from '@components/ui/Lightbox';
import ConfirmModal from '@components/ui/ConfirmModal';
import ProductDetailCard from '@features/product-detail/ProductDetailCard';
import { useDataSourceVersion } from '@api/dataSourceContext';
import type { Column } from '@app-types/table';
import type { MediaFile, ProductWithRelations } from '@app-types';
import { formatBytes, getMediaUrl } from '@utils/media';
import { uploadDiagnostics } from '@utils/uploadDiagnostics';

// --- DRAG & DROP ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type MediaFileWithLinks = MediaFile & { linkedSkus?: string[] };

interface UploadDraft {
  id: string;
  file: File;
  previewUrl: string;
  error?: string;
  uploading?: boolean;
  isPrimary?: boolean;
}

interface SortableDraftProps {
  draft: UploadDraft;
  onRemove: (id: string) => void;
  onTogglePrimary: (id: string) => void;
}

function SortableDraft({ draft, onRemove, onTogglePrimary }: SortableDraftProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: draft.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative rounded-lg overflow-hidden border bg-bg-tertiary select-none cursor-grab touch-none transition-shadow ${
        draft.error ? 'border-danger/40' : 'border-border-subtle'
      } ${isDragging ? 'opacity-90 scale-[1.03]' : 'opacity-100'}`}
    >
      <div className="aspect-square bg-bg-tertiary flex items-center justify-center overflow-hidden">
        <img
          src={draft.previewUrl}
          alt={draft.file.name}
          className="w-full h-full object-cover"
        />
      </div>

      {draft.uploading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      <div className="absolute top-1 left-1 right-1 flex items-start justify-between gap-1">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePrimary(draft.id);
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            draft.isPrimary
              ? 'bg-black/60 text-yellow-400'
              : 'bg-black/40 text-white/60 hover:text-yellow-400 hover:bg-black/60'
          }`}
          title={draft.isPrimary ? 'Primary' : 'Set as primary'}
        >
          <Star className="w-3 h-3" fill={draft.isPrimary ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(draft.id);
          }}
          className="w-6 h-6 rounded-full bg-bg-tertiary/80 text-text-tertiary hover:text-danger flex items-center justify-center transition-colors cursor-pointer"
        >
          <XIcon className="w-3 h-3" />
        </button>
      </div>

      <div className="p-1.5 bg-bg-tertiary h-full">
        <p className="text-[10px] font-medium truncate" title={draft.file.name}>
          {draft.file.name}
        </p>
        <p className="text-[9px] text-text-tertiary truncate">
          {formatBytes(draft.file.size)}
        </p>
        {draft.error && (
          <p className="text-[9px] text-danger truncate flex items-center gap-1 mt-0.5" title={draft.error}>
            <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
            {draft.error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MediaManager() {
  const { t } = useLanguage();
  const { isMobile } = useLayout();
  const { ds, version } = useDataSourceVersion('products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const { toasts, showToast, dismiss } = useToast();

  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithRelations[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<{ fileId: string; variantId: string } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);

  const allMedia = useMemo(() => ds.products.getAllMedia() as MediaFileWithLinks[], [ds, version]);
  const products = useMemo(() => ds.products.list, [ds, version]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setUploadDrafts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const closeUpload = useCallback(() => {
    setShowUpload(false);
    setUploadDrafts((prev) => {
      for (const d of prev) {
        try { URL.revokeObjectURL(d.previewUrl); } catch { /* ignore */ }
      }
      return [];
    });
    setSelectedProducts([]);
    setIsDraggingFile(false);
  }, []);

  const openUpload = useCallback(() => {
    setShowUpload(true);
  }, []);

  useEffect(() => {
    return () => {
      setUploadDrafts((prev) => {
        for (const d of prev) {
          try { URL.revokeObjectURL(d.previewUrl); } catch { /* ignore */ }
        }
        return prev;
      });
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allMedia.filter((m) => m.id);
    return allMedia.filter((m) => {
      if (!m.id) return false;
      return (
        m.filename.toLowerCase().includes(q) ||
        m.originalName.toLowerCase().includes(q) ||
        (m.linkedSkus ?? []).some((variantId) => {
          const p = products.find((p) => p.id === variantId);
          return (p?.sku ?? variantId).toLowerCase().includes(q);
        })
      );
    });
  }, [allMedia, searchQuery, products]);

  const counts = useMemo(
    () => ({
      total: allMedia.filter((m) => m.id).length,
      images: allMedia.filter((m) => m.id && m.mimeType.startsWith('image/')).length,
    }),
    [allMedia]
  );

  const toggleSelect = useCallback((id: string) => {
    if (!id) return;
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedItems([]), []);

  const onFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      const newDrafts: UploadDraft[] = [];
      for (const f of arr) {
        if (!/^image\//.test(f.type)) {
          showToast(`${f.name}: ${t('media.toast.unsupported_type')}`, 'error');
          continue;
        }
        uploadDiagnostics.record('file-selected', { name: f.name, size: f.size });
        const previewUrl = URL.createObjectURL(f);
        uploadDiagnostics.record('preview-generated', { name: f.name });
        newDrafts.push({
          id: crypto.randomUUID(),
          file: f,
          previewUrl,
        });
      }
      if (newDrafts.length > 0) {
        setUploadDrafts((prev) => [...prev, ...newDrafts]);
      }
    },
    [showToast, t]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
      if (e.dataTransfer?.files) onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const onPickFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) onFiles(e.target.files);
      e.target.value = '';
    },
    [onFiles]
  );

  const removeDraft = useCallback((id: string) => {
    setUploadDrafts((prev) => {
      const next = [...prev];
      const idx = next.findIndex((d) => d.id === id);
      if (idx !== -1) {
        const [removed] = next.splice(idx, 1);
        if (removed) {
          try { URL.revokeObjectURL(removed.previewUrl); } catch { /* ignore */ }
        }
      }
      return next;
    });
  }, []);

  const submitUpload = useCallback(async () => {
    if (uploadDrafts.length === 0) {
      showToast(t('media.toast.no_files'), 'error');
      return;
    }
    const variantIds = selectedProducts.map((p) => p.id);
    if (variantIds.length === 0) {
      showToast(t('media.toast.no_products'), 'error');
      return;
    }
    setIsUploading(true);
    ds.beginBatch();
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < uploadDrafts.length; i++) {
        const d = uploadDrafts[i];
        setUploadDrafts((prev) =>
          prev.map((x, idx) => (idx === i ? { ...x, uploading: true, error: undefined } : x))
        );
        uploadDiagnostics.record('upload-started', { name: d.file.name });
        try {
          const result = await ds.products.uploadMedia(d.file, {
            variantIds,
            isPrimary: !!d.isPrimary,
          });
          uploadDiagnostics.record('upload-completed', { name: d.file.name, fileId: result.file.id });
          uploadDiagnostics.record('server-response', { fileId: result.file.id, links: result.links.length });
          okCount += result.links.length;
          setUploadDrafts((prev) =>
            prev.map((x, idx) => (idx === i ? { ...x, uploading: false } : x))
          );
        } catch (err) {
          failCount++;
          const msg = err instanceof Error ? err.message : String(err);
          uploadDiagnostics.record('upload-completed', { name: d.file.name }, msg);
          setUploadDrafts((prev) =>
            prev.map((x, idx) => (idx === i ? { ...x, uploading: false, error: msg } : x))
          );
        }
      }
    } finally {
      ds.endBatch();
    }
    setIsUploading(false);
    if (okCount > 0) {
      showToast(t('media.toast.uploaded'), 'success');
    }
    if (failCount > 0) {
      showToast(t('media.toast.upload_failed'), 'error');
      uploadDiagnostics.dump();
    }
    if (failCount === 0) {
      closeUpload();
    }
  }, [uploadDrafts, selectedProducts, ds.products, showToast, t, closeUpload]);

  const handleTrashSelected = useCallback(async () => {
    if (selectedItems.length === 0) return;
    const ids = [...selectedItems].filter(Boolean);
    if (ids.length === 0) return;
    setSelectedItems([]);
    ds.beginBatch();
    try {
      for (const id of ids) {
        try {
          await ds.products.deleteMedia(id);
        } catch (err) {
          console.error('Delete failed', id, err);
        }
      }
    } finally {
      ds.endBatch();
    }
    showToast(t('media.toast.deleted') + ` ${ids.length}`);
  }, [selectedItems, ds, showToast, t]);

  const handleDownloadSelected = useCallback(() => {
    if (selectedItems.length === 0) return;
    const items = selectedItems
      .map((id) => allMedia.find((m) => m.id === id))
      .filter(Boolean) as MediaFileWithLinks[];
    let downloaded = 0;
    for (const m of items) {
      const url = getMediaUrl(m.url);
      if (!url) continue;
      const a = document.createElement('a');
      a.href = url;
      a.download = m.originalName || `${m.id}`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      downloaded++;
    }
    showToast(t('media.toast.downloading') + ` ${downloaded}`);
  }, [selectedItems, allMedia, showToast, t]);

  const handleDeleteOne = useCallback(
    async (fileId: string) => {
      try {
        await ds.products.deleteMedia(fileId);
        showToast(t('media.toast.deleted') + ' 1');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    },
    [ds.products, showToast, t]
  );

  const handleUnlinkOne = useCallback(
    async (fileId: string, variantId: string) => {
      try {
        if (ds.products.deleteMediaLink) {
          await ds.products.deleteMediaLink(fileId, variantId);
        } else {
          throw new Error('deleteMediaLink not supported');
        }
        showToast(t('media.toast.unlinked') + ' 1');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    },
    [ds.products, showToast, t]
  );

  const handleClearAll = useCallback(async () => {
    try {
      await ds.products.deleteAllMedia();
      setSelectedItems([]);
      showToast(t('media.toast.all_deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  }, [ds.products, showToast, t]);

  const handleTogglePrimary = useCallback((id: string) => {
    setUploadDrafts((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1) return prev;
      // Toggle: если уже главное — снимаем флаг (ни одна не главная).
      // Иначе — назначаем это главным, остальные сбрасываем.
      if (prev[idx].isPrimary) {
        return prev.map((d) => ({ ...d, isPrimary: false }));
      }
      return prev.map((d) => ({ ...d, isPrimary: d.id === id }));
    });
  }, []);

  const handleDetailClose = useCallback(() => setSelectedProduct(null), []);

  const handleSkuClick = useCallback(
    (variantId: string) => {
      const product = products.find((p) => p.id === variantId);
      if (product) setSelectedProduct(product);
    },
    [products]
  );

  const skuLabel = useCallback(
    (variantId: string) => {
      const product = products.find((p) => p.id === variantId);
      return product?.sku ?? variantId;
    },
    [products]
  );

  const handleDownloadOne = useCallback(
    (m: MediaFileWithLinks) => {
      const url = getMediaUrl(m.url);
      if (!url) {
        showToast(t('media.toast.no_url'), 'error');
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = m.originalName || `${m.id}`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [showToast, t]
  );

  const mediaColumns: Column<MediaFileWithLinks>[] = [
    {
      key: 'file',
      header: t('media.col.file'),
      width: 32,
      cell: (m) => {
        return (
          <div
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const idx = filtered.findIndex((f) => f.id === m.id);
              if (idx !== -1) setLightboxIndex(idx);
            }}
          >
            <FileImage className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" />
            <span className="truncate text-[11px] sm:text-sm" title={m.originalName}>
              {m.originalName}
            </span>
          </div>
        );
      },
    },
    {
      key: 'links',
      header: t('media.col.links'),
      width: 26,
      cell: (m) => (
        <div className="flex flex-wrap gap-1">
          {(m.linkedSkus ?? []).length === 0 && (
            <span className="text-[11px] text-text-tertiary">{t('media.no_links')}</span>
          )}
          {(m.linkedSkus ?? []).map((variantId) => (
            <button
              key={variantId}
              onClick={(e) => { e.stopPropagation(); handleSkuClick(variantId); }}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-secondary hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors cursor-pointer"
              title={variantId}
            >
              <LinkIcon className="w-2.5 h-2.5" />
              {skuLabel(variantId)}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: 'size',
      header: t('media.col.size'),
      width: 12,
      nowrap: true,
      hideBelow: 'md',
      cell: (m) => (
        <span className="text-[11px] sm:text-xs text-text-secondary truncate block">
          {formatBytes(m.sizeBytes)}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('media.col.date'),
      width: 12,
      nowrap: true,
      cell: (m) => (
        <span className="text-[11px] sm:text-xs text-text-tertiary truncate block">
          {m.createdAt?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('media.col.actions'),
      width: 18,
      align: 'right',
      cell: (m) => (
        <div className="flex items-center justify-end gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadOne(m);
            }}
            title={t('media.toast.download_item')}
            aria-label={t('media.toast.download_item')}
          >
            <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(m.id);
            }}
            title={t('media.toast.deleting_item')}
            aria-label={t('media.toast.deleting_item')}
          >
            <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const renderListCards = () => (
    <div className="space-y-2">
      {filtered.map((item) => {
        const isSelected = selectedItems.includes(item.id);
        const playableUrl = getMediaUrl(item.url);
        return (
          <div
            key={item.id}
            onClick={() => toggleSelect(item.id)}
            className={`glass rounded-xl p-3 flex items-start justify-between gap-2 cursor-pointer animate-card-in ${
              isSelected ? '!bg-accent/10' : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const idx = filtered.findIndex((f) => f.id === item.id);
                if (idx !== -1) setLightboxIndex(idx);
              }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-bg-tertiary border border-border-subtle flex-shrink-0 flex items-center justify-center hover:border-border-default transition-colors cursor-pointer"
              aria-label={t('media.preview')}
            >
              {playableUrl ? (
                <img
                  src={playableUrl}
                  alt={item.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <FileImage className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-sm font-medium truncate" title={item.originalName}>
                  {item.originalName}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-text-tertiary">{formatBytes(item.sizeBytes)}</span>
                <span className="text-[10px] text-text-muted">{item.createdAt?.slice(0, 10)}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(item.linkedSkus ?? []).length === 0 && (
                  <span className="text-[10px] text-text-tertiary">{t('media.no_links')}</span>
                )}
                {(item.linkedSkus ?? []).map((variantId) => (
                    <span
                      key={variantId}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-secondary"
                      title={variantId}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSkuClick(variantId); }}
                        className="flex items-center gap-1 hover:text-accent transition-colors cursor-pointer"
                      >
                        <LinkIcon className="w-2.5 h-2.5" />
                        {skuLabel(variantId)}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmUnlink({ fileId: item.id, variantId });
                        }}
                        className="ml-0.5 p-0.5 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary transition-colors cursor-pointer"
                        title={t('media.unlink')}
                      >
                        <Unlink className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadOne(item);
                }}
                className="p-1.5 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer"
                aria-label="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(item.id);
                }}
                className="p-1.5 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary transition-colors cursor-pointer"
                aria-label="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="py-10 flex flex-col items-center gap-2">
          <FileImage className="w-8 h-8 text-text-muted" />
          <span className="text-xs text-text-tertiary">{t('media.not_found')}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">
            {t('media.title')}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {counts.total} {t('media.subtitle')} · {counts.images} {t('media.images')}
          </p>
        </div>
        {allMedia.length > 0 && (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-danger/10 text-danger text-xs sm:text-sm hover:bg-danger/20 transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-danger/20 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" /> {t('media.clear_all')}
          </button>
        )}
        <button
          onClick={openUpload}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-accent/40 flex-shrink-0"
        >
          <Upload className="w-4 h-4" /> {t('media.upload')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 order-2 sm:order-1">
          <input
            type="text"
            placeholder={t('media.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 h-11 sm:h-10 text-text-primary"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto order-1 sm:order-2 pb-1 sm:pb-0">
          <div className="flex rounded-lg bg-bg-secondary border border-border-subtle p-0.5 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none ${
                viewMode === 'grid'
                  ? 'bg-accent/25 text-white border border-accent/40'
                  : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary border border-transparent'
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none ${
                viewMode === 'list'
                  ? 'bg-accent/25 text-white border border-accent/40'
                  : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary border border-transparent'
              }`}
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selection Bar */}
      <div
        className="grid transition-[grid-template-rows] duration-150"
        style={{ gridTemplateRows: selectedItems.length > 0 ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20 transition-opacity duration-150"
            style={{ opacity: selectedItems.length > 0 ? 1 : 0 }}
          >
            <span className="text-xs sm:text-sm text-accent font-medium">
              {selectedItems.length} {t('media.selected')}
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handleDownloadSelected}
                className="h-11 w-11 sm:h-9 sm:w-9 p-0 rounded hover:bg-accent/10 hover:text-text-primary text-accent transition-colors cursor-pointer flex items-center justify-center"
                title={t('media.download_selected')}
                aria-label={t('media.download_selected')}
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleTrashSelected}
                className="h-11 w-11 sm:h-9 sm:w-9 p-0 rounded hover:bg-danger/10 hover:text-text-primary text-danger transition-colors cursor-pointer flex items-center justify-center"
                title={t('media.delete_selected')}
                aria-label={t('media.delete_selected')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="h-11 sm:h-9 text-xs text-accent hover:bg-bg-hover hover:text-text-primary px-3 rounded transition-colors cursor-pointer"
              >
                {t('media.clear')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {filtered.map((item) => {
            const playableUrl = getMediaUrl(item.url);
            return (
              <div
                key={item.id}
                className={`glass group relative rounded-xl overflow-hidden border transition-[colors,opacity,transform,box-shadow] duration-150 cursor-pointer hover:-translate-y-0.5 hover:border-border-default`}
                onClick={() => toggleSelect(item.id)}
              >
                {selectedItems.includes(item.id) && (
                  <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-accent flex items-center justify-center shadow-sm z-10">
                    <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-bg-tertiary/80 backdrop-blur-sm border border-border-subtle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-hover cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = filtered.findIndex((f) => f.id === item.id);
                    if (idx !== -1) setLightboxIndex(idx);
                  }}
                  aria-label={t('media.preview')}
                  title={t('media.preview')}
                >
                  <ImagePlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-secondary" />
                </button>
                <div className="aspect-square bg-bg-tertiary flex items-center justify-center overflow-hidden">
                  {playableUrl ? (
                    <img
                      src={playableUrl}
                      alt={item.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <FileImage className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 text-text-muted group-hover:scale-110 transition-transform duration-300" />
                  )}
                </div>
                <div
                  className={`p-2 sm:p-2.5 md:p-3${
                    selectedItems.includes(item.id) ? ' !bg-accent/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] sm:text-xs font-medium truncate" title={item.originalName}>
                      {item.originalName}
                    </p>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-[10px] text-text-tertiary">{formatBytes(item.sizeBytes)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(item.linkedSkus ?? []).map((variantId) => (
                      <button
                        key={variantId}
                        onClick={(e) => { e.stopPropagation(); handleSkuClick(variantId); }}
                        className="inline-flex items-center gap-1 text-[9px] px-1 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-secondary hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors cursor-pointer"
                        title={variantId}
                      >
                        <LinkIcon className="w-2 h-2" />
                        {skuLabel(variantId)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3">
              <FileImage className="w-10 h-10 text-text-muted" />
              <span className="text-xs sm:text-sm text-text-tertiary">{t('media.not_found')}</span>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          <div className="hidden sm:block glass rounded-xl overflow-hidden">
            <ResponsiveTable
              columns={mediaColumns}
              rows={filtered}
              rowKey={(m) => m.id}
              minWidth={640}
              emptyMessage={
                <div className="flex flex-col items-center gap-2">
                  <FileImage className="w-8 h-8 text-text-muted" />
                  <span className="text-xs text-text-tertiary">{t('media.not_found')}</span>
                </div>
              }
              rowClassName={(m) =>
                `table-row-hover group cursor-pointer${
                  selectedItems.includes(m.id)
                    ? ' bg-accent/10 border-l-2 border-l-accent/40'
                    : ' border-l-2 border-l-transparent'
                }`
              }
              onRowClick={(m) => toggleSelect(m.id)}
            />
          </div>
          <div className="sm:hidden">{renderListCards()}</div>
        </>
      )}

      {/* Upload Modal */}
      <Modal
        variant="auto"
        width="lg"
        height="clamp(60dvh, 72dvh, 88dvh)"
        open={showUpload}
        onClose={closeUpload}
        title={t('media.upload_title')}
        icon={<Upload className="w-4 h-4 text-accent flex-shrink-0" />}
        ariaLabel={t('media.upload_title')}
        footer={
          <button
            type="button"
            onClick={submitUpload}
            disabled={
              isUploading ||
              uploadDrafts.length === 0 ||
              selectedProducts.length === 0
            }
            className="w-full min-h-[44px] py-2.5 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 disabled:opacity-50 disabled:cursor-not-allowed transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-accent/40 flex items-center justify-center gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading
              ? t('media.uploading')
              : selectedProducts.length === 0
                ? t('media.no_products')
                : t('media.upload_button')}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary mb-1.5 block">
              {t('media.select_products')}
            </label>
            <ProductSelector
              selected={selectedProducts}
              onChange={setSelectedProducts}
              placeholder={
                isMobile
                  ? t('media.product_search_mobile')
                  : t('media.product_search')
              }
            />
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 text-center transition-colors cursor-pointer ${
              isDraggingFile
                ? 'border-accent bg-accent/5'
                : 'border-border-default hover:border-accent/50'
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={onPickFiles}
            />
            <Upload
              className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 transition-colors ${
                isDraggingFile ? 'text-accent' : 'text-text-muted'
              }`}
            />
            <p className="text-[11px] sm:text-sm text-text-secondary">
              {t('media.drop_here')}
            </p>
            <p className="text-[9px] sm:text-xs text-text-tertiary mt-0.5 sm:mt-1">
              {t('media.click_browse')}
            </p>
          </div>

          {uploadDrafts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] sm:text-xs text-text-tertiary">
                {t('media.drafts_count').replace('{count}', String(uploadDrafts.length))}
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={uploadDrafts.map((d) => d.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {uploadDrafts.map((d) => (
                      <SortableDraft
                        key={d.id}
                        draft={d}
                        onRemove={removeDraft}
                        onTogglePrimary={handleTogglePrimary}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        files={filtered}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onChangeIndex={setLightboxIndex}
        onDelete={(fileId) => setConfirmDelete(fileId)}
      />

      {/* Confirm Delete */}
      <ConfirmModal
        open={!!confirmDelete}
        title={t('media.confirm_delete_title')}
        description={t('media.confirm_delete_desc')}
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) {
            handleDeleteOne(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm Unlink */}
      <ConfirmModal
        open={!!confirmUnlink}
        title={t('media.confirm_unlink_title')}
        description={t('media.confirm_unlink_desc')}
        variant="warning"
        onConfirm={() => {
          if (confirmUnlink) {
            handleUnlinkOne(confirmUnlink.fileId, confirmUnlink.variantId);
            setConfirmUnlink(null);
          }
        }}
        onCancel={() => setConfirmUnlink(null)}
      />

      {/* Confirm Clear All */}
      <ConfirmModal
        open={confirmClearAll}
        title={t('media.confirm_clear_all_title')}
        description={t('media.confirm_clear_all_desc')}
        variant="danger"
        onConfirm={() => {
          setConfirmClearAll(false);
          handleClearAll();
        }}
        onCancel={() => setConfirmClearAll(false)}
      />

      {/* Product Detail Card */}
      {selectedProduct && (
        <div className="animate-fade-in-fast">
          <ProductDetailCard product={selectedProduct} onClose={handleDetailClose} />
        </div>
      )}
    </div>
  );
}
