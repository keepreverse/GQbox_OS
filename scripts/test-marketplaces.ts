// Запускает API-сервер на порту 3001 + гоняет smoke-тест marketplace-роутов.
// Завершается с exit-code 0 при успехе, иначе — 1.

import { spawn, ChildProcess } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { signToken } from '../server/utils/jwt';
import { ensureDefaultAdmin } from '../server/utils/dbStore';

const API = 'http://localhost:3001/api';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function jsonRequest<T>(
  url: string,
  init: RequestInit = {},
  token?: string
): Promise<{ status: number; body: T | null }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-GQbox-Mode': 'dev',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: T | null = null;
  try {
    body = text ? (JSON.parse(text) as T) : null;
  } catch {
    body = text as unknown as T;
  }
  return { status: res.status, body };
}

interface DemoListing {
  id: string;
  marketplace: 'wb' | 'ozon';
  article: string;
  title: string;
  kind: 'single' | 'bundle';
  skus: string[];
  createdAt: string;
  updatedAt: string;
}

async function waitForServer(): Promise<boolean> {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${API}/health`);
      if (r.ok) return true;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  return false;
}

async function killServer(proc: ChildProcess | null): Promise<void> {
  if (!proc || proc.killed) return;
  try {
    if (proc.pid !== undefined) {
      // Kill the entire process tree (Windows spawns npx.cmd → cmd.exe → tsx)
      spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    // best-effort
  }
  await sleep(500);
}

async function run() {
  console.log('Starting server on port 3001...');
  const serverProc: ChildProcess = spawn(
    'npx.cmd',
    ['tsx', '--env-file=.env', 'server/index.ts'],
    {
      cwd: process.cwd(),
      env: { ...process.env, JWT_SECRET: 'test-secret-for-jest-runs' },
      stdio: 'ignore',
      shell: true,
    }
  );

  let exitCode = 0;
  try {
    const ready = await waitForServer();
    assert(ready, 'server became ready within 20s');

    console.log('\nTesting marketplace routes (demo + dev)...\n');

    // ─── Demo: GET /api/demo/marketplaces ──────────────────────────────────
    {
      const r = await jsonRequest<DemoListing[]>(`${API}/demo/marketplaces`);
      assert(r.status === 200, `GET /api/demo/marketplaces → 200 (got ${r.status})`);
      assert(Array.isArray(r.body), 'demo listings is an array');
      const list = r.body ?? [];
      assert(list.length > 0, `demo listings is non-empty (${list.length} items)`);
      const sample = list[0];
      assert(
        sample.marketplace === 'wb' || sample.marketplace === 'ozon',
        'listing has valid marketplace'
      );
      assert(typeof sample.article === 'string' && sample.article.length > 0, 'listing has article');
      assert(Array.isArray(sample.skus), 'listing has skus array');
      assert(typeof sample.id === 'string' && sample.id.length > 0, 'listing has id');
    }

    // ─── Demo: by-sku lookup ──────────────────────────────────────────────
    {
      const all = await jsonRequest<DemoListing[]>(`${API}/demo/marketplaces`);
      const first = (all.body ?? [])[0];
      if (first && first.skus.length > 0) {
        const sku = first.skus[0];
        const r = await jsonRequest<DemoListing[]>(
          `${API}/demo/marketplaces/by-sku/${encodeURIComponent(sku)}`
        );
        assert(r.status === 200, `GET /api/demo/marketplaces/by-sku/:sku → 200 (got ${r.status})`);
        const matched = r.body ?? [];
        const found = matched.some((m) => m.id === first.id);
        assert(found, `by-sku lookup returns listings for ${sku}`);
      } else {
        console.log('SKIP: no demo listings with skus to test by-sku');
      }
    }

    // ─── Demo: UNIQUE constraint ──────────────────────────────────────────
    {
      const all = await jsonRequest<DemoListing[]>(`${API}/demo/marketplaces`);
      const first = (all.body ?? [])[0];
      if (first) {
        const r = await jsonRequest<{ error?: string }>(`${API}/demo/marketplaces`, {
          method: 'POST',
          body: JSON.stringify({
            marketplace: first.marketplace,
            article: first.article,
            title: 'duplicate test',
            kind: 'single',
            skus: ['TEST-001'],
          }),
        });
        assert(r.status === 409, `duplicate marketplace+article → 409 (got ${r.status})`);
      } else {
        console.log('SKIP: no demo listings to test UNIQUE constraint');
      }
    }

    // ─── Demo: POST → GET → DELETE ────────────────────────────────────────
    {
      const article = `TEST-${Date.now()}`;
      const create = await jsonRequest<DemoListing>(`${API}/demo/marketplaces`, {
        method: 'POST',
        body: JSON.stringify({
          marketplace: 'wb',
          article,
          title: 'Test listing',
          kind: 'bundle',
          skus: ['S10005/02', 'S10005/02'],
        }),
      });
      assert(create.status === 201, `POST /api/demo/marketplaces → 201 (got ${create.status})`);
      assert(create.body?.article === article, 'created listing has correct article');
      assert(
        create.body?.skus.length === 2 &&
          create.body?.skus[0] === 'S10005/02' &&
          create.body?.skus[1] === 'S10005/02',
        'created listing preserves duplicate skus (e.g. "2 шт.")'
      );

      const get = await jsonRequest<DemoListing>(
        `${API}/demo/marketplaces/${create.body?.id}`
      );
      assert(get.status === 200, `GET /api/demo/marketplaces/:id → 200 (got ${get.status})`);

      const del = await jsonRequest<{ ok: boolean }>(
        `${API}/demo/marketplaces/${create.body?.id}`,
        { method: 'DELETE' }
      );
      assert(del.status === 200, `DELETE /api/demo/marketplaces/:id → 200 (got ${del.status})`);

      const get404 = await jsonRequest<{ error?: string }>(
        `${API}/demo/marketplaces/${create.body?.id}`
      );
      assert(get404.status === 404, `GET deleted listing → 404 (got ${get404.status})`);
    }

    // ─── Dev: requires auth, then returns data ────────────────────────────
    {
      const noAuth = await jsonRequest<unknown>(`${API}/dev/marketplaces`);
      assert(
        noAuth.status === 401,
        `GET /api/dev/marketplaces without auth → 401 (got ${noAuth.status})`
      );

      const admin = await ensureDefaultAdmin('admin');
      const token = signToken({ sub: admin.login, role: admin.role });
      const withAuth = await jsonRequest<DemoListing[]>(`${API}/dev/marketplaces`, {}, token);
      assert(
        withAuth.status === 200 || withAuth.status === 503,
        `GET /api/dev/marketplaces with auth → 200 or 503 (got ${withAuth.status})`
      );
      if (withAuth.status === 200) {
        assert(Array.isArray(withAuth.body), 'dev listings is an array');
        const devList = withAuth.body ?? [];
        if (devList.length === 0) {
          console.log(
            'NOTE: dev listings empty (PostgreSQL not seeded with marketplace_listings yet). Skipping data-shape assertions.'
          );
        } else {
          const sample = devList[0];
          assert(
            sample.marketplace === 'wb' || sample.marketplace === 'ozon',
            'dev listing has valid marketplace'
          );
          assert(typeof sample.id === 'string' && sample.id.length > 0, 'dev listing has id');
          assert(
            !!(sample.createdAt && sample.updatedAt),
            'dev listing has createdAt and updatedAt timestamps'
          );
        }
      } else {
        console.log(
          'NOTE: dev GET returned 503 (PostgreSQL not available); skipping dev data assertions'
        );
      }
    }

    console.log('\nAll marketplace tests passed.');
  } catch (err) {
    console.error('Test failed with error:', err);
    exitCode = 1;
  } finally {
    await killServer(serverProc);
  }

  process.exit(exitCode);
}

run();
