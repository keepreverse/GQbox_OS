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
  kua: '#8644B5',
  kaa: '#9B59B6',
  dev: '#BB8FCE',
  marketplace: '#8644B5',
};

const OZON_COLORS: Record<string, string> = {
  kua: '#1A79ED',
  kaa: '#3498DB',
  bms: '#5DADE2',
  marketplace: '#1A79ED',
};

interface AnalyticsChartProps {
  wbNmIds: number[];
  ozonSkus: number[];
  startDate: string;
  endDate: string;
  wbActiveEntities?: MarketplaceEntityCode[];
  ozonActiveEntities?: MarketplaceEntityCode[];
  wbEntityNmIds?: Record<string, number[]>;
}

function formatChartNumber(n: number, language: 'ru' | 'en'): string {
  return Math.trunc(n).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Извлекает код кабинета из ключа (entity или entity-N) */
function entityFromKey(key: string): string {
  const m = key.match(/^([a-z]+)/);
  return m ? m[1] : key;
}

/** Строит отображаемую подпись для линии графика */
function lineLabel(mp: string, entity: string, key: string, data: Record<string, unknown>): string {
  const count = Object.keys(data).filter((k) => k.startsWith(entity)).length;
  const base = `${mp} ${ENTITY_LABELS[entity as MarketplaceEntityCode]}`;
  if (count <= 1) return base;
  const idx = parseInt(key.split('-')[1], 10);
  return `${base} #${idx + 1}`;
}

/** Возвращает ожидаемые ключи WB-кабинетов (entity или entity-N при нескольких nmId) */
function wbDataKeys(entities: string[], nmIdsMap: Record<string, number[]>): string[] {
  const keys: string[] = [];
  for (const entity of entities) {
    const nmIds = nmIdsMap[entity] || [];
    if (nmIds.length <= 1) keys.push(entity);
    else nmIds.forEach((_, i) => keys.push(`${entity}-${i}`));
  }
  return keys;
}

/** Подпись для фильтра: "ДЕВ" или "ДЕВ #1" */
function wbToggleLabel(key: string, data: Record<string, unknown>): string {
  const entity = entityFromKey(key);
  const base = ENTITY_LABELS[entity as MarketplaceEntityCode];
  const count = Object.keys(data).filter((k) => k.startsWith(entity)).length;
  if (count <= 1) return base;
  const idx = parseInt(key.split('-')[1], 10);
  return `${base} #${idx + 1}`;
}

const LINE_COLORS: Record<string, string> = {
  'WB': '#8644B5',
  'Ozon': '#1A79ED',
  'WB КЮА': '#8644B5',
  'WB КАА': '#9B59B6',
  'WB ДЕВ': '#BB8FCE',
  'Ozon КЮА': '#1A79ED',
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

export function AnalyticsChart({ wbNmIds, ozonSkus, startDate: propStartDate, endDate: propEndDate, wbActiveEntities: wbActiveEntitiesProp, ozonActiveEntities: ozonActiveEntitiesProp, wbEntityNmIds: wbEntityNmIdsProp }: AnalyticsChartProps) {
  const { t, language } = useLanguage();


  // Активные кабинеты для текущей карточки (только те, что есть в товаре)
  const wbActiveEntities = useMemo(() => wbActiveEntitiesProp ?? WB_ENTITIES, [wbActiveEntitiesProp]);
  const ozonActiveEntities = useMemo(() => ozonActiveEntitiesProp ?? OZON_ENTITIES, [ozonActiveEntitiesProp]);
  const hasBothMarketplaces = wbActiveEntities.length > 0 && ozonActiveEntities.length > 0;
  const wbEntityNmIds = useMemo(() => wbEntityNmIdsProp ?? {}, [wbEntityNmIdsProp]);
  const totalActiveEntities = wbActiveEntities.length + ozonActiveEntities.length;
  // Переключатель МП/кабинет имеет смысл, только когда хотя бы у одного МП больше одного кабинета
  const canToggleViewMode = hasBothMarketplaces && (wbActiveEntities.length > 1 || ozonActiveEntities.length > 1);

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
    try { sessionStorage.setItem('analyticsPeriod', JSON.stringify({ start: chartStartDate, end: chartEndDate })); } catch { /* ignore */ }
  };

  const [metricKey, setMetricKey] = useState<MetricKey>('orderCount');
  const [viewMode, setViewMode] = useState<ViewMode>('entity');
  const [showWb, setShowWb] = useState(true);
  const [showOzon, setShowOzon] = useState(true);
  const [wbEntityToggles, setWbEntityToggles] = useState<Record<string, boolean>>(
    () => { const init: Record<string, boolean> = {}; for (const k of wbDataKeys(wbActiveEntities, wbEntityNmIds)) init[k] = true; return init; }
  );
  const [ozonEntityToggles, setOzonEntityToggles] = useState<Record<string, boolean>>(
    () => { const init: Record<string, boolean> = {}; for (const e of ozonActiveEntities) init[e] = true; return init; }
  );

  const wbEntityKeys = useMemo(
    () => wbDataKeys(wbActiveEntities, wbEntityNmIds),
    [wbActiveEntities, wbEntityNmIds]
  );
  // Пока не загрузились данные — используем для подписей ожидаемые ключи
  const wbToggleData = useMemo(() => {
    const d: Record<string, null> = {};
    for (const k of wbEntityKeys) d[k] = null;
    return d;
  }, [wbEntityKeys]);

  // Синхронизируем toggles при смене активных кабинетов
  useEffect(() => {
    setWbEntityToggles((prev) => {
      const next: Record<string, boolean> = {};
      for (const key of wbEntityKeys) next[key] = key in prev ? prev[key] : true;
      return next;
    });
  }, [wbEntityKeys]);
  useEffect(() => {
    setOzonEntityToggles((prev) => {
      const next = { ...prev };
      for (const e of ozonActiveEntities) { if (!(e in next)) next[e] = true; }
      for (const e of Object.keys(next)) { if (!ozonActiveEntities.includes(e as MarketplaceEntityCode)) delete next[e]; }
      return next;
    });
  }, [ozonActiveEntities]);

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

  // ─── Load entity mode data (per-SKU) ─────────────────────────────

  /** Строит массив промисов для WB: по одному на nmId, если их несколько на кабинет */
  function buildWbEntityPromises(entity: string) {
    const nmIds = wbEntityNmIds[entity] || wbNmIds;
    if (nmIds.length === 0) return Promise.resolve([]);
    return Promise.all(
      nmIds.map((nmId, idx) =>
        fetchWbTimeSeries(entity, [nmId], appliedStartDate, appliedEndDate, groupBy)
          .then((res) => ({ entity, idx, points: res.points, updating: res.updating ?? false }))
          .catch((e) => {
            setWbError(e instanceof Error ? e.message : String(e));
            return { entity, idx, points: null as null, updating: false };
          })
      )
    );
  }

  function wbEntityKey(entity: string, idx: number, total: number): string {
    return total <= 1 ? entity : `${entity}-${idx}`;
  }

  useEffect(() => {
    if (viewMode !== 'entity') return;
    let cancelled = false;

    async function loadEntity() {
      setLoading(true);
      setWbError(null);
      setOzonError(null);
      setWbEntityData({});
      setOzonEntityData({});

      const wbPromises = wbActiveEntities.map(async (entity) => {
        const results = await buildWbEntityPromises(entity);
        return results.map((r) => ({
          key: wbEntityKey(entity, r.idx, results.length),
          points: r.points,
          updating: r.updating,
        }));
      });

      const ozonPromises = ozonActiveEntities.map(async (entity) => {
        if (ozonSkus.length === 0) return [{ key: entity, points: [] as OzonTimeSeriesPoint[] }];
        try {
          const res = await fetchOzonTimeSeries(entity, ozonSkus, appliedStartDate, appliedEndDate, groupBy);
          return [{ key: entity, points: res.points ?? [] }];
        } catch (e) {
          setOzonError(e instanceof Error ? e.message : String(e));
          return [{ key: entity, points: [] as OzonTimeSeriesPoint[] }];
        }
      });

      const [wbResults, ozonResults] = await Promise.all([
        Promise.all(wbPromises),
        Promise.all(ozonPromises),
      ]);

      if (cancelled) return;
      const wbMap: Record<string, WbTimeSeriesPoint[] | null> = {};
      const ozonMap: Record<string, OzonTimeSeriesPoint[]> = {};
      let anyUpdating = false;
      for (const group of wbResults) {
        for (const r of group) { wbMap[r.key] = r.points as WbTimeSeriesPoint[] | null; if (r.updating) anyUpdating = true; }
      }
      for (const group of ozonResults) {
        for (const r of group) { ozonMap[r.key] = r.points; }
      }
      setWbEntityData(wbMap);
      setOzonEntityData(ozonMap);
      setWbUpdating(anyUpdating);
      setLoading(false);
    }
    loadEntity();
    return () => { cancelled = true; };
  }, [viewMode, wbNmIds, ozonSkus, appliedStartDate, appliedEndDate, groupBy, wbActiveEntities, ozonActiveEntities, wbEntityNmIds]);

  // ─── Poll for WB updates (entity mode) ────────────────────────────
  useEffect(() => {
    if (!wbUpdating || viewMode !== 'entity') return;
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      if (count > 60) { clearInterval(interval); return; }
      try {
        const results = await Promise.all(
          wbActiveEntities.map(async (entity) => ({
            entity,
            items: await buildWbEntityPromises(entity),
          }))
        );
        const wbMap: Record<string, WbTimeSeriesPoint[] | null> = {};
        let anyUpdating = false;
        for (const { entity, items } of results) {
          for (const r of items) {
            const key = wbEntityKey(entity, r.idx, items.length);
            wbMap[key] = r.points as WbTimeSeriesPoint[] | null;
            if (r.updating) anyUpdating = true;
          }
        }
        setWbEntityData(wbMap);
        if (!anyUpdating) { setWbUpdating(false); clearInterval(interval); }
      } catch { /* */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [wbUpdating, viewMode, wbNmIds, appliedStartDate, appliedEndDate, groupBy, wbActiveEntities, wbEntityNmIds]);

  // ─── Build chart data ──────────────────────────────────────────────
  const chartData = useMemo(() => {
    const allDates = new Set<string>();

    if (viewMode === 'marketplace') {
      for (const p of (wbData ?? [])) allDates.add(p.date);
      for (const p of (ozonData ?? [])) allDates.add(p.date);
    } else {
      for (const key of Object.keys(wbEntityData)) {
        for (const p of (wbEntityData[key] ?? [])) allDates.add(p.date);
      }
      for (const key of Object.keys(ozonEntityData)) {
        for (const p of (ozonEntityData[key] ?? [])) allDates.add(p.date);
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
        for (const key of wbEntityKeys) {
          if (wbEntityToggles[key]) {
            const p = (wbEntityData[key] ?? []).find((x) => x.date === date);
            if (p) row[lineLabel('WB', entityFromKey(key), key, wbEntityData)] = p.metrics[metricKey];
          }
        }
        for (const key of Object.keys(ozonEntityData)) {
          const entity = entityFromKey(key);
          if (ozonEntityToggles[entity]) {
            const p = (ozonEntityData[key] ?? []).find((x) => x.date === date);
            if (p) row[`Ozon ${ENTITY_LABELS[entity as MarketplaceEntityCode]}`] = p.metrics[metricKey];
          }
        }
      }

      return row;
    });
  }, [wbData, ozonData, wbEntityData, ozonEntityData, metricKey, viewMode, showWb, showOzon, wbEntityToggles, ozonEntityToggles, wbEntityKeys]);

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
      for (const key of wbEntityKeys) {
        if (wbEntityToggles[key]) {
          const entity = entityFromKey(key);
          const label = lineLabel('WB', entity, key, wbEntityData);
          if (hasDataForKey(label)) result.push({ key: label, color: LINE_COLORS[label] ?? LINE_COLORS[`WB ${ENTITY_LABELS[entity as MarketplaceEntityCode]}`] });
        }
      }
      for (const key of Object.keys(ozonEntityData)) {
        const entity = entityFromKey(key);
        if (ozonEntityToggles[entity]) {
          const label = `Ozon ${ENTITY_LABELS[entity as MarketplaceEntityCode]}`;
          if (hasDataForKey(label)) result.push({ key: label, color: LINE_COLORS[label] });
        }
      }
    }

    return result;
  }, [viewMode, showWb, showOzon, wbEntityToggles, ozonEntityToggles, chartData, wbData, wbEntityKeys]);

  const hasAnyData = chartData.length > 0 && lines.some((l) => chartData.some((r) => r[l.key] != null));

  const chartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
          tickLine={{ stroke: 'var(--color-border-subtle)' }}
          axisLine={{ stroke: 'var(--color-border-subtle)' }}
          tickFormatter={(v: string) => {
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

      {totalActiveEntities > 1 && (
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

          {canToggleViewMode && (
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
          )}
        </div>
      )}

      {/* ─── Entity toggles ──────────────────────────────────── */}
      {totalActiveEntities > 1 && canToggleViewMode && viewMode === 'marketplace' ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">МП</span>
          <EntityToggle label="WB" checked={showWb} color={WB_COLORS.marketplace} onChange={() => setShowWb(!showWb)} />
          <EntityToggle label="Ozon" checked={showOzon} color={OZON_COLORS.marketplace} onChange={() => setShowOzon(!showOzon)} />
        </div>
      ) : totalActiveEntities > 1 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {wbActiveEntities.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">WB</span>
              {wbEntityKeys.map((key) => {
                const entity = entityFromKey(key);
                return (
                  <EntityToggle
                    key={key}
                    label={wbToggleLabel(key, wbToggleData)}
                    checked={!!wbEntityToggles[key]}
                    color={WB_COLORS[entity]}
                    onChange={() => setWbEntityToggles((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                );
              })}
            </div>
          )}
          {ozonActiveEntities.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Ozon</span>
              {ozonActiveEntities.map((entity) => (
                <EntityToggle
                  key={entity}
                  label={ENTITY_LABELS[entity]}
                  checked={!!ozonEntityToggles[entity]}
                  color={OZON_COLORS[entity]}
                  onChange={() => setOzonEntityToggles((prev) => ({ ...prev, [entity]: !prev[entity] }))}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ─── Error states ────────────────────────────────────── */}
      {(wbError || ozonError) && (
        <div className="space-y-1">
          {wbError && <p className="text-[10px] text-danger">WB: {wbError}</p>}
          {ozonError && <p className="text-[10px] text-danger">Ozon: {ozonError}</p>}
        </div>
      )}

      {/* ─── Chart area ──────────────────────────────────────── */}
      <div ref={containerRef} className="h-[250px] sm:h-[300px] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasAnyData && !wbUpdating ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            {t('detail.charts.no_data')}
          </div>
        ) : (
          chartContent
        )}
      </div>
    </div>
  );
}
