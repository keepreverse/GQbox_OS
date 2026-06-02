import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Grid, List,
  FileImage, FileVideo, MoreVertical, Trash2, Download,
  X, Check
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useLayout } from '../context/LayoutContext';
import BottomSheet from './BottomSheet';

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
  { id: 'm1', name: 'S10002E-01-hero.jpg', type: 'image', size: '2.4 MB', productSku: 'S10002E/01', url: '', uploadedAt: '2024-01-15' },
  { id: 'm2', name: 'S10002E-01-detail.jpg', type: 'image', size: '1.8 MB', productSku: 'S10002E/01', url: '', uploadedAt: '2024-01-15' },
  { id: 'm3', name: 'S19001-white-hero.jpg', type: 'image', size: '3.1 MB', productSku: 'S19001', url: '', uploadedAt: '2024-01-14' },
  { id: 'm4', name: 'S90501-station-360.mp4', type: 'video', size: '18.5 MB', productSku: 'S90501/02-W', url: '', uploadedAt: '2024-01-12' },
  { id: 'm5', name: 'S10011-PR-white.jpg', type: 'image', size: '2.2 MB', productSku: 'S10011-PR/02', url: '', uploadedAt: '2024-01-10' },
  { id: 'm6', name: 'S11007-TC-TC-black.jpg', type: 'image', size: '1.9 MB', productSku: 'S11007/01', url: '', uploadedAt: '2024-01-09' },
  { id: 'm7', name: 'S19036-RGB-demo.mp4', type: 'video', size: '24.1 MB', productSku: 'S19036/01', url: '', uploadedAt: '2024-01-08' },
  { id: 'm8', name: 'S98005-heart-pink.jpg', type: 'image', size: '1.5 MB', productSku: 'S98005/05-W', url: '', uploadedAt: '2024-01-07' },
];

export default function MediaManager() {
  const { t, language } = useLanguage();
  const { isMobile } = useLayout();
  const [mediaList, setMediaList] = useState<MediaItem[]>(initialMockMedia);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadClosing, setUploadClosing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const MODAL_CLOSE_MS = 150;

  const closeUpload = useCallback(() => {
    setUploadClosing(true);
    setTimeout(() => {
      setShowUpload(false);
      setUploadClosing(false);
    }, MODAL_CLOSE_MS);
  }, []);

  const openUpload = useCallback(() => {
    setUploadClosing(false);
    setShowUpload(true);
  }, []);

  // Форма загрузки
  const [uploadSku, setUploadSku] = useState('');
  const [fileName, setFileName] = useState('');

  const filtered = mediaList.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.productSku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

    setMediaList(prev => [newItem, ...prev]);
    closeUpload();
    setUploadSku('');
    setFileName('');
    showToast(language === 'ru' ? `Файл "${defaultName}" успешно загружен!` : `File "${defaultName}" successfully uploaded!`);
  };

  const handleTrashSelected = () => {
    setMediaList(prev => prev.filter(m => !selectedItems.includes(m.id)));
    showToast(language === 'ru' ? `Удалено файлов: ${selectedItems.length}` : `${selectedItems.length} files removed`);
    setSelectedItems([]);
  };

  const handleDownloadSelected = () => {
    showToast(language === 'ru' ? `Начато скачивание ${selectedItems.length} файлов...` : `Downloading ${selectedItems.length} files...`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-[60] flex items-center gap-2 p-3 rounded-lg bg-success text-white text-xs shadow-lg"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('media.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {mediaList.length} {t('media.subtitle')} · {mediaList.filter(m => m.type === 'image').length} {t('media.images')} · {mediaList.filter(m => m.type === 'video').length} {t('media.videos')}
          </p>
        </div>
        <button
          onClick={openUpload}
          className="flex items-center gap-2 min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-all self-start sm:self-auto cursor-pointer font-medium border border-accent/40"
        >
          <Upload className="w-4 h-4" /> {t('media.upload')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('media.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 h-11 sm:h-10 text-text-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-bg-secondary border border-border-subtle p-0.5">
            {(['all', 'image', 'video'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`h-11 sm:h-9 px-3 rounded-md text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                  filterType === type ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {type === 'all' ? t('media.all') : type === 'image' ? (language === 'ru' ? 'Фото' : 'Images') : (language === 'ru' ? 'Видео' : 'Videos')}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-bg-secondary border border-border-subtle p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${viewMode === 'grid' ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-tertiary'}`}
              aria-label="Grid view"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-md flex items-center justify-center transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${viewMode === 'list' ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-tertiary'}`}
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selection Bar — visible only when items selected, no space when empty */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
          <span className="text-xs sm:text-sm text-accent font-medium">
            {selectedItems.length} {t('media.selected')}
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleDownloadSelected}
              className="h-11 w-11 sm:h-9 sm:w-9 p-0 rounded hover:bg-accent/10 hover:text-text-primary text-accent transition-colors cursor-pointer flex items-center justify-center"
              title={language === 'ru' ? 'Скачать выбранные' : 'Download selected'}
              aria-label={language === 'ru' ? 'Скачать выбранные' : 'Download selected'}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTrashSelected}
              className="h-11 w-11 sm:h-9 sm:w-9 p-0 rounded hover:bg-danger/10 hover:text-text-primary text-danger transition-colors cursor-pointer flex items-center justify-center"
              title={language === 'ru' ? 'Удалить выбранные' : 'Delete selected'}
              aria-label={language === 'ru' ? 'Удалить выбранные' : 'Delete selected'}
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
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      selectedItems.includes(item.id)
                        ? 'border-accent ring-1 ring-accent/30'
                        : 'border-border-subtle hover:border-border-default'
              }`}
              onClick={() => toggleSelect(item.id)}
            >
              <div className="aspect-square bg-bg-tertiary flex items-center justify-center">
                {item.type === 'image' ? (
                  <FileImage className="w-8 sm:w-10 h-8 sm:h-10 text-text-muted group-hover:scale-110 transition-transform" />
                ) : (
                  <FileVideo className="w-8 sm:w-10 h-8 sm:h-10 text-text-muted group-hover:scale-110 transition-transform" />
                )}
              </div>
              <div className="p-2 sm:p-3">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] sm:text-[10px] text-text-tertiary">{item.size}</span>
                  <span className="text-[9px] sm:text-[10px] text-text-muted truncate max-w-[70px]">{item.productSku}</span>
                </div>
              </div>
              {selectedItems.includes(item.id) && (
                <div className="absolute top-2 right-2 w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-accent flex items-center justify-center">
                  <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white" />
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-text-tertiary">
              {language === 'ru' ? 'Файлы не найдены' : 'No media files found'}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[500px] sm:min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-10"></th>
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">File</th>
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">Type</th>
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">SKU</th>
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">Size</th>
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">Date</th>
                    <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr
                      key={item.id}
                      className={`border-b border-border-subtle/50 table-row-hover cursor-pointer ${
                      selectedItems.includes(item.id) ? 'bg-bg-tertiary' : ''
                    }`}
                      onClick={() => toggleSelect(item.id)}
                    >
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedItems.includes(item.id) ? 'bg-accent border-accent' : 'border-border-default'}`}>
                          {selectedItems.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {item.type === 'image' ? <FileImage className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" /> : <FileVideo className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-text-muted flex-shrink-0" />}
                          <span className="text-[11px] sm:text-sm truncate max-w-[120px] sm:max-w-[200px]">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${
                          item.type === 'image' ? 'bg-accent/10 text-accent' : 'bg-info/10 text-info'
                        }`}>
                          {item.type === 'image' ? 'Image' : 'Video'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-xs text-accent">{item.productSku}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-xs text-text-secondary">{item.size}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-xs text-text-tertiary">{item.uploadedAt}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer" onClick={e => { e.stopPropagation(); showToast(language === 'ru' ? `Скачивание "${item.name}"...` : `Downloading "${item.name}"...`); }}>
                            <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          </button>
                          <button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer" onClick={e => { e.stopPropagation(); showToast(language === 'ru' ? `Удаление "${item.name}"...` : `Deleting "${item.name}"...`); }}>
                            <MoreVertical className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 sm:px-4 py-8 text-center text-xs text-text-tertiary">
                        {language === 'ru' ? 'Файлы не найдены' : 'No media files found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal — mobile: BottomSheet; desktop: centered modal (untouched) */}
      {isMobile ? (
        <BottomSheet
          open={showUpload}
          onClose={closeUpload}
          title={language === 'ru' ? 'Загрузка файлов' : 'Upload Media'}
          icon={<Upload className="w-4 h-4 text-accent flex-shrink-0" />}
          ariaLabel={language === 'ru' ? 'Загрузка файлов' : 'Upload Media'}
          footer={
            <button
              type="button"
              onClick={handleUpload}
              className="w-full min-h-[44px] py-2.5 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40"
            >
              {language === 'ru' ? 'Загрузить в систему' : 'Upload Files'}
            </button>
          }
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border-default rounded-xl p-6 sm:p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-xs sm:text-sm text-text-secondary">
                {language === 'ru' ? 'Перетащите файлы сюда' : 'Drag & drop files here'}
              </p>
              <p className="text-[10px] sm:text-xs text-text-tertiary mt-1">
                {language === 'ru' ? 'или нажмите для выбора' : 'or click to browse'}
              </p>
              <p className="text-[9px] sm:text-[10px] text-text-muted mt-3">
                {language === 'ru' ? 'Поддерживаются JPG, PNG, MP4 до 100MB' : 'Supports JPG, PNG, MP4 up to 100MB'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">
                  {language === 'ru' ? 'Имя файла (для симуляции)' : 'File Name'}
                </label>
                <input
                  type="text"
                  placeholder="e.g., product_photo.jpg"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="w-full text-text-primary h-11"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">
                  {language === 'ru' ? 'Привязка к SKU товара' : 'Link to Product SKU'}
                </label>
                <input
                  type="text"
                  placeholder="e.g., S10002E/01"
                  value={uploadSku}
                  onChange={e => setUploadSku(e.target.value)}
                  className="w-full text-text-primary h-11"
                />
              </div>
            </div>
          </div>
        </BottomSheet>
      ) : showUpload && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm t-backdrop${uploadClosing ? ' is-closing' : ''}`}
          onClick={closeUpload}
        >
            <div
              className={`t-modal glass-strong rounded-xl w-full max-w-md p-4 sm:p-6 border border-border-strong shadow-2xl${!uploadClosing ? ' is-open' : ' is-closing'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {language === 'ru' ? 'Загрузка файлов' : 'Upload Media'}
                </h3>
                <button onClick={closeUpload} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border-2 border-dashed border-border-default rounded-xl p-6 sm:p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-xs sm:text-sm text-text-secondary">
                  {language === 'ru' ? 'Перетащите файлы сюда' : 'Drag & drop files here'}
                </p>
                <p className="text-[10px] sm:text-xs text-text-tertiary mt-1">
                  {language === 'ru' ? 'или нажмите для выбора' : 'or click to browse'}
                </p>
                <p className="text-[9px] sm:text-[10px] text-text-muted mt-3">
                  {language === 'ru' ? 'Поддерживаются JPG, PNG, MP4 до 100MB' : 'Supports JPG, PNG, MP4 up to 100MB'}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">
                    {language === 'ru' ? 'Имя файла (для симуляции)' : 'File Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., product_photo.jpg"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">
                    {language === 'ru' ? 'Привязка к SKU товара' : 'Link to Product SKU'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., S10002E/01"
                    value={uploadSku}
                    onChange={e => setUploadSku(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleUpload}
                className="w-full mt-5 py-2 sm:py-2.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40"
              >
                {language === 'ru' ? 'Загрузить в систему' : 'Upload Files'}
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
