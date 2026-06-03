import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products';
import dictionariesRouter from './routes/dictionaries';
import exportImportRouter from './routes/export-import';
import { errorHandler } from './middleware/errorHandler';
import { initSchema, closePool } from './utils/db';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productsRouter);
app.use('/api/dictionaries', dictionariesRouter);
app.use('/api', exportImportRouter);

app.use(errorHandler);

async function start() {
  try {
    await initSchema();
    console.log('[server] Database schema initialized');
  } catch (err) {
    console.warn('[server] Database unavailable, falling back to file store:', (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`[server] GQbox API running on http://localhost:${PORT}`);
  });
}

start();

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});
