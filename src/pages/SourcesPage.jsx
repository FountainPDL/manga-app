import { useState, useRef } from 'react';
import { useStore } from '@store';
import { AllMangaSource, MangaPumaSource, RavenScansSource, LocalSource } from '@sources';

export function SourcesPage({ onOpenManga }) {
  const [tab, setTab] = useState('browse');
  return (
    <div className="page">
      <div className="page-header">
        <span className="page-title">Sources</span>
      </div>
      <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
        <div className="tabs">
          {['browse','extensions','migration'].map((t) => (
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {tab==='browse'     && <BrowseTab     onOpenManga={onOpenManga}/>}
      {tab==='extensions' && <ExtensionsTab/>}
      {tab==='migration'  && <MigrationTab/>}
    </div>
  );
}

/* ─── BROWSE TAB ─────────────────────────────────────────── */
function BrowseTab({ onOpenManga }) {
  const { sources, settings } = useStore();
  const [selectedId, setSelectedId] = useState('allanime');
  const [feed,       setFeed]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [page,       setPage]       = useState(1);

  const builtIns = [AllMangaSource, MangaPumaSource, RavenScansSource, LocalSource];
  const custom   = sources.filter((s) => s.enabled !== false);
  const allSrcs  = [...builtIns, ...custom.map((s)=>({id:s.id,name:s.name,baseUrl:s.url}))];
  const activeSrc= builtIns.find((s)=>s.id===selectedId) || builtIns[0];

  const load = async (reset=true) => {
    setLoading(true); setError(null);
    const p = reset ? 1 : page+1;
    try {
      const res = await activeSrc.browse(p);
      const filtered = settings.show18Plus ? res : res.filter((m)=>!isAdult(m));
      setFeed(reset ? filtered : (prev)=>[...prev,...filtered]);
      setPage(p);
    } catch(e) { setError(e.message||'Failed to load'); }
    setLoading(false);
  };

  useState(()=>{ load(true); },[selectedId]);

  return (
    <div className="page-scroll">
      <div className="page-content">
        {/* Source selector */}
        <div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
          {allSrcs.map((src)=>(
            <button key={src.id} onClick={()=>{setSelectedId(src.id);load(true);}}
              style={{flexShrink:0,padding:'7px 14px',borderRadius:'var(--radius-sm)',
                border:selectedId===src.id?'2px solid var(--accent-primary)':'1px solid var(--border)',
                background:selectedId===src.id?'var(--chip-bg)':'var(--bg-card)',
                color:selectedId===src.id?'var(--accent-primary)':'var(--text-secondary)',
                cursor:'pointer',fontWeight:700,fontSize:'0.82rem',fontFamily:'var(--font-body)'}}>
              {src.name}
            </button>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div className="label-sm">{activeSrc.name} — Latest</div>
          <button className="btn-icon" onClick={()=>load(true)}><RefreshSvg/></button>
        </div>

        {error && (
          <div className="card" style={{padding:14,marginBottom:14,borderColor:'rgba(230,57,70,0.3)'}}>
            <div style={{color:'#e63946',fontWeight:700,fontSize:'0.84rem'}}>Failed to load</div>
            <div style={{color:'var(--text-muted)',fontSize:'0.76rem',marginTop:4}}>{error}</div>
            <button className="btn btn-secondary btn-sm" style={{marginTop:10}} onClick={()=>load(true)}>Retry</button>
          </div>
        )}

        {loading && feed.length===0 && (
          <div className="manga-grid grid-3">
            {[...Array(9)].map((_,i)=>(
              <div key={i}>
                <div className="skeleton" style={{aspectRatio:'2/3',borderRadius:'var(--radius-md)'}}/>
                <div className="skeleton" style={{height:11,marginTop:5,width:'75%'}}/>
              </div>
            ))}
          </div>
        )}

        {feed.length>0 && (
          <>
            <div className="manga-grid grid-3">
              {feed.map((m)=>(
                <div key={m.id} className="manga-card" onClick={()=>onOpenManga(m,activeSrc)}>
                  <img className="manga-card-cover" src={m.cover||placeholder(m.title)} alt={m.title}
                    onError={(e)=>{e.target.src=placeholder(m.title);}} loading="lazy"/>
                  <div className="manga-card-info">
                    <div className="manga-card-title">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost w-full" style={{marginTop:14}} onClick={()=>load(false)} disabled={loading}>
              {loading?<span className="spinner" style={{width:16,height:16}}/>:'Load More'}
            </button>
          </>
        )}

        {!loading && feed.length===0 && !error && (
          <div className="empty-state">
            <GlobeSvg size={40}/>
            <h3>No content</h3>
            <p>This source doesn't support browsing.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── EXTENSIONS TAB ──────────────────────────────────────── */
function ExtensionsTab() {
  const { sources, addSource, updateSource, removeSource, showToast,
          localManga, removeLocalManga, updateSettings, settings } = useStore();
  const [showAdd,   setShowAdd]   = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [showHelp,  setShowHelp]  = useState(false);
  const folderRef  = useRef(null);

  const handleFolderPick = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const count = LocalSource.loadFromFileList(files);
    const rootPath = files[0].webkitRelativePath.split('/')[0];
    updateSettings({ localSourcePath: rootPath });
    showToast(`Local source loaded: ${count} files`, 'success');
    e.target.value = '';
  };

  const builtInCards = [
    { src: AllMangaSource,   color: '#1a3a5c', desc: 'GraphQL API · Manga & Manhwa' },
    { src: MangaPumaSource,  color: '#5c1a1a', desc: 'HTML scraper · Large library' },
    { src: RavenScansSource, color: '#1a4a2e', desc: 'Custom scraper · Scanlations' },
  ];

  return (
    <div className="page-scroll">
      <div className="page-content">

        <div className="label-sm" style={{marginBottom:10}}>Built-in Sources</div>
        {builtInCards.map(({src,color,desc})=>(
          <div key={src.id} className="source-card" style={{marginBottom:8}}>
            <div className="source-icon" style={{background:color}}>{src.name.charAt(0)}</div>
            <div style={{flex:1}}>
              <div className="source-name">{src.name}</div>
              <div className="source-url">{desc}</div>
            </div>
            <span className="chip chip-green">Built-in</span>
          </div>
        ))}

        {/* Local Source */}
        <div className="source-card" style={{marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div className="source-icon" style={{background:'#2d5a1b'}}>L</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="source-name">Local Source</div>
            <div className="source-url truncate">
              {settings.localSourcePath || 'No folder selected'}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={()=>folderRef.current?.click()}>
            📁 Pick Folder
          </button>
          {/* Hidden folder input — webkitdirectory allows folder selection */}
          <input
            ref={folderRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            multiple
            style={{display:'none'}}
            onChange={handleFolderPick}
          />
        </div>

        {/* Local manga list with working remove */}
        {localManga.length > 0 && (
          <>
            <div className="label-sm" style={{marginBottom:10}}>Local Manga ({localManga.length})</div>
            {localManga.map((m)=>(
              <div key={m.id} className="source-card" style={{marginBottom:8}}>
                {m.cover
                  ? <img src={m.cover} style={{width:40,height:56,objectFit:'cover',borderRadius:'var(--radius-sm)',flexShrink:0}} onError={(e)=>{e.target.style.display='none';}}/>
                  : <div className="source-icon" style={{background:'#2d5a1b'}}>{(m.title||'M').charAt(0)}</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div className="source-name truncate">{m.title}</div>
                  <div className="source-url">Local</div>
                </div>
                <button className="btn-icon" style={{color:'var(--accent-secondary)'}}
                  onClick={()=>{ removeLocalManga(m.id); showToast('Removed','info'); }}>
                  <TrashSvg/>
                </button>
              </div>
            ))}
            <div style={{height:12}}/>
          </>
        )}

        {/* Custom sources */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div className="label-sm">Custom Sources</div>
          <div style={{display:'flex',gap:6}}>
            {sources.length>0 && (
              <button className="btn-icon" onClick={()=>setShowHelp(true)}
                style={{fontSize:'0.72rem',fontWeight:800,color:'var(--text-muted)'}}>HELP</button>
            )}
            <button className="btn btn-primary btn-sm" onClick={()=>{setEditing(null);setShowAdd(true);}}>
              + Add
            </button>
          </div>
        </div>

        {sources.length===0 && (
          <div className="card" style={{padding:14,marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:'0.88rem',marginBottom:6}}>💡 Tips</div>
            <p style={{fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.7}}>
              • Enter full URL including https://<br/>
              • Add custom search path if needed (e.g. /search?q=)<br/>
              • Update URL if a site switches domains<br/>
              • Disable without deleting
            </p>
          </div>
        )}

        {sources.map((src)=>(
          <div key={src.id} className="source-card" style={{marginBottom:8,opacity:src.enabled===false?0.5:1}}>
            <div className="source-icon" style={{background:strColor(src.name)}}>{src.name.charAt(0).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="source-name">{src.name}</div>
              <div className="source-url truncate">{src.url}</div>
              {src.is18Plus && <span className="chip chip-red" style={{marginTop:4,fontSize:'0.62rem'}}>18+</span>}
            </div>
            <div style={{display:'flex',gap:2}}>
              <button className="btn-icon" onClick={()=>updateSource(src.id,{enabled:!src.enabled})}>
                {src.enabled===false?<EyeOffSvg/>:<EyeSvg/>}
              </button>
              <button className="btn-icon" onClick={()=>{setEditing(src);setShowAdd(true);}}>
                <EditSvg/>
              </button>
              <button className="btn-icon" style={{color:'var(--accent-secondary)'}}
                onClick={()=>{removeSource(src.id);showToast('Removed','info');}}>
                <TrashSvg/>
              </button>
            </div>
          </div>
        ))}

        <div style={{height:20}}/>
      </div>

      {showAdd && (
        <SourceModal source={editing}
          onSave={(d)=>{
            if(editing){updateSource(editing.id,d);showToast('Updated','success');}
            else{addSource(d);showToast('Added!','success');}
            setShowAdd(false);setEditing(null);
          }}
          onClose={()=>{setShowAdd(false);setEditing(null);}}/>
      )}
      {showHelp && (
        <div className="modal-overlay" onClick={()=>setShowHelp(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">Tips</div>
            <p style={{fontSize:'0.82rem',color:'var(--text-muted)',lineHeight:1.7}}>
              • Full URL including https://<br/>
              • Custom search path: /search?q= or /?s=<br/>
              • Update URL if site switches domains<br/>
              • Disable sources without deleting
            </p>
            <button className="btn btn-ghost w-full" style={{marginTop:16}} onClick={()=>setShowHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MIGRATION TAB ───────────────────────────────────────── */
function MigrationTab() {
  const { library, sources, showToast, updateLibraryManga } = useStore();
  const [selected,  setSelected]  = useState(null);
  const [targetId,  setTargetId]  = useState('');
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);

  const builtIns = [AllMangaSource, MangaPumaSource, RavenScansSource];
  const allSrcs  = [...builtIns, ...sources.filter((s)=>s.enabled!==false)];

  const doSearch = async () => {
    if (!selected||!targetId) return;
    setLoading(true);
    try {
      const src = builtIns.find((s)=>s.id===targetId);
      if (!src) return;
      const res = await src.search(selected.title);
      setResults(res.slice(0,8));
    } catch { showToast('Search failed','error'); }
    setLoading(false);
  };

  const doMigrate = (newM) => {
    updateLibraryManga(selected.id,{...newM,id:selected.id,categories:selected.categories,addedAt:selected.addedAt});
    showToast(`Migrated to ${newM.sourceName}`,'success');
    setSelected(null);setResults([]);
  };

  return (
    <div className="page-scroll">
      <div className="page-content">
        <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:14,lineHeight:1.6}}>
          Move manga between sources while keeping progress, categories and bookmarks.
        </div>

        {library.length===0 ? (
          <div className="empty-state"><h3>Library is empty</h3></div>
        ) : (
          <>
            <div className="label-sm" style={{marginBottom:10}}>1. Select manga</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
              {library.map((m)=>(
                <button key={m.id} onClick={()=>{setSelected(m);setResults([]);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
                    background:selected?.id===m.id?'var(--chip-bg)':'var(--bg-card)',
                    border:selected?.id===m.id?'2px solid var(--accent-primary)':'1px solid var(--border)',
                    borderRadius:'var(--radius-md)',cursor:'pointer',textAlign:'left',width:'100%'}}>
                  <img src={m.cover||placeholder(m.title)} style={{width:38,height:52,objectFit:'cover',borderRadius:4,flexShrink:0}}
                    onError={(e)=>{e.target.src=placeholder(m.title);}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'0.86rem',color:selected?.id===m.id?'var(--accent-primary)':'var(--text-primary)'}} className="truncate">{m.title}</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>{m.sourceName||'Unknown'}</div>
                  </div>
                  {selected?.id===m.id && <span style={{color:'var(--accent-primary)'}}>✓</span>}
                </button>
              ))}
            </div>

            {selected && (
              <>
                <div className="label-sm" style={{marginBottom:10}}>2. Pick target source</div>
                <select className="input" value={targetId} onChange={(e)=>setTargetId(e.target.value)} style={{marginBottom:10}}>
                  <option value="">Select source…</option>
                  {allSrcs.filter((s)=>s.id!==selected.sourceId).map((s)=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button className="btn btn-primary w-full" disabled={!targetId||loading} onClick={doSearch} style={{marginBottom:16}}>
                  {loading?<span className="spinner" style={{width:16,height:16}}/>:'Search for match'}
                </button>

                {results.length>0 && (
                  <>
                    <div className="label-sm" style={{marginBottom:10}}>3. Select match</div>
                    {results.map((r)=>(
                      <div key={r.id} className="manga-card list-card" style={{marginBottom:8,cursor:'pointer'}} onClick={()=>doMigrate(r)}>
                        <img className="manga-card-cover" src={r.cover||placeholder(r.title)} onError={(e)=>{e.target.src=placeholder(r.title);}}/>
                        <div className="manga-card-info">
                          <div className="manga-card-title">{r.title}</div>
                          <div className="manga-card-sub">{r.sourceName}</div>
                          <button className="btn btn-primary btn-sm" style={{marginTop:6}}>Migrate here</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── SOURCE MODAL ────────────────────────────────────────── */
function SourceModal({ source, onSave, onClose }) {
  const [name,       setName]       = useState(source?.name||'');
  const [url,        setUrl]        = useState(source?.url||'');
  const [searchPath, setSearchPath] = useState(source?.searchPath||'');
  const [is18Plus,   setIs18Plus]   = useState(source?.is18Plus||false);

  const save = () => {
    if (!name.trim()||!url.trim()) return;
    let u = url.trim();
    if (!u.startsWith('http')) u = 'https://'+u;
    onSave({ name:name.trim(), url:u.replace(/\/$/,''), searchPath:searchPath.trim(), is18Plus, enabled:true });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-title">{source?'Edit Source':'Add Source'}</div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.5px'}}>Name *</div>
            <input className="input" placeholder="e.g. MangaDex" value={name} onChange={(e)=>setName(e.target.value)}/>
          </div>
          <div>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.5px'}}>Website URL *</div>
            <input className="input" placeholder="https://example.com" value={url} onChange={(e)=>setUrl(e.target.value)} type="url" inputMode="url"/>
          </div>
          <div>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.5px'}}>Search Path (optional)</div>
            <input className="input" placeholder="/search?q=" value={searchPath} onChange={(e)=>setSearchPath(e.target.value)}/>
            <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:4}}>Leave blank to auto-detect</div>
          </div>
          <div className="settings-row" style={{paddingTop:4,paddingBottom:4}}>
            <div className="settings-row-info">
              <div className="settings-row-label">18+ Content</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={is18Plus} onChange={(e)=>setIs18Plus(e.target.checked)}/>
              <span className="toggle-slider"/>
            </label>
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{flex:2}} onClick={save} disabled={!name.trim()||!url.trim()}>
            {source?'Update':'Add Source'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */
const isAdult = (m) => ['hentai','adult','ecchi','mature','nsfw','erotica'].some((k)=>(m.title||'').toLowerCase().includes(k)||(m.genres||[]).some((g)=>g.toLowerCase()===k));
const strColor= (s) => { let h=0; for(let i=0;i<s.length;i++)h=s.charCodeAt(i)+((h<<5)-h); return ['#8b2fc9','#c0392b','#2980b9','#27ae60','#d35400','#8e44ad'][Math.abs(h)%6]; };
const placeholder=(t)=>`https://via.placeholder.com/120x180/160030/9b30ff?text=${encodeURIComponent((t||'M').charAt(0))}`;

const GlobeSvg = ({size=40})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const RefreshSvg=()=><svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const TrashSvg=()=><svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const EditSvg=()=><svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const EyeSvg=()=><svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffSvg=()=><svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
