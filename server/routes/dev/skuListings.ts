import { Router, Request, Response } from 'express';
import {
  getAllSkuListings,
  getSkuListingById,
  createSkuListing,
  deleteSkuListing,
  rebuildSkuListings,
} from '../../utils/dbStore';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    let items = await getAllSkuListings();
    if (items.length === 0) {
      await rebuildSkuListings();
      items = await getAllSkuListings();
    }
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await getSkuListingById(id);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { sku, marketplace, entity, article, kind, listingId, title } = req.body || {};
    if (!sku || !marketplace || !entity || !article) {
      res.status(400).json({ error: 'Missing required fields: sku, marketplace, entity, article' });
      return;
    }
    const item = await createSkuListing({
      sku,
      marketplace,
      entity,
      article,
      kind: kind || 'single',
      listingId,
      title,
    });
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await deleteSkuListing(id);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rebuild', async (_req: Request, res: Response) => {
  try {
    const result = await rebuildSkuListings();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
