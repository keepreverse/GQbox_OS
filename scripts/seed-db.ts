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
import { ensureDefaultAdmin } from '../server/utils/dbStore';
import { generateProductName, buildDictMaps } from '../server/utils/productNaming';
import { DICT_TYPES } from '../server/types';
import type { RawProduct, DictionaryItem, RawKitComponent, RawProductMedia, MarketplaceListing } from '../server/types';

async function main() {
  console.log('Connecting to database...');

  await initSchema();

  await query('DELETE FROM products');
  await query('DELETE FROM dictionaries');
  await query('DELETE FROM notifications');

  // Load dictionaries into memory FIRST (needed for product name generation)
  const dictData: Record<string, DictionaryItem[]> = {};
  for (const type of DICT_TYPES) {
    dictData[type] = readCollection<DictionaryItem>(type);
  }

  const dictMaps = {
    categories: buildDictMaps(dictData['categories']),
    models: buildDictMaps(dictData['models']),
    colors: buildDictMaps(dictData['colors']),
    connectors: buildDictMaps(dictData['connectors']),
  };

  const products = readCollection<RawProduct>('products');
  let generatedCount = 0;
  for (const p of products) {
    if (!p.id || !p.sku) continue;
    if (!p.productName) {
      p.productName = generateProductName(p, dictMaps);
      generatedCount++;
    }
    const vals = productToDbParams(p as any);
    await query(productInsertSql(), vals);
  }
  console.log(`Seeded ${products.length} products (${generatedCount} names generated)`);

  for (const type of DICT_TYPES) {
    const data = dictData[type];
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

  // Marketplace listings (WB, Ozon)
  await query('DELETE FROM marketplace_listings');
  const marketplaceListings = readCollection<MarketplaceListing>('marketplaces');
  for (const m of marketplaceListings) {
    await query(
      `INSERT INTO marketplace_listings
         (id, marketplace, article, title, kind, skus, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (marketplace, article) DO UPDATE SET
         title = EXCLUDED.title,
         kind = EXCLUDED.kind,
         skus = EXCLUDED.skus,
         updated_at = EXCLUDED.updated_at`,
      [m.id, m.marketplace, m.article, m.title, m.kind, m.skus, m.createdAt, m.updatedAt]
    );
  }
  console.log(`Seeded ${marketplaceListings.length} marketplace listings`);

  console.log('Database seeded successfully!');

  const admin = await ensureDefaultAdmin('admin');
  console.log(`Default admin user ensured: ${admin.login} (${admin.role})`);

  await closePool();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
