import { Router, Request, Response } from 'express';
import { readCollection, writeCollection } from '../../utils/jsonStore';
import { isDictType, type DictType, type DictionaryItem } from '../../types';
import { sanitizeDictItem } from '../../utils/mappers';

const router = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

router.get('/:type', (req: Request, res: Response) => {
  const type = param(req, 'type');
  if (!isDictType(type)) {
    res.status(400).json({ error: `Unknown dictionary type: ${type}` });
    return;
  }
  try {
    const data = readCollection<DictionaryItem>(type as DictType);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:type', (req: Request, res: Response) => {
  const type = param(req, 'type');
  if (!isDictType(type)) {
    res.status(400).json({ error: `Unknown dictionary type: ${type}` });
    return;
  }
  const item = req.body || {};
  if (!item.id) {
    res.status(400).json({ error: 'Field "id" is required' });
    return;
  }
  try {
    const data = readCollection<DictionaryItem>(type as DictType);
    if (data.find((d) => d.id === item.id)) {
      res.status(409).json({ error: `Item with id "${item.id}" already exists in ${type}` });
      return;
    }
    data.push(item);
    writeCollection(type as DictType, data);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:type/:id', (req: Request, res: Response) => {
  const type = param(req, 'type');
  if (!isDictType(type)) {
    res.status(400).json({ error: `Unknown dictionary type: ${type}` });
    return;
  }
  const { id } = req.params;
  try {
    const data = readCollection<DictionaryItem>(type as DictType);
    const idx = data.findIndex((d) => d.id === id);
    if (idx === -1) {
      res.status(404).json({ error: `Item "${id}" not found in ${type}` });
      return;
    }
    const patch = sanitizeDictItem({ ...req.body, id });
    data[idx] = { ...data[idx], ...patch };
    writeCollection(type as DictType, data);
    res.json(data[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:type/:id', (req: Request, res: Response) => {
  const type = param(req, 'type');
  if (!isDictType(type)) {
    res.status(400).json({ error: `Unknown dictionary type: ${type}` });
    return;
  }
  const { id } = req.params;
  try {
    const data = readCollection<DictionaryItem>(type as DictType);
    const idx = data.findIndex((d) => d.id === id);
    if (idx === -1) {
      res.status(404).json({ error: `Item "${id}" not found in ${type}` });
      return;
    }
    const removed = data.splice(idx, 1)[0];
    writeCollection(type as DictType, data);
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;