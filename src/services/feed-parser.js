import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'RSS-Reader/1.0',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json',
  },
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
});

export async function parseFeed(urlOrXml, isXml = false) {
  const feed = isXml
    ? await parser.parseString(urlOrXml)
    : await parser.parseURL(urlOrXml);

  return {
    title: feed.title || 'Untitled Feed',
    url: feed.feedUrl || '',
    siteUrl: feed.link || '',
    description: feed.description || '',
    items: (feed.items || []).map(item => ({
      guid: item.guid || item.id || item.link || item.title || String(Date.now()),
      title: item.title || 'Untitled',
      url: item.link || '',
      author: item.creator || item.author || item['dc:creator'] || '',
      summary: item.contentSnippet || item.summary || '',
      content: item.contentEncoded || item.content || item.summary || '',
      publishedAt: item.isoDate || item.pubDate || null,
    })),
  };
}
