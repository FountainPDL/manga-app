import { useState, useEffect } from 'react';
import { useStore } from './store/index.js';
import { LibraryPage }     from './pages/LibraryPage.jsx';
import { SearchPage }      from './pages/SearchPage.jsx';
import { SourcesPage }     from './pages/SourcesPage.jsx';
import { UpdatesPage }     from './pages/UpdatesPage.jsx';
import { SettingsPage }    from './pages/SettingsPage.jsx';
import { MangaDetailPage } from './pages/MangaDetailPage.jsx';
import { ToastContainer }  from './components/common/Toast.jsx';
import { SplashScreen }    from './components/common/SplashScreen.jsx';
import './styles/globals.css';

const TABS = [
  { id:'library',  label:'Library',  icon:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { id:'search',   label:'Search',   icon:'M21 21l-4.35-4.35 M11 19A8 8 0 1 0 11 3a8 8 0 0 0 0 16z', circle:true },
  { id:'sources',  label:'Sources',  icon:'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z' },
  { id:'updates',  label:'Updates',  icon:'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' },
  { id:'settings', label:'Settings', icon:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
];

export default function App() {
  const { settings, activeTab, setActiveTab } = useStore();
  const [selectedManga,  setSelectedManga]  = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [splashDone,     setSplashDone]     = useState(false);

  // ── Apply theme (clear ALL vars first to prevent bleeding) ──────
  useEffect(() => {
    const html = document.documentElement;
    const s    = html.style;

    // 1. Set global mode
    html.setAttribute('data-theme', settings.theme || 'dark');

    // 2. ALWAYS clear every sub-theme var before applying new one
    [
      '--accent-primary','--accent-secondary','--accent-glow',
      '--solid-color','--solid-color2','--solid-rgb',
      '--shift-speed','--shift-degrees',
      '--wallpaper-accent','--wallpaper-accent2','--wallpaper-rgb',
    ].forEach((v) => s.removeProperty(v));
    html.removeAttribute('data-sub');

    const sub = settings.subTheme || '';
    if (!sub) return;

    html.setAttribute('data-sub', sub);

    if (sub === 'solid') {
      const hex  = settings.solidColor  || '#9b30ff';
      const hex2 = settings.solidColor2 || '#e63946';
      const rgb  = toRgb(hex);
      s.setProperty('--solid-color',      hex);
      s.setProperty('--solid-color2',     hex2);
      s.setProperty('--solid-rgb',        rgb);
      s.setProperty('--accent-primary',   hex);
      s.setProperty('--accent-secondary', hex2);
      s.setProperty('--accent-glow',      `rgba(${rgb},0.30)`);
    }

    if (sub === 'dual-shift') {
      const hex = settings.shiftColor1 || '#9b30ff';
      const rgb = toRgb(hex);
      s.setProperty('--shift-speed',      `${settings.shiftSpeed||8}s`);
      s.setProperty('--shift-degrees',    `${settings.shiftDegrees||45}deg`);
      s.setProperty('--accent-primary',   hex);
      s.setProperty('--accent-secondary', settings.shiftColor2||'#e63946');
      s.setProperty('--accent-glow',      `rgba(${rgb},0.30)`);
    }

    if (sub === 'dynamic') applyDynamic(s);
  }, [
    settings.theme, settings.subTheme,
    settings.solidColor, settings.solidColor2,
    settings.shiftColor1, settings.shiftColor2,
    settings.shiftSpeed, settings.shiftDegrees,
  ]);

  // ── Wake lock ───────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.keepScreenOn) return;
    let wl = null;
    const get = () => navigator.wakeLock?.request('screen').then((l)=>{wl=l;}).catch(()=>{});
    get();
    document.addEventListener('visibilitychange', get);
    return () => { document.removeEventListener('visibilitychange', get); wl?.release(); };
  }, [settings.keepScreenOn]);

  // ── Global back button handler ──────────────────────────────────
  // Intercepts Android back press and dispatches custom event.
  // MangaDetailPage and MangaReader each listen for this event
  // and handle navigation themselves before it bubbles to OS.
  useEffect(() => {
    // Capacitor App plugin back button
    let capListener = null;
    if (window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => {
        // Dispatch event — detail pages catch it first
        const handled = window.dispatchEvent(
          new CustomEvent('comifountain:backpress', { cancelable: true })
        );
        // If nobody cancelled it (no detail page open), handle tab navigation
        if (handled && !selectedManga) {
          if (activeTab !== 'library') {
            setActiveTab('library');
          }
          // If already on library, let Android handle it (minimize app)
        }
      }).then((l) => { capListener = l; });
    }
    return () => { capListener?.remove(); };
  }, [selectedManga, activeTab]);

  // ── Permissions on first launch ─────────────────────────────────
  useEffect(() => {
    if (!splashDone) return;
    try {
      window.Capacitor?.Plugins?.Filesystem?.requestPermissions?.();
    } catch { /* ignore */ }
  }, [splashDone]);

  const openManga  = (manga, src=null) => { setSelectedManga(manga); setSelectedSource(src); };
  const closeManga = () => { setSelectedManga(null); setSelectedSource(null); };

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  if (selectedManga) {
    return (
      <>
        <MangaDetailPage manga={selectedManga} source={selectedSource} onBack={closeManga} />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
        {activeTab==='library'  && <LibraryPage  onOpenManga={openManga} />}
        {activeTab==='search'   && <SearchPage   onOpenManga={(m) => {
          const src = useStore.getState().sources.find((s)=>s.id===m.sourceId);
          openManga(m, src||null);
        }} />}
        {activeTab==='sources'  && <SourcesPage  onOpenManga={openManga} />}
        {activeTab==='updates'  && <UpdatesPage  onOpenManga={openManga} />}
        {activeTab==='settings' && <SettingsPage onLocalMangaAdded={()=>setActiveTab('library')} />}
      </div>

      <nav className="bottom-nav">
        {TABS.map(({ id, label, icon, circle }) => (
          <button
            key={id}
            className={`nav-item ${activeTab===id?'active':''}`}
            onClick={() => setActiveTab(id)}
          >
            <svg width={21} height={21} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon}/>
              {circle && <circle cx="11" cy="11" r="8"/>}
            </svg>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <ToastContainer />
    </>
  );
}

function toRgb(hex) {
  const h = hex.replace('#','');
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

async function applyDynamic(style) {
  // Try CSS AccentColor keyword (works on some Android browsers)
  try {
    const el = document.createElement('div');
    el.style.color = 'AccentColor';
    document.body.appendChild(el);
    const c = getComputedStyle(el).color;
    document.body.removeChild(el);
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m && !(m[1]==='0'&&m[2]==='0'&&m[3]==='0')) {
      const hex = `#${(+m[1]).toString(16).padStart(2,'0')}${(+m[2]).toString(16).padStart(2,'0')}${(+m[3]).toString(16).padStart(2,'0')}`;
      const rgb = `${m[1]},${m[2]},${m[3]}`;
      style.setProperty('--wallpaper-accent', hex);
      style.setProperty('--wallpaper-rgb',    rgb);
      style.setProperty('--accent-primary',   hex);
      style.setProperty('--accent-glow',      `rgba(${rgb},0.30)`);
      return;
    }
  } catch { /* fallthrough */ }

  // Time-of-day fallback
  const hour   = new Date().getHours();
  const palette= [
    {hex:'#9b30ff',rgb:'155,48,255'},
    {hex:'#e63946',rgb:'230,57,70'},
    {hex:'#2563eb',rgb:'37,99,235'},
    {hex:'#16a34a',rgb:'22,163,74'},
    {hex:'#ea580c',rgb:'234,88,12'},
    {hex:'#db2777',rgb:'219,39,119'},
    {hex:'#4f46e5',rgb:'79,70,229'},
  ];
  const c = palette[Math.floor(hour / (24/palette.length))];
  style.setProperty('--wallpaper-accent', c.hex);
  style.setProperty('--wallpaper-rgb',    c.rgb);
  style.setProperty('--accent-primary',   c.hex);
  style.setProperty('--accent-glow',      `rgba(${c.rgb},0.30)`);
}
