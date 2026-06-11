import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  getAllProductMedia,
  getProductMediaForVariant,
  getProductMediaById,
  insertProductMediaRow,
  updateProductMedia,
  updateProductMediaTx,
  deleteProductMedia,
  getProductById,
} from '../../utils/dbStore';
import { withTransaction } from '../../utils/db';
import { upload, UPLOADS_DIR, detectMediaType } from '../../middleware/upload';
import { unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { RawProductMedia } from '../../types';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

function buildUrl(filename: string): string {
  return `/uploads/${filename}`;
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

async function validateProductIds(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const id of ids) {
    const p = await getProductById(id);
    if (p) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }
  return { valid, invalid };
}

router.get('/', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : null;
    if (variantId) {
      res.json(await getProductMediaForVariant(variantId));
    } else {
      res.json(await getAllProductMedia());
    }
  } catch (err: any) {
    console.error('Media list failed:', err);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const item = await getProductMediaById(id);
    if (!item) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }
    res.json(item);
  } catch (err: any) {
    console.error('Media get failed:', err);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!(await ensureDb(req, res))) return;
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

      const { valid, invalid } = await validateProductIds(variantIds);
      if (valid.length === 0) {
        try { unlinkSync(resolve(UPLOADS_DIR, file.filename)); } catch { /* ignore */ }
        res.status(400).json({ error: 'None of the provided variantIds match existing products' });
        return;
      }
      if (invalid.length > 0) {
        try { unlinkSync(resolve(UPLOADS_DIR, file.filename)); } catch { /* ignore */ }
        res.status(400).json({
          error: 'Some variantIds do not match existing products',
          invalidIds: invalid,
        });
        return;
      }

      const created = await withTransaction(async ({ query: txQuery }) => {
        const out: RawProductMedia[] = [];

        if (isPrimary) {
          for (const vid of valid) {
            const existingForVariant = await getProductMediaForVariant(vid);
            for (const m of existingForVariant) {
              if (m.isPrimary) await updateProductMediaTx(txQuery, m.id, { isPrimary: false });
            }
          }
        }

        for (const vid of valid) {
          const existingForVariant = await getProductMediaForVariant(vid);
          const newItem: RawProductMedia = {
            id: '',
            variantId: vid,
            mediaType: type,
            url: buildUrl(file.filename),
            fileName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            isPrimary,
            sortOrder: existingForVariant.length,
            uploadedAt: new Date().toISOString(),
          };
          const createdItem = await insertProductMediaRow(newItem, txQuery);
          out.push(createdItem);
        }

        return out;
      });

      res.status(201).json(created);
    } catch (err: any) {
      console.error('Media upload failed:', err);
      res.status(500).json({ error: 'Upload failed', detail: err?.message ?? String(err) });
    }
  }
);

router.patch('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    const updated = await updateProductMedia(id, (req.body || {}) as Partial<RawProductMedia>);
    if (!updated) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    console.error('Media update failed:', err);
    res.status(500).json({ error: 'Update failed', detail: err?.message ?? String(err) });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Missing media id' });
      return;
    }
    const item = await getProductMediaById(id);
    if (!item) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    const all = await getAllProductMedia();
    const otherRefs = all.filter((m) => m.url === item.url && m.id !== id);

    if (item.url.startsWith('/uploads/') && otherRefs.length === 0) {
      const filePath = resolve(UPLOADS_DIR, item.url.replace(/^\/uploads\//, ''));
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
      }
    }

    await deleteProductMedia(id);
    res.json({ ok: true, id });
  } catch (err: any) {
    console.error('Media delete failed:', err);
    res.status(500).json({ error: 'Delete failed', detail: err?.message ?? String(err) });
  }
});

export default router;
