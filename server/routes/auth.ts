import { Router, type Request, type Response } from 'express';
import { isDbAvailable } from '../utils/dbStore';
import * as dbAuth from '../utils/dbStore';
import * as demoAuth from '../utils/demoUserStore';
import { signToken, verifyToken } from '../utils/jwt';

const router = Router();

export type AuthMode = 'demo' | 'dev';

function sanitizeUser<T>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...safe } = user as T & { passwordHash?: string };
  return safe as Omit<T, 'passwordHash'>;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

type UserWithPassword = {
  id: string;
  displayName: string;
  login: string;
  role: string;
  isActive: boolean;
  passwordHash: string;
};

/**
 * Унифицированный поиск пользователя по login с проверкой пароля.
 * Приоритет: PostgreSQL (если доступен) → JSON demo store.
 * Это позволяет логиниться пользователям, созданным в dev-режиме,
 * независимо от текущего значения `X-GQbox-Mode` на клиенте.
 */
async function findUserWithPassword(login: string, password: string): Promise<UserWithPassword | null> {
  const trimmedLogin = String(login).trim();
  if (!trimmedLogin || !password) return null;

  if (await isDbAvailable()) {
    const found = await dbAuth.getUserWithPasswordByLogin(trimmedLogin);
    if (found && found.isActive) {
      const valid = await dbAuth.verifyPassword(String(password), found.passwordHash);
      if (valid) return found;
      // Пользователь найден, но пароль неверный — не ищем в demo, чтобы
      // не маскировать ошибку и не давать ложноположительных результатов.
      return null;
    }
  }

  // Fallback: JSON demo store (когда PostgreSQL недоступен или пользователь
  // существует только там).
  await demoAuth.ensureDefaultAdmin();
  const demoFound = demoAuth.getUserWithPasswordByLogin(trimmedLogin);
  if (demoFound && demoFound.isActive) {
    const valid = await demoAuth.verifyPassword(String(password), demoFound.passwordHash);
    if (valid) return demoFound;
  }

  return null;
}

/**
 * Унифицированный поиск пользователя по login (без пароля) для /me.
 */
async function findUserByLogin(login: string) {
  const trimmedLogin = String(login).trim();
  if (!trimmedLogin) return null;

  if (await isDbAvailable()) {
    const found = await dbAuth.getUserByLogin(trimmedLogin);
    if (found) return found;
  }

  await demoAuth.ensureDefaultAdmin();
  const demoFound = demoAuth.getUserByLogin(trimmedLogin);
  if (demoFound) return demoFound;

  return null;
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) {
      res.status(400).json({ error: 'Login and password are required' });
      return;
    }

    const found = await findUserWithPassword(login, password);
    if (!found) {
      res.status(401).json({ error: 'Invalid login or password' });
      return;
    }

    const user = sanitizeUser(found);
    const token = signToken({ sub: user.login, role: user.role });
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await findUserByLogin(payload.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
// Stateless JWT: logout is handled client-side by removing the token.
// The endpoint remains for API symmetry and future token blacklisting.
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;
