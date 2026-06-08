import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../utils/dbStore';
import type { RawProduct } from '../../types';

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

// GET /api/dev/products
router.get('/', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/products/search?q=...
router.get('/search', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) {
      res.json(await getAllProducts());
      return;
    }
    res.json(await searchProducts(q));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const product = await getProductById(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/products
router.post('/', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const raw = (req.body || {}) as Partial<RawProduct>;
    if (!raw.sku) {
      res.status(400).json({ error: 'sku is required' });
      return;
    }
    const created = await createProduct({ ...raw, sku: raw.sku });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dev/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const updated = await updateProduct(id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const removed = await deleteProduct(id);
    if (!removed) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
