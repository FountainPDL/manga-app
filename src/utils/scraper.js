// ==================== MANGA SCRAPER UTILITY ====================
// Uses a CORS proxy to fetch manga from external sources

const CORS_PROXY = 'https://corsproxy.io/?';
const ALT_PROXY = 'https://api.allorigins.win/raw?url=';

// ==================== FETCH WITH PROXY ====================
export async function fetchWithProxy(url, useAlt = false) {
  const proxy = useAlt ? ALT_PROXY : CORS_PROXY;
  const response = await fetch(`${proxy}${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

// ==================== PARSE HTML ====================
export function parseHTML(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

// ==================== GENERIC SCRAPER ====================
// Each source can define its own selectors
export async function scrapeSearch(source, query) {
  if (!source?.url) return [];

  const searchUrl = buildSearchUrl(source, query);
  
  try {
    const html = await fetchWithProxy(searchUrl);
    const doc = parseHTML(html);
    return extractMangaList(doc, source, searchUrl);
  } catch (err) {
    console.error('Scrape error:', err);
    // Try alt proxy
    try {
      const html = await fetchWithProxy(searchUrl, true);
      const doc = parseHTML(html);
      return extractMangaList(doc, source, searchUrl);
    } catch {
      return [];
    }
  }
}

export async function scrapeMangaDetails(source, url) {
  try {
    const html = await fetchWithProxy(url);
    const doc = parseHTML(html);
    return extractMangaDetails(doc, source, url);
  } catch (err) {
    console.error('Details scrape error:', err);
    return null;
  }
}

export async function scrapeChapterPages(source, url) {
  try {
    const html = await fetchWithProxy(url);
    const doc = parseHTML(html);
    return extractPages(doc, source, url);
  } catch (err) {
    console.error('Pages scrape error:', err);
    return [];
  }
}

// ==================== URL BUILDER ====================
function buildSearchUrl(source, query) {
  const base = source.url.replace(/\/$/, '');
  
  // Try common search patterns
  if (source.searchPath) {
    return `${base}${source.searchPath}${encodeURIComponent(query)}`;
  }

  // Auto-detect common patterns
  const patterns = [
    `${base}/search?q=${encodeURIComponent(query)}`,
    `${base}/search?s=${encodeURIComponent(query)}`,
    `${base}/?s=${encodeURIComponent(query)}`,
    `${base}/manga?search=${encodeURIComponent(query)}`,
    `${base}/search/${encodeURIComponent(query)}`,
  ];
  
  return patterns[0];
}

// ==================== CONTENT EXTRACTORS ====================
function extractMangaList(doc, source, baseUrl) {
  const results = [];
  const base = new URL(baseUrl).origin;

  // Common manga card selectors used by most manga sites
  const cardSelectors = [
    '.manga-item', '.manga_item', '.manga-card',
    '.post-item', '.book-item', '.series-item',
    '.c-image-hover', '.page-item-detail',
    'article', '.entry', '.comic-item',
    '[class*="manga"]', '[class*="comic"]', '[class*="book"]',
  ];

  let items = [];
  for (const sel of cardSelectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  // Fallback: find links with images
  if (items.length === 0) {
    const links = doc.querySelectorAll('a');
    links.forEach((link) => {
      const img = link.querySelector('img');
      if (img && link.href && !link.href.includes('#')) {
        const title = img.alt || link.title || link.textContent.trim();
        if (title.length > 2) {
          results.push({
            id: btoa(link.href).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16),
            title,
            cover: resolveUrl(img.src || img.dataset.src || img.dataset.lazySrc, base),
            url: resolveUrl(link.href, base),
            sourceId: source.id,
            sourceName: source.name,
          });
        }
      }
    });
    return results.slice(0, 20);
  }

  items.forEach((item) => {
    const link = item.querySelector('a');
    const img = item.querySelector('img');
    const titleEl = item.querySelector(
      'h1, h2, h3, h4, .title, .manga-title, [class*="title"], [class*="name"]'
    );

    if (!link) return;

    const title = titleEl?.textContent?.trim() ||
      img?.alt?.trim() ||
      link?.title?.trim() ||
      link?.textContent?.trim() || '';

    if (!title || title.length < 2) return;

    results.push({
      id: btoa(link.href || '').replace(/[^a-zA-Z0-9]/g, '').substr(0, 16),
      title,
      cover: resolveUrl(
        img?.src || img?.dataset?.src || img?.dataset?.lazySrc || img?.dataset?.original || '',
        base
      ),
      url: resolveUrl(link.href || '', base),
      sourceId: source.id,
      sourceName: source.name,
      chapter: item.querySelector('[class*="chapter"], [class*="latest"]')?.textContent?.trim(),
    });
  });

  return results.filter((r) => r.url && r.title).slice(0, 30);
}

function extractMangaDetails(doc, source, url) {
  const base = new URL(url).origin;

  // Title
  const titleEl = doc.querySelector(
    'h1, .manga-title, .post-title, [class*="manga-name"], [class*="series-name"]'
  );
  const title = titleEl?.textContent?.trim() || doc.title;

  // Cover
  const coverEl = doc.querySelector(
    '.manga-poster img, .series-image img, .cover img, [class*="cover"] img, [class*="poster"] img'
  );
  const cover = resolveUrl(
    coverEl?.src || coverEl?.dataset?.src || coverEl?.dataset?.lazySrc || '',
    base
  );

  // Description
  const descEl = doc.querySelector(
    '[class*="summary"] p, [class*="description"] p, [class*="synopsis"] p, .entry-content p'
  );
  const description = descEl?.textContent?.trim() || '';

  // Author
  const authorEl = doc.querySelector('[class*="author"], [class*="artist"]');
  const author = authorEl?.textContent?.trim().replace(/^(author|artist):\s*/i, '') || '';

  // Status
  const statusEl = doc.querySelector('[class*="status"]');
  const status = statusEl?.textContent?.trim() || '';

  // Genres
  const genreEls = doc.querySelectorAll('[class*="genre"] a, [class*="tag"] a, [class*="category"] a');
  const genres = Array.from(genreEls).map((el) => el.textContent.trim()).filter(Boolean).slice(0, 8);

  // Chapters
  const chapters = extractChapterList(doc, source, base);

  return {
    id: btoa(url).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16),
    title,
    cover,
    description,
    author,
    status,
    genres,
    url,
    sourceId: source.id,
    sourceName: source.name,
    chapters,
    updatedAt: Date.now(),
  };
}

function extractChapterList(doc, source, base) {
  const chapterSelectors = [
    '[class*="chapter-item"]',
    '[class*="chapter_item"]',
    '.chapter',
    'li[class*="chapter"]',
    '[class*="wp-manga-chapter"]',
  ];

  let items = [];
  for (const sel of chapterSelectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  const chapters = [];

  items.forEach((item, index) => {
    const link = item.querySelector('a');
    if (!link) return;

    const title = link.textContent.trim() || `Chapter ${items.length - index}`;
    const dateEl = item.querySelector('[class*="date"], [class*="time"], time');
    const date = dateEl?.textContent?.trim() || '';

    chapters.push({
      id: btoa(link.href || '').replace(/[^a-zA-Z0-9]/g, '').substr(0, 16),
      title,
      url: resolveUrl(link.href || '', base),
      date,
      index: chapters.length,
    });
  });

  return chapters;
}

function extractPages(doc, source, url) {
  const pages = [];

  // Common patterns for manga page images
  const selectors = [
    '#readerarea img',
    '.reading-content img',
    '.page-break img',
    '[class*="reader"] img',
    '[class*="pages"] img',
    '.chapter-content img',
  ];

  let imgs = [];
  for (const sel of selectors) {
    imgs = doc.querySelectorAll(sel);
    if (imgs.length > 0) break;
  }

  // Fallback: find all large images
  if (imgs.length === 0) {
    imgs = doc.querySelectorAll('img');
  }

  const base = new URL(url).origin;

  imgs.forEach((img, i) => {
    const src = img.src || img.dataset.src || img.dataset.lazySrc || img.dataset.original || '';
    if (!src || src.includes('logo') || src.includes('banner') || src.includes('avatar')) return;
    
    const resolved = resolveUrl(src, base);
    if (resolved && (resolved.includes('.jpg') || resolved.includes('.png') ||
        resolved.includes('.webp') || resolved.includes('.jpeg') || resolved.includes('image'))) {
      pages.push({ index: i, url: resolved });
    }
  });

  // Try to find pages in scripts (common pattern)
  if (pages.length === 0) {
    const scripts = doc.querySelectorAll('script');
    scripts.forEach((script) => {
      const text = script.textContent;
      const matches = text.match(/(https?:\/\/[^"'\s]+\.(jpg|png|webp|jpeg))/gi);
      if (matches) {
        matches.forEach((url, i) => {
          pages.push({ index: i, url });
        });
      }
    });
  }

  return pages;
}

// ==================== UTILITIES ====================
function resolveUrl(url, base) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return base + url;
  return url;
}

export function proxyImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  // Use a CORS-friendly image proxy
  return `${CORS_PROXY}${encodeURIComponent(url)}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function generateMangaId(url) {
  return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
}
