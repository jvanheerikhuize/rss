import { getState, setState } from '../state.js';
import { $, $$ } from '../utils/dom.js';
import { toggleStar, toggleRead, openOriginal } from './article-view.js';
import { loadArticles } from './article-list.js';
import { api } from '../api.js';
import { showToast } from './toast.js';

export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't handle shortcuts when typing in inputs
    if (e.target.matches('input, textarea, select')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    switch (e.key) {
      case 'j':
        selectNextArticle(1);
        break;
      case 'k':
        selectNextArticle(-1);
        break;
      case 's':
        toggleStar();
        break;
      case 'm':
        toggleRead();
        break;
      case 'v':
        openOriginal();
        break;
      case 'r':
        refreshCurrentFeed();
        break;
      case '/':
        e.preventDefault();
        const searchInput = $('#search-input');
        if (searchInput) searchInput.focus();
        break;
      case 'a':
        $('#subscribe-modal').hidden = false;
        $('#subscribe-url').value = '';
        setTimeout(() => $('#subscribe-url').focus(), 50);
        break;
      case '?':
        $('#shortcuts-modal').hidden = false;
        break;
      case 'Escape':
        closeAllModals();
        setState('selectedArticleId', null);
        // Mobile: go back
        const app = document.getElementById('app');
        if (app.classList.contains('show-article')) {
          app.classList.remove('show-article');
          app.classList.add('show-list');
        } else if (app.classList.contains('show-list')) {
          app.classList.remove('show-list');
        }
        break;
    }
  });
}

function selectNextArticle(direction) {
  const articles = getState('articles') || [];
  if (articles.length === 0) return;

  const currentId = getState('selectedArticleId');
  const currentIdx = articles.findIndex(a => a.id === currentId);

  let nextIdx;
  if (currentIdx === -1) {
    nextIdx = direction === 1 ? 0 : articles.length - 1;
  } else {
    nextIdx = currentIdx + direction;
  }

  if (nextIdx >= 0 && nextIdx < articles.length) {
    setState('selectedArticleId', articles[nextIdx].id);

    // Scroll the article list to keep the selected item visible
    const listEl = $('#article-list');
    const items = $$('.article-list-item', listEl);
    if (items[nextIdx]) {
      items[nextIdx].scrollIntoView({ block: 'nearest' });
    }
  }
}

async function refreshCurrentFeed() {
  const view = getState('view');
  if (view !== 'feed') return;

  const feedId = getState('selectedFeedId');
  if (!feedId) return;

  try {
    await api.refreshFeed(feedId);
    await loadArticles();
    const { refreshData } = await import('./sidebar.js');
    await refreshData();
    showToast('Feed refreshed', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeAllModals() {
  for (const modal of $$('.modal-overlay')) {
    modal.hidden = true;
  }
}
