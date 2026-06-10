import { Router, Request, Response } from 'express';
import { restoreAllFromDefaults, exportAll, importAll } from '../../utils/jsonStore';

const router = Router();

router.post('/reset', (_req: Request, res: Response) => {
  try {
    const result = restoreAllFromDefaults();
    res.json({ ok: true, ...result });
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
    res.json({ ok: true, collections: imported });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seed', (_req: Request, res: Response) => {
  res.status(400).json({ error: 'Seed is only available in dev mode (PostgreSQL).' });
});

export default router;