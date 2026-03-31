import { getDb } from '../db/index.js';
import { generate } from './ollama.js';
import logger from '../utils/logger.js';

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function summarizeArticle(articleId) {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);

  if (!article) throw new Error('Article not found');
  if (article.ai_summary) return article.ai_summary;

  const rawContent = article.extracted_content || article.content || article.summary || '';
  if (!rawContent) throw new Error('Article has no content to summarize');

  const text = stripHtml(rawContent).slice(0, 4000);

  const prompt = `Summarize the following article in 1-3 concise sentences. Focus on the key facts and takeaway. Return only the summary, no preamble.

Article title: ${article.title}

${text}`;

  const summary = await generate(prompt);
  const trimmed = summary.trim();

  db.prepare('UPDATE articles SET ai_summary = ? WHERE id = ?').run(trimmed, articleId);
  logger.info({ articleId, title: article.title }, 'Article summarized');

  return trimmed;
}
