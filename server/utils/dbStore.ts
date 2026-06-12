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

// ─── Media Files ─────────────────────────────────────────────────────────

export async function getAllMediaFiles(): Promise<import('../types').MediaFile[]> {
  const rows = await query<any>('SELECT * FROM media_files ORDER BY created_at DESC');
  return rows.map((r: any) => ({
    id: r.id,
    filename: r.filename,
    originalName: r.original_name,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes ?? 0),
    url: r.url,
    createdAt: r.created_at,
  }));
}

export async function getMediaFileById(id: string): Promise<import('../types').MediaFile | null> {
  const row = await queryOne<any>('SELECT * FROM media_files WHERE id = $1', [id]);
  if (!row) return null;
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    url: row.url,
    createdAt: row.created_at,
  };
}

export async function getMediaLinksForVariant(
  variantId: string
): Promise<import('../types').MediaLink[]> {
  const rows = await query<any>(
    `SELECT * FROM product_media_links
     WHERE variant_id = $1
     ORDER BY is_primary DESC, sort_order, uploaded_at`,
    [variantId]
  );
  return rows.map((r: any) => ({
    fileId: r.file_id,
    variantId: r.variant_id,
    isPrimary: !!r.is_primary,
    sortOrder: Number(r.sort_order ?? 0),
    uploadedAt: r.uploaded_at,
  }));
}

export async function getAllMediaLinks(): Promise<import('../types').MediaLink[]> {
  const rows = await query<any>('SELECT * FROM product_media_links ORDER BY uploaded_at DESC');
  return rows.map((r: any) => ({
    fileId: r.file_id,
    variantId: r.variant_id,
    isPrimary: !!r.is_primary,
    sortOrder: Number(r.sort_order ?? 0),
    uploadedAt: r.uploaded_at,
  }));
}

export async function getMediaLinksForFile(
  fileId: string
): Promise<import('../types').MediaLink[]> {
  const rows = await query<any>(
    'SELECT * FROM product_media_links WHERE file_id = $1',
    [fileId]
  );
  return rows.map((r: any) => ({
    fileId: r.file_id,
    variantId: r.variant_id,
    isPrimary: !!r.is_primary,
    sortOrder: Number(r.sort_order ?? 0),
    uploadedAt: r.uploaded_at,
  }));
}

export async function insertMediaFile(
  file: Omit<import('../types').MediaFile, 'id'> & { id?: string },
  q: typeof query = query
): Promise<import('../types').MediaFile> {
  const finalFile: import('../types').MediaFile = file.id
    ? (file as import('../types').MediaFile)
    : { ...file, id: randomUUID() };
  await q(
    `INSERT INTO media_files (id, filename, original_name, mime_type, size_bytes, url, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       filename = EXCLUDED.filename,
       original_name = EXCLUDED.original_name,
       mime_type = EXCLUDED.mime_type,
       size_bytes = EXCLUDED.size_bytes,
       url = EXCLUDED.url,
       created_at = EXCLUDED.created_at`,
    [
      finalFile.id,
      finalFile.filename,
      finalFile.originalName,
      finalFile.mimeType,
      finalFile.sizeBytes,
      finalFile.url,
      finalFile.createdAt,
    ]
  );
  return finalFile;
}

export async function insertMediaLink(
  link: import('../types').MediaLink,
  q: typeof query = query
): Promise<import('../types').MediaLink> {
  await q(
    `INSERT INTO product_media_links (file_id, variant_id, is_primary, sort_order, uploaded_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (file_id, variant_id) DO UPDATE SET
       is_primary = EXCLUDED.is_primary,
       sort_order = EXCLUDED.sort_order,
       uploaded_at = EXCLUDED.uploaded_at`,
    [link.fileId, link.variantId, link.isPrimary, link.sortOrder, link.uploadedAt]
  );
  return link;
}

export async function updateMediaLink(
  fileId: string,
  variantId: string,
  patch: Partial<import('../types').MediaLink>
): Promise<import('../types').MediaLink | null> {
  const row = await queryOne<any>(
    'SELECT * FROM product_media_links WHERE file_id = $1 AND variant_id = $2',
    [fileId, variantId]
  );
  if (!row) return null;
  const current: import('../types').MediaLink = {
    fileId: row.file_id,
    variantId: row.variant_id,
    isPrimary: !!row.is_primary,
    sortOrder: Number(row.sort_order ?? 0),
    uploadedAt: row.uploaded_at,
  };
  const merged: import('../types').MediaLink = {
    ...current,
    isPrimary: typeof patch.isPrimary === 'boolean' ? patch.isPrimary : current.isPrimary,
    sortOrder: typeof patch.sortOrder === 'number' ? patch.sortOrder : current.sortOrder,
  };
  if (merged.isPrimary) {
    await query(
      'UPDATE product_media_links SET is_primary = FALSE WHERE variant_id = $1 AND file_id <> $2',
      [merged.variantId, fileId]
    );
  }
  await query(
    `UPDATE product_media_links
     SET is_primary = $1, sort_order = $2
     WHERE file_id = $3 AND variant_id = $4`,
    [merged.isPrimary, merged.sortOrder, fileId, variantId]
  );
  return merged;
}

export async function deleteMediaFile(id: string): Promise<import('../types').MediaFile | null> {
  const existing = await getMediaFileById(id);
  if (!existing) return null;
  await query('DELETE FROM media_files WHERE id = $1', [id]);
  return existing;
}

export async function deleteMediaLink(
  fileId: string,
  variantId: string
): Promise<import('../types').MediaLink | null> {
  const row = await queryOne<any>(
    'SELECT * FROM product_media_links WHERE file_id = $1 AND variant_id = $2',
    [fileId, variantId]
  );
  if (!row) return null;
  await query(
    'DELETE FROM product_media_links WHERE file_id = $1 AND variant_id = $2',
    [fileId, variantId]
  );
  return {
    fileId: row.file_id,
    variantId: row.variant_id,
    isPrimary: !!row.is_primary,
    sortOrder: Number(row.sort_order ?? 0),
    uploadedAt: row.uploaded_at,
  };
}

export async function clearMediaLinksForVariant(variantId: string): Promise<void> {
  await query('DELETE FROM product_media_links WHERE variant_id = $1', [variantId]);
}

/** Вспомогательная: вернуть MediaFile + linkedSkus для фронтенда */
export async function getMediaFilesWithLinks(): Promise<
  (import('../types').MediaFile & { linkedSkus: string[] })[]
> {
  const files = await getAllMediaFiles();
  const links = await getAllMediaLinks();
  const linksByFile = new Map<string, string[]>();
  for (const l of links) {
    const arr = linksByFile.get(l.fileId) ?? [];
    arr.push(l.variantId);
    linksByFile.set(l.fileId, arr);
  }
  return files.map((f) => ({ ...f, linkedSkus: linksByFile.get(f.id) ?? [] }));
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
  await query('TRUNCATE products, dictionaries, kit_components, notifications, media_files, product_media_links RESTART IDENTITY CASCADE');
}

export async function exportAll(): Promise<DataBundle> {
  const products = await getAllProducts();
  const dicts: Record<string, DictionaryItem[]> = {};
  for (const t of DICT_TYPES) {
    dicts[t] = await getDictionary(t);
  }
  const kitComps = await query<import('../types').RawKitComponent>('SELECT * FROM kit_components ORDER BY kit_id, sort_order');
  const mediaFiles = await getAllMediaFiles();
  const mediaLinks = await getAllMediaLinks();
  // Для обратной совместимости с JSON-экспортом — собираем старый формат productMedia
  const productMedia: import('../types').RawProductMedia[] = [];
  for (const link of mediaLinks) {
    const file = mediaFiles.find((f) => f.id === link.fileId);
    if (!file) continue;
    productMedia.push({
      id: file.id,
      variantId: link.variantId,
      mediaType: file.mimeType.startsWith('video/') ? 'video' : 'image',
      url: file.url,
      fileName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      isPrimary: link.isPrimary,
      sortOrder: link.sortOrder,
      uploadedAt: link.uploadedAt,
    });
  }
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
    mediaFiles,
    mediaLinks,
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
      await query('DELETE FROM product_media_links');
      await query('DELETE FROM media_files');
      const fileMap = new Map<string, import('../types').MediaFile>();
      for (const m of data as RawProductMedia[]) {
        let file = fileMap.get(m.url);
        if (!file) {
          file = {
            id: m.id,
            filename: m.url.replace(/^\/uploads\//, ''),
            originalName: m.fileName,
            mimeType: m.mimeType,
            sizeBytes: m.sizeBytes,
            url: m.url,
            createdAt: m.uploadedAt,
          };
          fileMap.set(m.url, file);
          await insertMediaFile(file);
        }
        await insertMediaLink({
          fileId: file.id,
          variantId: m.variantId,
          isPrimary: m.isPrimary,
          sortOrder: m.sortOrder,
          uploadedAt: m.uploadedAt,
        });
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
