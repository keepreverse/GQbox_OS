import { Router, Request, Response } from 'express';
import { readCollection, writeCollection, UPLOADS_DIR } from '../../utils/jsonStore';
import { upload, detectMediaType } from '../../middleware/upload';
import { unlinkSync, existsSync, readFileSync } from 'fs';
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

// GET /media — все файлы с привязанными SKU
router.get('/', (req: Request, res: Response) => {
  try {
    const files = readCollection<MediaFile>('mediaFiles');
    const links = readCollection<MediaLink>('mediaLinks');
    const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : null;

    if (variantId) {
      const variantLinks = links.filter((l) => l.variantId === variantId);
      res.json(variantLinks);
      return;
    }

    const linksByFile = new Map<string, string[]>();
    for (const l of links) {
      const arr = linksByFile.get(l.fileId) ?? [];
      arr.push(l.variantId);
      linksByFile.set(l.fileId, arr);
    }

    const result = files.map((f) => ({
      ...f,
      linkedSkus: linksByFile.get(f.id) ?? [],
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /media/links — все связи (для кэширования на фронтенде)
// ВАЖНО: должен быть ДО /:fileId, иначе Express матчит "links" как fileId.
router.get('/links', (_req: Request, res: Response) => {
  try {
    const links = readCollection<MediaLink>('mediaLinks');
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /media/variant/:variantId — все связи для SKU
// ВАЖНО: должен быть ДО /:fileId.
router.get('/variant/:variantId', (req: Request, res: Response) => {
  try {
    const variantId = param(req, 'variantId');
    const links = readCollection<MediaLink>('mediaLinks');
    const variantLinks = links.filter((l) => l.variantId === variantId);
    res.json(variantLinks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /media/:fileId — один файл
router.get('/:fileId', (req: Request, res: Response) => {
  try {
    const id = param(req, 'fileId');
    const files = readCollection<MediaFile>('mediaFiles');
    const m = files.find((x) => x.id === id);
    if (!m) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }
    res.json(m);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /media — загрузка файла
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

      const files = readCollection<MediaFile>('mediaFiles');
      const links = readCollection<MediaLink>('mediaLinks');

      const mediaFile: MediaFile = {
        id: crypto.randomUUID(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        url: buildUrl(file.filename),
        createdAt: new Date().toISOString(),
      };
      files.push(mediaFile);

      const createdLinks: MediaLink[] = [];
      for (let i = 0; i < validIds.length; i++) {
        const vid = validIds[i];
        const existingLinks = links.filter((l) => l.variantId === vid);
        const isPrimaryLink = isPrimary && i === 0;
        if (isPrimaryLink) {
          for (const l of links) {
            if (l.variantId === vid) {
              l.isPrimary = false;
              l.sortOrder += 1;
            }
          }
        }
        const link: MediaLink = {
          fileId: mediaFile.id,
          variantId: vid,
          isPrimary: isPrimaryLink,
          sortOrder: isPrimaryLink ? 0 : existingLinks.length,
          uploadedAt: new Date().toISOString(),
        };
        links.push(link);
        createdLinks.push(link);
      }

      writeCollection('mediaFiles', files);
      writeCollection('mediaLinks', links);
      res.status(201).json({ file: mediaFile, links: createdLinks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /media/:fileId/primary/:variantId — set primary
router.patch('/:fileId/primary/:variantId', (req: Request, res: Response) => {
  try {
    const fileId = param(req, 'fileId');
    const variantId = param(req, 'variantId');
    const links = readCollection<MediaLink>('mediaLinks');
    const idx = links.findIndex((l) => l.fileId === fileId && l.variantId === variantId);
    if (idx === -1) {
      res.status(404).json({ error: 'Media link not found' });
      return;
    }
    const next = [...links];
    for (const l of next) {
      if (l.variantId === variantId) l.isPrimary = false;
    }
    next[idx].isPrimary = true;
    writeCollection('mediaLinks', next);
    res.json(next[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /media — удалить все медиафайлы и связи
router.delete('/', (_req: Request, res: Response) => {
  try {
    const files = readCollection<MediaFile>('mediaFiles');

    for (const item of files) {
      if (item.url.startsWith('/uploads/')) {
        const filePath = resolve(UPLOADS_DIR, item.url.replace(/^\/uploads\//, ''));
        if (existsSync(filePath)) {
          try { unlinkSync(filePath); } catch { /* ignore */ }
        }
      }
    }

    writeCollection('mediaFiles', []);
    writeCollection('mediaLinks', []);
    res.json({ ok: true, removedCount: files.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /media/:fileId — удалить файл + все связи
router.delete('/:fileId', (req: Request, res: Response) => {
  try {
    const fileId = param(req, 'fileId');
    const files = readCollection<MediaFile>('mediaFiles');
    const item = files.find((m) => m.id === fileId);
    if (!item) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    const links = readCollection<MediaLink>('mediaLinks');
    const otherRefs = links.filter((l) => l.fileId === fileId);

    if (item.url.startsWith('/uploads/')) {
      const filePath = resolve(UPLOADS_DIR, item.url.replace(/^\/uploads\//, ''));
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
      }
    }

    const nextFiles = files.filter((m) => m.id !== fileId);
    const nextLinks = links.filter((l) => l.fileId !== fileId);
    writeCollection('mediaFiles', nextFiles);
    writeCollection('mediaLinks', nextLinks);
    res.json({ ok: true, id: fileId, removedLinks: otherRefs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /media/link/:fileId/:variantId — удалить только связь
router.delete('/link/:fileId/:variantId', (req: Request, res: Response) => {
  try {
    const fileId = param(req, 'fileId');
    const variantId = param(req, 'variantId');
    const links = readCollection<MediaLink>('mediaLinks');
    const idx = links.findIndex((l) => l.fileId === fileId && l.variantId === variantId);
    if (idx === -1) {
      res.status(404).json({ error: 'Media link not found' });
      return;
    }
    const next = [...links];
    next.splice(idx, 1);
    writeCollection('mediaLinks', next);
    res.json({ ok: true, fileId, variantId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
