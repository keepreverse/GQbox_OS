import express from 'express';
import http from 'node:http';
import inspectorRouter from '../server/routes/dev/inspect';
import { ensureDefaultAdmin } from '../server/utils/dbStore';

const app = express();
app.use(express.json());
app.use('/api/dev/inspector', inspectorRouter);

interface TestRequestInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

function request(port: number, path: string, init?: TestRequestInit): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-GQbox-Mode': 'dev',
      ...(init?.headers ?? {}),
    };
    const body = init?.body ? String(init.body) : undefined;
    const req = http.request(url, { method: init?.method || 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function run() {
  console.log('Testing DB inspector routes...\n');

  // Ensure DB is available and has at least the users table.
  await ensureDefaultAdmin('admin');

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. List tables
    const tablesRes = await request(port, '/api/dev/inspector/tables');
    assert(tablesRes.status === 200, 'GET /tables returns 200');
    assert(Array.isArray(tablesRes.body), 'GET /tables returns an array');
    const usersTable = tablesRes.body.find((t: any) => t.name === 'users');
    assert(usersTable, 'GET /tables includes users table');
    assert(usersTable.columns.length > 0, 'users table has columns');

    // 2. Dump users table
    const dumpRes = await request(port, '/api/dev/inspector/tables/users');
    assert(dumpRes.status === 200, 'GET /tables/users returns 200');
    assert(Array.isArray(dumpRes.body.columns), 'dump has columns');
    assert(Array.isArray(dumpRes.body.rows), 'dump has rows');

    // 3. Run a read-only query
    const queryRes = await request(port, '/api/dev/inspector/query', {
      method: 'POST',
      body: JSON.stringify({ sql: 'SELECT login, role FROM users LIMIT 1' }),
    });
    assert(queryRes.status === 200, 'POST /query returns 200');
    assert(Array.isArray(queryRes.body.rows), 'query result has rows');

    // 4. Mutating query should be rejected
    const mutateRes = await request(port, '/api/dev/inspector/query', {
      method: 'POST',
      body: JSON.stringify({ sql: 'DELETE FROM users' }),
    });
    assert(mutateRes.status === 400, 'DELETE query is rejected');

    // 5. Invalid table name
    const invalidRes = await request(port, '/api/dev/inspector/tables/users;DROP');
    assert(invalidRes.status === 400, 'Invalid table name is rejected');

    console.log('\nDB inspector tests passed.');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
