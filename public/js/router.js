import { setState } from './state.js';

const routes = {
  '': () => {
    setState('view', 'all');
    setState('selectedFeedId', null);
    setState('selectedFolderId', null);
  },
  'feed/:id': (params) => {
    setState('view', 'feed');
    setState('selectedFeedId', parseInt(params.id, 10));
    setState('selectedFolderId', null);
  },
  'folder/:id': (params) => {
    setState('view', 'folder');
    setState('selectedFeedId', null);
    setState('selectedFolderId', parseInt(params.id, 10));
  },
  'starred': () => {
    setState('view', 'starred');
    setState('selectedFeedId', null);
    setState('selectedFolderId', null);
  },
  'search': () => {
    setState('view', 'search');
    setState('selectedFeedId', null);
    setState('selectedFolderId', null);
  },
};

function matchRoute(hash) {
  const path = hash.replace(/^#\/?/, '');

  for (const [pattern, handler] of Object.entries(routes)) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      handler(params);
      return;
    }
  }

  // Default to all
  routes['']();
}

export function initRouter() {
  window.addEventListener('hashchange', () => matchRoute(location.hash));
  matchRoute(location.hash);
}

export function navigate(path) {
  location.hash = '#/' + path;
}
