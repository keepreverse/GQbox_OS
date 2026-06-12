import { Router, Request, Response } from 'express';
import {
  isDbAvailable,
  getMediaFilesWithLinks,
  getAllMediaLinks,
  getMediaFileById,
  getMediaLinksForVariant,
  insertMediaFile,
  insertMediaLink,
  updateMediaLink,
  deleteMediaFile,
  deleteMediaLink,
  getProductById,
} from '../../utils/dbStore';
import { withTransaction } from '../../utils/db';
import { upload, UPLOADS_DIR, detectMediaType } from '../../middleware/upload';
import { unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { MediaFile, MediaLink } from '../../types';

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

// GET /media — все файлы с привязанными SKU
router.get('/', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : null;
    if (variantId) {
      const links = await getMediaLinksForVariant(variantId);
      res.json(links);
    } else {
      const files = await getMediaFilesWithLinks();
      res.json(files);
    }
  } catch (err: any) {
    console.error('Media list failed:', err);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

// GET /media/links — все связи (для кэширования на фронтенде)
// ВАЖНО: должен быть ДО /:fileId, иначе Express матчит "links" как fileId.
router.get('/links', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const links = await getAllMediaLinks();
    res.json(links);
  } catch (err: any) {
    console.error('Media links failed:', err);
    res.status(500).json({ error: 'Failed to load media links' });
  }
});

// GET /media/variant/:variantId — все связи для SKU
// ВАЖНО: должен быть ДО /:fileId.
router.get('/variant/:variantId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const variantId = param(req, 'variantId');
    const links = await getMediaLinksForVariant(variantId);
    res.json(links);
  } catch (err: any) {
    console.error('Media links failed:', err);
    res.status(500).json({ error: 'Failed to load media links' });
  }
});

// GET /media/:fileId — один файл
router.get('/:fileId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const id = param(req, 'fileId');
    const item = await getMediaFileById(id);
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

// POST /media — загрузка файла
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
        const mediaFile: MediaFile = {
          id: '',
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          url: buildUrl(file.filename),
          createdAt: new Date().toISOString(),
        };
        const savedFile = await insertMediaFile(mediaFile, txQuery);

        const out: MediaLink[] = [];
        for (let i = 0; i < valid.length; i++) {
          const vid = valid[i];
          const links = await getMediaLinksForVariant(vid);
          const link: MediaLink = {
            fileId: savedFile.id,
            variantId: vid,
            isPrimary: isPrimary && i === 0,
            sortOrder: links.length,
            uploadedAt: new Date().toISOString(),
          };
          if (link.isPrimary) {
            await txQuery(
              'UPDATE product_media_links SET is_primary = FALSE WHERE variant_id = $1',
              [vid]
            );
          }
          await insertMediaLink(link, txQuery);
          out.push(link);
        }
        return { file: savedFile, links: out };
      });

      res.status(201).json(created);
    } catch (err: any) {
      console.error('Media upload failed:', err);
      res.status(500).json({ error: 'Upload failed', detail: err?.message ?? String(err) });
    }
  }
);

// PATCH /media/:fileId/primary/:variantId — set primary
router.patch('/:fileId/primary/:variantId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const fileId = param(req, 'fileId');
    const variantId = param(req, 'variantId');
    const updated = await updateMediaLink(fileId, variantId, { isPrimary: true });
    if (!updated) {
      res.status(404).json({ error: 'Media link not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    console.error('Media primary failed:', err);
    res.status(500).json({ error: 'Update failed', detail: err?.message ?? String(err) });
  }
});

// DELETE /media/:fileId — удалить файл + все связи
router.delete('/:fileId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const fileId = param(req, 'fileId');
    if (!fileId) {
      res.status(400).json({ error: 'Missing file id' });
      return;
    }
    const item = await getMediaFileById(fileId);
    if (!item) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    await deleteMediaFile(fileId);

    if (item.url.startsWith('/uploads/')) {
      const filePath = resolve(UPLOADS_DIR, item.url.replace(/^\/uploads\//, ''));
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
      }
    }

    res.json({ ok: true, id: fileId });
  } catch (err: any) {
    console.error('Media delete failed:', err);
    res.status(500).json({ error: 'Delete failed', detail: err?.message ?? String(err) });
  }
});

// DELETE /media/link/:fileId/:variantId — удалить только связь
router.delete('/link/:fileId/:variantId', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const fileId = param(req, 'fileId');
    const variantId = param(req, 'variantId');
    const deleted = await deleteMediaLink(fileId, variantId);
    if (!deleted) {
      res.status(404).json({ error: 'Media link not found' });
      return;
    }
    res.json({ ok: true, fileId, variantId });
  } catch (err: any) {
    console.error('Media link delete failed:', err);
    res.status(500).json({ error: 'Delete failed', detail: err?.message ?? String(err) });
  }
});

export default router;
