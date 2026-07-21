import { Router, Request, Response } from 'express';
import { readCollection, writeCollection, rebuildSkuListings } from '../../utils/jsonStore';
import type { SkuListing } from '../../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    let items = readCollection<SkuListing>('skuListings');
    if (items.length === 0) {
      rebuildSkuListings();
      items = readCollection<SkuListing>('skuListings');
    }
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const items = readCollection<SkuListing>('skuListings');
    const item = items.find((d) => d.id === req.params.id);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { sku, marketplace, entity, article, kind, listingId, title } = req.body || {};
    if (!sku || !marketplace || !entity || !article) {
      res.status(400).json({ error: 'Missing required fields: sku, marketplace, entity, article' });
      return;
    }
    const items = readCollection<SkuListing>('skuListings');
    const id = `sl-${sku}-${marketplace}-${entity}-${article}`;
    const now = new Date().toISOString();
    const item: SkuListing = {
      id,
      sku,
      marketplace,
      entity,
      article,
      kind: kind || 'single',
      listingId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    items.push(item);
    writeCollection('skuListings', items);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const items = readCollection<SkuListing>('skuListings');
    const idx = items.findIndex((d) => d.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
    const removed = items.splice(idx, 1)[0];
    writeCollection('skuListings', items);
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rebuild', (_req: Request, res: Response) => {
  try {
    const result = rebuildSkuListings();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
