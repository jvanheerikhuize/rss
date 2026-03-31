const WPM = 200;
const TAG_RE = /<[^>]+>/g;

export function estimateReadingTime(html) {
  if (!html) return { words: 0, minutes: 1 };
  const text = html.replace(TAG_RE, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').filter(w => w.length > 0).length;
  const minutes = Math.max(1, Math.round(words / WPM));
  return { words, minutes };
}
