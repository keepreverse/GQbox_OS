import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Package, Plus, X, Search, ChevronRight, Zap,
  Hash, Layers, Check, ArrowLeft, Cable, Wifi, Car, Headphones,
  ArrowLeftRight, Pin, GripVertical, Smartphone, Archive, Monitor
} from 'lucide-react';
import { products } from '../data/products';
import { categories, colors } from '../data/dictionaries';
import type { ProductWithRelations } from '../data/types';
import { useLanguage } from '../context/LanguageContext';
import { displayProductName, displaySource, getCategoryColorVar } from '../utils/display';

const categoryIcons: Record<string, React.ElementType> = {
  cable: Cable, szu: Zap, bzu: Wifi, azu: Car, headphones: Headphones,
  adapter: ArrowLeftRight, pin: Pin, holder: GripVertical, case: Smartphone,
  kit: Package, packaging: Archive, blogo: Monitor,
};

interface KitComponent {
  product: ProductWithRelations;
  quantity: number;
}

function generateKitName(items: KitComponent[], lang: 'ru' | 'en') {
  const expanded = items.flatMap(item => Array.from({ length: item.quantity }, () => displayProductName(item.product, lang)));
  const cleaned = expanded.map(v => String(v || '').trim()).filter(v => v && v !== '-');

  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];

  const allSame = cleaned.every(item => item === cleaned[0]);
  if (allSame) {
    return lang === 'ru'
      ? `Комплект. ${cleaned[0]} ${cleaned.length} шт.`
      : `Kit. ${cleaned[0]} ${cleaned.length} pcs.`;
  }

  const colorNames = colors
    .map(color => lang === 'ru' ? color.nameRu : (color.nameEn || color.nameRu))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const parseComponent = (str: string) => {
    const normalized = str.trim();
    const foundColor = colorNames.find(color => normalized.endsWith(` ${color}`));
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

  const pinPrefix = lang === 'ru' ? 'Пин.' : 'Pin.';
  const pinItems = groups.filter(group => group.base.startsWith(pinPrefix));
  const otherItems = groups.filter(group => !group.base.startsWith(pinPrefix));

  let pinPart: { base: string; color: string | null; count: number } | null = null;
  if (pinItems.length > 0) {
    const values = pinItems.map(pin => {
      let value = pin.base.replace(new RegExp(`^${pinPrefix.replace('.', '\\.') }\\s*`), '');
      if (pin.count > 1) value += lang === 'ru' ? ` ${pin.count} шт.` : ` ${pin.count} pcs.`;
      return value;
    });
    pinPart = { base: `${pinPrefix} ${values.join(' + ')}`, color: null, count: 1 };
  }

  const finalGroups = [...otherItems, ...(pinPart ? [pinPart] : [])];
  const colorsSet = new Set(finalGroups.map(g => g.color));
  const colorValues = Array.from(colorsSet).filter(Boolean) as string[];
  const commonColor = colorValues.length === 1 && colorsSet.size === 1 ? colorValues[0] : null;

  const parts = finalGroups.map(({ base, color, count }) => {
    let part = base;
    if (!commonColor && color) part += ` ${color}`;
    if (count > 1) part += lang === 'ru' ? ` ${count} шт.` : ` ${count} pcs.`;
    return part;
  });

  const prefix = lang === 'ru' ? 'Комплект.' : 'Kit.';
  return commonColor ? `${prefix} ${parts.join(' + ')} ${commonColor}` : `${prefix} ${parts.join(' + ')}`;
}

export default function KitBuilder() {
  const { t, language } = useLanguage();
  const [kitSku, setKitSku] = useState('');
  const [kitName, setKitName] = useState('');
  const [kitNameRu, setKitNameRu] = useState('');
  const [components, setComponents] = useState<KitComponent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [pickerView, setPickerView] = useState<'categories' | 'products'>('categories');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const MODAL_CLOSE_MS = 150;

  const closePicker = useCallback(() => {
    setPickerClosing(true);
    setTimeout(() => {
      setShowPicker(false);
      setPickerClosing(false);
      setPickerView('categories');
      setSelectedCategoryCode(null);
      setSearchQuery('');
    }, MODAL_CLOSE_MS);
  }, []);

  const openPicker = useCallback(() => {
    setPickerClosing(false);
    setShowPicker(true);
  }, []);

  const availableProducts = useMemo(() => {
    if (pickerView === 'categories') return [];
    return products.filter(p => 
      p.category.code === selectedCategoryCode &&
      !p.isKit && 
      !components.some(c => c.product.id === p.id) &&
      (p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.fullNameRu.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, components, pickerView, selectedCategoryCode]);

  const skuExists = products.some(p => p.sku.toLowerCase() === kitSku.trim().toLowerCase());

  useEffect(() => {
    setKitNameRu(generateKitName(components, 'ru'));
    setKitName(generateKitName(components, 'en'));
  }, [components, language]);

  const addComponent = (product: ProductWithRelations) => {
    setComponents(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      return existing
        ? prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...prev, { product, quantity: 1 }];
    });
    setSearchQuery('');
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.product.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setComponents(prev => prev.map(c => c.product.id === id ? { ...c, quantity: Math.max(1, qty) } : c));
  };

  const handleReorder = (newComponents: KitComponent[]) => {
    setComponents(newComponents);
  };

  const handleCreateKit = () => {
    if (components.length === 0 || !kitNameRu || !kitSku || skuExists) return;

    setToastMessage(language === 'ru' ? `Комплект "${kitNameRu}" успешно сформирован и сохранен!` : `Kit "${kitName || kitNameRu}" successfully created!`);
    setKitName('');
    setKitNameRu('');
    setKitSku('');
    setComponents([]);

    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const totalPower = components.reduce((sum, c) => sum + (c.product.powerW || 0), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-text-tertiary mb-1 block">
                  {language === 'ru' ? 'Артикул комплекта' : 'Kit Article'}
                </label>
                <input
                  type="text"
                  value={kitSku}
                  onChange={e => setKitSku(e.target.value)}
                  placeholder={language === 'ru' ? 'Введите артикул вручную' : 'Enter article manually'}
                  className={`w-full text-text-primary h-11 sm:h-10 ${skuExists ? 'border-danger focus:border-danger' : ''}`}
                />
                {kitSku && skuExists && (
                  <p className="text-[10px] text-danger mt-1">
                    {language === 'ru' ? 'Такой артикул уже занят в базе' : 'This article already exists'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">{t('kit.nameEn')}</label>
                <input
                  type="text"
                  value={kitName}
                  onChange={e => setKitName(e.target.value)}
                  placeholder={language === 'ru' ? 'Сгенерируется автоматически' : 'Generated automatically'}
                  className="w-full text-text-primary h-11 sm:h-10"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">{t('kit.nameRu')}</label>
                <input
                  type="text"
                  value={kitNameRu}
                  onChange={e => setKitNameRu(e.target.value)}
                  placeholder={language === 'ru' ? 'Сгенерируется автоматически' : 'Generated automatically'}
                  className="w-full text-text-primary h-11 sm:h-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-lg bg-bg-tertiary/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning flex-shrink-0" />
                <span className="text-xs sm:text-sm text-text-secondary">
                  {language === 'ru' ? 'Общая мощность:' : 'Total Power:'}
                </span>
                <span className="text-xs sm:text-sm font-medium">{totalPower}W</span>
              </div>
              <div className="h-4 w-px bg-border-default hidden sm:block" />
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-xs sm:text-sm text-text-secondary">
                  {t('kit.components')}:
                </span>
                <span className="text-xs sm:text-sm font-medium">{components.length}</span>
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
                    <X className="w-3 h-3" /> {language === 'ru' ? 'Очистить' : 'Clear'}
                  </button>
                )}
                <button
                  onClick={openPicker}
                  className="flex items-center gap-1.5 h-11 sm:h-9 px-3 rounded-lg bg-accent/25 text-white text-xs hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40"
                >
                  <Plus className="w-3 h-3" /> {language === 'ru' ? 'Добавить' : 'Add'}
                </button>
              </div>
            </div>

            {components.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs sm:text-sm">
                  {language === 'ru' ? 'В комплект пока не добавлено сырьё' : 'No raw materials added yet'}
                </p>
                <p className="text-[10px] sm:text-xs mt-1">
                  {language === 'ru' ? 'Нажмите "Добавить" для формирования набора' : 'Click "Add" to build your kit'}
                </p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={components} onReorder={handleReorder} className="space-y-2">
                {components.map((comp) => (
                  <Reorder.Item
                    key={comp.product.id}
                    value={comp}
                    className="flex items-center gap-2 sm:gap-3 min-h-[44px] sm:min-h-0 p-2 sm:p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle cursor-grab active:cursor-grabbing"
                  >
                    <div className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {language === 'ru' ? comp.product.fullNameRu : comp.product.fullName}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-text-tertiary truncate">{comp.product.sku} · {comp.product.powerW ? `${comp.product.powerW}W` : 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(comp.product.id, comp.quantity - 1)}
                        className="h-11 w-11 sm:h-6 sm:w-6 rounded bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center justify-center text-xs cursor-pointer"
                        aria-label={language === 'ru' ? 'Уменьшить' : 'Decrease'}
                      >
                        -
                      </button>
                      <span className="text-xs sm:text-sm w-6 sm:w-6 text-center">{comp.quantity}</span>
                      <button
                        onClick={() => updateQuantity(comp.product.id, comp.quantity + 1)}
                        className="h-11 w-11 sm:h-6 sm:w-6 rounded bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center justify-center text-xs cursor-pointer"
                        aria-label={language === 'ru' ? 'Увеличить' : 'Increase'}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeComponent(comp.product.id)}
                      className="h-11 w-11 sm:h-7 sm:w-7 rounded hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors flex-shrink-0 cursor-pointer flex items-center justify-center"
                      aria-label={language === 'ru' ? 'Удалить' : 'Remove'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Reorder.Item>
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
                <p className="text-[10px] text-text-tertiary uppercase mb-1">
                  {language === 'ru' ? 'Артикул комплекта' : 'Kit Article'}
                </p>
                <code className={`text-xs sm:text-sm ${skuExists ? 'text-danger' : 'text-accent'}`}>
                  {kitSku || '—'}
                </code>
              </div>
              
              <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase mb-1">
                  {language === 'ru' ? 'Сгенерированное название' : 'Generated Name'}
                </p>
                <p className={`text-xs sm:text-sm ${kitNameRu ? '' : 'text-text-muted'}`}>
                  {kitNameRu || '—'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-text-tertiary uppercase">
                  {language === 'ru' ? 'Сводка компонентов' : 'Components Summary'}
                </p>
                {components.map(comp => (
                  <div key={comp.product.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate max-w-[140px]">
                      {displaySource(comp.product.model, language)}
                    </span>
                    <span className="text-text-tertiary flex-shrink-0">×{comp.quantity}</span>
                  </div>
                ))}
                {components.length === 0 && (
                  <p className="text-xs text-text-muted">
                    {language === 'ru' ? 'Нет компонентов' : 'No components'}
                  </p>
                )}
              </div>

              <button
                onClick={handleCreateKit}
                disabled={components.length === 0 || !kitNameRu || !kitSku || skuExists}
                className="w-full min-h-[44px] sm:min-h-0 py-2.5 sm:py-2.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer font-medium border border-accent/40"
              >
                {t('kit.create')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showPicker && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm t-backdrop${pickerClosing ? ' is-closing' : ''}`}
          onClick={closePicker}
        >
          <div
            className={`t-modal glass-strong rounded-xl w-full max-w-lg max-h-[70dvh] flex flex-col border border-border-strong shadow-2xl overflow-hidden${!pickerClosing ? ' is-open' : ' is-closing'}`}
            onClick={e => e.stopPropagation()}
          >
              <div className="p-4 border-b border-border-subtle flex items-center gap-3 bg-bg-secondary">
                {pickerView === 'products' ? (
                  <button onClick={() => { setPickerView('categories'); setSelectedCategoryCode(null); setSearchQuery(''); }} className="p-1.5 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="w-4 h-4 text-text-muted ml-1" />
                )}
                <input
                  type="text"
                  autoFocus
                  placeholder={language === 'ru' ? (pickerView === 'categories' ? 'Поиск категории...' : 'Поиск товаров...') : (pickerView === 'categories' ? 'Search category...' : 'Search products...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none p-0 h-11 sm:h-auto text-sm focus:ring-0 text-text-primary placeholder:text-text-muted"
                />
                <button onClick={closePicker} className="p-1.5 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 bg-bg-primary/50">
                {pickerView === 'categories' ? (
                  <div className="space-y-1">
                    {categories
                      .filter(c => c.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => { setSelectedCategoryCode(cat.code); setPickerView('products'); setSearchQuery(''); }}
                          className="w-full flex items-center gap-3 min-h-[44px] sm:min-h-0 p-3 rounded-lg text-left transition-all border border-transparent hover:bg-bg-hover hover:border-border-subtle hover:text-text-primary cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary hover:bg-bg-elevated transition-colors">
                            {(() => {
                              const Icon = categoryIcons[cat.code] || Archive;
                              return <Icon className="w-5 h-5" style={{ color: getCategoryColorVar(cat.code) }} />;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-text-primary">
                              {displaySource(cat, language)}
                            </p>
                            <p className="text-[10px] text-text-tertiary truncate mt-0.5">
                              {language === 'ru' ? 'Выбрать компоненты' : 'Select components'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0" />
                        </button>
                      ))}
                    {categories.filter(c => c.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                       <p className="text-center py-12 text-xs text-text-tertiary">
                         {language === 'ru' ? 'Категории не найдены' : 'No categories found'}
                       </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {availableProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addComponent(product)}
                        className="w-full flex items-center gap-3 min-h-[44px] sm:min-h-0 p-3 rounded-lg text-left transition-all border border-transparent hover:bg-bg-hover hover:border-border-subtle hover:text-text-primary cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary hover:bg-bg-elevated transition-colors">
                          <Hash className="w-5 h-5" style={{ color: getCategoryColorVar(product.category.code) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-text-primary">
                            {displayProductName(product, language)}
                          </p>
                          <p className="text-[10px] text-text-tertiary truncate mt-0.5 flex items-center gap-2">
                            <span className="text-accent">{product.sku}</span>
                            {product.powerW && <span className="text-text-muted">· {product.powerW}W</span>}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all text-accent flex-shrink-0 cursor-pointer">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                    {availableProducts.length === 0 && (
                      <p className="text-center py-12 text-xs text-text-tertiary">
                        {language === 'ru' ? 'Товары не найдены' : 'No products found'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
