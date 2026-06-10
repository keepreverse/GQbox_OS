import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  getKitComponents,
  getAllKitComponents,
  createKitComponent,
  deleteKitComponent,
} from '../../utils/dbStore';
import type { RawKitComponent } from '../../types';

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

// GET /api/dev/kit-components — all kit-component links
router.get('/', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const rows = await getAllKitComponents();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/kit-components/:kitId — components for a specific kit
router.get('/:kitId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const kitId = param(req, 'kitId');
    const components = await getKitComponents(kitId);
    res.json(components);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/kit-components/:kitId — add/update a component
router.post('/:kitId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const kitId = param(req, 'kitId');
    const raw = (req.body || {}) as Partial<RawKitComponent>;
    const component = await createKitComponent({
      kitId,
      componentId: raw.componentId || '',
      quantity: raw.quantity ?? 1,
      sortOrder: raw.sortOrder ?? 0,
    });
    res.status(201).json(component);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev/kit-components/:kitId/:componentId — remove a component
router.delete('/:kitId/:componentId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const kitId = param(req, 'kitId');
    const componentId = param(req, 'componentId');
    await deleteKitComponent(kitId, componentId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
