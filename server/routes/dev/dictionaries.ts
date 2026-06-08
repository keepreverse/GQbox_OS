import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  getDictionary,
  createDictionaryItem,
  updateDictionaryItem,
  deleteDictionaryItem,
} from '../../utils/dbStore';
import { isDictType, type DictionaryItem } from '../../types';
import { sanitizeDictItem } from '../../utils/mappers';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

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

// GET /api/dev/dictionaries/:type
router.get('/:type', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const type = param(req, 'type');
    if (!isDictType(type)) {
      res.status(400).json({
        error: `Unknown dictionary type: ${type}`,
      });
      return;
    }
    res.json(await getDictionary(type));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/dictionaries/:type
router.post('/:type', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const type = param(req, 'type');
    if (!isDictType(type)) {
      res.status(400).json({ error: `Unknown dictionary type: ${type}` });
      return;
    }
    const item = (req.body || {}) as DictionaryItem;
    if (!item.id) {
      res.status(400).json({ error: 'Field "id" is required' });
      return;
    }
    const existing = await getDictionary(type);
    if (existing.some((d) => d.id === item.id)) {
      res.status(409).json({ error: `Item with id "${item.id}" already exists in ${type}` });
      return;
    }
    const created = await createDictionaryItem(type, sanitizeDictItem(item));
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dev/dictionaries/:type/:id
router.put('/:type/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const type = param(req, 'type');
    const id = param(req, 'id');
    if (!isDictType(type)) {
      res.status(400).json({ error: `Unknown dictionary type: ${type}` });
      return;
    }
    const updated = await updateDictionaryItem(type, id, sanitizeDictItem(req.body || {}));
    if (!updated) {
      res.status(404).json({ error: `Item "${id}" not found in ${type}` });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev/dictionaries/:type/:id
router.delete('/:type/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const type = param(req, 'type');
    const id = param(req, 'id');
    if (!isDictType(type)) {
      res.status(400).json({ error: `Unknown dictionary type: ${type}` });
      return;
    }
    const removed = await deleteDictionaryItem(type, id);
    if (!removed) {
      res.status(404).json({ error: `Item "${id}" not found in ${type}` });
      return;
    }
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
