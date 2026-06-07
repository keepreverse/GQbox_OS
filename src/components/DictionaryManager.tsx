import { useState, useEffect } from 'react';
import {
  Palette, Plug, Zap, Truck, Layers, Tag,
  Plus, Edit3, X, Check, Box
} from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import {
  categories, models, colors, suppliers, connectors, chargingProtocols, materials,
  addCategory, addModel, addColor, addSupplier, addConnector, addProtocol, addMaterial,
  updateCategory, updateModel, updateColor, updateSupplier, updateConnector, updateProtocol, updateMaterial,
} from '../data/dictionaries';
import { rebuildProducts } from '../data/products';
import type { Category, Model, Color, Supplier, Connector, ChargingProtocol, Material } from '@app-types';
import { useLanguage } from '../context/LanguageContext';
import { displayName, displaySource, getCategoryColorVar } from '../utils/display';
import Modal from './Modal';
import { dictionariesApi } from '../api/dictionaries';
import { ResponsiveTable } from './ResponsiveTable';
import type { Column } from '@app-types/table';

type DictType = 'categories' | 'models' | 'colors' | 'suppliers' | 'connectors' | 'protocols' | 'materials';

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const handle = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handle);
    setIsNarrow(mql.matches);
    return () => mql.removeEventListener('change', handle);
  }, []);
  return isNarrow;
}

export default function DictionaryManager() {
  const { t, language } = useLanguage();
  const isNarrow = useIsNarrow();
  const [activeDict, setActiveDict] = useState<DictType>('categories');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [code, setCode] = useState('');
  const [nameSource, setNameSource] = useState('');
  const [nameProduct, setNameProduct] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameSource, setEditNameSource] = useState('');
  const [editNameProduct, setEditNameProduct] = useState('');

  useEffect(() => {
    setEditingId(null);
  }, [activeDict]);

  const dictTypeMap: Record<DictType, string> = {
    categories: 'categories', models: 'models', colors: 'colors',
    suppliers: 'suppliers', connectors: 'connectors',
    protocols: 'chargingProtocols', materials: 'materials',
  };

  const localUpdateMap: Record<string, (id: string, updates: any) => void> = {
    categories: updateCategory, models: updateModel, colors: updateColor,
    suppliers: updateSupplier, connectors: updateConnector,
    chargingProtocols: updateProtocol, materials: updateMaterial,
  };

  const dictLabels: Record<DictType, string> = {
    categories: t('dict.tab.categories'), models: t('dict.tab.models'), colors: t('dict.tab.colors'),
    suppliers: t('dict.tab.suppliers'), connectors: t('dict.tab.connectors'), protocols: t('dict.tab.protocols'), materials: t('dict.tab.materials'),
  };
  const dictConfig: { id: DictType; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'categories', label: dictLabels.categories, icon: Layers, count: categories.length },
    { id: 'models', label: dictLabels.models, icon: Tag, count: models.length },
    { id: 'colors', label: dictLabels.colors, icon: Palette, count: colors.length },
    { id: 'suppliers', label: dictLabels.suppliers, icon: Truck, count: suppliers.length },
    { id: 'connectors', label: dictLabels.connectors, icon: Plug, count: connectors.length },
    { id: 'protocols', label: dictLabels.protocols, icon: Zap, count: chargingProtocols.length },
    { id: 'materials', label: dictLabels.materials, icon: Box, count: materials.length },
  ];

  const handleSave = async () => {
    if (!code || !nameSource || !nameProduct) return;

    const idPrefixMap: Record<string, string> = {
      categories: 'cat-', models: 'mod-', colors: 'col-',
      suppliers: 'sup-', connectors: 'conn-',
      chargingProtocols: 'prot-', materials: 'mat-',
    };

    const apiType = dictTypeMap[activeDict];
    const prefix = idPrefixMap[apiType];
    const id = `${prefix}${code}`;
    const item: Record<string, unknown> = { id, code, name_source: nameSource, name_product: nameProduct };
    if (apiType === 'suppliers') {
      delete item.name_source;
      delete item.name_product;
      item.name = nameSource;
    }

    const dictData = { categories, models, colors, suppliers, connectors, chargingProtocols, materials };
    const entries = dictData[apiType as keyof typeof dictData] as any[];
    const sourceKey = apiType === 'suppliers' ? 'name' : 'name_source';
    if (entries.some((e: any) => (e[sourceKey] || '').toLowerCase() === nameSource.toLowerCase())) {
      showToast(t('dict.toast_source_duplicate').replace('{name}', nameSource), 'error');
      return;
    }

    try {
      await dictionariesApi.add(apiType as never, item);
    } catch {
      // API unavailable, continue with local only
    }
    const localAdd: Record<string, (item: any) => boolean> = {
      categories: addCategory, models: addModel, colors: addColor,
      suppliers: addSupplier, connectors: addConnector,
      chargingProtocols: addProtocol, materials: addMaterial,
    };
    const added = localAdd[apiType]?.(item) ?? true;
    rebuildProducts();
    if (added) {
      showToast(t('dict.toast_added').replace('{name}', nameProduct));
      setCode('');
      setNameSource('');
      setNameProduct('');
      setShowAddForm(false);
    } else {
      showToast(t('dict.toast_duplicate').replace('{code}', code), 'error');
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditNameSource(typeof item.name_source === 'string' ? item.name_source : item.name || '');
    setEditNameProduct(typeof item.name_product === 'string' ? item.name_product : item.name_source || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const apiType = dictTypeMap[activeDict];
    const localType = dictTypeMap[activeDict];
    const updates: Record<string, unknown> = {
      name_source: editNameSource,
      name_product: editNameProduct,
      name: editNameSource,
    };

    const dictData = { categories, models, colors, suppliers, connectors, chargingProtocols, materials };
    const entries = dictData[apiType as keyof typeof dictData] as any[];
    const sourceKey = apiType === 'suppliers' ? 'name' : 'name_source';
    if (entries.some((e: any) => e.id !== editingId && (e[sourceKey] || '').toLowerCase() === editNameSource.toLowerCase())) {
      showToast(t('dict.toast_source_duplicate').replace('{name}', editNameSource), 'error');
      return;
    }

    try {
      await dictionariesApi.update(apiType as never, editingId, updates);
    } catch {
      // API unavailable, continue with local only
    }
    localUpdateMap[localType]?.(editingId, updates);
    rebuildProducts();
    showToast(t('dict.save_success').replace('{name}', editNameProduct));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const editInputCls = 'w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary';

  const renderActions = (row: { id: string }) => {
    const isEditing = editingId === row.id;
    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1">
          <button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => handleStartEdit(row)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
      </div>
    );
  };

  const sourceCell = (row: { id: string; name_source?: string; name?: string }) => {
    const value = displaySource(row);
    if (editingId === row.id) {
      return <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className={editInputCls} placeholder={t('dict.form.source_placeholder')} />;
    }
    return <span className="text-text-secondary truncate block" title={value}>{value}</span>;
  };

  const productCell = (row: { id: string; name_source?: string; name_product?: string }) => {
    const value = displayName(row as never, language);
    if (editingId === row.id) {
      return <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className={editInputCls} placeholder={t('dict.form.product_placeholder')} />;
    }
    return <span className="truncate block" title={value}>{value}</span>;
  };

  const dictColumns: Record<DictType, Column<any>[]> = {
    categories: [
      { key: 'code', header: t('dict.col.code'), width: 15, nowrap: true, cell: (c: Category) => <span className="text-xs text-accent truncate block" title={c.code}>{c.code}</span> },
      { key: 'source', header: t('dict.col.source'), width: 28, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 28, cell: productCell },
      { key: 'color', header: t('dict.col.color'), width: 18, cell: (c: Category) => (
        <div className="flex items-center gap-2 min-w-0" title={c.color}>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getCategoryColorVar(c.code) }} />
          <span className="text-xs text-text-tertiary truncate">{c.color}</span>
        </div>
      ) },
      { key: 'actions', header: t('dict.col.actions'), width: 11, align: 'right', cell: renderActions },
    ],
    models: [
      { key: 'code', header: t('dict.col.code'), width: 12, nowrap: true, cell: (m: Model) => <span className="text-xs text-accent truncate block" title={m.code}>{m.code}</span> },
      { key: 'source', header: t('dict.col.source'), width: 26, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 26, cell: productCell },
      { key: 'category', header: t('dict.col.category'), width: 22, cell: (m: Model) => {
        const cat = categories.find(c => c.id === m.categoryId);
        const value = cat ? displaySource(cat) : '—';
        return <span className="text-xs truncate block" style={{ color: cat?.color }} title={value}>{value}</span>;
      } },
      { key: 'actions', header: t('dict.col.actions'), width: 14, align: 'right', cell: renderActions },
    ],
    colors: [
      { key: 'code', header: t('dict.col.code'), width: 12, nowrap: true, cell: (c: Color) => <span className="text-xs text-accent truncate block" title={c.code}>{c.code}</span> },
      { key: 'source', header: t('dict.col.source'), width: 26, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 26, cell: productCell },
      { key: 'preview', header: t('dict.col.preview'), width: 22, cell: (c: Color) => (
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title={c.hexValue === 'gradient' ? '—' : c.hexValue}>
          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full flex-shrink-0" style={{ background: c.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : c.hexValue }} />
          <span className="text-xs text-text-tertiary hidden sm:inline truncate">{c.hexValue === 'gradient' ? '—' : c.hexValue}</span>
        </div>
      ) },
      { key: 'actions', header: t('dict.col.actions'), width: 14, align: 'right', cell: renderActions },
    ],
    suppliers: [
      { key: 'code', header: t('dict.col.code'), width: 20, nowrap: true, cell: (s: Supplier) => <span className="text-xs text-accent truncate block" title={s.code}>{s.code}</span> },
      { key: 'name', header: t('dict.col.name'), width: 55, cell: (s: Supplier) => <span className="truncate block" title={s.name}>{s.name}</span> },
      { key: 'actions', header: t('dict.col.actions'), width: 25, align: 'right', cell: () => (
        <div className="flex items-center justify-end gap-1">
          <button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
        </div>
      ) },
    ],
    connectors: [
      { key: 'code', header: t('dict.col.code'), width: 15, nowrap: true, cell: (c: Connector) => <span className="text-xs text-accent truncate block" title={c.code}>{c.code}</span> },
      { key: 'source', header: t('dict.col.source'), width: 30, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 30, cell: productCell },
      { key: 'actions', header: t('dict.col.actions'), width: 25, align: 'right', cell: renderActions },
    ],
    protocols: [
      { key: 'code', header: t('dict.col.code'), width: 14, nowrap: true, cell: (p: ChargingProtocol) => <span className="text-xs text-accent truncate block" title={p.code}>{p.code}</span> },
      { key: 'source', header: t('dict.col.source'), width: 22, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 22, cell: productCell },
      { key: 'description', header: t('dict.col.description'), width: 28, cell: (p: ChargingProtocol) => <span className="text-xs text-text-secondary truncate block" title={p.description}>{p.description}</span> },
      { key: 'actions', header: t('dict.col.actions'), width: 14, align: 'right', cell: renderActions },
    ],
    materials: [
      { key: 'code', header: t('dict.col.code'), width: 15, nowrap: true, cell: (m: Material) => <span className="text-xs text-accent truncate block" title={m.code}>{m.code}</span> },
      { key: 'source', header: t('dict.col.source'), width: 30, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 30, cell: productCell },
      { key: 'actions', header: t('dict.col.actions'), width: 25, align: 'right', cell: renderActions },
    ],
  };

  const dictRows: Record<DictType, unknown[]> = {
    categories: categories as unknown[],
    models: models as unknown[],
    colors: colors as unknown[],
    suppliers: suppliers as unknown[],
    connectors: connectors as unknown[],
    protocols: chargingProtocols as unknown[],
    materials: materials as unknown[],
  };

  const renderTable = () => {
    const cols = dictColumns[activeDict];
    const rows = dictRows[activeDict];
    return (
      <ResponsiveTable
        columns={cols}
        rows={rows}
        rowKey={(r: any) => r.id}
        minWidth={560}
        rowClassName={() => 'table-row-hover'}
      />
    );
  };

  const editBtn = (item: any) => (
    <button
      onClick={() => handleStartEdit(item)}
      className="h-11 w-11 sm:h-9 sm:w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer flex items-center justify-center"
      aria-label={t('dict.edit_title')}
      title={t('dict.edit_title')}
    >
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(cat)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: getCategoryColorVar(cat.code) }} />
                    <span className="text-[10px] text-text-tertiary truncate">{cat.color}</span>
                  </div>
                </div>
                {editBtn(cat)}
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
                    <p className="text-[11px] text-text-tertiary truncate">{displaySource(model)}</p>
                    {cat && (
                      <p className="text-[10px] mt-1.5 truncate" style={{ color: cat.color }}>{displaySource(cat)}</p>
                    )}
                  </div>
                  {editBtn(model)}
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(color)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : color.hexValue }} />
                    <span className="text-[10px] text-text-tertiary truncate">{color.hexValue === 'gradient' ? '—' : color.hexValue}</span>
                  </div>
                </div>
                {editBtn(color)}
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
                {editBtn(sup)}
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(conn)}</p>
                </div>
                {editBtn(conn)}
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(proto)}</p>
                  {proto.description && (
                    <p className="text-[10px] text-text-tertiary mt-1.5 line-clamp-2">{proto.description}</p>
                  )}
                </div>
                  {editBtn(proto)}
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(mat)}</p>
                </div>
                {editBtn(mat)}
              </div>
            ))}
          </div>
        );
    }
  };

  const editingItem = editingId
    ? (dictRows[activeDict] as any[]).find(r => r.id === editingId)
    : null;

  return (
    <div className="space-y-6">
      <Toast data={toast} onClose={hideToast} />

      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('dict.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('dict.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> {t('dict.add')}
        </button>
      </div>

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

      {isNarrow ? (
        <>
        <Modal
          variant="bottom-sheet"
          width="md"
          open={showAddForm}
          onClose={() => setShowAddForm(false)}
          title={`${t('dict.add_title')}${dictConfig.find(d => d.id === activeDict)?.label ?? ''}`}
          icon={<Plus className="w-4 h-4 text-accent flex-shrink-0" />}
          ariaLabel={t('dict.add')}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 h-11 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors border border-border-subtle cursor-pointer"
              >
                {t('dict.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!code || !nameSource || !nameProduct}
                className="flex-1 h-11 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {t('dict.save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
              <input
                type="text"
                placeholder={t('dict.form.code_placeholder')}
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.source')}</label>
              <input
                type="text"
                placeholder={t('dict.form.source_placeholder')}
                value={nameSource}
                onChange={e => setNameSource(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
              <input
                type="text"
                placeholder={t('dict.form.product_placeholder')}
                value={nameProduct}
                onChange={e => setNameProduct(e.target.value)}
                className="w-full text-text-primary h-11"
              />
            </div>
          </div>
        </Modal>
        <Modal
          variant="bottom-sheet"
          width="md"
          open={editingId !== null}
          onClose={handleCancelEdit}
          title={`${t('dict.edit_title')}${dictConfig.find(d => d.id === activeDict)?.label ?? ''}`}
          icon={<Edit3 className="w-4 h-4 text-accent flex-shrink-0" />}
          ariaLabel={t('dict.edit_title')}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 h-11 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors border border-border-subtle cursor-pointer"
              >
                {t('dict.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editNameSource || (activeDict !== 'suppliers' && !editNameProduct)}
                className="flex-1 h-11 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {t('dict.save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
              <div className="text-text-secondary font-mono text-sm h-11 flex items-center px-3 rounded-lg bg-bg-tertiary border border-border-subtle">
                {editingItem?.code ?? ''}
              </div>
            </div>
            {activeDict === 'suppliers' ? (
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.name')}</label>
                <input
                  type="text"
                  placeholder={t('dict.form.source_placeholder')}
                  value={editNameSource}
                  onChange={e => setEditNameSource(e.target.value)}
                  className="w-full text-text-primary h-11"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.source')}</label>
                  <input
                    type="text"
                    placeholder={t('dict.form.source_placeholder')}
                    value={editNameSource}
                    onChange={e => setEditNameSource(e.target.value)}
                    className="w-full text-text-primary h-11"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
                  <input
                    type="text"
                    placeholder={t('dict.form.product_placeholder')}
                    value={editNameProduct}
                    onChange={e => setEditNameProduct(e.target.value)}
                    className="w-full text-text-primary h-11"
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
        </>
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
                  {t('dict.add_title')}{dictConfig.find(d => d.id === activeDict)?.label}
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
                    placeholder={t('dict.form.code_placeholder')}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.source')}</label>
                  <input
                    type="text"
                    placeholder={t('dict.form.source_placeholder')}
                    value={nameSource}
                    onChange={e => setNameSource(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
                  <input
                    type="text"
                    placeholder={t('dict.form.product_placeholder')}
                    value={nameProduct}
                    onChange={e => setNameProduct(e.target.value)}
                    className="w-full text-text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t('dict.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!code || !nameSource || !nameProduct}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
                >
                  <Check className="w-3.5 h-3.5" /> {t('dict.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden sm:block">
        <div className="glass rounded-xl overflow-hidden">
          {renderTable()}
        </div>
      </div>
      <div className="sm:hidden">
        {renderCards()}
      </div>
    </div>
  );
}
