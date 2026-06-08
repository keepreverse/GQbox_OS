import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Download,
  Eye,
  X,
  Cable,
  Zap,
  Wifi,
  Car,
  Headphones,
  ArrowLeftRight,
  Pin,
  GripVertical,
  Smartphone,
  Package,
  Archive,
  Monitor,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { useDataSource } from '@api/dataSourceContext';
import type { ProductWithRelations, MatrixFilters } from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { displayProductName, displaySource, getCategoryColorVar } from '@utils/display';
import ProductDetailCard from '@features/product-detail/ProductDetailCard';
import { ResponsiveTable } from '@components/ui/ResponsiveTable';
import type { Column } from '@app-types/table';

const categoryIcons: Record<string, React.ElementType> = {
  cable: Cable,
  szu: Zap,
  bzu: Wifi,
  azu: Car,
  headphones: Headphones,
  adapter: ArrowLeftRight,
  pin: Pin,
  holder: GripVertical,
  case: Smartphone,
  kit: Package,
  packaging: Archive,
  blogo: Monitor,
};

interface ProductMatrixProps {
  initialFilters?: MatrixFilters | null;
  onInitialFiltersApplied?: () => void;
}

export default function ProductMatrix({
  initialFilters,
  onInitialFiltersApplied,
}: ProductMatrixProps = {}) {
  const { t } = useLanguage();
  const { products: productsApi, dictionaries } = useDataSource();
  const products = productsApi.list;
  const categories = dictionaries.categories;
  const suppliers = dictionaries.suppliers;
  const colors = dictionaries.colors;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPower, setSelectedPower] = useState<number[]>([]);
  const [selectedLength, setSelectedLength] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const pageSize = 15;
  const handleDetailClose = useCallback(() => setSelectedProduct(null), []);

  useEffect(() => {
    if (initialFilters) {
      setSelectedCategories(initialFilters.categories ?? []);
      setSelectedSuppliers(initialFilters.suppliers ?? []);
      setSelectedColors(initialFilters.colors ?? []);
      setSelectedPower(initialFilters.power ?? []);
      setSelectedLength(initialFilters.length ?? []);
      setShowFilters(true);
      setCurrentPage(1);
      setTableKey((k) => k + 1);
      onInitialFiltersApplied?.();
    }
  }, [initialFilters, onInitialFiltersApplied]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.model?.name_source?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.model?.name_product?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.color?.name_source?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.color?.name_product?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(p.category.code);
      const matchesSupplier =
        selectedSuppliers.length === 0 || selectedSuppliers.includes(p.supplier?.code || '-');
      const matchesColor =
        selectedColors.length === 0 || (p.color && selectedColors.includes(p.color.code));
      const matchesPower =
        selectedPower.length === 0 || (p.powerW != null && selectedPower.includes(p.powerW));
      const matchesLength =
        selectedLength.length === 0 || (p.lengthM != null && selectedLength.includes(p.lengthM));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSupplier &&
        matchesColor &&
        matchesPower &&
        matchesLength
      );
    });
  }, [
    products,
    searchQuery,
    selectedCategories,
    selectedSuppliers,
    selectedColors,
    selectedPower,
    selectedLength,
  ]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const toggleCategory = (code: string) => {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setCurrentPage(1);
    setTableKey((k) => k + 1);
  };

  const toggleSupplier = (code: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setCurrentPage(1);
    setTableKey((k) => k + 1);
  };

  const toggleColor = (code: string) => {
    setSelectedColors((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setCurrentPage(1);
    setTableKey((k) => k + 1);
  };

  const togglePower = (val: number) => {
    setSelectedPower((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
    setCurrentPage(1);
    setTableKey((k) => k + 1);
  };

  const toggleLength = (val: number) => {
    setSelectedLength((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
    setCurrentPage(1);
    setTableKey((k) => k + 1);
  };

  const uniqueColors = useMemo(() => {
    const codes = new Set(products.map((p) => p.color?.code).filter(Boolean));
    return colors.filter((c) => codes.has(c.code));
  }, [products]);

  const uniquePowerValues = useMemo(() => {
    const vals = new Set(products.map((p) => p.powerW).filter((v): v is number => v != null));
    return [...vals].sort((a, b) => a - b);
  }, [products]);

  const uniqueLengthValues = useMemo(() => {
    const vals = new Set(products.map((p) => p.lengthM).filter((v): v is number => v != null));
    return [...vals].sort((a, b) => a - b);
  }, [products]);

  const activeFiltersCount =
    selectedCategories.length +
    selectedSuppliers.length +
    selectedColors.length +
    selectedPower.length +
    selectedLength.length;

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const headers = [
        'SKU',
        'Name',
        'Category',
        'Model',
        'Power_W',
        'Length_M',
        'Color',
        'Supplier',
      ];
      const rows = filteredProducts.map((p) => [
        p.sku,
        `"${p.productName.replace(/"/g, '""')}"`,
        displaySource(p.category),
        displaySource(p.model),
        p.powerW || '',
        p.lengthM || '',
        p.color ? displaySource(p.color) : '',
        p.supplier?.name || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `gqbox_matrix_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExporting(false);
    }, 600);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          '...',
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const supplierBadge = (code?: string) => {
    const c = code || '-';
    return (
      <span
        className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
          c === 'A'
            ? 'bg-supplier-a-bg text-supplier-a'
            : c === 'W'
              ? 'bg-supplier-w-bg text-supplier-w'
              : c === 'AW'
                ? 'bg-supplier-aw-bg text-supplier-aw'
                : 'bg-bg-elevated text-text-muted'
        }`}
      >
        {c === '-' ? '—' : c}
      </span>
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSuppliers([]);
    setSelectedColors([]);
    setSelectedPower([]);
    setSelectedLength([]);
  };

  const productColumns: Column<ProductWithRelations>[] = [
    {
      key: 'sku',
      header: t('matrix.col.sku'),
      width: 12,
      nowrap: true,
      cell: (p) => (
        <div className="flex items-center min-w-0" title={p.sku}>
          <code className="text-[11px] sm:text-xs text-accent truncate">{p.sku}</code>
          {p.isKit && (
            <span className="ml-1.5 sm:ml-2 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-warning/10 text-warning whitespace-nowrap flex-shrink-0">
              KIT
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'product',
      header: t('matrix.col.product'),
      width: 24,
      cell: (p) => {
        const Icon = categoryIcons[p.category.code] || Archive;
        return (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title={displayProductName(p)}>
            <Icon
              className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0"
              style={{ color: getCategoryColorVar(p.category.code) }}
            />
            <span className="truncate text-xs sm:text-sm">{displayProductName(p)}</span>
          </div>
        );
      },
    },
    {
      key: 'cat',
      header: t('matrix.col.cat'),
      width: 10,
      cell: (p) => (
        <span
          className="text-[11px] sm:text-xs truncate block"
          style={{ color: getCategoryColorVar(p.category.code) }}
          title={displaySource(p.category)}
        >
          {displaySource(p.category)}
        </span>
      ),
    },
    {
      key: 'model',
      header: t('matrix.col.model'),
      width: 14,
      cell: (p) => (
        <span
          className="text-[11px] sm:text-xs text-text-secondary truncate block"
          title={displaySource(p.model)}
        >
          {displaySource(p.model)}
        </span>
      ),
    },
    {
      key: 'power',
      header: t('matrix.col.power'),
      width: 8,
      nowrap: true,
      cell: (p) => (
        <span className="text-[11px] sm:text-xs text-text-secondary truncate block">
          {p.powerW ? `${p.powerW}W` : '—'}
        </span>
      ),
    },
    {
      key: 'length',
      header: t('matrix.col.length'),
      width: 8,
      nowrap: true,
      cell: (p) => (
        <span className="text-[11px] sm:text-xs text-text-secondary truncate block">
          {p.lengthM ? `${p.lengthM}м` : '—'}
        </span>
      ),
    },
    {
      key: 'color',
      header: t('matrix.col.color'),
      width: 12,
      cell: (p) =>
        p.color ? (
          <div
            className="flex items-center gap-1 sm:gap-1.5 min-w-0"
            title={displaySource(p.color)}
          >
            <div
              className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full flex-shrink-0"
              style={{
                background:
                  p.color.hexValue === 'gradient'
                    ? 'conic-gradient(in hsl longer hue, red, red)'
                    : p.color.hexValue,
                border:
                  p.color.hexValue === 'gradient' ? 'none' : '1px solid var(--color-border-subtle)',
              }}
            />
            <span className="truncate text-[11px] sm:text-xs text-text-secondary">
              {displaySource(p.color)}
            </span>
          </div>
        ) : null,
    },
    {
      key: 'sup',
      header: t('matrix.col.sup'),
      width: 8,
      nowrap: true,
      cell: (p) => supplierBadge(p.supplier?.code),
    },
    {
      key: 'view',
      header: '',
      width: 4,
      align: 'right',
      cell: () => (
        <Eye className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-text-muted hover:text-text-primary transition-colors" />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('matrix.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {filteredProducts.length} {t('matrix.subtitle')}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || filteredProducts.length === 0}
          className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-[120px] px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-all cursor-pointer font-medium border border-accent/40 flex-shrink-0"
        >
          {exporting ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {exporting ? t('matrix.exporting') : t('matrix.export')}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('matrix.search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              setTableKey((k) => k + 1);
            }}
            className="w-full px-4 text-text-primary transition-all duration-150 h-11 sm:h-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-11 sm:h-10 min-w-[120px] justify-center flex items-center gap-2 px-4 rounded-lg border text-sm transition-all duration-150 outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
            showFilters || activeFiltersCount > 0
              ? 'bg-bg-elevated text-text-primary border border-border-strong'
              : 'bg-bg-secondary border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          }`}
        >
          <SlidersHorizontal
            className={`w-3.5 h-3.5 transition-transform duration-150 ${showFilters ? 'rotate-180' : ''}`}
          />
          {t('matrix.filters')}
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center transition-all duration-150 scale-in">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: showFilters ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="glass rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('matrix.filters')}</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs flex items-center gap-1 cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 px-2 py-1 rounded transition-colors"
                >
                  <X className="w-3 h-3" /> {t('matrix.clear')}
                </button>
              )}
            </div>

            <div>
              <p className="text-xs text-text-tertiary font-medium mb-2">{t('matrix.cat')}</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.code}
                    onClick={() => toggleCategory(cat.code)}
                    className={`flex h-11 sm:h-10 min-w-0 sm:min-w-[112px] items-center justify-center gap-1.5 px-3 rounded-lg text-xs transition-colors truncate outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                      selectedCategories.includes(cat.code)
                        ? 'text-white border border-transparent'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
                    }`}
                    style={
                      selectedCategories.includes(cat.code)
                        ? { background: getCategoryColorVar(cat.code) }
                        : {}
                    }
                  >
                    {displaySource(cat)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-text-tertiary font-medium mb-2">{t('matrix.sup')}</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {suppliers.map((sup) => (
                  <button
                    key={sup.code}
                    onClick={() => toggleSupplier(sup.code)}
                    className={`h-11 sm:h-10 min-w-0 sm:min-w-[112px] px-3 rounded-lg text-xs transition-colors truncate outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                      selectedSuppliers.includes(sup.code)
                        ? 'bg-accent/25 text-white border border-accent/40'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
                    }`}
                  >
                    {sup.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-text-tertiary font-medium mb-2">{t('matrix.col.color')}</p>
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide max-h-[124px] sm:max-h-[140px]">
                {uniqueColors.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => toggleColor(c.code)}
                    className={`flex items-center gap-1.5 h-11 sm:h-9 px-2.5 sm:px-2 rounded-lg text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer flex-shrink-0 ${
                      selectedColors.includes(c.code)
                        ? 'bg-accent/25 text-white border border-accent/40'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
                    }`}
                    title={displaySource(c)}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-border-subtle shrink-0"
                      style={{ background: c.hexValue || '#888' }}
                    />
                    <span className="truncate max-w-[80px]">{c.name_source}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-text-tertiary font-medium mb-2">
                  {t('matrix.col.power')}
                </p>
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide max-h-[124px] sm:max-h-[140px]">
                  {uniquePowerValues.map((val) => (
                    <button
                      key={val}
                      onClick={() => togglePower(val)}
                      className={`h-11 sm:h-9 px-3 sm:px-2.5 rounded-lg text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                        selectedPower.includes(val)
                          ? 'bg-accent/25 text-white border border-accent/40'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
                      }`}
                    >
                      {val}W
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-text-tertiary font-medium mb-2">
                  {t('matrix.col.length')}
                </p>
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide max-h-[124px] sm:max-h-[140px]">
                  {uniqueLengthValues.map((val) => (
                    <button
                      key={val}
                      onClick={() => toggleLength(val)}
                      className={`h-11 sm:h-9 px-3 sm:px-2.5 rounded-lg text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                        selectedLength.includes(val)
                          ? 'bg-accent/25 text-white border border-accent/40'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
                      }`}
                    >
                      {val}м
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data — Table (≥sm) and Cards (<sm) */}
      <div className="glass rounded-xl overflow-hidden">
        {/* Table — desktop/tablet */}
        <div className="hidden sm:block">
          <ResponsiveTable
            key={tableKey}
            columns={productColumns}
            rows={paginatedProducts}
            rowKey={(p) => p.id}
            minWidth={720}
            emptyMessage={t('matrix.empty')}
            bodyClassName="table-fade-in"
            rowClassName={() => 'table-row-hover cursor-pointer'}
            onRowClick={(p) => setSelectedProduct(p)}
          />
        </div>

        {/* Cards — mobile */}
        <div key={tableKey} className="sm:hidden p-2 space-y-2 animate-card-in">
          {paginatedProducts.map((product) => {
            const Icon = categoryIcons[product.category.code] || Archive;
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                aria-label={`${displayProductName(product)} ${product.sku}`}
                className="w-full text-left glass rounded-xl p-3 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: getCategoryColorVar(product.category.code) }}
                    />
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{ color: getCategoryColorVar(product.category.code) }}
                    >
                      {displaySource(product.category)}
                    </span>
                  </div>
                  {supplierBadge(product.supplier?.code)}
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <code className="text-[11px] text-accent truncate">{product.sku}</code>
                  {product.isKit && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-warning/10 text-warning flex-shrink-0">
                      KIT
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
                  {displayProductName(product)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-subtle truncate max-w-[120px]">
                    {displaySource(product.model)}
                  </span>
                  {product.powerW != null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-subtle">
                      {product.powerW}W
                    </span>
                  )}
                  {product.lengthM != null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-subtle">
                      {product.lengthM}м
                    </span>
                  )}
                  {product.color && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-subtle">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-border-subtle shrink-0"
                        style={{
                          background:
                            product.color.hexValue === 'gradient'
                              ? 'conic-gradient(in hsl longer hue, red, red)'
                              : product.color.hexValue,
                          border:
                            product.color.hexValue === 'gradient'
                              ? 'none'
                              : '1px solid var(--color-border-subtle)',
                        }}
                      />
                      <span className="truncate max-w-[80px]">
                        {displaySource(product.color)}
                      </span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {paginatedProducts.length === 0 && (
            <div className="py-8 text-center text-xs text-text-tertiary">{t('matrix.empty')}</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-t border-border-subtle">
            <p className="text-[10px] sm:text-xs text-text-tertiary text-center">
              {t('matrix.showing')} {(currentPage - 1) * pageSize + 1} {t('matrix.to')}{' '}
              {Math.min(currentPage * pageSize, filteredProducts.length)} {t('matrix.of')}{' '}
              {filteredProducts.length}
            </p>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap justify-center overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary cursor-pointer flex items-center justify-center"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="w-9 text-center text-xs text-text-tertiary select-none"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${page}`}
                    onClick={() => setCurrentPage(page as number)}
                    className={`h-9 w-9 rounded-lg text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer flex items-center justify-center ${
                      currentPage === page
                        ? 'bg-accent/25 text-white border border-accent/40 font-medium'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                    aria-label={`Page ${page}`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 w-9 rounded-lg hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary cursor-pointer flex items-center justify-center"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Card */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailCard product={selectedProduct} onClose={handleDetailClose} />
        )}
      </AnimatePresence>
    </div>
  );
}
