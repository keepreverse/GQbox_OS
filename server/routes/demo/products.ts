import { Router, Request, Response } from 'express';
import { readCollection, writeCollection } from '../../utils/jsonStore';
import type { RawProduct, RawKitComponent } from '../../types';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

function getNextProductId(products: RawProduct[]): string {
  const maxNum = products.reduce((max, p) => {
    const num = parseInt((p.id || '').replace(/^p/, ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `p${maxNum + 1}`;
}

router.get('/', (_req: Request, res: Response) => {
  try {
    const products = readCollection<RawProduct>('products');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').toLowerCase();
    const products = readCollection<RawProduct>('products');
    if (!q) {
      res.json(products);
      return;
    }
    const filtered = products.filter(
      (p) =>
        (p.sku || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
    );
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const products = readCollection<RawProduct>('products');
    const id = param(req, 'id');
    const product = products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    if (!raw.sku) {
      res.status(400).json({ error: 'sku is required' });
      return;
    }
    const products = readCollection<RawProduct>('products');
    const id = getNextProductId(products);
    const product: RawProduct = { ...raw, id };
    products.push(product);
    writeCollection('products', products);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const products = readCollection<RawProduct>('products');
    const id = param(req, 'id');
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    products[idx] = { ...products[idx], ...req.body };
    writeCollection('products', products);
    res.json(products[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const products = readCollection<RawProduct>('products');
    const id = param(req, 'id');
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const removed = products.splice(idx, 1)[0];
    writeCollection('products', products);
    // Also clean up kit components
    const kitComponents = readCollection<RawKitComponent>('kitComponents');
    const cleaned = kitComponents.filter((k) => k.kitId !== id);
    writeCollection('kitComponents', cleaned);
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;