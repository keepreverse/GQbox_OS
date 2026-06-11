import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/gqbox_os',
      max: 10,
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (tx: { query: typeof query; queryOne: typeof queryOne }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const txQuery: typeof query = async <U = any>(text: string, params?: any[]) => {
      const result = await client.query(text, params);
      return result.rows as U[];
    };
    const txQueryOne: typeof queryOne = async <U = any>(text: string, params?: any[]) => {
      const rows = await txQuery<U>(text, params);
      return rows[0] ?? null;
    };
    const result = await fn({ query: txQuery, queryOne: txQueryOne });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function initSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(40) PRIMARY KEY,
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

  // Add columns if missing (migration for existing DBs)
  for (const col of [
    'ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50)',
    'ADD COLUMN IF NOT EXISTS charging_protocol_id VARCHAR(50)',
    'ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
    'ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)',
  ]) {
    await query(`ALTER TABLE products ${col}`);
  }

  await query(`
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

  // Migration: rename hex → color (if hex exists), drop category_color
  await query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dictionaries' AND column_name='hex') THEN
        ALTER TABLE dictionaries RENAME COLUMN hex TO color;
      END IF;
    END $$;
  `);
  await query(`ALTER TABLE dictionaries DROP COLUMN IF EXISTS category_color`);

  // Add columns if missing (migration for existing DBs)
  await query(`ALTER TABLE dictionaries ALTER COLUMN color TYPE VARCHAR(20)`);

  await query(`CREATE INDEX IF NOT EXISTS idx_dict_type ON dictionaries(type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_dict_parent ON dictionaries(parent_id)`);

  await query(`
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

  await query(`
    CREATE TABLE IF NOT EXISTS kit_components (
      kit_id VARCHAR(40) NOT NULL,
      component_id VARCHAR(40) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (kit_id, component_id),
      FOREIGN KEY (kit_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (component_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // ─── product_media: фото/видео вариантов товаров ─────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS product_media (
      id VARCHAR(40) PRIMARY KEY,
      variant_id VARCHAR(40) NOT NULL,
      media_type VARCHAR(10) NOT NULL,
      url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(80) NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (variant_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_product_media_variant ON product_media(variant_id)`);

  // Migration: widen id columns to fit UUIDs (36 chars) on existing DBs
  await query(`ALTER TABLE products ALTER COLUMN id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE product_media ALTER COLUMN id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE product_media ALTER COLUMN variant_id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE kit_components ALTER COLUMN kit_id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE kit_components ALTER COLUMN component_id TYPE VARCHAR(40)`);

  // Migration: clean up any records with empty id from prior bug
  await query(`DELETE FROM product_media WHERE id IS NULL OR id = ''`);
  await query(`DELETE FROM products WHERE id IS NULL OR id = ''`);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
