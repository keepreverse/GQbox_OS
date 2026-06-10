import { Router, Request, Response } from 'express';
import { readCollection, writeCollection } from '../../utils/jsonStore';
import type { RawKitComponent } from '../../types';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

// GET /api/demo/kit-components — all kit-component links
router.get('/', (_req: Request, res: Response) => {
  try {
    const kitComponents = readCollection<RawKitComponent>('kitComponents');
    res.json(kitComponents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/demo/kit-components/:kitId — components for a specific kit
router.get('/:kitId', (req: Request, res: Response) => {
  try {
    const kitComponents = readCollection<RawKitComponent>('kitComponents');
    const kitId = param(req, 'kitId');
    const result = kitComponents.filter((k) => k.kitId === kitId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/demo/kit-components/:kitId — add/update a component
router.post('/:kitId', (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const kitId = param(req, 'kitId');
    const kitComponents = readCollection<RawKitComponent>('kitComponents');
    const existingIdx = kitComponents.findIndex(
      (k) => k.kitId === kitId && k.componentId === raw.componentId
    );
    const item: RawKitComponent = {
      kitId,
      componentId: raw.componentId,
      quantity: raw.quantity ?? 1,
      sortOrder: raw.sortOrder ?? 0,
    };
    if (existingIdx !== -1) {
      kitComponents[existingIdx] = item;
    } else {
      kitComponents.push(item);
    }
    writeCollection('kitComponents', kitComponents);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/demo/kit-components/:kitId/:componentId — remove a component
router.delete('/:kitId/:componentId', (req: Request, res: Response) => {
  try {
    const kitComponents = readCollection<RawKitComponent>('kitComponents');
    const kitId = param(req, 'kitId');
    const componentId = param(req, 'componentId');
    const cleaned = kitComponents.filter(
      (k) => !(k.kitId === kitId && k.componentId === componentId)
    );
    writeCollection('kitComponents', cleaned);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
