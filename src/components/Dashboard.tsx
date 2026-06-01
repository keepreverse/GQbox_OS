import { useMemo, useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Cable, Zap, Wifi, Car, Headphones, ArrowLeftRight, Pin,
  GripVertical, Smartphone, Package, Box, Monitor,
  TrendingUp, TrendingDown, Activity, Layers, Hash, FileText,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { products } from '../data/products';
import { categories } from '../data/dictionaries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useLayout } from '../context/LayoutContext';
import type { ViewType } from '../data/types';
import { displayProductName, displaySource, getCategoryColorVar } from '../utils/display';
import ProductDetailCard from './ProductDetailCard';
import type { ProductWithRelations } from '../data/types';

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
}

export default function Dashboard({ onViewChange }: DashboardProps) {
  const { t, language } = useLanguage();
  const { sidebarCollapsed } = useLayout();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);

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
    
    const byPower = products
      .filter(p => p.powerW && p.powerW > 0)
      .reduce((acc, p) => {
        const range = p.powerW! <= 20 ? '≤20W' : p.powerW! <= 60 ? '21-60W' : p.powerW! <= 100 ? '61-100W' : '>100W';
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const powerData = Object.entries(byPower).map(([name, value]) => ({ name, value }));
    
    const recentProducts = [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
    
    const supplierStats = [
      { name: 'Angela', count: products.filter(p => p.supplier?.code === 'A').length, color: 'var(--color-supplier-a)' },
      { name: 'Wendy', count: products.filter(p => p.supplier?.code === 'W').length, color: 'var(--color-supplier-w)' },
      { name: 'Angela+Wendy', count: products.filter(p => p.supplier?.code === 'AW').length, color: 'var(--color-supplier-aw)' },
      { name: '—', count: products.filter(p => !p.supplier || p.supplier.code === '-').length, color: 'var(--color-packaging)' },
    ];
    
    return { total, active, kits, byCategory, powerData, recentProducts, supplierStats };
  }, [language]);

  const powerColors = ['var(--color-cable)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-success)'];

  const alerts = [
    { message: language === 'ru' ? 'У 3 товаров не указана мощность' : '3 products missing power specifications', type: 'warning' },
    { message: language === 'ru' ? '2 компонента комплектов требуют проверки' : '2 kit components need verification', type: 'info' },
    { message: language === 'ru' ? 'Новый шаблон названий готов к ревью' : 'New naming template ready for review', type: 'success' },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('dash.total'), value: stats.total, icon: Layers, change: '+12', trend: 'up', color: 'text-accent', bg: 'bg-bg-tertiary' },
          { label: t('dash.active'), value: stats.active, icon: Hash, change: '+8', trend: 'up', color: 'text-success', bg: 'bg-success/10' },
          { label: t('dash.kits'), value: stats.kits, icon: Package, change: '+3', trend: 'up', color: 'text-warning', bg: 'bg-warning/10' },
          { label: t('dash.categories'), value: stats.byCategory.length, icon: FileText, change: '0', trend: 'neutral', color: 'text-info', bg: 'bg-info/10' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-xl p-3 sm:p-5 hover:border-border-strong transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${stat.color}`} />
              </div>
              <span className={`flex items-center gap-0.5 text-[10px] sm:text-xs ${stat.trend === 'up' ? 'text-success' : stat.trend === 'down' ? 'text-danger' : 'text-text-muted'}`}>
                {stat.trend === 'up' ? <TrendingUp className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : stat.trend === 'down' ? <TrendingDown className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : <TrendingUp className="w-2.5 sm:w-3 h-2.5 sm:h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-medium mt-2 sm:mt-3">{stat.value}</p>
            <p className="text-[11px] sm:text-xs text-text-tertiary mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Distribution */}
        <div
          className="glass rounded-xl p-3 sm:p-5 lg:col-span-2 overflow-hidden"
        >
          <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{t('dash.catDist')}</h3>
          <div className="pt-1 sm:pt-2">
          <ChartFreeze sidebarCollapsed={sidebarCollapsed}>
          <ResponsiveContainer width="100%" height={260} debounce={16}>
            <BarChart data={stats.byCategory} barCategoryGap="20%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={25}
                textAnchor="start"
                height={70}
                interval={0}
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
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                {stats.byCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </ChartFreeze>
          </div>
        </div>

        {/* Power Distribution */}
        <div
          className="glass rounded-xl p-3 sm:p-5"
        >
          <h3 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">{t('dash.powerDist')}</h3>
          <div className="pt-1 sm:pt-2">
          <ChartFreeze sidebarCollapsed={sidebarCollapsed}>
          <ResponsiveContainer width="100%" height={220} debounce={16}>
            <PieChart>
              <Pie
                data={stats.powerData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                stroke="transparent"
                isAnimationActive={false}
              >
                {stats.powerData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={powerColors[index % powerColors.length]} />
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
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {stats.powerData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <div className="w-2 h-2 rounded-full" style={{ background: powerColors[i] }} />
                {d.name}
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
              className="h-8 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-border-default cursor-pointer"
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
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${product.category.color} 8%, transparent)` }}>
                    <Icon className="w-4 h-4" style={{ color: getCategoryColorVar(product.category.code) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayProductName(product, language)}
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
                cursor={{ fill: 'var(--color-accent-dim)' }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => [value, t('dash.items')]}
              />
              <Area type="monotone" dataKey="count" stroke="url(#supplierStroke)" fill="url(#supplierGrad)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
          </ChartFreeze>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-text-secondary">{t('dash.alerts')}</h4>
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50">
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
