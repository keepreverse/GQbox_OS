// ─── Multer middleware для загрузки медиафайлов ──────────────────────────
// Сохраняет файлы в `server/uploads/` под UUID-именами, чтобы не было
// коллизий и чтобы путь в URL был стабильным между переименованиями
// исходного файла на диске пользователя.

import multer, { type FileFilterCallback } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { resolve, extname } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
};

export const UPLOADS_DIR = resolve(process.cwd(), 'server', 'uploads');

// Гарантируем, что директория для загрузок существует.
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export function detectMediaType(mime: string): 'image' | 'video' | null {
  if (/^image\//.test(mime)) return 'image';
  if (/^video\//.test(mime)) return 'video';
  return null;
}

const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: MulterFile,
    cb: (e: Error | null, dest: string) => void
  ) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (
    _req: Request,
    file: MulterFile,
    cb: (e: Error | null, name: string) => void
  ) => {
    const ext = extname(file.originalname).toLowerCase() || '';
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  },
});

function fileFilter(
  _req: Request,
  file: MulterFile,
  cb: FileFilterCallback
): void {
  const type = detectMediaType(file.mimetype);
  if (!type) {
    cb(new Error(`Unsupported mime type: ${file.mimetype}. Only images and videos are allowed.`));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20,
  },
});
