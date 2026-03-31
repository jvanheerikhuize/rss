import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { navigate } from '../router.js';
import { $, html, on } from '../utils/dom.js';
import { toggleTheme, getTheme } from '../utils/theme.js';
import { showToast } from './toast.js';

export function initSidebar() {
  render();
  subscribe('feeds', render);
  subscribe('folders', render);
  subscribe('view', render);
  subscribe('selectedFeedId', render);
  subscribe('selectedFolderId', render);
}

function render() {
  const el = $('#sidebar');
  const feeds = getState('feeds') || [];
  const folders = getState('folders') || [];
  const view = getState('view');
  const selectedFeedId = getState('selectedFeedId');
  const selectedFolderId = getState('selectedFolderId');

  const totalUnread = feeds.reduce((sum, f) => sum + (f.unread_count || 0), 0);
  const starredCount = 0; // Could query, but keeping it simple

  // Group feeds by folder
  const folderFeeds = new Map();
  const uncategorized = [];
  for (const feed of feeds) {
    if (feed.folder_id) {
      if (!folderFeeds.has(feed.folder_id)) folderFeeds.set(feed.folder_id, []);
      folderFeeds.get(feed.folder_id).push(feed);
    } else {
      uncategorized.push(feed);
    }
  }

  html(el, `
    <div class="sidebar-header">
      <h1>RSS Reader</h1>
      <div class="sidebar-actions">
        <button class="btn-icon" id="btn-add-feed" title="Subscribe to feed (a)">+</button>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-item ${view === 'all' ? 'active' : ''}" data-nav="all">
          <span class="icon">&#9776;</span>
          <span class="label">All Articles</span>
          ${totalUnread > 0 ? `<span class="badge">${totalUnread}</span>` : ''}
        </div>
        <div class="sidebar-item ${view === 'starred' ? 'active' : ''}" data-nav="starred">
          <span class="icon">&#9733;</span>
          <span class="label">Starred</span>
        </div>
      </div>

      ${folders.length > 0 ? `
        <div class="sidebar-section">
          <div class="sidebar-section-header">Folders</div>
          ${folders.map(folder => {
            const fFeeds = folderFeeds.get(folder.id) || [];
            const folderUnread = fFeeds.reduce((s, f) => s + (f.unread_count || 0), 0);
            return `
              <div class="sidebar-item folder ${view === 'folder' && selectedFolderId === folder.id ? 'active' : ''}" data-nav="folder" data-id="${folder.id}">
                <span class="icon">&#128193;</span>
                <span class="label">${escapeHtml(folder.name)}</span>
                ${folderUnread > 0 ? `<span class="badge">${folderUnread}</span>` : ''}
              </div>
              ${fFeeds.map(feed => feedItem(feed, view, selectedFeedId)).join('')}
            `;
          }).join('')}
        </div>
      ` : ''}

      ${uncategorized.length > 0 ? `
        <div class="sidebar-section">
          <div class="sidebar-section-header">Feeds</div>
          ${uncategorized.map(feed => feedItem(feed, view, selectedFeedId)).join('')}
        </div>
      ` : ''}

      ${feeds.length === 0 ? `
        <div class="sidebar-section">
          <div class="article-list-empty" style="padding: 16px;">
            No feeds yet. Click + to subscribe.
          </div>
        </div>
      ` : ''}
    </nav>
    <div class="sidebar-footer">
      <button class="btn-icon" id="btn-add-folder" title="New folder">&#128193;</button>
      <button class="btn-icon" id="btn-toggle-theme" title="Toggle theme">
        ${getTheme() === 'dark' ? '&#9728;' : '&#9790;'}
      </button>
    </div>
  `);

  // Event listeners
  on($('#btn-add-feed', el), 'click', () => {
    $('#subscribe-modal').hidden = false;
    $('#subscribe-url').value = '';
    $('#subscribe-url').focus();
    populateFolderSelect();
  });

  on($('#btn-add-folder', el), 'click', () => {
    $('#folder-modal').hidden = false;
    $('#folder-name').value = '';
    $('#folder-name').focus();
  });

  on($('#btn-toggle-theme', el), 'click', () => {
    toggleTheme();
    render();
  });

  // Nav clicks
  for (const item of el.querySelectorAll('[data-nav]')) {
    on(item, 'click', () => {
      const nav = item.dataset.nav;
      const id = item.dataset.id;
      if (nav === 'all') navigate('');
      else if (nav === 'starred') navigate('starred');
      else if (nav === 'folder') navigate(`folder/${id}`);
      else if (nav === 'feed') navigate(`feed/${id}`);

      // Mobile: show list
      document.getElementById('app').classList.add('show-list');
      document.getElementById('app').classList.remove('show-article');
    });
  }
}

function feedItem(feed, view, selectedFeedId) {
  const hasError = feed.error_count > 3;
  return `
    <div class="sidebar-item feed ${view === 'feed' && selectedFeedId === feed.id ? 'active' : ''} ${hasError ? 'error' : ''}" data-nav="feed" data-id="${feed.id}">
      <span class="icon" style="font-size: 10px;">&#9679;</span>
      <span class="label">${escapeHtml(feed.title)}</span>
      ${feed.unread_count > 0 ? `<span class="badge">${feed.unread_count}</span>` : ''}
    </div>
  `;
}

function populateFolderSelect() {
  const select = $('#subscribe-folder');
  const folders = getState('folders') || [];
  html(select, `
    <option value="">No folder</option>
    ${folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
  `);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Modal handlers
export function initModals() {
  // Subscribe form
  on($('#subscribe-form'), 'submit', async (e) => {
    e.preventDefault();
    const url = $('#subscribe-url').value.trim();
    if (!url) return;

    const btn = $('#subscribe-submit');
    btn.disabled = true;
    btn.textContent = 'Subscribing...';

    try {
      const folderId = $('#subscribe-folder').value || undefined;
      await api.createFeed(url, folderId);
      $('#subscribe-modal').hidden = true;
      showToast('Subscribed successfully', 'success');
      await refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    }
  });

  // Folder form
  on($('#folder-form'), 'submit', async (e) => {
    e.preventDefault();
    const name = $('#folder-name').value.trim();
    if (!name) return;

    try {
      await api.createFolder(name);
      $('#folder-modal').hidden = true;
      showToast('Folder created', 'success');
      await refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Close modals
  for (const overlay of document.querySelectorAll('.modal-overlay')) {
    on(overlay, 'click', (e) => {
      if (e.target === overlay || e.target.hasAttribute('data-close-modal')) {
        overlay.hidden = true;
      }
    });
  }

  // Close buttons inside modals
  for (const btn of document.querySelectorAll('[data-close-modal]')) {
    on(btn, 'click', () => {
      btn.closest('.modal-overlay').hidden = true;
    });
  }
}

export async function refreshData() {
  const [feeds, folders] = await Promise.all([
    api.getFeeds(),
    api.getFolders(),
  ]);
  setState('feeds', feeds);
  setState('folders', folders);
}
