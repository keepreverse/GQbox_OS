import { useMemo, useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Cable, Zap, Wifi, Car, Headphones, ArrowLeftRight, Pin,
  GripVertical, Smartphone, Package, Box, Monitor,
  TrendingUp, TrendingDown, Activity, Layers, Hash, FileText,
  ChevronRight, AlertCircle, Wrench, Upload, Ruler, Palette
} from 'lucide-react';
import { products } from '@data/products';
import { subscribeToProducts, getProductsVersion } from '@data/products';
import { categories, colors } from '@data/dictionaries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Customized
} from 'recharts';
import { useLanguage } from '@context/LanguageContext';
import { useLayout } from '@context/LayoutContext';
import type { ViewType, MatrixFilters } from '@app-types';
import { displayProductName, displaySource, getCategoryColorVar } from '@utils/display';
import ProductDetailCard from '@features/product-detail/ProductDetailCard';
import type { ProductWithRelations } from '@app-types';

const DASH_INITIAL_KEY = 'gqbox_dash_initial_v2';

type MetricKey = 'power' | 'length' | 'color';

const categoryIcons: Record<string, React.ElementType> = {
  cable: Cable, szu: Zap, bzu: Wifi, azu: Car, headphones: Headphones,
  adapter: ArrowLeftRight, pin: Pin, holder: GripVertical, case: Smartphone,
  kit: Package, packaging: Box, blogo: Monitor,
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

function ChartFreeze({ sidebarCollapsed, children }: { sidebarCollapsed: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [frozenWidth, setFrozenWidth] = useState<number | null>(null);
  const prevRef = useRef(sidebarCollapsed);

  useEffect(() => {
    if (prevRef.current !== sidebarCollapsed) {
      prevRef.current = sidebarCollapsed;
      const el = ref.current;
      if (el) {
        setFrozenWidth(el.clientWidth);
      }
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (frozenWidth !== null) {
      const timer = setTimeout(() => setFrozenWidth(null), 150);
      return () => clearTimeout(timer);
    }
  }, [frozenWidth]);

  return (
    <div ref={ref} style={frozenWidth !== null ? { width: frozenWidth, flexShrink: 0 } : undefined}>
      {children}
    </div>
  );
}

interface DashboardProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToMatrix?: (filters: MatrixFilters) => void;
}

export default function Dashboard({ onViewChange, onNavigateToMatrix }: DashboardProps) {
  const { t, language } = useLanguage();
  const { sidebarCollapsed } = useLayout();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);

  const SupplierTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const countEntry = payload.find((p: any) => p.dataKey === 'count');
    if (!countEntry) return null;
    return (
      <div style={tooltipStyle} className="px-3 py-2">
        <div style={tooltipLabelStyle}>{label}</div>
        <div style={tooltipItemStyle}>{countEntry.value} {t('dash.items')}</div>
      </div>
    );
  };

  const productsVersion = useSyncExternalStore(subscribeToProducts, getProductsVersion);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.isActive).length;
    const kits = products.filter(p => p.isKit).length;
    const byCategory = categories.map(cat => ({
      name: displaySource(cat, language),
      code: cat.code,
      color: cat.color,
      count: products.filter(p => p.category.code === cat.code).length,
    })).filter(c => c.count > 0);

    const recentProducts = [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    const supplierCounts = [
      products.filter(p => p.supplier?.code === 'A').length,
      products.filter(p => p.supplier?.code === 'W').length,
      products.filter(p => p.supplier?.code === 'AW').length,
      products.filter(p => !p.supplier || p.supplier.code === '-').length,
    ];
    const maxSupplierCount = Math.max(...supplierCounts, 1);
    const supplierStats = [
      { name: 'Angela', code: 'A', count: supplierCounts[0], color: 'var(--color-supplier-a)', maxCount: maxSupplierCount },
      { name: 'Wendy', code: 'W', count: supplierCounts[1], color: 'var(--color-supplier-w)', maxCount: maxSupplierCount },
      { name: 'Angela+Wendy', code: 'AW', count: supplierCounts[2], color: 'var(--color-supplier-aw)', maxCount: maxSupplierCount },
      { name: '—', code: '-', count: supplierCounts[3], color: 'var(--color-packaging)', maxCount: maxSupplierCount },
    ];

    return { total, active, kits, byCategory, recentProducts, supplierStats, totalCategories: categories.length };
  }, [language, productsVersion]);

  // Power distribution with values for click navigation
  const powerDistribution = useMemo(() => {
    const buckets = [
      { name: '≤20W', min: 0, max: 20 },
      { name: '21-60W', min: 21, max: 60 },
      { name: '61-100W', min: 61, max: 100 },
      { name: '>100W', min: 101, max: Infinity },
    ];
    return buckets.map(b => {
      const matching = products.filter(p => p.powerW != null && p.powerW >= b.min && p.powerW <= b.max);
      const values = [...new Set(matching.map(p => p.powerW!))].sort((a, b) => a - b);
      return { name: b.name, value: matching.length, values };
    }).filter(b => b.value > 0);
  }, [productsVersion]);

  // Length distribution with values for click navigation
  const lengthDistribution = useMemo(() => {
    const buckets = [
      { name: '≤1м', min: 0, max: 1 },
      { name: '1-2м', min: 1.1, max: 2 },
      { name: '2-3м', min: 2.1, max: 3 },
      { name: '>3м', min: 3.1, max: Infinity },
    ];
    return buckets.map(b => {
      const matching = products.filter(p => p.lengthM != null && p.lengthM >= b.min && p.lengthM <= b.max);
      const values = [...new Set(matching.map(p => p.lengthM!))].sort((a, b) => a - b);
      return { name: b.name, value: matching.length, values };
    }).filter(b => b.value > 0);
  }, [productsVersion]);

  // Color distribution (top 8 by count)
  const colorDistribution = useMemo(() => {
    return colors.map(c => ({
      name: c.name_source,
      value: products.filter(p => p.color?.code === c.code).length,
      code: c.code,
      color: c.hexValue === 'gradient' ? 'conic-gradient(in hsl longer hue, red, red)' : c.hexValue,
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [productsVersion]);

  // Current distribution based on selected metric
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
        if (typeof parsed.active === 'number' && typeof parsed.kits === 'number' && typeof parsed.categories === 'number') {
          initialRef.current = parsed;
        }
      } catch {
        /* fallthrough */
      }
    }
    if (initialRef.current === null) {
      initialRef.current = {
        active: stats.active,
        kits: stats.kits,
        categories: categories.length,
      };
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
  }, [stats]);

  const powerColors = ['var(--color-cable)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-success)'];
  const lengthColors = ['var(--color-info)', 'var(--color-accent)', 'var(--color-warning)', 'var(--color-danger)'];

  const getSliceColor = (entry: any, index: number): string => {
    if (metric === 'color') return entry?.color || 'var(--color-accent)';
    if (metric === 'length') return lengthColors[index % lengthColors.length];
    return powerColors[index % powerColors.length];
  };

  const metrics: { key: MetricKey; label: string; icon: React.ElementType }[] = [
    { key: 'power', label: t('dash.distPower'), icon: Zap },
    { key: 'length', label: t('dash.distLength'), icon: Ruler },
    { key: 'color', label: t('dash.distColor'), icon: Palette },
  ];

  const handleSliceClick = (data: { values?: number[]; code?: string }) => {
    if (!onNavigateToMatrix) return;
    if (metric === 'power' && data.values) {
      onNavigateToMatrix({ power: data.values });
    } else if (metric === 'length' && data.values) {
      onNavigateToMatrix({ length: data.values });
    } else if (metric === 'color' && data.code) {
      onNavigateToMatrix({ colors: [data.code] });
    }
  };

  const alerts = [
    { message: t('dash.alert.missing_power'), type: 'warning' },
    { message: t('dash.alert.verify_components'), type: 'info' },
    { message: t('dash.alert.template_review'), type: 'success' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats Cards + Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {[
          { key: 'active', label: t('dash.active'), icon: Hash, accent: 'var(--color-success)' },
          { key: 'kits', label: t('dash.kits'), icon: Package, accent: 'var(--color-warning)' },
          { key: 'categories', label: t('dash.categories'), icon: FileText, accent: 'var(--color-info)' },
        ].map((stat) => {
          const data = statsWithDelta[stat.key as 'active' | 'kits' | 'categories'];
          return (
            <div
              key={stat.label}
              className="glass rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-border-strong transition-all duration-300"
            >
              {/* Decorative glow */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-opacity duration-500"
                style={{ background: stat.accent }}
              />
              {/* Large decorative icon — colored, no stripe artifact */}
              <div
                className="absolute -bottom-4 -right-4 opacity-[0.09] group-hover:opacity-[0.16] transition-opacity duration-500"
                style={{ color: stat.accent }}
              >
                <stat.icon className="w-24 sm:w-28 h-24 sm:h-28" strokeWidth={1.2} />
              </div>
              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between min-h-[18px]">
                  <p className="text-[11px] sm:text-xs text-text-tertiary font-medium tracking-wide">{stat.label}</p>
                  {data.delta !== 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      data.trend === 'up'
                        ? 'text-success bg-success/10'
                        : 'text-danger bg-danger/10'
                    }`}>
                      {data.trend === 'up' ? <TrendingUp className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : <TrendingDown className="w-2.5 sm:w-3 h-2.5 sm:h-3" />}
                      {data.trend === 'up' ? `+${data.delta}` : data.delta}
                    </span>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-semibold mt-3 sm:mt-4 text-text-primary tracking-tight">
                  {data.value}
                </p>
              </div>
            </div>
          );
        })}

        {/* Quick Actions Card */}
        <div className="glass rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-border-strong transition-all duration-300 flex flex-col">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
          <div
            className="absolute -bottom-4 -right-4 opacity-[0.09] group-hover:opacity-[0.16] transition-opacity duration-500"
            style={{ color: 'var(--color-accent)' }}
          >
            <Zap className="w-24 sm:w-28 h-24 sm:h-28" strokeWidth={1.2} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <p className="text-[11px] sm:text-xs text-text-tertiary font-medium tracking-wide mb-3 sm:mb-4">{t('dash.quickActions')}</p>
            <div className="flex flex-col gap-1.5 flex-1 justify-center">
              <button
                onClick={() => onViewChange && onViewChange('sku-constructor')}
                className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors text-left cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-text-primary truncate">{t('dash.quickAddProduct')}</span>
              </button>
              <button
                onClick={() => onViewChange && onViewChange('dictionary')}
                className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors text-left cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-text-primary truncate">{t('dash.quickManageDict')}</span>
              </button>
              <button
                onClick={() => onViewChange && onViewChange('media')}
                className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-hover transition-colors text-left cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-info flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-text-primary truncate">{t('dash.quickUploadMedia')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Distribution */}
        <div
          className="glass rounded-xl p-3 sm:p-5 lg:col-span-2 overflow-hidden"
        >
          <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{t('dash.catDist')}</h3>
          <div className="pt-1 sm:pt-2">
          <div style={{ transform: 'translateX(clamp(-1rem, -0.625vw - 0.5rem, -0.5rem))' }}>
          <ChartFreeze sidebarCollapsed={sidebarCollapsed}>
          <ResponsiveContainer width="100%" height={260} debounce={16}>
            <BarChart data={stats.byCategory} barCategoryGap="20%" barGap={2} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={20}
                textAnchor="start"
                height={70}
                interval={0}
                dx={-12}
              />
              <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: 'var(--color-accent-dim)' }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value) => [value, t('dash.items')]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} onClick={(data: any) => onNavigateToMatrix?.({ categories: data?.code ? [data.code] : [] })} style={{ cursor: 'pointer' }}>
                {stats.byCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </ChartFreeze>
          </div>
          </div>
        </div>

        {/* Distribution by [metric] — pie/donut */}
        <div className="glass rounded-xl p-3 sm:p-5 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">{t('dash.distTitle')}</h3>

          {/* Metric selector */}
          <div className="flex gap-1 mb-2 sm:mb-3 overflow-x-auto scrollbar-hide">
            {metrics.map(m => {
              const Icon = m.icon;
              const active = metric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium flex-shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'bg-accent/25 text-white border border-accent/40'
                      : 'bg-bg-tertiary text-text-tertiary hover:bg-bg-hover border border-transparent'
                  }`}
                >
                  <Icon className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Donut chart with center overlay */}
          <div className="relative">
            <div className="relative z-10">
              <ChartFreeze sidebarCollapsed={sidebarCollapsed}>
                <ResponsiveContainer width="100%" height={200} debounce={16}>
                  <PieChart>
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
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getSliceColor(entry, index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ fill: 'var(--color-accent-dim)' }}
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      formatter={(value) => [value, t('dash.items')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFreeze>
            </div>
            {/* Center text overlay — sits behind chart so tooltip renders on top */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-semibold text-text-primary leading-none">
                  {distributionData.reduce((sum, d) => sum + d.value, 0)}
                </div>
                <div className="text-[9px] sm:text-[10px] text-text-tertiary uppercase tracking-wider mt-1">
                  {t('dash.items')}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {distributionData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-secondary">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: getSliceColor(d, i) }}
                />
                <span className="truncate max-w-[80px]">{d.name}</span>
                <span className="text-text-tertiary">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Products */}
        <div
          className="glass rounded-xl p-3 sm:p-5"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium">{t('dash.recent')}</h3>
            <button
              onClick={() => onViewChange && onViewChange('matrix')}
              className="h-11 sm:h-9 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-border-default cursor-pointer"
            >
              {t('dash.viewAll')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {stats.recentProducts.map((product) => {
              const Icon = categoryIcons[product.category.code] || Box;
              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="flex items-center gap-3 min-h-[44px] sm:min-h-0 p-2.5 rounded-lg hover:bg-bg-hover active:bg-bg-hover transition-colors group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${product.category.color} 8%, transparent)` }}>
                    <Icon className="w-4 h-4" style={{ color: getCategoryColorVar(product.category.code) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayProductName(product)}
                    </p>
                    <p className="text-[11px] text-text-tertiary truncate">
                      {product.sku} · {displaySource(product.model, language)}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Supplier Distribution + Alerts */}
        <div
          className="glass rounded-xl p-3 sm:p-5"
        >
          <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{t('dash.supplierDist')}</h3>
          <div className="pt-1 sm:pt-2">
          <ChartFreeze sidebarCollapsed={sidebarCollapsed}>
          <ResponsiveContainer width="100%" height={170} debounce={16}>
            <AreaChart data={stats.supplierStats}>
              <defs>
                <linearGradient id="supplierGrad" x1="0" y1="0" x2="1" y2="0">
                  {stats.supplierStats.map((entry, i) => (
                    <stop key={i} offset={`${(i / (stats.supplierStats.length - 1)) * 100}%`} stopColor={entry.color} stopOpacity={0.3} />
                  ))}
                  <stop offset="100%" stopColor={stats.supplierStats[stats.supplierStats.length - 1]?.color || 'var(--color-accent)'} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="supplierStroke" x1="0" y1="0" x2="1" y2="0">
                  {stats.supplierStats.map((entry, i) => (
                    <stop key={i} offset={`${(i / (stats.supplierStats.length - 1)) * 100}%`} stopColor={entry.color} stopOpacity={1} />
                  ))}
                  <stop offset="100%" stopColor={stats.supplierStats[stats.supplierStats.length - 1]?.color || 'var(--color-accent)'} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.4 }}
                content={<SupplierTooltip />}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#supplierStroke)"
                fill="url(#supplierGrad)"
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  if (!payload || cx == null || cy == null) return null;
                  return (
                    <g
                      key={`hit-${index}`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToMatrix?.({ suppliers: [payload.code] });
                      }}
                      onMouseEnter={() => setHoveredSupplierIndex(index)}
                      onMouseLeave={() => setHoveredSupplierIndex(prev => prev === index ? null : prev)}
                    >
                      <circle cx={cx} cy={cy} r={20} fill="transparent" />
                    </g>
                  );
                }}
                activeDot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  if (!payload || cx == null || cy == null) return null;
                  return (
                    <g
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToMatrix?.({ suppliers: [payload.code] });
                      }}
                      onMouseEnter={() => setHoveredSupplierIndex(index)}
                    >
                      <circle cx={cx} cy={cy} r={8} fill={payload.color} opacity={0.18} />
                      <circle cx={cx} cy={cy} r={3.5} fill={payload.color} />
                    </g>
                  );
                }}
              />
              {/* Wide invisible Bar — full-height click zones covering the chart */}
              <Bar
                dataKey="maxCount"
                fill="transparent"
                isAnimationActive={false}
                onClick={(data: any) => {
                  const entry = data?.payload || data;
                  if (entry?.code) onNavigateToMatrix?.({ suppliers: [entry.code] });
                }}
                onMouseEnter={(data: any) => {
                  const entry = data?.payload || data;
                  const idx = stats.supplierStats.findIndex(s => s.code === entry?.code);
                  if (idx !== -1) setHoveredSupplierIndex(idx);
                }}
                onMouseLeave={() => setHoveredSupplierIndex(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* Smooth fade highlight via Customized + framer-motion */}
              <Customized
                component={(props: any) => {
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
                }}
              />
              {/* Peak-point hit-zones — rendered AFTER the Bar so they sit on top */}
              <Customized
                component={(props: any) => {
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToMatrix?.({ suppliers: [entry.code] });
                            }}
                            onMouseEnter={() => setHoveredSupplierIndex(index)}
                            onMouseLeave={() => setHoveredSupplierIndex(prev => prev === index ? null : prev)}
                          />
                        );
                      })}
                    </g>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </ChartFreeze>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-text-secondary">{t('dash.alerts')}</h4>
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 min-h-[44px] sm:min-h-0 p-2.5 rounded-lg bg-bg-tertiary/50">
                <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${alert.type === 'warning' ? 'text-warning' : alert.type === 'info' ? 'text-info' : 'text-success'}`} />
                <span className="text-xs text-text-secondary">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailCard
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
