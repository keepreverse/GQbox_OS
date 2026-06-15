import { Router, type Response } from 'express';
import { isDbAvailable, getAllUsers, createUser, updateUser, deleteUser } from '../../utils/dbStore';
import { requireAdmin, type AuthRequest } from '../../middleware/auth';
import type { UserRole } from '../../types';

const router = Router();

router.use(requireAdmin);

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

async function ensureDb(res: Response): Promise<boolean> {
  const ok = await isDbAvailable();
  if (!ok) {
    res.status(503).json({
      error: 'PostgreSQL is not available. Start it via `npm run db:start` and try again.',
    });
    return false;
  }
  return true;
}

function isValidRole(role: unknown): role is UserRole {
  return role === 'admin' || role === 'user';
}

// GET /api/dev/users
router.get('/', async (_req: AuthRequest, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/users
router.post('/', async (req: AuthRequest, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const { displayName, login, password, role } = req.body || {};
    if (!displayName || !login || !password) {
      res.status(400).json({ error: 'displayName, login and password are required' });
      return;
    }
    const user = await createUser(
      String(displayName),
      String(login),
      String(password),
      isValidRole(role) ? role : 'user'
    );
    res.status(201).json(user);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// PUT /api/dev/users/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const id = paramId(req.params.id);
    if (id === req.user?.id) {
      res.status(400).json({ error: 'You cannot edit your own account' });
      return;
    }
    const { displayName, login, password, role, isActive } = req.body || {};
    const patch: Parameters<typeof updateUser>[1] = {};
    if (displayName !== undefined) patch.displayName = String(displayName);
    if (login !== undefined) patch.login = String(login);
    if (password !== undefined) patch.password = String(password);
    if (role !== undefined && isValidRole(role)) patch.role = role;
    if (isActive !== undefined) patch.isActive = Boolean(isActive);

    const updated = await updateUser(id, patch);
    if (!updated) {
      res.status(404).json({ error: `User "${id}" not found` });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// DELETE /api/dev/users/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  if (!(await ensureDb(res))) return;
  try {
    const id = paramId(req.params.id);
    if (id === req.user?.id) {
      res.status(400).json({ error: 'You cannot delete your own account' });
      return;
    }
    const removed = await deleteUser(id);
    if (!removed) {
      res.status(404).json({ error: `User "${id}" not found` });
      return;
    }
    res.json(removed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
