import { useState, useCallback } from 'react';
import { Upload, Grid, List, FileImage, FileVideo, Trash2, Download, Check } from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import { useLanguage } from '@context/LanguageContext';
import { useLayout } from '@context/LayoutContext';
import Modal from '@components/ui/Modal';
import { ResponsiveTable } from '@components/ui/ResponsiveTable';
import type { Column } from '@app-types/table';

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  size: string;
  productSku: string;
  url: string;
  uploadedAt: string;
}

const initialMockMedia: MediaItem[] = [
  {
    id: 'm1',
    name: 'S10002E-01-hero.jpg',
    type: 'image',
    size: '2.4 MB',
    productSku: 'S10002E/01',
    url: '',
    uploadedAt: '2024-01-15',
  },
  {
    id: 'm2',
    name: 'S10002E-01-detail.jpg',
    type: 'image',
    size: '1.8 MB',
    productSku: 'S10002E/01',
    url: '',
    uploadedAt: '2024-01-15',
  },
  {
    id: 'm3',
    name: 'S19001-white-hero.jpg',
    type: 'image',
    size: '3.1 MB',
    productSku: 'S19001',
    url: '',
    uploadedAt: '2024-01-14',
  },
  {
    id: 'm4',
    name: 'S90501-station-360.mp4',
    type: 'video',
    size: '18.5 MB',
    productSku: 'S90501/02-W',
    url: '',
    uploadedAt: '2024-01-12',
  },
  {
    id: 'm5',
    name: 'S10011-PR-white.jpg',
    type: 'image',
    size: '2.2 MB',
    productSku: 'S10011-PR/02',
    url: '',
    uploadedAt: '2024-01-10',
  },
  {
    id: 'm6',
    name: 'S11007-TC-TC-black.jpg',
    type: 'image',
    size: '1.9 MB',
    productSku: 'S11007/01',
    url: '',
    uploadedAt: '2024-01-09',
  },
  {
    id: 'm7',
    name: 'S19036-RGB-demo.mp4',
    type: 'video',
    size: '24.1 MB',
    productSku: 'S19036/01',
    url: '',
    uploadedAt: '2024-01-08',
  },
  {
    id: 'm8',
    name: 'S98005-heart-pink.jpg',
    type: 'image',
    size: '1.5 MB',
    productSku: 'S98005/05-W',
    url: '',
    uploadedAt: '2024-01-07',
  },
];

export default function MediaManager() {
  const { t } = useLanguage();
  const { isMobile } = useLayout();
  const [mediaList, setMediaList] = useState<MediaItem[]>(initialMockMedia);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const closeUpload = useCallback(() => {
    setShowUpload(false);
  }, []);

  const openUpload = useCallback(() => {
    setShowUpload(true);
  }, []);

  // Форма загрузки
  const [uploadSku, setUploadSku] = useState('');
  const [fileName, setFileName] = useState('');

  const filtered = mediaList.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.productSku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleUpload = () => {
    const defaultName = fileName || `uploaded_asset_${Date.now()}.jpg`;
    const isVideo = defaultName.endsWith('.mp4') || defaultName.endsWith('.mov');

    const newItem: MediaItem = {
      id: `m_${Date.now()}`,
      name: defaultName,
      type: isVideo ? 'video' : 'image',
      size: `${(1 + Math.random() * 4).toFixed(1)} MB`,
      productSku: uploadSku || 'S10002E/01',
      url: '',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };

    setMediaList((prev) => [newItem, ...prev]);
    closeUpload();
    setUploadSku('');
    setFileName('');
    showToast(t('media.toast.uploaded') + ` "${defaultName}"`);
  };

  const handleTrashSelected = () => {
    setMediaList((prev) => prev.filter((m) => !selectedItems.includes(m.id)));
    showToast(t('media.toast.deleted') + ` ${selectedItems.length}`);
    setSelectedItems([]);
  };

  const handleDownloadSelected = () => {
    showToast(t('media.toast.downloading') + ` ${selectedItems.length}`);
  };

  const mediaColumns: Column<MediaItem>[] = [
    {
      key: 'file',
      header: t('media.col.file'),
      width: 30,
      cell: (m) => (
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title={m.name}>
          {m.type === 'image' ? (
            <FileImage className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" />
          ) : (
            <FileVideo className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" />
          )}
          <span className="truncate text-[11px] sm:text-sm">{m.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('media.col.type'),
      width: 16,
      nowrap: true,
      cell: (m) => (
        <span
          className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded inline-block truncate max-w-full ${
            m.type === 'image' ? 'bg-accent/10 text-accent' : 'bg-info/10 text-info'
          }`}
        >
          {m.type === 'image' ? t('media.image_label') : t('media.video_label')}
        </span>
      ),
    },
    {
      key: 'sku',
      header: t('media.col.sku'),
      width: 18,
      cell: (m) => (
        <span className="truncate block text-[11px] sm:text-xs text-accent" title={m.productSku}>
          {m.productSku}
        </span>
      ),
    },
    {
      key: 'size',
      header: t('media.col.size'),
      width: 11,
      nowrap: true,
      hideBelow: 'md',
      cell: (m) => (
        <span className="text-[11px] sm:text-xs text-text-secondary truncate block">{m.size}</span>
      ),
    },
    {
      key: 'date',
      header: t('media.col.date'),
      width: 11,
      nowrap: true,
      cell: (m) => (
        <span className="text-[11px] sm:text-xs text-text-tertiary truncate block">
          {m.uploadedAt}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('media.col.actions'),
      width: 14,
      align: 'right',
      cell: (m) => (
        <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              showToast(t('media.toast.download_item') + ` "${m.name}"...`);
            }}
          >
            <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setMediaList((prev) => prev.filter((x) => x.id !== m.id));
              showToast(t('media.toast.deleted') + ' 1');
            }}
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
        return (
          <div
            key={item.id}
            onClick={() => toggleSelect(item.id)}
            className={`glass rounded-xl p-3 flex items-start justify-between gap-2 cursor-pointer animate-card-in ${
              isSelected ? '!bg-accent/10' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                {item.type === 'image' ? (
                  <FileImage className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                ) : (
                  <FileVideo className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                )}
                <p className="text-sm font-medium truncate" title={item.name}>
                  {item.name}
                </p>
              </div>
              <p className="text-[11px] text-accent truncate" title={item.productSku}>
                {item.productSku}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded inline-block ${
                    item.type === 'image' ? 'bg-accent/10 text-accent' : 'bg-info/10 text-info'
                  }`}
                >
                  {item.type === 'image' ? t('media.image_label') : t('media.video_label')}
                </span>
                <span className="text-[10px] text-text-tertiary">{item.size}</span>
                <span className="text-[10px] text-text-muted">{item.uploadedAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showToast(t('media.toast.download_item') + ` "${item.name}"...`);
                }}
                className="p-1.5 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer"
                aria-label="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaList((prev) => prev.filter((m) => m.id !== item.id));
                  showToast(t('media.toast.deleted') + ' 1');
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
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('media.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {mediaList.length} {t('media.subtitle')} ·{' '}
            {mediaList.filter((m) => m.type === 'image').length} {t('media.images')} ·{' '}
            {mediaList.filter((m) => m.type === 'video').length} {t('media.videos')}
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
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${viewMode === 'grid' ? 'bg-accent/25 text-white border border-accent/40' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'}`}
              aria-label="Grid view"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${viewMode === 'list' ? 'bg-accent/25 text-white border border-accent/40' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'}`}
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
                onClick={() => setSelectedItems([])}
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
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`glass group relative rounded-xl overflow-hidden border transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:border-border-default`}
              onClick={() => toggleSelect(item.id)}
            >
              <div className="aspect-square bg-bg-tertiary flex items-center justify-center">
                {item.type === 'image' ? (
                  <FileImage className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 text-text-muted group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <FileVideo className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 text-text-muted group-hover:scale-110 transition-transform duration-300" />
                )}
              </div>
              <div
                className={`p-2 sm:p-2.5 md:p-3${selectedItems.includes(item.id) ? ' !bg-accent/10' : ''}`}
              >
                <p className="text-[11px] sm:text-xs font-medium truncate">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-text-tertiary">{item.size}</span>
                  <span className="text-[10px] text-text-muted truncate max-w-[80px]">
                    {item.productSku}
                  </span>
                </div>
              </div>
              {selectedItems.includes(item.id) && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-accent flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white" />
                </div>
              )}
            </div>
          ))}
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
                `table-row-hover group cursor-pointer${selectedItems.includes(m.id) ? ' bg-accent/10 border-l-2 border-l-accent/40' : ' border-l-2 border-l-transparent'}`
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
        width="md"
        open={showUpload}
        onClose={closeUpload}
        title={t('media.upload_title')}
        icon={<Upload className="w-4 h-4 text-accent flex-shrink-0" />}
        ariaLabel={t('media.upload_title')}
        footer={
          <button
            type="button"
            onClick={handleUpload}
            className="w-full min-h-[44px] py-2.5 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40"
          >
            {t('media.upload_button')}
          </button>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border-default rounded-xl p-6 sm:p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-text-secondary">{t('media.drop_here')}</p>
            <p className="text-[10px] sm:text-xs text-text-tertiary mt-1">
              {t('media.click_browse')}
            </p>
            {!isMobile && (
              <p className="text-[9px] sm:text-[10px] text-text-muted mt-3">
                {t('media.supported_formats')}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">
                {t('media.file_name')}
              </label>
              <input
                type="text"
                placeholder={
                  isMobile ? 'e.g., product_photo.jpg' : t('media.file_name_placeholder')
                }
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('media.sku_link')}</label>
              <input
                type="text"
                placeholder={isMobile ? 'e.g., S10002E/01' : t('media.sku_link_placeholder')}
                value={uploadSku}
                onChange={(e) => setUploadSku(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
