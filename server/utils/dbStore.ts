// ─── DB store for dev mode ────────────────────────────────────────────────
// Dev-режим пишет данные в PostgreSQL. Здесь — высокоуровневые операции
// (seed из defaults, экспорт в JSON, импорт из бандла, сброс).
// Низкоуровневые query/queryOne лежат в db.ts.

import { randomUUID } from 'node:crypto';
import { query, queryOne, initSchema } from './db';
import {
  COLLECTIONS,
  DICT_TYPES,
  type DataBundle,
  type DictionaryItem,
  type RawProduct,
  type RawProductMedia,
} from '../types';
import {
  buildDictUpdateSql,
  dictInsertSql,
  dictNameToJson,
  mapDictionaryRow,
  mapProductRow,
  mapKitComponentRow,
  kitComponentToDbParams,
  kitComponentInsertSql,
  kitComponentDeleteSql,
  productInsertSql,
  productToDbParams,
  productUpdateSql,
  sanitizeDictItem,
} from './mappers';

// ─── Healthcheck ──────────────────────────────────────────────────────────

let schemaReady: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      try {
        await initSchema();
      } catch (err) {
        schemaReady = null;
        throw err;
      }
    })();
  }
  return schemaReady;
}

export async function isDbAvailable(): Promise<boolean> {
  try {
    const rows = await query<{ ok: number }>('SELECT 1 AS ok');
    if (rows.length === 0 || rows[0].ok !== 1) return false;
    await ensureSchema();
    return true;
  } catch {
    return false;
  }
}

// ─── Products ────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<RawProduct[]> {
  const rows = await query<any>('SELECT * FROM products ORDER BY id');
  return rows.map(mapProductRow);
}

export async function getProductById(id: string): Promise<RawProduct | null> {
  const row = await queryOne<any>('SELECT * FROM products WHERE id = $1', [id]);
  return row ? mapProductRow(row) : null;
}

export async function searchProducts(q: string): Promise<RawProduct[]> {
  const rows = await query<any>(
    `SELECT * FROM products
     WHERE LOWER(sku) LIKE $1 OR LOWER(id) LIKE $1
     ORDER BY id`,
    [`%${q.toLowerCase()}%`]
  );
  return rows.map(mapProductRow);
}

export async function getNextProductId(): Promise<string> {
  return randomUUID();
}

export async function createProduct(
  raw: Partial<RawProduct> & { sku: string }
): Promise<RawProduct> {
  const id = raw.id ?? (await getNextProductId());
  const product: RawProduct = { ...raw, id, sku: raw.sku };
  const vals = productToDbParams(product as any);
  await query(productInsertSql(), vals);
  const created = await getProductById(id);
  return created ?? product;
}

export async function updateProduct(
  id: string,
  patch: Partial<RawProduct>
): Promise<RawProduct | null> {
  const existing = await getProductById(id);
  if (!existing) return null;
  const merged: RawProduct = { ...existing, ...patch, id, sku: patch.sku ?? existing.sku };
  const vals = productToDbParams(merged as any);
  await query(productUpdateSql(), vals);
  return getProductById(id);
}

export async function deleteProduct(id: string): Promise<RawProduct | null> {
  const existing = await getProductById(id);
  if (!existing) return null;
  await query('DELETE FROM products WHERE id = $1', [id]);
  return existing;
}

// ─── Kit Components ──────────────────────────────────────────────────────

export async function getKitComponents(kitId: string): Promise<import('../types').RawKitComponent[]> {
  const rows = await query<any>(
    'SELECT * FROM kit_components WHERE kit_id = $1 ORDER BY sort_order, created_at',
    [kitId]
  );
  return rows.map(mapKitComponentRow);
}

export async function createKitComponent(
  raw: import('../types').RawKitComponent
): Promise<import('../types').RawKitComponent> {
  const vals = kitComponentToDbParams(raw);
  await query(kitComponentInsertSql(), vals);
  return raw;
}

export async function deleteKitComponent(kitId: string, componentId: string): Promise<void> {
  await query(kitComponentDeleteSql(), [kitId, componentId]);
}

export async function clearKitComponents(kitId: string): Promise<void> {
  await query('DELETE FROM kit_components WHERE kit_id = $1', [kitId]);
}

export async function getAllKitComponents(): Promise<import('../types').RawKitComponent[]> {
  const rows = await query<any>('SELECT * FROM kit_components ORDER BY kit_id, sort_order, created_at');
  return rows.map(mapKitComponentRow);
}

// ─── Product Media ───────────────────────────────────────────────────────

function mapProductMediaRow(r: any): RawProductMedia {
  return {
    id: r.id,
    variantId: r.variant_id,
    mediaType: r.media_type,
    url: r.url,
    fileName: r.file_name,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes ?? 0),
    isPrimary: !!r.is_primary,
    sortOrder: Number(r.sort_order ?? 0),
    uploadedAt: r.uploaded_at,
  };
}

export async function getAllProductMedia(): Promise<RawProductMedia[]> {
  const rows = await query<any>(
    'SELECT * FROM product_media ORDER BY variant_id, is_primary DESC, sort_order, uploaded_at'
  );
  return rows.map(mapProductMediaRow);
}

export async function getProductMediaForVariant(
  variantId: string
): Promise<RawProductMedia[]> {
  const rows = await query<any>(
    `SELECT * FROM product_media
     WHERE variant_id = $1
     ORDER BY is_primary DESC, sort_order, uploaded_at`,
    [variantId]
  );
  return rows.map(mapProductMediaRow);
}

export async function getProductMediaById(id: string): Promise<RawProductMedia | null> {
  const row = await queryOne<any>('SELECT * FROM product_media WHERE id = $1', [id]);
  return row ? mapProductMediaRow(row) : null;
}

export async function getNextProductMediaId(): Promise<string> {
  return randomUUID();
}

export async function createProductMedia(
  raw: Omit<RawProductMedia, 'id'> & { id?: string }
): Promise<RawProductMedia> {
  const id = raw.id ?? (await getNextProductMediaId());
  return insertProductMediaRow({ ...raw, id });
}

export async function insertProductMediaRow(
  item: RawProductMedia,
  q: typeof query = query
): Promise<RawProductMedia> {
  const finalItem: RawProductMedia = item.id ? item : { ...item, id: randomUUID() };
  await q(
    `INSERT INTO product_media
       (id, variant_id, media_type, url, file_name, mime_type, size_bytes,
        is_primary, sort_order, uploaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      finalItem.id,
      finalItem.variantId,
      finalItem.mediaType,
      finalItem.url,
      finalItem.fileName,
      finalItem.mimeType,
      finalItem.sizeBytes,
      finalItem.isPrimary,
      finalItem.sortOrder,
      finalItem.uploadedAt,
    ]
  );
  return finalItem;
}

export async function updateProductMedia(
  id: string,
  patch: Partial<RawProductMedia>
): Promise<RawProductMedia | null> {
  const existing = await getProductMediaById(id);
  if (!existing) return null;
  const merged: RawProductMedia = {
    ...existing,
    isPrimary:
      typeof patch.isPrimary === 'boolean' ? patch.isPrimary : existing.isPrimary,
    sortOrder:
      typeof patch.sortOrder === 'number' ? patch.sortOrder : existing.sortOrder,
  };
  if (merged.isPrimary) {
    await query(
      'UPDATE product_media SET is_primary = FALSE WHERE variant_id = $1 AND id <> $2',
      [merged.variantId, id]
    );
  }
  await query(
    `UPDATE product_media
     SET is_primary = $1, sort_order = $2
     WHERE id = $3`,
    [merged.isPrimary, merged.sortOrder, id]
  );
  return merged;
}

export async function updateProductMediaTx(
  q: typeof query,
  id: string,
  patch: Partial<RawProductMedia>
): Promise<RawProductMedia | null> {
  const existing = await q<any>('SELECT * FROM product_media WHERE id = $1', [id]);
  if (!existing[0]) return null;
  const current = mapProductMediaRow(existing[0]);
  const merged: RawProductMedia = {
    ...current,
    isPrimary:
      typeof patch.isPrimary === 'boolean' ? patch.isPrimary : current.isPrimary,
    sortOrder:
      typeof patch.sortOrder === 'number' ? patch.sortOrder : current.sortOrder,
  };
  if (merged.isPrimary) {
    await q(
      'UPDATE product_media SET is_primary = FALSE WHERE variant_id = $1 AND id <> $2',
      [merged.variantId, id]
    );
  }
  await q(
    `UPDATE product_media
     SET is_primary = $1, sort_order = $2
     WHERE id = $3`,
    [merged.isPrimary, merged.sortOrder, id]
  );
  return merged;
}

export async function deleteProductMedia(id: string): Promise<RawProductMedia | null> {
  const existing = await getProductMediaById(id);
  if (!existing) return null;
  await query('DELETE FROM product_media WHERE id = $1', [id]);
  return existing;
}

export async function clearProductMediaForVariant(variantId: string): Promise<void> {
  await query('DELETE FROM product_media WHERE variant_id = $1', [variantId]);
}

// ─── Dictionaries ─────────────────────────────────────────────────────────

export async function getDictionary(type: string): Promise<DictionaryItem[]> {
  const rows = await query<any>(
    'SELECT * FROM dictionaries WHERE type = $1 ORDER BY sort_order, id',
    [type]
  );
  return rows.map(mapDictionaryRow);
}

export async function createDictionaryItem(
  type: string,
  item: DictionaryItem
): Promise<DictionaryItem> {
  const cleaned = sanitizeDictItem(item);
  const vals = [
    cleaned.id,
    type,
    dictNameToJson(cleaned),
    cleaned.categoryId ?? cleaned.parentId ?? null,
    cleaned.code ?? null,
    cleaned.color ?? null,
    cleaned.icon ?? null,
    cleaned.description ?? null,
    cleaned.contactInfo ?? null,
    cleaned.shortName ? JSON.stringify(cleaned.shortName) : null,
    cleaned.sortOrder ?? 0,
  ];
  await query(dictInsertSql(), vals);
  return cleaned;
}

export async function updateDictionaryItem(
  _type: string,
  id: string,
  patch: DictionaryItem
): Promise<DictionaryItem | null> {
  const existing = await queryOne<any>('SELECT id FROM dictionaries WHERE id = $1', [id]);
  if (!existing) return null;
  const stmt = buildDictUpdateSql(id, patch);
  if (stmt) {
    await query(stmt.sql, stmt.vals);
  }
  const row = await queryOne<any>('SELECT * FROM dictionaries WHERE id = $1', [id]);
  return row ? mapDictionaryRow(row) : null;
}

export async function deleteDictionaryItem(
  _type: string,
  id: string
): Promise<DictionaryItem | null> {
  const existing = await queryOne<any>('SELECT * FROM dictionaries WHERE id = $1', [id]);
  if (!existing) return null;
  await query('DELETE FROM dictionaries WHERE id = $1', [id]);
  return mapDictionaryRow(existing);
}

// ─── Bulk operations: reset / import / export ─────────────────────────────

export async function truncateAll(): Promise<void> {
  await query('TRUNCATE products, dictionaries, kit_components, notifications, product_media RESTART IDENTITY CASCADE');
}

export async function exportAll(): Promise<DataBundle> {
  const products = await getAllProducts();
  const dicts: Record<string, DictionaryItem[]> = {};
  for (const t of DICT_TYPES) {
    dicts[t] = await getDictionary(t);
  }
  const kitComps = await query<import('../types').RawKitComponent>('SELECT * FROM kit_components ORDER BY kit_id, sort_order');
  const productMedia = await getAllProductMedia();
  return {
    products,
    categories: dicts.categories ?? [],
    models: dicts.models ?? [],
    colors: dicts.colors ?? [],
    suppliers: dicts.suppliers ?? [],
    connectors: dicts.connectors ?? [],
    chargingProtocols: dicts.chargingProtocols ?? [],
    materials: dicts.materials ?? [],
    kitComponents: kitComps,
    productMedia,
  };
}

export async function importAll(bundle: Partial<DataBundle>): Promise<string[]> {
  const imported: string[] = [];
  for (const name of COLLECTIONS) {
    const data = (bundle as any)?.[name];
    if (!Array.isArray(data)) continue;
    if (name === 'products') {
      await query('DELETE FROM products');
      for (const p of data as RawProduct[]) {
        const product: RawProduct = { ...p, id: p.id, sku: p.sku };
        const vals = productToDbParams(product as any);
        await query(productInsertSql(), vals);
      }
    } else if (name === 'notifications') {
      await query('DELETE FROM notifications');
    } else if (name === 'kitComponents') {
      await query('DELETE FROM kit_components');
      for (const k of data as import('../types').RawKitComponent[]) {
        const vals = kitComponentToDbParams(k);
        await query(kitComponentInsertSql(), vals);
      }
    } else if (name === 'productMedia') {
      await query('DELETE FROM product_media');
      for (const m of data as RawProductMedia[]) {
        await query(
          `INSERT INTO product_media
             (id, variant_id, media_type, url, file_name, mime_type, size_bytes,
              is_primary, sort_order, uploaded_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id,
            m.variantId,
            m.mediaType,
            m.url,
            m.fileName,
            m.mimeType,
            m.sizeBytes,
            m.isPrimary,
            m.sortOrder,
            m.uploadedAt,
          ]
        );
      }
    } else {
      await query('DELETE FROM dictionaries WHERE type = $1', [name]);
      for (const item of data as DictionaryItem[]) {
        const cleaned = sanitizeDictItem(item);
        const vals = [
          cleaned.id,
          name,
          dictNameToJson(cleaned),
          cleaned.categoryId ?? cleaned.parentId ?? null,
          cleaned.code ?? null,
          cleaned.color ?? null,
          cleaned.icon ?? null,
          cleaned.description ?? null,
          cleaned.contactInfo ?? null,
          cleaned.shortName ? JSON.stringify(cleaned.shortName) : null,
          cleaned.sortOrder ?? 0,
        ];
        await query(dictInsertSql(), vals);
      }
    }
    imported.push(name);
  }
  return imported;
}

/**
 * Полный сброс: TRUNCATE + пересоздание схемы + ничего не сидит.
 * (Для прода используйте seedFromDefaults после reset, чтобы вернуть данные.)
 */
export async function resetSchema(): Promise<void> {
  await truncateAll();
  await initSchema();
}
