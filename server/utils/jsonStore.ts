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
  RawProduct,
  RawKitComponent,
  RawProductMedia,
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
    productMedia: readCollection<RawProductMedia>('productMedia'),
  };
}

/**
 * Применяет присланный бандл: каждая непустая коллекция перезаписывает
 * соответствующий live-файл. Возвращает список импортированных коллекций.
 */
export function importAll(bundle: Partial<DataBundle>): string[] {
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
  ] as CollectionName[]) {
    const data = (bundle as any)?.[name];
    if (Array.isArray(data) && data.length > 0) {
      writeCollection(name, data);
      imported.push(name);
    } else if (Array.isArray(data) && data.length === 0) {
      // Пустой массив — это явный сигнал «очистить коллекцию».
      writeCollection(name, []);
      imported.push(name);
    }
  }
  return imported;
}
