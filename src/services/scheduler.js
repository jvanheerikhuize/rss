import cron from 'node-cron';
import { getDb } from '../db/index.js';
import { fetchFeed } from './feed-fetcher.js';
import logger from '../utils/logger.js';
import config from '../config.js';

let task = null;
let inFlight = 0;
const MAX_CONCURRENT = config.feeds.fetch_concurrency;

async function tick() {
  const db = getDb();
  const dueFeeds = db.prepare(`
    SELECT id FROM feeds
    WHERE last_fetched_at IS NULL
       OR datetime('now') > datetime(last_fetched_at, '+' || refresh_interval || ' seconds')
    ORDER BY last_fetched_at ASC NULLS FIRST
  `).all();

  for (const feed of dueFeeds) {
    if (inFlight >= MAX_CONCURRENT) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (inFlight < MAX_CONCURRENT) {
            clearInterval(check);
            resolve();
          }
        }, 200);
      });
    }

    inFlight++;
    fetchFeed(feed.id)
      .catch(err => logger.error({ feedId: feed.id, err: err.message }, 'Scheduler fetch error'))
      .finally(() => { inFlight--; });
  }
}

export function startScheduler() {
  task = cron.schedule('* * * * *', tick); // Every minute
  logger.info('Scheduler started');
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('Scheduler stopped');
  }
}

export async function refreshFeed(feedId) {
  return fetchFeed(feedId);
}

export async function refreshAll() {
  const db = getDb();
  const feeds = db.prepare('SELECT id FROM feeds').all();
  const results = [];
  for (const feed of feeds) {
    results.push(await fetchFeed(feed.id));
  }
  return results;
}
