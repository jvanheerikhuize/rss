import { initRouter } from './router.js';
import { initTheme } from './utils/theme.js';
import { initSidebar, initModals, refreshData } from './components/sidebar.js';
import { initArticleList } from './components/article-list.js';
import { initArticleView } from './components/article-view.js';
import { initKeyboard } from './components/keyboard.js';

async function init() {
  initTheme();
  initSidebar();
  initModals();
  initArticleList();
  initArticleView();
  initKeyboard();

  // Load initial data
  await refreshData();

  // Start router (triggers initial view)
  initRouter();
}

init();
