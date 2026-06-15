import type { Request, Response, NextFunction } from 'express';
import type { User } from '../types';
import { verifyToken } from '../utils/jwt';
import { getUserByLogin, isDbAvailable } from '../utils/dbStore';

export interface AuthRequest extends Request {
  user?: User;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  // Dev routes always use PostgreSQL. Reject early if DB is down.
  if (!(await isDbAvailable())) {
    res.status(503).json({ error: 'PostgreSQL is not available' });
    return;
  }

  const user = await getUserByLogin(payload.sub);
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin role required' });
    return;
  }
  next();
}
