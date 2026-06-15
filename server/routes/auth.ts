import { Router, type Request, type Response } from 'express';
import { isDbAvailable } from '../utils/dbStore';
import * as dbAuth from '../utils/dbStore';
import * as demoAuth from '../utils/demoUserStore';
import { signToken, verifyToken } from '../utils/jwt';

const router = Router();

export type AuthMode = 'demo' | 'dev';

function getMode(req: Request): AuthMode {
  const mode = req.headers['x-gqbox-mode'];
  return mode === 'dev' ? 'dev' : 'demo';
}

function sanitizeUser<T>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...safe } = user as T & { passwordHash?: string };
  return safe as Omit<T, 'passwordHash'>;
}

async function ensureDevDb(res: Response): Promise<boolean> {
  const ok = await isDbAvailable();
  if (!ok) {
    res.status(503).json({
      error: 'PostgreSQL is not available. Start it via `npm run db:start` and try again.',
    });
    return false;
  }
  return true;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const mode = getMode(req);
    const { login, password } = req.body || {};
    if (!login || !password) {
      res.status(400).json({ error: 'Login and password are required' });
      return;
    }

    let user: { id: string; displayName: string; login: string; role: string; isActive: boolean } | null = null;

    if (mode === 'dev') {
      if (!(await ensureDevDb(res))) return;
      const found = await dbAuth.getUserWithPasswordByLogin(String(login));
      if (!found || !found.isActive) {
        res.status(401).json({ error: 'Invalid login or password' });
        return;
      }
      const valid = await dbAuth.verifyPassword(String(password), found.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid login or password' });
        return;
      }
      user = sanitizeUser(found);
    } else {
      await demoAuth.ensureDefaultAdmin();
      const found = demoAuth.getUserWithPasswordByLogin(String(login));
      if (!found || !found.isActive) {
        res.status(401).json({ error: 'Invalid login or password' });
        return;
      }
      const valid = await demoAuth.verifyPassword(String(password), found.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid login or password' });
        return;
      }
      user = sanitizeUser(found);
    }

    const token = signToken({ sub: user.login, role: user.role });
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const mode = getMode(req);
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

    let user = null;
    if (mode === 'dev') {
      if (!(await ensureDevDb(res))) return;
      user = await dbAuth.getUserByLogin(payload.sub);
    } else {
      await demoAuth.ensureDefaultAdmin();
      user = demoAuth.getUserByLogin(payload.sub);
    }

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
