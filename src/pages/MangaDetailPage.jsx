import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@store';
import { getSource, LocalSource } from '@sources';
import { downloadChapter } from '@utils/screenshot';
import { MangaReader } from '@components/reader/MangaReader';

export function MangaDetailPage({ manga: init, source: srcProp, onBack }) {
  const {
    addToLibrary, removeFromLibrary, isInLibrary, library,
    progress, downloads, addDownload, isDownloaded,
    categories, showToast, settings, bookmarks,
    markChapterRead, markChapterUnread,
  } = useStore();

  const [manga,          setManga]          = useState(init);
  const [chapters,       setChapters]       = useState(init?.chapters||[]);
  const [loading,        setLoading]        = useState(false);
  const [readChapter,    setReadChapter]    = useState(null);
  const [pages,          setPages]          = useState([]);
  const [loadingPages,   setLoadingPages]   = useState(false);
  const [showAll,        setShowAll]        = useState(false);
  const [sortDesc,       setSortDesc]       = useState(true);
  const [dlId,           setDlId]           = useState(null);
  const [showCatPicker,  setShowCatPicker]  = useState(false);
  const [selCats,        setSelCats]        = useState([]);

  const source = srcProp || getSource(manga?.sourceId);
  const inLib  = isInLibrary(manga?.id);
  const prog   = progress[manga?.id];

  // Handle hardware back button
  useEffect(() => {
    const handler = () => {
      if (readChapter) { setReadChapter(null); }
      else { onBack(); }
    };
    window.addEventListener('comifountain:backpress', handler);

    // Capacitor back button
    let capListener = null;
    if (window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('backButton', handler)
        .then((l) => { capListener = l; });
    }
    return () => {
      window.removeEventListener('comifountain:backpress', handler);
      capListener?.remove();
    };
  }, [readChapter, onBack]);

  // Load details on mount
  useEffect(() => {
    if (source && manga?.id && (!manga.description && !chapters.length)) {
      loadDetails();
    }
  }, [manga?.id]);

  const loadDetails = async () => {
    if (!source?.getMangaDetails) return;
    setLoading(true);
    try {
      const det = await source.getMangaDetails(manga.id);
      if (det) {
        setManga((p) => ({ ...p, ...det }));
        setChapters(det.chapters || []);
      }
    } catch (e) { showToast('Failed to load details', 'error'); }
    setLoading(false);
  };

  // Open chapter to read
  const openChapter = async (ch) => {
    setLoadingPages(true);
    try {
      let chPages = [];

      // Check if downloaded first
      if (isDownloaded(manga.id, ch.id)) {
        const dl = downloads.find((d) => d.mangaId===manga.id && d.chapterId===ch.id);
        chPages  = dl?.pages || [];
      } else if (source?.getPageList) {
        chPages = await source.getPageList(manga.id, ch.number||ch.id);
      }

      if (!chPages.length) {
        showToast('No pages found — check source', 'error');
        setLoadingPages(false);
        return;
      }
      setPages(chPages);
      setReadChapter(ch);
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    }
    setLoadingPages(false);
  };

  const continueReading = () => {
    const all = [...chapters].reverse();
    if (!prog?.lastChapterId) { if (all[0]) openChapter(all[0]); return; }
    const ch = chapters.find((c) => c.id===prog.lastChapterId);
    if (ch) openChapter(ch);
  };

  // Download
  const downloadCh = async (ch) => {
    if (isDownloaded(manga.id, ch.id)) { showToast('Already downloaded','info'); return; }
    setDlId(ch.id);
    try {
      const chPages = await source.getPageList(manga.id, ch.number||ch.id);
      if (!chPages.length) { showToast('Nothing to download','error'); setDlId(null); return; }
      await downloadChapter(ch, chPages, manga.title, settings.downloadQuality||'high', ()=>{});
      addDownload({ mangaId:manga.id, mangaTitle:manga.title, chapterId:ch.id, chapterTitle:ch.title, pages:chPages, quality:settings.downloadQuality });
      showToast(`${ch.title} downloaded!`,'success');
    } catch { showToast('Download failed','error'); }
    setDlId(null);
  };

  // Library toggle
  const toggleLib = () => {
    if (inLib) { removeFromLibrary(manga.id); showToast('Removed from library','info'); }
    else if (categories.length > 0) { setSelCats([]); setShowCatPicker(true); }
    else { addToLibrary(manga,[]); showToast('Added to library!','success'); }
  };

  const confirmAdd = () => {
    addToLibrary(manga, selCats);
    showToast('Added to library!','success');
    setShowCatPicker(false);
  };

  // Sorted + paginated chapters
  const sorted  = sortDesc ? [...chapters] : [...chapters].reverse();
  const visible = showAll ? sorted : sorted.slice(0, 40);

  const readCount  = prog ? Object.values(prog).filter((v)=>typeof v==='object'&&v.completed).length : 0;
  const progPct    = chapters.length ? Math.min(100,Math.round((readCount/chapters.length)*100)) : 0;
  const chBookmarks= (useStore.getState().bookmarks||[]).filter((b)=>b.mangaId===manga?.id);

  // ── READER ──────────────────────────────────────────────────────
  if (readChapter) {
    const idx = chapters.findIndex((c)=>c.id===readChapter.id);
    return (
      <MangaReader
        manga={manga} chapter={readChapter} pages={pages} chapters={chapters}
        onClose={()=>{ if (source?.isLocal) LocalSource.revokePages(pages); setReadChapter(null); }}
        onNextChapter={()=>{ const n=chapters[idx-1]; n?openChapter(n):showToast('No more chapters','info'); }}
        onPrevChapter={()=>{ const p=chapters[idx+1]; p?openChapter(p):showToast('First chapter','info'); }}
        onSelectChapter={(ch)=>openChapter(ch)}
      />
    );
  }

  const ph = (t) => `https://via.placeholder.com/120x180/160030/9b30ff?text=${encodeURIComponent((t||'M').charAt(0))}`;

  return (
    <div className="page">
      {/* Loading overlay */}
      {loadingPages && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:500,gap:12}}>
          <div className="spinner" style={{width:36,height:36}}/>
          <div style={{color:'#fff',fontWeight:700,fontSize:'0.88rem'}}>Loading chapter…</div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackSvg/></button>
        <span className="page-title truncate" style={{fontSize:'1.05rem'}}>{manga?.title}</span>
        <button className="btn-icon" style={{color:inLib?'#e63946':'var(--text-secondary)'}} onClick={toggleLib}>
          <HeartSvg filled={inLib}/>
        </button>
      </div>

      <div className="page-scroll">
        {/* Cover + info */}
        <div style={{display:'flex',gap:14,padding:'14px 14px 0'}}>
          <img src={manga?.cover||ph(manga?.title)} alt={manga?.title}
            style={{width:108,height:154,objectFit:'cover',borderRadius:'var(--radius-md)',flexShrink:0,border:'1px solid var(--border)'}}
            onError={(e)=>{e.target.src=ph(manga?.title);}}/>
          <div style={{flex:1,minWidth:0}}>
            <h3 style={{fontSize:'1.05rem',lineHeight:1.3,marginBottom:5}}>{manga?.title}</h3>
            {manga?.author&&<div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:6}}>{manga.author}</div>}
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:6}}>
              {manga?.status&&<span className="chip chip-gray">{manga.status}</span>}
              {manga?.sourceName&&<span className="chip">{manga.sourceName}</span>}
              {manga?.local&&<span className="chip chip-gray">Local</span>}
            </div>
            {manga?.genres?.slice(0,4).map((g)=>(
              <span key={g} className="chip chip-gray" style={{marginRight:4,marginBottom:4,fontSize:'0.62rem'}}>{g}</span>
            ))}
            <div style={{marginTop:6,fontSize:'0.74rem',color:'var(--text-muted)'}}>{chapters.length} chapters</div>
          </div>
        </div>

        {/* Description */}
        {manga?.description&&(
          <div style={{padding:'10px 14px'}}>
            <p style={{fontSize:'0.80rem',color:'var(--text-secondary)',lineHeight:1.65}}>
              {manga.description.slice(0,300)}{manga.description.length>300?'…':''}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{padding:'0 14px 12px',display:'flex',gap:8}}>
          <button className="btn btn-primary" style={{flex:2}} onClick={continueReading} disabled={!chapters.length}>
            {prog?.lastChapterId?'▶ Continue':'▶ Start Reading'}
          </button>
          <button className="btn btn-secondary" onClick={loadDetails} disabled={loading}>
            <RefreshSvg/>
          </button>
        </div>

        {/* Progress */}
        {progPct>0&&(
          <div style={{padding:'0 14px 12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:4}}>
              <span>Progress</span><span>{readCount}/{chapters.length}</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{width:`${progPct}%`}}/></div>
          </div>
        )}

        {/* Bookmarks */}
        {chBookmarks.length>0&&(
          <div style={{padding:'0 14px 12px'}}>
            <div className="label-sm" style={{marginBottom:8}}>Bookmarks</div>
            <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:4}}>
              {chBookmarks.map((bm)=>(
                <button key={bm.id}
                  onClick={()=>{const ch=chapters.find((c)=>c.id===bm.chapterId);if(ch)openChapter(ch);}}
                  style={{flexShrink:0,padding:'6px 11px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',background:'var(--bg-card)',cursor:'pointer',fontSize:'0.76rem',fontWeight:600,color:'var(--text-primary)',fontFamily:'var(--font-body)'}}>
                  {bm.chapterTitle} p.{bm.page+1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chapter list */}
        <div style={{padding:'0 14px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div className="label-sm">Chapters</div>
            <button className="btn-icon" onClick={()=>setSortDesc((v)=>!v)}
              style={{fontSize:'0.74rem',color:'var(--text-muted)',fontWeight:700}}>
              {sortDesc?'↓ Newest':'↑ Oldest'}
            </button>
          </div>

          {loading&&[...Array(5)].map((_,i)=>(
            <div key={i} className="skeleton" style={{height:46,borderRadius:'var(--radius-sm)',marginBottom:6}}/>
          ))}

          {!loading&&chapters.length===0&&(
            <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:'0.84rem'}}>No chapters found</div>
          )}

          {visible.map((ch)=>{
            const isRead = prog?.[ch.id]?.completed;
            const isDl   = isDownloaded(manga?.id, ch.id);
            const isDling= dlId===ch.id;
            return (
              <div key={ch.id} className={`chapter-item ${isRead?'read':''}`} onClick={()=>openChapter(ch)}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="chapter-title truncate">{ch.title}</div>
                  {ch.date&&<div className="chapter-date">{ch.date}</div>}
                </div>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  {isRead&&<span style={{color:'var(--accent-primary)',fontSize:'0.7rem',fontWeight:800}}>✓</span>}
                  <button className="btn-icon" style={{padding:5}}
                    title={isRead?'Mark unread':'Mark read'}
                    onClick={(e)=>{e.stopPropagation();isRead?markChapterUnread(manga.id,ch.id):markChapterRead(manga.id,ch.id);}}>
                    <span style={{fontSize:'0.62rem',fontWeight:800,color:isRead?'var(--accent-primary)':'var(--text-muted)'}}>
                      {isRead?'READ':'UNREAD'}
                    </span>
                  </button>
                  <button className="btn-icon" style={{padding:5}}
                    onClick={(e)=>{e.stopPropagation();downloadCh(ch);}}>
                    {isDling
                      ?<span className="spinner" style={{width:15,height:15}}/>
                      :<DlSvg color={isDl?'var(--accent-primary)':'var(--text-muted)'}/>}
                  </button>
                </div>
              </div>
            );
          })}

          {chapters.length>40&&!showAll&&(
            <button className="btn btn-ghost w-full" style={{marginTop:10}} onClick={()=>setShowAll(true)}>
              Show all {chapters.length} chapters ↓
            </button>
          )}
          <div style={{height:24}}/>
        </div>
      </div>

      {/* Category picker */}
      {showCatPicker&&(
        <div className="modal-overlay" onClick={()=>setShowCatPicker(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">Add to Library</div>
            <div style={{fontSize:'0.80rem',color:'var(--text-muted)',marginBottom:14}}>Select categories (optional):</div>
            {categories.map((cat)=>{
              const on=selCats.includes(cat.id);
              return (
                <button key={cat.id}
                  onClick={()=>setSelCats((p)=>on?p.filter((x)=>x!==cat.id):[...p,cat.id])}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 12px',marginBottom:6,
                    background:on?'var(--chip-bg)':'var(--bg-card)',border:on?'2px solid var(--accent-primary)':'1px solid var(--border)',
                    borderRadius:'var(--radius-md)',cursor:'pointer',fontWeight:700,fontSize:'0.88rem',
                    color:on?'var(--accent-primary)':'var(--text-primary)',fontFamily:'var(--font-body)'}}>
                  {cat.name}
                  {on&&<span>✓</span>}
                </button>
              );
            })}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setShowCatPicker(false)}>Cancel</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={confirmAdd}>Add to Library</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const BackSvg=()=><svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const HeartSvg=({filled})=><svg width={20} height={20} viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const RefreshSvg=()=><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const DlSvg=({color})=><svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
