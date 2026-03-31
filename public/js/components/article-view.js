import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { $, html, show, hide } from '../utils/dom.js';
import { formatDate } from '../utils/date.js';
import { showToast } from './toast.js';

let positionSaveTimer = null;

export function initArticleView() {
  subscribe('selectedArticleId', loadArticle);
}

async function loadArticle(articleId) {
  const emptyEl = $('#article-view-empty');
  const viewEl = $('#article-view');

  if (!articleId) {
    show(emptyEl);
    hide(viewEl);
    setState('currentArticle', null);
    return;
  }

  hide(emptyEl);
  show(viewEl);
  html(viewEl, '<div style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto;"></div></div>');

  try {
    const article = await api.getArticle(articleId);
    setState('currentArticle', article);

    // Auto-mark as read
    if (!article.is_read) {
      await api.updateArticle(article.id, { isRead: true });
      article.is_read = 1;
      // Update article list state
      const articles = getState('articles').map(a =>
        a.id === article.id ? { ...a, is_read: 1 } : a
      );
      setState('articles', articles);
      // Update feed unread counts
      const { refreshData } = await import('./sidebar.js');
      refreshData();
    }

    renderArticle(article);
  } catch (err) {
    html(viewEl, `<div style="padding:40px; text-align:center; color:var(--text-muted);">Failed to load article</div>`);
    showToast(err.message, 'error');
  }
}

function renderArticle(article) {
  const viewEl = $('#article-view');
  const content = article.extracted_content || article.content || article.summary || '<p>No content available.</p>';

  html(viewEl, `
    <div class="article-header">
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        ${article.feed_title ? `<span>${escapeHtml(article.feed_title)}</span>` : ''}
        ${article.author ? `<span>by ${escapeHtml(article.author)}</span>` : ''}
        ${article.published_at ? `<span>${formatDate(article.published_at)}</span>` : ''}
        ${article.reading_time_minutes ? `<span>${article.reading_time_minutes} min read</span>` : ''}
      </div>
      <div class="article-actions">
        <button class="btn btn-ghost" id="btn-star">
          ${article.is_starred ? '&#9733; Starred' : '&#9734; Star'}
        </button>
        <button class="btn btn-ghost" id="btn-read-toggle">
          ${article.is_read ? '&#9675; Mark Unread' : '&#9679; Mark Read'}
        </button>
        ${article.url ? `<a class="btn btn-ghost" href="${escapeAttr(article.url)}" target="_blank" rel="noopener">&#8599; Original</a>` : ''}
        <button class="btn btn-ghost" id="btn-summarize">&#9889; ${article.ai_summary ? 'Re-summarize' : 'Summarize'}</button>
      </div>
    </div>
    ${article.ai_summary ? `<div class="article-ai-summary"><strong>AI Summary:</strong> ${escapeHtml(article.ai_summary)}</div>` : '<div class="article-ai-summary" id="ai-summary-block" hidden></div>'}
    <div class="article-content">${content}</div>
  `);

  // Star toggle
  $('#btn-star', viewEl).addEventListener('click', async () => {
    const newStarred = !article.is_starred;
    await api.updateArticle(article.id, { isStarred: newStarred });
    article.is_starred = newStarred;
    const articles = getState('articles').map(a =>
      a.id === article.id ? { ...a, is_starred: newStarred ? 1 : 0 } : a
    );
    setState('articles', articles);
    renderArticle(article);
  });

  // Read toggle
  $('#btn-read-toggle', viewEl).addEventListener('click', async () => {
    const newRead = !article.is_read;
    await api.updateArticle(article.id, { isRead: newRead });
    article.is_read = newRead;
    const articles = getState('articles').map(a =>
      a.id === article.id ? { ...a, is_read: newRead ? 1 : 0 } : a
    );
    setState('articles', articles);
    const { refreshData } = await import('./sidebar.js');
    refreshData();
    renderArticle(article);
  });

  // Summarize
  $('#btn-summarize', viewEl).addEventListener('click', async () => {
    const btn = $('#btn-summarize', viewEl);
    btn.disabled = true;
    btn.textContent = 'Summarizing...';
    try {
      const { ai_summary } = await api.summarizeArticle(article.id);
      article.ai_summary = ai_summary;
      const articles = getState('articles').map(a =>
        a.id === article.id ? { ...a, ai_summary } : a
      );
      setState('articles', articles);
      renderArticle(article);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '\u26A1 Summarize';
    }
  });

  // Reading position tracking
  const panel = $('#article-view-panel');
  if (article.reading_position > 0) {
    panel.scrollTop = article.reading_position * panel.scrollHeight;
  } else {
    panel.scrollTop = 0;
  }

  clearInterval(positionSaveTimer);
  positionSaveTimer = setInterval(() => {
    if (panel.scrollHeight <= 0) return;
    const pos = panel.scrollTop / panel.scrollHeight;
    if (pos > 0.01) {
      api.updateArticle(article.id, { readingPosition: Math.round(pos * 1000) / 1000 }).catch(() => {});
    }
  }, 5000);

  // Open external links in new tab
  for (const link of viewEl.querySelectorAll('.article-content a')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function toggleStar() {
  const btn = $('#btn-star');
  if (btn) btn.click();
}

export function toggleRead() {
  const btn = $('#btn-read-toggle');
  if (btn) btn.click();
}

export function openOriginal() {
  const article = getState('currentArticle');
  if (article?.url) window.open(article.url, '_blank');
}
