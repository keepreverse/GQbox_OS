// ─── Demo-mode user/session storage (JSON files) ──────────────────────────
// Хранит пользователей и сессии в server/data/users.json и sessions.json.
// Используется только в demo-режиме, когда PostgreSQL недоступен.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { User, UserRole } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '..', 'data');
const USERS_FILE = resolve(DATA_DIR, 'users.json');

const BCRYPT_ROUNDS = 12;

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  const raw = readFileSync(path, 'utf-8');
  if (!raw.trim()) return fallback;
  return JSON.parse(raw) as T;
}

function writeJson(path: string, data: unknown): void {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

function readUsers(): User[] {
  return readJson<User[]>(USERS_FILE, []);
}

function writeUsers(users: User[]): void {
  writeJson(USERS_FILE, users);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getUserById(id: string): User | null {
  return readUsers().find((u) => u.id === id) ?? null;
}

export function getUserByLogin(login: string): User | null {
  return readUsers().find((u) => u.login === login) ?? null;
}

export function getUserWithPasswordByLogin(
  login: string
): (User & { passwordHash: string }) | null {
  const user = readUsers().find((u) => u.login === login);
  if (!user) return null;
  const hash = (user as User & { passwordHash?: string }).passwordHash;
  if (!hash) return null;
  return { ...user, passwordHash: hash };
}

export function getAllUsers(): User[] {
  return readUsers();
}

export async function createUser(
  displayName: string,
  login: string,
  password: string,
  role: UserRole = 'user'
): Promise<User> {
  const users = readUsers();
  if (users.some((u) => u.login === login)) {
    throw new Error(`Login "${login}" is already taken`);
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const user: User = {
    id,
    displayName,
    login,
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const passwordHash = await hashPassword(password);
  writeUsers([
    ...users,
    { ...user, passwordHash } as User & { passwordHash: string },
  ]);
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, 'displayName' | 'login' | 'role' | 'isActive'>> & { password?: string }
): Promise<User | null> {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  const existing = users[idx];
  if (patch.login && patch.login !== existing.login && users.some((u) => u.login === patch.login)) {
    throw new Error(`Login "${patch.login}" is already taken`);
  }

  const updated: User = {
    ...existing,
    displayName: patch.displayName ?? existing.displayName,
    login: patch.login ?? existing.login,
    role: patch.role ?? existing.role,
    isActive: patch.isActive ?? existing.isActive,
    updatedAt: new Date().toISOString(),
  };

  const updatedUsers = [...users];
  updatedUsers[idx] = updated;

  if (patch.password) {
    const passwordHash = await hashPassword(patch.password);
    (updatedUsers[idx] as User & { passwordHash?: string }).passwordHash = passwordHash;
  }

  writeUsers(updatedUsers);
  return updated;
}

export function deleteUser(id: string): User | null {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const [removed] = users.splice(idx, 1);
  writeUsers(users);
  return removed;
}

export async function ensureDefaultAdmin(password: string = 'admin'): Promise<User> {
  const existing = getUserByLogin('admin');
  if (existing) return existing;
  return createUser('Administrator', 'admin', password, 'admin');
}
