const STORAGE_KEY = 'rss-theme';

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    document.documentElement.dataset.theme = saved;
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.dataset.theme = 'dark';
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    }
  });
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(STORAGE_KEY, next);
}

export function getTheme() {
  return document.documentElement.dataset.theme;
}
