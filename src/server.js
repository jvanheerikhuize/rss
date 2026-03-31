import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';
import logger from './utils/logger.js';
import { initDb } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import feedsRouter from './routes/feeds.js';
import articlesRouter from './routes/articles.js';
import foldersRouter from './routes/folders.js';
import { AppError } from './utils/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(compression());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

// API routes
app.use('/api/feeds', feedsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/folders', foldersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  logger.error({ err, path: req.path }, err.message);
  res.status(statusCode).json({ error: err.message });
});

// Initialize and start
initDb();
runMigrations();

const { port, host } = config.server;
const server = app.listen(port, host, () => {
  logger.info(`RSS Reader running at http://${host}:${port}`);
});

startScheduler();

function shutdown() {
  logger.info('Shutting down...');
  stopScheduler();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
