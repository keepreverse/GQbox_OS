import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  getAllMarketplaceListings,
  getMarketplaceListingsBySku,
  getMarketplaceListingById,
  createMarketplaceListing,
  updateMarketplaceListing,
  deleteMarketplaceListing,
} from '../../utils/dbStore';
import type { MarketplaceListing, Marketplace, ListingKind } from '../../types';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

function isValidMarketplace(v: unknown): v is Marketplace {
  return v === 'wb' || v === 'ozon';
}

function isValidKind(v: unknown): v is ListingKind {
  return v === 'single' || v === 'bundle';
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

// GET /api/dev/marketplaces
router.get('/', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const listings = await getAllMarketplaceListings();
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/marketplaces/by-sku/:sku
router.get('/by-sku/:sku', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const sku = param(req, 'sku');
    const matched = await getMarketplaceListingsBySku(sku);
    res.json(matched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/marketplaces/:id
router.get('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const found = await getMarketplaceListingById(id);
    if (!found) {
      res.status(404).json({ error: 'Marketplace listing not found' });
      return;
    }
    res.json(found);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/marketplaces
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const body = (req.body || {}) as Partial<MarketplaceListing>;
    if (!body.marketplace || !isValidMarketplace(body.marketplace)) {
      res.status(400).json({ error: 'Invalid marketplace' });
      return;
    }
    if (!body.article || typeof body.article !== 'string') {
      res.status(400).json({ error: 'article is required' });
      return;
    }
    if (!body.title || typeof body.title !== 'string') {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (!body.kind || !isValidKind(body.kind)) {
      res.status(400).json({ error: 'Invalid kind' });
      return;
    }
    if (!Array.isArray(body.skus)) {
      res.status(400).json({ error: 'skus must be an array' });
      return;
    }
    const created = await createMarketplaceListing({
      marketplace: body.marketplace,
      article: body.article,
      title: body.title,
      kind: body.kind,
      skus: body.skus.filter((s): s is string => typeof s === 'string'),
    });
    res.status(201).json(created);
  } catch (err: any) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
      res.status(409).json({ error: 'Listing with this marketplace+article already exists' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

// PUT /api/dev/marketplaces/:id
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const body = (req.body || {}) as Partial<MarketplaceListing>;
    const updated = await updateMarketplaceListing(id, {
      ...(body.marketplace !== undefined && isValidMarketplace(body.marketplace)
        ? { marketplace: body.marketplace }
        : {}),
      ...(body.article !== undefined ? { article: body.article } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.kind !== undefined && isValidKind(body.kind) ? { kind: body.kind } : {}),
      ...(body.skus !== undefined && Array.isArray(body.skus)
        ? { skus: body.skus.filter((s): s is string => typeof s === 'string') }
        : {}),
    });
    if (!updated) {
      res.status(404).json({ error: 'Marketplace listing not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev/marketplaces/:id
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const removed = await deleteMarketplaceListing(id);
    if (!removed) {
      res.status(404).json({ error: 'Marketplace listing not found' });
      return;
    }
    res.json({ ok: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
