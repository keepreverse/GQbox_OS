import { readCollection } from '../server/utils/jsonStore';
import { query, initSchema, closePool } from '../server/utils/db';
import {
  productInsertSql,
  productToDbParams,
  dictInsertSql,
  dictNameToJson,
  sanitizeDictItem,
  kitComponentInsertSql,
  kitComponentToDbParams,
} from '../server/utils/mappers';
import { DICT_TYPES } from '../server/types';
import type { RawProduct, DictionaryItem, RawKitComponent, RawProductMedia } from '../server/types';

async function main() {
  console.log('Connecting to database...');

  await initSchema();

  await query('DELETE FROM products');
  await query('DELETE FROM dictionaries');
  await query('DELETE FROM notifications');

  const products = readCollection<RawProduct>('products');
  for (const p of products) {
    if (!p.id || !p.sku) continue;
    const vals = productToDbParams(p as any);
    await query(productInsertSql(), vals);
  }
  console.log(`Seeded ${products.length} products`);

  for (const type of DICT_TYPES) {
    const data = readCollection<DictionaryItem>(type);
    if (data.length === 0) continue;
    for (const item of data) {
      if (!item.id) continue;
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
    }
    console.log(`Seeded ${data.length} ${type}`);
  }

  const kitComponents = readCollection<RawKitComponent>('kitComponents');
  for (const k of kitComponents) {
    if (!k.kitId || !k.componentId) continue;
    const vals = kitComponentToDbParams(k);
    await query(kitComponentInsertSql(), vals);
  }
  console.log(`Seeded ${kitComponents.length} kit components`);

  const productMedia = readCollection<RawProductMedia>('productMedia');
  for (const m of productMedia) {
    await query(
      `INSERT INTO product_media
         (id, variant_id, media_type, url, file_name, mime_type, size_bytes,
          is_primary, sort_order, uploaded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        m.id, m.variantId, m.mediaType, m.url ?? '', m.fileName ?? '',
        m.mimeType ?? '', m.sizeBytes ?? 0, !!m.isPrimary,
        m.sortOrder ?? 0, m.uploadedAt ?? new Date().toISOString(),
      ]
    );
  }
  console.log(`Seeded ${productMedia.length} product media`);

  console.log('Database seeded successfully!');
  await closePool();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
