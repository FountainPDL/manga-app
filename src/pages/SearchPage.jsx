import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@store';
import { AllMangaSource, MangaPumaSource, RavenScansSource, LocalSource, getAllSources } from '@sources';

export function SearchPage({ onOpenManga }) {
  const { settings, sources } = useStore();

  // ── Persist state so returning from detail doesn't wipe search ──
  const [query,         setQuery]         = useState(() => window._cfSearchQuery   || '');
  const [results,       setResults]       = useState(() => window._cfSearchResults || []);
  const [feed,          setFeed]          = useState(() => window._cfSearchFeed    || []);
  const [selectedSrcId, setSelectedSrcId] = useState(() => window._cfSearchSrcId  || 'allanime');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingFeed,   setLoadingFeed]   = useState(false);
  const [searched,      setSearched]      = useState(() => !!window._cfSearchQuery);
  const [showSrcPicker, setShowSrcPicker] = useState(false);
  const [error,         setError]         = useState(null);
  const inputRef = useRef(null);

  // Persist to window so navigating back restores state
  useEffect(() => { window._cfSearchQuery   = query;         }, [query]);
  useEffect(() => { window._cfSearchResults = results;       }, [results]);
  useEffect(() => { window._cfSearchFeed    = feed;          }, [feed]);
  useEffect(() => { window._cfSearchSrcId   = selectedSrcId; }, [selectedSrcId]);

  const allBuiltIn = [AllMangaSource, MangaPumaSource, RavenScansSource, LocalSource];
  const customSrcs = sources.filter((s) => s.enabled !== false);
  const allSources = [...allBuiltIn, ...customSrcs.map(buildRef)];
  const activeSrc  = allSources.find((s) => s.id === selectedSrcId) || AllMangaSource;

  // ── Load feed when source changes and no query ─────────────────
  const loadFeed = useCallback(async () => {
    if (!activeSrc.browse) return;
    setLoadingFeed(true);
    setError(null);
    try {
      const data     = await activeSrc.browse(1);
      const filtered = settings.show18Plus ? data : data.filter((m) => !isAdult(m));
      setFeed(filtered);
    } catch (e) {
      setError(e.message || 'Failed to load feed');
    }
    setLoadingFeed(false);
  }, [selectedSrcId, settings.show18Plus]);

  useEffect(() => {
    if (!searched && feed.length === 0) loadFeed();
  }, [selectedSrcId]);

  useEffect(() => {
    if (!searched) loadFeed();
  }, [selectedSrcId]);

  // ── Search ─────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setSearched(true);
    setError(null);
    try {
      // Get the real source object (not the ref)
      const realSrc = getRealSource(selectedSrcId, sources);
      if (!realSrc || typeof realSrc.search !== 'function') {
        throw new Error(`Source "${activeSrc.name}" doesn't support search`);
      }
      const data     = await realSrc.search(query.trim());
      const filtered = settings.show18Plus ? data : data.filter((m) => !isAdult(m));
      setResults(filtered);
    } catch (e) {
      setError(e.message || 'Search failed');
      setResults([]);
    }
    setLoadingSearch(false);
  };

  const clearSearch = () => {
    setQuery('');
    setSearched(false);
    setResults([]);
    setError(null);
    window._cfSearchQuery   = '';
    window._cfSearchResults = [];
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-title">Search</span>
      </div>

      <div className="page-scroll">
        <div className="page-content">

          {/* Search bar */}
          <div className="search-bar" style={{ marginBottom: 10 }}>
            <SearchSVG />
            <input
              ref={inputRef}
              placeholder="Search titles, alt names…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {query && (
              <button className="btn-icon" style={{ padding: 3 }} onClick={clearSearch}>
                <XSvg />
              </button>
            )}
          </div>

          {/* Source + Search button */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setShowSrcPicker(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.84rem', fontWeight: 600, textAlign: 'left', overflow: 'hidden' }}
            >
              <GlobeSvg />
              <span className="truncate">{activeSrc.name}</span>
            </button>
            <button className="btn btn-primary" onClick={handleSearch} disabled={loadingSearch || !query.trim()} style={{ flexShrink: 0 }}>
              {loadingSearch ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Search'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.25)', borderRadius: 'var(--radius-md)', color: '#e63946', fontSize: '0.82rem', fontWeight: 600, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* ── SEARCH RESULTS ── */}
          {searched && (
            <>
              {loadingSearch && <ListSkeletons />}
              {!loadingSearch && results.length === 0 && !error && (
                <div className="empty-state">
                  <SearchSVG size={40} />
                  <h3>No results</h3>
                  <p>Try different keywords or switch sources.</p>
                </div>
              )}
              {!loadingSearch && results.length > 0 && (
                <>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    {results.length} results · {activeSrc.name}
                  </div>
                  <div className="manga-grid list">
                    {results.map((manga) => (
                      <SearchCard key={manga.id} manga={manga} onClick={() => {
                        const src = getRealSource(selectedSrcId, sources);
                        onOpenManga(manga, src);
                      }} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── FEED (no query entered yet) ── */}
          {!searched && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-display)' }}>
                  Featured — {activeSrc.name}
                </div>
                <button className="btn-icon" onClick={loadFeed}>
                  <RefreshSvg />
                </button>
              </div>

              {loadingFeed && (
                <div className="manga-grid grid-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i}>
                      <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)' }} />
                      <div className="skeleton" style={{ height: 11, marginTop: 5, width: '75%' }} />
                    </div>
                  ))}
                </div>
              )}

              {!loadingFeed && feed.length > 0 && (
                <div className="manga-grid grid-3">
                  {feed.map((manga) => (
                    <div key={manga.id} className="manga-card" onClick={() => {
                      const src = getRealSource(selectedSrcId, sources);
                      onOpenManga(manga, src);
                    }}>
                      <img className="manga-card-cover" src={manga.cover || placeholder(manga.title)} alt={manga.title}
                        onError={(e) => { e.target.src = placeholder(manga.title); }} loading="lazy" />
                      <div className="manga-card-info">
                        <div className="manga-card-title">{manga.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingFeed && feed.length === 0 && !error && (
                <div className="empty-state">
                  <SearchSVG size={38} />
                  <h3>Enter a title to search</h3>
                  <p>Results from {activeSrc.name} will appear here.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Source picker */}
      {showSrcPicker && (
        <div className="modal-overlay" onClick={() => setShowSrcPicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Select Source</div>
            {allSources.map((src) => (
              <button key={src.id}
                onClick={() => { setSelectedSrcId(src.id); setShowSrcPicker(false); setSearched(false); setResults([]); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', marginBottom: 6, background: selectedSrcId === src.id ? 'var(--chip-bg)' : 'var(--bg-card)', border: selectedSrcId === src.id ? '2px solid var(--accent-primary)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: srcColor(src.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                  {src.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: selectedSrcId === src.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{src.name}</div>
                  {src.baseUrl && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{src.baseUrl}</div>}
                </div>
                {selectedSrcId === src.id && <span style={{ color: 'var(--accent-primary)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Search card ────────────────────────────────────────────────────
function SearchCard({ manga, onClick }) {
  return (
    <div className="manga-card list-card" onClick={onClick}>
      <img className="manga-card-cover" src={manga.cover || placeholder(manga.title)} alt={manga.title}
        onError={(e) => { e.target.src = placeholder(manga.title); }} />
      <div className="manga-card-info">
        <div className="manga-card-title" style={{ fontSize: '0.9rem', WebkitLineClamp: 2 }}>{manga.title}</div>
        {manga.altTitles?.[0] && (
          <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: 2 }} className="truncate">{manga.altTitles[0]}</div>
        )}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>{manga.sourceName}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
          {manga.status && <span className="chip chip-gray">{manga.status}</span>}
          {manga.genres?.slice(0, 2).map((g) => <span key={g} className="chip chip-gray">{g}</span>)}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
function getRealSource(id, customSources) {
  const builtins = { allanime: AllMangaSource, mangapuma: MangaPumaSource, ravenscans: RavenScansSource, local: LocalSource };
  if (builtins[id]) return builtins[id];
  // Custom source — build it with search method
  const stored = customSources.find((s) => s.id === id);
  if (!stored) return null;
  const PROXY = 'https://corsproxy.io/?';
  const base  = stored.url.replace(/\/$/, '');
  return {
    ...stored,
    search: async (query) => {
      const path = stored.searchPath || '/?s=';
      const url  = `${base}${path}${encodeURIComponent(query)}`;
      const res  = await fetch(`${PROXY}${encodeURIComponent(url)}`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': base } });
      const html = await res.text();
      const doc  = new DOMParser().parseFromString(html, 'text/html');
      return Array.from(doc.querySelectorAll('a'))
        .filter((a) => a.querySelector('img') && a.href)
        .slice(0, 24)
        .map((a) => {
          const img = a.querySelector('img');
          const src = img?.getAttribute('data-src') || img?.src || '';
          const title = img?.alt || a.textContent.trim();
          if (!title || title.length < 2) return null;
          return { id: a.href, title, cover: src, url: a.href, sourceId: stored.id, sourceName: stored.name };
        }).filter(Boolean);
    },
    browse: async () => [],
    getMangaDetails: async () => null,
    getPageList: async () => [],
  };
}

function buildRef(stored) {
  return { id: stored.id, name: stored.name, baseUrl: stored.url, supportsSearch: true, supportsBrowse: false };
}

function isAdult(m) {
  const kw = ['hentai','adult','ecchi','mature','nsfw','erotica'];
  const t  = (m.title || '').toLowerCase();
  const g  = (m.genres || []).map((x) => x.toLowerCase());
  return kw.some((k) => t.includes(k) || g.includes(k));
}

function srcColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const p = ['#8b2fc9','#c0392b','#2980b9','#27ae60','#d35400','#8e44ad'];
  return p[Math.abs(h) % p.length];
}

function placeholder(t) {
  return `https://via.placeholder.com/120x180/160030/9b30ff?text=${encodeURIComponent((t||'M').charAt(0))}`;
}

function ListSkeletons() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: 9, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ width: 55, height: 76, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, marginBottom: 8, width: '70%' }} />
            <div className="skeleton" style={{ height: 11, width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Inline SVGs
const SearchSVG = ({ size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const XSvg     = ()  => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const GlobeSvg = ()  => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const RefreshSvg=()  => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
