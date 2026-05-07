// ── MANGAPUMA SOURCE ─────────────────────────────────────────────
// HTML scraping source using CORS proxy
// Structure: ParsedHTML → JSoup-style DOM parsing in browser

const BASE  = 'https://mangapuma.com';
const PROXY = 'https://corsproxy.io/?';

async function fetchDoc(url) {
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
      'Referer':    BASE,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

function resolve(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//'))   return 'https:' + url;
  if (url.startsWith('/'))    return BASE + url;
  return url;
}

function imgSrc(el) {
  return el?.getAttribute('data-src') ||
         el?.getAttribute('data-lazy-src') ||
         el?.getAttribute('data-original') ||
         el?.getAttribute('src') || '';
}

export const MangaPumaSource = {
  id:          'mangapuma',
  name:        'MangaPuma',
  lang:        'en',
  baseUrl:     BASE,
  isBuiltIn:   true,
  supportsSearch: true,
  supportsBrowse: true,

  async browse(page = 1) {
    try {
      const doc = await fetchDoc(`${BASE}/manga-list?page=${page}`);
      return extractMangaList(doc);
    } catch (e) {
      console.error('MangaPuma browse:', e);
      throw e;
    }
  },

  async search(query, page = 1) {
    try {
      const doc = await fetchDoc(`${BASE}/search?s=${encodeURIComponent(query)}&page=${page}`);
      return extractMangaList(doc);
    } catch (e) {
      console.error('MangaPuma search:', e);
      throw e;
    }
  },

  async getMangaDetails(id) {
    // id is the full URL
    try {
      const url = id.startsWith('http') ? id : `${BASE}/${id}`;
      const doc = await fetchDoc(url);

      const title  = doc.querySelector('h1, .post-title, .manga-title')?.textContent?.trim() || '';
      const cover  = resolve(imgSrc(doc.querySelector('.summary_image img, .manga-poster img, .cover img')));
      const desc   = doc.querySelector('.summary__content p, .description-summary p, [class*="summary"] p')?.textContent?.trim() || '';
      const author = doc.querySelector('.author-content a, [class*="author"] a')?.textContent?.trim() || '';
      const status = doc.querySelector('.summary-content .summary-heading + div, [class*="status"]')?.textContent?.trim() || '';
      const genres = Array.from(doc.querySelectorAll('.genres-content a, [class*="genre"] a'))
        .map((el) => el.textContent.trim()).slice(0, 8);

      const chapters = extractChapters(doc, url);

      return {
        id,
        title,
        cover,
        description: desc,
        author,
        status,
        genres,
        sourceId:   'mangapuma',
        sourceName: 'MangaPuma',
        url,
        chapters,
      };
    } catch (e) {
      console.error('MangaPuma details:', e);
      throw e;
    }
  },

  async getPageList(mangaId, chapterId) {
    // chapterId is the chapter URL
    try {
      const url = chapterId.startsWith('http') ? chapterId : `${BASE}${chapterId}`;
      const doc = await fetchDoc(url);

      // Standard reading content images
      let imgs = Array.from(doc.querySelectorAll('.reading-content img, .read-content img, #readerarea img'));

      if (imgs.length === 0) {
        // Fallback: script-based image extraction
        const scripts = Array.from(doc.querySelectorAll('script'));
        for (const script of scripts) {
          const text = script.textContent;
          // Common patterns: var images = [...], chapter_preloaded_images = [...]
          const match = text.match(/(?:images|chapter_preloaded_images|pages)\s*=\s*(\[.*?\])/s);
          if (match) {
            try {
              const urls = JSON.parse(match[1]);
              return urls
                .filter((u) => typeof u === 'string' && u.includes('http'))
                .map((u, i) => ({ index: i, url: u }));
            } catch { /* continue */ }
          }
        }
      }

      return imgs
        .map((img, i) => ({ index: i, url: resolve(imgSrc(img)) }))
        .filter((p) => p.url && /\.(jpg|jpeg|png|webp|gif)/i.test(p.url));
    } catch (e) {
      console.error('MangaPuma pages:', e);
      throw e;
    }
  },
};

function extractMangaList(doc) {
  const selectors = ['.manga-poster', '.c-image-hover', '.list-story-item', '.manga-item', 'div.page-item-detail'];
  let items = [];
  for (const sel of selectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  return Array.from(items).map((item) => {
    const link  = item.querySelector('a');
    const img   = item.querySelector('img');
    const title = item.querySelector('.post-title, h3, h4, .manga-title')?.textContent?.trim()
                  || img?.alt?.trim() || '';
    if (!link || !title) return null;
    return {
      id:         resolve(link.href),
      title,
      cover:      resolve(imgSrc(img)),
      sourceId:   'mangapuma',
      sourceName: 'MangaPuma',
      url:        resolve(link.href),
    };
  }).filter(Boolean);
}

function extractChapters(doc, mangaUrl) {
  const items = doc.querySelectorAll('.wp-manga-chapter, .chapter-list li, [class*="chapter-item"]');
  return Array.from(items).map((item, i) => {
    const link  = item.querySelector('a');
    const date  = item.querySelector('.chapter-release-date, [class*="date"]')?.textContent?.trim() || '';
    if (!link) return null;
    const title = link.textContent.trim();
    return {
      id:       resolve(link.href),
      title,
      number:   parseChNum(title),
      date,
      index:    i,
      sourceId: 'mangapuma',
      mangaId:  mangaUrl,
    };
  }).filter(Boolean);
}

function parseChNum(title) {
  const m = title.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : '0';
}
