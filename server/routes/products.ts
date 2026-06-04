import { Router, Request, Response } from 'express';
import { query, queryOne } from '../utils/db';
import { readCollection, writeCollection } from '../utils/fileStore';

const router = Router();
const useDb = () => !!(process.env.DATABASE_URL);

function mapRow(row: any): any {
  if (!row) return null;
  const mapped: any = { ...row };
  if (mapped.sku_base != null) { mapped.skuBase = mapped.sku_base; delete mapped.sku_base; }
  if (mapped.category_id != null) { mapped.categoryId = mapped.category_id; delete mapped.category_id; }
  if (mapped.model_id != null) { mapped.modelId = mapped.model_id; delete mapped.model_id; }
  if (mapped.color_id != null) { mapped.colorId = mapped.color_id; delete mapped.color_id; }
  if (mapped.supplier_id != null) { mapped.supplierId = mapped.supplier_id; delete mapped.supplier_id; }
  if (mapped.body_material_id != null) { mapped.bodyMaterialId = mapped.body_material_id; delete mapped.body_material_id; }
  if (mapped.wire_material_id != null) { mapped.wireMaterialId = mapped.wire_material_id; delete mapped.wire_material_id; }
  if (mapped.current_a != null) { mapped.currentA = Number(mapped.current_a); delete mapped.current_a; }
  if (mapped.voltage_v != null) { mapped.voltageV = Number(mapped.voltage_v); delete mapped.voltage_v; }
  if (mapped.power_w != null) { mapped.powerW = Number(mapped.power_w); delete mapped.power_w; }
  if (mapped.length_m != null) { mapped.lengthM = Number(mapped.length_m); delete mapped.length_m; }
  if (mapped.data_transfer_mbps != null) { mapped.dataTransferMbps = Number(mapped.data_transfer_mbps); delete mapped.data_transfer_mbps; }
  if (mapped.device_count != null) { mapped.deviceCount = Number(mapped.device_count); delete mapped.device_count; }
  if (mapped.connector_female_id != null) { mapped.connectorFemaleId = mapped.connector_female_id; delete mapped.connector_female_id; }
  if (mapped.connector_male_id != null) { mapped.connectorMaleId = mapped.connector_male_id; delete mapped.connector_male_id; }
  if (mapped.variant_code != null) { mapped.variantCode = mapped.variant_code; delete mapped.variant_code; }
  if (mapped.length_variant != null) { mapped.lengthVariant = mapped.length_variant; delete mapped.length_variant; }
  if (mapped.supplier_suffix != null) { mapped.supplierSuffix = mapped.supplier_suffix; delete mapped.supplier_suffix; }
  if (mapped.is_kit != null) { mapped.isKit = mapped.is_kit; delete mapped.is_kit; }
  delete mapped.created_at;
  delete mapped.updated_at;
  return mapped;
}

function mapToDb(body: any): any[] {
  return [
    body.id, body.sku, body.skuBase || null, body.categoryId || null, body.modelId || null,
    body.colorId || null, body.supplierId || null, body.bodyMaterialId || null,
    body.wireMaterialId || null, body.currentA ?? null, body.voltageV ?? null,
    body.powerW ?? null, body.lengthM ?? null, body.dataTransferMbps ?? null,
    body.deviceCount ?? null, body.connectorFemaleId || null, body.connectorMaleId || null,
    body.variantCode || null, body.lengthVariant || null, body.supplierSuffix || null,
    body.isKit || false,
  ];
}

async function getAllProducts(): Promise<any[]> {
  if (useDb()) {
    const rows = await query<any>('SELECT * FROM products ORDER BY id');
    return rows.map(mapRow);
  }
  return readCollection<any>('products');
}

async function getNextProductId(): Promise<string> {
  if (useDb()) {
    const row = await queryOne<{ max_num: number | null }>(
      `SELECT MAX(CAST(REPLACE(id, 'p', '') AS INTEGER)) AS max_num FROM products WHERE id ~ '^p[0-9]+$'`
    );
    const nextNum = (row?.max_num ?? 0) + 1;
    return `p${nextNum}`;
  }
  const products = readCollection<any>('products');
  const maxNum = products.reduce((max: number, p: any) => {
    const num = parseInt((p.id || '').replace(/^p/, ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `p${maxNum + 1}`;
}

// GET /api/products
router.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch { res.json(readCollection<any>('products')); }
});

// GET /api/products/search?q=...
router.get('/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').toLowerCase();
  try {
    if (useDb()) {
      const rows = await query<any>(
        'SELECT * FROM products WHERE LOWER(sku) LIKE $1 OR LOWER(id) LIKE $1 ORDER BY id',
        [`%${q}%`]
      );
      res.json(rows.map(mapRow));
      return;
    }
  } catch { /* fallthrough */ }
  const products = readCollection<any>('products');
  const filtered = q ? products.filter(p => p.sku.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) : products;
  res.json(filtered);
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (useDb()) {
      const row = await queryOne<any>('SELECT * FROM products WHERE id = $1', [req.params.id]);
      if (!row) { res.status(404).json({ error: 'Product not found' }); return; }
      res.json(mapRow(row));
      return;
    }
  } catch { /* fallthrough */ }
  const products = readCollection<any>('products');
  const product = products.find(p => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
  res.json(product);
});

// POST /api/products
router.post('/', async (req: Request, res: Response) => {
  const raw = req.body;
  if (!raw.sku) {
    res.status(400).json({ error: 'sku is required' });
    return;
  }
  const id = await getNextProductId();
  const product = { ...raw, id };
  try {
    if (useDb()) {
      const vals = mapToDb(product);
      await query(`
        INSERT INTO products (id, sku, sku_base, category_id, model_id, color_id, supplier_id,
          body_material_id, wire_material_id, current_a, voltage_v, power_w, length_m,
          data_transfer_mbps, device_count, connector_female_id, connector_male_id,
          variant_code, length_variant, supplier_suffix, is_kit)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      `, vals);
      res.status(201).json(product);
      return;
    }
  } catch { /* fallthrough */ }
  const products = readCollection<any>('products');
  products.push(product);
  writeCollection('products', products);
  res.status(201).json(product);
});

// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (useDb()) {
      const existing = await queryOne<any>('SELECT id FROM products WHERE id = $1', [req.params.id]);
      if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }
      const vals = mapToDb({ ...req.body, id: req.params.id, sku: req.body.sku || existing.sku });
      await query(`
        UPDATE products SET sku=$2, sku_base=$3, category_id=$4, model_id=$5, color_id=$6,
          supplier_id=$7, body_material_id=$8, wire_material_id=$9, current_a=$10, voltage_v=$11,
          power_w=$12, length_m=$13, data_transfer_mbps=$14, device_count=$15,
          connector_female_id=$16, connector_male_id=$17, variant_code=$18, length_variant=$19,
          supplier_suffix=$20, is_kit=$21, updated_at=NOW()
        WHERE id=$1
      `, vals);
      const updated = await queryOne<any>('SELECT * FROM products WHERE id = $1', [req.params.id]);
      res.json(mapRow(updated));
      return;
    }
  } catch { /* fallthrough */ }
  const products = readCollection<any>('products');
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Product not found' }); return; }
  products[idx] = { ...products[idx], ...req.body };
  writeCollection('products', products);
  res.json(products[idx]);
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (useDb()) {
      const existing = await queryOne<any>('SELECT * FROM products WHERE id = $1', [req.params.id]);
      if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }
      await query('DELETE FROM products WHERE id = $1', [req.params.id]);
      res.json(mapRow(existing));
      return;
    }
  } catch { /* fallthrough */ }
  const products = readCollection<any>('products');
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Product not found' }); return; }
  const removed = products.splice(idx, 1)[0];
  writeCollection('products', products);
  res.json(removed);
});

export default router;
