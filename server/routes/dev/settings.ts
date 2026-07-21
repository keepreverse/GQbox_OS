import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  truncateAll,
  exportAll,
  importAll,
  migrateMarketplaceListings,
} from '../../utils/dbStore';
import { initSchema } from '../../utils/db';
import { readDefaults, readDefaultsFromDir, readCollection } from '../../utils/jsonStore';
import { COLLECTIONS } from '../../types';
import type { DataBundle } from '../../types';

const router = Router();

async function ensureDb(_req: Request, res: Response): Promise<boolean> {
  const ok = await isDbAvailable();
  if (!ok) {
    res.status(503).json({
      error: 'PostgreSQL is not available. Start it via `npm run db:start` and try again.',
    });
    return false;
  }
  return true;
}

/**
 * Полный цикл: TRUNCATE + пересоздание схемы + наполнение начальными
 * данными из server/data/.defaults/*.json. Тот же baseline, что
 * использует demo-режим, чтобы оба режима стартовали одинаково.
 */
async function seedFromJsonDefaults(): Promise<{ seeded: string[]; counts: Record<string, number> }> {
  await truncateAll();
  await initSchema();
  const bundle: Partial<DataBundle> = {};
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const data = readDefaults<unknown>(name);
    if (!Array.isArray(data) || data.length === 0) continue;
    (bundle as any)[name] = data;
    counts[name] = data.length;
  }
  const seeded = await importAll(bundle);
  return { seeded, counts };
}

/**
 * Полный seed из live-данных (server/data/*.json) — копирует поведение
 * `npm run db:seed`. TRUNCATE + initSchema + seed из live JSON.
 */
async function seedFromLiveData(): Promise<{ seeded: string[]; counts: Record<string, number> }> {
  await truncateAll();
  await initSchema();
  const bundle: Partial<DataBundle> = {};
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const data = readCollection<unknown>(name);
    if (!Array.isArray(data) || data.length === 0) continue;
    (bundle as any)[name] = data;
    counts[name] = data.length;
  }
  const seeded = await importAll(bundle);
  return { seeded, counts };
}

/**
 * То же, что seedFromJsonDefaults, но читает JSON из произвольной
 * поддиректории server/data/{dir}/.
 */
async function seedFromJsonDefaultsDir(dir: string): Promise<{ seeded: string[]; counts: Record<string, number> }> {
  await truncateAll();
  await initSchema();
  const bundle: Partial<DataBundle> = {};
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const data = readDefaultsFromDir<unknown>(dir, name);
    if (!Array.isArray(data) || data.length === 0) continue;
    (bundle as any)[name] = data;
    counts[name] = data.length;
  }
  const seeded = await importAll(bundle);
  return { seeded, counts };
}

// GET /api/dev/health
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const ok = await isDbAvailable();
    res.json({ ok, mode: 'dev', database: 'postgresql' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/dev/reset — TRUNCATE + seed from JSON defaults
router.post('/reset', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const result = await seedFromJsonDefaults();
    const migrate = await migrateMarketplaceListings();
    res.json({ ok: true, mode: 'dev', ...result, migrate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/reset-from — TRUNCATE + seed from custom directory (e.g. .defaults_2)
router.post('/reset-from', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const { source } = req.body || {};
    if (!source || typeof source !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "source" in request body' });
      return;
    }
    const result = await seedFromJsonDefaultsDir(source);
    const migrate = await migrateMarketplaceListings();
    res.json({ ok: true, mode: 'dev', source, ...result, migrate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/seed — full seed from live JSON data (same as npm run db:seed)
router.post('/seed', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const result = await seedFromLiveData();
    const migrate = await migrateMarketplaceListings();
    res.json({ ok: true, mode: 'dev', ...result, migrate });
  } catch (err: any) {
    console.error('POST /api/dev/seed failed:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/export — выгрузить все таблицы в JSON-бандл
router.get('/export', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const bundle = await exportAll();
    res.json(bundle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/import — заменить данные в БД из бандла
router.post('/import', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const bundle = (req.body || {}) as Partial<DataBundle>;
    if (!bundle || typeof bundle !== 'object') {
      res.status(400).json({ error: 'Invalid import data: expected object' });
      return;
    }
    const collections = await importAll(bundle);
    const migrate = bundle.marketplaceListings ? { skipped: true } : await migrateMarketplaceListings();
    res.json({ ok: true, mode: 'dev', collections, migrate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
