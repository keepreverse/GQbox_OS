import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Download, Eye, X, Cable, Zap, Wifi, Car, Headphones,
  ArrowLeftRight, Pin, GripVertical, Smartphone, Package, Archive, Monitor,
  ChevronLeft, ChevronRight, SlidersHorizontal, Check
} from 'lucide-react';
import { products } from '../data/products';
import { categories, suppliers } from '../data/dictionaries';
import type { ProductWithRelations } from '../data/types';
import { useLanguage } from '../context/LanguageContext';
import { displayProductName, displaySource, getCategoryColorVar } from '../utils/display';
import ProductDetailCard from './ProductDetailCard';

const categoryIcons: Record<string, React.ElementType> = {
  cable: Cable, szu: Zap, bzu: Wifi, azu: Car, headphones: Headphones,
  adapter: ArrowLeftRight, pin: Pin, holder: GripVertical, case: Smartphone,
  kit: Package, packaging: Archive, blogo: Monitor,
};

export default function ProductMatrix() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const pageSize = 15;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchQuery || 
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fullNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.model.nameRu.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category.code);
      const matchesSupplier = selectedSuppliers.length === 0 || selectedSuppliers.includes(p.supplier?.code || '-');
      
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [searchQuery, selectedCategories, selectedSuppliers]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const toggleCategory = (code: string) => {
    setSelectedCategories(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
    setCurrentPage(1);
    setTableKey(k => k + 1);
  };

  const toggleSupplier = (code: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
    setCurrentPage(1);
    setTableKey(k => k + 1);
  };

  const activeFiltersCount = selectedCategories.length + selectedSuppliers.length;

  // Экспорт данных в формате CSV
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const headers = ['SKU', 'Name_RU', 'Name_EN', 'Category', 'Model', 'Power_W', 'Length_M', 'Color', 'Supplier'];
      const rows = filteredProducts.map(p => [
        p.sku,
        `"${p.fullNameRu.replace(/"/g, '""')}"`,
        `"${p.fullName.replace(/"/g, '""')}"`,
        displaySource(p.category, language),
        displaySource(p.model, language),
        p.powerW || '',
        p.lengthM || '',
        p.color ? displaySource(p.color, language) : '',
        p.supplier?.name || ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // добавили BOM для Excel
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `gqbox_matrix_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExporting(false);
    }, 600);
  };

  // Вычисление умного диапазона страниц с многоточиями
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-gradient">{t('matrix.title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{filteredProducts.length} {t('matrix.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || filteredProducts.length === 0}
              className="h-10 min-w-[120px] justify-center flex items-center gap-2 px-4 rounded-lg border text-sm transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 bg-bg-secondary border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-50 cursor-pointer"
            >
            {exporting ? <Check className="w-3.5 h-3.5 text-success" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? (language === 'ru' ? 'Скачивание...' : 'Exporting...') : t('matrix.export')}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('matrix.search')}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); setTableKey(k => k + 1); }}
            className="w-full px-4 py-2.5 text-text-primary transition-all duration-200"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-10 min-w-[120px] justify-center flex items-center gap-2 px-4 rounded-lg border text-sm transition-all duration-200 outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
            showFilters || activeFiltersCount > 0
              ? 'bg-bg-elevated text-text-primary border border-border-strong'
              : 'bg-bg-secondary border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          }`}
        >
          <SlidersHorizontal className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          {t('matrix.filters')}
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center transition-all duration-200 scale-in">
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
          transition: 'grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="glass rounded-xl p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('matrix.filters')}</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { setSelectedCategories([]); setSelectedSuppliers([]); }}
                  className="text-xs flex items-center gap-1 cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 px-2 py-1 rounded transition-colors"
                >
                  <X className="w-3 h-3" /> {t('matrix.clear')}
                </button>
              )}
            </div>

            <div>
              <p className="text-xs text-text-tertiary font-medium mb-2">{t('matrix.cat')}</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.code}
                    onClick={() => toggleCategory(cat.code)}
                    className={`flex h-8 min-w-[112px] items-center justify-center gap-1.5 px-3 rounded-lg text-xs transition-colors truncate outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                      selectedCategories.includes(cat.code)
                        ? 'text-white border border-transparent'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-subtle'
                    }`}
                    style={selectedCategories.includes(cat.code) ? { background: getCategoryColorVar(cat.code) } : {}}
                  >
                    {displaySource(cat, language)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-text-tertiary font-medium mb-2">{t('matrix.sup')}</p>
              <div className="flex flex-wrap gap-2">
                {suppliers.map(sup => (
                  <button
                    key={sup.code}
                    onClick={() => toggleSupplier(sup.code)}
                    className={`h-8 min-w-[112px] px-3 rounded-lg text-xs transition-colors truncate outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
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
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.sku')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.product')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.cat')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.model')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.power')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.length')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.color')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('matrix.col.sup')}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody key={tableKey} className="table-fade-in">
                {paginatedProducts.map((product) => {
                  const Icon = categoryIcons[product.category.code] || Archive;
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border-subtle/50 table-row-hover cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <td className="px-4 py-3">
                        <code className="text-xs text-accent">{product.sku}</code>
                        {product.isKit && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">KIT</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: getCategoryColorVar(product.category.code) }} />
                          <span className="truncate max-w-[200px] sm:max-w-[280px]">
                            {displayProductName(product, language)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: getCategoryColorVar(product.category.code) }}>
                          {displaySource(product.category, language)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {displaySource(product.model, language)}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{product.powerW ? `${product.powerW}W` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{product.lengthM ? `${product.lengthM}${language === 'ru' ? 'м' : 'm'}` : '—'}</td>
                      <td className="px-4 py-3">
                        {product.color && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full border border-border-subtle flex-shrink-0" style={{ background: product.color.hexValue }} />
                            <span className="text-xs text-text-secondary truncate">
                              {displaySource(product.color, language)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          product.supplier?.code === 'A' ? 'bg-accent/10 text-accent' :
                          product.supplier?.code === 'W' ? 'bg-pink-500/10 text-pink-400' :
                          product.supplier?.code === 'AW' ? 'bg-success/10 text-success' :
                          'bg-bg-elevated text-text-muted'
                        }`}>
                          {product.supplier?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Eye className="w-3.5 h-3.5 text-text-muted hover:text-text-primary transition-colors" />
                      </td>
                    </tr>
                  );
                })}
                {paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-text-tertiary">
                      {language === 'ru' ? 'Товары не найдены' : 'No products found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Умная пагинация */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle">
            <p className="text-xs text-text-tertiary text-center">
              {t('matrix.showing')} {(currentPage - 1) * pageSize + 1} {t('matrix.to')} {Math.min(currentPage * pageSize, filteredProducts.length)} {t('matrix.of')} {filteredProducts.length}
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="w-7 text-center text-xs text-text-tertiary select-none">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${page}`}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-7 h-7 rounded-lg text-xs transition-colors outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 cursor-pointer ${
                      currentPage === page
                        ? 'bg-accent/25 text-white border border-accent/40 font-medium'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary cursor-pointer"
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
          <ProductDetailCard product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
