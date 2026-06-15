// ─── DB Inspector (только dev-режим) ─────────────────────────────────────
// GET  /api/dev/inspector/tables              — список таблиц с метаданными.
// GET  /api/dev/inspector/tables/:table       — дамп таблицы (LIMIT 5000).
// POST /api/dev/inspector/query               — выполнить read-only SQL.
//
// Защита: разрешены только SELECT / WITH / EXPLAIN / SHOW; в тексте запроса
// ищутся опасные ключевые слова (INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/
// CREATE/GRANT/REVOKE). Лимит строк — `limit` из body (по умолчанию 500,
// максимум 5000). Бинарные значения (Buffer) сериализуются в hex; JSONB
// приходит как объект.

import { Router, Request, Response } from 'express';
import { isDbAvailable } from '../../utils/dbStore';
import { query, queryOne } from '../../utils/db';

const router = Router();

const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|vacuum|reindex|cluster|lock|notify|listen|do|set|reset|commit|rollback|savepoint|prepare|execute|deallocate|call|refresh|move|fetch|close)\b/i;
const ALLOWED_START = /^\s*(select|with|explain|show)\b/i;
const MAX_LIMIT = 5000;
const DEFAULT_LIMIT = 500;
const DUMP_LIMIT = 5000;
const QUERY_TIMEOUT_MS = 8000;

async function ensureDb(res: Response): Promise<boolean> {
  const ok = await isDbAvailable();
  if (!ok) {
    res.status(503).json({
      error: 'PostgreSQL is not available. Start it via `npm run db:start` and try again.',
    });
    return false;
  }
  return true;
}

function prettyBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = units[Math.min(i, units.length - 1)];
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${unit}`;
}

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function serializeValue(v: unknown): unknown {
  if (v == null) return v;
  if (Buffer.isBuffer(v)) {
    return { __type: 'bytes', hex: v.toString('hex'), base64: v.toString('base64') };
  }
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return v;
  return v;
}

// GET /api/dev/inspector/tables
router.get('/tables', async (_req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const tables = await query<{ table_name: string; total_bytes: number; row_estimate: number }>(`
      SELECT
        c.relname AS table_name,
        c.reltuples::bigint AS row_estimate,
        pg_total_relation_size(c.oid) AS total_bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY c.relname
    `, []);

    const columns = await query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `, []);

    const columnsByTable = new Map<string, { name: string; dataType: string; isNullable: boolean }[]>();
    for (const col of columns) {
      const list = columnsByTable.get(col.table_name) ?? [];
      list.push({
        name: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
      });
      columnsByTable.set(col.table_name, list);
    }

    const result = tables.map((t) => ({
      name: t.table_name,
      rowEstimate: Number(t.row_estimate),
      totalBytes: Number(t.total_bytes),
      totalSize: prettyBytes(Number(t.total_bytes)),
      columns: columnsByTable.get(t.table_name) ?? [],
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dev/inspector/tables/:table
router.get('/tables/:table', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const table = String(req.params.table || '');
    if (!isValidIdentifier(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }

    const exists = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `, [table]);
    if (!exists?.exists) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    const rows = (await query(`SELECT * FROM "${table}" LIMIT ${DUMP_LIMIT}`, [])) as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const serialized = rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const k of columns) out[k] = serializeValue(r[k]);
      return out;
    });

    res.json({
      columns,
      rows: serialized,
      rowCount: serialized.length,
      truncated: rows.length === DUMP_LIMIT,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/dev/inspector/query
router.post('/query', async (req: Request, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const body = (req.body ?? {}) as { sql?: unknown; limit?: unknown; params?: unknown };
    const sql = typeof body.sql === 'string' ? body.sql.trim() : '';
    const params = Array.isArray(body.params) ? body.params : [];
    const limitNum = Number(body.limit);
    const limit = Number.isFinite(limitNum) && limitNum > 0
      ? Math.min(Math.floor(limitNum), MAX_LIMIT)
      : DEFAULT_LIMIT;

    if (!sql) {
      res.status(400).json({ error: 'SQL is required' });
      return;
    }
    if (!ALLOWED_START.test(sql)) {
      res.status(400).json({ error: 'Only SELECT / WITH / EXPLAIN / SHOW queries are allowed' });
      return;
    }
    if (FORBIDDEN.test(sql)) {
      res.status(400).json({
        error:
          'Forbidden keyword detected. DB Inspector is read-only. Use psql/pgAdmin for mutations.',
      });
      return;
    }

    const hasLimit = /\bLIMIT\b/i.test(sql);
    const finalSql = hasLimit ? sql : `${sql.replace(/;$/, '')} LIMIT ${limit}`;

    const timedQuery = query(finalSql, params);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${QUERY_TIMEOUT_MS}ms`)), QUERY_TIMEOUT_MS)
    );
    const rows = (await Promise.race([timedQuery, timeout])) as Record<string, unknown>[];
    const limited = rows.slice(0, limit);
    const columns = limited.length > 0 ? Object.keys(limited[0]) : [];
    const serialized = limited.map((r) => {
      const out: Record<string, unknown> = {};
      for (const k of columns) out[k] = serializeValue(r[k]);
      return out;
    });
    res.json({
      columns,
      rows: serialized,
      rowCount: limited.length,
      truncated: rows.length > limit,
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

export default router;
