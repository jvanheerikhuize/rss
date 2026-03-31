import { Router } from 'express';
import { getDb } from '../db/index.js';
import { discoverFeeds } from '../services/feed-discovery.js';
import { parseFeed } from '../services/feed-parser.js';
import { fetchFeed } from '../services/feed-fetcher.js';
import { refreshFeed } from '../services/scheduler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const feeds = db.prepare(`
    SELECT f.*, fo.name as folder_name
    FROM feeds f
    LEFT JOIN folders fo ON fo.id = f.folder_id
    ORDER BY f.title
  `).all();
  res.json(feeds);
});

router.post('/', async (req, res, next) => {
  try {
    const { url, folderId } = req.body;
    if (!url) throw new ValidationError('Feed URL is required');

    const db = getDb();

    // Check if already subscribed
    const existing = db.prepare('SELECT * FROM feeds WHERE url = ?').get(url);
    if (existing) throw new ValidationError('Already subscribed to this feed');

    // Try to discover feeds if the URL isn't a direct feed
    let feedUrl = url;
    let feedData;

    try {
      feedData = await parseFeed(url);
      feedUrl = feedData.url || url;
    } catch {
      // Not a direct feed URL, try discovery
      const discovered = await discoverFeeds(url);
      if (discovered.length === 0) {
        throw new ValidationError('No RSS/Atom feed found at this URL');
      }
      feedUrl = discovered[0].url;
      feedData = await parseFeed(feedUrl);
    }

    const result = db.prepare(`
      INSERT INTO feeds (title, url, site_url, description, folder_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      feedData.title || feedUrl,
      feedUrl,
      feedData.siteUrl || null,
      feedData.description || null,
      folderId || null
    );

    const feedId = result.lastInsertRowid;

    // Fetch articles immediately
    await fetchFeed(feedId);

    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
    res.status(201).json(feed);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(req.params.id);
  if (!feed) throw new NotFoundError('Feed not found');

  const { title, folderId, refreshInterval } = req.body;
  db.prepare(`
    UPDATE feeds SET
      title = COALESCE(?, title),
      folder_id = ?,
      refresh_interval = COALESCE(?, refresh_interval),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title || null,
    folderId !== undefined ? folderId : feed.folder_id,
    refreshInterval || null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM feeds WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(req.params.id);
  if (!feed) throw new NotFoundError('Feed not found');

  db.prepare('DELETE FROM feeds WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/:id/refresh', async (req, res, next) => {
  try {
    const db = getDb();
    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(req.params.id);
    if (!feed) throw new NotFoundError('Feed not found');

    const result = await refreshFeed(feed.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
