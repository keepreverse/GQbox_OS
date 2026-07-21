import { Router, Request, Response } from 'express';
import { readCollection, writeCollection, migrateMarketplaceListings } from '../../utils/jsonStore';
import type { MarketplaceListing } from '../../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const items = readCollection<MarketplaceListing>('marketplaceListings');
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const items = readCollection<MarketplaceListing>('marketplaceListings');
    const item = items.find((d) => d.id === req.params.id);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { marketplace, entity, article, title, kind, skus } = req.body || {};
    if (!marketplace || !entity || !article || !title) {
      res.status(400).json({ error: 'Missing required fields: marketplace, entity, article, title' });
      return;
    }
    const items = readCollection<MarketplaceListing>('marketplaceListings');
    const id = `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const item: MarketplaceListing = {
      id,
      marketplace,
      entity,
      article,
      title,
      kind: kind || 'single',
      skus: skus || [],
      createdAt: now,
      updatedAt: now,
    };
    items.push(item);
    writeCollection('marketplaceListings', items);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const items = readCollection<MarketplaceListing>('marketplaceListings');
    const idx = items.findIndex((d) => d.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
    const merged: MarketplaceListing = {
      ...items[idx],
      ...req.body,
      id: items[idx].id,
      updatedAt: new Date().toISOString(),
    };
    items[idx] = merged;
    writeCollection('marketplaceListings', items);
    res.json(merged);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const items = readCollection<MarketplaceListing>('marketplaceListings');
    const idx = items.findIndex((d) => d.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
    const removed = items.splice(idx, 1)[0];
    writeCollection('marketplaceListings', items);
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/migrate', (_req: Request, res: Response) => {
  try {
    const result = migrateMarketplaceListings();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
