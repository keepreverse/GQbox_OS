import { Router, Request, Response } from 'express';
import { query, queryOne } from '../utils/db';
import { readCollection, writeCollection } from '../utils/fileStore';

const ALLOWED_TYPES = [
  'categories', 'models', 'colors', 'suppliers',
  'connectors', 'chargingProtocols', 'materials'
] as const;

type DictType = typeof ALLOWED_TYPES[number];

const router = Router();
const useDb = () => !!(process.env.DATABASE_URL);

function mapDictRow(row: any): any {
  const item: any = { id: row.id };
  if (typeof row.name === 'object' && row.name !== null) {
    item.name_source = row.name.source ?? '';
    item.name_product = row.name.product ?? row.name.en ?? row.name.ru ?? '';
  } else {
    item.name_source = String(row.name ?? '');
    item.name_product = String(row.name ?? '');
  }
  if (!item.name_source) item.name_source = item.name_product;
  if (!item.name_product) item.name_product = item.name_source;
  if (row.parent_id) item.categoryId = row.parent_id;
  if (row.hex) item.hex = row.hex;
  if (row.short_name) item.shortName = row.short_name;
  return item;
}

async function getDictFromDb(type: string): Promise<any[]> {
  const rows = await query<any>('SELECT * FROM dictionaries WHERE type = $1 ORDER BY sort_order, id', [type]);
  return rows.map(mapDictRow);
}

// GET /api/dictionaries/:type
router.get('/:type', async (req: Request, res: Response) => {
  const type = req.params.type as DictType;
  if (!ALLOWED_TYPES.includes(type)) {
    res.status(400).json({ error: `Unknown dictionary type: ${type}. Allowed: ${ALLOWED_TYPES.join(', ')}` });
    return;
  }
  try {
    if (useDb()) {
      const data = await getDictFromDb(type);
      res.json(data);
      return;
    }
  } catch { /* fallthrough */ }
  res.json(readCollection<Record<string, unknown>>(type));
});

// POST /api/dictionaries/:type
router.post('/:type', async (req: Request, res: Response) => {
  const type = req.params.type as DictType;
  if (!ALLOWED_TYPES.includes(type)) {
    res.status(400).json({ error: `Unknown dictionary type: ${type}` });
    return;
  }
  const item = req.body;
  if (!item.id) {
    res.status(400).json({ error: 'Field "id" is required' });
    return;
  }
  try {
    if (useDb()) {
      const existing = await queryOne<any>('SELECT id FROM dictionaries WHERE id = $1', [item.id]);
      if (existing) { res.status(409).json({ error: `Item with id "${item.id}" already exists in ${type}` }); return; }
      const name = { source: item.name_source || item.name || '', product: item.name_product || item.nameRu || item.name || item.name_source || '' };
      await query(
        `INSERT INTO dictionaries (id, type, name, parent_id, hex, short_name, sort_order)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7)`,
        [item.id, type, JSON.stringify(name), item.categoryId || item.parentId || null, item.hex || null,
         item.shortName ? JSON.stringify(item.shortName) : null, item.sortOrder ?? 0]
      );
      res.status(201).json(item);
      return;
    }
  } catch { /* fallthrough */ }
  const data = readCollection<Record<string, unknown>>(type);
  if (data.find(d => d.id === item.id)) { res.status(409).json({ error: `Item with id "${item.id}" already exists in ${type}` }); return; }
  data.push(item);
  writeCollection(type, data);
  res.status(201).json(item);
});

// PUT /api/dictionaries/:type/:id
router.put('/:type/:id', async (req: Request, res: Response) => {
  const reqType = req.params.type as DictType;
  if (!ALLOWED_TYPES.includes(reqType)) {
    res.status(400).json({ error: `Unknown dictionary type: ${reqType}` });
    return;
  }
  const { id } = req.params;
  try {
    if (useDb()) {
      const existing = await queryOne<any>('SELECT id FROM dictionaries WHERE id = $1', [id]);
      if (!existing) { res.status(404).json({ error: `Item "${id}" not found in ${reqType}` }); return; }
      const body = req.body;
      const updates: string[] = []; const vals: any[] = []; let idx = 1;
      if (body.name_source || body.name_product) {
        updates.push(`name=$${idx}::jsonb`);
        vals.push(JSON.stringify({ source: body.name_source ?? '', product: body.name_product ?? '' }));
        idx++;
      }
      if (body.categoryId || body.parentId) { updates.push(`parent_id=$${idx}`); vals.push(body.categoryId || body.parentId); idx++; }
      if (body.hex !== undefined) { updates.push(`hex=$${idx}`); vals.push(body.hex); idx++; }
      if (body.shortName) { updates.push(`short_name=$${idx}::jsonb`); vals.push(JSON.stringify(body.shortName)); idx++; }
      updates.push(`updated_at=NOW()`);
      vals.push(id);
      if (updates.length > 1) {
        await query(`UPDATE dictionaries SET ${updates.join(', ')} WHERE id=$${idx}`, vals);
      }
      const updated = await queryOne<any>('SELECT * FROM dictionaries WHERE id = $1', [id]);
      res.json(mapDictRow(updated));
      return;
    }
  } catch { /* fallthrough */ }
  const data = readCollection<Record<string, unknown>>(reqType);
  const dataIdx = data.findIndex(d => d.id === id);
  if (dataIdx === -1) { res.status(404).json({ error: `Item "${id}" not found in ${reqType}` }); return; }
  data[dataIdx] = { ...data[dataIdx], ...req.body };
  writeCollection(reqType, data);
  res.json(data[dataIdx]);
});

// DELETE /api/dictionaries/:type/:id
router.delete('/:type/:id', async (req: Request, res: Response) => {
  const reqType = req.params.type as DictType;
  if (!ALLOWED_TYPES.includes(reqType)) {
    res.status(400).json({ error: `Unknown dictionary type: ${reqType}` });
    return;
  }
  const { id } = req.params;
  try {
    if (useDb()) {
      const existing = await queryOne<any>('SELECT * FROM dictionaries WHERE id = $1', [id]);
      if (!existing) { res.status(404).json({ error: `Item "${id}" not found in ${reqType}` }); return; }
      await query('DELETE FROM dictionaries WHERE id = $1', [id]);
      res.json(mapDictRow(existing));
      return;
    }
  } catch { /* fallthrough */ }
  const data = readCollection<Record<string, unknown>>(reqType);
  const dataIdx = data.findIndex(d => d.id === id);
  if (dataIdx === -1) { res.status(404).json({ error: `Item "${id}" not found in ${reqType}` }); return; }
  const removed = data.splice(dataIdx, 1)[0];
  writeCollection(reqType, data);
  res.json(removed);
});

export default router;
