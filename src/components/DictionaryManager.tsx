import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Plug, Zap, Truck, Layers, Tag,
  Plus, Edit3, X, Check, Box
} from 'lucide-react';
import {
  categories, models, colors, suppliers, connectors, chargingProtocols, materials,
  addCategory, addModel, addColor, addSupplier, addConnector, addProtocol, addMaterial,
  updateCategory, updateModel, updateColor, updateSupplier, updateConnector, updateProtocol, updateMaterial,
} from '../data/dictionaries';
import { useLanguage } from '../context/LanguageContext';
import { useLayout } from '../context/LayoutContext';
import { displayName, displaySource, getCategoryColorVar } from '../utils/display';
import BottomSheet from './BottomSheet';
import { dictionariesApi } from '../api/dictionaries';

type DictType = 'categories' | 'models' | 'colors' | 'suppliers' | 'connectors' | 'protocols' | 'materials';

export default function DictionaryManager() {
  const { t, language } = useLanguage();
  const { isMobile } = useLayout();
  const [activeDict, setActiveDict] = useState<DictType>('categories');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [code, setCode] = useState('');
  const [nameSource, setNameSource] = useState('');
  const [nameProduct, setNameProduct] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameSource, setEditNameSource] = useState('');
  const [editNameProduct, setEditNameProduct] = useState('');

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
    const item: Record<string, unknown> = { id, code, name: nameSource, name_source: nameSource, name_product: nameProduct };

    let saved = false;
    try {
      await dictionariesApi.add(apiType as never, item);
      saved = true;
    } catch {
      const localAdd: Record<string, (item: any) => void> = {
        categories: addCategory, models: addModel, colors: addColor,
        suppliers: addSupplier, connectors: addConnector,
        chargingProtocols: addProtocol, materials: addMaterial,
      };
      localAdd[apiType]?.(item);
      saved = true;
    }

    if (saved) {
      setToastMessage(t('dict.toast_added').replace('{name}', nameProduct));
      setCode('');
      setNameSource('');
      setNameProduct('');
      setShowAddForm(false);
      setTimeout(() => { setToastMessage(null); }, 3000);
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
    try {
      await dictionariesApi.update(apiType as never, editingId, updates);
    } catch {
      localUpdateMap[localType]?.(editingId, updates);
    }
    setToastMessage(t('dict.save_success').replace('{name}', editNameProduct));
    setEditingId(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const renderTable = () => {
    switch (activeDict) {
      case 'categories':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[15%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[28%]">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[28%]">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[18%]">{t('dict.col.color')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[11%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {categories.map(cat => {
                const isEditing = editingId === cat.id;
                return (
                <tr key={cat.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{cat.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary truncate">{isEditing ? <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.source_placeholder')} /> : displaySource(cat)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{isEditing ? <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.product_placeholder')} /> : displayName(cat, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getCategoryColorVar(cat.code) }} /><span className="text-xs text-text-tertiary truncate">{cat.color}</span></div></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1">{isEditing ? <><button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button><button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button></> : <button onClick={() => handleStartEdit(cat)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>}</div></td>
                </tr>
              );})}
            </tbody>
          </table>
        );
      case 'models':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[12%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[26%]">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[26%]">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[22%]">{t('dict.col.category')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[14%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {models.map(model => {
                const cat = categories.find(c => c.id === model.categoryId);
                const isEditing = editingId === model.id;
                return (
                  <tr key={model.id} className="border-b border-border-subtle/50 table-row-hover">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{model.code}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary truncate">{isEditing ? <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.source_placeholder')} /> : displaySource(model)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{isEditing ? <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.product_placeholder')} /> : displayName(model, language)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 truncate"><span className="text-xs truncate" style={{ color: cat?.color }}>{cat ? displaySource(cat) : '—'}</span></td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1">{isEditing ? <><button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button><button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button></> : <button onClick={() => handleStartEdit(model)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      case 'colors':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[12%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[26%]">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[26%]">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[22%]">{t('dict.col.preview')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[14%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {colors.map(color => {
                const isEditing = editingId === color.id;
                return (
                <tr key={color.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{color.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary truncate">{isEditing ? <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.source_placeholder')} /> : displaySource(color)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{isEditing ? <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.product_placeholder')} /> : displayName(color, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate"><div className="flex items-center gap-1.5 sm:gap-2"><div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full flex-shrink-0" style={{ background: color.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : color.hexValue }} /><span className="text-xs text-text-tertiary hidden sm:inline truncate">{color.hexValue === 'gradient' ? '—' : color.hexValue}</span></div></td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1">{isEditing ? <><button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button><button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button></> : <button onClick={() => handleStartEdit(color)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>}</div></td>
                </tr>
              );})}
            </tbody>
          </table>
        );
      case 'suppliers':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[20%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[55%]">{t('dict.col.name')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[25%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{sup.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{sup.name}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'connectors':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[15%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[30%]">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[30%]">{t('dict.col.product')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[25%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {connectors.map(conn => {
                const isEditing = editingId === conn.id;
                return (
                <tr key={conn.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{conn.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary truncate">{isEditing ? <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.source_placeholder')} /> : displaySource(conn)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{isEditing ? <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.product_placeholder')} /> : displayName(conn, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1">{isEditing ? <><button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button><button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button></> : <button onClick={() => handleStartEdit(conn)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>}</div></td>
                </tr>
              );})}
            </tbody>
          </table>
        );
      case 'protocols':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[14%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[22%]">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[22%]">{t('dict.col.product')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[28%]">{t('dict.col.description')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[14%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {chargingProtocols.map(proto => {
                const isEditing = editingId === proto.id;
                return (
                <tr key={proto.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{proto.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary truncate">{isEditing ? <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.source_placeholder')} /> : displaySource(proto)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{isEditing ? <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.product_placeholder')} /> : displayName(proto, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-text-secondary truncate">{proto.description}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1">{isEditing ? <><button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button><button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button></> : <button onClick={() => handleStartEdit(proto)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>}</div></td>
                </tr>
              );})}
            </tbody>
          </table>
        );
      case 'materials':
        return (
          <table className="w-full text-sm table-fixed">
            <thead><tr className="border-b border-border-subtle">
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[15%]">{t('dict.col.code')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[30%]">{t('dict.col.source')}</th>
              <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[30%]">{t('dict.col.product')}</th>
              <th className="text-right px-3 sm:px-4 py-2 sm:py-3 text-xs font-medium text-text-tertiary uppercase w-[25%]">{t('dict.col.actions')}</th>
            </tr></thead>
            <tbody>
              {materials.map(mat => {
                const isEditing = editingId === mat.id;
                return (
                <tr key={mat.id} className="border-b border-border-subtle/50 table-row-hover">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs text-accent truncate">{mat.code}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-text-secondary truncate">{isEditing ? <input value={editNameSource} onChange={e => setEditNameSource(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.source_placeholder')} /> : displaySource(mat)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 truncate">{isEditing ? <input value={editNameProduct} onChange={e => setEditNameProduct(e.target.value)} className="w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary" placeholder={t('dict.form.product_placeholder')} /> : displayName(mat, language)}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right"><div className="flex items-center justify-end gap-1">{isEditing ? <><button onClick={handleSaveEdit} className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"><Check className="w-3.5 h-3.5" /></button><button onClick={handleCancelEdit} className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"><X className="w-3.5 h-3.5" /></button></> : <button onClick={() => handleStartEdit(mat)} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>}</div></td>
                </tr>
              );})}
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(cat)}</p>
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
                    <p className="text-[11px] text-text-tertiary truncate">{displaySource(model)}</p>
                    {cat && (
                      <p className="text-[10px] mt-1.5 truncate" style={{ color: cat.color }}>{displaySource(cat)}</p>
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(color)}</p>
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(conn)}</p>
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(proto)}</p>
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
                  <p className="text-[11px] text-text-tertiary truncate">{displaySource(mat)}</p>
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

      {isMobile ? (
        <BottomSheet
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
