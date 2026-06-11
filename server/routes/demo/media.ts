import { Router, Request, Response } from 'express';
import { readCollection, writeCollection, UPLOADS_DIR } from '../../utils/jsonStore';
import { upload, detectMediaType } from '../../middleware/upload';
import { unlinkSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { RawProductMedia } from '../../types';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

function nextMediaId(items: RawProductMedia[]): string {
  const max = items.reduce((m, x) => {
    const n = parseInt((x.id || '').replace(/^pm/, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `pm${max + 1}`;
}

function buildUrl(filename: string): string {
  return `/uploads/${filename}`;
}

function toPublic(m: RawProductMedia): RawProductMedia {
  return { ...m };
}

function parseVariantIds(raw: unknown): string[] {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function validateProductIds(ids: string[], allProducts: { id: string }[]): string[] {
  const valid = new Set(allProducts.map((p) => p.id));
  return ids.filter((id) => valid.has(id));
}

const PRODUCTS_PATH = resolve(process.cwd(), 'server', 'data', 'products.json');

function readAllProducts(): { id: string }[] {
  try {
    return JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

router.get('/', (req: Request, res: Response) => {
  try {
    const all = readCollection<RawProductMedia>('productMedia');
    const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : null;
    const filtered = variantId ? all.filter((m) => m.variantId === variantId) : all;
    const sorted = [...filtered].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    res.json(sorted.map(toPublic));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const all = readCollection<RawProductMedia>('productMedia');
    const m = all.find((x) => x.id === id);
    if (!m) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }
    res.json(toPublic(m));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  upload.single('file'),
  (req: Request, res: Response) => {
    try {
      const file = (req as any).file as
        | { filename: string; originalname: string; mimetype: string; size: number }
        | undefined;
      if (!file) {
        res.status(400).json({ error: 'No file uploaded (field "file" is required)' });
        return;
      }

      const raw = String(req.body?.variantIds ?? '[]');
      const variantIds = parseVariantIds(raw);
      const isPrimary = String(req.body?.isPrimary ?? 'false').toLowerCase() === 'true';

      const type = detectMediaType(file.mimetype);
      if (!type) {
        try { unlinkSync(resolve(UPLOADS_DIR, file.filename)); } catch { /* ignore */ }
        res.status(400).json({ error: `Unsupported mime type: ${file.mimetype}` });
        return;
      }

      if (variantIds.length === 0) {
        try { unlinkSync(resolve(UPLOADS_DIR, file.filename)); } catch { /* ignore */ }
        res.status(400).json({ error: 'At least one valid variantId is required' });
        return;
      }

      const allProducts = readAllProducts();
      const validIds = validateProductIds(variantIds, allProducts);
      if (validIds.length === 0) {
        try { unlinkSync(resolve(UPLOADS_DIR, file.filename)); } catch { /* ignore */ }
        res.status(400).json({ error: 'None of the provided variantIds match existing products' });
        return;
      }

      if (validIds.length !== variantIds.length) {
        try { unlinkSync(resolve(UPLOADS_DIR, file.filename)); } catch { /* ignore */ }
        res.status(400).json({
          error: 'Some variantIds do not match existing products',
          invalidIds: variantIds.filter((id) => !validIds.includes(id)),
        });
        return;
      }

      const all = readCollection<RawProductMedia>('productMedia');
      const created: RawProductMedia[] = [];

      if (isPrimary) {
        for (const vid of validIds) {
          for (let i = 0; i < all.length; i++) {
            if (all[i].variantId === vid) {
              all[i] = { ...all[i], isPrimary: false };
            }
          }
        }
      }

      for (const vid of validIds) {
        const existingCount = all.filter((m) => m.variantId === vid).length;
        const id = nextMediaId(all);
        const newItem: RawProductMedia = {
          id,
          variantId: vid,
          mediaType: type,
          url: buildUrl(file.filename),
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          isPrimary,
          sortOrder: existingCount,
          uploadedAt: new Date().toISOString(),
        };
        all.push(newItem);
        created.push(newItem);
      }

      writeCollection('productMedia', all);
      res.status(201).json(created.map(toPublic));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const all = readCollection<RawProductMedia>('productMedia');
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }
    const patch = (req.body || {}) as Partial<RawProductMedia>;
    const updated: RawProductMedia = {
      ...all[idx],
      isPrimary:
        typeof patch.isPrimary === 'boolean' ? patch.isPrimary : all[idx].isPrimary,
      sortOrder:
        typeof patch.sortOrder === 'number' ? patch.sortOrder : all[idx].sortOrder,
    };
    const next = [...all];
    if (updated.isPrimary) {
      for (let i = 0; i < next.length; i++) {
        if (i !== idx && next[i].variantId === updated.variantId) {
          next[i] = { ...next[i], isPrimary: false };
        }
      }
    }
    next[idx] = updated;
    writeCollection('productMedia', next);
    res.json(toPublic(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const all = readCollection<RawProductMedia>('productMedia');
    const item = all.find((m) => m.id === id);
    if (!item) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    const otherRefs = all.filter((m) => m.url === item.url && m.id !== id);
    if (item.url.startsWith('/uploads/') && otherRefs.length === 0) {
      const filePath = resolve(UPLOADS_DIR, item.url.replace(/^\/uploads\//, ''));
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
      }
    }

    const next = all.filter((m) => m.id !== id);
    writeCollection('productMedia', next);
    res.json({ ok: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
