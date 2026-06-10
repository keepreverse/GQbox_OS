import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Cable,
  Zap,
  Wifi,
  Car,
  Headphones,
  ArrowLeftRight,
  Magnet,
  Sparkles,
  Navigation,
  Package,
  Monitor,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Hash,
  FileText,
  ChevronRight,
  ChevronDown,
  Wrench,
  Upload,
  Ruler,
  Palette,
} from 'lucide-react';
// Обрати внимание: ResponsiveContainer удален за ненадобностью!
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Customized,
} from 'recharts';
import { useLanguage } from '@context/LanguageContext';
import { useLayout } from '@context/LayoutContext';
import type { ViewType, MatrixFilters } from '@app-types';
import { displayProductName, displaySource, getCategoryColorVar } from '@utils/display';
import ProductDetailCard from '@features/product-detail/ProductDetailCard';
import type { ProductWithRelations } from '@app-types';
import { useDataSource } from '@api/dataSourceContext';
import { categoryRequiredFields } from './dataGapsConfig';

const DASH_INITIAL_KEY = 'gqbox_dash_initial_v2';
type MetricKey = 'power' | 'length' | 'color';

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

const tooltipStyle = {
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-text-primary)',
};

const tooltipItemStyle = { color: 'var(--color-text-primary)' };
const tooltipLabelStyle = { color: 'var(--color-text-secondary)', marginBottom: '4px' };

/* 
  СОВЕРШЕННЫЙ КОНТЕЙНЕР ГРАФИКОВ
  - Работает через Render Prop, передавая точную ширину в пикселях.
  - Никаких ошибок width(-1) в консоли.
  - Идеально гладкая заморозка размера при движении сайдбара.
*/
function ChartContainer({ height, children }: { height: number; children: (width: number) => React.ReactNode }) {
  const { sidebarCollapsed } = useLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [frozenWidth, setFrozenWidth] = useState<number | null>(null);

  // Вычисляем точную ширину контейнера
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setWidth(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Замораживаем ширину при изменении состояния сайдбара
  const prevSidebar = useRef(sidebarCollapsed);
  useEffect(() => {
    if (prevSidebar.current !== sidebarCollapsed) {
      prevSidebar.current = sidebarCollapsed;
      if (width > 0) setFrozenWidth(width);
    }
  }, [sidebarCollapsed, width]);

  // Размораживаем ширину через 150мс (длительность анимации сайдбара)
  useEffect(() => {
    if (frozenWidth !== null) {
      const t = setTimeout(() => setFrozenWidth(null), 150);
      return () => clearTimeout(t);
    }
  }, [frozenWidth]);

  const displayWidth = frozenWidth !== null ? frozenWidth : width;

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height }}>
      <AnimatePresence>
        {width === 0 && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 bg-bg-tertiary/40 animate-pulse rounded-lg"
          />
        )}
      </AnimatePresence>
      <div
        className="absolute top-0 left-0 h-full"
        style={{
          width: displayWidth > 0 ? displayWidth : '100%',
          opacity: width > 0 ? 1 : 0,
          transition: frozenWidth !== null ? 'none' : 'opacity 0.3s ease-out',
        }}
      >
        {width > 0 && children(displayWidth)}
      </div>
    </div>
  );
}

interface DashboardProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToMatrix?: (filters: MatrixFilters) => void;
}

export default function Dashboard({ onViewChange, onNavigateToMatrix }: DashboardProps) {
  const { t, language } = useLanguage();
  const { products: productsApi, dictionaries } = useDataSource();
  const products = productsApi.list;
  const categories = dictionaries.categories;
  const colors = dictionaries.colors;

  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const handleDetailClose = useCallback(() => setSelectedProduct(null), []);

  const SupplierTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const countEntry = payload.find((p: any) => p.dataKey === 'count');
    if (!countEntry) return null;

    return (
      <div style={tooltipStyle} className="px-3 py-2">
        <div style={tooltipLabelStyle}>{label}</div>
        <div style={tooltipItemStyle}>
          {countEntry.value} {t('dash.items')}
        </div>
      </div>
    );
  };

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isActive).length;
    const kits = products.filter((p) => p.isKit).length;
    const byCategory = categories
      .map((cat) => ({
        name: displaySource(cat),
        code: cat.code,
        color: cat.color,
        count: products.filter((p) => p.category.code === cat.code).length,
      }))
      .filter((c) => c.count > 0);

    const recentProducts = [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const supplierCounts = [
      products.filter((p) => p.supplier?.code === 'A').length,
      products.filter((p) => p.supplier?.code === 'W').length,
      products.filter((p) => p.supplier?.code === 'AW').length,
      products.filter((p) => !p.supplier || p.supplier.code === '-').length,
    ];

    const maxSupplierCount = Math.max(...supplierCounts, 1);

    const supplierStats = [
      { name: 'Angela', code: 'A', count: supplierCounts[0], color: 'var(--color-supplier-a)', maxCount: maxSupplierCount },
      { name: 'Wendy', code: 'W', count: supplierCounts[1], color: 'var(--color-supplier-w)', maxCount: maxSupplierCount },
      { name: 'Angela+Wendy', code: 'AW', count: supplierCounts[2], color: 'var(--color-supplier-aw)', maxCount: maxSupplierCount },
      { name: '—', code: '-', count: supplierCounts[3], color: 'var(--color-text-tertiary)', maxCount: maxSupplierCount },
    ];

    return { total, active, kits, byCategory, recentProducts, supplierStats, totalCategories: categories.length };
  }, [language, products, categories]);

  const powerDistribution = useMemo(() => {
    const buckets = [
      { name: '≤20W', min: 0, max: 20 },
      { name: '21-60W', min: 21, max: 60 },
      { name: '61-100W', min: 61, max: 100 },
      { name: '>100W', min: 101, max: Infinity },
    ];
    return buckets
      .map((b) => {
        const matching = products.filter((p) => p.powerW != null && p.powerW >= b.min && p.powerW <= b.max);
        const values = [...new Set(matching.map((p) => p.powerW!))].sort((a, b) => a - b);
        return { name: b.name, value: matching.length, values };
      })
      .filter((b) => b.value > 0);
  }, [products]);

  const lengthDistribution = useMemo(() => {
    const buckets = [
      { name: '≤1м', min: 0, max: 1 },
      { name: '1-2м', min: 1.1, max: 2 },
      { name: '2-3м', min: 2.1, max: 3 },
      { name: '>3м', min: 3.1, max: Infinity },
    ];
    return buckets
      .map((b) => {
        const matching = products.filter((p) => p.lengthM != null && p.lengthM >= b.min && p.lengthM <= b.max);
        const values = [...new Set(matching.map((p) => p.lengthM!))].sort((a, b) => a - b);
        return { name: b.name, value: matching.length, values };
      })
      .filter((b) => b.value > 0);
  }, [products]);

  const colorDistribution = useMemo(() => {
    return colors
      .map((c) => ({
        name: c.name_source,
        value: products.filter((p) => p.color?.code === c.code).length,
        code: c.code,
        color: c.color === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : c.color,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [products, colors]);

  const [metric, setMetric] = useState<MetricKey>('power');
  const distributionData = useMemo(() => {
    if (metric === 'length') return lengthDistribution;
    if (metric === 'color') return colorDistribution;
    return powerDistribution;
  }, [metric, powerDistribution, lengthDistribution, colorDistribution]);

  const [hoveredSupplierIndex, setHoveredSupplierIndex] = useState<number | null>(null);
  const initialRef = useRef<{ active: number; kits: number; categories: number } | null>(null);

  if (initialRef.current === null) {
    const stored = localStorage.getItem(DASH_INITIAL_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.active === 'number') {
          initialRef.current = parsed;
        }
      } catch {}
    }
    if (initialRef.current === null) {
      initialRef.current = { active: stats.active, kits: stats.kits, categories: categories.length };
      localStorage.setItem(DASH_INITIAL_KEY, JSON.stringify(initialRef.current));
    }
  }

  const statsWithDelta = useMemo(() => {
    const init = initialRef.current!;
    const calc = (current: number, initial: number) => {
      const delta = current - initial;
      if (delta === 0) return { delta: 0, trend: 'neutral' as const };
      if (delta > 0) return { delta, trend: 'up' as const };
      return { delta, trend: 'down' as const };
    };

    return {
      active: { value: stats.active, ...calc(stats.active, init.active) },
      kits: { value: stats.kits, ...calc(stats.kits, init.kits) },
      categories: { value: categories.length, ...calc(categories.length, init.categories) },
    };
  }, [stats, categories]);

  const chartColors = ['var(--color-info)', 'var(--color-accent)', 'var(--color-warning)', 'var(--color-danger)'];

  const getSliceColor = (entry: any, index: number): string => {
    if (metric === 'color') return entry?.color || 'var(--color-accent)';
    return chartColors[index % chartColors.length];
  };

  const metrics: { key: MetricKey; label: string; icon: React.ElementType }[] = [
    { key: 'power', label: t('dash.distPower'), icon: Zap },
    { key: 'length', label: t('dash.distLength'), icon: Ruler },
    { key: 'color', label: t('dash.distColor'), icon: Palette },
  ];

  const handleSliceClick = useCallback((data: any) => {
    if (!onNavigateToMatrix) return;
    const entry = data?.payload || data;
    if (metric === 'power' && entry.values) onNavigateToMatrix({ power: entry.values });
    else if (metric === 'length' && entry.values) onNavigateToMatrix({ length: entry.values });
    else if (metric === 'color' && entry.code) onNavigateToMatrix({ colors: [entry.code] });
  }, [onNavigateToMatrix, metric]);

  const handleCategoryBarClick = useCallback((data: any) => {
    const entry = data?.payload || data;
    onNavigateToMatrix?.({ categories: entry?.code ? [entry.code] : [] });
  }, [onNavigateToMatrix]);

  const handleSupplierBarClick = useCallback((data: any) => {
    const entry = data?.payload || data;
    if (entry?.code) onNavigateToMatrix?.({ suppliers: [entry.code] });
  }, [onNavigateToMatrix]);

  const handleSupplierBarEnter = useCallback((data: any) => {
    const entry = data?.payload || data;
    const idx = stats.supplierStats.findIndex((s) => s.code === entry?.code);
    if (idx !== -1) setHoveredSupplierIndex(idx);
  }, [stats.supplierStats]);

  const handleSupplierBarLeave = useCallback(() => {
    setHoveredSupplierIndex(null);
  }, []);

  const handleSupplierDotClick = useCallback(
    (e: React.MouseEvent, code: string) => {
      e.stopPropagation();
      onNavigateToMatrix?.({ suppliers: [code] });
    },
    [onNavigateToMatrix]
  );

  const handleSupplierDotEnter = useCallback(
    (index: number) => setHoveredSupplierIndex(index),
    []
  );

  const handleSupplierDotLeave = useCallback(
    (index: number) => {
      setHoveredSupplierIndex((prev) => (prev === index ? null : prev));
    },
    []
  );

  const renderSupplierDot = useCallback(
    (props: any) => {
      const { cx, cy, payload, index } = props;
      if (!payload || cx == null || cy == null) return null;
      return (
        <g
          key={`hit-${index}`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => handleSupplierDotClick(e, payload.code)}
          onMouseEnter={() => handleSupplierDotEnter(index)}
          onMouseLeave={() => handleSupplierDotLeave(index)}
        >
          <circle cx={cx} cy={cy} r={20} fill="transparent" />
        </g>
      );
    },
    [handleSupplierDotClick, handleSupplierDotEnter, handleSupplierDotLeave]
  );

  const renderSupplierActiveDot = useCallback(
    (props: any) => {
      const { cx, cy, payload, index } = props;
      if (!payload || cx == null || cy == null) return null;
      return (
        <g
          style={{ cursor: 'pointer' }}
          onClick={(e) => handleSupplierDotClick(e, payload.code)}
          onMouseEnter={() => handleSupplierDotEnter(index)}
        >
          <circle cx={cx} cy={cy} r={8} fill={payload.color} opacity={0.18} />
          <circle cx={cx} cy={cy} r={3.5} fill={payload.color} />
        </g>
      );
    },
    [handleSupplierDotClick, handleSupplierDotEnter]
  );

  const renderSupplierHighlightBand = useCallback(
    (props: any) => {
      const { xAxisMap, offset } = props;
      if (!xAxisMap) return null;
      const xAxis = Object.values(xAxisMap)[0] as any;
      if (!xAxis) return null;
      const isVisible = hoveredSupplierIndex !== null;
      const bandwidth = xAxis.bandwidth ? xAxis.bandwidth() : 0;
      const xPos = isVisible ? xAxis.x(hoveredSupplierIndex) - bandwidth / 2 : -1000;
      return (
        <motion.rect
          x={xPos}
          y={offset.top}
          width={bandwidth}
          height={offset.height}
          fill="var(--color-accent)"
          initial={false}
          animate={{ fillOpacity: isVisible ? 0.07 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          pointerEvents="none"
        />
      );
    },
    [hoveredSupplierIndex]
  );

  const renderSupplierPeakHits = useCallback(
    (props: any) => {
      const { xAxisMap, yAxisMap } = props;
      if (!xAxisMap || !yAxisMap) return null;
      const xAxis = Object.values(xAxisMap)[0] as any;
      const yAxis = Object.values(yAxisMap)[0] as any;
      if (!xAxis || !yAxis) return null;
      return (
        <g>
          {stats.supplierStats.map((entry, index) => {
            const cx = xAxis.x(index);
            const cy = yAxis.scale(entry.count);
            if (cx == null || cy == null) return null;
            return (
              <circle
                key={`peak-hit-${index}`}
                cx={cx}
                cy={cy}
                r={22}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleSupplierDotClick(e, entry.code)}
                onMouseEnter={() => handleSupplierDotEnter(index)}
                onMouseLeave={() => handleSupplierDotLeave(index)}
              />
            );
          })}
        </g>
      );
    },
    [stats.supplierStats, handleSupplierDotClick, handleSupplierDotEnter, handleSupplierDotLeave]
  );

  const dataGaps = useMemo(() => {
    const gaps: Array<{
      categoryCode: string;
      field: string;
      fieldLabel: string;
      count: number;
    }> = [];

    // Regular products (non-kit)
    for (const cat of categories) {
      const reqFields = categoryRequiredFields[cat.code];
      if (!reqFields) continue;
      const catProducts = products.filter((p) => p.category.code === cat.code && !p.isKit);

      for (const fd of reqFields) {
        const missing = catProducts.filter((p) => {
          const val = p[fd.field as keyof ProductWithRelations];
          return val == null || val === '';
        });
        if (missing.length > 0) {
          gaps.push({
            categoryCode: cat.code,
            field: fd.field,
            fieldLabel: language === 'ru' ? fd.labelRu : fd.label,
            count: missing.length,
          });
        }
      }
    }

    // Kit products: check components — aggregate by component category
    const kitProducts = products.filter((p) => p.isKit);
    const kitGapMap = new Map<string, Set<string>>(); // compCatCode -> Set<kitId>

    for (const kit of kitProducts) {
      for (const comp of kit.kitComponents || []) {
        const compCatCode = comp.product.category.code;
        const reqFields = categoryRequiredFields[compCatCode];
        if (!reqFields) continue;

        // Check if ANY required field is missing for this component
        const hasMissing = reqFields.some((fd) => {
          const val = comp.product[fd.field as keyof ProductWithRelations];
          return val == null || val === '';
        });

        if (hasMissing) {
          if (!kitGapMap.has(compCatCode)) kitGapMap.set(compCatCode, new Set());
          kitGapMap.get(compCatCode)!.add(kit.id);
        }
      }
    }

    for (const [compCatCode, kitIds] of kitGapMap) {
      const cat = categories.find((c) => c.code === compCatCode);
      const labelBase = cat ? displaySource(cat) : compCatCode;
      gaps.push({
        categoryCode: 'kit',
        field: compCatCode, // used for matrix filtering
        fieldLabel: labelBase,
        count: kitIds.size,
      });
    }

    return gaps;
  }, [products, categories, language]);

  const dataGapsByCategory = useMemo(() => {
    const grouped = new Map<string, {
      categoryCode: string;
      categoryName: string;
      color: string;
      productIds: Set<string>;
      gaps: typeof dataGaps;
    }>();

    for (const gap of dataGaps) {
      let cat = grouped.get(gap.categoryCode);
      if (!cat) {
        const category = categories.find((c) => c.code === gap.categoryCode);
        cat = {
          categoryCode: gap.categoryCode,
          categoryName: category ? displaySource(category) : gap.categoryCode,
          color: getCategoryColorVar(category),
          productIds: new Set<string>(),
          gaps: [],
        };
        grouped.set(gap.categoryCode, cat);
      }
      cat.gaps.push(gap);
    }

    for (const cat of grouped.values()) {
      const catProducts = products.filter((p) => p.category.code === cat.categoryCode);
      for (const gap of cat.gaps) {
        if (cat.categoryCode === 'kit') {
          // Kit gaps: field is the component category code (e.g., "szu", "cable")
          const compCatCode = gap.field;
          const reqFields = categoryRequiredFields[compCatCode];
          catProducts
            .filter((p) =>
              p.kitComponents?.some((comp) => {
                if (comp.product.category.code !== compCatCode) return false;
                // Check if ANY required field is missing for this component category
                return reqFields?.some((fd) => {
                  const val = comp.product[fd.field as keyof ProductWithRelations];
                  return val == null || val === '';
                }) ?? false;
              })
            )
            .forEach((p) => cat.productIds.add(p.id));
        } else {
          catProducts
            .filter((p) => {
              const val = p[gap.field as keyof ProductWithRelations];
              return val == null || val === '';
            })
            .forEach((p) => cat.productIds.add(p.id));
        }
      }
    }

    return Array.from(grouped.values())
      .map((cat) => ({ ...cat, productCount: cat.productIds.size }))
      .sort((a, b) => b.productCount - a.productCount);
  }, [dataGaps, categories, products]);

  const firstCategoryCode = dataGapsByCategory[0]?.categoryCode;

  useEffect(() => {
    if (firstCategoryCode) {
      setExpandedCategories((prev) => {
        if (prev.has(firstCategoryCode)) return prev;
        const next = new Set(prev);
        next.add(firstCategoryCode);
        return next;
      });
    }
  }, [firstCategoryCode]);

  const toggleCategoryExpanded = useCallback((code: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gradient">{t('dash.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">{t('dash.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Activity className="w-3.5 h-3.5" />
          <span>{t('dash.updated')} {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {[
          { key: 'active', label: t('dash.active'), icon: Hash, accent: 'var(--color-success)' },
          { key: 'kits', label: t('dash.kits'), icon: Package, accent: 'var(--color-warning)' },
          { key: 'categories', label: t('dash.categories'), icon: FileText, accent: 'var(--color-info)' },
        ].map((stat) => {
          const data = statsWithDelta[stat.key as 'active' | 'kits' | 'categories'];
          return (
            <div key={stat.label} className="glass rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-border-strong transition-all duration-300">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-opacity duration-500" style={{ background: stat.accent }} />
              <div className="absolute -bottom-4 -right-4 opacity-[0.09] group-hover:opacity-[0.16] transition-opacity duration-500" style={{ color: stat.accent }}>
                <stat.icon className="w-24 sm:w-28 h-24 sm:h-28" strokeWidth={1.2} />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between min-h-[18px]">
                  <p className="text-[11px] sm:text-xs text-text-tertiary font-medium tracking-wide">{stat.label}</p>
                  {data.delta !== 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full ${data.trend === 'up' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                      {data.trend === 'up' ? <TrendingUp className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : <TrendingDown className="w-2.5 sm:w-3 h-2.5 sm:h-3" />}
                      {data.trend === 'up' ? `+${data.delta}` : data.delta}
                    </span>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-semibold mt-3 sm:mt-4 text-text-primary tracking-tight">{data.value}</p>
              </div>
            </div>
          );
        })}

        <div className="glass rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-border-strong transition-all duration-300 flex flex-col">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
          <div className="absolute -bottom-4 -right-4 opacity-[0.09] group-hover:opacity-[0.16] transition-opacity duration-500" style={{ color: 'var(--color-accent)' }}>
            <Zap className="w-24 sm:w-28 h-24 sm:h-28" strokeWidth={1.2} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <p className="text-[11px] sm:text-xs text-text-tertiary font-medium tracking-wide mb-3 sm:mb-4">{t('dash.quickActions')}</p>
            <div className="flex flex-col gap-1.5 flex-1 justify-center">
              <button onClick={() => onViewChange && onViewChange('sku-constructor')} className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors text-left cursor-pointer">
                <Wrench className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-text-primary truncate">{t('dash.quickAddProduct')}</span>
              </button>
              <button onClick={() => onViewChange && onViewChange('dictionary')} className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors text-left cursor-pointer">
                <Layers className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-text-primary truncate">{t('dash.quickManageDict')}</span>
              </button>
              <button onClick={() => onViewChange && onViewChange('media')} className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors text-left cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-info flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-text-primary truncate">{t('dash.quickUploadMedia')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-3 sm:p-5 lg:col-span-2 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{t('dash.catDist')}</h3>
          <div className="pt-1 sm:pt-2">
            <div style={{ transform: 'translateX(clamp(-1rem, -0.625vw - 0.5rem, -0.5rem))' }}>
              {/* Передаем функцию, которая получает готовую пиксельную ширину */}
              <ChartContainer height={260}>
                {(width) => (
                  <BarChart width={width} height={260} data={stats.byCategory} barCategoryGap="20%" barGap={2} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} angle={20} textAnchor="start" height={70} interval={0} dx={-12} />
                    <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip isAnimationActive={false} cursor={{ fill: 'var(--color-accent-dim)' }} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(value) => [value, t('dash.items')]} />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                      isAnimationActive={false}
                      onClick={handleCategoryBarClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {stats.byCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-3 sm:p-5 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">{t('dash.distTitle')}</h3>
          <div className="flex gap-1 mb-2 sm:mb-3 overflow-x-auto scrollbar-hide">
            {metrics.map((m) => {
              const Icon = m.icon;
              const active = metric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium flex-shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                    active ? 'bg-accent/25 text-white border border-accent/40' : 'bg-bg-tertiary text-text-tertiary hover:bg-bg-hover border border-transparent'
                  }`}
                >
                  <Icon className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <div className="relative z-10">
              <ChartContainer height={200}>
                {(width) => (
                  <PieChart width={width} height={200}>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none">
                      <tspan x="50%" dy="-0.1em" fontSize="24" fontWeight="600" fill="var(--color-text-primary)">
                        {distributionData.reduce((sum, d) => sum + d.value, 0)}
                      </tspan>
                      <tspan x="50%" dy="1.6em" fontSize="10" fill="var(--color-text-tertiary)" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('dash.items')}
                      </tspan>
                    </text>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius="42%"
                      outerRadius="78%"
                      paddingAngle={1}
                      dataKey="value"
                      stroke="var(--color-bg-secondary)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      onClick={(data: any) => handleSliceClick(data)}
                      style={{ cursor: 'pointer' }}
                    >
                      {distributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={getSliceColor(entry, index)} />)}
                    </Pie>
                    <Tooltip isAnimationActive={false} cursor={{ fill: 'var(--color-accent-dim)' }} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(value) => [value, t('dash.items')]} />
                  </PieChart>
                )}
              </ChartContainer>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {distributionData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-secondary">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getSliceColor(d, i) }} />
                <span className="truncate max-w-[80px]">{d.name}</span>
                <span className="text-text-tertiary">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="glass rounded-xl p-3 sm:p-5 lg:flex-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium">{t('dash.recent')}</h3>
            <button onClick={() => onViewChange && onViewChange('matrix')} className="h-11 sm:h-9 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-border-default cursor-pointer">
              {t('dash.viewAll')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {stats.recentProducts.map((product) => {
              const Icon = categoryIcons[product.category.code] || Package;
              return (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="flex items-center gap-3 min-h-[44px] sm:min-h-0 p-2.5 rounded-lg hover:bg-bg-hover active:bg-bg-hover transition-colors group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${product.category.color} 8%, transparent)` }}>
                    <Icon className="w-4 h-4" style={{ color: getCategoryColorVar(product.category) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayProductName(product)}</p>
                    <p className="text-[11px] text-text-tertiary truncate">{product.sku} · {displaySource(product.model)}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-1">
          <div className="glass rounded-xl p-3 sm:p-5">
            <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{t('dash.supplierDist')}</h3>
          <div className="pt-1 sm:pt-2">
            <ChartContainer height={120}>
              {(width) => (
                <AreaChart width={width} height={120} data={stats.supplierStats}>
                  <defs>
                    <linearGradient id="supplierGrad" x1="0" y1="0" x2="1" y2="0">
                      {stats.supplierStats.map((entry, i) => <stop key={i} offset={`${(i / (stats.supplierStats.length - 1)) * 100}%`} stopColor={entry.color} stopOpacity={0.3} />)}
                      <stop offset="100%" stopColor={stats.supplierStats[stats.supplierStats.length - 1]?.color || 'var(--color-accent)'} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="supplierStroke" x1="0" y1="0" x2="1" y2="0">
                      {stats.supplierStats.map((entry, i) => <stop key={i} offset={`${(i / (stats.supplierStats.length - 1)) * 100}%`} stopColor={entry.color} stopOpacity={1} />)}
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip isAnimationActive={false} cursor={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.4 }} content={<SupplierTooltip />} />
                  <Area
                    type={"catmullRom" as any}
                    dataKey="count"
                    stroke="url(#supplierStroke)"
                    fill="url(#supplierGrad)"
                    isAnimationActive={false}
                    dot={renderSupplierDot}
                    activeDot={renderSupplierActiveDot}
                  />
                  <Bar dataKey="maxCount" fill="transparent" isAnimationActive={false} onClick={handleSupplierBarClick} onMouseEnter={handleSupplierBarEnter} onMouseLeave={handleSupplierBarLeave} style={{ cursor: 'pointer' }} />
                  <Customized component={renderSupplierHighlightBand} />
                  <Customized component={renderSupplierPeakHits} />
                </AreaChart>
              )}
            </ChartContainer>
          </div>
        </div>

          <div className="glass rounded-xl p-3 sm:p-5 flex-1 min-h-0 flex flex-col">
            <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4 flex-shrink-0">
              {t('dash.data_gaps')}
            </h3>
            {dataGapsByCategory.length > 0 ? (
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="divide-y divide-border-subtle/40">
                  {dataGapsByCategory.map((cat) => {
                    const isExpanded = expandedCategories.has(cat.categoryCode);
                    const Icon = categoryIcons[cat.categoryCode];
                    return (
                      <div key={cat.categoryCode} className="py-2 first:pt-0 last:pb-0">
                        <button
                          onClick={() => toggleCategoryExpanded(cat.categoryCode)}
                          className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-bg-tertiary/10 active:bg-transparent transition-colors cursor-pointer"
                        >
                          {Icon && (
                            <Icon
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: cat.color }}
                            />
                          )}
                          <p
                            className="text-xs font-semibold flex-1 text-left"
                            style={{ color: cat.color }}
                          >
                            {cat.categoryName}
                          </p>
                          <span className="text-[10px] tabular-nums text-text-tertiary px-1.5 py-0.5 rounded-full bg-bg-tertiary/60 flex-shrink-0">
                            {cat.productCount}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-200 flex-shrink-0 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <motion.div
                          initial={false}
                          animate={{
                            height: isExpanded ? 'auto' : 0,
                            opacity: isExpanded ? 1 : 0,
                          }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-2 pt-1 pb-1 divide-y divide-border-subtle/30">
                            {cat.gaps.map((gap) => (
                              <div
                                key={gap.field}
                                onClick={() =>
                                  onNavigateToMatrix?.({
                                    categories: [gap.categoryCode],
                                    missingFields: [gap.field],
                                  })
                                }
                                className="group flex items-center gap-2 py-1.5 cursor-pointer"
                              >
                                <span className="text-xs text-text-secondary flex-1 group-hover:text-text-primary transition-colors">
                                  {gap.fieldLabel}
                                </span>
                                <span
                                  className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0 ${
                                    gap.count >= 6
                                      ? 'bg-danger/15 text-danger'
                                      : gap.count >= 3
                                        ? 'bg-warning/15 text-warning'
                                        : 'bg-success/15 text-success/80'
                                  }`}
                                >
                                  {gap.count}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">{t('dash.no_gaps')}</p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedProduct && <ProductDetailCard product={selectedProduct} onClose={handleDetailClose} />}
      </AnimatePresence>
    </div>
  );
}