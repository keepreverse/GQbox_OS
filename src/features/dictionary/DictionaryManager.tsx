import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Palette, Plug, Zap, Truck, Layers, Tag, Plus, Edit3, X, Check, Box } from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import type {
  Category,
  Model,
  Color,
  Supplier,
  Connector,
  ChargingProtocol,
  Material,
} from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { displayName, displaySource, getCategoryColorVar } from '@utils/display';
import Modal from '@components/ui/Modal';
import { useDataSource } from '@api/dataSourceContext';
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
  const { dictionaries } = useDataSource();
  const parentCategory =
    kind === 'models' ? dictionaries.categories.find((c) => c.id === item.categoryId) : undefined;

  return (
    <div className="glass rounded-xl p-3 flex items-start justify-between gap-2 animate-card-in">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <code className="text-[10px] sm:text-xs text-accent shrink-0">{item.code}</code>
        </div>
        <p className="text-sm text-text-primary truncate">
          {kind === 'suppliers' ? item.name : displayName(item)}
        </p>
        {kind !== 'suppliers' && (
          <p className="text-[11px] text-text-tertiary truncate">{displaySource(item)}</p>
        )}
        {kind === 'categories' && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: getCategoryColorVar(item.code) }}
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
                  item.hexValue === 'gradient'
                    ? 'conic-gradient(in hsl longer hue, red, red)'
                    : item.hexValue,
              }}
            />
            <span className="text-[10px] text-text-tertiary truncate">
              {item.hexValue === 'gradient' ? '—' : item.hexValue}
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
        onClick={() => onEdit(item)}
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
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
        >
          <Check className="w-3.5 h-3.5" /> {t('dict.save')}
        </button>
      </div>
    </div>
  );
}

interface EditDictionaryFormProps {
  item: any;
  isSupplier: boolean;
  onSubmit: (item: any, data: { nameSource: string; nameProduct: string }) => Promise<boolean>;
  onCancel: () => void;
}

function EditDictionaryForm({ item, isSupplier, onSubmit, onCancel }: EditDictionaryFormProps) {
  const { t } = useLanguage();
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
  const [saving, setSaving] = useState(false);

  const canSave =
    !saving &&
    !!nameSource &&
    (isSupplier || !!nameProduct);

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit(item, { nameSource, nameProduct });
    } finally {
      setSaving(false);
    }
  }, [canSave, item, nameSource, nameProduct, onSubmit]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.code')}</label>
        <div className="text-text-secondary font-mono text-sm h-11 flex items-center px-3 rounded-lg bg-bg-tertiary border border-border-subtle">
          {item.code ?? ''}
        </div>
      </div>
      {isSupplier ? (
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">{t('dict.col.name')}</label>
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
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
        >
          <Check className="w-3.5 h-3.5" /> {t('dict.save')}
        </button>
      </div>
    </div>
  );
}

export default function DictionaryManager() {
  const { t, language } = useLanguage();
  const { dictionaries } = useDataSource();
  const categories = dictionaries.categories;
  const models = dictionaries.models;
  const colors = dictionaries.colors;
  const suppliers = dictionaries.suppliers;
  const connectors = dictionaries.connectors;
  const chargingProtocols = dictionaries.chargingProtocols;
  const materials = dictionaries.materials;
  const isNarrow = useIsNarrow();
  const [activeDict, setActiveDict] = useState<DictType>('categories');
  const [showAddForm, setShowAddForm] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const editNameSourceRef = useRef<HTMLInputElement>(null);
  const editNameProductRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingId(null);
  }, [activeDict]);

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

      try {
        await dictionaries.add(apiType, item as any);
        showToast(t('dict.toast_added').replace('{name}', data.nameProduct));
        setShowAddForm(false);
        return true;
      } catch (err: any) {
        showToast(err?.message || t('dict.toast_duplicate').replace('{code}', data.code), 'error');
        return false;
      }
    },
    [activeDict, t, showToast, dictDataMap, dictionaries]
  );

  const handleStartEdit = useCallback((item: any) => {
    setEditingId(item.id);
  }, []);

  const handleSaveEdit = useCallback(
    async (item: any, data: { nameSource: string; nameProduct: string }) => {
      const apiType = DICT_TYPE_MAP[activeDict];
      const updates: Record<string, unknown> = {
        name_source: data.nameSource,
        name_product: data.nameProduct,
        name: data.nameSource,
      };

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

      try {
        await dictionaries.update(apiType, item.id, updates);
        showToast(t('dict.save_success').replace('{name}', data.nameProduct));
        setEditingId(null);
        return true;
      } catch {
        showToast(t('dict.save_success').replace('{name}', data.nameProduct));
        setEditingId(null);
        return true;
      }
    },
    [activeDict, t, showToast, dictDataMap, dictionaries]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleSaveEditInline = useCallback(async () => {
    if (!editingId) return;
    const apiType = DICT_TYPE_MAP[activeDict];
    const entries = dictDataMap[apiType] ?? [];
    const item = entries.find((r: any) => r.id === editingId);
    if (!item) return;
    const nameSource = editNameSourceRef.current?.value ?? '';
    const nameProduct = editNameProductRef.current?.value ?? '';
    await handleSaveEdit(item, { nameSource, nameProduct });
  }, [editingId, activeDict, handleSaveEdit]);

  const renderActions = (row: { id: string }) => {
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
  };

  const sourceCell = (row: { id: string; name_source?: string; name?: string }) => {
    const value = displaySource(row);
    if (editingId === row.id) {
      return (
        <input
          ref={editNameSourceRef}
          defaultValue={typeof row.name_source === 'string' ? row.name_source : row.name || ''}
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
      <span className="text-text-secondary truncate block" title={value}>
        {value}
      </span>
    );
  };

  const productCell = (row: { id: string; name_source?: string; name_product?: string }) => {
    const value = displayName(row as never);
    if (editingId === row.id) {
      return (
        <input
          ref={editNameProductRef}
          defaultValue={
            typeof row.name_product === 'string' ? row.name_product : row.name_source || ''
          }
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
      <span className="truncate block" title={value}>
        {value}
      </span>
    );
  };

  const dictColumns: Record<DictType, Column<any>[]> = useMemo(
    () => ({
    categories: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 15,
        nowrap: true,
        cell: (c: Category) => (
          <span className="text-xs text-accent truncate block" title={c.code}>
            {c.code}
          </span>
        ),
      },
      { key: 'source', header: t('dict.col.source'), width: 28, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 28, cell: productCell },
      {
        key: 'color',
        header: t('dict.col.color'),
        width: 18,
        cell: (c: Category) => (
          <div className="flex items-center gap-2 min-w-0" title={c.color}>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: getCategoryColorVar(c.code) }}
            />
            <span className="text-xs text-text-tertiary truncate">{c.color}</span>
          </div>
        ),
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
        cell: (m: Model) => (
          <span className="text-xs text-accent truncate block" title={m.code}>
            {m.code}
          </span>
        ),
      },
      { key: 'source', header: t('dict.col.source'), width: 26, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 26, cell: productCell },
      {
        key: 'category',
        header: t('dict.col.category'),
        width: 22,
        cell: (m: Model) => {
          const cat = categories.find((c) => c.id === m.categoryId);
          const value = cat ? displaySource(cat) : '—';
          return (
            <span className="text-xs truncate block" style={{ color: cat?.color }} title={value}>
              {value}
            </span>
          );
        },
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
        cell: (c: Color) => (
          <span className="text-xs text-accent truncate block" title={c.code}>
            {c.code}
          </span>
        ),
      },
      { key: 'source', header: t('dict.col.source'), width: 26, cell: sourceCell },
      { key: 'product', header: t('dict.col.product'), width: 26, cell: productCell },
      {
        key: 'preview',
        header: t('dict.col.preview'),
        width: 22,
        cell: (c: Color) => (
          <div
            className="flex items-center gap-1.5 sm:gap-2 min-w-0"
            title={c.hexValue === 'gradient' ? '—' : c.hexValue}
          >
            <div
              className="w-4 sm:w-5 h-4 sm:h-5 rounded-full flex-shrink-0"
              style={{
                background:
                  c.hexValue === 'gradient'
                    ? 'conic-gradient(in hsl longer hue, red, red)'
                    : c.hexValue,
              }}
            />
            <span className="text-xs text-text-tertiary hidden sm:inline truncate">
              {c.hexValue === 'gradient' ? '—' : c.hexValue}
            </span>
          </div>
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
    suppliers: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 20,
        nowrap: true,
        cell: (s: Supplier) => (
          <span className="text-xs text-accent truncate block" title={s.code}>
            {s.code}
          </span>
        ),
      },
      {
        key: 'name',
        header: t('dict.col.name'),
        width: 55,
        cell: (s: Supplier) => (
          <span className="truncate block" title={s.name}>
            {s.name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('dict.col.actions'),
        width: 25,
        align: 'right',
        cell: () => (
          <div className="flex items-center justify-end gap-1">
            <button className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    connectors: [
      {
        key: 'code',
        header: t('dict.col.code'),
        width: 15,
        nowrap: true,
        cell: (c: Connector) => (
          <span className="text-xs text-accent truncate block" title={c.code}>
            {c.code}
          </span>
        ),
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
        cell: (p: ChargingProtocol) => (
          <span className="text-xs text-accent truncate block" title={p.code}>
            {p.code}
          </span>
        ),
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
        cell: (m: Material) => (
          <span className="text-xs text-accent truncate block" title={m.code}>
            {m.code}
          </span>
        ),
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
      handleSaveEdit,
      handleCancelEdit,
      handleStartEdit,
      handleSaveEditInline,
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

  const renderCards = () => {
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
  };

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
      <Toast data={toast} onClose={hideToast} />

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
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> {t('dict.add')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {dictConfig.map((dict) => (
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
                isSupplier={activeDict === 'suppliers'}
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
            transition:
              'grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
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
        <div className="glass rounded-xl overflow-hidden">{renderTable()}</div>
      </div>
      <div className="sm:hidden">{renderCards()}</div>
    </div>
  );
}
