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

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (tx: { query: typeof query; queryOne: typeof queryOne }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const txQuery: typeof query = async <U = unknown>(text: string, params?: unknown[]) => {
      const result = await client.query(text, params);
      return result.rows as U[];
    };
    const txQueryOne: typeof queryOne = async <U = unknown>(text: string, params?: unknown[]) => {
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
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      marketplace_skus JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);

  // Add columns if missing (migration for existing DBs)
  for (const col of [
    'ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50)',
    'ADD COLUMN IF NOT EXISTS charging_protocol_id VARCHAR(50)',
    'ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
    'ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)',
    "ADD COLUMN IF NOT EXISTS marketplace_skus JSONB NOT NULL DEFAULT '[]'::jsonb",
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

  // ─── media_files: уникальные медиафайлы (хранилище) ───────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS media_files (
      id VARCHAR(40) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(80) NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ─── product_media_links: связи файл ↔ товар (M:N) ───────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS product_media_links (
      file_id VARCHAR(40) NOT NULL,
      variant_id VARCHAR(40) NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (file_id, variant_id),
      FOREIGN KEY (file_id) REFERENCES media_files(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_media_links_variant ON product_media_links(variant_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_media_links_file ON product_media_links(file_id)`);

  // Migration: переход от старой product_media → новые media_files + links
  await query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_media') THEN
        INSERT INTO media_files (id, filename, original_name, mime_type, size_bytes, url, created_at)
        SELECT DISTINCT ON (url)
          id,
          substring(url from '^/uploads/(.+)$') as filename,
          file_name as original_name,
          mime_type,
          size_bytes,
          url,
          uploaded_at
        FROM product_media
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO product_media_links (file_id, variant_id, is_primary, sort_order, uploaded_at)
        SELECT id, variant_id, is_primary, sort_order, uploaded_at
        FROM product_media
        ON CONFLICT (file_id, variant_id) DO NOTHING;

        DROP TABLE product_media CASCADE;
      END IF;
    END $$;
  `);

  // Migration: widen id columns to fit UUIDs (36 chars) on existing DBs
  await query(`ALTER TABLE products ALTER COLUMN id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE media_files ALTER COLUMN id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE product_media_links ALTER COLUMN file_id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE product_media_links ALTER COLUMN variant_id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE kit_components ALTER COLUMN kit_id TYPE VARCHAR(40)`);
  await query(`ALTER TABLE kit_components ALTER COLUMN component_id TYPE VARCHAR(40)`);

  // Migration: clean up any records with empty id from prior bug
  await query(`DELETE FROM media_files WHERE id IS NULL OR id = ''`);
  await query(`DELETE FROM product_media_links WHERE file_id IS NULL OR file_id = ''`);
  await query(`DELETE FROM products WHERE id IS NULL OR id = ''`);

  // ─── users ──────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(40) PRIMARY KEY,
      display_name VARCHAR(255) NOT NULL,
      login VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
