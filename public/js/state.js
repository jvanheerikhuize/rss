const state = {
  feeds: [],
  folders: [],
  articles: [],
  pagination: null,
  selectedFeedId: null,
  selectedFolderId: null,
  selectedArticleId: null,
  currentArticle: null,
  view: 'all', // all, feed, folder, starred, search
  searchQuery: '',
  loading: false,
};

const listeners = new Map();

export function getState(key) {
  return key ? state[key] : state;
}

export function setState(key, value) {
  state[key] = value;
  notify(key);
}

export function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key).delete(callback);
}

function notify(key) {
  const cbs = listeners.get(key);
  if (cbs) cbs.forEach(cb => cb(state[key]));
}
