import express from 'express';
import http from 'node:http';
import authRouter from '../server/routes/auth';
import { ensureDefaultAdmin } from '../server/utils/dbStore';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

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
  console.log('Testing mode switch auth flow...\n');

  // Ensure dev DB has admin (this is what npm run db:seed does)
  await ensureDefaultAdmin('admin');

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Login in demo mode
    const loginRes = await request(port, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: 'admin', password: 'admin' }),
      mode: 'demo',
    });
    assert(loginRes.status === 200, 'demo login returns 200');
    const token = loginRes.body.token;
    assert(typeof token === 'string', 'demo login returns token');

    // 2. Verify token works in demo mode
    const demoMe = await request(port, '/api/auth/me', {
      mode: 'demo',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(demoMe.status === 200, '/me returns 200 in demo mode');

    // 3. Verify SAME token works in dev mode (mode switch scenario)
    const devMe = await request(port, '/api/auth/me', {
      mode: 'dev',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(devMe.status === 200, '/me returns 200 in dev mode with same token');
    assert(devMe.body.user?.login === 'admin', '/me returns admin user in dev mode');

    console.log('\nMode switch auth flow tests passed.');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
