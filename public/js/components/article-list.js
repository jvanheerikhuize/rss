import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { $, html } from '../utils/dom.js';
import { relativeTime } from '../utils/date.js';
import { showToast } from './toast.js';

let currentPage = 1;
let isLoading = false;
let hasMore = true;

export function initArticleList() {
  subscribe('view', () => { currentPage = 1; hasMore = true; loadArticles(); });
  subscribe('selectedFeedId', () => { currentPage = 1; hasMore = true; loadArticles(); });
  subscribe('selectedFolderId', () => { currentPage = 1; hasMore = true; loadArticles(); });
  subscribe('articles', renderList);
  subscribe('selectedArticleId', renderList);
  subscribe('searchQuery', () => { currentPage = 1; hasMore = true; loadArticles(); });

  // Infinite scroll
  const listEl = $('#article-list');
  listEl.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 200) {
      currentPage++;
      loadArticles(true);
    }
  });
}

export async function loadArticles(append = false) {
  if (isLoading) return;
  isLoading = true;

  const view = getState('view');
  const params = { page: currentPage, limit: 50, sort: 'newest' };

  if (view === 'feed') params.feedId = getState('selectedFeedId');
  else if (view === 'folder') params.folderId = getState('selectedFolderId');
  else if (view === 'starred') params.status = 'starred';
  else if (view === 'search') params.q = getState('searchQuery');

  try {
    const data = await api.getArticles(params);
    if (append) {
      setState('articles', [...getState('articles'), ...data.articles]);
    } else {
      setState('articles', data.articles);
    }
    setState('pagination', data.pagination);
    hasMore = data.pagination.page < data.pagination.pages;
  } catch (err) {
    showToast('Failed to load articles: ' + err.message, 'error');
  } finally {
    isLoading = false;
  }

  renderHeader();
}

function renderHeader() {
  const headerEl = $('#article-list-header');
  const view = getState('view');
  const feeds = getState('feeds') || [];
  const folders = getState('folders') || [];
  const pagination = getState('pagination');

  let title = 'All Articles';
  if (view === 'feed') {
    const feed = feeds.find(f => f.id === getState('selectedFeedId'));
    title = feed ? feed.title : 'Feed';
  } else if (view === 'folder') {
    const folder = folders.find(f => f.id === getState('selectedFolderId'));
    title = folder ? folder.name : 'Folder';
  } else if (view === 'starred') {
    title = 'Starred';
  } else if (view === 'search') {
    title = 'Search Results';
  }

  const total = pagination ? pagination.total : 0;

  html(headerEl, `
    <button class="btn-icon mobile-back-btn" id="btn-back-sidebar">&#8592;</button>
    <h2>${escapeHtml(title)}</h2>
    <span style="font-size: 12px; color: var(--text-muted);">${total}</span>
    <div style="flex:1"></div>
    <input type="search" class="search-input" id="search-input"
      placeholder="Search articles..." style="max-width: 200px;"
      value="${escapeHtml(getState('searchQuery') || '')}">
    ${view === 'feed' ? `<button class="btn-icon" id="btn-refresh-feed" title="Refresh">&#8635;</button>` : ''}
    <button class="btn-icon" id="btn-mark-all-read" title="Mark all read">&#10003;</button>
  `);

  // Search input
  const searchInput = $('#search-input');
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = searchInput.value.trim();
      if (q) {
        setState('searchQuery', q);
        setState('view', 'search');
        location.hash = '#/search';
      } else if (getState('view') === 'search') {
        setState('searchQuery', '');
        location.hash = '#/';
      }
    }, 300);
  });

  // Refresh button
  const refreshBtn = $('#btn-refresh-feed');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const feedId = getState('selectedFeedId');
      if (!feedId) return;
      try {
        refreshBtn.textContent = '...';
        await api.refreshFeed(feedId);
        await loadArticles();
        const { refreshData } = await import('./sidebar.js');
        await refreshData();
        showToast('Feed refreshed', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        refreshBtn.textContent = '↻';
      }
    });
  }

  // Mark all read
  const markAllBtn = $('#btn-mark-all-read');
  markAllBtn.addEventListener('click', async () => {
    const view = getState('view');
    try {
      if (view === 'feed') {
        await api.markRead({ feedId: getState('selectedFeedId') });
      } else if (view === 'folder') {
        await api.markRead({ folderId: getState('selectedFolderId') });
      } else {
        const articles = getState('articles');
        const ids = articles.filter(a => !a.is_read).map(a => a.id);
        if (ids.length > 0) await api.markRead({ articleIds: ids });
      }
      await loadArticles();
      const { refreshData } = await import('./sidebar.js');
      await refreshData();
      showToast('Marked as read', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Mobile back button
  const backBtn = $('#btn-back-sidebar');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('app').classList.remove('show-list', 'show-article');
    });
  }
}

function renderList() {
  const listEl = $('#article-list');
  const articles = getState('articles') || [];
  const selectedId = getState('selectedArticleId');

  if (articles.length === 0) {
    html(listEl, '<div class="article-list-empty">No articles</div>');
    return;
  }

  html(listEl, articles.map(article => `
    <div class="article-list-item ${!article.is_read ? 'unread' : ''} ${article.id === selectedId ? 'active' : ''}"
         data-article-id="${article.id}">
      <div class="article-list-title">${escapeHtml(article.title)}</div>
      <div class="article-list-meta">
        <span>${escapeHtml(article.feed_title || '')}</span>
        <span>${relativeTime(article.published_at)}</span>
        ${article.reading_time_minutes ? `<span>${article.reading_time_minutes} min</span>` : ''}
        ${article.is_starred ? '<span class="star">&#9733;</span>' : ''}
      </div>
    </div>
  `).join(''));

  // Click handlers
  for (const item of listEl.querySelectorAll('.article-list-item')) {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.articleId, 10);
      setState('selectedArticleId', id);
      // Mobile: show article
      document.getElementById('app').classList.add('show-article');
      document.getElementById('app').classList.remove('show-list');
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
