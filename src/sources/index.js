// ── SOURCE REGISTRY ───────────────────────────────────────────────
import { AllMangaSource }  from './AllManga.js';
import { MangaPumaSource } from './MangaPuma.js';
import { RavenScansSource} from './RavenScans.js';
import { LocalSource }     from './LocalSource.js';
import { useStore }        from '@store';

// All built-in sources in order
export const BUILT_IN_SOURCES = [
  AllMangaSource,
  MangaPumaSource,
  RavenScansSource,
  LocalSource,
];

export { AllMangaSource, MangaPumaSource, RavenScansSource, LocalSource };

// ── Get source by id ──────────────────────────────────────────────
export function getSource(id) {
  // Check built-ins first
  const builtin = BUILT_IN_SOURCES.find((s) => s.id === id);
  if (builtin) return builtin;

  // Check custom URL sources from store
  const stored = useStore.getState().sources.find((s) => s.id === id);
  if (stored) return buildCustomSource(stored);

  return null;
}

// ── Get all enabled sources ───────────────────────────────────────
export function getAllSources() {
  const stored  = useStore.getState().sources.filter((s) => s.enabled !== false);
  const custom  = stored.map(buildCustomSource);
  return [...BUILT_IN_SOURCES, ...custom];
}

// ── Build a custom URL-based source ──────────────────────────────
// FIX: This is where "fe.search is not a function" was happening.
// The custom source object MUST have all methods as proper functions.
function buildCustomSource(stored) {
  const PROXY = 'https://corsproxy.io/?';
  const base  = stored.url.replace(/\/$/, '');

  async function fetchDoc(url) {
    const res = await fetch(`${PROXY}${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': base },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new DOMParser().parseFromString(await res.text(), 'text/html');
  }

  function resolve(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//'))   return 'https:' + url;
    if (url.startsWith('/'))    return new URL(base).origin + url;
    return url;
  }

  function imgSrc(el) {
    return el?.getAttribute('data-src') || el?.getAttribute('data-lazy-src') || el?.getAttribute('src') || '';
  }

  // The source object — all methods are guaranteed to be functions
  return {
    id:             stored.id,
    name:           stored.name,
    lang:           stored.lang || 'en',
    baseUrl:        base,
    is18Plus:       stored.is18Plus || false,
    isBuiltIn:      false,
    supportsSearch: true,
    supportsBrowse: false,

    // MUST be a function — this was the bug
    search: async function(query) {
      const searchPath = stored.searchPath || '/?s=';
      const url  = `${base}${searchPath}${encodeURIComponent(query)}`;
      const doc  = await fetchDoc(url);
      return extractGenericList(doc, stored, base, resolve, imgSrc);
    },

    browse: async function() {
      return [];
    },

    getMangaDetails: async function(id) {
      const url = id.startsWith('http') ? id : `${base}${id}`;
      const doc = await fetchDoc(url);
      return extractGenericDetails(doc, stored, url, base, resolve, imgSrc);
    },

    getPageList: async function(mangaId, chapterId) {
      const url = chapterId.startsWith('http') ? chapterId : `${base}${chapterId}`;
      const doc = await fetchDoc(url);
      return extractGenericPages(doc, base, resolve, imgSrc);
    },
  };
}

// ── Generic extractors ────────────────────────────────────────────
function extractGenericList(doc, source, base, resolve, imgSrc) {
  const selectors = [
    '.manga-item', '.manga_item', '.c-image-hover', '.page-item-detail',
    '.list-story-item', 'article', '[class*="manga"]',
  ];
  let items = [];
  for (const sel of selectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  if (items.length === 0) {
    // Fallback: any link with an image
    return Array.from(doc.querySelectorAll('a'))
      .filter((a) => a.querySelector('img') && a.href)
      .slice(0, 24)
      .map((a) => {
        const img   = a.querySelector('img');
        const title = img?.alt || a.textContent.trim();
        if (!title || title.length < 2) return null;
        return {
          id: resolve(a.href), title,
          cover:      resolve(imgSrc(img)),
          url:        resolve(a.href),
          sourceId:   source.id,
          sourceName: source.name,
        };
      }).filter(Boolean);
  }

  return Array.from(items).map((item) => {
    const link  = item.querySelector('a');
    const img   = item.querySelector('img');
    const titleEl = item.querySelector('h1,h2,h3,h4,.title,[class*="title"],[class*="name"]');
    if (!link) return null;
    const title = titleEl?.textContent?.trim() || img?.alt?.trim() || '';
    if (!title) return null;
    return {
      id:         resolve(link.href),
      title,
      cover:      resolve(imgSrc(img)),
      url:        resolve(link.href),
      sourceId:   source.id,
      sourceName: source.name,
    };
  }).filter(Boolean).slice(0, 30);
}

function extractGenericDetails(doc, source, url, base, resolve, imgSrc) {
  const title  = doc.querySelector('h1, .manga-title, .post-title')?.textContent?.trim() || doc.title;
  const coverEl= doc.querySelector('[class*="cover"] img, [class*="poster"] img, .summary_image img');
  const descEl = doc.querySelector('[class*="summary"] p, [class*="description"] p, [class*="synopsis"] p');
  const authorEl = doc.querySelector('[class*="author"]');
  const statusEl = doc.querySelector('[class*="status"]');
  const genreEls = doc.querySelectorAll('[class*="genre"] a, [class*="tag"] a');
  const chapters = extractGenericChapters(doc, source, url, resolve, imgSrc);

  return {
    id: url, title,
    cover:       resolve(imgSrc(coverEl)),
    description: descEl?.textContent?.trim() || '',
    author:      authorEl?.textContent?.trim() || '',
    status:      statusEl?.textContent?.trim() || '',
    genres:      Array.from(genreEls).map((el) => el.textContent.trim()).slice(0, 8),
    sourceId:    source.id,
    sourceName:  source.name,
    url,
    chapters,
  };
}

function extractGenericChapters(doc, source, mangaUrl, resolve, imgSrc) {
  const selectors = [
    '[class*="chapter-item"]', '[class*="wp-manga-chapter"]',
    '.chapter li', 'li[class*="chapter"]',
  ];
  let items = [];
  for (const sel of selectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  return Array.from(items).map((item, i) => {
    const link = item.querySelector('a');
    if (!link) return null;
    const title  = link.textContent.trim();
    const dateEl = item.querySelector('[class*="date"], time');
    return {
      id:       resolve(link.href),
      title,
      number:   extractNum(title),
      date:     dateEl?.textContent?.trim() || '',
      index:    i,
      sourceId: source.id,
      mangaId:  mangaUrl,
    };
  }).filter(Boolean);
}

function extractGenericPages(doc, base, resolve, imgSrc) {
  const selectors = ['#readerarea img', '.reading-content img', '.chapter-content img'];
  let imgs = [];
  for (const sel of selectors) {
    imgs = doc.querySelectorAll(sel);
    if (imgs.length > 0) break;
  }
  if (imgs.length === 0) imgs = doc.querySelectorAll('img');

  const pages = Array.from(imgs)
    .map((img, i) => {
      const src = resolve(imgSrc(img));
      if (!src || /logo|banner|avatar/i.test(src)) return null;
      if (!/\.(jpg|jpeg|png|webp)/i.test(src)) return null;
      return { index: i, url: src };
    }).filter(Boolean);

  if (pages.length > 0) return pages;

  // Script fallback
  for (const script of doc.querySelectorAll('script')) {
    const text = script.textContent;
    const m = text.match(/(?:images|pages)\s*=\s*(\[.*?\])/s);
    if (m) {
      try {
        return JSON.parse(m[1])
          .filter((u) => typeof u === 'string')
          .map((u, i) => ({ index: i, url: resolve(u) }));
      } catch { /* continue */ }
    }
  }

  return [];
}

function extractNum(title) {
  const m = title.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : '0';
}
