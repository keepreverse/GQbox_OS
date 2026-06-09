import { Router, Request, Response } from 'express';
import { isDbAvailable } from '../../utils/dbStore';
import { query, queryOne } from '../../utils/db';

const router = Router();
const MAX_NOTIFICATIONS = 100;

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

router.get('/', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    const rows = await query<{
      id: string; title: string; description: string | null;
      created_at: string; unread: boolean; type: string; action_view: string | null;
    }>('SELECT id, title, description, created_at, unread, type, action_view FROM notifications ORDER BY created_at DESC');
    const mapped = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? undefined,
      createdAt: r.created_at,
      unread: r.unread,
      type: r.type,
      actionView: r.action_view ?? undefined,
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const { title, description, type, actionView } = req.body || {};
    if (!title) {
      res.status(400).json({ error: 'Field "title" is required' });
      return;
    }
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO notifications (id, title, description, type, action_view) VALUES ($1, $2, $3, $4, $5)`,
      [id, title, description || null, type || 'info', actionView || null]
    );
    const count = await queryOne<{ c: string }>('SELECT COUNT(*)::text as c FROM notifications');
    const total = parseInt(count?.c ?? '0', 10);
    if (total > MAX_NOTIFICATIONS) {
      await query(
        `DELETE FROM notifications WHERE id IN (SELECT id FROM notifications ORDER BY created_at ASC LIMIT $1)`,
        [total - MAX_NOTIFICATIONS]
      );
    }
    const row = await queryOne<{
      id: string; title: string; description: string | null;
      created_at: string; unread: boolean; type: string; action_view: string | null;
    }>('SELECT id, title, description, created_at, unread, type, action_view FROM notifications WHERE id = $1', [id]);
    res.status(201).json(row ? {
      id: row.id, title: row.title, description: row.description ?? undefined,
      createdAt: row.created_at, unread: row.unread,
      type: row.type, actionView: row.action_view ?? undefined,
    } : { id, title, description, createdAt: new Date().toISOString(), unread: true, type, actionView });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/mark-all-read', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    await query('UPDATE notifications SET unread = false WHERE unread = true');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const { id } = req.params;
    const result = await queryOne<{ id: string }>('UPDATE notifications SET unread = false WHERE id = $1 RETURNING id', [id]);
    if (!result) {
      res.status(404).json({ error: `Notification "${id}" not found` });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (_req: Request, res: Response) => {
  if (!(await ensureDb(_req, res))) return;
  try {
    await query('DELETE FROM notifications');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
  try {
    const { id } = req.params;
    const result = await queryOne<{ id: string }>('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);
    if (!result) {
      res.status(404).json({ error: `Notification "${id}" not found` });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
