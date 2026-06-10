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
        product_name VARCHAR(255),
        is_kit BOOLEAN DEFAULT FALSE,
        connection_type VARCHAR(50),
        charging_protocol_id VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const col of [
      'ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50)',
      'ADD COLUMN IF NOT EXISTS charging_protocol_id VARCHAR(50)',
      'ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
      'ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)',
    ]) {
      await client.query(`ALTER TABLE products ${col}`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        unread BOOLEAN DEFAULT TRUE,
        type VARCHAR(20) DEFAULT 'info',
        action_view VARCHAR(50)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS kit_components (
        kit_id VARCHAR(20) NOT NULL,
        component_id VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (kit_id, component_id),
        FOREIGN KEY (kit_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (component_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dictionaries (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(30) NOT NULL,
        name JSONB NOT NULL,
        parent_id VARCHAR(50),
        code VARCHAR(20),
        color VARCHAR(20),
        icon VARCHAR(50),
        description TEXT,
        contact_info TEXT,
        short_name JSONB,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dictionaries' AND column_name='hex') THEN
          ALTER TABLE dictionaries RENAME COLUMN hex TO color;
        END IF;
      END $$;
    `);
    await client.query(`ALTER TABLE dictionaries DROP COLUMN IF EXISTS category_color`);
    await client.query(`ALTER TABLE dictionaries ALTER COLUMN color TYPE VARCHAR(20)`);

    for (const col of [
      'ADD COLUMN IF NOT EXISTS code VARCHAR(20)',
      'ADD COLUMN IF NOT EXISTS icon VARCHAR(50)',
      'ADD COLUMN IF NOT EXISTS description TEXT',
      'ADD COLUMN IF NOT EXISTS contact_info TEXT',
      'ADD COLUMN IF NOT EXISTS color VARCHAR(20)',
    ]) {
      await client.query(`ALTER TABLE dictionaries ${col}`);
    }

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
            variant_code, length_variant, supplier_suffix, product_name, is_kit,
            connection_type, charging_protocol_id, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
          ON CONFLICT (id) DO NOTHING
        `, [
          p.id, p.sku, p.skuBase || null, p.categoryId || null, p.modelId || null,
          p.colorId || null, p.supplierId || null, p.bodyMaterialId || null,
          p.wireMaterialId || null, p.currentA ?? null, p.voltageV ?? null,
          p.powerW ?? null, p.lengthM ?? null, p.dataTransferMbps ?? null,
          p.deviceCount ?? null, p.connectorFemaleId || null, p.connectorMaleId || null,
          p.variantCode || null, p.lengthVariant || null, p.supplierSuffix || null,
          p.productName || null,
          p.isKit || false,
          p.connectionType || null, p.chargingProtocolId || null, p.isActive ?? true,
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
        const code = item.code || null;
        const color = item.color || item.hex || item.hexValue || item.categoryColor || null;
        const icon = item.icon || null;
        const description = item.description || null;
        const contactInfo = item.contactInfo || null;
        const shortName = item.shortName || null;
        await client.query(`
          INSERT INTO dictionaries (id, type, name, parent_id, code, color, icon, description, contact_info, short_name, sort_order)
          VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
          ON CONFLICT (id) DO NOTHING
        `, [item.id, type, JSON.stringify(name), parentId, code, color, icon, description, contactInfo, shortName ? JSON.stringify(shortName) : null, item.sortOrder ?? 0]);
      }
      console.log(`Seeded ${items.length} ${type}`);
    }

    // Seed kit components
    const kitComponentsFile = resolve(DATA_DIR, 'kitComponents.json');
    if (existsSync(kitComponentsFile)) {
      const kitComponents = JSON.parse(readFileSync(kitComponentsFile, 'utf-8'));
      for (const k of kitComponents) {
        await client.query(`
          INSERT INTO kit_components (kit_id, component_id, quantity, sort_order)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (kit_id, component_id) DO NOTHING
        `, [k.kitId, k.componentId, k.quantity ?? 1, k.sortOrder ?? 0]);
      }
      console.log(`Seeded ${kitComponents.length} kit components`);
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
