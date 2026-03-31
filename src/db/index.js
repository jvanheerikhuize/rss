import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import config from '../config.js';
import logger from '../utils/logger.js';

let db;

export function initDb() {
  const dbPath = config.database.path;
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  logger.info({ path: dbPath }, 'Database initialized');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
