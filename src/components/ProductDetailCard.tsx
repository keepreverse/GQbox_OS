import { useState, useCallback, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Tag, Zap, Ruler, Users, Plug, Battery, Link as LinkIcon, Shield, Globe, ShoppingBag } from 'lucide-react';
import type { ProductWithRelations } from '../data/types';
import { useLanguage } from '../context/LanguageContext';
import { useLayout } from '../context/LayoutContext';
import { displaySource, displayName, getCategoryColorVar } from '../utils/display';

const MODAL_CLOSE_MS = 150;

const connectionTypeTranslations: Record<string, string> = {
  'Прямое': 'Direct',
  'Bluetooth': 'Bluetooth',
  'ONLY MUSIC': 'ONLY MUSIC',
};

interface ProductDetailCardProps {
  product: ProductWithRelations;
  isOpen?: boolean;
  onClose: () => void;
}

export default function ProductDetailCard({ product, onClose }: ProductDetailCardProps) {
  const { language } = useLanguage();
  const { sidebarWidth, headerHeight, isMobile } = useLayout();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, MODAL_CLOSE_MS);
  }, [onClose]);

  const t = (ru: string, en: string) => language === 'ru' ? ru : en;
  const desc = language === 'ru' ? (product.description || product.descriptionEn) : (product.descriptionEn || product.description);
  const usp = language === 'ru' ? (product.usp || product.uspEn) : (product.uspEn || product.usp);
  const tags = product.tags || [];

  const specs = [
    { icon: Zap, label: t('Мощность', 'Power'), value: product.powerW ? `${product.powerW}W` : '—' },
    { icon: Battery, label: t('Ток', 'Current'), value: product.currentA ? `${product.currentA}A` : '—' },
    { icon: Zap, label: t('Напряжение', 'Voltage'), value: product.voltageV ? `${product.voltageV}V` : '—' },
    { icon: Ruler, label: t('Длина', 'Length'), value: product.lengthM ? `${product.lengthM}${language === 'ru' ? 'м' : 'm'}` : '—' },
    { icon: Users, label: t('Устройств', 'Devices'), value: product.deviceCount || '—' },
    { icon: LinkIcon, label: t('Скорость', 'Speed'), value: product.dataTransferMbps ? `${product.dataTransferMbps} Mbps` : '—' },
  ];

  const connections = [
    { label: t('Вход', 'Input'), value: product.connectorFemale ? displaySource(product.connectorFemale, language) : '—' },
    { label: t('Выход', 'Output'), value: product.connectorMale ? displaySource(product.connectorMale, language) : '—' },
    { label: t('Протокол', 'Protocol'), value: product.chargingProtocol ? displaySource(product.chargingProtocol, language) : '—' },
    {
      label: t('Подключение', 'Connection'),
      value: product.connectionType
        ? (language === 'ru'
            ? product.connectionType
            : (connectionTypeTranslations[product.connectionType] || product.connectionType))
        : '—',
    },
  ];

  const materials = [
    { label: t('Корпус', 'Body'), value: product.bodyMaterial ? displayName(product.bodyMaterial, language) : '—' },
    { label: t('Кабель', 'Wire'), value: product.wireMaterial ? displayName(product.wireMaterial, language) : '—' },
  ];

  const media = product.media || [];
  const primaryMedia = media.find(m => m.isPrimary) || media[0];
  const singleListings = (product.marketplaceListings || []).filter(l => l.kind === 'single');
  const bundleListings = (product.marketplaceListings || []).filter(l => l.kind === 'bundle');

  const MarketplaceBadge = ({ marketplace }: { marketplace: 'wb' | 'ozon' }) => (
    <span
      className="inline-flex items-center justify-center min-w-[44px] h-6 px-2 rounded-md text-[10px] font-semibold border"
      style={{
        background: marketplace === 'wb' ? 'var(--color-wb-bg)' : 'var(--color-ozon-bg)',
        color: marketplace === 'wb' ? 'var(--color-wb)' : 'var(--color-ozon)',
        borderColor: marketplace === 'wb' ? 'var(--color-wb-border)' : 'var(--color-ozon-border)',
      }}
    >
      {marketplace === 'wb' ? 'WB' : 'OZON'}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[100]" onClick={handleClose}>
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm t-backdrop${closing ? ' is-closing' : ''}`} />
      {isMobile ? (
        // Mobile: full-screen bottom sheet that slides up
        <div
          className="absolute inset-x-0 bottom-0 top-0 flex flex-col"
          onClick={handleClose}
        >
          <div
            className={`t-modal glass-strong rounded-t-2xl w-full border-t border-border-strong shadow-2xl mx-auto flex flex-col max-h-[100dvh] mt-auto overflow-hidden animate-card-in${closing ? ' is-closing' : ' is-open'}`}
            onClick={e => e.stopPropagation()}
          >
          <div className="flex items-start justify-between p-3 border-b border-border-subtle bg-bg-secondary/50 sticky top-0 z-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <code className="text-xs text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">{product.sku}</code>
                {product.isKit && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-warning/10 text-warning font-medium">KIT</span>
                )}
              </div>
              <h2 className="text-base font-semibold text-text-primary mb-1 leading-snug line-clamp-2">
                {language === 'ru' ? product.fullNameRu : product.fullName}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary flex-wrap">
                <span style={{ color: getCategoryColorVar(product.category.code) }}>{displaySource(product.category, language)}</span>
                <span>·</span>
                <span className="text-text-secondary">{displaySource(product.model, language)}</span>
                {product.color && (
                  <>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                        background: product.color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : product.color.hexValue,
                        border: product.color.hexValue === 'gradient' ? 'none' : '1px solid var(--color-border-subtle)',
                      }} />
                      <span>{displaySource(product.color, language)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={handleClose} aria-label="Close" className="h-11 w-11 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors cursor-pointer self-start flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 flex-1 overflow-y-auto min-h-0">
            <div className="lg:col-span-2 p-3 sm:p-6 space-y-5 sm:space-y-6 lg:border-r border-border-subtle">
              {/* Media */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {t('Медиа', 'Media')}
                </h3>
                {primaryMedia ? (
                  <div className="rounded-xl bg-bg-tertiary border border-border-subtle flex items-center justify-center overflow-hidden max-w-2xl">
                    <div className="aspect-[16/7.5] w-full max-h-[260px] flex items-center justify-center">
                      {primaryMedia.mediaType === 'image' ? (
                        <ImageIcon className="w-12 h-12 text-text-muted" />
                      ) : (
                        <Video className="w-12 h-12 text-text-muted" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/7.5] max-w-2xl rounded-xl bg-bg-tertiary/50 border border-border-subtle border-dashed flex items-center justify-center">
                    <span className="text-xs text-text-tertiary">{t('Нет медиа', 'No media')}</span>
                  </div>
                )}
                {media.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {media.slice(1, 5).map((m, i) => (
                      <div key={i} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-bg-tertiary border border-border-subtle flex-shrink-0 flex items-center justify-center">
                        {m.mediaType === 'image' ? <ImageIcon className="w-4 h-4 text-text-muted" /> : <Video className="w-4 h-4 text-text-muted" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {desc && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    {t('Описание', 'Description')}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              )}

              {usp && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    {t('Преимущества', 'Key Benefits')}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{usp}</p>
                </div>
              )}

              {tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" />
                    {t('Теги', 'Tags')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary border border-border-subtle">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(singleListings.length > 0 || bundleListings.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {t('Маркетплейсы', 'Marketplaces')}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {singleListings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-text-tertiary">
                          {t('Выставлен как товар', 'Listed as product')}
                        </p>
                        <div className="space-y-1.5">
                          {singleListings.map((listing, i) => (
                            <a
                              key={`single-${i}`}
                              href={listing.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-text-primary truncate">{listing.title}</p>
                                <p className="text-[10px] text-text-tertiary mt-0.5">{listing.article}</p>
                              </div>
                              <MarketplaceBadge marketplace={listing.marketplace} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {bundleListings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-text-tertiary">
                          {t('Входит в состав комплектов', 'Included in bundles')}
                        </p>
                        <div className="space-y-1.5">
                          {bundleListings.map((listing, i) => (
                            <a
                              key={`bundle-${i}`}
                              href={listing.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-text-primary truncate">{listing.title}</p>
                                <p className="text-[10px] text-text-tertiary mt-0.5">{listing.article}</p>
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

            <div className="p-3 sm:p-6 space-y-5 sm:space-y-6 bg-bg-tertiary/30">
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  {t('Характеристики', 'Specifications')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {specs.map((spec, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                      <div className="flex items-center gap-1.5 mb-1">
                        <spec.icon className="w-3 h-3 text-text-muted" />
                        <span className="text-[10px] text-text-tertiary">{spec.label}</span>
                      </div>
                      <p className="text-xs font-medium text-text-primary">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <Plug className="w-3.5 h-3.5" />
                  {t('Подключения', 'Connections')}
                </h3>
                <div className="space-y-2">
                  {connections.map((conn, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
                      <span className="text-[10px] text-text-tertiary">{conn.label}</span>
                      <span className="text-xs font-medium text-text-primary">{conn.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  {t('Материалы', 'Materials')}
                </h3>
                <div className="space-y-2">
                  {materials.map((mat, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
                      <span className="text-[10px] text-text-tertiary">{mat.label}</span>
                      <span className="text-xs font-medium text-text-primary">{mat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {product.supplier && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    {t('Поставщик', 'Supplier')}
                  </h3>
                  <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
                    <p className="text-xs font-medium text-text-primary">{product.supplier.name}</p>
                    {product.supplier.code !== '-' && (
                      <p className="text-[10px] text-text-tertiary mt-1">Code: {product.supplier.code}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      ) : (
        // Desktop/tablet: centered modal
        <div
          className="absolute inset-0 flex items-center justify-center overflow-y-auto p-6"
          style={{ paddingLeft: sidebarWidth + 24 }}
        >
          <div
            className={`t-modal glass-strong rounded-2xl w-full max-w-4xl xl:max-w-5xl border border-border-strong shadow-2xl mx-auto flex flex-col max-h-[85dvh] overflow-hidden${!closing ? ' is-open' : ' is-closing'}`}
            onClick={e => e.stopPropagation()}
          >
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border-subtle bg-bg-secondary/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">{product.sku}</code>
                {product.isKit && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-warning/10 text-warning font-medium">KIT</span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-1 leading-snug">
                {language === 'ru' ? product.fullNameRu : product.fullName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
                <span style={{ color: getCategoryColorVar(product.category.code) }}>{displaySource(product.category, language)}</span>
                <span>·</span>
                <span className="text-text-secondary">{displaySource(product.model, language)}</span>
                {product.color && (
                  <>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                        background: product.color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : product.color.hexValue,
                        border: product.color.hexValue === 'gradient' ? 'none' : '1px solid var(--color-border-subtle)',
                      }} />
                      <span>{displaySource(product.color, language)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={handleClose} aria-label="Close" className="h-11 w-11 sm:h-9 sm:w-9 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors cursor-pointer self-start flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 flex-1 overflow-y-auto min-h-0">
            {/* Left: Media & Description */}
            <div className="lg:col-span-2 p-4 sm:p-6 space-y-5 sm:space-y-6 border-r border-border-subtle">
              {/* Media */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {t('Медиа', 'Media')}
                </h3>
                {primaryMedia ? (
                  <div className="rounded-xl bg-bg-tertiary border border-border-subtle flex items-center justify-center overflow-hidden max-w-2xl">
                    <div className="aspect-[16/7.5] w-full max-h-[260px] flex items-center justify-center">
                      {primaryMedia.mediaType === 'image' ? (
                        <ImageIcon className="w-12 h-12 text-text-muted" />
                      ) : (
                        <Video className="w-12 h-12 text-text-muted" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/7.5] max-w-2xl rounded-xl bg-bg-tertiary/50 border border-border-subtle border-dashed flex items-center justify-center">
                    <span className="text-xs text-text-tertiary">{t('Нет медиа', 'No media')}</span>
                  </div>
                )}
                {media.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {media.slice(1, 5).map((m, i) => (
                      <div key={i} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-bg-tertiary border border-border-subtle flex-shrink-0 flex items-center justify-center">
                        {m.mediaType === 'image' ? <ImageIcon className="w-4 h-4 text-text-muted" /> : <Video className="w-4 h-4 text-text-muted" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {desc && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    {t('Описание', 'Description')}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              )}

              {/* USP */}
              {usp && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    {t('Преимущества', 'Key Benefits')}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{usp}</p>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" />
                    {t('Теги', 'Tags')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary border border-border-subtle">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Marketplace Listings */}
              {(singleListings.length > 0 || bundleListings.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {t('Маркетплейсы', 'Marketplaces')}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {singleListings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-text-tertiary">
                          {t('Выставлен как товар', 'Listed as product')}
                        </p>
                        <div className="space-y-1.5">
                          {singleListings.map((listing, i) => (
                            <a
                              key={`single-${i}`}
                              href={listing.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-text-primary truncate">{listing.title}</p>
                                <p className="text-[10px] text-text-tertiary mt-0.5">{listing.article}</p>
                              </div>
                              <MarketplaceBadge marketplace={listing.marketplace} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {bundleListings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-text-tertiary">
                          {t('Входит в состав комплектов', 'Included in bundles')}
                        </p>
                        <div className="space-y-1.5">
                          {bundleListings.map((listing, i) => (
                            <a
                              key={`bundle-${i}`}
                              href={listing.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-text-primary truncate">{listing.title}</p>
                                <p className="text-[10px] text-text-tertiary mt-0.5">{listing.article}</p>
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

            {/* Right: Specifications */}
            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 bg-bg-tertiary/30">
              {/* Specs */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  {t('Характеристики', 'Specifications')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {specs.map((spec, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                      <div className="flex items-center gap-1.5 mb-1">
                        <spec.icon className="w-3 h-3 text-text-muted" />
                        <span className="text-[10px] text-text-tertiary">{spec.label}</span>
                      </div>
                      <p className="text-xs font-medium text-text-primary">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <Plug className="w-3.5 h-3.5" />
                  {t('Подключения', 'Connections')}
                </h3>
                <div className="space-y-2">
                  {connections.map((conn, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
                      <span className="text-[10px] text-text-tertiary">{conn.label}</span>
                      <span className="text-xs font-medium text-text-primary">{conn.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materials */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  {t('Материалы', 'Materials')}
                </h3>
                <div className="space-y-2">
                  {materials.map((mat, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-bg-tertiary border border-border-subtle">
                      <span className="text-[10px] text-text-tertiary">{mat.label}</span>
                      <span className="text-xs font-medium text-text-primary">{mat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier */}
              {product.supplier && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    {t('Поставщик', 'Supplier')}
                  </h3>
                  <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
                    <p className="text-xs font-medium text-text-primary">{product.supplier.name}</p>
                    {product.supplier.code !== '-' && (
                      <p className="text-[10px] text-text-tertiary mt-1">Code: {product.supplier.code}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
