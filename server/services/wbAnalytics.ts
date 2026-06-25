// ─── WB Analytics Service (multi-entity) ──────────────────────────────────
// Прокси к WB Seller Analytics API с динамическим per-article кэшем,
// фоновым warmup-ом и rate limiter-ом. Данные WB обновляются раз в час,
// поэтому кэш бьём по TTL 2 часа (2× интервал обновления, чтобы пережить
// сбой одного цикла). Warmup при старте + каждый час читает products.json
// заново и динамически подстраивается под актуальное количество артикулов.
//
// **Multi-entity**: каждый кабинет (КЮА, КАА, ДЕВ, БМС) имеет свой токен,
// свой кэш, свой rate limiter и свой warmup-расписанием. nmId→entity
// резолвится из products.json, после чего запрос маршрутизируется в
// сервис соответствующего кабинета. Это позволяет:
//   - параллельно тянуть данные из разных кабинетов (у каждого свой лимит);
//   - не словить 400 "Check correctness of nm id" от чужого кабинета;
//   - добавлять новые кабинеты просто добавив токен в .env.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { parse as csvParse } from 'csv-parse/sync';
import type { RawProduct, MarketplaceEntityCode } from '../types';
import { saveCache, loadCache, saveRefreshTimestamp, loadRefreshTimestamp, deleteRefreshTimestamp, deleteServiceCache } from './cacheStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WB_API_URL = 'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products';
const WB_MAX_NMIDS_PER_REQUEST = 1000;
const MIN_INTERVAL_MS = 21_000;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_429_RETRIES = 3;
const SERVICE_NAME = 'wb-analytics';
const SERVICE_DAILY_NAME = 'wb-analytics-daily';
const WB_CSV_API_URL = 'https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads';
const WB_HISTORY_API_URL = 'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products/history';
const WB_MAX_NMIDS_PER_HISTORY = 20;
const CSV_REPORT_DAILY_LIMIT = 20;
const CSV_DAILY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cache', 'wb-csv-reports');

// ─── Entity / token resolution ────────────────────────────────────────────

const ENTITY_ORDER: MarketplaceEntityCode[] = ['kua', 'kaa', 'dev'];

/**
 * Возвращает токен для данного кабинета.
 * Приоритет: `WB_API_TOKEN_<ENTITY>` → `WB_API_TOKEN_KUA` (только для КЮА).
 */
function getTokenForEntity(entity: MarketplaceEntityCode): string {
  const explicit = process.env[`WB_API_TOKEN_${entity.toUpperCase()}`];
  if (explicit) return explicit;
  if (entity === 'kua') return process.env.WB_API_TOKEN_KUA || '';
  return '';
}

/** Список кабинетов, для которых задан токен. */
function getConfiguredEntities(): MarketplaceEntityCode[] {
  return ENTITY_ORDER.filter((e) => getTokenForEntity(e) !== '');
}

// ─── Типы ответа WB (нормализованные) ──────────────────────────────────────

export interface WbArticleMetrics {
  nmId: number;
  vendorCode: string;
  selected: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
  past: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
  dynamics: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
}

export interface WbSalesFunnelResponse {
  currency: string;
  articles: WbArticleMetrics[];
  cached: boolean;
  updating?: boolean;
}

// ─── Time Series types ────────────────────────────────────────────────────

export interface WbTimeSeriesPoint {
  date: string;
  metrics: {
    openCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
  };
}

export interface WbTimeSeriesResponse {
  points: WbTimeSeriesPoint[] | null;
  cached: boolean;
  updating?: boolean;
}

interface WbDailyMetrics {
  openCount: number;
  orderCount: number;
  orderSum: number;
  buyoutCount: number;
}

interface DailyCacheEntry {
  article: WbDailyMetrics;
  expiresAt: number;
}

export class WbAnalyticsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'WbAnalyticsError';
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

function defaultPeriod(): { start: string; end: string } {
  const end = todayISO();
  const start = shiftDate(end, -6);
  return { start, end };
}

function periodKey(start: string, end: string): string {
  return `${start}|${end}`;
}

// ─── nmId → entity из products.json ────────────────────────────────────────
// Динамическое чтение — всегда свежий список.

function readWbNmIdToEntityMap(): Map<number, MarketplaceEntityCode> {
  const productsPath = resolve(__dirname, '..', 'data', 'products.json');
  try {
    const raw = readFileSync(productsPath, 'utf-8');
    if (!raw.trim()) return new Map();
    const products = JSON.parse(raw) as RawProduct[];
    const map = new Map<number, MarketplaceEntityCode>();
    for (const p of products) {
      if (!p.marketplaceSkus) continue;
      for (const s of p.marketplaceSkus) {
        if (s.marketplace === 'wb' && s.kind === 'single') {
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

/** Группирует nmIds по entity, используя products.json. */
function groupNmIdsByEntity(nmIds: number[]): Map<MarketplaceEntityCode, number[]> {
  const nmIdToEntity = readWbNmIdToEntityMap();
  const groups = new Map<MarketplaceEntityCode, number[]>();
  for (const nmId of nmIds) {
    const entity = nmIdToEntity.get(nmId);
    if (!entity) continue;
    let arr = groups.get(entity);
    if (!arr) {
      arr = [];
      groups.set(entity, arr);
    }
    arr.push(nmId);
  }
  return groups;
}

/** Читает все nmIds данного кабинета из products.json. */
function readEntityNmIdsFromJson(entity: MarketplaceEntityCode): number[] {
  const nmIdToEntity = readWbNmIdToEntityMap();
  const result: number[] = [];
  for (const [nmId, ent] of nmIdToEntity) {
    if (ent === entity) result.push(nmId);
  }
  return result.sort((a, b) => a - b);
}

// ─── Per-entity service ───────────────────────────────────────────────────

interface CacheEntry {
  article: WbArticleMetrics;
  expiresAt: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Сервис аналитики одного кабинета WB. Каждый экземпляр имеет:
 *   - свой токен (доступ только к nmIds этого кабинета);
 *   - свой per-nmId кэш (Map<nmId, Map<periodKey, entry>>);
 *   - свой rate limiter (serial queue с интервалом MIN_INTERVAL_MS);
 *   - свой warmup guard.
 *
 * Это даёт параллельность: КЮА/КАА/ДЕВ тянутся одновременно, каждый в
 * рамках своего лимита ~20 сек/запрос.
 */
class WbEntityAnalyticsService {
  private entity: MarketplaceEntityCode;
  private token: string;
  private cache: Map<number, Map<string, CacheEntry>>;
  /** Daily cache: Map<nmId, Map<dateISO, DailyCacheEntry>> */
  private dailyCache: Map<number, Map<string, DailyCacheEntry>>;
  private lastRequestAt: number;
  private warmupInProgress: boolean;
  private backgroundQueue: Array<{ nmIds: number[]; start: string; end: string }>;
  private backgroundRunning: boolean;
  private backgroundPendingPeriods: Set<string>;
  private csvReportInProgress: boolean;
  private csvReportCountsToday: number;
  private csvReportDate: string;
  private historyApiLastRequestAt: number;

  constructor(entity: MarketplaceEntityCode, token: string) {
    this.entity = entity;
    this.token = token;
    this.cache = new Map();
    this.dailyCache = new Map();
    this.lastRequestAt = 0;
    this.warmupInProgress = false;
    this.backgroundQueue = [];
    this.backgroundRunning = false;
    this.backgroundPendingPeriods = new Set();
    this.csvReportInProgress = false;
    this.csvReportCountsToday = 0;
    this.csvReportDate = '';
    this.historyApiLastRequestAt = 0;

    // Загружаем кэш с диска, чтобы пережить рестарт сервера
    const nmIds = readEntityNmIdsFromJson(entity);
    const loaded = loadCache(SERVICE_NAME, entity, nmIds);
    if (loaded.size > 0) {
      this.cache = loaded as Map<number, Map<string, CacheEntry>>;
      console.log(`[wb-analytics:${entity}] loaded: ${this.cache.size} articles`);
    }

    // Загружаем daily кэш
    const dailyLoaded = loadCache(SERVICE_DAILY_NAME, entity, nmIds);
    if (dailyLoaded.size > 0) {
      this.dailyCache = dailyLoaded as Map<number, Map<string, DailyCacheEntry>>;
      const totalEntries = [...this.dailyCache.values()].reduce((s, m) => s + m.size, 0);
      console.log(`[wb-analytics:${entity}] daily loaded: ${this.dailyCache.size} articles / ${totalEntries} daily entries`);
    }

    // Восстанавливаем счётчик CSV-отчётов из файла
    this.loadCsvReportCount();
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────

  private getArticleFromCache(nmId: number, key: string): WbArticleMetrics | null {
    const byPeriod = this.cache.get(nmId);
    if (!byPeriod) return null;
    const entry = byPeriod.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) byPeriod.delete(key);
      return null;
    }
    return entry.article;
  }

  private setArticleInCache(nmId: number, key: string, article: WbArticleMetrics): void {
    let byPeriod = this.cache.get(nmId);
    if (!byPeriod) {
      byPeriod = new Map();
      this.cache.set(nmId, byPeriod);
    }
    byPeriod.set(key, { article, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  private evictStaleNmIds(validNmIds: number[]): void {
    const validSet = new Set(validNmIds);
    for (const nmId of this.cache.keys()) {
      if (!validSet.has(nmId)) {
        this.cache.delete(nmId);
      }
    }
  }

  private replaceCacheForPeriod(key: string, articles: WbArticleMetrics[]): void {
    for (const byPeriod of this.cache.values()) {
      byPeriod.delete(key);
    }
    for (const art of articles) {
      this.setArticleInCache(art.nmId, key, art);
    }
  }

  private persistCache(): void {
    saveCache(SERVICE_NAME, this.entity, this.cache);
  }

  /** Полностью очищает кэш в памяти и на диске. */
  public clearAllCache(): void {
    this.cache.clear();
    deleteServiceCache(SERVICE_NAME, this.entity);
  }

  // ─── Rate limiter ───────────────────────────────────────────────────────

  private async throttledFetch(body: string): Promise<Response> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }

    let res: Response;
    try {
      res = await fetch(WB_API_URL, {
        method: 'POST',
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/json',
        },
        body,
      });
    } catch (err) {
      throw new WbAnalyticsError(
        `Не удалось связаться с WB API: ${err instanceof Error ? err.message : String(err)}`,
        502
      );
    }
    this.lastRequestAt = Date.now();
    return res;
  }

  private async throttledFetchWithRetry(body: string): Promise<Response> {
    for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
      const res = await this.throttledFetch(body);
      if (res.status !== 429) return res;

      if (attempt === MAX_429_RETRIES) {
        throw new WbAnalyticsError(
          `WB API [${this.entity}]: слишком много запросов (429), лимит исчерпан после ${MAX_429_RETRIES} попыток`,
          429
        );
      }

      const retryAfter = parseInt(res.headers.get('X-Ratelimit-Retry') ?? '21', 10);
      const waitSec = Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 21, 300);
      console.log(`[wb-analytics:${this.entity}] 429, waiting ${waitSec}s before retry ${attempt + 1}/${MAX_429_RETRIES}`);
      await sleep(waitSec * 1000);
      this.lastRequestAt = 0;
    }
    throw new WbAnalyticsError('WB API: неизвестная ошибка', 500);
  }

  // ─── Парсинг ────────────────────────────────────────────────────────────

  private normalizeProduct(p: WbRawProduct): WbArticleMetrics {
    return {
      nmId: p.product.nmId,
      vendorCode: p.product.vendorCode,
      selected: {
        openCount: p.statistic.selected.openCount,
        orderCount: p.statistic.selected.orderCount,
        orderSum: p.statistic.selected.orderSum,
        buyoutCount: p.statistic.selected.buyoutCount,
      },
      past: p.statistic.past
        ? {
            openCount: p.statistic.past.openCount,
            orderCount: p.statistic.past.orderCount,
            orderSum: p.statistic.past.orderSum,
            buyoutCount: p.statistic.past.buyoutCount,
          }
        : { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 },
      dynamics: p.statistic.comparison
        ? {
            openCount: p.statistic.comparison.openCountDynamic,
            orderCount: p.statistic.comparison.orderCountDynamic,
            orderSum: p.statistic.comparison.orderSumDynamic,
            buyoutCount: p.statistic.comparison.buyoutCountDynamic,
          }
        : { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 },
    };
  }

  // ─── Batch fetch ────────────────────────────────────────────────────────

  private async fetchBatchFromWb(
    nmIds: number[],
    start: string,
    end: string
  ): Promise<WbArticleMetrics[]> {
    const minStart = shiftDate(todayISO(), -364);
    if (start < minStart) {
      throw new WbAnalyticsError(
        `selectedPeriod.start (${start}) выходит за пределы 365-дневного окна WB API. Минимальная startDate: ${minStart}`,
        400
      );
    }

    const past = computePastPeriod(start, end);
    const pastWithinLimit = past.start >= shiftDate(todayISO(), -365);

    const bodyObj: Record<string, unknown> = {
      selectedPeriod: { start, end },
      nmIds,
    };
    if (pastWithinLimit) {
      bodyObj.pastPeriod = { start: past.start, end: past.end };
    }
    const body = JSON.stringify(bodyObj);

    const res = await this.throttledFetchWithRetry(body);

    if (!res.ok) {
      let detail = `WB API [${this.entity}] вернул ${res.status}`;
      try {
        const errBody = (await res.json()) as { detail?: string; title?: string };
        if (errBody.detail) detail = errBody.detail;
        else if (errBody.title) detail = errBody.title;
      } catch {
        // ignore
      }
      throw new WbAnalyticsError(detail, res.status);
    }

    const raw = (await res.json()) as WbRawResponse;
    const products = raw.data?.products ?? [];
    return products.map((p) => {
      const normalized = this.normalizeProduct(p);
      if (!pastWithinLimit) {
        normalized.past = { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 };
        normalized.dynamics = { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 };
      }
      return normalized;
    });
  }

  private async fetchBatched(
    nmIds: number[],
    start: string,
    end: string
  ): Promise<WbArticleMetrics[]> {
    if (nmIds.length === 0) return [];

    const chunks: number[][] = [];
    for (let i = 0; i < nmIds.length; i += WB_MAX_NMIDS_PER_REQUEST) {
      chunks.push(nmIds.slice(i, i + WB_MAX_NMIDS_PER_REQUEST));
    }

    const all: WbArticleMetrics[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        console.log(`[wb-analytics:${this.entity}] batch ${i + 1}/${chunks.length} (${chunks[i].length} nmIds)`);
      }
      const articles = await this.fetchBatchFromWb(chunks[i], start, end);
      all.push(...articles);
    }
    return all;
  }

  // ─── Warmup ─────────────────────────────────────────────────────────────

  async warmupCache(): Promise<void> {
    if (this.warmupInProgress) {
      console.log(`[wb-analytics:${this.entity}] warming: already in progress`);
      return;
    }
    this.warmupInProgress = true;

    try {
      const nmIds = readEntityNmIdsFromJson(this.entity);
      if (nmIds.length === 0) {
        console.log(`[wb-analytics:${this.entity}] warming: no articles`);
        return;
      }

      const period = defaultPeriod();
      const key = periodKey(period.start, period.end);
      console.log(`[wb-analytics:${this.entity}] warming: ${nmIds.length} articles`);

      const batchCount = Math.ceil(nmIds.length / WB_MAX_NMIDS_PER_REQUEST);
      console.log(`[wb-analytics:${this.entity}] batches: ${batchCount}`);

      const articles = await this.fetchBatched(nmIds, period.start, period.end);

      this.replaceCacheForPeriod(key, articles);
      this.evictStaleNmIds(nmIds);
      this.persistCache();
      saveRefreshTimestamp(SERVICE_NAME, this.entity);

      const note = nmIds.length - articles.length > 0 ? ` (${nmIds.length - articles.length} missing)` : '';
      console.log(`[wb-analytics:${this.entity}] ready: ${articles.length}/${nmIds.length} articles${note}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[wb-analytics:${this.entity}] warming failed: ${msg}`);
    } finally {
      this.warmupInProgress = false;
    }
  }

  startHourlyRefresh(delayMs: number): void {
    const lastRefresh = loadRefreshTimestamp(SERVICE_NAME, this.entity);
    const now = Date.now();
    const elapsed = lastRefresh ? now - lastRefresh : Infinity;
    const sixHours = REFRESH_INTERVAL_MS;

    if (lastRefresh && elapsed < sixHours) {
      const nextIn = sixHours - elapsed;
      console.log(`[wb-analytics:${this.entity}] fresh ${Math.round(elapsed / 60000)}m ago, next refresh in ${Math.round(nextIn / 60000)}m`);
      setTimeout(() => this.warmupCache(), nextIn);
    } else {
      setTimeout(() => this.warmupCache(), delayMs);
    }

    setInterval(() => {
      this.warmupCache();
    }, sixHours);
  }

  // ─── Background refresh queue ──────────────────────────────────────────
  // Никогда не блокируем HTTP-ответ. Недостающие данные догружаются в фоне.
  // ВАЖНО: фоновый fetch НЕ ретраит 429 и кэпнет ожидание на 120с.

  private async backgroundFetchBatchFromWb(
    nmIds: number[],
    start: string,
    end: string
  ): Promise<WbArticleMetrics[]> {
    if (nmIds.length === 0) return [];

    const minStart = shiftDate(todayISO(), -364);
    if (start < minStart) {
      throw new WbAnalyticsError(
        `selectedPeriod.start (${start}) выходит за пределы 365-дневного окна WB API. Минимальная startDate: ${minStart}`,
        400
      );
    }

    const past = computePastPeriod(start, end);
    const pastWithinLimit = past.start >= shiftDate(todayISO(), -365);
    const bodyObj: Record<string, unknown> = { selectedPeriod: { start, end }, nmIds };
    if (pastWithinLimit) bodyObj.pastPeriod = { start: past.start, end: past.end };
    const body = JSON.stringify(bodyObj);

    // Rate limit с кэпом 120с
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(Math.min(MIN_INTERVAL_MS - elapsed, 120_000));
    }

    let res: Response;
    try {
      res = await fetch(WB_API_URL, {
        method: 'POST',
        headers: { Authorization: this.token, 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      throw new WbAnalyticsError(
        `Не удалось связаться с WB API: ${err instanceof Error ? err.message : String(err)}`,
        502
      );
    }
    this.lastRequestAt = Date.now();

    if (res.status === 429) {
      throw new WbAnalyticsError(`WB API rate limited (429), background job skipped`, 429);
    }

    if (!res.ok) {
      let detail = `WB API [${this.entity}] вернул ${res.status}`;
      try {
        const errBody = (await res.json()) as { detail?: string; title?: string };
        if (errBody.detail) detail = errBody.detail;
        else if (errBody.title) detail = errBody.title;
      } catch { /* ignore */ }
      throw new WbAnalyticsError(detail, res.status);
    }

    const raw = (await res.json()) as WbRawResponse;
    const products = raw.data?.products ?? [];
    return products.map((p) => {
      const normalized = this.normalizeProduct(p);
      if (!pastWithinLimit) {
        normalized.past = { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 };
        normalized.dynamics = { openCount: 0, orderCount: 0, orderSum: 0, buyoutCount: 0 };
      }
      return normalized;
    });
  }

  private scheduleBackgroundRefresh(missing: number[], start: string, end: string): void {
    const key = periodKey(start, end);
    if (this.backgroundPendingPeriods.has(key)) return;
    this.backgroundPendingPeriods.add(key);
    this.backgroundQueue.push({ nmIds: missing, start, end });
    this.processBackgroundQueue();
  }

  private async processBackgroundQueue(): Promise<void> {
    if (this.backgroundRunning) return;
    this.backgroundRunning = true;

    while (this.backgroundQueue.length > 0) {
      const job = this.backgroundQueue.shift()!;
      const key = periodKey(job.start, job.end);
      try {
        const all: WbArticleMetrics[] = [];
        for (let i = 0; i < job.nmIds.length; i += WB_MAX_NMIDS_PER_REQUEST) {
          const chunk = job.nmIds.slice(i, i + WB_MAX_NMIDS_PER_REQUEST);
          const arts = await this.backgroundFetchBatchFromWb(chunk, job.start, job.end);
          all.push(...arts);
        }
        for (const art of all) {
          this.setArticleInCache(art.nmId, key, art);
        }
        this.persistCache();
        console.log(`[wb-analytics:${this.entity}] refreshed: ${all.length}/${job.nmIds.length} articles`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[wb-analytics:${this.entity}] refreshed failed: ${msg}`);
      } finally {
        this.backgroundPendingPeriods.delete(key);
      }
    }

    this.backgroundRunning = false;
  }

  // ─── On-demand fetch (never blocks) ─────────────────────────────────────

  async fetch(
    nmIds: number[],
    startDate: string,
    endDate: string
  ): Promise<{ articles: WbArticleMetrics[]; cached: boolean; updating: boolean }> {
    if (nmIds.length === 0) {
      return { articles: [], cached: false, updating: false };
    }

    const key = periodKey(startDate, endDate);

    // 1. Собираем из кэша
    const cached: WbArticleMetrics[] = [];
    const missing: number[] = [];
    for (const nmId of nmIds) {
      const art = this.getArticleFromCache(nmId, key);
      if (art) cached.push(art);
      else missing.push(nmId);
    }

    // 2. Всё в кэше — мгновенный ответ
    if (missing.length === 0) {
      const orderMap = new Map(nmIds.map((id, i) => [id, i]));
      const sorted = [...cached].sort((a, b) => (orderMap.get(a.nmId) ?? 0) - (orderMap.get(b.nmId) ?? 0));
      return { articles: sorted, cached: true, updating: false };
    }

    // 3. Недостающие есть → не блокируем, догружаем в фоне
    if (missing.length > 0 && !this.warmupInProgress) {
      this.scheduleBackgroundRefresh(missing, startDate, endDate); // внутр. guard от повторов
    }

    // Сортируем то, что есть
    const allByNmId = new Map<number, WbArticleMetrics>();
    for (const art of cached) allByNmId.set(art.nmId, art);

    const ordered: WbArticleMetrics[] = [];
    for (const nmId of nmIds) {
      const art = allByNmId.get(nmId);
      if (art) ordered.push(art);
    }

    return { articles: ordered, cached: true, updating: this.backgroundPendingPeriods.has(key) || this.warmupInProgress };
  }

  // ─── Daily cache helpers ─────────────────────────────────────────────

  private getDailyMetrics(nmId: number, date: string): WbDailyMetrics | null {
    const byDate = this.dailyCache.get(nmId);
    if (!byDate) return null;
    const entry = byDate.get(date);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) byDate.delete(date);
      return null;
    }
    return entry.article;
  }

  private setDailyMetrics(nmId: number, date: string, metrics: WbDailyMetrics): void {
    let byDate = this.dailyCache.get(nmId);
    if (!byDate) {
      byDate = new Map();
      this.dailyCache.set(nmId, byDate);
    }
    byDate.set(date, {
      article: metrics,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  private persistDailyCache(): void {
    saveCache(SERVICE_DAILY_NAME, this.entity, this.dailyCache);
  }

  public clearDailyCache(): void {
    this.dailyCache.clear();
    deleteServiceCache(SERVICE_DAILY_NAME, this.entity);
  }

  // ─── CSV report generation (DETAIL_HISTORY_REPORT) ───────────────────

  private loadCsvReportCount(): void {
    try {
      const path = resolve(CSV_DAILY_DIR, `${this.entity}-count.json`);
      if (!existsSync(path)) return;
      const raw = readFileSync(path, 'utf-8');
      const data = JSON.parse(raw) as { date: string; count: number };
      const today = todayISO();
      if (data.date === today) {
        this.csvReportCountsToday = data.count;
        this.csvReportDate = today;
      }
    } catch { /* ignore */ }
  }

  private saveCsvReportCount(): void {
    try {
      if (!existsSync(CSV_DAILY_DIR)) mkdirSync(CSV_DAILY_DIR, { recursive: true });
      const path = resolve(CSV_DAILY_DIR, `${this.entity}-count.json`);
      writeFileSync(path, JSON.stringify({ date: this.csvReportDate, count: this.csvReportCountsToday }), 'utf-8');
    } catch { /* ignore */ }
  }

  private canCreateCsvReport(): boolean {
    const today = todayISO();
    if (this.csvReportDate !== today) {
      this.csvReportDate = today;
      this.csvReportCountsToday = 0;
    }
    return this.csvReportCountsToday < CSV_REPORT_DAILY_LIMIT && !this.csvReportInProgress;
  }

  private async generateAndDownloadCsvReport(startDate: string, endDate: string): Promise<void> {
    if (this.csvReportInProgress) return;
    this.csvReportInProgress = true;

    const nmIds = readEntityNmIdsFromJson(this.entity);
    if (nmIds.length === 0) {
      this.csvReportInProgress = false;
      return;
    }

    const uuid = crypto.randomUUID();
    console.log(`[wb-analytics:${this.entity}] CSV report: creating (${uuid}) for ${nmIds.length} nmIds`);

    try {
      const createBody = JSON.stringify({
        id: uuid,
        reportType: 'DETAIL_HISTORY_REPORT',
        params: {
          nmIDs: nmIds,
          startDate,
          endDate,
          timezone: 'Europe/Moscow',
          aggregationLevel: 'day',
          skipDeletedNm: false,
        },
      });

      let res = await this.throttledCsvFetch(
        WB_CSV_API_URL,
        { method: 'POST', headers: { Authorization: this.token, 'Content-Type': 'application/json' }, body: createBody }
      );
      if (!res.ok) {
        console.error(`[wb-analytics:${this.entity}] CSV report create failed: ${res.status}`);
        this.csvReportInProgress = false;
        return;
      }

      // Poll status
      let status: string | null = null;
      let pollCount = 0;
      while (status !== 'done' && pollCount < 60) {
        await sleep(15_000);
        pollCount++;
        const statusRes = await this.throttledCsvFetch(
          `${WB_CSV_API_URL}?filter[downloadIds][]=${uuid}`,
          { method: 'GET', headers: { Authorization: this.token } }
        );
        if (!statusRes.ok) continue;
        const statusData = (await statusRes.json()) as { data?: Array<{ status?: string }> };
        const entryStatus = statusData?.data?.[0]?.status;
        if (!entryStatus) continue;
        if (entryStatus === 'done') { status = 'done'; }
        else if (entryStatus === 'failed') {
          console.log(`[wb-analytics:${this.entity}] CSV report failed, retrying...`);
          await this.throttledCsvFetch(
            `${WB_CSV_API_URL}/retry`,
            { method: 'POST', headers: { Authorization: this.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ downloadId: uuid }) }
          );
          status = null;
        }
      }

      if (status !== 'done') {
        console.error(`[wb-analytics:${this.entity}] CSV report timeout after ${pollCount} polls`);
        this.csvReportInProgress = false;
        return;
      }

      // Download ZIP
      console.log(`[wb-analytics:${this.entity}] CSV report: downloading`);
      const fileRes = await this.throttledCsvFetch(
        `${WB_CSV_API_URL}/file/${uuid}`,
        { method: 'GET', headers: { Authorization: this.token } }
      );
      if (!fileRes.ok) {
        console.error(`[wb-analytics:${this.entity}] CSV report download failed: ${fileRes.status}`);
        this.csvReportInProgress = false;
        return;
      }
      const zipBuffer = Buffer.from(await fileRes.arrayBuffer());

      // Parse ZIP → CSV → dailyCache
      const zip = new AdmZip(zipBuffer);
      const csvEntries = zip.getEntries().filter((e) => e.name.endsWith('.csv') || e.name.endsWith('.CSV'));
      if (csvEntries.length === 0) {
        console.error(`[wb-analytics:${this.entity}] CSV report: no CSV files in ZIP`);
        this.csvReportInProgress = false;
        return;
      }

      let parsedCount = 0;
      for (const csvEntry of csvEntries) {
        const csvContent = csvEntry.getData().toString('utf-8');
        parsedCount += this.parseAndStoreCsv(csvContent);
      }
      this.persistDailyCache();
      console.log(`[wb-analytics:${this.entity}] CSV report: stored ${parsedCount} daily entries`);

      // Bump report count for today
      const today = todayISO();
      if (this.csvReportDate !== today) { this.csvReportDate = today; this.csvReportCountsToday = 0; }
      this.csvReportCountsToday++;
      this.saveCsvReportCount();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[wb-analytics:${this.entity}] CSV report failed: ${msg}`);
    } finally {
      this.csvReportInProgress = false;
    }
  }

  private async throttledCsvFetch(url: string, init: RequestInit): Promise<Response> {
    const elapsed = Date.now() - this.historyApiLastRequestAt;
    if (elapsed < 21_000) {
      await sleep(21_000 - elapsed);
    }
    this.historyApiLastRequestAt = Date.now();
    return fetch(url, init);
  }

  private parseAndStoreCsv(csv: string): number {
    let rows: Record<string, string>[];
    try {
      rows = csvParse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    } catch {
      return 0;
    }
    const firstRow = rows[0];
    if (!firstRow) return 0;

    const colNames = Object.keys(firstRow);
    const nmIdCol = colNames.find((c) => /nmId|nmID|nm_id|артикул/i.test(c));
    const dateCol = colNames.find((c) => /^date$|^day$|дата/i.test(c));
    const openCol = colNames.find((c) => /openCount|open_card|open_count|переход/i.test(c));
    const orderCountCol = colNames.find((c) => /ordersCount|orderCount|order_count|заказов всего|заказы, шт/i.test(c));
    const orderSumCol = colNames.find((c) => /ordersSumRub|orderSum|order_sum|сумма заказов|заказы, руб/i.test(c));
    const buyoutCol = colNames.find((c) => /buyoutsCount|buyoutCount|buyout_count|выкупов всего|выкупы, шт/i.test(c));
    if (!nmIdCol || !dateCol || !openCol || !orderCountCol) return 0;

    let stored = 0;
    for (const row of rows) {
      const nmId = parseInt(row[nmIdCol], 10);
      const date = row[dateCol]?.trim();
      if (!Number.isFinite(nmId) || nmId <= 0 || !date) continue;
      const open = parseInt(row[openCol], 10) || 0;
      const orders = parseInt(row[orderCountCol], 10) || 0;
      const sum = orderSumCol ? Math.round((parseFloat(row[orderSumCol]) || 0) * 100) / 100 : 0;
      const buyouts = buyoutCol ? parseInt(row[buyoutCol], 10) || 0 : 0;
      this.setDailyMetrics(nmId, date, { openCount: open, orderCount: orders, orderSum: sum, buyoutCount: buyouts });
      stored++;
    }
    return stored;
  }

  // ─── /products/history fetcher (last 7 days, max 20 nmIds/req) ──────

  private async fetchDailyHistoryBatch(nmIds: number[], start: string, end: string): Promise<void> {
    const historyUrl = WB_HISTORY_API_URL;
    const body = JSON.stringify({
      selectedPeriod: { start, end },
      nmIds,
      aggregationLevel: 'day',
      skipDeletedNm: true,
    });

    const elapsed = Date.now() - this.historyApiLastRequestAt;
    if (elapsed < 21_000) {
      await sleep(21_000 - elapsed);
    }

    let res: Response;
    try {
      res = await fetch(historyUrl, {
        method: 'POST',
        headers: { Authorization: this.token, 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      throw new WbAnalyticsError(
        `Не удалось связаться с WB API: ${err instanceof Error ? err.message : String(err)}`, 502
      );
    }
    this.historyApiLastRequestAt = Date.now();

    if (!res.ok) {
      let detail = `WB /history [${this.entity}] вернул ${res.status}`;
      try { const e = (await res.json()) as { detail?: string }; if (e.detail) detail = e.detail; } catch { /* */ }
      throw new WbAnalyticsError(detail, res.status);
    }

    type HistoryRow = { date: string; openCount: number; orderCount: number; orderSum: number; buyoutCount: number };
    type HistoryProduct = { product: { nmId: number }; history: HistoryRow[] };
    const raw = (await res.json()) as HistoryProduct[];

    for (const prod of raw) {
      const nmId = prod.product?.nmId;
      if (!nmId) continue;
      for (const row of prod.history || []) {
        this.setDailyMetrics(nmId, row.date, {
          openCount: row.openCount ?? 0,
          orderCount: row.orderCount ?? 0,
          orderSum: Math.round((row.orderSum ?? 0) * 100) / 100,
          buyoutCount: row.buyoutCount ?? 0,
        });
      }
    }
  }

  private async refreshRecentDailyHistory(nmIds: number[], start: string, end: string): Promise<void> {
    for (let i = 0; i < nmIds.length; i += WB_MAX_NMIDS_PER_HISTORY) {
      const chunk = nmIds.slice(i, i + WB_MAX_NMIDS_PER_HISTORY);
      await this.fetchDailyHistoryBatch(chunk, start, end);
    }
    this.persistDailyCache();
  }

  // ─── Time series public API ───────────────────────────────────────────

  public async getTimeSeries(
    nmIds: number[],
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week'
  ): Promise<{ points: WbTimeSeriesPoint[]; cached: boolean; updating: boolean }> {
    if (nmIds.length === 0) {
      return { points: [], cached: false, updating: false };
    }

    const dates = dateRange(startDate, endDate);
    const dateMap = new Map<string, { openCount: number; orderCount: number; orderSum: number; buyoutCount: number }>();
    const missingDates: string[] = [];

    for (const date of dates) {
      let hasData = false;
      let open = 0, orders = 0, sum = 0, buyouts = 0;
      for (const nmId of nmIds) {
        const m = this.getDailyMetrics(nmId, date);
        if (m) {
          open += m.openCount;
          orders += m.orderCount;
          sum += m.orderSum;
          buyouts += m.buyoutCount;
          hasData = true;
        }
      }
      if (hasData) {
        dateMap.set(date, { openCount: open, orderCount: orders, orderSum: sum, buyoutCount: buyouts });
      } else {
        missingDates.push(date);
      }
    }

    const hasAll = missingDates.length === 0;

    if (!hasAll && !this.csvReportInProgress) {
      const periodDays = diffDays(startDate, endDate);
      if (periodDays > 14 && this.canCreateCsvReport()) {
        console.log(`[wb-analytics:${this.entity}] getTimeSeries: generating CSV report for ${startDate}..${endDate}`);
        this.generateAndDownloadCsvReport(startDate, endDate);
      } else if (periodDays <= 7) {
        this.refreshRecentDailyHistory(nmIds, startDate, endDate);
      }
    }

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
        points: [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, metrics]) => ({ date, metrics })),
        cached: hasAll,
        updating: !hasAll && this.csvReportInProgress,
      };
    }

    return {
      points: [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, metrics]) => ({ date, metrics })),
      cached: hasAll,
      updating: !hasAll && this.csvReportInProgress,
    };
  }
}

// ─── Raw response types ────────────────────────────────────────────────────

interface WbRawProduct {
  product: { nmId: number; vendorCode: string };
  statistic: {
    selected: { openCount: number; orderCount: number; orderSum: number; buyoutCount: number };
    past?: { openCount: number; orderCount: number; orderSum: number; buyoutCount: number };
    comparison?: {
      openCountDynamic: number;
      orderCountDynamic: number;
      orderSumDynamic: number;
      buyoutCountDynamic: number;
    };
  };
}

interface WbRawResponse {
  data?: { products?: WbRawProduct[]; currency?: string };
  title?: string;
  detail?: string;
}

function computePastPeriod(start: string, end: string): { start: string; end: string } {
  const len = diffDays(start, end);
  return {
    start: shiftDate(start, -(len + 1)),
    end: shiftDate(start, -1),
  };
}

function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  let d = start;
  while (d <= end) {
    result.push(d);
    d = shiftDate(d, 1);
  }
  return result;
}

// ─── Service registry ─────────────────────────────────────────────────────
// Ленивая инициализация: сервис создаётся при первом обращении.

const services = new Map<MarketplaceEntityCode, WbEntityAnalyticsService>();

function getService(entity: MarketplaceEntityCode): WbEntityAnalyticsService | null {
  if (services.has(entity)) return services.get(entity)!;
  const token = getTokenForEntity(entity);
  if (!token) return null;
  const svc = new WbEntityAnalyticsService(entity, token);
  services.set(entity, svc);
  return svc;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Запускает фоновое обновление кэша для всех кабинетов, у которых задан
 * токен. Каждый кабинет имеет свой независимый rate limiter, поэтому
 * warmup-ы запускаются одновременно — они не мешают друг другу.
 */
export function startHourlyRefresh(): void {
  const entities = getConfiguredEntities();
  if (entities.length === 0) {
    console.log('[wb-analytics] no WB tokens configured');
    return;
  }
  entities.forEach((entity) => {
    const svc = getService(entity);
    if (svc) {
      // Все кабинеты стартуют одновременно — у каждого свой rate limiter
      svc.startHourlyRefresh(5_000);
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

/**
 * Мульти-кабинетный fetch: группирует nmIds по entity (из products.json),
 * маршрутизирует каждый пул в сервис соответствующего кабинета.
 * Артикулы без сконфигурированного токена пропускаются молча.
 */
export async function fetchWbSalesFunnel(
  nmIds: number[],
  startDate: string,
  endDate: string
): Promise<WbSalesFunnelResponse> {
  if (nmIds.length === 0) {
    return { currency: 'RUB', articles: [], cached: false };
  }

  const groups = groupNmIdsByEntity(nmIds);
  const configuredEntities = new Set(getConfiguredEntities());
  for (const entity of groups.keys()) {
    if (!configuredEntities.has(entity)) groups.delete(entity);
  }
  if (groups.size === 0) {
    return { currency: 'RUB', articles: [], cached: false };
  }

  // Запускаем запросы по кабинетам ПАРАЛЛЕЛЬНО — у каждого кабинета свой
  // токен и свой rate limiter (~20 сек/запрос), поэтому они не мешают друг
  // другу. 3 кабинета × 1 батч = ~20 сек суммарно (а не ~60 сек последовательно).
  const results = await Promise.all(
    [...groups.entries()].map(async ([entity, entityNmIds]) => {
      const svc = getService(entity);
      if (!svc) return { articles: [] as WbArticleMetrics[], cached: true, updating: false };
      try {
        return await svc.fetch(entityNmIds, startDate, endDate);
      } catch (err) {
        if (err instanceof WbAnalyticsError) {
          console.error(`[wb-analytics:${entity}] fetch failed: ${err.message}`);
          return { articles: [] as WbArticleMetrics[], cached: true, updating: false };
        }
        throw err;
      }
    })
  );

  const allArticles = results.flatMap((r) => r.articles);
  const allCached = results.every((r) => r.cached);
  const anyUpdating = results.some((r) => r.updating);

  // Сортируем в порядке исходных nmIds
  const orderMap = new Map(nmIds.map((id, i) => [id, i]));
  allArticles.sort((a, b) => (orderMap.get(a.nmId) ?? 0) - (orderMap.get(b.nmId) ?? 0));

  return { currency: 'RUB', articles: allArticles, cached: allCached, updating: anyUpdating || undefined };
}

export async function fetchWbTimeSeries(
  entity: MarketplaceEntityCode | undefined,
  nmIds: number[],
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' = 'day'
): Promise<WbTimeSeriesResponse> {
  if (nmIds.length === 0) {
    return { points: [], cached: false, updating: false };
  }

  if (entity) {
    const svc = getService(entity);
    if (!svc) return { points: [], cached: false, updating: false };
    try {
      const result = await svc.getTimeSeries(nmIds, startDate, endDate, groupBy);
      return { points: result.points, cached: result.cached, updating: result.updating || undefined };
    } catch (err) {
      console.error(`[wb-analytics:${entity}] getTimeSeries failed: ${err instanceof Error ? err.message : String(err)}`);
      return { points: [] as WbTimeSeriesPoint[], cached: false, updating: false };
    }
  }

  // No entity — sum across all
  const groups = groupNmIdsByEntity(nmIds);
  const configuredEntities = new Set(getConfiguredEntities());
  for (const e of groups.keys()) {
    if (!configuredEntities.has(e)) groups.delete(e);
  }
  if (groups.size === 0) return { points: [], cached: false, updating: false };

  const results = await Promise.all(
    [...groups.entries()].map(async ([e, entityNmIds]) => {
      const svc = getService(e);
      if (!svc) return { points: [] as WbTimeSeriesPoint[], cached: true };
      try {
        return await svc.getTimeSeries(entityNmIds, startDate, endDate, groupBy);
      } catch (err) {
        console.error(`[wb-analytics:${e}] getTimeSeries failed: ${err instanceof Error ? err.message : String(err)}`);
        return { points: [] as WbTimeSeriesPoint[], cached: false, updating: false };
      }
    })
  );

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
  const anyUpdating = results.some((r) => 'updating' in r && r.updating);
  return {
    points: [...mergedMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, metrics]) => ({ date, metrics })),
    cached: allCached,
    updating: anyUpdating || undefined,
  };
}
