// ─── DB Inspector (только dev-режим) ─────────────────────────────────────
// POST /api/dev/inspect — выполнить read-only SQL и вернуть {columns, rows}.
// Защита: разрешены только SELECT / WITH; в тексте запроса ищутся
// опасные ключевые слова (INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/GRANT/REVOKE).
// Лимит строк — `limit` из body (по умолчанию 500, максимум 5000).
// Бинарные значения (Buffer) сериализуются в hex; JSONB приходит как объект.

import { Router, Request, Response } from 'express';
import { isDbAvailable } from '../../utils/dbStore';
import { query } from '../../utils/db';

const router = Router();

const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|vacuum|reindex|cluster|lock|notify|listen|do|set|reset|commit|rollback|savepoint|prepare|execute|deallocate|call|refresh|move|fetch|close)\b/i;
const ALLOWED_START = /^\s*(select|with|explain|show)\b/i;
const MAX_LIMIT = 5000;
const DEFAULT_LIMIT = 500;
const QUERY_TIMEOUT_MS = 8000;

async function ensureDb(_req: Request, res: Response): Promise<boolean> {
  const ok = await isDbAvailable();
  if (!ok) {
    res.status(503).json({
      error: 'PostgreSQL is not available. Start it via `npm run db:start` and try again.',
    });
    return false;
  }
  return true;
}

function serializeValue(v: unknown): unknown {
  if (v == null) return v;
  if (Buffer.isBuffer(v)) {
    // JSON не имеет бинарного типа — отдаём hex и base64 (base64 пригодится для bytea).
    return { __type: 'bytes', hex: v.toString('hex'), base64: v.toString('base64') };
  }
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return v;
  return v;
}

router.post('/', async (req: Request, res: Response) => {
  if (!(await ensureDb(req, res))) return;
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

    // Оборачиваем запрос в лимит + таймаут. Postgres поддерживает statement_timeout
    // на уровне сессии через `SET` — но настраивать его на каждый запрос грязно,
    // поэтому используем Promise.race с setTimeout для жёсткого upper-bound.
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

export default router;
