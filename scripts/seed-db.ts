import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '..', 'server', 'data');

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/gqbox_os',
  });

  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    // Init schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(20) PRIMARY KEY,
        sku VARCHAR(50) NOT NULL,
        sku_base VARCHAR(50),
        category_id VARCHAR(50),
        model_id VARCHAR(50),
        color_id VARCHAR(50),
        supplier_id VARCHAR(50),
        body_material_id VARCHAR(50),
        wire_material_id VARCHAR(50),
        current_a DECIMAL(10,4),
        voltage_v DECIMAL(10,4),
        power_w DECIMAL(10,4),
        length_m DECIMAL(10,4),
        data_transfer_mbps INTEGER,
        device_count INTEGER,
        connector_female_id VARCHAR(50),
        connector_male_id VARCHAR(50),
        variant_code VARCHAR(10),
        length_variant VARCHAR(10),
        supplier_suffix VARCHAR(10),
        is_kit BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dictionaries (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(30) NOT NULL,
        name JSONB NOT NULL,
        parent_id VARCHAR(50),
        hex VARCHAR(10),
        short_name JSONB,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_dict_type ON dictionaries(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dict_parent ON dictionaries(parent_id)`);

    // Clear existing data
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM dictionaries');

    // Seed products
    const productsFile = resolve(DATA_DIR, 'products.json');
    if (existsSync(productsFile)) {
      const products = JSON.parse(readFileSync(productsFile, 'utf-8'));
      for (const p of products) {
        await client.query(`
          INSERT INTO products (id, sku, sku_base, category_id, model_id, color_id, supplier_id,
            body_material_id, wire_material_id, current_a, voltage_v, power_w, length_m,
            data_transfer_mbps, device_count, connector_female_id, connector_male_id,
            variant_code, length_variant, supplier_suffix, is_kit)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
          ON CONFLICT (id) DO NOTHING
        `, [
          p.id, p.sku, p.skuBase || null, p.categoryId || null, p.modelId || null,
          p.colorId || null, p.supplierId || null, p.bodyMaterialId || null,
          p.wireMaterialId || null, p.currentA ?? null, p.voltageV ?? null,
          p.powerW ?? null, p.lengthM ?? null, p.dataTransferMbps ?? null,
          p.deviceCount ?? null, p.connectorFemaleId || null, p.connectorMaleId || null,
          p.variantCode || null, p.lengthVariant || null, p.supplierSuffix || null,
          p.isKit || false,
        ]);
      }
      console.log(`Seeded ${products.length} products`);
    }

    // Seed dictionaries
    const dictTypes = ['categories', 'models', 'colors', 'connectors', 'chargingProtocols', 'materials', 'suppliers'];
    for (const type of dictTypes) {
      const file = resolve(DATA_DIR, `${type}.json`);
      if (!existsSync(file)) continue;
      const items = JSON.parse(readFileSync(file, 'utf-8'));
      for (const item of items) {
        const name = { source: item.name_source || item.name || '', product: item.name_product || item.nameRu || item.name || '' };
        const parentId = item.categoryId || item.parentId || null;
        const hex = item.hex || null;
        const shortName = item.shortName || null;
        await client.query(`
          INSERT INTO dictionaries (id, type, name, parent_id, hex, short_name, sort_order)
          VALUES ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7)
          ON CONFLICT (id) DO NOTHING
        `, [item.id, type, JSON.stringify(name), parentId, hex, shortName ? JSON.stringify(shortName) : null, item.sortOrder ?? 0]);
      }
      console.log(`Seeded ${items.length} ${type}`);
    }

    console.log('Database seeded successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
