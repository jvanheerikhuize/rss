const BASE = '/api';

async function request(path, options = {}) {
  const url = BASE + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Feeds
  getFeeds: () => request('/feeds'),
  createFeed: (url, folderId) => request('/feeds', { method: 'POST', body: { url, folderId } }),
  updateFeed: (id, data) => request(`/feeds/${id}`, { method: 'PATCH', body: data }),
  deleteFeed: (id) => request(`/feeds/${id}`, { method: 'DELETE' }),
  refreshFeed: (id) => request(`/feeds/${id}/refresh`, { method: 'POST' }),

  // Articles
  getArticles: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    return request(`/articles?${query}`);
  },
  getArticle: (id) => request(`/articles/${id}`),
  updateArticle: (id, data) => request(`/articles/${id}`, { method: 'PATCH', body: data }),
  markRead: (data) => request('/articles/mark-read', { method: 'POST', body: data }),

  // Folders
  getFolders: () => request('/folders'),
  createFolder: (name) => request('/folders', { method: 'POST', body: { name } }),
  updateFolder: (id, data) => request(`/folders/${id}`, { method: 'PATCH', body: data }),
  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),
};
