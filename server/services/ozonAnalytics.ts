// ─── Ozon Analytics Service (multi-entity, daily cache) ────────────────────
// Прокси к Ozon Seller API /v1/analytics/data с daily-кэшем.
//
// Ключевое отличие от WB: Ozon API возвращает данные по ВСЕМ SKU продавца,
// а rate limit = 1 запрос/мин. Чтобы любой период возвращался мгновенно,
// мы кэшируем ДНЕВНЫЕ данные (dimension: ["sku", "day"]) и агрегируем
// произвольный период из кэша. Warmup: 30 дней × 30 SKU = 900 строк < 1000
// → 1 API call для selected + 1 для past = 2 запроса за 120с.
// После warmup любой период в пределах 60 дней — мгновенно из кэша.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { RawProduct, MarketplaceEntityCode } from '../types';
import { saveCache, loadCache, saveRefreshTimestamp, loadRefreshTimestamp, deleteRefreshTimestamp, deleteServiceCache } from './cacheStore';
import { fetchPerformanceStats } from './ozonPerformance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OZON_API_URL = 'https://api-seller.ozon.ru/v1/analytics/data';
const MIN_INTERVAL_MS = 60_000;
const DAILY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SERVICE_NAME = 'ozon-analytics';
const PERIOD_CACHE_NAME = 'ozon-analytics-period';
const CACHE_WINDOW_DAYS = 365;
const CHUNK_DAYS = 30;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

const ENTITY_ORDER: MarketplaceEntityCode[] = ['kua', 'kaa', 'bms'];

interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

function getCredentialsForEntity(entity: MarketplaceEntityCode): OzonCredentials | null {
  const clientId = process.env[`OZON_CLIENT_ID_${entity.toUpperCase()}`] ||
    (entity === 'kua' ? process.env.OZON_CLIENT_ID : '') || '';
  const apiKey = process.env[`OZON_API_KEY_${entity.toUpperCase()}`] ||
    (entity === 'kua' ? process.env.OZON_API_KEY : '') || '';
  if (!clientId || !apiKey) return null;
  return { clientId, apiKey };
}

function getConfiguredEntities(): MarketplaceEntityCode[] {
  return ENTITY_ORDER.filter((e) => getCredentialsForEntity(e) !== null);
}

// ─── Типы ответа Ozon (нормализованные) ──────────────────────────────────

export interface OzonArticleMetrics {
  sku: number;
  selected: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
    hitsViewSearch: number;
    paidClicks: number;
    paidViews: number;
  };
  past: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
    hitsViewSearch: number;
    paidClicks: number;
    paidViews: number;
  };
  dynamics: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
    hitsViewSearch: number;
    paidClicks: number;
    paidViews: number;
  };
}

export interface OzonAnalyticsResponse {
  currency: string;
  articles: OzonArticleMetrics[];
  cached: boolean;
  updating?: boolean;
}

// ─── Time Series types ────────────────────────────────────────────────────

export interface OzonTimeSeriesPoint {
  date: string;
  metrics: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
}

export interface OzonTimeSeriesResponse {
  points: OzonTimeSeriesPoint[];
  cached: boolean;
}

export class OzonAnalyticsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'OzonAnalyticsError';
    this.status = status;
  }
}

// ─── Хелперы дат ────────────────────────────────────────────────────────────

function diffDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z').getTime();
  const e = new Date(end + 'T00:00:00Z').getTime();
  return Math.round((e - s) / 86400000);
}

function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function computePastPeriod(start: string, end: string): { start: string; end: string } {
  const len = diffDays(start, end);
  return {
    start: shiftDate(start, -(len + 1)),
    end: shiftDate(start, -1),
  };
}

/** Возвращает массив всех дат от start до end включительно. */
function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  let d = start;
  while (d <= end) {
    result.push(d);
    d = shiftDate(d, 1);
  }
  return result;
}

// ─── sku → entity из products.json ─────────────────────────────────────────

function readOzonSkuToEntityMap(): Map<number, MarketplaceEntityCode> {
  const productsPath = resolve(__dirname, '..', 'data', 'products.json');
  try {
    const raw = readFileSync(productsPath, 'utf-8');
    if (!raw.trim()) return new Map();
    const products = JSON.parse(raw) as RawProduct[];
    const map = new Map<number, MarketplaceEntityCode>();
    for (const p of products) {
      if (!p.marketplaceSkus) continue;
      for (const s of p.marketplaceSkus) {
        if (s.marketplace === 'ozon' && s.kind === 'single') {
          const n = parseInt(s.article, 10);
          if (Number.isFinite(n) && n > 0) map.set(n, s.entity);
        }
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function groupSkusByEntity(skus: number[]): Map<MarketplaceEntityCode, number[]> {
  const skuToEntity = readOzonSkuToEntityMap();
  const groups = new Map<MarketplaceEntityCode, number[]>();
  for (const sku of skus) {
    const entity = skuToEntity.get(sku);
    if (!entity) continue;
    let arr = groups.get(entity);
    if (!arr) {
      arr = [];
      groups.set(entity, arr);
    }
    arr.push(sku);
  }
  return groups;
}

function readEntitySkusFromJson(entity: MarketplaceEntityCode): number[] {
  const skuToEntity = readOzonSkuToEntityMap();
  const result: number[] = [];
  for (const [sku, ent] of skuToEntity) {
    if (ent === entity) result.push(sku);
  }
  return result.sort((a, b) => a - b);
}

// ─── Per-entity service ───────────────────────────────────────────────────

interface DailyMetrics {
  openCount: number;
  orderCount: number;
  orderSum: number;
  buyoutCount: number;
  searchImpressions: number;
}

interface DailyCacheEntry {
  article: { sku: number; selected: DailyMetrics };
  expiresAt: number;
}

interface CacheEntry {
  article: OzonArticleMetrics;
  expiresAt: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

class OzonEntityAnalyticsService {
  private entity: MarketplaceEntityCode;
  private credentials: OzonCredentials;
  /** Daily cache: Map<sku, Map<dateISO, {article, expiresAt}>> */
  private dailyCache: Map<number, Map<string, DailyCacheEntry>>;
  /** Period cache: Map<sku, Map<periodKey, CacheEntry>> (fallback для больших периодов) */
  private periodCache: Map<number, Map<string, CacheEntry>>;
  private lastRequestAt: number;
  private warmupInProgress: boolean;
  private backgroundQueue: Array<{ start: string; end: string }>;
  private backgroundRunning: boolean;
  private backgroundPendingRanges: Set<string>;
  private dailyCacheDirty: boolean;
  private dailyCacheSaveTimer: ReturnType<typeof setTimeout> | null;

  constructor(entity: MarketplaceEntityCode, credentials: OzonCredentials) {
    this.entity = entity;
    this.credentials = credentials;
    this.dailyCache = new Map();
    this.periodCache = new Map();
    this.lastRequestAt = 0;
    this.warmupInProgress = false;
    this.backgroundQueue = [];
    this.backgroundRunning = false;
    this.backgroundPendingRanges = new Set();
    this.dailyCacheDirty = false;
    this.dailyCacheSaveTimer = null;

    const skus = readEntitySkusFromJson(entity);
    const loaded = loadCache(SERVICE_NAME, entity, skus);
    if (loaded.size > 0) {
      this.dailyCache = loaded as Map<number, Map<string, DailyCacheEntry>>;
      // Продлеваем TTL для всех загруженных записей (переживает рестарт)
      const now = Date.now();
      for (const byDate of this.dailyCache.values()) {
        for (const entry of byDate.values()) {
          if (entry.expiresAt <= now) continue;
          entry.expiresAt = now + DAILY_CACHE_TTL_MS;
        }
      }
      // Clean up old period-based entries (key contains "|") from previous format
      let removed = 0;
      for (const byDate of this.dailyCache.values()) {
        for (const key of [...byDate.keys()]) {
          if (key.includes('|')) { byDate.delete(key); removed++; }
        }
      }
      const totalEntries = [...this.dailyCache.values()].reduce((s, m) => s + m.size, 0);
      console.log(`[ozon-analytics:${entity}] loaded: ${this.dailyCache.size} SKUs / ${totalEntries} daily entries`);
    }

    // Load period cache
    const periodLoaded = loadCache(PERIOD_CACHE_NAME, entity, skus);
    if (periodLoaded.size > 0) {
      this.periodCache = periodLoaded as Map<number, Map<string, CacheEntry>>;
    }
  }

  // ─── Daily cache helpers ─────────────────────────────────────────────

  private getDailyMetrics(sku: number, date: string): DailyMetrics | null {
    const byDate = this.dailyCache.get(sku);
    if (!byDate) return null;
    const entry = byDate.get(date);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) byDate.delete(date);
      return null;
    }
    return entry.article.selected;
  }

  private setDailyMetrics(sku: number, date: string, metrics: DailyMetrics): void {
    let byDate = this.dailyCache.get(sku);
    if (!byDate) {
      byDate = new Map();
      this.dailyCache.set(sku, byDate);
    }
    byDate.set(date, {
      article: { sku, selected: metrics },
      expiresAt: Date.now() + DAILY_CACHE_TTL_MS,
    });
    this.markDailyCacheDirty();
  }

  private markDailyCacheDirty(): void {
    if (this.dailyCacheDirty) return;
    this.dailyCacheDirty = true;
    if (this.dailyCacheSaveTimer) clearTimeout(this.dailyCacheSaveTimer);
    this.dailyCacheSaveTimer = setTimeout(() => {
      this.persistCache();
      this.dailyCacheDirty = false;
      this.dailyCacheSaveTimer = null;
    }, 3_000);
  }

  private persistCache(): void {
    saveCache(SERVICE_NAME, this.entity, this.dailyCache);
    saveCache(PERIOD_CACHE_NAME, this.entity, this.periodCache);
  }

  /** Полностью очищает кэш в памяти и на диске. */
  public clearAllCache(): void {
    this.dailyCache.clear();
    this.periodCache.clear();
    deleteServiceCache(SERVICE_NAME, this.entity);
    deleteServiceCache(PERIOD_CACHE_NAME, this.entity);
  }

  // ─── Period cache helpers ───────────────────────────────────────────

  private getPeriodArticle(sku: number, key: string): OzonArticleMetrics | null {
    const byPeriod = this.periodCache.get(sku);
    if (!byPeriod) return null;
    const entry = byPeriod.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) byPeriod.delete(key);
      return null;
    }
    return entry.article;
  }

  /** Проверяет, все ли SKU имеют данные для указанного периода в period cache. */
  private periodCacheCovers(skus: number[], key: string): boolean {
    return skus.every((sku) => this.getPeriodArticle(sku, key) !== null);
  }
  // ─── Агрегация из daily cache ────────────────────────────────────────

  /**
   * Агрегирует метрики из daily cache для запрошенного периода.
   * Возвращает articles и список отсутствующих дат (для background refresh).
   */
  private aggregateFromDailyCache(
    skus: number[],
    start: string,
    end: string
  ): { articles: OzonArticleMetrics[]; missingDates: string[] } {
    const dates = dateRange(start, end);
    const missingDatesSet = new Set<string>();
    const articles: OzonArticleMetrics[] = [];

    for (const sku of skus) {
      const daily: DailyMetrics = { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0, searchImpressions: 0 };
      let hasAllDays = true;

      for (const date of dates) {
        const m = this.getDailyMetrics(sku, date);
        if (m) {
          daily.openCount += m.openCount;
          daily.orderCount += m.orderCount;
          daily.orderSum += m.orderSum;
          daily.buyoutCount += m.buyoutCount;
          daily.searchImpressions += m.searchImpressions ?? 0;
        } else {
          hasAllDays = false;
          missingDatesSet.add(date);
        }
      }

      if (hasAllDays) {
        // Вычисляем past period из daily cache
        const past = computePastPeriod(start, end);
        const pastDates = dateRange(past.start, past.end);
        const pastDaily: DailyMetrics = { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0, searchImpressions: 0 };
        let hasAllPastDays = true;
        for (const date of pastDates) {
          const m = this.getDailyMetrics(sku, date);
          if (m) {
            pastDaily.openCount += m.openCount;
            pastDaily.orderCount += m.orderCount;
            pastDaily.orderSum += m.orderSum;
            pastDaily.buyoutCount += m.buyoutCount;
            pastDaily.searchImpressions += m.searchImpressions ?? 0;
          } else {
            hasAllPastDays = false;
          }
        }

        const dyn = (sel: number, p: number) => p > 0 ? Math.round(((sel - p) / p) * 100) : 0;
        articles.push({
          sku,
          selected: {
            openCount: daily.openCount,
            orderCount: daily.orderCount,
            orderSum: daily.orderSum,
            buyoutCount: daily.buyoutCount,
            hitsViewSearch: daily.searchImpressions,
            paidClicks: 0,
            paidViews: 0,
          },
          past: hasAllPastDays ? {
            openCount: pastDaily.openCount,
            orderCount: pastDaily.orderCount,
            orderSum: pastDaily.orderSum,
            buyoutCount: pastDaily.buyoutCount,
            hitsViewSearch: pastDaily.searchImpressions,
            paidClicks: 0,
            paidViews: 0,
          } : {
            openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0,
            hitsViewSearch: 0, paidClicks: 0, paidViews: 0,
          },
          dynamics: hasAllPastDays ? {
            openCount: dyn(daily.openCount, pastDaily.openCount),
            orderCount: dyn(daily.orderCount, pastDaily.orderCount),
            orderSum: dyn(daily.orderSum, pastDaily.orderSum),
            buyoutCount: dyn(daily.buyoutCount, pastDaily.buyoutCount),
            hitsViewSearch: 0, paidClicks: 0, paidViews: 0,
          } : {
            openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0,
            hitsViewSearch: 0, paidClicks: 0, paidViews: 0,
          },
        });
      }
    }

    return { articles, missingDates: [...missingDatesSet] };
  }

  // ─── Time series (графики) ─────────────────────────────────────────────

  private getDailyTimeSeries(
    skus: number[],
    start: string,
    end: string,
    groupBy: 'day' | 'week'
  ): { points: OzonTimeSeriesPoint[]; missingDates: string[] } {
    const dates = dateRange(start, end);
    const missingDatesSet = new Set<string>();

    // Sum metrics across all requested SKUs per date
    const dateMap = new Map<string, { openCount: number; orderCount: number; orderSum: number; buyoutCount: number }>();

    for (const date of dates) {
      let hasData = false;
      let open = 0, orders = 0, sum = 0, buyouts = 0;

      for (const sku of skus) {
        const m = this.getDailyMetrics(sku, date);
        if (m) {
          open += m.openCount;
          orders += m.orderCount;
          sum += m.orderSum;
          buyouts += m.buyoutCount;
          hasData = true;
        }
      }

      if (!hasData) {
        missingDatesSet.add(date);
        continue;
      }

      dateMap.set(date, { openCount: open, orderCount: orders, orderSum: sum, buyoutCount: buyouts });
    }

    // Group by week if needed
    if (groupBy === 'week') {
      const weekMap = new Map<string, { openCount: number; orderCount: number; orderSum: number; buyoutCount: number }>();
      for (const [date, m] of dateMap) {
        const d = new Date(date + 'T00:00:00Z');
        const dayOfWeek = d.getUTCDay();
        const monday = new Date(d);
        monday.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7));
        const weekKey = monday.toISOString().slice(0, 10);
        const existing = weekMap.get(weekKey) || { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 };
        existing.openCount += m.openCount;
        existing.orderCount += m.orderCount;
        existing.orderSum += m.orderSum;
        existing.buyoutCount += m.buyoutCount;
        weekMap.set(weekKey, existing);
      }
      return {
        points: [...weekMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, metrics]) => ({ date, metrics })),
        missingDates: [...missingDatesSet],
      };
    }

    return {
      points: [...dateMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, metrics]) => ({ date, metrics })),
      missingDates: [...missingDatesSet],
    };
  }

  public async getTimeSeries(
    skus: number[],
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week'
  ): Promise<{ points: OzonTimeSeriesPoint[]; cached: boolean; updating: boolean }> {
    if (skus.length === 0) {
      return { points: [], cached: false, updating: false };
    }

    const { points, missingDates } = this.getDailyTimeSeries(skus, startDate, endDate, groupBy);

    const hasAll = missingDates.length === 0;
    if (!hasAll && !this.warmupInProgress) {
      // Schedule background fetch for missing dates
      const ranges = this.splitIntoChunks(startDate, endDate, CHUNK_DAYS);
      for (const chunk of ranges) {
        const rangeKey = `${chunk.start}|${chunk.end}`;
        if (!this.backgroundPendingRanges.has(rangeKey)) {
          this.backgroundPendingRanges.add(rangeKey);
          this.backgroundQueue.push({ start: chunk.start, end: chunk.end });
        }
      }
      this.processBackgroundQueue();
    }

    return {
      points,
      cached: hasAll,
      updating: !hasAll && (this.warmupInProgress || this.backgroundPendingRanges.size > 0),
    };
  }

  // ─── API request: daily data ─────────────────────────────────────────

  /**
   * Запрашивает дневные данные за период и сохраняет в dailyCache.
   * dimension: ["sku", "day"] → один запрос покрывает все SKU и все дни.
   */
  private async fetchDailyData(dateFrom: string, dateTo: string): Promise<number> {
    let offset = 0;
    let totalRows = 0;

    for (;;) {
      const body = JSON.stringify({
        date_from: dateFrom,
        date_to: dateTo,
        metrics: ['hits_view_pdp', 'ordered_units', 'revenue', 'delivered_units', 'hits_view_search'],
        dimension: ['sku', 'day'],
        limit: 1000,
        offset,
      });

      const elapsed = Date.now() - this.lastRequestAt;
      if (elapsed < MIN_INTERVAL_MS) {
        await sleep(MIN_INTERVAL_MS - elapsed);
      }

      let res: Response;
      try {
        res = await fetch(OZON_API_URL, {
          method: 'POST',
          headers: {
            'Client-Id': this.credentials.clientId,
            'Api-Key': this.credentials.apiKey,
            'Content-Type': 'application/json',
          },
          body,
        });
      } catch (err) {
        throw new OzonAnalyticsError(
          `Не удалось связаться с Ozon API: ${err instanceof Error ? err.message : String(err)}`,
          502
        );
      }
      this.lastRequestAt = Date.now();

      if (!res.ok) {
        let errBody: { message?: string; code?: number } | null = null;
        try {
          errBody = (await res.json()) as { message?: string; code?: number };
        } catch { /* ignore */ }
        const errMsg = errBody?.message || '';
        const errCode = errBody?.code;

        // TooManySimultaneousQueries — transient, preserve message for retry
        if (errMsg.includes('Too many simultaneous queries')) {
          const msg = `${typeof errCode === 'number' ? `code: ${errCode}, ` : ''}message: ${errMsg}`;
          throw new OzonAnalyticsError(msg, 202);
        }

        if (res.status === 429) {
          throw new OzonAnalyticsError(`Ozon API rate limited (429)`, 429);
        }

        const detail = errMsg || `Ozon API [${this.entity}] вернул ${res.status}`;
        throw new OzonAnalyticsError(detail, res.status);
      }

      const raw = (await res.json()) as {
        result?: { data?: Array<{ dimensions: Array<{ id: string; name: string }>; metrics: number[] }> };
        error?: { message?: string; code?: number };
      };

      if (raw.error?.message) {
        // error может быть как { code: 202, message: "..." } так и { message: "code: 202, ..." }
        const errMsg = `${typeof raw.error.code === 'number' ? `code: ${raw.error.code}, ` : ''}message: ${raw.error.message}`;
        if (raw.error.message.includes('Too many simultaneous queries')) {
          throw new OzonAnalyticsError(errMsg, 202);
        }
        throw new OzonAnalyticsError(errMsg, 400);
      }

      const data = raw.result?.data ?? [];
      if (data.length === 0) break;

      for (const row of data) {
        // dimensions: [{id: "sku", name: "..."}, {id: "date", name: "YYYY-MM-DD"}]
        const sku = parseInt(row.dimensions?.[0]?.id, 10);
        const date = row.dimensions?.[1]?.id;
        if (!Number.isFinite(sku) || sku <= 0 || !date) continue;
        if (!Array.isArray(row.metrics) || row.metrics.length < 4) continue;
        this.setDailyMetrics(sku, date, {
          openCount: row.metrics[0] ?? 0,
          orderCount: row.metrics[1] ?? 0,
          orderSum: Math.round((row.metrics[2] ?? 0) * 100) / 100,
          buyoutCount: row.metrics[3] ?? 0,
          searchImpressions: row.metrics[4] ?? 0,
        });
      }

      totalRows += data.length;
      if (data.length < 1000) break;
      offset += 1000;
    }

    return totalRows;
  }

  // ─── Warmup и итеративный fetch ────────────────────────────────────
  // Стратегия: покрыть 365 дней итеративно по 30 дней за раз.
  // Каждые 60с (rate limit) получаем 1 API call = 30 дней.
  // За 12 итераций = 12 минут покрываем год.
  // Данные из каждого батча сразу доступны пользователю.

  /** Возвращает массив непокрытых диапазонов в окне CACHE_WINDOW_DAYS, начиная с самых свежих. */
  private getMissingDateRanges(today: string, windowDays: number = CACHE_WINDOW_DAYS): Array<{ start: string; end: string }> {
    const skus = readEntitySkusFromJson(this.entity);
    if (skus.length === 0) return [];
    const sampleSku = skus[0];

    const allDates = dateRange(shiftDate(today, -(windowDays - 1)), today);
    const missing = allDates.filter((d) => this.getDailyMetrics(sampleSku, d) === null);
    if (missing.length === 0) return [];

    // Группируем пропущенные даты в непрерывные диапазоны
    const ranges: Array<{ start: string; end: string }> = [];
    let i = 0;
    while (i < missing.length) {
      const start = missing[i];
      let end = start;
      // Расширяем пока даты идут подряд (с шагом 1 день)
      while (i + 1 < missing.length && missing[i + 1] === shiftDate(end, 1)) {
        i++;
        end = missing[i];
      }
      ranges.push({ start, end });
      i++;
    }
    return ranges;
  }

  /**
   * Нарезает диапазон [start, end] на куски по CHUNK_DAYS дней.
   * Используется для разбивки больших пропусков на API-вызовы.
   */
  private splitIntoChunks(start: string, end: string, chunkDays: number = CHUNK_DAYS): Array<{ start: string; end: string }> {
    const chunks: Array<{ start: string; end: string }> = [];
    let cur = start;
    while (cur <= end) {
      const chunkEnd = shiftDate(cur, Math.min(chunkDays - 1, diffDays(cur, end)));
      chunks.push({ start: cur, end: chunkEnd });
      cur = shiftDate(chunkEnd, 1);
    }
    return chunks;
  }

  /** Синхронно загружает один 30-дневный кусок (вызывается из background queue). */
  private async fetchAndCacheDailyChunk(start: string, end: string, attempt = 1): Promise<number> {
    try {
      const rows = await this.fetchDailyData(start, end);
      this.persistCache();
      return rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // TooManySimultaneousQueries — transient, retry with backoff
      if (msg.includes('Too many simultaneous queries') && attempt < 3) {
        const wait = Math.min(30_000 * attempt, 60_000);
        console.log(`[ozon-analytics:${this.entity}] retry ${attempt}/3 after ${wait / 1000}s: ${msg.slice(0, 80)}`);
        await sleep(wait);
        return this.fetchAndCacheDailyChunk(start, end, attempt + 1);
      }
      throw err;
    }
  }

  /** Планирует загрузку недостающих 365 дней в background queue. */
  private scheduleWarmupGaps(today: string): void {
    const missingRanges = this.getMissingDateRanges(today, 365);
    if (missingRanges.length === 0) return;

    // Нарезаем каждый пропущенный диапазон на 30-дневные куски
    const chunks: Array<{ start: string; end: string }> = [];
    for (const range of missingRanges) {
      chunks.push(...this.splitIntoChunks(range.start, range.end, 30));
    }

    // Загружаем сначала свежие даты, потом более старые
    chunks.reverse();

    console.log(`[ozon-analytics:${this.entity}] chunks: ${chunks.length}`);

    for (const chunk of chunks) {
      const rangeKey = `${chunk.start}|${chunk.end}`;
      if (this.backgroundPendingRanges.has(rangeKey)) continue;
      this.backgroundPendingRanges.add(rangeKey);
      this.backgroundQueue.push({ start: chunk.start, end: chunk.end });
    }
    this.processBackgroundQueue();
  }

  async warmupCache(): Promise<void> {
    if (this.warmupInProgress) {
      console.log(`[ozon-analytics:${this.entity}] warming: already in progress`);
      return;
    }
    this.warmupInProgress = true;

    try {
      const skus = readEntitySkusFromJson(this.entity);
      if (skus.length === 0) {
        console.log(`[ozon-analytics:${this.entity}] warming: no SKUs`);
        return;
      }

      const today = todayISO();

      const missingRanges = this.getMissingDateRanges(today, 365);
      if (missingRanges.length === 0) {
        console.log(`[ozon-analytics:${this.entity}] warming: 365 days already cached`);
        return;
      }

      console.log(`[ozon-analytics:${this.entity}] warming: ${skus.length} SKUs`);

      this.scheduleWarmupGaps(today);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ozon-analytics:${this.entity}] warming failed: ${msg}`);
    } finally {
      this.warmupInProgress = false;
    }
  }

  startHourlyRefresh(delayMs: number): void {
    // Проверяем, когда было последнее обновление (переживает рестарт)
    const lastRefresh = loadRefreshTimestamp(SERVICE_NAME, this.entity);
    const now = Date.now();
    const elapsed = lastRefresh ? now - lastRefresh : Infinity;
    const sixHours = REFRESH_INTERVAL_MS;

    if (lastRefresh && elapsed < sixHours) {
      // Данные свежие — пропускаем warmup, ждём до следующего окна
      const nextIn = sixHours - elapsed;
      console.log(`[ozon-analytics:${this.entity}] fresh ${Math.round(elapsed / 60000)}m ago, next refresh in ${Math.round(nextIn / 60000)}m`);
      setTimeout(() => this.refreshRecentDays(), nextIn);
    } else {
      // Нет timestamp или прошло >6ч — запускаем warmup
      setTimeout(() => this.warmupCache(), delayMs);
    }

    // Периодический refresh последних 7 дней каждые 6 часов
    setInterval(() => {
      this.refreshRecentDays();
    }, sixHours);
  }

  /**
   * Обновляет данные за последние 7 дней и сохраняет timestamp.
   */
  private refreshRecentDays(): void {
    const today = todayISO();
    const start = shiftDate(today, -6);
    const rangeKey = `${start}|${today}`;
    if (this.backgroundPendingRanges.has(rangeKey)) return;
    this.backgroundPendingRanges.add(rangeKey);
    this.backgroundQueue.push({ start, end: today });
    this.processBackgroundQueue();
    // Сохраняем timestamp сразу, не дожидаясь выполнения чанка
    saveRefreshTimestamp(SERVICE_NAME, this.entity);
  }

  // ─── Background refresh queue ──────────────────────────────────────

  private async processBackgroundQueue(): Promise<void> {
    if (this.backgroundRunning) return;
    this.backgroundRunning = true;

    let chunkIndex = 0;
    while (this.backgroundQueue.length > 0) {
      const total = this.backgroundQueue.length + chunkIndex;
      chunkIndex++;
      const job = this.backgroundQueue.shift()!;
      const rangeKey = `${job.start}|${job.end}`;
      console.log(`[ozon-analytics:${this.entity}] progress: chunk ${chunkIndex}/${total}`);
      try {
        const rows = await this.fetchAndCacheDailyChunk(job.start, job.end);
        console.log(`[ozon-analytics:${this.entity}] progress: chunk ${chunkIndex}/${total} — done (${rows} rows)`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ozon-analytics:${this.entity}] progress: chunk ${chunkIndex}/${total} — failed: ${msg}`);
      } finally {
        this.backgroundPendingRanges.delete(rangeKey);
      }
    }

    saveRefreshTimestamp(SERVICE_NAME, this.entity);
    this.backgroundRunning = false;
  }

  // ─── Performance API enrichment ──────────────────────────────────────

  /**
   * Добавляет paidClicks/paidViews из Performance API в статьи,
   * чтобы фронт мог вычислить organic CTR = (openCount - paidClicks) / (hitsViewSearch - paidViews).
   */
  private async addPerformanceData(
    articles: OzonArticleMetrics[],
    startDate: string,
    endDate: string
  ): Promise<OzonArticleMetrics[]> {
    const skus = articles.map((a) => a.sku);
    if (skus.length === 0) return articles;
    try {
      const { clicks, views } = await fetchPerformanceStats(this.entity, skus, startDate, endDate);
      const nonZeroSku = [...clicks.keys()].some((sku) => (clicks.get(sku) ?? 0) > 0 || (views.get(sku) ?? 0) > 0);
      if (nonZeroSku) {
        const sample = [...clicks.keys()].slice(0, 3).map((sku) => `${sku}: c=${clicks.get(sku)} v=${views.get(sku)}`).join(', ');
        console.log(`[ozon-analytics:${this.entity}] perf data found — ${clicks.size} SKUs (${sample})`);
      } else {
        console.log(`[ozon-analytics:${this.entity}] perf data: 0 clicks/views for ${skus.length} SKUs`);
      }
      if (clicks.size === 0 && views.size === 0) return articles;
      return articles.map((art) => {
        const c = clicks.get(art.sku) ?? 0;
        const v = views.get(art.sku) ?? 0;
        if (c === 0 && v === 0) return art;
        return {
          ...art,
          selected: {
            ...art.selected,
            paidClicks: c,
            paidViews: v,
          },
        };
      });
    } catch (err) {
      console.error(`[ozon-analytics:${this.entity}] addPerformanceData error: ${err instanceof Error ? err.message : String(err)}`);
      return articles;
    }
  }

  // ─── On-demand fetch ────────────────────────────────────────────────

  async fetch(
    skus: number[],
    startDate: string,
    endDate: string
  ): Promise<{ articles: OzonArticleMetrics[]; cached: boolean; updating: boolean }> {
    if (skus.length === 0) {
      return { articles: [], cached: false, updating: false };
    }

    const periodKey = `${startDate}|${endDate}`;

    // 1. Пытаемся агрегировать из daily cache (быстрый путь, 30-60 дней)
    const { articles, missingDates } = this.aggregateFromDailyCache(skus, startDate, endDate);
    if (missingDates.length === 0 && articles.length === skus.length) {
      const orderMap = new Map(skus.map((id, i) => [id, i]));
      const sorted = [...articles].sort((a, b) => (orderMap.get(a.sku) ?? 0) - (orderMap.get(b.sku) ?? 0));
      return { articles: await this.addPerformanceData(sorted, startDate, endDate), cached: true, updating: false };
    }

    // 2. Если daily cache не покрывает — пробуем period cache
    if (this.periodCacheCovers(skus, periodKey)) {
      const result: OzonArticleMetrics[] = [];
      for (const sku of skus) {
        const art = this.getPeriodArticle(sku, periodKey);
        if (art) result.push(art);
      }
      if (result.length === skus.length) {
        const orderMap = new Map(skus.map((id, i) => [id, i]));
        result.sort((a, b) => (orderMap.get(a.sku) ?? 0) - (orderMap.get(b.sku) ?? 0));
        return { articles: await this.addPerformanceData(result, startDate, endDate), cached: true, updating: false };
      }
    }

    // 3. Не кэшировано — фоновый refresh + returning updating
    if (!this.warmupInProgress && !this.backgroundPendingRanges.has(periodKey)) {
      this.backgroundPendingRanges.add(periodKey);
      this.backgroundQueue.push({ start: startDate, end: endDate });
      this.processBackgroundQueue();
    }

    const orderMap = new Map(skus.map((id, i) => [id, i]));
    const sorted = [...articles].sort((a, b) => (orderMap.get(a.sku) ?? 0) - (orderMap.get(b.sku) ?? 0));
    return {
      articles: await this.addPerformanceData(sorted, startDate, endDate),
      cached: true,
      updating: this.warmupInProgress || this.backgroundPendingRanges.has(periodKey),
    };
  }
}

// ─── Service registry ─────────────────────────────────────────────────────

const services = new Map<MarketplaceEntityCode, OzonEntityAnalyticsService>();

function getService(entity: MarketplaceEntityCode): OzonEntityAnalyticsService | null {
  if (services.has(entity)) return services.get(entity)!;
  const creds = getCredentialsForEntity(entity);
  if (!creds) return null;
  const svc = new OzonEntityAnalyticsService(entity, creds);
  services.set(entity, svc);
  return svc;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function startHourlyRefresh(): void {
  const entities = getConfiguredEntities();
  if (entities.length === 0) {
    console.log('[ozon-analytics] no Ozon credentials configured');
    return;
  }
  entities.forEach((entity, i) => {
    const svc = getService(entity);
    if (svc) {
      // Разные задержки, чтобы warmup-ы не стартовали одновременно
      svc.startHourlyRefresh(4_000 + i * 6_000);
    }
  });
}

/** Принудительный сброс кэша и перезапуск warmup для всех кабинетов. */
export function forceRefresh(): void {
  const entities = getConfiguredEntities();
  for (const entity of entities) {
    const svc = getService(entity);
    if (svc) {
      svc.clearAllCache();
      deleteRefreshTimestamp(SERVICE_NAME, entity);
      svc.warmupCache();
    }
  }
}

export async function fetchOzonAnalytics(
  skus: number[],
  startDate: string,
  endDate: string
): Promise<OzonAnalyticsResponse> {
  if (skus.length === 0) {
    return { currency: 'RUB', articles: [], cached: false };
  }

  const groups = groupSkusByEntity(skus);
  const configuredEntities = new Set(getConfiguredEntities());
  for (const entity of groups.keys()) {
    if (!configuredEntities.has(entity)) groups.delete(entity);
  }
  if (groups.size === 0) {
    return { currency: 'RUB', articles: [], cached: false };
  }

  const results = await Promise.all(
    [...groups.entries()].map(async ([entity, entitySkus]) => {
      const svc = getService(entity);
      if (!svc) return { articles: [] as OzonArticleMetrics[], cached: true, updating: false };
      try {
        return await svc.fetch(entitySkus, startDate, endDate);
      } catch (err) {
        if (err instanceof OzonAnalyticsError) {
          console.error(`[ozon-analytics:${entity}] fetch failed: ${err.message}`);
          return { articles: [] as OzonArticleMetrics[], cached: true, updating: false };
        }
        throw err;
      }
    })
  );

  const allArticles = results.flatMap((r) => r.articles);
  const allCached = results.every((r) => r.cached);
  const anyUpdating = results.some((r) => r.updating);

  const orderMap = new Map(skus.map((id, i) => [id, i]));
  allArticles.sort((a, b) => (orderMap.get(a.sku) ?? 0) - (orderMap.get(b.sku) ?? 0));

  return { currency: 'RUB', articles: allArticles, cached: allCached, updating: anyUpdating || undefined };
}

export async function fetchOzonTimeSeries(
  entity: MarketplaceEntityCode | undefined,
  skus: number[],
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' = 'day'
): Promise<OzonTimeSeriesResponse> {
  if (skus.length === 0) {
    return { points: [], cached: false };
  }

  if (entity) {
    const svc = getService(entity);
    if (!svc) return { points: [], cached: false };
    try {
      const result = await svc.getTimeSeries(skus, startDate, endDate, groupBy);
      return { points: result.points, cached: result.cached };
    } catch (err) {
      console.error(`[ozon-analytics:${entity}] getTimeSeries failed: ${err instanceof Error ? err.message : String(err)}`);
      return { points: [], cached: false };
    }
  }

  // No entity specified — sum across all entities
  const groups = groupSkusByEntity(skus);
  const configuredEntities = new Set(getConfiguredEntities());
  for (const e of groups.keys()) {
    if (!configuredEntities.has(e)) groups.delete(e);
  }
  if (groups.size === 0) return { points: [], cached: false };

  const results = await Promise.all(
    [...groups.entries()].map(async ([e, entitySkus]) => {
      const svc = getService(e);
      if (!svc) return { points: [] as OzonTimeSeriesPoint[], cached: true };
      try {
        return await svc.getTimeSeries(entitySkus, startDate, endDate, groupBy);
      } catch (err) {
        console.error(`[ozon-analytics:${e}] getTimeSeries failed: ${err instanceof Error ? err.message : String(err)}`);
        return { points: [] as OzonTimeSeriesPoint[], cached: false };
      }
    })
  );

  // Merge points by date across all entities
  const mergedMap = new Map<string, { openCount: number; orderCount: number; orderSum: number; buyoutCount: number }>();
  for (const r of results) {
    for (const p of r.points) {
      const existing = mergedMap.get(p.date) || { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 };
      existing.openCount += p.metrics.openCount;
      existing.orderCount += p.metrics.orderCount;
      existing.orderSum += p.metrics.orderSum;
      existing.buyoutCount += p.metrics.buyoutCount;
      mergedMap.set(p.date, existing);
    }
  }

  const allCached = results.every((r) => r.cached);
  return {
    points: [...mergedMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, metrics]) => ({ date, metrics })),
    cached: allCached,
  };
}
