import { getDb } from '../db/index.js';
import { parseFeed } from './feed-parser.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { estimateReadingTime } from './reading-time.js';
import logger from '../utils/logger.js';
import config from '../config.js';

export async function fetchFeed(feedId) {
  const db = getDb();
  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
  if (!feed) return { newArticles: 0 };

  const headers = { 'User-Agent': 'RSS-Reader/1.0' };
  if (feed.etag) headers['If-None-Match'] = feed.etag;
  if (feed.last_modified) headers['If-Modified-Since'] = feed.last_modified;

  try {
    const response = await fetch(feed.url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(config.feeds.fetch_timeout),
    });

    if (response.status === 304) {
      db.prepare('UPDATE feeds SET last_fetched_at = datetime(\'now\') WHERE id = ?').run(feedId);
      return { newArticles: 0 };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = await parseFeed(xml, true);

    // Update feed metadata
    const newEtag = response.headers.get('etag') || null;
    const newLastModified = response.headers.get('last-modified') || null;

    if (parsed.title && parsed.title !== feed.title && feed.title === feed.url) {
      db.prepare('UPDATE feeds SET title = ? WHERE id = ?').run(parsed.title, feedId);
    }

    db.prepare(`
      UPDATE feeds SET
        site_url = COALESCE(?, site_url),
        description = COALESCE(?, description),
        etag = ?,
        last_modified = ?,
        last_fetched_at = datetime('now'),
        last_error = NULL,
        error_count = 0,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(parsed.siteUrl || null, parsed.description || null, newEtag, newLastModified, feedId);

    // Insert new articles
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO articles (feed_id, guid, title, url, author, summary, content, word_count, reading_time_minutes, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let newArticles = 0;
    const insertArticles = db.transaction((items) => {
      for (const item of items) {
        const content = sanitizeHtml(item.content);
        const { words, minutes } = estimateReadingTime(content || item.summary);
        const result = insertStmt.run(
          feedId,
          item.guid,
          item.title,
          item.url,
          item.author,
          item.summary,
          content,
          words,
          minutes,
          item.publishedAt
        );
        if (result.changes > 0) newArticles++;
      }
    });

    insertArticles(parsed.items);

    // Update denormalized counts
    if (newArticles > 0) {
      db.prepare(`
        UPDATE feeds SET
          article_count = article_count + ?,
          unread_count = unread_count + ?
        WHERE id = ?
      `).run(newArticles, newArticles, feedId);
    }

    logger.info({ feedId, title: feed.title, newArticles }, 'Feed fetched');
    return { newArticles };
  } catch (err) {
    db.prepare(`
      UPDATE feeds SET
        last_error = ?,
        error_count = error_count + 1,
        last_fetched_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(err.message, feedId);

    logger.warn({ feedId, title: feed.title, err: err.message }, 'Feed fetch failed');
    return { newArticles: 0, error: err.message };
  }
}
