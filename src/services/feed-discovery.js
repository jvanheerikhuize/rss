import { JSDOM } from 'jsdom';
import logger from '../utils/logger.js';

const FEED_CONTENT_TYPES = [
  'application/rss+xml',
  'application/atom+xml',
  'application/xml',
  'text/xml',
  'application/feed+json',
  'application/json',
];

const COMMON_FEED_PATHS = [
  '/feed', '/rss', '/atom.xml', '/feed.xml', '/rss.xml',
  '/index.xml', '/feed/rss', '/feed/atom', '/feed.json',
  '/feeds/posts/default', '/.rss',
];

export async function discoverFeeds(url) {
  const feeds = [];

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RSS-Reader/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    const contentType = response.headers.get('content-type') || '';

    // If the URL itself is a feed
    if (FEED_CONTENT_TYPES.some(t => contentType.includes(t)) && !contentType.includes('text/html')) {
      return [{ url, title: 'Direct feed' }];
    }

    // Parse HTML and look for feed links
    const html = await response.text();

    // Quick check: does it look like XML feed content?
    if (html.trimStart().startsWith('<?xml') || html.trimStart().startsWith('<rss') || html.trimStart().startsWith('<feed')) {
      return [{ url, title: 'Direct feed' }];
    }

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const linkTypes = [
      'application/rss+xml',
      'application/atom+xml',
      'application/feed+json',
    ];

    for (const type of linkTypes) {
      const links = doc.querySelectorAll(`link[rel="alternate"][type="${type}"]`);
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href) {
          const feedUrl = new URL(href, url).toString();
          feeds.push({ url: feedUrl, title: link.getAttribute('title') || type });
        }
      }
    }

    if (feeds.length > 0) return feeds;

    // Probe common paths
    const base = new URL(url).origin;
    for (const path of COMMON_FEED_PATHS) {
      try {
        const probeUrl = base + path;
        const probeRes = await fetch(probeUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'RSS-Reader/1.0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        const probeType = probeRes.headers.get('content-type') || '';
        if (probeRes.ok && FEED_CONTENT_TYPES.some(t => probeType.includes(t))) {
          feeds.push({ url: probeUrl, title: path });
          break; // Found one, that's enough
        }
      } catch {
        // Ignore probe errors
      }
    }
  } catch (err) {
    logger.warn({ url, err: err.message }, 'Feed discovery failed');
  }

  return feeds;
}
