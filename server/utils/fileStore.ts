import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '..', 'data');

export { DATA_DIR };

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string): string {
  return resolve(DATA_DIR, `${name}.json`);
}

export function readCollection<T>(name: string): T[] {
  ensureDataDir();
  const path = filePath(name);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T[];
}

export function writeCollection<T>(name: string, data: T[]): void {
  ensureDataDir();
  writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf-8');
}
