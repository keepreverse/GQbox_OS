import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  truncateAll,
  exportAll,
  importAll,
} from '../../utils/dbStore';
import { initSchema, query } from '../../utils/db';
import { readDefaults } from '../../utils/jsonStore';
import { COLLECTIONS } from '../../types';
import {
  productInsertSql,
  productToDbParams,
  dictInsertSql,
  dictNameToJson,
  sanitizeDictItem,
} from '../../utils/mappers';
import type { DataBundle, RawProduct, DictionaryItem } from '../../types';

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
  const seeded: string[] = [];
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    const data = readDefaults<unknown>(name);
    if (!Array.isArray(data) || data.length === 0) continue;
    if (name === 'products') {
      for (const p of data as RawProduct[]) {
        if (!p.id || !p.sku) continue;
        const vals = productToDbParams(p as any);
        await query(productInsertSql(), vals);
      }
    } else {
      for (const item of data as DictionaryItem[]) {
        if (!item.id) continue;
        const cleaned = sanitizeDictItem(item);
        const vals = [
          cleaned.id,
          name,
          dictNameToJson(cleaned),
          cleaned.categoryId ?? cleaned.parentId ?? null,
          cleaned.code ?? null,
          cleaned.color ?? cleaned.hex ?? cleaned.hexValue ?? null,
          cleaned.icon ?? null,
          cleaned.description ?? null,
          cleaned.contactInfo ?? null,
          cleaned.shortName ? JSON.stringify(cleaned.shortName) : null,
          cleaned.sortOrder ?? 0,
        ];
        await query(dictInsertSql(), vals);
      }
    }
    counts[name] = data.length;
    seeded.push(name);
  }
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
    res.json({ ok: true, mode: 'dev', ...result });
  } catch (err: any) {
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
    res.json({ ok: true, mode: 'dev', collections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
