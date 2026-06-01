import { Fragment, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Check, Hash, Type,
  Copy, Sparkles, RotateCcw
} from 'lucide-react';
import { categories, models, colors, suppliers, connectors, chargingProtocols, materials } from '../data/dictionaries';
import { getModelsByCategory } from '../data/dictionaries';
import { useLanguage } from '../context/LanguageContext';
import { displayName, displaySource, getCategoryColorVar } from '../utils/display';

interface SKUFormData {
  categoryId: string;
  modelId: string;
  baseNumber: string;
  variantCode: string;
  colorId: string;
  lengthM: string;
  lengthVariant: string;
  supplierId: string;
  isKit: boolean;
  powerW: string;
  currentA: string;
  voltageV: string;
  connectorFemaleId: string;
  connectorMaleId: string;
  protocolId: string;
  bodyMaterialId: string;
  wireMaterialId: string;
}

const initialForm: SKUFormData = {
  categoryId: '', modelId: '', baseNumber: '', variantCode: '',
  colorId: '', lengthM: '', lengthVariant: '', supplierId: '',
  isKit: false, powerW: '', currentA: '', voltageV: '',
  connectorFemaleId: '', connectorMaleId: '', protocolId: '',
  bodyMaterialId: '', wireMaterialId: '',
};

export default function SKUConstructor() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SKUFormData>(initialForm);
  const [generatedSKU, setGeneratedSKU] = useState('');
  const [generatedName, setGeneratedName] = useState('');
  const [copied, setCopied] = useState(false);

  const availableModels = useMemo(() => {
    return form.categoryId ? getModelsByCategory(form.categoryId) : [];
  }, [form.categoryId]);

  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const selectedModel = models.find(m => m.id === form.modelId);
  const selectedColor = colors.find(c => c.id === form.colorId);
  const selectedSupplier = suppliers.find(s => s.id === form.supplierId);

  const generateSKU = () => {
    let sku = 'S' + (form.baseNumber || 'XXXXX');
    if (form.variantCode) sku += '-' + form.variantCode;
    if (form.lengthVariant && !form.variantCode) sku += '-' + form.lengthVariant;
    if (selectedColor) sku += '/' + selectedColor.code;
    if (selectedSupplier && selectedSupplier.code !== '-') sku += '-' + selectedSupplier.code;
    if (form.isKit) sku += '-K';
    return sku;
  };

  const generateName = () => {
    if (!selectedCategory) return '';
    const catName = displayName(selectedCategory, language);
    const parts: string[] = [catName + '.'];
    
    if (form.connectorFemaleId) {
      const conn = connectors.find(c => c.id === form.connectorFemaleId);
      if (conn) parts.push(conn.code);
    }
    if (form.connectorMaleId) {
      const conn = connectors.find(c => c.id === form.connectorMaleId);
      if (conn) parts.push('-' + conn.code);
    }
    if (selectedModel) parts.push(displayName(selectedModel, language));
    if (form.lengthM) parts.push(form.lengthM + (language === 'ru' ? 'м' : 'm'));
    if (selectedColor) parts.push(displayName(selectedColor, language).toUpperCase());
    if (form.powerW) parts.push(form.powerW + 'W');
    
    return parts.join(' ');
  };

  const handleGenerate = () => {
    setGeneratedSKU(generateSKU());
    setGeneratedName(generateName());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${generatedSKU}\n${generatedName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateForm = (key: keyof SKUFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (catId: string) => {
    if (form.categoryId === catId) {
      // Снять выбор если кликнули на ту же категорию
      setForm(prev => ({ ...prev, categoryId: '', modelId: '' }));
    } else {
      setForm(prev => ({ ...prev, categoryId: catId, modelId: '' }));
      // Плавный скролл вверх при смене категории
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const toggleModel = (modelId: string) => {
    if (form.modelId === modelId) {
      // Снять выбор если кликнули на ту же модель
      setForm(prev => ({ ...prev, modelId: '' }));
    } else {
      setForm(prev => ({ ...prev, modelId: modelId }));
    }
  };

  const steps = [
    { id: 1, label: t('sku.step1'), description: 'Select product classification' },
    { id: 2, label: t('sku.step2'), description: 'Configure SKU number and variant' },
    { id: 3, label: t('sku.step3'), description: 'Set technical specifications' },
    { id: 4, label: t('sku.step4'), description: 'Color, length, and supplier' },
    { id: 5, label: t('sku.step5'), description: 'Review and generate SKU' },
  ];

  const isStepValid = () => {
    switch (step) {
      case 1: return form.categoryId && form.modelId;
      case 2: return form.baseNumber.length === 5;
      case 3: return true;
      case 4: return form.colorId;
      default: return true;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('sku.title')}</h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('sku.subtitle')}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <Fragment key={s.id}>
                <div className={`flex h-10 min-w-[120px] flex-shrink-0 items-center gap-1.5 sm:gap-2 px-3 rounded-lg text-xs sm:text-sm transition-all ${
              step === s.id
                ? 'bg-accent/25 text-white border border-accent/40 font-medium'
                : step > s.id
                ? 'bg-success/10 text-success'
                : 'bg-bg-secondary text-text-tertiary border border-border-subtle'
            }`}>
              <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 ${
                step === s.id ? 'bg-accent text-white' :
                step > s.id ? 'bg-success text-white' : 'bg-bg-elevated text-text-muted'
              }`}>
                {step > s.id ? <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : s.id}
              </div>
              <span className="truncate">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            )}
          </Fragment>
        ))}
      </div>

      {/* Form Content */}
      <div className="glass rounded-xl p-3 sm:p-6 min-h-[300px] sm:min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-base sm:text-lg font-medium">{t('sku.step1')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-2 block">
                    {language === 'ru' ? 'Категория товара' : 'Product Category'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-2 sm:p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          form.categoryId === cat.id
                            ? 'border-accent/50 bg-accent/20'
                            : 'border-border-subtle bg-bg-tertiary/50 hover:bg-bg-hover hover:border-border-default'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColorVar(cat.code) }} />
                          <span className="text-[11px] sm:text-sm font-medium truncate">
                            {displaySource(cat, language)}
                          </span>
                        </div>
                        <p className="text-[8px] sm:text-[10px] text-text-tertiary mt-0.5 sm:mt-1 truncate">{cat.code}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {form.categoryId && (
                  <div>
                    <label className="text-xs sm:text-sm text-text-secondary mb-2 block">
                      {language === 'ru' ? 'Модель / Линейка' : 'Model / Line'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
                      {availableModels.map(model => (
                        <button
                          key={model.id}
                          onClick={() => toggleModel(model.id)}
                          className={`p-2 sm:p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            form.modelId === model.id
                            ? 'border-accent/50 bg-accent/20'
                            : 'border-border-subtle bg-bg-tertiary/50 hover:bg-bg-hover hover:border-border-default'
                          }`}
                        >
                          <span className="text-[11px] sm:text-sm font-medium block truncate">
                            {displaySource(model, language)}
                          </span>
                          <p className="text-[8px] sm:text-[10px] text-text-tertiary mt-0.5 truncate">{model.code}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h3 className="text-base sm:text-lg font-medium">{t('sku.step2')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Базовый номер (5 цифр)' : 'Base Number (5 digits)'}
                  </label>
                  <input
                    type="text"
                    value={form.baseNumber}
                    onChange={e => updateForm('baseNumber', e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="10000"
                    className="w-full text-text-primary"
                    maxLength={5}
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">
                    S10000-S19999: кабели/СЗУ · S90000-S99999: аксессуары
                  </p>
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Суффикс модели' : 'Variant Code'}
                  </label>
                  <input
                    type="text"
                    value={form.variantCode}
                    onChange={e => updateForm('variantCode', e.target.value.toUpperCase())}
                    placeholder="ST, PR, ORG, E"
                    className="w-full text-text-primary"
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">
                    {language === 'ru' ? 'Дифференциатор модификации' : 'Model differentiation suffix'}
                  </p>
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Переопределение длины' : 'Length Variant'}
                  </label>
                  <input
                    type="text"
                    value={form.lengthVariant}
                    onChange={e => updateForm('lengthVariant', e.target.value)}
                    placeholder="2, 3, 025"
                    className="w-full text-text-primary"
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">
                    {language === 'ru' ? 'Например, -2 для 2 метров' : 'Length override (e.g., -2 for 2m)'}
                  </p>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-center gap-3 text-xs sm:text-sm text-text-secondary cursor-pointer" onClick={() => {}}>
                    <input
                      type="checkbox"
                      checked={form.isKit}
                      onChange={e => updateForm('isKit', e.target.checked)}
                      className="w-4 h-4 rounded accent-accent"
                    />
                    {language === 'ru' ? 'Это комплект (Kit / Combo)' : 'This is a Kit / Combo product'}
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle overflow-x-auto">
                <p className="text-[10px] text-text-tertiary tracking-wide mb-2">
                  {language === 'ru' ? 'Предпросмотр SKU' : 'SKU Preview'}
                </p>
                <code className="text-lg sm:text-xl text-accent">
                  S{form.baseNumber || 'XXXXX'}{form.variantCode ? '-' + form.variantCode : ''}{form.lengthVariant && !form.variantCode ? '-' + form.lengthVariant : ''}
                </code>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h3 className="text-base sm:text-lg font-medium">{t('sku.step3')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Мощность (W)' : 'Power (W)'}
                  </label>
                  <input type="text" value={form.powerW} onChange={e => updateForm('powerW', e.target.value)} placeholder="20" className="w-full text-text-primary" />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Сила тока (A)' : 'Current (A)'}
                  </label>
                  <input type="text" value={form.currentA} onChange={e => updateForm('currentA', e.target.value)} placeholder="3" className="w-full text-text-primary" />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Напряжение (V)' : 'Voltage (V)'}
                  </label>
                  <input type="text" value={form.voltageV} onChange={e => updateForm('voltageV', e.target.value)} placeholder="5" className="w-full text-text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Входной разъем (Мама)' : 'Female Connector'}
                  </label>
                  <select value={form.connectorFemaleId} onChange={e => updateForm('connectorFemaleId', e.target.value)} className="w-full text-text-primary">
                    <option value="">— {language === 'ru' ? 'Выбрать' : 'Select'} —</option>
                    {connectors.map(c => (
                      <option key={c.id} value={c.id}>{displaySource(c, language)} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Выходной разъем (Папа)' : 'Male Connector'}
                  </label>
                  <select value={form.connectorMaleId} onChange={e => updateForm('connectorMaleId', e.target.value)} className="w-full text-text-primary">
                    <option value="">— {language === 'ru' ? 'Выбрать' : 'Select'} —</option>
                    {connectors.map(c => (
                      <option key={c.id} value={c.id}>{displaySource(c, language)} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Протокол зарядки' : 'Charging Protocol'}
                  </label>
                  <select value={form.protocolId} onChange={e => updateForm('protocolId', e.target.value)} className="w-full text-text-primary">
                    <option value="">— {language === 'ru' ? 'Выбрать' : 'Select'} —</option>
                    {chargingProtocols.map(p => (
                      <option key={p.id} value={p.id}>{displaySource(p, language)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Материал корпуса' : 'Body Material'}
                  </label>
                  <select value={form.bodyMaterialId} onChange={e => updateForm('bodyMaterialId', e.target.value)} className="w-full text-text-primary">
                    <option value="">— {language === 'ru' ? 'Выбрать' : 'Select'} —</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{displaySource(m, language)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Материал провода' : 'Wire Material'}
                  </label>
                  <select value={form.wireMaterialId} onChange={e => updateForm('wireMaterialId', e.target.value)} className="w-full text-text-primary">
                    <option value="">— {language === 'ru' ? 'Выбрать' : 'Select'} —</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{displaySource(m, language)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-1 block">
                    {language === 'ru' ? 'Длина (м)' : 'Length (m)'}
                  </label>
                  <input type="text" value={form.lengthM} onChange={e => updateForm('lengthM', e.target.value)} placeholder="1" className="w-full text-text-primary" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h3 className="text-base sm:text-lg font-medium">{t('sku.step4')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-2 sm:mb-3 block">
                    {language === 'ru' ? 'Цвет' : 'Color'}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {colors.map(color => (
                      <button
                        key={color.id}
                        onClick={() => updateForm('colorId', color.id)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          form.colorId === color.id
                            ? 'border-accent/50 bg-accent/20'
                            : 'border-border-subtle bg-bg-tertiary/50 hover:bg-bg-hover hover:border-border-default'
                        }`}
                      >
                        <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full mx-auto mb-1 flex-shrink-0" style={{
                          background: color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : color.hexValue,
                          border: color.hexValue === 'gradient' ? 'none' : '1px solid var(--color-border-subtle)',
                        }} />
                        <span className="text-[9px] sm:text-[10px] block truncate">
                          {displaySource(color, language)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-text-secondary mb-3 block">
                    {language === 'ru' ? 'Поставщик' : 'Supplier'}
                  </label>
                  <div className="space-y-2">
                    {suppliers.map(sup => (
                      <button
                        key={sup.id}
                        onClick={() => updateForm('supplierId', sup.id)}
                        className={`w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          form.supplierId === sup.id
                            ? 'border-accent/50 bg-accent/20'
                            : 'border-border-subtle bg-bg-tertiary/50 hover:bg-bg-hover hover:border-border-default'
                        }`}
                      >
                        <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          sup.code === 'A' ? 'bg-supplier-a-bg text-supplier-a' :
                          sup.code === 'W' ? 'bg-supplier-w-bg text-supplier-w' :
                          sup.code === 'AW' ? 'bg-supplier-aw-bg text-supplier-aw' :
                          'bg-bg-elevated text-text-muted'
                        }`}>
                          {sup.code === '-' ? '—' : sup.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {sup.name}
                          </p>
                          <p className="text-[9px] sm:text-[10px] text-text-tertiary truncate">{sup.contactInfo}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <h3 className="text-base sm:text-lg font-medium">{t('sku.step5')}</h3>
              
              {!generatedSKU ? (
                <div className="text-center py-12">
                  <Sparkles className="w-8 h-8 text-accent mx-auto mb-3 animate-pulse" />
                  <p className="text-text-secondary text-sm">
                    {language === 'ru' ? 'Нажмите "Сгенерировать" для создания финального SKU и названия' : 'Click generate to create the SKU and product name'}
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="p-4 sm:p-5 rounded-xl bg-bg-tertiary border border-border-subtle space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Hash className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-accent flex-shrink-0" />
                        <span className="text-[10px] sm:text-xs text-text-tertiary tracking-wide">SKU</span>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 sm:gap-1.5 text-xs text-accent hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? (language === 'ru' ? 'Скопировано' : 'Copied') : (language === 'ru' ? 'Копировать' : 'Copy')}
                      </button>
                    </div>
                    <code className="text-xl sm:text-2xl text-accent block overflow-x-auto">{generatedSKU}</code>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-bg-tertiary border border-border-subtle space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Type className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-success flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-text-tertiary tracking-wide">
                        {language === 'ru' ? 'Название товара' : 'Product Name'}
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-medium">{generatedName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase truncate">
                        {language === 'ru' ? 'Категория' : 'Category'}
                      </p>
                      <p className="text-xs sm:text-sm truncate">
                        {selectedCategory ? displaySource(selectedCategory, language) : ''}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase truncate">
                        {language === 'ru' ? 'Модель' : 'Model'}
                      </p>
                      <p className="text-xs sm:text-sm truncate">
                        {selectedModel ? displaySource(selectedModel, language) : ''}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase truncate">
                        {language === 'ru' ? 'Цвет' : 'Color'}
                      </p>
                      <p className="text-xs sm:text-sm truncate">
                        {selectedColor ? displaySource(selectedColor, language) : ''}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase truncate">
                        {language === 'ru' ? 'Поставщик' : 'Supplier'}
                      </p>
                      <p className="text-xs sm:text-sm truncate">{selectedSupplier?.name}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-border-subtle text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-border-default disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> {t('sku.prev')}
        </button>

        {step < 5 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!isStepValid()}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium border border-accent/40 cursor-pointer"
          >
            {t('sku.next')} <ChevronRight className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setForm(initialForm); setStep(1); setGeneratedSKU(''); setGeneratedName(''); }}
              className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-border-subtle text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> {t('sku.reset')}
            </button>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all font-medium border border-accent/40 cursor-pointer"
            >
              <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> {t('sku.generate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
