import { useState, useMemo, useCallback, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Package,
  Plus,
  X,
  Search,
  ChevronRight,
  Zap,
  Hash,
  Layers,
  ArrowLeft,
  Cable,
  Wifi,
  Car,
  Headphones,
  ArrowLeftRight,
  Magnet,
  GripVertical,
  Sparkles,
  Navigation,
  Monitor,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import Modal from '@components/ui/Modal';
import type { ProductWithRelations } from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { displayProductName, displaySource, getCategoryColorVar } from '@utils/display';
import { useDataSource } from '@api/dataSourceContext';

const categoryIcons: Record<string, React.ElementType> = {
  cable: Cable,
  szu: Zap,
  bzu: Wifi,
  azu: Car,
  headphones: Headphones,
  adapter: ArrowLeftRight,
  pin: Magnet,
  holder: Navigation,
  case: Sparkles,
  kit: Package,
  blogo: Monitor,
};

interface KitComponent {
  product: ProductWithRelations;
  quantity: number;
}

function generateKitName(items: KitComponent[], allColors: { name_product: string }[]) {
  const expanded = items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => displayProductName(item.product))
  );
  const cleaned = expanded.map((v) => String(v || '').trim()).filter((v) => v && v !== '-');

  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];

  const allSame = cleaned.every((item) => item === cleaned[0]);
  if (allSame) {
    return `Комплект. ${cleaned[0]} ${cleaned.length} шт.`;
  }

  const colorNames = allColors
    .map((color) => color.name_product)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const parseComponent = (str: string) => {
    const normalized = str.trim();
    const foundColor = colorNames.find((color) => normalized.endsWith(` ${color}`));
    if (foundColor) {
      return {
        base: normalized.slice(0, -foundColor.length).trim(),
        color: foundColor,
      };
    }
    return { base: normalized, color: null as string | null };
  };

  const groups: { base: string; color: string | null; count: number }[] = [];
  const map = new Map<string, { base: string; color: string | null; count: number }>();

  for (const item of cleaned) {
    const { base, color } = parseComponent(item);
    if (!base) continue;
    const key = `${base}|${color || ''}`;
    if (!map.has(key)) {
      const group = { base, color, count: 0 };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key)!.count += 1;
  }

  const pinPrefix = 'Пин.';
  const pinItems = groups.filter((group) => group.base.startsWith(pinPrefix));
  const otherItems = groups.filter((group) => !group.base.startsWith(pinPrefix));

  let pinPart: { base: string; color: string | null; count: number } | null = null;
  if (pinItems.length > 0) {
    const values = pinItems.map((pin) => {
      let value = pin.base.replace(new RegExp(`^${pinPrefix.replace('.', '\\.')}\\s*`), '');
      if (pin.count > 1) value += ` ${pin.count} шт.`;
      return value;
    });
    pinPart = { base: `${pinPrefix} ${values.join(' + ')}`, color: null, count: 1 };
  }

  const finalGroups = [...otherItems, ...(pinPart ? [pinPart] : [])];
  const colorsSet = new Set(finalGroups.map((g) => g.color));
  const colorValues = Array.from(colorsSet).filter(Boolean) as string[];
  const commonColor = colorValues.length === 1 && colorsSet.size === 1 ? colorValues[0] : null;

  const parts = finalGroups.map(({ base, color, count }) => {
    let part = base;
    if (!commonColor && color) part += ` ${color}`;
    if (count > 1) part += ` ${count} шт.`;
    return part;
  });

  const prefix = 'Комплект.';
  return commonColor
    ? `${prefix} ${parts.join(' + ')} ${commonColor}`
    : `${prefix} ${parts.join(' + ')}`;
}

function ComponentItem({
  comp,
  onUpdateQty,
  onRemove,
}: {
  comp: KitComponent;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useLanguage();
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={comp}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 50 }}
      className="flex items-center gap-2 sm:gap-3 min-h-[44px] sm:min-h-0 p-2 sm:p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle select-none"
    >
      <div
        onPointerDown={(e) => {
          controls.start(e);
        }}
        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="text-text-muted flex-shrink-0 p-1 -ml-1">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate">{comp.product.productName}</p>
          <p className="text-[10px] sm:text-[11px] text-text-tertiary truncate">
            {comp.product.sku} · {comp.product.powerW ? `${comp.product.powerW}W` : '—'}
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQty(comp.product.id, comp.quantity - 1);
            }}
            className="h-9 w-9 sm:h-6 sm:w-6 rounded bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center justify-center text-xs cursor-pointer"
            aria-label={t('kit.decrease')}
          >
            -
          </button>
          <span className="text-xs sm:text-sm w-6 sm:w-6 text-center">{comp.quantity}</span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQty(comp.product.id, comp.quantity + 1);
            }}
            className="h-9 w-9 sm:h-6 sm:w-6 rounded bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center justify-center text-xs cursor-pointer"
            aria-label={t('kit.increase')}
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(comp.product.id)}
        className="h-9 w-9 sm:h-7 sm:w-7 rounded hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors flex-shrink-0 cursor-pointer flex items-center justify-center"
        aria-label={t('kit.remove')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </Reorder.Item>
  );
}

export default function KitBuilder() {
  const { t } = useLanguage();
  const { products: productsApi, dictionaries } = useDataSource();
  const products = productsApi.list;
  const categories = dictionaries.categories;
  const colors = dictionaries.colors;
  const [kitSku, setKitSku] = useState('');
  const [kitName, setKitName] = useState('');
  const [components, setComponents] = useState<KitComponent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerView, setPickerView] = useState<'categories' | 'products'>('categories');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [addSuccess, setAddSuccess] = useState(false);

  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  const resetPickerState = useCallback(() => {
    setPickerView('categories');
    setSelectedCategoryCode(null);
    setSearchQuery('');
  }, []);

  const openPicker = useCallback(() => {
    setShowPicker(true);
  }, []);

  const availableProducts = useMemo(() => {
    if (pickerView === 'categories') return [];
    return products.filter(
      (p) =>
        p.category.code === selectedCategoryCode &&
        !p.isKit &&
        !components.some((c) => c.product.id === p.id) &&
        (p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.productName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, components, pickerView, selectedCategoryCode]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name_source.toLowerCase().includes(q) || c.name_product.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const skuExists = products.some((p) => p.sku.toLowerCase() === kitSku.trim().toLowerCase());

  useEffect(() => {
    setKitName(generateKitName(components, colors));
  }, [components, colors]);

  const addComponent = (product: ProductWithRelations) => {
    setAddSuccess(false);
    setComponents((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      return existing
        ? prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prev, { product, quantity: 1 }];
    });
    setSearchQuery('');
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.product.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.product.id === id ? { ...c, quantity: Math.max(1, qty) } : c))
    );
  };

  const handleReorder = (newComponents: KitComponent[]) => {
    setComponents(newComponents);
  };

  const handleCreateKit = async () => {
    if (components.length < 2 || !kitName || !kitSku || skuExists) return;

    const powers = components.map((c) => c.product.powerW).filter((p): p is number => p != null);
    const maxPowerW = powers.length > 0 ? Math.max(...powers) : undefined;

    const draft = {
      sku: kitSku,
      skuBase: kitSku.replace(/-\w+$/, ''),
      categoryId: 'cat-kit',
      modelId: 'mod-china-pr',
      isKit: true,
      powerW: maxPowerW,
      deviceCount: components.reduce((sum, c) => sum + c.quantity, 0),
    };

    try {
      await productsApi.create(draft);
      setAddSuccess(true);
      showToast(t('kit.toast_created'));
      setKitName('');
      setKitSku('');
      setComponents([]);
    } catch (err: any) {
      showToast(err?.message || t('kit.toast_duplicate'), 'error');
    }
  };

  const uniquePowers = useMemo(() => {
    const vals = components.map((c) => c.product.powerW).filter((p): p is number => p != null);
    return [...new Set(vals)].sort((a, b) => b - a);
  }, [components]);

  return (
    <div className="space-y-6">
      <Toast data={toast} onClose={hideToast} />

      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('kit.title')}</h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('kit.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Kit Configuration */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-accent" />
              {t('kit.config')}
            </h3>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">{t('kit.article')}</label>
                <input
                  type="text"
                  value={kitSku}
                  onChange={(e) => {
                    setKitSku(e.target.value);
                    setAddSuccess(false);
                  }}
                  placeholder={t('kit.article_placeholder')}
                  className={`w-full text-text-primary h-11 sm:h-10 ${skuExists ? 'border-danger focus:border-danger' : ''}`}
                />
                {kitSku && skuExists && (
                  <p className="text-[10px] text-danger mt-1">{t('kit.article_exists')}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">{t('kit.name')}</label>
                <input
                  type="text"
                  value={kitName}
                  onChange={(e) => {
                    setKitName(e.target.value);
                    setAddSuccess(false);
                  }}
                  placeholder={t('kit.auto_placeholder')}
                  className="w-full text-text-primary h-11 sm:h-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-lg bg-bg-tertiary/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning flex-shrink-0" />
                <span className="text-xs sm:text-sm text-text-secondary">
                  {t('kit.total_power')}
                </span>
                <span
                  className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]"
                  title={uniquePowers.map((p) => `${p}W`).join(', ')}
                >
                  {uniquePowers.length > 0 ? uniquePowers.map((p) => `${p}W`).join(', ') : '—'}
                </span>
              </div>
              <div className="h-4 w-px bg-border-default hidden sm:block" />
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-xs sm:text-sm text-text-secondary">
                  {t('kit.components')}:
                </span>
                <span
                  className={`text-xs sm:text-sm font-medium ${components.length < 2 ? 'text-danger' : 'text-text-primary'}`}
                >
                  {components.length < 2 ? `${components.length}/2` : components.length}
                </span>
              </div>
            </div>
          </div>

          {/* Components List */}
          <div className="glass rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('kit.components')}</h3>
              <div className="flex items-center gap-2">
                {components.length > 0 && (
                  <button
                    onClick={() => setComponents([])}
                    className="flex items-center gap-1.5 h-11 sm:h-9 px-3 rounded-lg text-xs transition-all cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20"
                  >
                    <X className="w-3 h-3" /> {t('kit.clear')}
                  </button>
                )}
                <button
                  onClick={openPicker}
                  className="flex items-center gap-1.5 h-11 sm:h-9 px-3 rounded-lg bg-accent/25 text-white text-xs hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40"
                >
                  <Plus className="w-3 h-3" /> {t('kit.add')}
                </button>
              </div>
            </div>

            {components.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs sm:text-sm">{t('kit.empty_components')}</p>
                <p className="text-[10px] sm:text-xs mt-1">{t('kit.min_components')}</p>
              </div>
            ) : components.length === 1 ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-[11px] sm:text-xs text-danger">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('kit.one_more_needed')}
                </div>
                <Reorder.Group
                  axis="y"
                  values={components}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {components.map((comp) => (
                    <ComponentItem
                      key={comp.product.id}
                      comp={comp}
                      onUpdateQty={updateQuantity}
                      onRemove={removeComponent}
                    />
                  ))}
                </Reorder.Group>
              </>
            ) : (
              <Reorder.Group
                axis="y"
                values={components}
                onReorder={handleReorder}
                className="space-y-2"
              >
                {components.map((comp) => (
                  <ComponentItem
                    key={comp.product.id}
                    comp={comp}
                    onUpdateQty={updateQuantity}
                    onRemove={removeComponent}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-medium mb-4">{t('kit.preview')}</h3>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase mb-1">{t('kit.article')}</p>
                <code className={`text-xs sm:text-sm ${skuExists ? 'text-danger' : 'text-accent'}`}>
                  {kitSku || '—'}
                </code>
              </div>

              <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase mb-1">
                  {t('kit.generated_name')}
                </p>
                <p className={`text-xs sm:text-sm ${kitName ? '' : 'text-text-muted'}`}>
                  {kitName || '—'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-text-tertiary uppercase">
                  {t('kit.components_summary')}
                </p>
                {components.map((comp) => (
                  <div key={comp.product.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate max-w-[140px]">
                      {displaySource(comp.product.model)}
                    </span>
                    <span className="text-text-tertiary flex-shrink-0">×{comp.quantity}</span>
                  </div>
                ))}
                {components.length === 0 && (
                  <p className="text-xs text-text-muted">{t('kit.no_components')}</p>
                )}
              </div>

              {addSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('kit.add_success')}
                </div>
              )}

              <button
                onClick={handleCreateKit}
                disabled={components.length < 2 || !kitName || !kitSku || skuExists || addSuccess}
                className="w-full min-h-[44px] sm:min-h-0 py-2.5 sm:py-2.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer font-medium border border-accent/40"
              >
                {t('kit.create')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      <Modal
        variant="auto"
        width="lg"
        open={showPicker}
        onClose={closePicker}
        onExitComplete={resetPickerState}
        title={t('kit.picker_title')}
        icon={<Package className="w-4 h-4 text-accent flex-shrink-0" />}
        ariaLabel={t('kit.picker_title')}
        height="clamp(75dvh, 80dvh, 95dvh)"
        pinned
        contentClassName="p-0"
      >
        <div className="p-3 sm:p-4 border-b border-border-subtle flex items-center gap-3 bg-bg-secondary">
          {pickerView === 'products' ? (
            <button
              onClick={() => {
                setPickerView('categories');
                setSelectedCategoryCode(null);
                setSearchQuery('');
              }}
              className="p-1.5 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-text-muted ml-1" />
          )}
          <input
            type="text"
            placeholder={
              pickerView === 'categories' ? t('kit.search_categories') : t('kit.search_products')
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none p-0 h-11 sm:h-auto text-sm focus:ring-0 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {pickerView === 'categories' ? (
            filteredCategories.length > 0 ? (
              <div className="p-2 bg-bg-primary/50 min-h-full">
                <div className="space-y-1">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoryCode(cat.code);
                        setPickerView('products');
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 min-h-[44px] sm:min-h-0 p-3 rounded-lg text-left transition-all border border-transparent hover:bg-bg-hover hover:border-border-subtle hover:text-text-primary cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary hover:bg-bg-elevated transition-colors">
                        {(() => {
                          const Icon = categoryIcons[cat.code] || Package;
                          return (
                            <Icon
                              className="w-5 h-5"
                              style={{ color: getCategoryColorVar(cat.code) }}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-text-primary">
                          {displaySource(cat)}
                        </p>
                        <p className="text-[10px] text-text-tertiary truncate mt-0.5">
                          {t('kit.select_components')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-12 text-xs text-text-tertiary">
                {t('kit.no_categories')}
              </p>
            )
          ) : availableProducts.length > 0 ? (
            <div className="p-2 bg-bg-primary/50 min-h-full">
              <div className="space-y-1">
                {availableProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addComponent(product)}
                    className="w-full flex items-center gap-3 min-h-[44px] sm:min-h-0 p-3 rounded-lg text-left transition-all border border-transparent hover:bg-bg-hover hover:border-border-subtle hover:text-text-primary cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary hover:bg-bg-elevated transition-colors">
                      <Hash
                        className="w-5 h-5"
                        style={{ color: getCategoryColorVar(product.category.code) }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-text-primary">
                        {displayProductName(product)}
                      </p>
                      <p className="text-[10px] text-text-tertiary truncate mt-0.5 flex items-center gap-2">
                        <span className="text-accent">{product.sku}</span>
                        {product.powerW && (
                          <span className="text-text-muted">· {product.powerW}W</span>
                        )}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all text-accent flex-shrink-0 cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-12 text-xs text-text-tertiary">{t('kit.no_products')}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
