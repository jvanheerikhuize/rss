import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

purify.setConfig({
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'section', 'article',
    'details', 'summary',
    'video', 'audio', 'source',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class',
    'width', 'height', 'target', 'rel',
    'controls', 'type', 'start', 'reversed',
    'colspan', 'rowspan', 'open',
  ],
  ALLOW_DATA_ATTR: false,
});

export function sanitizeHtml(html) {
  if (!html) return '';
  return purify.sanitize(html);
}
