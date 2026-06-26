import { useState, useEffect, useMemo, useRef } from 'react';
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
import DatePicker from '@components/ui/DatePicker';

type ChartRowValue = number | string | null;
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const LINE_COLORS: Record<string, string> = {
  'WB': '#7B2FBE',
  'Ozon': '#005BFF',
  'WB КЮА': '#7B2FBE',
  'WB КАА': '#9B59B6',
  'WB ДЕВ': '#BB8FCE',
  'Ozon КЮА': '#005BFF',
  'Ozon КАА': '#3498DB',
  'Ozon БМС': '#5DADE2',
};

function fmtDate(iso: string): string {
  const d = iso.split('-');
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-1 border border-border-strong">
      <p className="text-text-secondary text-[11px]">{label ? fmtDate(label) : ''}</p>
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

function EntityToggle({ label, checked, color, onChange }: { label: string; checked: boolean; color: string; onChange: () => void }) {
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

export function AnalyticsChart({ wbNmIds, ozonSkus, startDate: propStartDate, endDate: propEndDate }: AnalyticsChartProps) {
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // ─── Local date state (initialized from props, user can change via DatePicker) ──
  const [chartStartDate, setChartStartDate] = useState(propStartDate);
  const [chartEndDate, setChartEndDate] = useState(propEndDate);
  const [appliedStartDate, setAppliedStartDate] = useState(propStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(propEndDate);

  // Sync from parent when props change (e.g. user clicked Apply in Analytics tab)
  useEffect(() => {
    setChartStartDate(propStartDate);
    setChartEndDate(propEndDate);
    setAppliedStartDate(propStartDate);
    setAppliedEndDate(propEndDate);
  }, [propStartDate, propEndDate]);

  const applyDate = () => {
    if (chartStartDate > chartEndDate) return;
    setAppliedStartDate(chartStartDate);
    setAppliedEndDate(chartEndDate);
  };

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

  // Marketplace mode data
  const [wbData, setWbData] = useState<WbTimeSeriesPoint[] | null | undefined>(undefined);
  const [ozonData, setOzonData] = useState<OzonTimeSeriesPoint[] | undefined>(undefined);

  // Entity mode data (per-entity API calls)
  const [wbEntityData, setWbEntityData] = useState<Record<string, WbTimeSeriesPoint[] | null>>({});
  const [ozonEntityData, setOzonEntityData] = useState<Record<string, OzonTimeSeriesPoint[]>>({});

  const [loading, setLoading] = useState(true);
  const [wbUpdating, setWbUpdating] = useState(false);
  const [wbError, setWbError] = useState<string | null>(null);
  const [ozonError, setOzonError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const groupBy = useMemo(() => {
    const diff = Math.round(
      (new Date(appliedEndDate + 'T00:00:00Z').getTime() - new Date(appliedStartDate + 'T00:00:00Z').getTime()) / 86400000
    );
    return diff > 60 ? 'week' : 'day';
  }, [appliedStartDate, appliedEndDate]);

  // ─── Load marketplace mode data (merged) ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setWbError(null);
      setOzonError(null);
      setWbUpdating(false);
      setWbData(undefined);
      setOzonData(undefined);

      const [wbRes, ozonRes] = await Promise.all([
        wbNmIds.length > 0
          ? fetchWbTimeSeries(undefined, wbNmIds, appliedStartDate, appliedEndDate, groupBy).catch((e) => {
              setWbError(e instanceof Error ? e.message : String(e));
              return { points: null as null, cached: false, updating: false };
            })
          : { points: null as null, cached: true, updating: false },
        ozonSkus.length > 0
          ? fetchOzonTimeSeries(undefined, ozonSkus, appliedStartDate, appliedEndDate, groupBy).catch((e) => {
              setOzonError(e instanceof Error ? e.message : String(e));
              return { points: [] as OzonTimeSeriesPoint[], cached: false };
            })
          : { points: [] as OzonTimeSeriesPoint[], cached: true },
      ]);

      if (cancelled) return;
      setWbData(wbRes.points);
      setOzonData(ozonRes.points);
      setWbUpdating(wbRes.updating ?? false);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [wbNmIds, ozonSkus, appliedStartDate, appliedEndDate, groupBy]);

  // ─── Poll for WB updates (marketplace mode) ──────────────────────
  useEffect(() => {
    if (!wbUpdating || viewMode !== 'marketplace') return;
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      if (count > 60) { clearInterval(interval); return; }
      try {
        const res = await fetchWbTimeSeries(undefined, wbNmIds, appliedStartDate, appliedEndDate, groupBy);
        if (res.points) { setWbData(res.points); setWbUpdating(false); clearInterval(interval); }
      } catch { /* */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [wbUpdating, viewMode, wbNmIds, appliedStartDate, appliedEndDate, groupBy]);

  // ─── Load entity mode data (per-entity) ───────────────────────────
  useEffect(() => {
    if (viewMode !== 'entity') return;
    let cancelled = false;

    async function loadEntity() {
      setLoading(true);
      setWbError(null);
      setOzonError(null);
      setWbEntityData({});
      setOzonEntityData({});

      const wbPromises = WB_ENTITIES.map(async (entity) => {
        if (wbNmIds.length === 0) return { entity, points: null as null, updating: false };
        try {
          const res = await fetchWbTimeSeries(entity, wbNmIds, appliedStartDate, appliedEndDate, groupBy);
          return { entity, points: res.points, updating: res.updating ?? false };
        } catch (e) {
          setWbError(e instanceof Error ? e.message : String(e));
          return { entity, points: null as null, updating: false };
        }
      });

      const ozonPromises = OZON_ENTITIES.map(async (entity) => {
        if (ozonSkus.length === 0) return { entity, points: [] as OzonTimeSeriesPoint[] };
        try {
          const res = await fetchOzonTimeSeries(entity, ozonSkus, appliedStartDate, appliedEndDate, groupBy);
          return { entity, points: res.points };
        } catch (e) {
          setOzonError(e instanceof Error ? e.message : String(e));
          return { entity, points: [] as OzonTimeSeriesPoint[] };
        }
      });

      const results = await Promise.all([...wbPromises, ...ozonPromises]);

      if (cancelled) return;
      const wbMap: Record<string, WbTimeSeriesPoint[] | null> = {};
      const ozonMap: Record<string, OzonTimeSeriesPoint[]> = {};
      let anyUpdating = false;
      for (const r of results) {
        if ('updating' in r) { wbMap[r.entity] = r.points; if (r.updating) anyUpdating = true; }
        else { ozonMap[r.entity] = r.points ?? []; }
      }
      setWbEntityData(wbMap);
      setOzonEntityData(ozonMap);
      setWbUpdating(anyUpdating);
      setLoading(false);
    }
    loadEntity();
    return () => { cancelled = true; };
  }, [viewMode, wbNmIds, ozonSkus, appliedStartDate, appliedEndDate, groupBy]);

  // ─── Poll for WB updates (entity mode) ────────────────────────────
  useEffect(() => {
    if (!wbUpdating || viewMode !== 'entity') return;
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      if (count > 60) { clearInterval(interval); return; }
      try {
        const results = await Promise.all(
          WB_ENTITIES.map(async (entity) => {
            const res = await fetchWbTimeSeries(entity, wbNmIds, appliedStartDate, appliedEndDate, groupBy);
            return { entity, points: res.points, updating: res.updating ?? false };
          })
        );
        const wbMap: Record<string, WbTimeSeriesPoint[] | null> = {};
        let anyUpdating = false;
        for (const r of results) {
          wbMap[r.entity] = r.points;
          if (r.updating) anyUpdating = true;
        }
        setWbEntityData(wbMap);
        if (!anyUpdating) { setWbUpdating(false); clearInterval(interval); }
      } catch { /* */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [wbUpdating, viewMode, wbNmIds, appliedStartDate, appliedEndDate, groupBy]);

  // ─── Build chart data ──────────────────────────────────────────────
  const chartData = useMemo(() => {
    const allDates = new Set<string>();

    if (viewMode === 'marketplace') {
      for (const p of (wbData ?? [])) allDates.add(p.date);
      for (const p of (ozonData ?? [])) allDates.add(p.date);
    } else {
      for (const entity of WB_ENTITIES) {
        for (const p of (wbEntityData[entity] ?? [])) allDates.add(p.date);
      }
      for (const entity of OZON_ENTITIES) {
        for (const p of (ozonEntityData[entity] ?? [])) allDates.add(p.date);
      }
    }

    const sorted = [...allDates].sort();

    return sorted.map((date) => {
      const row: Record<string, ChartRowValue> = { date };

      if (viewMode === 'marketplace') {
        if (showWb) {
          const p = (wbData ?? []).find((x) => x.date === date);
          row['WB'] = p ? p.metrics[metricKey] : null;
        }
        if (showOzon) {
          const p = (ozonData ?? []).find((x) => x.date === date);
          row['Ozon'] = p ? p.metrics[metricKey] : null;
        }
      } else {
        for (const entity of WB_ENTITIES) {
          if (wbEntityToggles[entity]) {
            const p = (wbEntityData[entity] ?? []).find((x) => x.date === date);
            row[`WB ${ENTITY_LABELS[entity]}`] = p ? p.metrics[metricKey] : null;
          }
        }
        for (const entity of OZON_ENTITIES) {
          if (ozonEntityToggles[entity]) {
            const p = (ozonEntityData[entity] ?? []).find((x) => x.date === date);
            row[`Ozon ${ENTITY_LABELS[entity]}`] = p ? p.metrics[metricKey] : null;
          }
        }
      }

      return row;
    });
  }, [wbData, ozonData, wbEntityData, ozonEntityData, metricKey, viewMode, showWb, showOzon, wbEntityToggles, ozonEntityToggles]);

  // ─── Active lines (only those with data) ───────────────────────────
  const lines = useMemo(() => {
    const result: Array<{ key: string; color: string }> = [];

    function hasDataForKey(key: string): boolean {
      return chartData.some((r) => r[key] != null);
    }

    if (viewMode === 'marketplace') {
      if (showWb && wbData !== null && wbData !== undefined && hasDataForKey('WB')) result.push({ key: 'WB', color: LINE_COLORS['WB'] });
      if (showOzon && hasDataForKey('Ozon')) result.push({ key: 'Ozon', color: LINE_COLORS['Ozon'] });
    } else {
      for (const entity of WB_ENTITIES) {
        if (wbEntityToggles[entity]) {
          const key = `WB ${ENTITY_LABELS[entity]}`;
          if (hasDataForKey(key)) result.push({ key, color: LINE_COLORS[key] });
        }
      }
      for (const entity of OZON_ENTITIES) {
        if (ozonEntityToggles[entity]) {
          const key = `Ozon ${ENTITY_LABELS[entity]}`;
          if (hasDataForKey(key)) result.push({ key, color: LINE_COLORS[key] });
        }
      }
    }

    return result;
  }, [viewMode, showWb, showOzon, wbEntityToggles, ozonEntityToggles, chartData, wbData]);

  const hasAnyData = chartData.length > 0 && lines.some((l) => chartData.some((r) => r[l.key] != null));

  const chartContent = (
    <div ref={containerRef} className="h-[250px] sm:h-[300px] w-full">
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
          <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-secondary)' }} />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 2, fill: l.color }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-3">
      <style>{`
        .recharts-tooltip-wrapper {
          transition: opacity 0.15s ease-out !important;
        }
      `}</style>
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

      {/* ─── DatePicker controls ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <DatePicker
          value={chartStartDate}
          onChange={setChartStartDate}
          max={chartEndDate}
          label={t('detail.analytics.period.label')}
        />
        <span className="text-text-tertiary text-xs">—</span>
        <DatePicker
          value={chartEndDate}
          onChange={setChartEndDate}
          min={chartStartDate}
          max={todayISO()}
        />
        <button
          onClick={applyDate}
          disabled={chartStartDate > chartEndDate || (chartStartDate === appliedStartDate && chartEndDate === appliedEndDate)}
          className="h-9 px-3 rounded-lg bg-accent/20 text-white text-xs font-medium border border-accent/40 hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {t('detail.analytics.period.apply')}
        </button>
      </div>

      {/* ─── Metric + View mode toggles ──────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value as MetricKey)}
          className="bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 text-[11px] sm:text-xs text-text-primary outline-none cursor-pointer"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>{t(m.i18nKey)}</option>
          ))}
        </select>

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

      {/* ─── Entity toggles ──────────────────────────────────── */}
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

      {/* ─── Error states ────────────────────────────────────── */}
      {(wbError || ozonError) && (
        <div className="space-y-1">
          {wbError && <p className="text-[10px] text-danger">WB: {wbError}</p>}
          {ozonError && <p className="text-[10px] text-danger">Ozon: {ozonError}</p>}
        </div>
      )}

      {/* ─── Chart area ──────────────────────────────────────── */}
      {loading ? (
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasAnyData && !wbUpdating ? (
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-text-muted text-xs">
          {t('detail.charts.no_data')}
        </div>
      ) : !mounted ? (
        <div className="h-[250px] sm:h-[300px]" />
      ) : (
        chartContent
      )}
    </div>
  );
}
