import { extract } from '@extractus/article-extractor';
import { getDb } from '../db/index.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { estimateReadingTime } from './reading-time.js';
import logger from '../utils/logger.js';
import config from '../config.js';

export async function extractArticleContent(articleId) {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);

  if (!article || !article.url) return null;
  if (article.extracted_content !== null) return article.extracted_content;

  try {
    const result = await extract(article.url, {
      signal: AbortSignal.timeout(config.articles.extraction_timeout),
    });

    if (!result || !result.content) {
      db.prepare('UPDATE articles SET extracted_content = ? WHERE id = ?').run('', articleId);
      return '';
    }

    const cleaned = sanitizeHtml(result.content);
    const { words, minutes } = estimateReadingTime(cleaned);

    db.prepare(`
      UPDATE articles SET
        extracted_content = ?,
        word_count = ?,
        reading_time_minutes = ?
      WHERE id = ?
    `).run(cleaned, words, minutes, articleId);

    return cleaned;
  } catch (err) {
    logger.warn({ articleId, url: article.url, err: err.message }, 'Article extraction failed');
    db.prepare('UPDATE articles SET extracted_content = ? WHERE id = ?').run('', articleId);
    return '';
  }
}
