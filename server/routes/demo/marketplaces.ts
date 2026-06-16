import { Router, Request, Response } from 'express';
import { readCollection, writeCollection } from '../../utils/jsonStore';
import type { MarketplaceListing, Marketplace, ListingKind } from '../../types';

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

// GET /api/demo/marketplaces
router.get('/', (_req: Request, res: Response) => {
  try {
    const listings = readCollection<MarketplaceListing>('marketplaces');
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/demo/marketplaces/by-sku/:sku
router.get('/by-sku/:sku', (req: Request, res: Response) => {
  try {
    const sku = param(req, 'sku');
    const all = readCollection<MarketplaceListing>('marketplaces');
    const matched = all.filter((l) => l.skus.includes(sku));
    res.json(matched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/demo/marketplaces/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const all = readCollection<MarketplaceListing>('marketplaces');
    const found = all.find((l) => l.id === id);
    if (!found) {
      res.status(404).json({ error: 'Marketplace listing not found' });
      return;
    }
    res.json(found);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/demo/marketplaces
router.post('/', (req: Request, res: Response) => {
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

    const all = readCollection<MarketplaceListing>('marketplaces');
    const now = new Date().toISOString();
    const id =
      body.id ?? `ml-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const created: MarketplaceListing = {
      id,
      marketplace: body.marketplace,
      article: body.article,
      title: body.title,
      kind: body.kind,
      skus: body.skus.filter((s): s is string => typeof s === 'string'),
      createdAt: now,
      updatedAt: now,
    };
    // UNIQUE по (marketplace, article)
    if (all.some((l) => l.marketplace === created.marketplace && l.article === created.article)) {
      res.status(409).json({ error: 'Listing with this marketplace+article already exists' });
      return;
    }
    all.push(created);
    writeCollection<MarketplaceListing>('marketplaces', all);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/demo/marketplaces/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const body = (req.body || {}) as Partial<MarketplaceListing>;
    const all = readCollection<MarketplaceListing>('marketplaces');
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Marketplace listing not found' });
      return;
    }
    const updated: MarketplaceListing = {
      ...all[idx],
      ...(body.marketplace !== undefined && isValidMarketplace(body.marketplace)
        ? { marketplace: body.marketplace }
        : {}),
      ...(body.article !== undefined ? { article: body.article } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.kind !== undefined && isValidKind(body.kind) ? { kind: body.kind } : {}),
      ...(body.skus !== undefined && Array.isArray(body.skus)
        ? { skus: body.skus.filter((s): s is string => typeof s === 'string') }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    writeCollection<MarketplaceListing>('marketplaces', all);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/demo/marketplaces/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const all = readCollection<MarketplaceListing>('marketplaces');
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Marketplace listing not found' });
      return;
    }
    const removed = all.splice(idx, 1)[0];
    writeCollection<MarketplaceListing>('marketplaces', all);
    res.json({ ok: true, id: removed.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
