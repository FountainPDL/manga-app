import { useState, useMemo } from 'react';
import { useStore } from '@store';
import { GridIcon, ListIcon, SortIcon, SearchIcon, BookOpenIcon, CheckIcon, TrashIcon, XIcon } from '@components/common/Icons';

const SORT_OPTIONS = [
  { id: 'recent',  label: 'Recently Read' },
  { id: 'added',   label: 'Date Added' },
  { id: 'title',   label: 'Title A–Z' },
  { id: 'updated', label: 'Recently Updated' },
];

export function LibraryPage({ onOpenManga }) {
  const {
    library, localManga, progress, settings, downloads,
    categories, updateSettings, removeFromLibrary,
    markChapterRead, markChapterUnread, showToast,
  } = useStore();

  const [search,    setSearch]    = useState('');
  const [sort,      setSort]      = useState('recent');
  const [filter,    setFilter]    = useState('all');
  const [catFilter, setCatFilter] = useState('');   // category id or ''
  const [showSort,  setShowSort]  = useState(false);
  const [showLayout,setShowLayout]= useState(false);
  const [selected,  setSelected]  = useState([]);   // bulk selection
  const [showBulk,  setShowBulk]  = useState(false);

  const allManga = useMemo(() => [...library, ...localManga], [library, localManga]);

  // Built-in filter tabs
  const builtInFilters = [
    { id: 'all',        label: 'All' },
    { id: 'reading',    label: 'Reading' },
    { id: 'completed',  label: 'Completed' },
    { id: 'downloaded', label: 'Downloaded' },
    { id: 'local',      label: 'Local' },
  ];

  const filtered = useMemo(() => {
    let list = allManga;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.title?.toLowerCase().includes(q));
    }

    // Built-in filter
    if (filter === 'reading')    list = list.filter((m) => progress[m.id] && !isCompleted(m, progress));
    if (filter === 'completed')  list = list.filter((m) => isCompleted(m, progress));
    if (filter === 'downloaded') list = list.filter((m) => downloads.some((d) => d.mangaId === m.id));
    if (filter === 'local')      list = list.filter((m) => m.local);

    // Category filter
    if (catFilter) {
      list = list.filter((m) => (m.categories || []).includes(catFilter));
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sort === 'title')   return (a.title || '').localeCompare(b.title || '');
      if (sort === 'added')   return (b.addedAt || 0) - (a.addedAt || 0);
      if (sort === 'recent')  return (progress[b.id]?.lastRead || 0) - (progress[a.id]?.lastRead || 0);
      if (sort === 'updated') return (b.updatedAt || 0) - (a.updatedAt || 0);
      return 0;
    });

    return list;
  }, [allManga, search, filter, sort, catFilter, progress, downloads]);

  const { libraryView, gridColumns, libraryCompact } = settings;
  const gridClass = libraryView === 'list'
    ? 'manga-grid list'
    : `manga-grid grid-${gridColumns || 2}${libraryCompact ? ' compact' : ''}`;

  // Bulk selection helpers
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const isSelecting = selected.length > 0;

  const bulkRemove = () => {
    selected.forEach((id) => removeFromLibrary(id));
    showToast(`${selected.length} removed from library`, 'info');
    setSelected([]);
  };

  const bulkMarkRead = () => {
    selected.forEach((mangaId) => {
      const manga = allManga.find((m) => m.id === mangaId);
      manga?.chapters?.forEach((ch) => markChapterRead(mangaId, ch.id));
    });
    showToast('Marked as read', 'success');
    setSelected([]);
  };

  const bulkMarkUnread = () => {
    selected.forEach((mangaId) => {
      const manga = allManga.find((m) => m.id === mangaId);
      manga?.chapters?.forEach((ch) => markChapterUnread(mangaId, ch.id));
    });
    showToast('Marked as unread', 'info');
    setSelected([]);
  };

  return (
    <div className="page" style={{ position: 'relative' }}>

      {/* Bulk selection bar */}
      {isSelecting && (
        <div className="selection-bar">
          <button
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            onClick={() => setSelected([])}
          >
            <XIcon size={20} />
          </button>
          <span>{selected.length} selected</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none' }}
              onClick={bulkMarkRead}
            >
              Mark Read
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none' }}
              onClick={bulkMarkUnread}
            >
              Unread
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(230,57,70,0.28)', color: '#fff', border: 'none' }}
              onClick={bulkRemove}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ paddingTop: isSelecting ? 60 : undefined }}>
        <span className="page-title">Library</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn-icon" onClick={() => setShowLayout(true)}>
            <GridIcon size={20} />
          </button>
          <button className="btn-icon" onClick={() => setShowSort(true)}>
            <SortIcon size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="page-scroll">
        <div className="page-content">

          {/* Search */}
          <div className="search-bar" style={{ marginBottom: 10 }}>
            <SearchIcon size={17} />
            <input
              placeholder="Search library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn-icon" style={{ padding: 2 }} onClick={() => setSearch('')}>
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Built-in filter tabs */}
          <div className="tabs" style={{ marginBottom: 8 }}>
            {builtInFilters.map((f) => (
              <button
                key={f.id}
                className={`tab ${filter === f.id && !catFilter ? 'active' : ''}`}
                onClick={() => { setFilter(f.id); setCatFilter(''); }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category tabs (if any) */}
          {categories.length > 0 && (
            <div className="tabs" style={{ marginBottom: 12 }}>
              <button
                className={`tab ${!catFilter ? 'active' : ''}`}
                onClick={() => setCatFilter('')}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`tab ${catFilter === cat.id ? 'active' : ''}`}
                  onClick={() => { setCatFilter(cat.id); setFilter('all'); }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Stats */}
          {filtered.length > 0 && (
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              {filtered.length} titles
              {downloads.length > 0 && ` · ${downloads.length} chapters downloaded`}
            </div>
          )}

          {/* Grid / List */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <BookOpenIcon size={44} />
              <h3>Library is empty</h3>
              <p>Search for manga and add them to your library to see them here.</p>
            </div>
          ) : (
            <div className={gridClass}>
              {filtered.map((manga) => (
                <MangaCard
                  key={manga.id}
                  manga={manga}
                  view={libraryView}
                  compact={libraryCompact}
                  progress={progress[manga.id]}
                  hasDownloads={downloads.some((d) => d.mangaId === manga.id)}
                  selected={selected.includes(manga.id)}
                  isSelecting={isSelecting}
                  onPress={() => {
                    if (isSelecting) toggleSelect(manga.id);
                    else onOpenManga(manga);
                  }}
                  onLongPress={() => toggleSelect(manga.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort modal */}
      {showSort && (
        <div className="modal-overlay" onClick={() => setShowSort(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Sort By</div>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSort(opt.id); setShowSort(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', background: sort === opt.id ? 'var(--chip-bg)' : 'transparent',
                  border: sort === opt.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  color: sort === opt.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                  marginBottom: 6, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.88rem',
                  textAlign: 'left',
                }}
              >
                {opt.label}
                {sort === opt.id && <CheckIcon size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layout modal */}
      {showLayout && (
        <div className="modal-overlay" onClick={() => setShowLayout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Library Layout</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontFamily: 'var(--font-display)' }}>View</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['grid', 'list'].map((v) => (
                  <button
                    key={v}
                    onClick={() => updateSettings({ libraryView: v })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 'var(--radius-md)',
                      border: libraryView === v ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                      background: libraryView === v ? 'var(--chip-bg)' : 'transparent',
                      color: libraryView === v ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700,
                      textTransform: 'capitalize',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {libraryView === 'grid' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontFamily: 'var(--font-display)' }}>Columns</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateSettings({ gridColumns: n })}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 'var(--radius-md)',
                        border: gridColumns === n ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                        background: gridColumns === n ? 'var(--chip-bg)' : 'transparent',
                        color: gridColumns === n ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="settings-row" style={{ paddingTop: 4, paddingBottom: 0 }}>
              <div className="settings-row-info">
                <div className="settings-row-label">Compact Mode</div>
                <div className="settings-row-desc">Smaller cards, less info</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!libraryCompact}
                  onChange={(e) => updateSettings({ libraryCompact: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MANGA CARD ─────────────────────────────────────────────────────
function MangaCard({ manga, view, compact, progress, hasDownloads, selected, isSelecting, onPress, onLongPress }) {
  const readCount = progress
    ? Object.values(progress).filter((v) => typeof v === 'object' && v.completed).length
    : 0;
  const total = manga.chapters?.length || 1;
  const pct   = Math.min(100, Math.round((readCount / total) * 100));

  const lastChapter = progress?.lastChapterId
    ? manga.chapters?.find((c) => c.id === progress.lastChapterId)
    : null;

  // Long press support
  let pressTimer = null;
  const handleTouchStart = () => {
    pressTimer = setTimeout(() => onLongPress?.(), 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(pressTimer);
  };

  if (view === 'list') {
    return (
      <div
        className={`manga-card list-card ${selected ? 'selected' : ''}`}
        onClick={onPress}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {selected && (
          <div className="manga-card-check">
            <CheckIcon size={11} style={{ color: '#fff' }} />
          </div>
        )}
        <img
          className="manga-card-cover"
          src={manga.cover || placeholder(manga.title)}
          alt={manga.title}
          onError={(e) => { e.target.src = placeholder(manga.title); }}
        />
        <div className="manga-card-info">
          <div className="manga-card-title">{manga.title}</div>
          <div className="manga-card-sub">
            {lastChapter ? lastChapter.title : (manga.sourceName || (manga.local ? 'Local' : ''))}
          </div>
          {!compact && (
            <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              {manga.local      && <span className="chip chip-gray">Local</span>}
              {hasDownloads     && <span className="chip">DL</span>}
              {manga.status     && <span className="chip chip-gray">{manga.status}</span>}
            </div>
          )}
          {pct > 0 && (
            <div className="progress-bar" style={{ marginTop: 7 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`manga-card ${selected ? 'selected' : ''}`}
      onClick={onPress}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        className="manga-card-cover"
        src={manga.cover || placeholder(manga.title)}
        alt={manga.title}
        onError={(e) => { e.target.src = placeholder(manga.title); }}
        loading="lazy"
      />
      {pct > 0 && <div className="manga-card-progress" style={{ width: `${pct}%` }} />}
      {hasDownloads && <div className="manga-card-badge">DL</div>}
      {selected && (
        <div className="manga-card-check">
          <CheckIcon size={11} style={{ color: '#fff' }} />
        </div>
      )}
      {!compact && (
        <div className="manga-card-info">
          <div className="manga-card-title">{manga.title}</div>
          {lastChapter && <div className="manga-card-sub">{lastChapter.title}</div>}
        </div>
      )}
    </div>
  );
}

// ── HELPERS ────────────────────────────────────────────────────────
function isCompleted(manga, progress) {
  if (!manga.chapters?.length || !progress[manga.id]) return false;
  const read = Object.values(progress[manga.id]).filter(
    (v) => typeof v === 'object' && v.completed
  ).length;
  return read >= manga.chapters.length;
}

function placeholder(title) {
  const letter = encodeURIComponent((title || 'M').charAt(0).toUpperCase());
  return `https://via.placeholder.com/120x180/160030/9b30ff?text=${letter}`;
}
