// ─── Тест унифицированной аутентификации ─────────────────────────────────
// Создаём обычного пользователя через dev API (от имени admin),
// затем логинимся им в demo-режиме. Раньше это падало с 401, потому что
// demo-режим искал пользователя только в JSON. Теперь auth сначала
// проверяет PostgreSQL (если доступен), затем JSON.
//
// Также проверяет обновление роли пользователя через API.

import express from 'express';
import http from 'node:http';
import authRouter from '../server/routes/auth';
import devUsersRouter from '../server/routes/dev/users';
import { requireAuth } from '../server/middleware/auth';
import { getUserByLogin, isDbAvailable } from '../server/utils/dbStore';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/dev/users', requireAuth, devUsersRouter);

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
  console.log('Testing unified auth (PostgreSQL as source of truth)...\n');

  if (!(await isDbAvailable())) {
    console.error('PostgreSQL is not available. Run `npm run db:start` first.');
    process.exit(1);
  }

  const server = app.listen(0);
  const port = (server.address() as any).port;

  const testLogin = `testuser_${Date.now()}`;
  const testPassword = 'TestPassword123!';

  try {
    // 1. Убедимся, что admin существует (для токена).
    const { ensureDefaultAdmin } = await import('../server/utils/dbStore');
    await ensureDefaultAdmin('admin');

    // 2. Логинимся как admin в dev-режиме, чтобы получить токен.
    const adminLogin = await request(port, '/api/auth/login', {
      method: 'POST',
      mode: 'dev',
      body: JSON.stringify({ login: 'admin', password: 'admin' }),
    });
    assert(adminLogin.status === 200, 'admin login returns 200');
    const adminToken = adminLogin.body.token;
    assert(typeof adminToken === 'string', 'admin token received');

    // 3. Создаём обычного пользователя через dev API.
    const createRes = await request(port, '/api/dev/users', {
      method: 'POST',
      mode: 'dev',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        displayName: 'Test Regular User',
        login: testLogin,
        password: testPassword,
        role: 'user',
      }),
    });
    assert(createRes.status === 201, `create user returns 201 (got ${createRes.status})`);
    assert(createRes.body.login === testLogin, 'created user has correct login');
    const userId = createRes.body.id;

    // 4. Логинимся новым пользователем в DEMO-режиме (без dev).
    // Это и есть сценарий бага: после логаута devMode=false, но
    // пользователь создан в dev (PostgreSQL).
    const userLoginDemo = await request(port, '/api/auth/login', {
      method: 'POST',
      mode: 'demo',
      body: JSON.stringify({ login: testLogin, password: testPassword }),
    });
    assert(userLoginDemo.status === 200, `regular user can login in demo mode (got ${userLoginDemo.status})`);
    assert(userLoginDemo.body.user?.role === 'user', 'logged in user has role "user"');
    const userToken = userLoginDemo.body.token;

    // 5. /me работает в demo-режиме.
    const meDemo = await request(port, '/api/auth/me', {
      mode: 'demo',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(meDemo.status === 200, '/me works in demo mode for dev-created user');
    assert(meDemo.body.user?.login === testLogin, '/me returns correct user');

    // 6. Логин с неверным паролем отклоняется.
    const badLogin = await request(port, '/api/auth/login', {
      method: 'POST',
      mode: 'demo',
      body: JSON.stringify({ login: testLogin, password: 'wrongpassword' }),
    });
    assert(badLogin.status === 401, 'wrong password is rejected');

    // 7. Логин несуществующего пользователя отклоняется.
    const noUser = await request(port, '/api/auth/login', {
      method: 'POST',
      mode: 'demo',
      body: JSON.stringify({ login: 'nonexistent_user_xyz', password: 'whatever' }),
    });
    assert(noUser.status === 401, 'non-existent user is rejected');

    // 8. Обновление роли пользователя через dev API.
    const updateRes = await request(port, `/api/dev/users/${userId}`, {
      method: 'PUT',
      mode: 'dev',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert(updateRes.status === 200, `role update returns 200 (got ${updateRes.status})`);
    assert(updateRes.body.role === 'admin', 'role is updated to admin');

    // 9. Проверяем, что в БД роль реально обновилась.
    const dbUser = await getUserByLogin(testLogin);
    assert(dbUser !== null, 'user exists in DB');
    assert(dbUser?.role === 'admin', 'role in DB is admin');

    // 10. Логин в demo-режиме после смены роли — пользователь теперь admin.
    const relogin = await request(port, '/api/auth/login', {
      method: 'POST',
      mode: 'demo',
      body: JSON.stringify({ login: testLogin, password: testPassword }),
    });
    assert(relogin.status === 200, 'relogin after role change works');
    assert(relogin.body.user?.role === 'admin', 'role change is reflected on next login');

    console.log('\nUnified auth tests passed.');
  } finally {
    // Очистка: удаляем тестового пользователя, чтобы не мусорить в БД.
    try {
      const { deleteUser } = await import('../server/utils/dbStore');
      const u = await getUserByLogin(testLogin);
      if (u) await deleteUser(u.id);
    } catch {
      // ignore cleanup errors
    }
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
