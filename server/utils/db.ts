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

export async function initSchema(): Promise<void> {
  await query(`
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

  await query(`
    CREATE TABLE IF NOT EXISTS dictionaries (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(30) NOT NULL,
      name JSONB NOT NULL,
      parent_id VARCHAR(50),
      code VARCHAR(20),
      hex VARCHAR(10),
      icon VARCHAR(50),
      description TEXT,
      contact_info TEXT,
      short_name JSONB,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add columns if missing (migration for existing DBs)
  for (const col of [
    'ADD COLUMN IF NOT EXISTS code VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS icon VARCHAR(50)',
    'ADD COLUMN IF NOT EXISTS description TEXT',
    'ADD COLUMN IF NOT EXISTS contact_info TEXT',
  ]) {
    await query(`ALTER TABLE dictionaries ${col}`);
  }

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
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
