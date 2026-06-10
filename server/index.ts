import express from 'express';
import cors from 'cors';

// Demo mode (JSON-only, без fallback на БД)
import demoProducts from './routes/demo/products';
import demoDictionaries from './routes/demo/dictionaries';
import demoSettings from './routes/demo/settings';
import demoNotifications from './routes/demo/notifications';
import demoKitComponents from './routes/demo/kitComponents';

// Dev mode (PostgreSQL-only)
import devProducts from './routes/dev/products';
import devDictionaries from './routes/dev/dictionaries';
import devSettings from './routes/dev/settings';
import devNotifications from './routes/dev/notifications';
import devKitComponents from './routes/dev/kitComponents';

import { errorHandler } from './middleware/errorHandler';
import { closePool } from './utils/db';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Public health ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    modes: ['demo', 'dev'],
  });
});

// ─── Demo (JSON-files) ───────────────────────────────────────────────────
app.use('/api/demo/products', demoProducts);
app.use('/api/demo/dictionaries', demoDictionaries);
app.use('/api/demo', demoSettings);
app.use('/api/demo/notifications', demoNotifications);
app.use('/api/demo/kit-components', demoKitComponents);

// ─── Dev (PostgreSQL) ────────────────────────────────────────────────────
app.use('/api/dev/products', devProducts);
app.use('/api/dev/dictionaries', devDictionaries);
app.use('/api/dev', devSettings);
app.use('/api/dev/notifications', devNotifications);
app.use('/api/dev/kit-components', devKitComponents);

app.use(errorHandler);

// ─── Bootstrap ───────────────────────────────────────────────────────────
// Демо-режим не требует init. Дев-режим — требует, но это ответственность
// пользователя: сначала `npm run db:start`, потом `npm run db:seed`,
// потом уже включать переключатель. Поэтому initSchema НЕ вызываем здесь,
// чтобы не падать, если БД не поднята. Каждый dev-роут сам проверяет
// доступность через isDbAvailable() и возвращает 503, если что.
app.listen(PORT, () => {
  console.log(`GQbox API running on http://localhost:${PORT}`);
  console.log(`  demo: /api/demo/*  (JSON files)`);
  console.log(`  dev:  /api/dev/*   (PostgreSQL, requires db:start)`);
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});
