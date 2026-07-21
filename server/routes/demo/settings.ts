import { Router, Request, Response } from 'express';
import { restoreAllFromDefaults, restoreAllFromDir, migrateMarketplaceListings, exportAll, importAll } from '../../utils/jsonStore';

const router = Router();

router.post('/reset', (_req: Request, res: Response) => {
  try {
    const result = restoreAllFromDefaults();
    // After reset, auto-migrate bundle entries into marketplace_listings
    const migrate = migrateMarketplaceListings();
    res.json({ ok: true, ...result, migrate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-from', (req: Request, res: Response) => {
  try {
    const { source } = req.body || {};
    if (!source || typeof source !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "source" in request body' });
      return;
    }
    const result = restoreAllFromDir(source);
    const migrate = migrateMarketplaceListings();
    res.json({ ok: true, source, ...result, migrate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', (_req: Request, res: Response) => {
  try {
    const dump = exportAll();
    res.json(dump);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', (req: Request, res: Response) => {
  const bundle = req.body;
  if (!bundle || typeof bundle !== 'object') {
    res.status(400).json({ error: 'Invalid import data: expected object' });
    return;
  }
  try {
    const imported = importAll(bundle);
    const migrate = bundle.marketplaceListings ? { skipped: true } : migrateMarketplaceListings();
    res.json({ ok: true, collections: imported, migrate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seed', (_req: Request, res: Response) => {
  res.status(400).json({ error: 'Seed is only available in dev mode (PostgreSQL).' });
});

export default router;