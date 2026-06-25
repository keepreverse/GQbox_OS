import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLanguage } from '@context/LanguageContext';
import { fetchOzonTimeSeries, type OzonTimeSeriesPoint } from '@api/ozonAnalytics';
import { fetchWbTimeSeries, type WbTimeSeriesPoint } from '@api/wbAnalytics';
import { ENTITY_LABELS } from '@utils/marketplace';
import type { MarketplaceEntityCode } from '@app-types';

type MetricKey = 'openCount' | 'orderCount' | 'orderSum' | 'buyoutCount';
type ViewMode = 'marketplace' | 'entity';

const METRICS: { key: MetricKey; i18nKey: string; isMoney: boolean }[] = [
  { key: 'openCount', i18nKey: 'detail.analytics.metric.open_count', isMoney: false },
  { key: 'orderCount', i18nKey: 'detail.analytics.metric.orders_count', isMoney: false },
  { key: 'orderSum', i18nKey: 'detail.analytics.metric.orders_sum', isMoney: true },
  { key: 'buyoutCount', i18nKey: 'detail.analytics.metric.buyouts_count', isMoney: false },
];

const WB_ENTITIES: MarketplaceEntityCode[] = ['kua', 'kaa', 'dev'];
const OZON_ENTITIES: MarketplaceEntityCode[] = ['kua', 'kaa', 'bms'];

const WB_COLORS: Record<string, string> = {
  kua: '#7B2FBE',
  kaa: '#9B59B6',
  dev: '#BB8FCE',
  marketplace: '#7B2FBE',
};

const OZON_COLORS: Record<string, string> = {
  kua: '#005BFF',
  kaa: '#3498DB',
  bms: '#5DADE2',
  marketplace: '#005BFF',
};

interface AnalyticsChartProps {
  wbNmIds: number[];
  ozonSkus: number[];
  startDate: string;
  endDate: string;
}

function formatChartNumber(n: number, language: 'ru' | 'en'): string {
  return Math.trunc(n).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
}

const CHART_COLORS: Record<string, string> = {
  'WB': '#7B2FBE',
  'Ozon': '#005BFF',
  'WB КЮА': '#7B2FBE',
  'WB КАА': '#9B59B6',
  'WB ДЕВ': '#BB8FCE',
  'Ozon КЮА': '#005BFF',
  'Ozon КАА': '#3498DB',
  'Ozon БМС': '#5DADE2',
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-1 border border-border-strong">
      <p className="text-text-secondary text-[11px]">{label}</p>
      {payload.map((entry) => {
        const val = entry.value ?? 0;
        return (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-text-primary">{entry.name}: <span className="font-mono">{val.toLocaleString('ru-RU')}</span></span>
          </div>
        );
      })}
    </div>
  );
}

interface EntityToggleProps {
  label: string;
  checked: boolean;
  color: string;
  onChange: () => void;
}
function EntityToggle({ label, checked, color, onChange }: EntityToggleProps) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs">
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      <span
        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
          checked ? 'border-transparent' : 'border-border-strong'
        }`}
        style={checked ? { background: color } : {}}
      >
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={checked ? 'text-text-primary' : 'text-text-muted'}>{label}</span>
    </label>
  );
}

export function AnalyticsChart({ wbNmIds, ozonSkus, startDate, endDate }: AnalyticsChartProps) {
  const { t, language } = useLanguage();
  const [metricKey, setMetricKey] = useState<MetricKey>('orderCount');
  const [viewMode, setViewMode] = useState<ViewMode>('marketplace');
  const [showWb, setShowWb] = useState(true);
  const [showOzon, setShowOzon] = useState(true);
  const [wbEntityToggles, setWbEntityToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(WB_ENTITIES.map((e) => [e, true]))
  );
  const [ozonEntityToggles, setOzonEntityToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(OZON_ENTITIES.map((e) => [e, true]))
  );
  const [wbData, setWbData] = useState<WbTimeSeriesPoint[] | null | undefined>(undefined);
  const [ozonData, setOzonData] = useState<OzonTimeSeriesPoint[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [wbUpdating, setWbUpdating] = useState(false);

  const groupBy = useMemo(() => {
    const diff = Math.round(
      (new Date(endDate + 'T00:00:00Z').getTime() - new Date(startDate + 'T00:00:00Z').getTime()) / 86400000
    );
    return diff > 60 ? 'week' : 'day';
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setWbUpdating(false);

      const [wbRes, ozonRes] = await Promise.all([
        wbNmIds.length > 0
          ? fetchWbTimeSeries(undefined, wbNmIds, startDate, endDate, groupBy)
          : Promise.resolve({ points: null as null, cached: true, updating: false }),
        ozonSkus.length > 0
          ? fetchOzonTimeSeries(undefined, ozonSkus, startDate, endDate, groupBy)
          : Promise.resolve({ points: [] as OzonTimeSeriesPoint[], cached: true }),
      ]);

      if (cancelled) return;
      setWbData(wbRes.points);
      setOzonData(ozonRes.points);
      setWbUpdating(wbRes.updating ?? false);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [wbNmIds, ozonSkus, startDate, endDate, groupBy]);

  // Poll for WB updates
  useEffect(() => {
    if (!wbUpdating) return;
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      if (count > 60) { clearInterval(interval); return; }
      try {
        const res = await fetchWbTimeSeries(undefined, wbNmIds, startDate, endDate, groupBy);
        if (res.points) { setWbData(res.points); setWbUpdating(false); clearInterval(interval); }
      } catch { /* */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [wbUpdating, wbNmIds, startDate, endDate, groupBy]);

  const chartData = useMemo(() => {
    const dateSet = new Set<string>();
    const allDates: string[] = [];

    const wbPoints = wbData ?? [];
    const ozonPoints = ozonData ?? [];

    for (const p of wbPoints) {
      if (!dateSet.has(p.date)) { dateSet.add(p.date); allDates.push(p.date); }
    }
    for (const p of ozonPoints) {
      if (!dateSet.has(p.date)) { dateSet.add(p.date); allDates.push(p.date); }
    }
    allDates.sort();

    return allDates.map((date) => {
      const row: Record<string, number | string> = { date };
      if (viewMode === 'marketplace') {
        if (showWb) {
          const wbP = wbPoints.find((p) => p.date === date);
          row['WB'] = wbP ? wbP.metrics[metricKey] : 0;
        }
        if (showOzon) {
          const ozP = ozonPoints.find((p) => p.date === date);
          row['Ozon'] = ozP ? ozP.metrics[metricKey] : 0;
        }
      } else {
        for (const entity of WB_ENTITIES) {
          if (wbEntityToggles[entity]) {
            const label = `WB ${ENTITY_LABELS[entity]}`;
            row[label] = 0;
          }
        }
        for (const entity of OZON_ENTITIES) {
          if (ozonEntityToggles[entity]) {
            const label = `Ozon ${ENTITY_LABELS[entity]}`;
            row[label] = 0;
          }
        }
        // Per-entity data not available from current API — sum all points
        if (showWb) {
          const wbP = wbPoints.find((p) => p.date === date);
          if (wbP) {
            for (const entity of WB_ENTITIES) {
              if (wbEntityToggles[entity]) row[`WB ${ENTITY_LABELS[entity]}`] = wbP.metrics[metricKey];
            }
          }
        }
        if (showOzon) {
          const ozP = ozonPoints.find((p) => p.date === date);
          if (ozP) {
            for (const entity of OZON_ENTITIES) {
              if (ozonEntityToggles[entity]) row[`Ozon ${ENTITY_LABELS[entity]}`] = ozP.metrics[metricKey];
            }
          }
        }
      }
      return row;
    });
  }, [wbData, ozonData, metricKey, viewMode, showWb, showOzon, wbEntityToggles, ozonEntityToggles]);

  const lines = useMemo(() => {
    const result: Array<{ key: string; color: string }> = [];
    if (viewMode === 'marketplace') {
      if (showWb) result.push({ key: 'WB', color: CHART_COLORS['WB'] });
      if (showOzon) result.push({ key: 'Ozon', color: CHART_COLORS['Ozon'] });
    } else {
      for (const entity of WB_ENTITIES) {
        if (wbEntityToggles[entity]) {
          const label = `WB ${ENTITY_LABELS[entity]}`;
          result.push({ key: label, color: CHART_COLORS[label as keyof typeof CHART_COLORS] });
        }
      }
      for (const entity of OZON_ENTITIES) {
        if (ozonEntityToggles[entity]) {
          const key = `Ozon ${ENTITY_LABELS[entity]}`;
          result.push({ key, color: CHART_COLORS[key] });
        }
      }
    }
    return result;
  }, [viewMode, showWb, showOzon, wbEntityToggles, ozonEntityToggles]);

  const hasAnyData = wbData || ozonData;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs sm:text-sm font-semibold text-text-primary">
          {t('detail.charts.title')}
        </h3>

        {wbUpdating && (
          <span className="text-[10px] text-warning flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            {t('detail.charts.generating')}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Metric selector */}
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value as MetricKey)}
          className="bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 text-[11px] sm:text-xs text-text-primary outline-none cursor-pointer"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>{t(m.i18nKey)}</option>
          ))}
        </select>

        {/* View mode */}
        <div className="flex bg-bg-tertiary rounded-lg p-0.5 gap-0.5 border border-border-subtle">
          <button
            className={`px-2 py-1 text-[10px] sm:text-xs rounded-md transition-colors ${
              viewMode === 'marketplace' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setViewMode('marketplace')}
          >
            {t('detail.charts.by_marketplace')}
          </button>
          <button
            className={`px-2 py-1 text-[10px] sm:text-xs rounded-md transition-colors ${
              viewMode === 'entity' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setViewMode('entity')}
          >
            {t('detail.charts.by_entity')}
          </button>
        </div>
      </div>

      {/* Toggles */}
      {viewMode === 'marketplace' ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <EntityToggle label="WB" checked={showWb} color={WB_COLORS.marketplace} onChange={() => setShowWb(!showWb)} />
          <EntityToggle label="Ozon" checked={showOzon} color={OZON_COLORS.marketplace} onChange={() => setShowOzon(!showOzon)} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">WB</span>
            {WB_ENTITIES.map((entity) => (
              <EntityToggle
                key={entity}
                label={ENTITY_LABELS[entity]}
                checked={wbEntityToggles[entity]}
                color={WB_COLORS[entity]}
                onChange={() => setWbEntityToggles((prev) => ({ ...prev, [entity]: !prev[entity] }))}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Ozon</span>
            {OZON_ENTITIES.map((entity) => (
              <EntityToggle
                key={entity}
                label={ENTITY_LABELS[entity]}
                checked={ozonEntityToggles[entity]}
                color={OZON_COLORS[entity]}
                onChange={() => setOzonEntityToggles((prev) => ({ ...prev, [entity]: !prev[entity] }))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasAnyData ? (
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-text-muted text-xs">
          {t('detail.charts.no_data')}
        </div>
      ) : (
        <div className="h-[250px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickFormatter={(v: string) => {
                  if (groupBy === 'week') return v.slice(5);
                  const d = v.split('-');
                  return `${d[2]}.${d[1]}`;
                }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatChartNumber(v, language)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}
              />
              {lines.map((l) => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 2, fill: l.color }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
