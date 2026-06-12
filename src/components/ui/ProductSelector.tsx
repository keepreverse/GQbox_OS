import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Package,
  Cable,
  Zap,
  Wifi,
  Car,
  Headphones,
  ArrowLeftRight,
  Magnet,
  Sparkles,
  Navigation,
  Monitor,
} from 'lucide-react';
import type { ProductWithRelations } from '@app-types';
import { useDataSourceVersion } from '@api/dataSourceContext';
import { getCategoryColorVar } from '@utils/display';

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

interface ProductSelectorProps {
  selected: ProductWithRelations[];
  onChange: (products: ProductWithRelations[]) => void;
  placeholder?: string;
  excludeIds?: string[];
}

export default function ProductSelector({
  selected,
  onChange,
  placeholder = 'Search product by SKU or name...',
  excludeIds = [],
}: ProductSelectorProps) {
  const { ds, version } = useDataSourceVersion('products');
  const allProducts = useMemo(() => ds.products.list, [ds, version]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropStyle, setDropStyle] = useState<Record<string, string | number> | null>(null);

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const excludedSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const results = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return allProducts.filter((p) => {
      if (selectedIds.has(p.id) || excludedSet.has(p.id)) return false;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        (p.model?.code?.toLowerCase() || '').includes(q) ||
        (p.model?.name_source?.toLowerCase() || '').includes(q) ||
        (p.model?.name_product?.toLowerCase() || '').includes(q) ||
        (p.color?.name_source?.toLowerCase() || '').includes(q) ||
        (p.color?.name_product?.toLowerCase() || '').includes(q) ||
        (p.category?.name_source?.toLowerCase() || '').includes(q) ||
        (p.category?.name_product?.toLowerCase() || '').includes(q)
      );
    }).slice(0, 50);
  }, [allProducts, searchQuery, selectedIds, excludedSet]);

  const getRect = useCallback(() => {
    if (!containerRef.current) return null;
    const r = containerRef.current.getBoundingClientRect();
    return {
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    };
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    const rect = getRect();
    if (rect) setDropStyle({ top: rect.top, left: rect.left, width: rect.width });
  }, [getRect]);

  const close = useCallback(() => {
    setIsOpen(false);
    setDropStyle(null);
    setHighlightedIdx(-1);
  }, []);

  const addProduct = useCallback((product: ProductWithRelations) => {
    onChange([...selected, product]);
    setSearchQuery('');
    close();
    inputRef.current?.focus();
  }, [selected, onChange, close]);

  const removeProduct = useCallback((id: string) => {
    onChange(selected.filter((p) => p.id !== id));
    inputRef.current?.focus();
  }, [selected, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setHighlightedIdx(-1);
    if (val.trim()) {
      open();
    } else {
      close();
    }
  }, [open, close]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      addProduct(results[highlightedIdx]);
    }
  }, [isOpen, results, highlightedIdx, addProduct, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onMove = () => {
      const rect = getRect();
      if (rect) setDropStyle({ top: rect.top, left: rect.left, width: rect.width });
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [isOpen, getRect]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setDropStyle(null);
        setHighlightedIdx(-1);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="relative flex flex-wrap items-center gap-1.5 sm:gap-2 min-h-[44px] w-full px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/20 transition-[colors,opacity,transform,box-shadow] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((p) => {
          const Icon = categoryIcons[p.category.code] || Package;
          return (
            <span
              key={p.id}
              className="flex-[0_0_calc(33.333%-0.25rem)] sm:flex-[0_0_calc(33.333%-0.375rem)] min-w-0 h-7 px-2 rounded-lg bg-accent/10 border border-accent/20 text-[11px] text-accent select-none inline-flex items-center gap-1.5"
            >
              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: getCategoryColorVar(p.category) }} />
              <span className="truncate" title={`${p.sku} — ${p.productName}`}>
                {p.sku}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProduct(p.id);
                }}
                className="w-4 h-4 rounded-full hover:bg-accent/20 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ml-auto"
                aria-label={`Remove ${p.sku}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[clamp(80px,20vw,160px)] bg-transparent border-none outline-none ring-0 text-[13px] text-text-primary placeholder:text-text-muted h-8"
        />
      </div>
      {isOpen && dropStyle && createPortal(
        <div
          className="fixed z-[200] rounded-xl bg-bg-primary border border-border-subtle shadow-lg max-h-[min(50vh,320px)] overflow-y-auto"
          style={dropStyle}
        >
          {results.length > 0 ? (
            results.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  idx === highlightedIdx ? 'bg-accent/8' : 'hover:bg-bg-hover'
                } ${idx > 0 ? 'border-t border-border-subtle/50' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-accent px-1 py-0.5 rounded bg-accent/10 leading-none">
                      {p.sku}
                    </code>
                    <span className="text-[11px] leading-none hidden sm:inline" style={{ color: getCategoryColorVar(p.category) }}>
                      {p.category?.name_source}
                    </span>
                  </div>
                  <p className="text-[12px] text-text-primary mt-0.5 leading-snug line-clamp-1">
                    {p.productName}
                  </p>
                  {p.model?.name_source && (
                    <p className="text-[10px] text-text-tertiary mt-0.5 leading-none">
                      {p.model.name_source}{p.color ? ` · ${p.color.name_source}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  <Search className="w-3.5 h-3.5 text-text-muted" />
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-[11px] text-text-tertiary">
              No products found
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
