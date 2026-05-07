import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@store';
import { captureScreenshot, saveImageToDevice, shareImage } from '@utils/screenshot';

// ── ICONS (inline to avoid import issues) ────────────────────────
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const BackIcon    = () => <Icon d="M19 12H5M12 19l-7-7 7-7" />;
const ChevDown    = () => <Icon d="M6 9l6 6 6-6" />;
const SettingsGear= () => <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />;
const CameraIcon  = () => <Icon d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z" />;
const BookmarkFill= ({ filled }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
);

// ── READING MODES ────────────────────────────────────────────────
const READING_MODES = [
  { id: 'webtoon',  label: 'Webtoon',        desc: 'Continuous vertical scroll', icon: '↕' },
  { id: 'vertical', label: 'Top-Down',        desc: 'Vertical with gaps',         icon: '↓' },
  { id: 'rtl',      label: 'Right to Left',   desc: 'Default manga direction',    icon: '←' },
  { id: 'ltr',      label: 'Left to Right',   desc: 'Manhwa/comics direction',    icon: '→' },
];

export function MangaReader({
  manga, chapter, pages, chapters = [],
  onClose, onNextChapter, onPrevChapter, onSelectChapter,
}) {
  const { settings, updateSettings, updateProgress, addToHistory,
    addBookmark, removeBookmark, isBookmarked, bookmarks, markChapterRead, showToast } = useStore();

  const [currentPage,    setCurrentPage]    = useState(0);
  const [showUI,         setShowUI]         = useState(true);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showChapterList,setShowChapterList]= useState(false);
  const [showSaveMenu,   setShowSaveMenu]   = useState(false);
  const [settingsTab,    setSettingsTab]    = useState('mode');
  const [zoom,           setZoom]           = useState(1);
  const [saving,         setSaving]         = useState(false);
  const [loadedPages,    setLoadedPages]    = useState({});
  const [chapterSearch,  setChapterSearch]  = useState('');

  const readingMode = settings.defaultReadingMode || 'rtl';
  const isScroll    = readingMode === 'webtoon' || readingMode === 'vertical';
  const pageGap     = settings.pageGap || 0;
  const bgColor     = settings.readerBg || '#000000';
  const grayscale   = settings.readerGrayscale || false;
  const invertColor = settings.readerInvert || false;
  const cropBorders = settings.cropBorders || false;

  const uiTimerRef  = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const scrollRef   = useRef(null);

  const isPageBookmarked = isBookmarked(manga?.id, chapter?.id, currentPage);

  // ── UI auto-hide ─────────────────────────────────────────────
  const resetUITimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => {
      if (!showSettings && !showChapterList && !showSaveMenu) setShowUI(false);
    }, 3000);
  }, [showSettings, showChapterList, showSaveMenu]);

  useEffect(() => { resetUITimer(); return () => clearTimeout(uiTimerRef.current); }, []);
  useEffect(() => { if (showSettings || showChapterList || showSaveMenu) setShowUI(true); }, [showSettings, showChapterList, showSaveMenu]);

  // ── Progress tracking ────────────────────────────────────────
  useEffect(() => {
    if (!manga || !chapter) return;
    updateProgress(manga.id, chapter.id, currentPage, pages.length);
    addToHistory({ mangaId: manga.id, mangaTitle: manga.title, mangaCover: manga.cover, chapterId: chapter.id, chapterTitle: chapter.title, page: currentPage, totalPages: pages.length });
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === pages.length - 1 && manga && chapter) markChapterRead(manga.id, chapter.id);
  }, [currentPage, pages.length]);

  // ── Touch handling ───────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (isScroll || showSettings || showChapterList) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      handleTap(e.changedTouches[0].clientX);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (readingMode === 'rtl') { dx < 0 ? nextPage() : prevPage(); }
      else { dx > 0 ? nextPage() : prevPage(); }
    }
  };

  const handleTap = (x) => {
    const w = window.innerWidth;
    if (x < w * 0.25) { readingMode === 'rtl' ? nextPage() : prevPage(); return; }
    if (x > w * 0.75) { readingMode === 'rtl' ? prevPage() : nextPage(); return; }
    resetUITimer();
    setShowUI((v) => !v);
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1) { setCurrentPage((p) => p + 1); }
    else if (settings.autoNextChapter && onNextChapter) { onNextChapter(); }
  };
  const prevPage = () => {
    if (currentPage > 0) { setCurrentPage((p) => p - 1); }
    else if (onPrevChapter) { onPrevChapter(); }
  };

  // ── Scroll handler for webtoon/vertical ──────────────────────
  const handleScroll = useCallback((e) => {
    const el = e.target;
    const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    const est   = Math.min(pages.length - 1, Math.floor(ratio * pages.length));
    if (est !== currentPage) setCurrentPage(est);
    resetUITimer();
  }, [currentPage, pages.length]);

  // ── Bookmark ─────────────────────────────────────────────────
  const toggleBookmark = () => {
    if (isPageBookmarked) {
      const bm = bookmarks.find((b) => b.mangaId === manga.id && b.chapterId === chapter.id && b.page === currentPage);
      if (bm) { removeBookmark(bm.id); showToast('Bookmark removed', 'info'); }
    } else {
      addBookmark({ mangaId: manga.id, mangaTitle: manga.title, mangaCover: manga.cover, chapterId: chapter.id, chapterTitle: chapter.title, page: currentPage, pageUrl: pages[currentPage]?.url });
      showToast('Page bookmarked!', 'success');
    }
  };

  // ── Screenshot / save ────────────────────────────────────────
  const handleScreenshot = async (extended = false) => {
    setSaving(true); setShowSaveMenu(false); setShowUI(false);
    await new Promise((r) => setTimeout(r, 100)); // let UI hide
    try {
      const el    = document.getElementById('reader-content');
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { useCORS: true, allowTaint: true, scale: 2,
        height: extended ? el.scrollHeight : el.clientHeight,
        windowHeight: extended ? el.scrollHeight : el.clientHeight,
        backgroundColor: bgColor,
      });
      const dataUrl = canvas.toDataURL('image/png');
      await saveImageToDevice(dataUrl, `CF_${manga.title}_p${currentPage + 1}.png`);
      showToast('Saved!', 'success');
    } catch { showToast('Failed to save', 'error'); }
    setSaving(false);
  };

  const handleSavePage = async () => {
    setSaving(true); setShowSaveMenu(false);
    try {
      const url = pages[currentPage]?.url;
      if (!url) { showToast('No page to save', 'error'); setSaving(false); return; }
      const res  = await fetch(url.startsWith('blob:') ? url : `https://corsproxy.io/?${encodeURIComponent(url)}`);
      const blob = await res.blob();
      const dataUrl = await blobToBase64(blob);
      await saveImageToDevice(dataUrl, `CF_${manga.title}_p${currentPage + 1}.jpg`);
      showToast('Page saved!', 'success');
    } catch { showToast('Save failed', 'error'); }
    setSaving(false);
  };

  // ── Image filter CSS ─────────────────────────────────────────
  const imgFilter = [
    grayscale   ? 'grayscale(1)' : '',
    invertColor ? 'invert(1)'    : '',
  ].filter(Boolean).join(' ') || 'none';

  const imgStyle = {
    filter:        imgFilter,
    maxWidth:      cropBorders ? 'calc(100% - 16px)' : '100%',
    display:       'block',
  };

  // ── Filtered chapter list ─────────────────────────────────────
  const filteredChapters = chapters.filter((c) =>
    !chapterSearch || c.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  // ── Page number indicator ─────────────────────────────────────
  const pageIndicator = settings.showPageNumber ? (
    <div style={{
      position: 'absolute', bottom: showUI ? 80 : 16, left: '50%',
      transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)',
      color: '#fff', fontSize: '0.78rem', fontWeight: 700,
      padding: '4px 12px', borderRadius: 20, zIndex: 5,
      transition: 'bottom 0.3s ease', pointerEvents: 'none',
    }}>
      Page {currentPage + 1} of {pages.length}
    </div>
  ) : null;

  return (
    <div
      className="reader-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', background: bgColor }}
    >

      {/* ── TOP TOOLBAR ── */}
      <div className={`reader-toolbar ${showUI ? '' : 'hidden'}`}
        style={{ justifyContent: 'space-between', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        {/* Left: back */}
        <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 24, padding: 10, color: '#fff', cursor: 'pointer', display: 'flex' }}>
          <BackIcon />
        </button>

        {/* Center: chapter selector */}
        <button
          onClick={() => setShowChapterList(true)}
          style={{ flex: 1, margin: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 24, padding: '10px 16px', color: '#fff', cursor: 'pointer' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chapter?.title || 'Chapter'}
            </div>
            <div style={{ fontSize: '0.70rem', color: 'rgba(255,255,255,0.6)' }}>
              Chapter {chapters.findIndex((c) => c.id === chapter?.id) + 1} of {chapters.length}
            </div>
          </div>
          <ChevDown />
        </button>

        {/* Right: settings gear */}
        <button onClick={() => setShowSettings(true)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 24, padding: 10, color: '#fff', cursor: 'pointer', display: 'flex' }}>
          <SettingsGear />
        </button>
      </div>

      {/* ── PAGES ── */}
      {isScroll ? (
        <div
          id="reader-content"
          ref={scrollRef}
          style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: pageGap, background: bgColor }}
          onScroll={handleScroll}
        >
          {pages.map((page, i) => (
            <img
              key={i}
              src={page.url}
              alt={`Page ${i + 1}`}
              style={{ ...imgStyle, width: '100%', height: 'auto', flexShrink: 0 }}
              loading={i < 3 ? 'eager' : 'lazy'}
            />
          ))}
          <div style={{ height: 40 }} />
        </div>
      ) : (
        <div
          id="reader-content"
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: bgColor }}
          onDoubleClick={() => settings.doubleTapZoom && setZoom((z) => z === 1 ? 2.5 : 1)}
        >
          {pages[currentPage] && (
            <img
              key={currentPage}
              src={pages[currentPage].url}
              alt={`Page ${currentPage + 1}`}
              style={{ ...imgStyle, maxHeight: '100%', objectFit: 'contain', transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
              onLoad={() => setLoadedPages((p) => ({ ...p, [currentPage]: true }))}
            />
          )}
        </div>
      )}

      {/* Page indicator */}
      {pageIndicator}

      {/* ── BOTTOM BAR (paged mode) ── */}
      {!isScroll && (
        <div className={`reader-bottom-bar ${showUI ? '' : 'hidden'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700, width: 24 }}>
              {currentPage + 1}
            </span>
            <input
              type="range"
              className="reader-slider"
              min={0}
              max={Math.max(0, pages.length - 1)}
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', width: 24, textAlign: 'right' }}>
              {pages.length}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={readingMode === 'rtl' ? nextPage : prevPage}
              style={navBtnStyle}
            >
              {readingMode === 'rtl' ? '←' : '←'} Prev
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={toggleBookmark} style={{ background: 'none', border: 'none', color: isPageBookmarked ? '#b060ff' : 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 6 }}>
                <BookmarkFill filled={isPageBookmarked} />
              </button>
              <button onClick={() => setShowSaveMenu(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 6 }}>
                <CameraIcon />
              </button>
            </div>

            <button
              onClick={readingMode === 'rtl' ? prevPage : nextPage}
              style={navBtnStyle}
            >
              Next {readingMode === 'rtl' ? '→' : '→'}
            </button>
          </div>
        </div>
      )}

      {/* ── CHAPTER LIST PANEL ── */}
      {showChapterList && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200 }}
          onClick={() => setShowChapterList(false)}
        >
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-scrim, #0d0020)', borderRadius: '16px 16px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(155,48,255,0.15)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: '#fff' }}>
                Chapters ({chapters.length})
              </div>
              <button onClick={() => setShowChapterList(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(155,48,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  placeholder="Search chapters..."
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.88rem', flex: 1 }}
                />
              </div>
            </div>

            {/* Chapter list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredChapters.map((ch) => {
                const isCurrent = ch.id === chapter?.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => { setShowChapterList(false); onSelectChapter?.(ch); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', background: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--accent-primary, #9b30ff)' : '#fff' }}>
                      {ch.title}
                    </span>
                    {isCurrent && (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary, #9b30ff)" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── READER SETTINGS PANEL ── */}
      {showSettings && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200 }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-scrim, #0d0020)', borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(155,48,255,0.15)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', fontFamily: 'var(--font-display)' }}>Reader Settings</div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(155,48,255,0.15)' }}>
              {[['mode', 'Reading Mode'], ['general', 'General'], ['filter', 'Color Filter']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSettingsTab(id)}
                  style={{
                    flex: 1, padding: '11px 8px', background: 'none', border: 'none',
                    borderBottom: settingsTab === id ? '2px solid var(--accent-primary, #9b30ff)' : '2px solid transparent',
                    color: settingsTab === id ? 'var(--accent-primary, #9b30ff)' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: settingsTab === id ? 700 : 500,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 0 20px' }}>

              {/* READING MODE TAB */}
              {settingsTab === 'mode' && (
                <div>
                  {/* Layout / Reading direction */}
                  {READING_MODES.map((mode) => (
                    <div
                      key={mode.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                      onClick={() => updateSettings({ defaultReadingMode: mode.id })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 8, background: readingMode === mode.id ? 'rgba(155,48,255,0.25)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                          {mode.icon}
                        </div>
                        <div>
                          <div style={{ color: readingMode === mode.id ? 'var(--accent-primary, #9b30ff)' : '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{mode.label}</div>
                          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>{mode.desc}</div>
                        </div>
                      </div>
                      {readingMode === mode.id && <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary,#9b30ff)" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  ))}

                  <SRow label="Spaced Pages" desc="Add gap between pages (scroll mode)">
                    <SToggle value={settings.pageGap > 0} onChange={(v) => updateSettings({ pageGap: v ? 16 : 0 })} />
                  </SRow>
                  <SRow label="Auto Next Chapter" desc="Jump to next when reaching end">
                    <SToggle value={settings.autoNextChapter} onChange={(v) => updateSettings({ autoNextChapter: v })} />
                  </SRow>
                </div>
              )}

              {/* GENERAL TAB */}
              {settingsTab === 'general' && (
                <div>
                  <SRow label="Background" desc={settings.readerBg === '#ffffff' ? 'White' : settings.readerBg === '#ffffff' ? 'White' : 'Black'}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['#000000', '#1a1a1a', '#ffffff', '#f5f5dc'].map((c) => (
                        <button key={c} onClick={() => updateSettings({ readerBg: c })}
                          style={{ width: 28, height: 28, borderRadius: 6, background: c, border: (settings.readerBg || '#000000') === c ? '2.5px solid #9b30ff' : '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </SRow>
                  <SRow label="Persistent Page Indicator" desc="Always show page number">
                    <SToggle value={settings.showPageNumber} onChange={(v) => updateSettings({ showPageNumber: v })} />
                  </SRow>
                  <SRow label="Crop Borders" desc="Remove white/black page borders">
                    <SToggle value={settings.cropBorders} onChange={(v) => updateSettings({ cropBorders: v })} />
                  </SRow>
                  <SRow label="Keep Screen On" desc="Prevent sleep while reading">
                    <SToggle value={settings.keepScreenOn} onChange={(v) => updateSettings({ keepScreenOn: v })} />
                  </SRow>
                  <SRow label="Double-tap to Zoom">
                    <SToggle value={settings.doubleTapZoom} onChange={(v) => updateSettings({ doubleTapZoom: v })} />
                  </SRow>
                  <SRow label="Long Press to Save" desc="Long-press a page to save or share">
                    <SToggle value={settings.longPressToSave !== false} onChange={(v) => updateSettings({ longPressToSave: v })} />
                  </SRow>
                  <SRow label="Auto Scroll" desc="Automatically advance pages">
                    <SToggle value={settings.autoScroll} onChange={(v) => updateSettings({ autoScroll: v })} />
                  </SRow>
                  <SRow label={`Preload Pages — ${settings.preloadPages || 3}`}>
                    <input type="range" min={1} max={10}
                      value={settings.preloadPages || 3}
                      onChange={(e) => updateSettings({ preloadPages: Number(e.target.value) })}
                      style={{ width: 80 }}
                    />
                  </SRow>
                </div>
              )}

              {/* COLOR FILTER TAB */}
              {settingsTab === 'filter' && (
                <div>
                  <SRow label="Custom Brightness" desc="Override system screen brightness">
                    <SToggle value={settings.customBrightness} onChange={(v) => updateSettings({ customBrightness: v })} />
                  </SRow>
                  {settings.customBrightness && (
                    <div style={{ padding: '8px 16px 14px' }}>
                      <input type="range" min={10} max={100}
                        value={settings.brightness || 100}
                        onChange={(e) => updateSettings({ brightness: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                  <SRow label="Color Filter" desc="Apply a color tint over pages">
                    <SToggle value={settings.colorFilter} onChange={(v) => updateSettings({ colorFilter: v })} />
                  </SRow>
                  <SRow label="Grayscale" desc="Display pages in black & white">
                    <SToggle value={settings.readerGrayscale} onChange={(v) => updateSettings({ readerGrayscale: v })} />
                  </SRow>
                  <SRow label="Invert Colors" desc="Invert all page colors">
                    <SToggle value={settings.readerInvert} onChange={(v) => updateSettings({ readerInvert: v })} />
                  </SRow>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE / SCREENSHOT MENU ── */}
      {showSaveMenu && (
        <div className="modal-overlay" onClick={() => setShowSaveMenu(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title" style={{ color: 'var(--text-primary)' }}>Save & Share</div>
            {[
              { label: '📸 Screenshot (current view)',   action: () => handleScreenshot(false) },
              { label: '📏 Extended screenshot',          action: () => handleScreenshot(true)  },
              { label: '🖼️ Save current page',            action: handleSavePage },
            ].map((item) => (
              <button key={item.label}
                onClick={() => { setShowSaveMenu(false); item.action(); }}
                style={{ width: '100%', padding: '13px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 8, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVING OVERLAY ── */}
      {saving && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32 }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Saving…</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────
function SRow({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 12 }}>
      <div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
        {desc && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function SToggle({ value, onChange }) {
  return (
    <label className="toggle" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

const navBtnStyle = {
  background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: 8,
  padding: '9px 18px', color: '#fff', cursor: 'pointer',
  fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-body)',
};

async function blobToBase64(blob) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}
