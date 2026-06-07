import { useState, useCallback } from 'react';
import { X, Image as ImageIcon, Video, Tag, Zap, Ruler, Users, Plug, Battery, Link as LinkIcon, Shield, Globe, ShoppingBag } from 'lucide-react';
import type { ProductWithRelations } from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { displaySource, displayName, getCategoryColorVar } from '@utils/display';
import Modal from '@components/ui/Modal';

interface ProductDetailCardProps {
  product: ProductWithRelations;
  onClose: () => void;
}

export default function ProductDetailCard({ product, onClose }: ProductDetailCardProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(true);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const desc = product.description || '';
  const usp = product.usp || '';
  const tags = product.tags || [];

  const specs = [
    { icon: Zap, label: t('detail.power'), value: product.powerW ? `${product.powerW}W` : '—' },
    { icon: Battery, label: t('detail.current'), value: product.currentA ? `${product.currentA}A` : '—' },
    { icon: Zap, label: t('detail.voltage'), value: product.voltageV ? `${product.voltageV}V` : '—' },
    { icon: Ruler, label: t('detail.length'), value: product.lengthM ? `${product.lengthM}м` : '—' },
    { icon: Users, label: t('detail.devices'), value: product.deviceCount || '—' },
    { icon: LinkIcon, label: t('detail.speed'), value: product.dataTransferMbps ? `${product.dataTransferMbps} Mbps` : '—' },
  ];

  const connections = [
    { label: t('detail.input'), value: product.connectorFemale ? displaySource(product.connectorFemale, language) : '—' },
    { label: t('detail.output'), value: product.connectorMale ? displaySource(product.connectorMale, language) : '—' },
    { label: t('detail.protocol'), value: product.chargingProtocol ? displaySource(product.chargingProtocol, language) : '—' },
    {
      label: t('detail.connection'),
      value: product.connectionType || '—',
    },
  ];

  const materials = [
    { label: t('detail.body'), value: product.bodyMaterial ? displayName(product.bodyMaterial, language) : '—' },
    { label: t('detail.wire'), value: product.wireMaterial ? displayName(product.wireMaterial, language) : '—' },
  ];

  const media = product.media || [];
  const primaryMedia = media.find(m => m.isPrimary) || media[0];
  const singleListings = (product.marketplaceListings || []).filter(l => l.kind === 'single');
  const bundleListings = (product.marketplaceListings || []).filter(l => l.kind === 'bundle');

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

  const modalContent = (
    <>
      <div className="flex items-start justify-between p-3 sm:p-4 border-b border-border-subtle bg-bg-secondary/50 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-[11px] sm:text-sm text-accent px-1.5 sm:px-2 py-0.5 rounded bg-accent/10 border border-accent/20">{product.sku}</code>
            {product.isKit && (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">KIT</span>
            )}
          </div>
           <h2 className="text-sm sm:text-base font-semibold text-text-primary mb-0.5 leading-snug line-clamp-2">
             {product.productName}
           </h2>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-tertiary flex-wrap">
            <span style={{ color: getCategoryColorVar(product.category.code) }}>{displaySource(product.category, language)}</span>
            <span>·</span>
            <span className="text-text-secondary">{displaySource(product.model, language)}</span>
            {product.color && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: product.color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : product.color.hexValue,
                    border: product.color.hexValue === 'gradient' ? 'none' : '1px solid var(--color-border-subtle)',
                  }} />
                  <span>{displaySource(product.color, language)}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <button onClick={handleClose} aria-label="Close" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors cursor-pointer self-start flex items-center justify-center flex-shrink-0">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="md:col-span-2 p-3 sm:p-4 space-y-3 sm:space-y-4 md:border-r border-border-subtle">
            <div className="space-y-2">
              <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {t('detail.media')}
              </h3>
              {primaryMedia ? (
                <div className="rounded-xl bg-bg-tertiary border border-border-subtle flex items-center justify-center overflow-hidden">
                  <div className="aspect-video w-full flex items-center justify-center">
                    {primaryMedia.mediaType === 'image' ? (
                      <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-text-muted" />
                    ) : (
                      <Video className="w-10 h-10 sm:w-12 sm:h-12 text-text-muted" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-bg-tertiary/50 border border-border-subtle border-dashed flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs text-text-tertiary">{t('detail.no_media')}</span>
                </div>
              )}
              {media.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  {media.slice(1, 5).map((m, i) => (
                    <div key={i} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-bg-tertiary border border-border-subtle flex-shrink-0 flex items-center justify-center">
                      {m.mediaType === 'image' ? <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted" /> : <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted" />}
                    </div>
                  ))}
                </div>
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
                          <a key={`single-${i}`} href={listing.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors">
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
                          <a key={`bundle-${i}`} href={listing.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors">
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
            <div className="space-y-2">
              <h3 className="text-[10px] sm:text-xs font-medium text-text-tertiary flex items-center gap-1.5">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {t('detail.specifications')}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {specs.map((spec, i) => (
                  <div key={i} className="p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
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
                  <div key={i} className="flex justify-between items-center p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
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
                  <div key={i} className="flex justify-between items-center p-1.5 sm:p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
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
                <div className="p-2 sm:p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                  <p className="text-[10px] sm:text-xs font-medium text-text-primary">{product.supplier.name}</p>
                  {product.supplier.code !== '-' && (
                    <p className="text-[9px] sm:text-[10px] text-text-tertiary mt-0.5">Code: {product.supplier.code}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <Modal
      variant="auto"
      width="lg"
      open={open}
      onClose={handleClose}
      onExitComplete={onClose}
      showCloseButton={false}
      height="clamp(75dvh, 80dvh, 95dvh)"
      pinned
      className="sm:!max-w-[min(1100px,65vw)] sm:rounded-2xl"
      contentClassName="p-0 flex flex-col"
    >
      {modalContent}
    </Modal>
  );
}
