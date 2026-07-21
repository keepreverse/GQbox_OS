// ─── JSON file store for demo mode ────────────────────────────────────────
// Demo-режим пишет данные в server/data/*.json. .defaults/*.json —
// «эталонные» файлы, до которых можно откатиться через reset.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  CollectionName,
  DataBundle,
  DictionaryItem,
  MarketplaceListing,
  RawProduct,
  RawKitComponent,
  RawProductMedia,
  SkuListing,
} from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const DATA_DIR = resolve(__dirname, '..', 'data');
export const DEFAULTS_DIR = resolve(DATA_DIR, '.defaults');
export const UPLOADS_DIR = resolve(DATA_DIR, '..', 'uploads');

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function filePath(dir: string, name: CollectionName): string {
  return resolve(dir, `${name}.json`);
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  const raw = readFileSync(path, 'utf-8');
  if (!raw.trim()) return fallback;
  return JSON.parse(raw) as T;
}

function writeJson(path: string, data: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Live data (server/data/*.json) ──────────────────────────────────────

export function readCollection<T = unknown>(name: CollectionName): T[] {
  return readJson<T[]>(filePath(DATA_DIR, name), []);
}

export function writeCollection<T = unknown>(name: CollectionName, data: T[]): void {
  writeJson(filePath(DATA_DIR, name), data);
}

export function collectionExists(name: CollectionName): boolean {
  return existsSync(filePath(DATA_DIR, name));
}

// ─── Defaults (server/data/.defaults/*.json) ────────────────────────────

export function readDefaults<T = unknown>(name: CollectionName): T[] {
  return readJson<T[]>(filePath(DEFAULTS_DIR, name), []);
}

export function readDefaultsFromDir<T = unknown>(dir: string, name: CollectionName): T[] {
  return readJson<T[]>(filePath(resolve(DATA_DIR, dir), name), []);
}

export function defaultsExist(name: CollectionName): boolean {
  return existsSync(filePath(DEFAULTS_DIR, name));
}

/**
 * Восстанавливает одну коллекцию из defaults в live.
 * Возвращает количество восстановленных записей.
 */
export function restoreOne(name: CollectionName): number {
  const data = readDefaults<unknown>(name);
  writeCollection(name, data);
  return data.length;
}

/**
 * Полный reset всех коллекций из defaults. Если для какой-то коллекции
 * defaults нет — она просто пропускается.
 *
 * ВАЖНО: `productMedia` не восстанавливается — медиафайлы и их привязки
 * к артикулам сохраняются между сбросами, чтобы не терять загруженные файлы.
 * Физические файлы в server/uploads/ также не удаляются.
 */
export function restoreAllFromDir(dir: string): { restored: string[]; skipped: string[] } {
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const name of [
    'products',
    'categories',
    'models',
    'colors',
    'suppliers',
    'connectors',
    'chargingProtocols',
    'materials',
    'kitComponents',
  ] as CollectionName[]) {
    const data = readDefaultsFromDir<unknown>(dir, name);
    if (Array.isArray(data) && data.length > 0) {
      writeCollection(name, data);
      restored.push(name);
    } else {
      skipped.push(name);
    }
  }
  return { restored, skipped };
}

export function restoreAllFromDefaults(): { restored: string[]; skipped: string[] } {
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const name of [
    'products',
    'categories',
    'models',
    'colors',
    'suppliers',
    'connectors',
    'chargingProtocols',
    'materials',
    'kitComponents',
  ] as CollectionName[]) {
    if (defaultsExist(name)) {
      restoreOne(name);
      restored.push(name);
    } else {
      skipped.push(name);
    }
  }
  return { restored, skipped };
}

/**
 * Полностью очищает директорию загрузок.
 */
export function clearUploadsDir(): void {
  if (!existsSync(UPLOADS_DIR)) return;
  for (const f of readdirSync(UPLOADS_DIR)) {
    try {
      const p = resolve(UPLOADS_DIR, f);
      if (statSync(p).isFile()) unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

// ─── Bulk export / import ─────────────────────────────────────────────────

/**
 * Возвращает весь бандл данных одним объектом. Используется в /export.
 */
export function exportAll(): DataBundle {
  return {
    products: readCollection<RawProduct>('products'),
    categories: readCollection<DictionaryItem>('categories'),
    models: readCollection<DictionaryItem>('models'),
    colors: readCollection<DictionaryItem>('colors'),
    suppliers: readCollection<DictionaryItem>('suppliers'),
    connectors: readCollection<DictionaryItem>('connectors'),
    chargingProtocols: readCollection<DictionaryItem>('chargingProtocols'),
    materials: readCollection<DictionaryItem>('materials'),
    kitComponents: readCollection<RawKitComponent>('kitComponents'),
    mediaFiles: readCollection<import('../types').MediaFile>('mediaFiles'),
    mediaLinks: readCollection<import('../types').MediaLink>('mediaLinks'),
    productMedia: readCollection<RawProductMedia>('productMedia'),
    marketplaceListings: readCollection<MarketplaceListing>('marketplaceListings'),
    skuListings: readCollection<SkuListing>('skuListings'),
  };
}

/**
 * Применяет присланный бандл: каждая непустая коллекция перезаписывает
 * соответствующий live-файл. Возвращает список импортированных коллекций.
 */
export function importAll(bundle: Partial<DataBundle>, skipRebuild?: boolean): string[] {
  const imported: string[] = [];
  for (const name of [
    'products',
    'categories',
    'models',
    'colors',
    'suppliers',
    'connectors',
    'chargingProtocols',
    'materials',
    'kitComponents',
    'productMedia',
    'marketplaceListings',
  ] as CollectionName[]) {
    const data = (bundle as any)?.[name];
    if (Array.isArray(data) && data.length > 0) {
      writeCollection(name, data);
      imported.push(name);
    } else if (Array.isArray(data) && data.length === 0) {
      writeCollection(name, []);
      imported.push(name);
    }
  }
  // Always rebuild derived skuListings after import
  if (!skipRebuild) {
    rebuildSkuListings();
  }
  return imported;
}

/**
 * Полностью перестраивает sku_listings из двух источников:
 * 1. products.marketplace_skus (kind='single') — одна строка на SKU продукта
 * 2. marketplace_listings (kind='bundle') — развернуть skus[] в отдельные строки
 */
export function rebuildSkuListings(): { created: number } {
  const products = readCollection<RawProduct>('products');
  const listings = readCollection<MarketplaceListing>('marketplaceListings');
  const rows: SkuListing[] = [];

  for (const p of products) {
    if (!p.marketplaceSkus) continue;
    for (const ms of p.marketplaceSkus) {
      const kind = ms.kind ?? 'single';
      if (kind !== 'single') continue;
      rows.push({
        id: `sl-${p.sku}-${ms.marketplace}-${ms.entity}-${ms.article}`,
        sku: p.sku,
        marketplace: ms.marketplace,
        entity: ms.entity,
        article: ms.article,
        kind: 'single',
        title: ms.title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  for (const listing of listings) {
    if (listing.kind !== 'bundle') continue;
    for (const sku of listing.skus) {
      rows.push({
        id: `sl-${sku}-${listing.marketplace}-${listing.entity}-${listing.article}`,
        sku,
        marketplace: listing.marketplace,
        entity: listing.entity,
        article: listing.article,
        kind: 'bundle',
        listingId: listing.id,
        title: listing.title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  writeCollection('skuListings', rows);
  return { created: rows.length };
}

/**
 * Извлекает bundle-записи из marketplaceSkus всех продуктов,
 * создаёт/обновляет marketplace_listings и удаляет bundle-записи из продуктов.
 */
export function migrateMarketplaceListings(): { created: number; updated: number; removed: number } {
  const products = readCollection<RawProduct>('products');
  const existingListings = readCollection<import('../types').MarketplaceListing>('marketplaceListings');
  const listingMap = new Map<string, { listing: Omit<import('../types').MarketplaceListing, 'id' | 'createdAt' | 'updatedAt'>; productSkus: Set<string> }>();

  for (const p of products) {
    if (!p.marketplaceSkus) continue;
    for (const ms of p.marketplaceSkus) {
      if (ms.kind !== 'bundle') continue;
      const key = `${ms.marketplace}:${ms.entity}:${ms.article}`;
      if (!listingMap.has(key)) {
        listingMap.set(key, {
          listing: { marketplace: ms.marketplace, entity: ms.entity, article: ms.article, title: ms.title, kind: ms.kind, skus: [] },
          productSkus: new Set(),
        });
      }
      listingMap.get(key)!.productSkus.add(p.sku);
    }
  }

  let created = 0;
  let updated = 0;

  for (const [, data] of listingMap) {
    const skus = Array.from(data.productSkus).sort();
    const existing = existingListings.find(
      (l) => l.marketplace === data.listing.marketplace && l.entity === data.listing.entity && l.article === data.listing.article
    );
    if (existing) {
      existing.skus = Array.from(new Set([...existing.skus, ...skus])).sort();
      existing.updatedAt = new Date().toISOString();
      updated++;
    } else {
      const now = new Date().toISOString();
      existingListings.push({
        id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...data.listing,
        skus,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }
  }

  // Remove bundle entries from individual products
  let removed = 0;
  for (const p of products) {
    if (!p.marketplaceSkus || p.marketplaceSkus.length === 0) continue;
    const oldLen = p.marketplaceSkus.length;
    p.marketplaceSkus = p.marketplaceSkus.filter((s) => s.kind !== 'bundle');
    removed += oldLen - p.marketplaceSkus.length;
  }

  writeCollection('marketplaceListings', existingListings);
  if (removed > 0) {
    writeCollection('products', products);
  }

  // Rebuild derived skuListings
  rebuildSkuListings();

  return { created, updated, removed };
}
