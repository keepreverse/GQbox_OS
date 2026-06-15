import express from 'express';
import http from 'node:http';
import authRouter from '../server/routes/auth';
import { requireAuth, requireAdmin } from '../server/middleware/auth';
import { ensureDefaultAdmin } from '../server/utils/dbStore';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

app.use('/api/dev', requireAuth, requireAdmin);
app.get('/api/dev/secret', (_req, res) => {
  res.json({ ok: true });
});

interface TestRequestInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  mode?: 'demo' | 'dev';
}

function request(port: number, path: string, init?: TestRequestInit): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-GQbox-Mode': init?.mode || 'demo',
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
  console.log('Testing dev route middleware...\n');

  await ensureDefaultAdmin('admin');

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Access dev route without token
    const noAuth = await request(port, '/api/dev/secret', { mode: 'dev' });
    assert(noAuth.status === 401, 'dev route returns 401 without token');

    // 2. Login in demo mode and try dev route
    const loginRes = await request(port, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: 'admin', password: 'admin' }),
      mode: 'demo',
    });
    assert(loginRes.status === 200, 'demo login returns 200');
    const token = loginRes.body.token;

    const devAccess = await request(port, '/api/dev/secret', {
      mode: 'dev',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(devAccess.status === 200, 'dev route returns 200 with valid admin token');

    // 3. Tampered token should be rejected
    const tampered = await request(port, '/api/dev/secret', {
      mode: 'dev',
      headers: { Authorization: `Bearer ${token}x` },
    });
    assert(tampered.status === 401, 'dev route returns 401 for tampered token');

    console.log('\nDev middleware tests passed.');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
