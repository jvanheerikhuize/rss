import { Router } from 'express';
import { getDb } from '../db/index.js';
import { extractArticleContent } from '../services/article-extractor.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const {
    q, feedId, folderId, status,
    from, to,
    page = 1, limit = 50,
    sort = 'newest',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = [];
  let params = [];

  if (feedId) {
    where.push('a.feed_id = ?');
    params.push(feedId);
  }
  if (folderId) {
    where.push('f.folder_id = ?');
    params.push(folderId);
  }
  if (status === 'unread') {
    where.push('a.is_read = 0');
  } else if (status === 'read') {
    where.push('a.is_read = 1');
  } else if (status === 'starred') {
    where.push('a.is_starred = 1');
  }
  if (from) {
    where.push('a.published_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('a.published_at <= ?');
    params.push(to);
  }

  let sql;
  if (q) {
    // Full-text search
    where.push('a.id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?)');
    params.push(q);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const orderBy = sort === 'oldest' ? 'a.published_at ASC' : 'a.published_at DESC';

  const countSql = `
    SELECT COUNT(*) as total
    FROM articles a
    LEFT JOIN feeds f ON f.id = a.feed_id
    ${whereClause}
  `;
  const { total } = db.prepare(countSql).get(...params);

  sql = `
    SELECT a.id, a.feed_id, a.guid, a.title, a.url, a.author, a.summary,
           a.word_count, a.reading_time_minutes, a.is_read, a.is_starred,
           a.reading_position, a.published_at, a.created_at,
           f.title as feed_title, f.favicon_url as feed_favicon
    FROM articles a
    LEFT JOIN feeds f ON f.id = a.feed_id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const articles = db.prepare(sql).all(...params, limitNum, offset);
  res.json({
    articles,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const article = db.prepare(`
      SELECT a.*, f.title as feed_title, f.favicon_url as feed_favicon, f.site_url as feed_site_url
      FROM articles a
      LEFT JOIN feeds f ON f.id = a.feed_id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!article) throw new NotFoundError('Article not found');

    // Lazy content extraction
    if (article.extracted_content === null && article.url) {
      article.extracted_content = await extractArticleContent(article.id);
    }

    res.json(article);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) throw new NotFoundError('Article not found');

  const { isRead, isStarred, readingPosition } = req.body;

  if (isRead !== undefined) {
    const readVal = isRead ? 1 : 0;
    const readAt = isRead ? "datetime('now')" : 'NULL';
    db.prepare(`UPDATE articles SET is_read = ?, read_at = ${readAt} WHERE id = ?`)
      .run(readVal, article.id);

    // Update feed unread count
    const delta = isRead ? -1 : 1;
    db.prepare('UPDATE feeds SET unread_count = MAX(0, unread_count + ?) WHERE id = ?')
      .run(delta, article.feed_id);
  }

  if (isStarred !== undefined) {
    db.prepare('UPDATE articles SET is_starred = ? WHERE id = ?')
      .run(isStarred ? 1 : 0, article.id);
  }

  if (readingPosition !== undefined) {
    db.prepare('UPDATE articles SET reading_position = ? WHERE id = ?')
      .run(readingPosition, article.id);
  }

  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(article.id);
  res.json(updated);
});

router.post('/mark-read', (req, res) => {
  const db = getDb();
  const { articleIds, feedId, folderId, olderThan } = req.body;

  if (articleIds && Array.isArray(articleIds)) {
    const placeholders = articleIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE articles SET is_read = 1, read_at = datetime('now')
      WHERE id IN (${placeholders}) AND is_read = 0
    `).run(...articleIds);

    // Recalculate unread counts for affected feeds
    const feedIds = db.prepare(`
      SELECT DISTINCT feed_id FROM articles WHERE id IN (${placeholders})
    `).all(...articleIds);

    for (const { feed_id } of feedIds) {
      const { count } = db.prepare('SELECT COUNT(*) as count FROM articles WHERE feed_id = ? AND is_read = 0').get(feed_id);
      db.prepare('UPDATE feeds SET unread_count = ? WHERE id = ?').run(count, feed_id);
    }
  } else if (feedId) {
    db.prepare("UPDATE articles SET is_read = 1, read_at = datetime('now') WHERE feed_id = ? AND is_read = 0")
      .run(feedId);
    db.prepare('UPDATE feeds SET unread_count = 0 WHERE id = ?').run(feedId);
  } else if (folderId) {
    db.prepare(`
      UPDATE articles SET is_read = 1, read_at = datetime('now')
      WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ?) AND is_read = 0
    `).run(folderId);
    db.prepare('UPDATE feeds SET unread_count = 0 WHERE folder_id = ?').run(folderId);
  } else if (olderThan) {
    db.prepare("UPDATE articles SET is_read = 1, read_at = datetime('now') WHERE published_at < ? AND is_read = 0")
      .run(olderThan);
    // Recalculate all feed unread counts
    db.prepare(`
      UPDATE feeds SET unread_count = (
        SELECT COUNT(*) FROM articles WHERE articles.feed_id = feeds.id AND is_read = 0
      )
    `).run();
  } else {
    throw new ValidationError('Provide articleIds, feedId, folderId, or olderThan');
  }

  res.json({ success: true });
});

export default router;
