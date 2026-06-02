import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Plug, Zap, Truck, Layers, Tag,
  Plus, Edit3, X, Check, Box
} from 'lucide-react';
import {
  categories, models, colors, suppliers, connectors, chargingProtocols, materials
} from '../data/dictionaries';
import { useLanguage } from '../context/LanguageContext';
import { useLayout } from '../context/LayoutContext';
import { displayName, displaySource, getCategoryColorVar } from '../utils/display';
import BottomSheet from './BottomSheet';

type DictType = 'categories' | 'models' | 'colors' | 'suppliers' | 'connectors' | 'protocols' | 'materials';

export default function DictionaryManager() {
  const { t, language } = useLanguage();
  const { isMobile } = useLayout();
  const [activeDict, setActiveDict] = useState<DictType>('categories');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Состояния для формы добавления
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dictConfig: { id: DictType; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'categories', label: language === 'ru' ? 'Категории' : 'Categories', icon: Layers, count: categories.length },
    { id: 'models', label: language === 'ru' ? 'Модели' : 'Models', icon: Tag, count: models.length },
    { id: 'colors', label: language === 'ru' ? 'Цвета' : 'Colors', icon: Palette, count: colors.length },
    { id: 'suppliers', label: language === 'ru' ? 'Поставщики' : 'Suppliers', icon: Truck, count: suppliers.length },
    { id: 'connectors', label: language === 'ru' ? 'Разъемы' : 'Connectors', icon: Plug, count: connectors.length },
    { id: 'protocols', label: language === 'ru' ? 'Протоколы' : 'Protocols', icon: Zap, count: chargingProtocols.length },
    { id: 'materials', label: language === 'ru' ? 'Материалы' : 'Materials', icon: Box, count: materials.length },
  ];

  const handleSave = () => {
    if (!code || !nameRu) return;
    
    // Имитация успешного сохранения
    setToastMessage(language === 'ru' ? `Запись "${nameRu}" успешно добавлена в справочник!` : `Entry "${nameEn || nameRu}" successfully added!`);
    setCode('');
    setNameEn('');
    setNameRu('');
    setShowAddForm(false);

    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const renderTable = () => {
    switch (activeDict) {
      case 'categories':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.color')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{cat.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{displaySource(cat, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">{displayName(cat, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getCategoryColorVar(cat.code) }} /><span className="text-xs text-text-tertiary">{cat.color}</span></div></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'models':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.category')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {models.map(model => {
                const cat = categories.find(c => c.id === model.categoryId);
                return (
                  <tr key={model.id} className="border-b border-border-subtle/50 table-row-hover">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{model.code}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{displaySource(model, language)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">{displayName(model, language)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3"><span className="text-xs" style={{ color: cat?.color }}>{cat ? displaySource(cat, language) : '—'}</span></td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      case 'colors':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.preview')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {colors.map(color => (
                <tr key={color.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{color.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{displaySource(color, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">{displayName(color, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><div className="flex items-center gap-1.5 sm:gap-2"><div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full flex-shrink-0" style={{ background: color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : color.hexValue }} /><span className="text-xs text-text-tertiary hidden sm:inline">{color.hexValue === 'gradient' ? '—' : color.hexValue}</span></div></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'suppliers':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{language === 'ru' ? 'Название' : 'Name'}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{sup.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">{sup.name}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'connectors':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.product')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {connectors.map(conn => (
                <tr key={conn.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{conn.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{displaySource(conn, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">{displayName(conn, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'protocols':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.description')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {chargingProtocols.map(proto => (
                <tr key={proto.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{proto.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{displaySource(proto, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">{displayName(proto, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-text-secondary">{proto.description}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'materials':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.product')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {materials.map(mat => (
                <tr key={mat.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent">{mat.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary">{displaySource(mat, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3">{displayName(mat, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  const editBtn = (
    <button className="h-11 w-11 sm:h-9 sm:w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer flex items-center justify-center">
      <Edit3 className="w-3.5 h-3.5" />
    </button>
  );

  const codeChip = (code: string) => (
    <code className="text-[10px] sm:text-xs text-accent shrink-0">{code}</code>
  );

  const renderCards = () => {
    switch (activeDict) {
      case 'categories':
        return (
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">{codeChip(cat.code)}</div>
                  <p className="text-sm text-text-primary truncate">{displayName(cat, language)}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(cat, language)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: getCategoryColorVar(cat.code) }} />
                    <span className="text-[10px] text-text-tertiary truncate">{cat.color}</span>
                  </div>
                </div>
                {editBtn}
              </div>
            ))}
          </div>
        );
      case 'models':
        return (
          <div className="space-y-2">
            {models.map(model => {
              const cat = categories.find(c => c.id === model.categoryId);
              return (
                <div key={model.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">{codeChip(model.code)}</div>
                    <p className="text-sm text-text-primary truncate">{displayName(model, language)}</p>
                    <p className="text-[11px] text-text-tertiary truncate">{displaySource(model, language)}</p>
                    {cat && (
                      <p className="text-[10px] mt-1.5 truncate" style={{ color: cat.color }}>{displaySource(cat, language)}</p>
                    )}
                  </div>
                  {editBtn}
                </div>
              );
            })}
          </div>
        );
      case 'colors':
        return (
          <div className="space-y-2">
            {colors.map(color => (
              <div key={color.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">{codeChip(color.code)}</div>
                  <p className="text-sm text-text-primary truncate">{displayName(color, language)}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(color, language)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : color.hexValue }} />
                    <span className="text-[10px] text-text-tertiary truncate">{color.hexValue === 'gradient' ? '—' : color.hexValue}</span>
                  </div>
                </div>
                {editBtn}
              </div>
            ))}
          </div>
        );
      case 'suppliers':
        return (
          <div className="space-y-2">
            {suppliers.map(sup => (
              <div key={sup.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">{codeChip(sup.code)}</div>
                  <p className="text-sm text-text-primary truncate">{sup.name}</p>
                </div>
                {editBtn}
              </div>
            ))}
          </div>
        );
      case 'connectors':
        return (
          <div className="space-y-2">
            {connectors.map(conn => (
              <div key={conn.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">{codeChip(conn.code)}</div>
                  <p className="text-sm text-text-primary truncate">{displayName(conn, language)}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(conn, language)}</p>
                </div>
                {editBtn}
              </div>
            ))}
          </div>
        );
      case 'protocols':
        return (
          <div className="space-y-2">
            {chargingProtocols.map(proto => (
              <div key={proto.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">{codeChip(proto.code)}</div>
                  <p className="text-sm text-text-primary truncate">{displayName(proto, language)}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(proto, language)}</p>
                  {proto.description && (
                    <p className="text-[10px] text-text-tertiary mt-1.5 line-clamp-2">{proto.description}</p>
                  )}
                </div>
                {editBtn}
              </div>
            ))}
          </div>
        );
      case 'materials':
        return (
          <div className="space-y-2">
            {materials.map(mat => (
              <div key={mat.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">{codeChip(mat.code)}</div>
                  <p className="text-sm text-text-primary truncate">{displayName(mat, language)}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(mat, language)}</p>
                </div>
                {editBtn}
              </div>
            ))}
          </div>
        );
    }
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
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('dict.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('dict.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all self-start sm:self-auto cursor-pointer font-medium border border-accent/40"
        >
          <Plus className="w-4 h-4" /> {t('dict.add')}
        </button>
      </div>

      {/* Dictionary Selector */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {dictConfig.map(dict => (
          <button
            key={dict.id}
            onClick={() => setActiveDict(dict.id)}
            className={`flex h-11 sm:h-10 min-w-0 sm:min-w-[120px] items-center justify-center gap-1.5 sm:gap-2 px-3 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
              activeDict === dict.id
                ? 'bg-accent/25 text-white border border-accent/40 font-medium'
                : 'bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <dict.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{dict.label}</span>
            <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${activeDict === dict.id ? 'bg-accent/20' : 'bg-bg-elevated'}`}>
              {dict.count}
            </span>
          </button>
        ))}
      </div>

      {/* Add Form — mobile: BottomSheet; desktop: inline collapse */}
      {isMobile ? (
        <BottomSheet
          open={showAddForm}
          onClose={() => setShowAddForm(false)}
          title={`${language === 'ru' ? 'Добавить: ' : 'Add: '}${dictConfig.find(d => d.id === activeDict)?.label ?? ''}`}
          icon={<Plus className="w-4 h-4 text-accent flex-shrink-0" />}
          ariaLabel={language === 'ru' ? 'Добавить запись' : 'Add entry'}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 h-11 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors border border-border-subtle cursor-pointer"
              >
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!code || !nameRu}
                className="flex-1 h-11 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {language === 'ru' ? 'Сохранить' : 'Save'}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
              <input
                type="text"
                placeholder={language === 'ru' ? 'Уникальный код' : 'Unique code'}
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.source')}</label>
              <input
                type="text"
                placeholder={language === 'ru' ? 'Название-источник (как в словаре)' : 'Source name (as in dictionary)'}
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
              <input
                type="text"
                placeholder={language === 'ru' ? 'Товарное название' : 'Product name'}
                value={nameRu}
                onChange={e => setNameRu(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
          </div>
        </BottomSheet>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: showAddForm ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
            opacity: showAddForm ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="glass rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">
                  {language === 'ru' ? 'Добавление записи:' : 'Add New'} {dictConfig.find(d => d.id === activeDict)?.label}
                </h3>
                <button onClick={() => setShowAddForm(false)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
                  <input
                    type="text"
                    placeholder={language === 'ru' ? 'Уникальный код' : 'Unique code'}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.source')}</label>
                  <input
                    type="text"
                    placeholder={language === 'ru' ? 'Название-источник (как в словаре)' : 'Source name (as in dictionary)'}
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
                  <input
                    type="text"
                    placeholder={language === 'ru' ? 'Товарное название' : 'Product name'}
                    value={nameRu}
                    onChange={e => setNameRu(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
                >
                  {language === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!code || !nameRu}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
                >
                  <Check className="w-3.5 h-3.5" /> {language === 'ru' ? 'Сохранить' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data — mobile cards, desktop table */}
      <div className="hidden sm:block">
        <div className="glass rounded-xl overflow-hidden">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[450px] sm:min-w-[600px]">
              {renderTable()}
            </div>
          </div>
        </div>
      </div>
      <div className="sm:hidden">
        {renderCards()}
      </div>
    </div>
  );
}
