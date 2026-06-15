import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Palette, Plug, Zap, Truck, Layers, Tag, Plus, Edit3, X, Check, Box } from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import type {
  Category,
  ChargingProtocol,
} from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { displaySource } from '@utils/display';
import Modal from '@components/ui/Modal';
import ColorPicker from '@components/ui/ColorPicker';
import { useDataSourceVersion } from '@api/dataSourceContext';
import { ResponsiveTable } from '@components/ui/ResponsiveTable';
import type { Column } from '@app-types/table';

type DictType =
  | 'categories'
  | 'models'
  | 'colors'
  | 'suppliers'
  | 'connectors'
  | 'protocols'
  | 'materials';

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(() =>
    window.matchMedia('(max-width: 639px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const handle = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);
  return isNarrow;
}

const DICT_TYPE_MAP: Record<DictType, string> = {
  categories: 'categories',
  models: 'models',
  colors: 'colors',
  suppliers: 'suppliers',
  connectors: 'connectors',
  protocols: 'chargingProtocols',
  materials: 'materials',
};


const EDIT_INPUT_CLS =
  'w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary';

const ID_PREFIX_MAP: Record<string, string> = {
  categories: 'cat-',
  models: 'mod-',
  colors: 'col-',
  suppliers: 'sup-',
  connectors: 'conn-',
  chargingProtocols: 'prot-',
  materials: 'mat-',
};


const MODAL_ICON_ADD = <Plus className="w-4 h-4 text-accent flex-shrink-0" />;
const MODAL_ICON_EDIT = <Edit3 className="w-4 h-4 text-accent flex-shrink-0" />;

interface DictionaryCardItemProps {
  kind: DictType;
  item: any;
  editLabel: string;
  onEdit: (item: any) => void;
}

const DictionaryCardItem = memo(function DictionaryCardItem({
  kind,
  item,
  editLabel,
  onEdit,
}: DictionaryCardItemProps) {
  const { t } = useLanguage();
  const { ds, version } = useDataSourceVersion('dictionaries');
  const categories = useMemo(() => ds.dictionaries.categories, [ds, version]);
  const parentCategory =
    kind === 'models' ? categories.find((c) => c.id === item.categoryId) : undefined;

  const rawName = kind === 'suppliers' ? item.name : item.name_product;
  const hasName = !!rawName;
  const rawSource = kind !== 'suppliers' ? item.name_source : undefined;
  const hasSource = !!rawSource;

  return (
    <div className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in cursor-pointer active:scale-[0.99] transition-transform" onClick={() => onEdit(item)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <code className="text-[10px] sm:text-xs text-accent shrink-0">{item.code}</code>
        </div>
        <p className={`text-sm truncate ${hasName ? 'text-text-primary' : 'bg-danger/10 text-danger rounded px-1 py-0.5 text-[10px] font-medium w-fit'}`}>
          {hasName ? rawName : t('dict.empty')}
        </p>
        {kind !== 'suppliers' && (
          <p className={`text-[11px] truncate ${hasSource ? 'text-text-tertiary' : 'bg-danger/10 text-danger rounded px-1 py-0.5 text-[10px] font-medium w-fit mt-1'}`}>
            {hasSource ? rawSource : t('dict.empty')}
          </p>
        )}
        {kind === 'categories' && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: item.color || 'var(--color-accent)' }}
            />
            <span className="text-[10px] text-text-tertiary truncate">{item.color}</span>
          </div>
        )}
        {kind === 'models' && parentCategory && (
          <p className="text-[10px] mt-1.5 truncate" style={{ color: parentCategory.color }}>
            {displaySource(parentCategory)}
          </p>
        )}
        {kind === 'colors' && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{
                background:
                  item.color === 'gradient'
                    ? 'conic-gradient(in hsl longer hue, red, red)'
                    : item.color,
              }}
            />
            <span className="text-[10px] text-text-tertiary truncate">
              {item.color === 'gradient' ? '—' : item.color}
            </span>
          </div>
        )}
        {kind === 'protocols' && item.description && (
          <p className="text-[10px] text-text-tertiary mt-1.5 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
        <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
        className="h-11 w-11 sm:h-9 sm:w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer flex items-center justify-center"
        aria-label={editLabel}
        title={editLabel}
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

interface AddDictionaryFormProps {
  onSubmit: (data: { code: string; nameSource: string; nameProduct: string }) => Promise<boolean>;
  onCancel: () => void;
}

function AddDictionaryForm({ onSubmit, onCancel }: AddDictionaryFormProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [nameSource, setNameSource] = useState('');
  const [nameProduct, setNameProduct] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = !!(code && nameSource && nameProduct) && !saving;

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ok = await onSubmit({ code, nameSource, nameProduct });
      if (ok) {
        setCode('');
        setNameSource('');
        setNameProduct('');
      }
    } finally {
      setSaving(false);
    }
  }, [canSave, code, nameSource, nameProduct, onSubmit]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
        <input
          type="text"
          placeholder={t('dict.form.code_placeholder')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full text-text-primary h-11"
        />
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.source')}</label>
        <input
          type="text"
          placeholder={t('dict.form.source_placeholder')}
          value={nameSource}
          onChange={(e) => setNameSource(e.target.value)}
          className="w-full text-text-primary h-11"
        />
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
        <input
          type="text"
          placeholder={t('dict.form.product_placeholder')}
          value={nameProduct}
          onChange={(e) => setNameProduct(e.target.value)}
          className="w-full text-text-primary h-11"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          {t('dict.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
        >
          <Check className="w-3.5 h-3.5" /> {t('dict.save')}
        </button>
      </div>
    </div>
  );
}

interface EditDictionaryFormProps {
  item: any;
  kind: DictType;
  categories: Category[];
  onSubmit: (item: any, data: {
    nameSource: string;
    nameProduct: string;
    code?: string;
    categoryId?: string;
    color?: string;
  }) => Promise<boolean>;
  onCancel: () => void;
}

function EditDictionaryForm({ item, kind, categories, onSubmit, onCancel }: EditDictionaryFormProps) {
  const { t } = useLanguage();
  const isSupplier = kind === 'suppliers';
  const isModel = kind === 'models';
  const isCategory = kind === 'categories';
  const isColor = kind === 'colors';
  const hasColor = isCategory || isColor;

  const [code, setCode] = useState(() => item.code ?? '');
  const [nameSource, setNameSource] = useState(() => {
    return typeof item.name_source === 'string' ? item.name_source : item.name || '';
  });
  const [nameProduct, setNameProduct] = useState(() => {
    return typeof item.name_product === 'string'
      ? item.name_product
      : typeof item.name_source === 'string'
        ? item.name_source
        : '';
  });
  const [categoryId, setCategoryId] = useState(() => item.categoryId ?? '');
  const [color, setColor] = useState(() => {
    return item.color ?? '';
  });
  const [saving, setSaving] = useState(false);

  const canSave =
    !saving &&
    !!code &&
    !!nameSource &&
    (isSupplier || !!nameProduct) &&
    (!isModel || !!categoryId);

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updates: any = { nameSource, nameProduct };
      if (code !== item.code) updates.code = code;
      if (isModel && categoryId !== item.categoryId) updates.categoryId = categoryId;
      if (hasColor && color !== item.color) updates.color = color;
      await onSubmit(item, updates);
    } finally {
      setSaving(false);
    }
  }, [canSave, item, code, nameSource, nameProduct, categoryId, color, isModel, hasColor, onSubmit]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full text-text-primary font-mono h-11"
          placeholder={t('dict.form.code_placeholder')}
        />
      </div>
      {isSupplier ? (
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.supplier_name')}</label>
          <input
            type="text"
            placeholder={t('dict.form.source_placeholder')}
            value={nameSource}
            onChange={(e) => setNameSource(e.target.value)}
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
              value={nameSource}
              onChange={(e) => setNameSource(e.target.value)}
              className="w-full text-text-primary h-11"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">{t('dict.form.product')}</label>
            <input
              type="text"
              placeholder={t('dict.form.product_placeholder')}
              value={nameProduct}
              onChange={(e) => setNameProduct(e.target.value)}
              className="w-full text-text-primary h-11"
            />
          </div>
        </>
      )}
      {isModel && (
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.category')}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full text-text-primary h-11 bg-bg-elevated border border-border-default rounded px-2"
          >
            <option value="" disabled>{t('dict.form.select_category')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {displaySource(cat)} ({cat.code})
              </option>
            ))}
          </select>
        </div>
      )}
      {hasColor && (
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">
            {isColor ? t('dict.col.hex') : t('dict.col.color')}
          </label>
          <ColorPicker
            value={color}
            onChange={(val) => setColor(val)}
            label={isColor ? t('dict.col.hex') : t('dict.col.color')}
          />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          {t('dict.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
        >
          <Check className="w-3.5 h-3.5" /> {t('dict.save')}
        </button>
      </div>
    </div>
  );
}

export default function DictionaryManager() {
  const { t, language } = useLanguage();
  const { ds, version } = useDataSourceVersion('dictionaries');
  const categories = useMemo(() => ds.dictionaries.categories, [ds, version]);
  const models = useMemo(() => ds.dictionaries.models, [ds, version]);
  const colors = useMemo(() => ds.dictionaries.colors, [ds, version]);
  const suppliers = useMemo(() => ds.dictionaries.suppliers, [ds, version]);
  const connectors = useMemo(() => ds.dictionaries.connectors, [ds, version]);
  const chargingProtocols = useMemo(() => ds.dictionaries.chargingProtocols, [ds, version]);
  const materials = useMemo(() => ds.dictionaries.materials, [ds, version]);
  const notifications = ds.notifications;
  const isNarrow = useIsNarrow();
  const [activeDict, setActiveDict] = useState<DictType>('categories');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formMounted, setFormMounted] = useState(false);

  useEffect(() => {
    setFormMounted(true);
  }, []);

  const { toasts, showToast, dismiss } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingColorRef = useRef('');
  const editNameSourceRef = useRef<HTMLInputElement>(null);
  const editNameProductRef = useRef<HTMLInputElement>(null);
  const editCodeRef = useRef<HTMLInputElement>(null);
  const editCategoryIdRef = useRef<HTMLSelectElement>(null);

  const handleTabClick = useCallback((id: DictType) => {
    setActiveDict(id);
    setEditingId(null);
    editingColorRef.current = '';
  }, []);

  const handleAddFormClose = useCallback(() => setShowAddForm(false), []);
  const handleEditFormClose = useCallback(() => setEditingId(null), []);

  const dictLabels: Record<DictType, string> = useMemo(
    () => ({
      categories: t('dict.tab.categories'),
      models: t('dict.tab.models'),
      colors: t('dict.tab.colors'),
      suppliers: t('dict.tab.suppliers'),
      connectors: t('dict.tab.connectors'),
      protocols: t('dict.tab.protocols'),
      materials: t('dict.tab.materials'),
    }),
    [t]
  );
  const dictConfig: { id: DictType; label: string; icon: React.ElementType; count: number }[] =
    useMemo(
      () => [
        { id: 'categories', label: dictLabels.categories, icon: Layers, count: categories.length },
        { id: 'models', label: dictLabels.models, icon: Tag, count: models.length },
        { id: 'colors', label: dictLabels.colors, icon: Palette, count: colors.length },
        { id: 'suppliers', label: dictLabels.suppliers, icon: Truck, count: suppliers.length },
        {
          id: 'connectors',
          label: dictLabels.connectors,
          icon: Plug,
          count: connectors.length,
        },
        { id: 'protocols', label: dictLabels.protocols, icon: Zap, count: chargingProtocols.length },
        { id: 'materials', label: dictLabels.materials, icon: Box, count: materials.length },
      ],
      [
        dictLabels,
        categories.length,
        models.length,
        colors.length,
        suppliers.length,
        connectors.length,
        chargingProtocols.length,
        materials.length,
      ]
    );

  const dictDataMap = useMemo(() => ({
    categories, models, colors, suppliers, connectors, chargingProtocols, materials,
  } as Record<string, readonly any[]>), [categories, models, colors, suppliers, connectors, chargingProtocols, materials]);

  const handleSave = useCallback(
    async (data: { code: string; nameSource: string; nameProduct: string }) => {
      if (!data.code || !data.nameSource || !data.nameProduct) return false;

      const apiType = DICT_TYPE_MAP[activeDict];
      const prefix = ID_PREFIX_MAP[apiType];
      const id = `${prefix}${data.code}`;
      const item: Record<string, unknown> = {
        id,
        code: data.code,
        name_source: data.nameSource,
        name_product: data.nameProduct,
      };
      if (apiType === 'suppliers') {
        delete item.name_source;
        delete item.name_product;
        item.name = data.nameSource;
      }

      const entries = dictDataMap[apiType] ?? [];
      const sourceKey = apiType === 'suppliers' ? 'name' : 'name_source';
      if (
        entries.some(
          (e: any) => (e[sourceKey] || '').toLowerCase() === data.nameSource.toLowerCase()
        )
      ) {
        showToast(t('dict.toast_source_duplicate').replace('{name}', data.nameSource), 'error');
        return false;
      }

      if (
        apiType !== 'suppliers' &&
        entries.some(
          (e: any) => (e.name_product || '').toLowerCase() === data.nameProduct.toLowerCase()
        )
      ) {
        showToast(t('dict.toast_product_duplicate').replace('{name}', data.nameProduct), 'error');
        return false;
      }

      try {
        await ds.dictionaries.add(apiType, item as any);
        notifications.add({ title: `${t('dict.notif_added')}: ${data.nameProduct}`, description: `[${data.code}]`, type: 'success', actionView: 'dictionary' });
        showToast(t('dict.toast_added').replace('{name}', data.nameProduct));
        setShowAddForm(false);
        return true;
      } catch (err: any) {
        showToast(err?.message || t('dict.toast_duplicate').replace('{code}', data.code), 'error');
        return false;
      }
    },
    [activeDict, t, showToast, dictDataMap, ds, version]
  );

  const handleStartEdit = useCallback((item: any) => {
    setEditingId(item.id);
    editingColorRef.current = item.color || '';
  }, []);

  const handleSaveEdit = useCallback(
    async (item: any, data: {
      nameSource: string;
      nameProduct: string;
      code?: string;
      categoryId?: string;
      color?: string;
    }) => {
      const apiType = DICT_TYPE_MAP[activeDict];
      const updates: Record<string, unknown> = {
        name_source: data.nameSource,
        name_product: data.nameProduct,
        name: data.nameSource,
      };

      if (data.code !== undefined && data.code !== item.code) {
        const entries = dictDataMap[apiType] ?? [];
        if (entries.some((e: any) => e.id !== item.id && e.code === data.code)) {
          showToast(t('dict.toast_code_duplicate').replace('{code}', data.code), 'error');
          return false;
        }
        updates.code = data.code;
      }
      if (data.categoryId !== undefined && data.categoryId !== item.categoryId) {
        updates.categoryId = data.categoryId;
      }
      if (data.color !== undefined && data.color !== item.color) {
        updates.color = data.color;
      }

      const entries = dictDataMap[apiType] ?? [];
      const sourceKey = apiType === 'suppliers' ? 'name' : 'name_source';
      if (
        entries.some(
          (e: any) =>
            e.id !== item.id &&
            (e[sourceKey] || '').toLowerCase() === data.nameSource.toLowerCase()
        )
      ) {
        showToast(t('dict.toast_source_duplicate').replace('{name}', data.nameSource), 'error');
        return false;
      }

      if (
        apiType !== 'suppliers' &&
        entries.some(
          (e: any) =>
            e.id !== item.id &&
            (e.name_product || '').toLowerCase() === data.nameProduct.toLowerCase()
        )
      ) {
        showToast(t('dict.toast_product_duplicate').replace('{name}', data.nameProduct), 'error');
        return false;
      }

      try {
        await ds.dictionaries.update(apiType, item.id, updates);
        notifications.add({ title: `${t('dict.notif_updated')}: ${data.nameProduct}`, type: 'info', actionView: 'dictionary' });
        showToast(t('dict.save_success').replace('{name}', data.nameProduct));
        setEditingId(null);
        return true;
      } catch {
        showToast(t('dict.toast_update_error').replace('{name}', data.nameProduct), 'error');
        return false;
      }
    },
    [activeDict, t, showToast, dictDataMap, ds, version, notifications]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    editingColorRef.current = '';
  }, []);

  const handleSaveEditInline = useCallback(async () => {
    if (!editingId) return;
    const apiType = DICT_TYPE_MAP[activeDict];
    const isSupplier = activeDict === 'suppliers';
    const isModel = activeDict === 'models';
    const entries = dictDataMap[apiType] ?? [];
    const item = entries.find((r: any) => r.id === editingId);
    if (!item) return;
    const nameSource = editNameSourceRef.current?.value ?? '';
    const nameProduct = editNameProductRef.current?.value ?? '';
    const code = editCodeRef.current?.value ?? item.code;
    const categoryId = editCategoryIdRef.current?.value ?? item.categoryId;
    const color = editingColorRef.current || item.color || '';

    if (!code || !nameSource || (!isSupplier && !nameProduct) || (isModel && !categoryId)) {
      showToast(t('dict.fill_required'), 'error');
      return;
    }

    const updates: any = { nameSource, nameProduct, code, categoryId, color };
    await handleSaveEdit(item, updates);
    editingColorRef.current = '';
  }, [editingId, activeDict, handleSaveEdit, showToast, t]);

  const renderActions = useCallback((row: { id: string }) => {
    const isEditing = editingId === row.id;
    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleSaveEditInline}
            className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => handleStartEdit(row)}
          className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }, [editingId, handleSaveEditInline, handleCancelEdit, handleStartEdit]);

  const sourceCell = useCallback((row: { id: string; name_source?: string; name?: string; code?: string }) => {
    const raw = row.name_source !== undefined ? row.name_source : row.name;
    const hasValue = !!raw;
    if (editingId === row.id) {
      return (
        <input
          ref={editNameSourceRef}
          defaultValue={raw || ''}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveEditInline();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          className={EDIT_INPUT_CLS}
          placeholder={t('dict.form.source_placeholder')}
        />
      );
    }
    return (
      <span className={`truncate block ${hasValue ? 'text-text-secondary' : 'bg-danger/10 text-danger rounded px-1 py-0.5 text-[10px] font-medium w-fit'}`} title={raw || ''}>
        {hasValue ? raw : t('dict.empty')}
      </span>
    );
  }, [editingId, t, handleSaveEditInline, handleCancelEdit]);

  const productCell = useCallback((row: { id: string; name_source?: string; name_product?: string }) => {
    const raw = row.name_product;
    const hasValue = !!raw;
    if (editingId === row.id) {
      return (
        <input
          ref={editNameProductRef}
          defaultValue={raw || ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveEditInline();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          className={EDIT_INPUT_CLS}
          placeholder={t('dict.form.product_placeholder')}
        />
      );
    }
    return (
      <span className={`truncate block ${hasValue ? '' : 'bg-danger/10 text-danger rounded px-1 py-0.5 text-[10px] font-medium w-fit'}`} title={raw || ''}>
        {hasValue ? raw : t('dict.empty')}
      </span>
    );
  }, [editingId, t, handleSaveEditInline, handleCancelEdit]);

  const codeCell = useCallback((row: { id: string; code: string }) => {
    if (editingId === row.id) {
      return (
        <input
          ref={editCodeRef}
          defaultValue={row.code ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveEditInline();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          className={`${EDIT_INPUT_CLS} font-mono text-accent`}
          placeholder={t('dict.form.code_placeholder')}
        />
      );
    }
    return (
      <span className="text-xs text-accent truncate block font-mono" title={row.code}>
        {row.code}
      </span>
    );
  }, [editingId, t, handleSaveEditInline, handleCancelEdit]);

  const categoryCell = useCallback((row: { id: string; categoryId?: string }) => {
    if (editingId === row.id && activeDict === 'models') {
      return (
        <select
          ref={editCategoryIdRef}
          defaultValue={row.categoryId ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveEditInline();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          className={`${EDIT_INPUT_CLS} bg-bg-elevated`}
        >
          <option value="" disabled>{t('dict.form.select_category')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {displaySource(cat)} ({cat.code})
            </option>
          ))}
        </select>
      );
    }
    const cat = activeDict === 'models' ? categories.find((c) => c.id === row.categoryId) : undefined;
    const value = cat ? displaySource(cat) : '—';
    return (
      <span className="text-xs truncate block" style={{ color: cat?.color }} title={value}>
        {value}
      </span>
    );
  }, [editingId, activeDict, categories, t, handleSaveEditInline, handleCancelEdit]);

  const colorCell = useCallback((row: any) => {
    const isEditingColor = editingId === row.id && (activeDict === 'categories' || activeDict === 'colors');
    const colorValue = row.color;
    if (isEditingColor) {
      return (
        <div className="flex items-center gap-2">
          <ColorPicker
            value={editingColorRef.current || colorValue || '#000000'}
            onChange={(val) => {
              editingColorRef.current = val;
            }}
          />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 min-w-0" title={colorValue}>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: activeDict === 'colors' && colorValue === 'gradient'
              ? 'conic-gradient(in hsl longer hue, red, red)'
              : colorValue || 'transparent',
          }}
        />
        <span className="text-xs text-text-tertiary truncate">{colorValue}</span>
      </div>
    );
  }, [editingId, activeDict]);

  const dictColumns: Record<DictType, Column<any>[]> = useMemo(() => ({
    categories: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 15,
        nowrap: true,
        cell: codeCell,
      },
      { key: 'source', header: t('dict.col.source'), width: 28, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 28, cell: productCell },
      {
        key: 'color',
        header: t('dict.col.color'),
        width: 18,
        cell: colorCell,
      },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 11,
        align: 'right',
        cell: renderActions,
      },
    ],
    models: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 12,
        nowrap: true,
        cell: codeCell,
      },
      { key: 'source', header: t('dict.col.source'), width: 26, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 26, cell: productCell },
      {
        key: 'category',
        header: t('dict.col.category'),
        width: 22,
        cell: categoryCell,
      },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 14,
        align: 'right',
        cell: renderActions,
      },
    ],
    colors: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 12,
        nowrap: true,
        cell: codeCell,
      },
      { key: 'source', header: t('dict.col.source'), width: 26, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 26, cell: productCell },
      {
        key: 'preview',
        header: t('dict.col.preview'),
        width: 22,
        cell: colorCell,
      },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 14,
        align: 'right',
        cell: renderActions,
      },
    ],
    suppliers: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 20,
        nowrap: true,
        cell: codeCell,
      },
      {
        key: 'name',
        header: t('dict.col.supplier_name'),
        width: 55,
        cell: sourceCell,
      },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 25,
        align: 'right',
        cell: renderActions,
      },
    ],
    connectors: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 15,
        nowrap: true,
        cell: codeCell,
      },
      { key: 'source', header: t('dict.col.source'), width: 30, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 30, cell: productCell },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 25,
        align: 'right',
        cell: renderActions,
      },
    ],
    protocols: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 14,
        nowrap: true,
        cell: codeCell,
      },
      { key: 'source', header: t('dict.col.source'), width: 22, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 22, cell: productCell },
      {
        key: 'description',
        header: t('dict.col.description'),
        width: 28,
        cell: (p: ChargingProtocol) => (
          <span className="text-xs text-text-secondary truncate block" title={p.description}>
            {p.description}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 14,
        align: 'right',
        cell: renderActions,
      },
    ],
    materials: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 15,
        nowrap: true,
        cell: codeCell,
      },
      { key: 'source', header: t('dict.col.source'), width: 30, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 30, cell: productCell },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 25,
        align: 'right',
        cell: renderActions,
      },
    ],
  }),
    [
      t,
      editingId,
      language,
      categories,
      models,
      colors,
      handleSaveEdit,
      handleCancelEdit,
      handleStartEdit,
      handleSaveEditInline,
      codeCell,
      categoryCell,
      colorCell,
      sourceCell,
      productCell,
      renderActions,
    ]
  );

  const dictRows: Record<DictType, unknown[]> = useMemo(
    () => ({
      categories: categories as unknown[],
      models: models as unknown[],
      colors: colors as unknown[],
      suppliers: suppliers as unknown[],
      connectors: connectors as unknown[],
      protocols: chargingProtocols as unknown[],
      materials: materials as unknown[],
    }),
    [categories, models, colors, suppliers, connectors, chargingProtocols, materials]
  );

  const activeTable = useMemo(() => {
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
  }, [activeDict, dictColumns, dictRows]);

  const renderCards = useMemo(() => {
    const editLabel = t('dict.edit_title');
    const common = { editLabel, onEdit: handleStartEdit };

    switch (activeDict) {
      case 'categories':
        return (
          <div className="space-y-2">
            {categories.map((cat) => (
              <DictionaryCardItem key={cat.id} kind="categories" item={cat} {...common} />
            ))}
          </div>
        );
      case 'models':
        return (
          <div className="space-y-2">
            {models.map((model) => (
              <DictionaryCardItem key={model.id} kind="models" item={model} {...common} />
            ))}
          </div>
        );
      case 'colors':
        return (
          <div className="space-y-2">
            {colors.map((color) => (
              <DictionaryCardItem key={color.id} kind="colors" item={color} {...common} />
            ))}
          </div>
        );
      case 'suppliers':
        return (
          <div className="space-y-2">
            {suppliers.map((sup) => (
              <DictionaryCardItem key={sup.id} kind="suppliers" item={sup} {...common} />
            ))}
          </div>
        );
      case 'connectors':
        return (
          <div className="space-y-2">
            {connectors.map((conn) => (
              <DictionaryCardItem key={conn.id} kind="connectors" item={conn} {...common} />
            ))}
          </div>
        );
      case 'protocols':
        return (
          <div className="space-y-2">
            {chargingProtocols.map((proto) => (
              <DictionaryCardItem key={proto.id} kind="protocols" item={proto} {...common} />
            ))}
          </div>
        );
      case 'materials':
        return (
          <div className="space-y-2">
            {materials.map((mat) => (
              <DictionaryCardItem key={mat.id} kind="materials" item={mat} {...common} />
            ))}
          </div>
        );
    }
  }, [t, activeDict, categories, models, colors, suppliers, connectors, chargingProtocols, materials, handleStartEdit]);

  const editingItem = useMemo(
    () =>
      editingId
        ? (dictRows[activeDict] as any[]).find((r) => r.id === editingId)
        : null,
    [editingId, activeDict, dictRows]
  );

  const activeDictLabel = dictConfig.find((d) => d.id === activeDict)?.label ?? '';

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('dict.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {t('dict.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-accent/40 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> {t('dict.add')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {dictConfig.map((dict) => (
          <button
            key={dict.id}
            onClick={() => handleTabClick(dict.id)}
            className={`flex h-11 sm:h-10 min-w-0 sm:min-w-[120px] items-center justify-center gap-1.5 sm:gap-2 px-3 rounded-lg text-xs sm:text-sm transition-[colors,opacity,transform,box-shadow] cursor-pointer ${
              activeDict === dict.id
                ? 'bg-accent/25 text-white border border-accent/40 font-medium'
                : 'bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <dict.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{dict.label}</span>
            <span
              className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${activeDict === dict.id ? 'bg-accent/20' : 'bg-bg-elevated'}`}
            >
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
            onClose={handleAddFormClose}
            title={`${t('dict.add_title')}${activeDictLabel}`}
            icon={MODAL_ICON_ADD}
            ariaLabel={t('dict.add')}
          >
            <AddDictionaryForm onSubmit={handleSave} onCancel={handleAddFormClose} />
          </Modal>
          <Modal
            variant="bottom-sheet"
            width="md"
            open={editingItem !== null}
            onClose={handleEditFormClose}
            title={`${t('dict.edit_title')}${activeDictLabel}`}
            icon={MODAL_ICON_EDIT}
            ariaLabel={t('dict.edit_title')}
          >
            {editingItem && (
              <EditDictionaryForm
                key={editingItem.id}
                item={editingItem}
                kind={activeDict}
                categories={categories}
                onSubmit={handleSaveEdit}
                onCancel={handleEditFormClose}
              />
            )}
          </Modal>
        </>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: showAddForm ? '1fr' : '0fr',
            transition: formMounted
              ? 'grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease'
              : 'none',
            opacity: showAddForm ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="glass rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">
                  {t('dict.add_title')}
                  {dictConfig.find((d) => d.id === activeDict)?.label}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {showAddForm && (
                <AddDictionaryForm onSubmit={handleSave} onCancel={handleAddFormClose} />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="hidden sm:block">
        <div className="glass rounded-xl overflow-hidden">{activeTable}</div>
      </div>
      <div className="sm:hidden">{renderCards}</div>
    </div>
  );
}
