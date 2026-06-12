import { useState, useCallback, useMemo } from 'react';
import {
  X,
  Image as ImageIcon,
  Video,
  Tag,
  Zap,
  Ruler,
  Users,
  Plug,
  Battery,
  Link as LinkIcon,
  Shield,
  Globe,
  ShoppingBag,
  Package,
} from 'lucide-react';
import type { ProductWithRelations, MediaFile, MediaLink } from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { displaySource, displayName, getCategoryColorVar } from '@utils/display';
import { categoryRequiredFields } from '@features/dashboard/dataGapsConfig';
import { getMediaUrl, hasPlayableUrl, formatBytes } from '@utils/media';
import { useDataSourceAPI } from '@api/dataSourceContext';
import { useToast } from '@hooks/useToast';
import Modal from '@components/ui/Modal';
import Lightbox from '@components/ui/Lightbox';
import ConfirmModal from '@components/ui/ConfirmModal';

interface ProductDetailCardProps {
  product: ProductWithRelations;
  onClose: () => void;
  highlightedFields?: string[];
}

export default function ProductDetailCard({
  product,
  onClose,
  highlightedFields = [],
}: ProductDetailCardProps) {
  const { t } = useLanguage();
  const ds = useDataSourceAPI();
  const { showToast } = useToast();
  const [open, setOpen] = useState(true);
  const [nestedProduct, setNestedProduct] = useState<ProductWithRelations | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [confirmDeleteLink, setConfirmDeleteLink] = useState<MediaLink | null>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleNestedClose = useCallback(() => {
    setNestedProduct(null);
  }, []);

  const allMissing = useMemo(() => {
    const reqFields = categoryRequiredFields[product.category.code];
    if (!reqFields) return new Set<string>();
    const missing = new Set<string>();
    for (const fd of reqFields) {
      const val = product[fd.field as keyof ProductWithRelations];
      if (val == null || val === '') {
        missing.add(fd.field);
      }
    }
    return missing;
  }, [product]);

  const hl = (field: string) => {
    if (highlightedFields.includes(field)) return 'ring-1 ring-danger/40 bg-danger/[0.03]';
    if (allMissing.has(field)) return 'ring-1 ring-warning/20 bg-warning/[0.02]';
    return '';
  };

  const desc = product.description || '';
  const usp = product.usp || '';
  const tags = product.tags || [];

  const specs = [
    { icon: Zap, label: t('detail.power'), value: product.powerW ? `${product.powerW}W` : '—', field: 'powerW' },
    { icon: Battery, label: t('detail.current'), value: product.currentA ? `${product.currentA}A` : '—', field: 'currentA' },
    { icon: Zap, label: t('detail.voltage'), value: product.voltageV ? `${product.voltageV}V` : '—', field: 'voltageV' },
    { icon: Ruler, label: t('detail.length'), value: product.lengthM ? `${product.lengthM}м` : '—', field: 'lengthM' },
    { icon: Users, label: t('detail.devices'), value: product.deviceCount || '—', field: 'deviceCount' },
    { icon: LinkIcon, label: t('detail.speed'), value: product.dataTransferMbps ? `${product.dataTransferMbps} Mbps` : '—', field: 'dataTransferMbps' },
  ];

  const connections = [
    { label: t('detail.input'), value: product.connectorFemale ? displaySource(product.connectorFemale) : '—', field: 'connectorFemale' },
    { label: t('detail.output'), value: product.connectorMale ? displaySource(product.connectorMale) : '—', field: 'connectorMale' },
    { label: t('detail.protocol'), value: product.chargingProtocol ? displaySource(product.chargingProtocol) : '—', field: 'chargingProtocol' },
    { label: t('detail.connection'), value: product.connectionType || '—', field: 'connectionType' },
  ];

  const materials = [
    { label: t('detail.body'), value: product.bodyMaterial ? displayName(product.bodyMaterial) : '—', field: 'bodyMaterial' },
    { label: t('detail.wire'), value: product.wireMaterial ? displayName(product.wireMaterial) : '—', field: 'wireMaterial' },
  ];

  const mediaFiles = product.mediaFiles ?? [];
  const mediaLinks = product.mediaLinks ?? [];
  const sortedFiles = useMemo(
    () =>
      [...mediaFiles].sort((a, b) => {
        const aLink = mediaLinks.find((l) => l.fileId === a.id);
        const bLink = mediaLinks.find((l) => l.fileId === b.id);
        if (aLink?.isPrimary !== bLink?.isPrimary) return aLink?.isPrimary ? -1 : 1;
        return (aLink?.sortOrder ?? 0) - (bLink?.sortOrder ?? 0);
      }),
    [mediaFiles, mediaLinks]
  );
  const currentFile = sortedFiles[lightboxIndex >= 0 ? lightboxIndex : 0] ?? null;

  const singleListings = (product.marketplaceListings || []).filter((l) => l.kind === 'single');
  const bundleListings = (product.marketplaceListings || []).filter((l) => l.kind === 'bundle');

  const handleTogglePrimary = useCallback(
    async (fileId: string) => {
      try {
        await ds.products.setMediaPrimary(fileId, product.id);
        showToast(t('media.toast.primary_set'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    },
    [ds.products, product.id, showToast, t]
  );

  const handleDeleteLink = useCallback(
    async (fileId: string, variantId: string) => {
      try {
        if (ds.products.deleteMediaLink) {
          await ds.products.deleteMediaLink(fileId, variantId);
          showToast(t('media.toast.unlinked') + ' 1');
        } else {
          throw new Error('deleteMediaLink not supported');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    },
    [ds.products, showToast, t]
  );

  const MarketplaceBadge = ({ marketplace }: { marketplace: 'wb' | 'ozon' }) => (
    <span
      className="inline-flex items-center justify-center min-w-[36px] sm:min-w-[44px] h-5 sm:h-6 px-1.5 sm:px-2 rounded-md text-[9px] sm:text-[10px] font-semibold border"
      style={{
        background: marketplace === 'wb' ? 'var(--color-wb-bg)' : 'var(--color-ozon-bg)',
        color: marketplace === 'wb' ? 'var(--color-wb)' : 'var(--color-ozon)',
        borderColor: marketplace === 'wb' ? 'var(--color-wb-border)' : 'var(--color-ozon-border)',
      }}
    >
      {marketplace === 'wb' ? 'WB' : 'OZON'}
    </span>
  );

  function renderMediaPreview(file: MediaFile, size: 'sm' | 'md' | 'lg' = 'md') {
    const url = getMediaUrl(file.url);
    const iconSize =
      size === 'lg'
        ? 'w-10 h-10 sm:w-12 sm:h-12'
        : size === 'sm'
          ? 'w-3 h-3 sm:w-3.5 sm:h-3.5'
          : 'w-4 h-4 sm:w-5 sm:h-5';

    if (!hasPlayableUrl(file)) {
      return file.mimeType.startsWith('image/') ? (
        <ImageIcon className={`${iconSize} text-text-muted`} />
      ) : (
        <Video className={`${iconSize} text-text-muted`} />
      );
    }

    if (file.mimeType.startsWith('image/')) {
      return <img src={url} alt={file.originalName} className="w-full h-full object-cover" loading="lazy" />;
    }

    return <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />;
  }

  const modalContent = (
    <>
      <div className="flex items-start justify-between p-3 sm:p-4 border-b border-border-subtle bg-bg-secondary/50 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-[11px] sm:text-sm text-accent px-1.5 sm:px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
              {product.sku}
            </code>
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-text-primary mb-0.5 leading-snug line-clamp-2">
            {product.productName}
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-tertiary flex-wrap">
            <span style={{ color: getCategoryColorVar(product.category) }}>
              {displaySource(product.category)}
            </span>
            <span>·</span>
            <span className="text-text-secondary">{displaySource(product.model)}</span>
            {product.color && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: product.color.color === 'gradient'
                        ? 'conic-gradient(in hsl longer hue, red, red)'
                        : product.color.color,
                      border: product.color.color === 'gradient' ? 'none' : '1px solid var(--color-border-subtle)',
                    }}
                  />
                  <span>{displaySource(product.color)}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleClose}
          aria-label="Close"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors cursor-pointer self-start flex items-center justify-center flex-shrink-0"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 p-3 sm:p-4 space-y-3 sm:space-y-4 lg:border-r border-border-subtle">
            <div className="space-y-2">
              <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {t('detail.media')}
                {currentFile && (
                  <span className="text-[9px] text-text-muted ml-auto">
                    {lightboxIndex >= 0 ? lightboxIndex + 1 : 1}/{sortedFiles.length}
                  </span>
                )}
              </h3>
              {currentFile ? (
                <div
                  className="rounded-xl bg-bg-tertiary border border-border-subtle flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => {
                    const idx = sortedFiles.findIndex((f) => f.id === currentFile.id);
                    if (idx !== -1) setLightboxIndex(idx);
                  }}
                >
                  <div className="aspect-video w-full flex items-center justify-center bg-bg-tertiary">
                    {renderMediaPreview(currentFile, 'lg')}
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-bg-tertiary/50 border border-border-subtle border-dashed flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 text-text-muted" />
                    <span className="text-[10px] sm:text-xs text-text-tertiary">{t('detail.no_media')}</span>
                  </div>
                </div>
              )}
              {sortedFiles.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {sortedFiles.map((f, i) => {
                    const url = getMediaUrl(f.url);
                    const isActive = i === (lightboxIndex >= 0 ? lightboxIndex : 0);
                    const link = mediaLinks.find((l) => l.fileId === f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => setLightboxIndex(i)}
                        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border flex-shrink-0 flex items-center justify-center transition-[colors,opacity,transform,box-shadow] duration-150 ${
                          isActive ? 'border-accent ring-1 ring-accent/30' : 'border-border-subtle hover:border-border-default'
                        }`}
                        aria-label={`${t('detail.media')} ${i + 1}`}
                      >
                        {hasPlayableUrl(f) ? (
                          f.mimeType.startsWith('image/') ? (
                            <img src={url} alt={f.originalName} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          )
                        ) : f.mimeType.startsWith('image/') ? (
                          <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted" />
                        ) : (
                          <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted" />
                        )}
                        {link?.isPrimary && <div className="absolute top-0 left-0 w-full h-full ring-1 ring-warning/30 rounded-lg pointer-events-none" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {currentFile && (
                <p className="text-[9px] text-text-muted text-right">
                  {currentFile.originalName} · {formatBytes(currentFile.sizeBytes)}
                </p>
              )}
            </div>

            {desc && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                  <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t('detail.description')}
                </h3>
                <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">{desc}</p>
              </div>
            )}
            {usp && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                  <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t('detail.benefits')}
                </h3>
                <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">{usp}</p>
              </div>
            )}
            {tags.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                  <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t('detail.tags')}
                </h3>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, i) => (
                    <span key={i} className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-bg-tertiary text-text-secondary border border-border-subtle">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(singleListings.length > 0 || bundleListings.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t('detail.marketplaces')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {singleListings.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] sm:text-[10px] text-text-tertiary">{t('detail.listed_as_product')}</p>
                      <div className="space-y-1">
                        {singleListings.map((listing, i) => (
                          <a key={`single-${i}`} href={listing.url} target="_blank" rel="noreferrer"
                            className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] sm:text-xs text-text-primary truncate">{listing.title}</p>
                              <p className="text-[9px] sm:text-[10px] text-text-tertiary mt-0.5">{listing.article}</p>
                            </div>
                            <MarketplaceBadge marketplace={listing.marketplace} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {bundleListings.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] sm:text-[10px] text-text-tertiary">{t('detail.included_in_bundles')}</p>
                      <div className="space-y-1">
                        {bundleListings.map((listing, i) => (
                          <a key={`bundle-${i}`} href={listing.url} target="_blank" rel="noreferrer"
                            className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] sm:text-xs text-text-primary truncate">{listing.title}</p>
                              <p className="text-[9px] sm:text-[10px] text-text-tertiary mt-0.5">{listing.article}</p>
                            </div>
                            <MarketplaceBadge marketplace={listing.marketplace} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-bg-tertiary/30">
            {product.isKit && product.kitComponents && product.kitComponents.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-[10px] sm:text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Комплект содержит:
                </h3>
                <div className="space-y-2">
                  {product.kitComponents.map((comp, idx) => {
                    const compProduct = comp.product;
                    const compHl = (field: string) => {
                      const reqFields = categoryRequiredFields[compProduct.category.code];
                      if (!reqFields) return '';
                      for (const fd of reqFields) {
                        if (fd.field === field) {
                          const val = compProduct[field as keyof ProductWithRelations];
                          if (val == null || val === '') return 'ring-1 ring-warning/30 bg-warning/[0.03]';
                        }
                      }
                      return '';
                    };
                    const compSpecs = [
                      { icon: Zap, label: t('detail.power'), value: compProduct.powerW ? `${compProduct.powerW}W` : '—', field: 'powerW' },
                      { icon: Battery, label: t('detail.current'), value: compProduct.currentA ? `${compProduct.currentA}A` : '—', field: 'currentA' },
                      { icon: Zap, label: t('detail.voltage'), value: compProduct.voltageV ? `${compProduct.voltageV}V` : '—', field: 'voltageV' },
                      { icon: Ruler, label: t('detail.length'), value: compProduct.lengthM ? `${compProduct.lengthM}м` : '—', field: 'lengthM' },
                      { icon: Users, label: t('detail.devices'), value: compProduct.deviceCount || '—', field: 'deviceCount' },
                      { icon: LinkIcon, label: t('detail.speed'), value: compProduct.dataTransferMbps ? `${compProduct.dataTransferMbps} Mbps` : '—', field: 'dataTransferMbps' },
                    ];
                    return (
                      <div key={idx} className="rounded-lg border border-border-subtle bg-bg-tertiary/50 p-2 sm:p-3 space-y-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-xs font-medium text-text-primary cursor-pointer hover:text-accent transition-colors" onClick={() => setNestedProduct(compProduct)}>
                              {compProduct.productName}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-text-secondary">×{comp.quantity}</span>
                            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border-subtle">
                              {displaySource(compProduct.category)}
                            </span>
                          </div>
                          <code className="text-[9px] text-accent px-1 py-0.5 rounded bg-accent/10 border border-accent/20 font-mono w-fit">{compProduct.sku}</code>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {compSpecs.map((spec, i) => (
                            <div key={i} className={`p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle ${compHl(spec.field)}`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <spec.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-text-muted" />
                                <span className="text-[9px] sm:text-[10px] text-text-tertiary">{spec.label}</span>
                              </div>
                              <p className="text-[10px] sm:text-xs font-medium text-text-primary">{spec.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {t('detail.specifications')}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {specs.map((spec, i) => (
                      <div key={i} className={`p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle ${hl(spec.field)}`}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <spec.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-text-muted" />
                          <span className="text-[9px] sm:text-[10px] text-text-tertiary">{spec.label}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium text-text-primary">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                    <Plug className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {t('detail.connections')}
                  </h3>
                  <div className="space-y-1">
                    {connections.map((conn, i) => (
                      <div key={i} className={`flex justify-between items-center p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle ${hl(conn.field)}`}>
                        <span className="text-[9px] sm:text-[10px] text-text-tertiary">{conn.label}</span>
                        <span className="text-[10px] sm:text-xs font-medium text-text-primary">{conn.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {t('detail.materials')}
                  </h3>
                  <div className="space-y-1">
                    {materials.map((mat, i) => (
                      <div key={i} className={`flex justify-between items-center p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle ${hl(mat.field)}`}>
                        <span className="text-[9px] sm:text-[10px] text-text-tertiary">{mat.label}</span>
                        <span className="text-[10px] sm:text-xs font-medium text-text-primary">{mat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {product.supplier && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                      <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {t('detail.supplier')}
                    </h3>
                    <div className={`p-2 sm:p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle ${hl('supplier')}`}>
                      <p className="text-[10px] sm:text-xs font-medium text-text-primary">{product.supplier.name}</p>
                      {product.supplier.code !== '-' && (
                        <p className="text-[9px] sm:text-[10px] text-text-tertiary mt-0.5">Code: {product.supplier.code}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        files={sortedFiles}
        links={mediaLinks}
        currentIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        onClose={() => setLightboxIndex(-1)}
        onChangeIndex={setLightboxIndex}
        variantId={product.id}
        onTogglePrimary={handleTogglePrimary}
        onDelete={(fileId) => {
          const link = mediaLinks.find((l) => l.fileId === fileId);
          if (link) setConfirmDeleteLink(link);
        }}
      />

      {/* Confirm Unlink */}
      <ConfirmModal
        open={!!confirmDeleteLink}
        title={t('media.confirm_unlink_title')}
        description={t('media.confirm_unlink_desc')}
        variant="warning"
        onConfirm={() => {
          if (confirmDeleteLink) {
            handleDeleteLink(confirmDeleteLink.fileId, confirmDeleteLink.variantId);
            setConfirmDeleteLink(null);
          }
        }}
        onCancel={() => setConfirmDeleteLink(null)}
      />
    </>
  );

  return (
    <>
      <Modal
        variant="auto"
        width="lg"
        open={open}
        onClose={handleClose}
        onExitComplete={onClose}
        showCloseButton={false}
        height="clamp(70dvh, 80dvh, 95dvh)"
        pinned
        className="sm:!max-w-[clamp(600px,75vw,1400px)] sm:rounded-2xl"
        contentClassName="p-0 flex flex-col"
      >
        {modalContent}
      </Modal>
      {nestedProduct && <ProductDetailCard product={nestedProduct} onClose={handleNestedClose} />}
    </>
  );
}
