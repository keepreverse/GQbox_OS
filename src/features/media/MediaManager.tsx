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
  FileVideo,
  Trash2,
  Download,
  Check,
  Star,
  Loader2,
  X as XIcon,
  AlertCircle,
  ImagePlus,
} from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import { useLanguage } from '@context/LanguageContext';
import { useLayout } from '@context/LayoutContext';
import Modal from '@components/ui/Modal';
import { ResponsiveTable } from '@components/ui/ResponsiveTable';
import ProductSelector from '@components/ui/ProductSelector';
import { useDataSource } from '@api/dataSourceContext';
import type { Column } from '@app-types/table';
import type { ProductMedia, ProductWithRelations } from '@app-types';
import { formatBytes, getMediaUrl, hasPlayableUrl } from '@utils/media';

// --- ИМПОРТЫ ДЛЯ ИДЕАЛЬНОГО DRAG & DROP ---
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

type MediaItem = ProductMedia & {
  _localUrl?: string;
};

interface UploadDraft {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
  error?: string;
  uploading?: boolean;
}

// Компонент перетаскиваемой карточки
interface SortableDraftProps {
  draft: UploadDraft;
  onTogglePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  t: any;
}

function SortableDraft({ draft, onTogglePrimary, onRemove, t }: SortableDraftProps) {
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
    // Легкий скейл и тень дают ощущение "поднятой" карточки
    boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative rounded-lg overflow-hidden border bg-bg-tertiary select-none cursor-grab touch-none transition-shadow ${
        draft.error
          ? 'border-danger/40'
          : draft.isPrimary
            ? 'border-warning/50'
            : 'border-border-subtle'
      } ${isDragging ? 'opacity-90 scale-[1.03]' : 'opacity-100'}`}
    >
      <div className="aspect-square bg-bg-tertiary flex items-center justify-center overflow-hidden">
        {draft.file.type.startsWith('image/') ? (
          <img
            src={draft.previewUrl}
            alt={draft.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={draft.previewUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        )}
      </div>
      
      {draft.uploading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {/* Кнопки действий: останавливаем Pointer Events, чтобы они нажимались, а не тащили карточку */}
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
              ? 'bg-warning text-white'
              : 'bg-bg-tertiary/80 text-text-tertiary hover:text-warning'
          }`}
          title={t('media.set_primary')}
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
  const ds = useDataSource();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithRelations[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  const allMedia: MediaItem[] = ds.products.getAllMedia();
  const products: ProductWithRelations[] = ds.products.list;

  const productById = useMemo(() => {
    const m = new Map<string, ProductWithRelations>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  // Настройка сенсоров Dnd-Kit (позволяет кликать по кнопкам без срабатывания драга)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Нужно сдвинуть мышь на 5px, чтобы начать перетаскивание
      },
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

  useEffect(() => {
    if (!previewMedia) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewMedia(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewMedia]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMedia.filter((m) => {
      if (!m.id) return false;
      const product = productById.get(m.variantId);
      const sku = product?.sku ?? '';
      const productName = product?.productName ?? '';
      const matchesSearch =
        !q ||
        m.fileName.toLowerCase().includes(q) ||
        sku.toLowerCase().includes(q) ||
        productName.toLowerCase().includes(q);
      const matchesType = filterType === 'all' || m.mediaType === filterType;
      return matchesSearch && matchesType;
    });
  }, [allMedia, searchQuery, filterType, productById]);

  const counts = useMemo(
    () => ({
      total: allMedia.filter((m) => m.id).length,
      images: allMedia.filter((m) => m.id && m.mediaType === 'image').length,
      videos: allMedia.filter((m) => m.id && m.mediaType === 'video').length,
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
        if (!/^image\/|^video\//.test(f.type)) {
          showToast(`${f.name}: ${t('media.toast.unsupported_type')}`, 'error');
          continue;
        }
        newDrafts.push({
          id: crypto.randomUUID(),
          file: f,
          previewUrl: URL.createObjectURL(f),
          isPrimary: false,
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
      const idx = next.findIndex(d => d.id === id);
      if (idx !== -1) {
        const [removed] = next.splice(idx, 1);
        if (removed) {
          try { URL.revokeObjectURL(removed.previewUrl); } catch { /* ignore */ }
        }
      }
      return next;
    });
  }, []);

  const toggleDraftPrimary = useCallback((id: string) => {
    setUploadDrafts((prev) =>
      prev.map((d) => {
        if (d.id === id) return { ...d, isPrimary: !d.isPrimary };
        return { ...d, isPrimary: false };
      })
    );
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
    const primaryIdx = uploadDrafts.findIndex((d) => d.isPrimary);
    const effectivePrimary = primaryIdx >= 0 ? primaryIdx : 0;
    ds.beginBatch();
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < uploadDrafts.length; i++) {
        const d = uploadDrafts[i];
        setUploadDrafts((prev) =>
          prev.map((x, idx) => (idx === i ? { ...x, uploading: true, error: undefined } : x))
        );
        try {
          const result = await ds.products.uploadMedia(d.file, {
            variantIds,
            isPrimary: i === effectivePrimary,
          });
          okCount += result.mediaItems.length;
          setUploadDrafts((prev) =>
            prev.map((x, idx) => (idx === i ? { ...x, uploading: false } : x))
          );
        } catch (err) {
          failCount++;
          const msg = err instanceof Error ? err.message : String(err);
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
      .filter(Boolean) as MediaItem[];
    let downloaded = 0;
    for (const m of items) {
      const url = getMediaUrl(m.url);
      if (!url) continue;
      const a = document.createElement('a');
      a.href = url;
      a.download = m.fileName || `${m.id}`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      downloaded++;
    }
    showToast(t('media.toast.downloading') + ` ${downloaded}`);
  }, [selectedItems, allMedia, showToast, t]);

  const handleSetPrimary = useCallback(
    async (id: string) => {
      try {
        await ds.products.setMediaPrimary(id);
        showToast(t('media.toast.primary_set'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    },
    [ds.products, showToast, t]
  );

  const handleDeleteOne = useCallback(
    async (m: MediaItem) => {
      try {
        await ds.products.deleteMedia(m.id);
        showToast(t('media.toast.deleted') + ' 1');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    },
    [ds.products, showToast, t]
  );

  const handleDownloadOne = useCallback(
    (m: MediaItem) => {
      const url = getMediaUrl(m.url);
      if (!url) {
        showToast(t('media.toast.no_url'), 'error');
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = m.fileName || `${m.id}`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [showToast, t]
  );

  const mediaColumns: Column<MediaItem>[] = [
    {
      key: 'file',
      header: t('media.col.file'),
      width: 30,
      cell: (m) => {
        const product = productById.get(m.variantId);
        const productName = product?.productName ?? m.variantId;
        return (
          <div
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewMedia(m);
            }}
          >
            {m.mediaType === 'image' ? (
              <FileImage className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" />
            ) : (
              <FileVideo className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" />
            )}
            <span className="truncate text-[11px] sm:text-sm" title={m.fileName}>
              {m.fileName}
            </span>
            {m.isPrimary && (
              <Star className="w-3 h-3 text-warning flex-shrink-0" fill="currentColor" />
            )}
            <span className="hidden lg:inline text-[10px] text-text-tertiary truncate">
              · {productName}
            </span>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: t('media.col.type'),
      width: 16,
      nowrap: true,
      cell: (m) => (
        <span
          className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded inline-block truncate max-w-full ${
            m.mediaType === 'image' ? 'bg-accent/10 text-accent' : 'bg-info/10 text-info'
          }`}
        >
          {m.mediaType === 'image' ? t('media.image_label') : t('media.video_label')}
        </span>
      ),
    },
    {
      key: 'sku',
      header: t('media.col.sku'),
      width: 18,
      cell: (m) => {
        const product = productById.get(m.variantId);
        return (
          <span className="truncate block text-[11px] sm:text-xs text-accent" title={product?.sku}>
            {product?.sku ?? m.variantId}
          </span>
        );
      },
    },
    {
      key: 'size',
      header: t('media.col.size'),
      width: 11,
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
      width: 11,
      nowrap: true,
      cell: (m) => (
        <span className="text-[11px] sm:text-xs text-text-tertiary truncate block">
          {m.uploadedAt?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('media.col.actions'),
      width: 14,
      align: 'right',
      cell: (m) => (
        <div className="flex items-center justify-end gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
          {!m.isPrimary && (
            <button
              className="p-1 rounded hover:bg-warning/10 hover:text-warning text-text-tertiary transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleSetPrimary(m.id);
              }}
              title={t('media.set_primary')}
              aria-label={t('media.set_primary')}
            >
              <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
          )}
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
              handleDeleteOne(m);
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
        const product = productById.get(item.variantId);
        const productName = product?.productName ?? item.variantId;
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
                setPreviewMedia(item);
              }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-bg-tertiary border border-border-subtle flex-shrink-0 flex items-center justify-center hover:border-border-default transition-colors"
              aria-label="Preview"
            >
              {playableUrl && item.mediaType === 'image' ? (
                <img
                  src={playableUrl}
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : playableUrl && item.mediaType === 'video' ? (
                <video
                  src={playableUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : item.mediaType === 'image' ? (
                <FileImage className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
              ) : (
                <FileVideo className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                {item.isPrimary && (
                  <Star className="w-3 h-3 text-warning flex-shrink-0" fill="currentColor" />
                )}
                <p className="text-sm font-medium truncate" title={item.fileName}>
                  {item.fileName}
                </p>
              </div>
              <p className="text-[11px] text-accent truncate" title={product?.sku}>
                {product?.sku ?? item.variantId} · {productName}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded inline-block ${
                    item.mediaType === 'image' ? 'bg-accent/10 text-accent' : 'bg-info/10 text-info'
                  }`}
                >
                  {item.mediaType === 'image' ? t('media.image_label') : t('media.video_label')}
                </span>
                <span className="text-[10px] text-text-tertiary">{formatBytes(item.sizeBytes)}</span>
                <span className="text-[10px] text-text-muted">{item.uploadedAt?.slice(0, 10)}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {!item.isPrimary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(item.id);
                  }}
                  className="p-1.5 rounded hover:bg-warning/10 hover:text-warning text-text-tertiary transition-colors cursor-pointer"
                  aria-label={t('media.set_primary')}
                  title={t('media.set_primary')}
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
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
                  handleDeleteOne(item);
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
      <Toast data={toast} onClose={hideToast} />

      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">
            {t('media.title')}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {counts.total} {t('media.subtitle')} · {counts.images} {t('media.images')} ·{' '}
            {counts.videos} {t('media.videos')}
          </p>
        </div>
        <button
          onClick={openUpload}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40 flex-shrink-0"
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
          {(['all', 'image', 'video'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`h-11 sm:h-9 px-3 rounded-lg text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer whitespace-nowrap ${
                filterType === type
                  ? 'bg-accent/25 text-white border border-accent/40'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
              }`}
            >
              {type === 'all'
                ? t('media.all')
                : type === 'image'
                  ? t('media.photos')
                  : t('media.videos_label')}
            </button>
          ))}
          <div className="flex rounded-lg bg-bg-secondary border border-border-subtle p-0.5 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-accent/25 text-white border border-accent/40'
                  : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-accent/25 text-white border border-accent/40'
                  : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
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
        className="grid transition-all duration-150"
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
            const product = productById.get(item.variantId);
            const playableUrl = getMediaUrl(item.url);
            return (
              <div
                key={item.id}
                className={`glass group relative rounded-xl overflow-hidden border transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:border-border-default`}
                onClick={() => toggleSelect(item.id)}
              >
                <button
                  type="button"
                  className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-bg-tertiary/80 backdrop-blur-sm border border-border-subtle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-hover"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMedia(item);
                  }}
                  aria-label="Preview"
                  title="Preview"
                >
                  <ImagePlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-secondary" />
                </button>
                <div className="aspect-square bg-bg-tertiary flex items-center justify-center overflow-hidden">
                  {playableUrl && item.mediaType === 'image' ? (
                    <img
                      src={playableUrl}
                      alt={item.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : playableUrl && item.mediaType === 'video' ? (
                    <video
                      src={playableUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : item.mediaType === 'image' ? (
                    <FileImage className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 text-text-muted group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <FileVideo className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 text-text-muted group-hover:scale-110 transition-transform duration-300" />
                  )}
                  {item.mediaType === 'video' && playableUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className={`p-2 sm:p-2.5 md:p-3${
                    selectedItems.includes(item.id) ? ' !bg-accent/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {item.isPrimary && (
                      <Star className="w-3 h-3 text-warning flex-shrink-0" fill="currentColor" />
                    )}
                    <p className="text-[11px] sm:text-xs font-medium truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-1">
                    <span className="text-[10px] text-text-tertiary">{formatBytes(item.sizeBytes)}</span>
                    <span className="text-[10px] text-text-muted truncate max-w-[80px]" title={product?.sku}>
                      {product?.sku ?? item.variantId}
                    </span>
                  </div>
                </div>
                {selectedItems.includes(item.id) && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-accent flex items-center justify-center shadow-sm z-10">
                    <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white" />
                  </div>
                )}
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
            className="w-full min-h-[44px] py-2.5 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer font-medium border border-accent/40 flex items-center justify-center gap-2"
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
              accept="image/*,video/*"
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
              
              {/* МАГИЯ DND-KIT ДЛЯ СЕТКИ */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={uploadDrafts.map((d) => d.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {uploadDrafts.map((d) => (
                      <SortableDraft 
                        key={d.id} 
                        draft={d} 
                        onTogglePrimary={toggleDraftPrimary} 
                        onRemove={removeDraft} 
                        t={t} 
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
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-card-in"
          onClick={() => setPreviewMedia(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewMedia(null)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 rounded-full bg-bg-tertiary/80 backdrop-blur-sm border border-border-subtle text-text-primary hover:bg-bg-hover flex items-center justify-center transition-colors z-10"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
          {hasPlayableUrl(previewMedia) ? (
            previewMedia.mediaType === 'image' ? (
              <img
                src={getMediaUrl(previewMedia.url)}
                alt={previewMedia.fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={getMediaUrl(previewMedia.url)}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )
          ) : (
            <div className="text-center text-text-muted">
              {previewMedia.mediaType === 'image' ? (
                <FileImage className="w-16 h-16 mx-auto mb-2" />
              ) : (
                <FileVideo className="w-16 h-16 mx-auto mb-2" />
              )}
              <p className="text-sm">{t('media.toast.no_url')}</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 px-3 py-2 rounded-lg bg-bg-tertiary/85 backdrop-blur-sm border border-border-subtle text-text-primary text-xs flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto">
            {previewMedia.isPrimary && (
              <Star className="w-3.5 h-3.5 text-warning flex-shrink-0" fill="currentColor" />
            )}
            <span className="truncate flex-1" title={previewMedia.fileName}>
              {previewMedia.fileName}
            </span>
            <span className="text-text-tertiary text-[10px] sm:text-xs flex-shrink-0">
              {formatBytes(previewMedia.sizeBytes)}
            </span>
            <span className="text-text-tertiary text-[10px] sm:text-xs flex-shrink-0 hidden sm:inline">
              {previewMedia.uploadedAt?.slice(0, 10)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadOne(previewMedia);
              }}
              className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex-shrink-0"
              aria-label="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}