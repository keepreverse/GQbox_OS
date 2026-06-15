import express from 'express';
import http from 'node:http';
import authRouter from '../server/routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

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
      'X-GQbox-Mode': 'demo',
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
  console.log('Testing demo auth flow...\n');

  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 1. Login with default demo admin
    const loginRes = await request(port, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: 'admin', password: 'admin' }),
    });
    assert(loginRes.status === 200, 'login returns 200');
    assert(typeof loginRes.body.token === 'string', 'login returns token');
    assert(loginRes.body.user?.login === 'admin', 'login returns admin user');

    const token = loginRes.body.token;

    // 2. Call /me with the token
    const meRes = await request(port, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(meRes.status === 200, '/me returns 200 with valid token');
    assert(meRes.body.user?.login === 'admin', '/me returns admin user');

    // 3. Call /me without token
    const noAuthRes = await request(port, '/api/auth/me');
    assert(noAuthRes.status === 401, '/me returns 401 without token');

    // 4. Call /me with old UUID-style token (simulates pre-JWT session)
    const oldTokenRes = await request(port, '/api/auth/me', {
      headers: { Authorization: 'Bearer 550e8400-e29b-41d4-a716-446655440000' },
    });
    assert(oldTokenRes.status === 401, '/me returns 401 for old UUID token');

    // 5. Call /me with tampered JWT
    const tamperedRes = await request(port, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}x` },
    });
    assert(tamperedRes.status === 401, '/me returns 401 for tampered token');

    console.log('\nAll auth flow tests passed.');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
