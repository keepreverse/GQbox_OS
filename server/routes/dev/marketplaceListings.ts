import { Router, Request, Response } from 'express';
import {
  getAllMarketplaceListings,
  getMarketplaceListingById,
  createMarketplaceListing,
  updateMarketplaceListing,
  deleteMarketplaceListing,
  migrateMarketplaceListings,
} from '../../utils/dbStore';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await getAllMarketplaceListings();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await getMarketplaceListingById(id);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { marketplace, entity, article, title, kind, skus } = req.body || {};
    if (!marketplace || !entity || !article || !title) {
      res.status(400).json({ error: 'Missing required fields: marketplace, entity, article, title' });
      return;
    }
    const item = await createMarketplaceListing({
      marketplace,
      entity,
      article,
      title,
      kind: kind || 'single',
      skus: skus || [],
    });
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await getMarketplaceListingById(id);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    const item = await updateMarketplaceListing(id, req.body);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await deleteMarketplaceListing(id);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/migrate', async (_req: Request, res: Response) => {
  try {
    const result = await migrateMarketplaceListings();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
