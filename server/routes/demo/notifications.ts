import { Router, Request, Response } from 'express';
import { readCollection, writeCollection } from '../../utils/jsonStore';
import type { NotificationRow } from '../../types';

const router = Router();
const MAX_NOTIFICATIONS = 100;

router.get('/', (_req: Request, res: Response) => {
  try {
    const data = readCollection<NotificationRow>('notifications');
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, type, actionView } = req.body || {};
    if (!title) {
      res.status(400).json({ error: 'Field "title" is required' });
      return;
    }
    const data = readCollection<NotificationRow>('notifications');
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: NotificationRow = {
      id,
      title,
      description: description || null,
      createdAt: new Date().toISOString(),
      unread: true,
      type: type || 'info',
      actionView: actionView || null,
    };
    data.push(item);
    while (data.length > MAX_NOTIFICATIONS) {
      data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      data.shift();
    }
    writeCollection('notifications', data);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/mark-all-read', (_req: Request, res: Response) => {
  try {
    const data = readCollection<NotificationRow>('notifications');
    for (const item of data) item.unread = false;
    writeCollection('notifications', data);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = readCollection<NotificationRow>('notifications');
    const item = data.find((d) => d.id === id);
    if (!item) {
      res.status(404).json({ error: `Notification "${id}" not found` });
      return;
    }
    item.unread = false;
    writeCollection('notifications', data);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', (_req: Request, res: Response) => {
  try {
    writeCollection('notifications', []);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = readCollection<NotificationRow>('notifications');
    const idx = data.findIndex((d) => d.id === id);
    if (idx === -1) {
      res.status(404).json({ error: `Notification "${id}" not found` });
      return;
    }
    const removed = data.splice(idx, 1)[0];
    writeCollection('notifications', data);
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
