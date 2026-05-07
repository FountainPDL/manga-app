// ── RAVENSCANS SOURCE ────────────────────────────────────────────
// Custom HTML scraper — uses script parsing for images (not just DOM)
// Based on RavenScans structure research

const BASE  = 'https://ravenscans.com';
const PROXY = 'https://corsproxy.io/?';

async function fetchDoc(url) {
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
      'Referer':         BASE,
      'Accept-Language': 'en-US,en;q=0.9',
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
  return el?.getAttribute('data-src') || el?.getAttribute('data-lazy') || el?.getAttribute('src') || '';
}

export const RavenScansSource = {
  id:          'ravenscans',
  name:        'RavenScans',
  lang:        'en',
  baseUrl:     BASE,
  isBuiltIn:   true,
  supportsSearch: true,
  supportsBrowse: true,

  async browse(page = 1) {
    try {
      const doc = await fetchDoc(`${BASE}/series/?page=${page}&status=&type=&order=update`);
      return extractList(doc);
    } catch (e) {
      console.error('RavenScans browse:', e);
      throw e;
    }
  },

  async search(query) {
    try {
      const doc = await fetchDoc(`${BASE}/?s=${encodeURIComponent(query)}`);
      return extractList(doc);
    } catch (e) {
      console.error('RavenScans search:', e);
      throw e;
    }
  },

  async getMangaDetails(id) {
    try {
      const url = id.startsWith('http') ? id : `${BASE}/series/${id}`;
      const doc = await fetchDoc(url);

      const title  = doc.querySelector('.post-title h1, .entry-title, h1.title')?.textContent?.trim() || '';
      const cover  = resolve(imgSrc(doc.querySelector('.summary_image img, .thumb img')));
      const desc   = doc.querySelector('.entry-content p, .summary__content p, [class*="description"] p')?.textContent?.trim() || '';
      const author = doc.querySelector('.author-content, [class*="author"]')?.textContent?.trim().replace(/^Author:\s*/i, '') || '';
      const status = doc.querySelector('[class*="status"] .summary-content')?.textContent?.trim() || '';
      const genres = Array.from(doc.querySelectorAll('.genres-content a, .genre-list a'))
        .map((el) => el.textContent.trim());

      const chapters = extractChapters(doc, url);

      return {
        id,
        title,
        cover,
        description: desc,
        author,
        status,
        genres,
        sourceId:   'ravenscans',
        sourceName: 'RavenScans',
        url,
        chapters,
      };
    } catch (e) {
      console.error('RavenScans details:', e);
      throw e;
    }
  },

  async getPageList(mangaId, chapterId) {
    try {
      const url = chapterId.startsWith('http') ? chapterId : `${BASE}${chapterId}`;
      const doc = await fetchDoc(url);

      // Step 1: Try direct images in reading area
      let pages = Array.from(doc.querySelectorAll('.reading-content img, .chapter-content img, .entry-content img'))
        .map((img, i) => ({ index: i, url: resolve(imgSrc(img)) }))
        .filter((p) => p.url && /\.(jpg|jpeg|png|webp)/i.test(p.url));

      if (pages.length > 0) return pages;

      // Step 2: Script-based extraction (RavenScans often embeds images in JS)
      const scripts = Array.from(doc.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent;

        // Pattern 1: ts_reader.run({...})
        const tsMatch = text.match(/ts_reader\.run\((\{.*?\})\)/s);
        if (tsMatch) {
          try {
            const data = JSON.parse(tsMatch[1]);
            const sources = data.sources || [];
            if (sources.length > 0) {
              const imgs = sources[0].images || [];
              return imgs.map((u, i) => ({ index: i, url: resolve(u) })).filter((p) => p.url);
            }
          } catch { /* continue */ }
        }

        // Pattern 2: var images = ["url1", "url2"]
        const imgMatch = text.match(/var\s+images\s*=\s*(\[[\s\S]*?\]);/);
        if (imgMatch) {
          try {
            const imgs = JSON.parse(imgMatch[1]);
            return imgs
              .filter((u) => typeof u === 'string')
              .map((u, i) => ({ index: i, url: resolve(u) }));
          } catch { /* continue */ }
        }

        // Pattern 3: JSON array of image objects
        const jsonMatch = text.match(/"pages"\s*:\s*(\[[\s\S]*?\])/);
        if (jsonMatch) {
          try {
            const pages = JSON.parse(jsonMatch[1]);
            return pages
              .map((p, i) => ({ index: i, url: resolve(typeof p === 'string' ? p : p.url || p.src) }))
              .filter((p) => p.url);
          } catch { /* continue */ }
        }
      }

      return [];
    } catch (e) {
      console.error('RavenScans pages:', e);
      throw e;
    }
  },
};

function extractList(doc) {
  const selectors = ['.series-card', '.bsx', '.bs', '.manga-item', '.series-item'];
  let items = [];
  for (const sel of selectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  return Array.from(items).map((item) => {
    const link  = item.querySelector('a');
    const img   = item.querySelector('img');
    const title = item.querySelector('.title, .series-title, h3, h4')?.textContent?.trim()
                  || img?.alt?.trim() || '';
    if (!link || !title) return null;
    return {
      id:         resolve(link.href),
      title,
      cover:      resolve(imgSrc(img)),
      sourceId:   'ravenscans',
      sourceName: 'RavenScans',
      url:        resolve(link.href),
    };
  }).filter(Boolean);
}

function extractChapters(doc, mangaUrl) {
  const items = doc.querySelectorAll('#chapterlist li, .chapter-list li, [class*="chapter-item"]');
  return Array.from(items).map((item, i) => {
    const link = item.querySelector('a');
    if (!link) return null;
    const title = link.querySelector('.chapternum, span')?.textContent?.trim() || link.textContent.trim();
    const date  = item.querySelector('.chapterdate, [class*="date"]')?.textContent?.trim() || '';
    return {
      id:       resolve(link.href),
      title,
      number:   parseChNum(title),
      date,
      index:    i,
      sourceId: 'ravenscans',
      mangaId:  mangaUrl,
    };
  }).filter(Boolean);
}

function parseChNum(title) {
  const m = title.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : '0';
}
