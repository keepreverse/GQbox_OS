import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { readCollection, writeCollection, DATA_DIR } from '../utils/fileStore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const COLLECTIONS = [
  'products', 'categories', 'models', 'colors', 'suppliers',
  'connectors', 'chargingProtocols', 'materials'
] as const;

const router = Router();
const useDb = () => !!(process.env.DATABASE_URL);

async function getCollectionFromDb(name: string): Promise<any[]> {
  if (name === 'products') {
    const rows = await query<any>('SELECT * FROM products ORDER BY id');
    return rows.map((r: any) => {
      const m: any = { id: r.id, sku: r.sku };
      for (const key of Object.keys(r)) {
        if (key === 'id' || key === 'sku' || key === 'created_at' || key === 'updated_at') continue;
        const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        m[camel] = r[key];
      }
      return m;
    });
  }
  const rows = await query<any>('SELECT * FROM dictionaries WHERE type = $1 ORDER BY sort_order, id', [name]);
  return rows.map((r: any) => {
    const item: any = { id: r.id };
    if (typeof r.name === 'object' && r.name !== null) {
      item.name_source = r.name.source ?? '';
      item.name_product = r.name.product ?? r.name.en ?? r.name.ru ?? '';
    } else {
      item.name_source = String(r.name ?? '');
      item.name_product = String(r.name ?? '');
    }
    if (!item.name_source) item.name_source = item.name_product;
    if (!item.name_product) item.name_product = item.name_source;
    if (r.parent_id) item.categoryId = r.parent_id;
    if (r.hex) item.hex = r.hex;
    if (r.short_name) item.shortName = r.short_name;
    return item;
  });
}

router.get('/export', async (_req: Request, res: Response) => {
  try {
    if (useDb()) {
      const dump: Record<string, any[]> = {};
      for (const name of COLLECTIONS) {
        dump[name] = await getCollectionFromDb(name);
      }
      res.json(dump);
      return;
    }
  } catch { /* fallthrough */ }
  const dump: Record<string, unknown[]> = {};
  for (const name of COLLECTIONS) { dump[name] = readCollection(name); }
  res.json(dump);
});

router.post('/import', async (req: Request, res: Response) => {
  const dump = req.body as Record<string, any[]>;
  if (!dump || typeof dump !== 'object') {
    res.status(400).json({ error: 'Invalid import data: expected object' });
    return;
  }
  const imported: string[] = [];
  try {
    if (useDb()) {
      for (const name of COLLECTIONS) {
        if (!Array.isArray(dump[name]) || dump[name].length === 0) continue;
        if (name === 'products') {
          await query('DELETE FROM products');
          for (const p of dump[name]) {
            await query(
              `INSERT INTO products (id, sku, sku_base, category_id, model_id, color_id, supplier_id,
                body_material_id, wire_material_id, current_a, voltage_v, power_w, length_m,
                data_transfer_mbps, device_count, connector_female_id, connector_male_id,
                variant_code, length_variant, supplier_suffix, is_kit)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
               ON CONFLICT (id) DO UPDATE SET sku=EXCLUDED.sku, updated_at=NOW()`,
              [p.id, p.sku, p.skuBase || null, p.categoryId || null, p.modelId || null,
               p.colorId || null, p.supplierId || null, p.bodyMaterialId || null,
               p.wireMaterialId || null, p.currentA ?? null, p.voltageV ?? null,
               p.powerW ?? null, p.lengthM ?? null, p.dataTransferMbps ?? null,
               p.deviceCount ?? null, p.connectorFemaleId || null, p.connectorMaleId || null,
               p.variantCode || null, p.lengthVariant || null, p.supplierSuffix || null,
               p.isKit || false]
            );
          }
        } else {
          await query('DELETE FROM dictionaries WHERE type = $1', [name]);
          for (const item of dump[name]) {
            const dictName = { source: item.name_source || item.name || '', product: item.name_product || item.nameRu || item.name || '' };
            await query(
              `INSERT INTO dictionaries (id, type, name, parent_id, hex, short_name, sort_order)
               VALUES ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
              [item.id, name, JSON.stringify(dictName),
               item.categoryId || item.parentId || null, item.hex || null,
               item.shortName ? JSON.stringify(item.shortName) : null, item.sortOrder ?? 0]
            );
          }
        }
        imported.push(name);
      }
      res.json({ ok: true, collections: imported });
      return;
    }
  } catch { /* fallthrough */ }
  for (const name of COLLECTIONS) {
    if (Array.isArray(dump[name])) { writeCollection(name, dump[name]); imported.push(name); }
  }
  res.json({ ok: true, collections: imported });
});

router.post('/reset', async (_req: Request, res: Response) => {
  const defaultsDir = resolve(DATA_DIR, '.defaults');
  try {
    if (useDb()) {
      for (const name of COLLECTIONS) {
        const defaultPath = resolve(defaultsDir, `${name}.json`);
        if (!existsSync(defaultPath)) continue;
        const data = JSON.parse(readFileSync(defaultPath, 'utf-8'));
        if (name === 'products') {
          await query('DELETE FROM products');
          for (const p of data) {
            await query(
              `INSERT INTO products (id, sku, sku_base, category_id, model_id, color_id, supplier_id,
                body_material_id, wire_material_id, current_a, voltage_v, power_w, length_m,
                data_transfer_mbps, device_count, connector_female_id, connector_male_id,
                variant_code, length_variant, supplier_suffix, is_kit)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
              [p.id, p.sku, p.skuBase || null, p.categoryId || null, p.modelId || null,
               p.colorId || null, p.supplierId || null, p.bodyMaterialId || null,
               p.wireMaterialId || null, p.currentA ?? null, p.voltageV ?? null,
               p.powerW ?? null, p.lengthM ?? null, p.dataTransferMbps ?? null,
               p.deviceCount ?? null, p.connectorFemaleId || null, p.connectorMaleId || null,
               p.variantCode || null, p.lengthVariant || null, p.supplierSuffix || null,
               p.isKit || false]
            );
          }
        } else {
          await query('DELETE FROM dictionaries WHERE type = $1', [name]);
          for (const item of data) {
            const dictName = { source: item.name_source || item.name || '', product: item.name_product || item.nameRu || item.name || '' };
            await query(
              `INSERT INTO dictionaries (id, type, name, parent_id, hex, short_name, sort_order)
               VALUES ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7)`,
              [item.id, name, JSON.stringify(dictName),
               item.categoryId || item.parentId || null, item.hex || null,
               item.shortName ? JSON.stringify(item.shortName) : null, item.sortOrder ?? 0]
            );
          }
        }
      }
      res.json({ ok: true });
      return;
    }
  } catch { /* fallthrough */ }
  for (const name of COLLECTIONS) {
    const defaultPath = resolve(defaultsDir, `${name}.json`);
    if (existsSync(defaultPath)) {
      const data = JSON.parse(readFileSync(defaultPath, 'utf-8'));
      writeCollection(name, data);
    }
  }
  res.json({ ok: true });
});

export default router;
