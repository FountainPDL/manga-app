import { useRef, useState } from 'react';
import { useStore } from '@store';
import {
  TrashIcon, BackupIcon, RestoreIcon, FolderIcon,
  SunIcon, MoonIcon, ChevronRightIcon,
} from '@components/common/Icons';

// ── Preset accent colors ──────────────────────────────────────────
const COLORS = [
  { name: 'Purple',  hex: '#9b30ff' },
  { name: 'Red',     hex: '#e63946' },
  { name: 'Blue',    hex: '#2563eb' },
  { name: 'Green',   hex: '#16a34a' },
  { name: 'Orange',  hex: '#ea580c' },
  { name: 'Pink',    hex: '#db2777' },
  { name: 'Teal',    hex: '#0d9488' },
  { name: 'Indigo',  hex: '#4f46e5' },
  { name: 'Yellow',  hex: '#ca8a04' },
  { name: 'Rose',    hex: '#f43f5e' },
];

const READING_MODES = [
  { id: 'rtl',      label: 'Right to Left (Default)' },
  { id: 'ltr',      label: 'Left to Right' },
  { id: 'webtoon',  label: 'Webtoon (Continuous)' },
  { id: 'vertical', label: 'Vertical with Gaps' },
];

const QUALITIES = [
  { id: 'low',      label: 'Low  — smallest files' },
  { id: 'medium',   label: 'Medium' },
  { id: 'high',     label: 'High  (default)' },
  { id: 'original', label: 'Original — largest' },
];

const REFRESH_OPTIONS = [
  { id: 'never',   label: 'Never' },
  { id: 'hourly',  label: 'Every hour' },
  { id: 'daily',   label: 'Daily' },
  { id: 'weekly',  label: 'Weekly' },
];

export function SettingsPage({ onLocalMangaAdded }) {
  const {
    settings, updateSettings,
    library, history, downloads, categories,
    clearHistory, clearDownloads,
    addLocalManga, exportBackup, importBackup, showToast,
  } = useStore();

  const backupRef  = useRef(null);
  const [section, setSection] = useState(null); // null = main list

  // ── Section renderers ─────────────────────────────────────────

  if (section === 'appearance') return (
    <AppearanceSection
      settings={settings}
      updateSettings={updateSettings}
      onBack={() => setSection(null)}
    />
  );

  if (section === 'reader') return (
    <ReaderSection
      settings={settings}
      updateSettings={updateSettings}
      onBack={() => setSection(null)}
    />
  );

  if (section === 'downloads') return (
    <DownloadsSection
      settings={settings}
      updateSettings={updateSettings}
      downloads={downloads}
      clearDownloads={clearDownloads}
      showToast={showToast}
      onBack={() => setSection(null)}
    />
  );

  if (section === 'library-settings') return (
    <LibrarySection
      settings={settings}
      updateSettings={updateSettings}
      categories={categories}
      showToast={showToast}
      onLocalMangaAdded={onLocalMangaAdded}
      addLocalManga={addLocalManga}
      onBack={() => setSection(null)}
    />
  );

  if (section === 'updates') return (
    <UpdatesSection
      settings={settings}
      updateSettings={updateSettings}
      onBack={() => setSection(null)}
    />
  );

  if (section === 'data') return (
    <DataSection
      library={library}
      history={history}
      downloads={downloads}
      categories={categories}
      clearHistory={clearHistory}
      exportBackup={exportBackup}
      importBackup={importBackup}
      backupRef={backupRef}
      showToast={showToast}
      onBack={() => setSection(null)}
    />
  );

  // ── Main settings list (Mihon order) ──────────────────────────
  const rows = [
    { id: 'appearance',       emoji: '🎨', title: 'Appearance',        desc: 'Theme, colors, dark mode' },
    { id: 'library-settings', emoji: '📚', title: 'Library',           desc: 'Categories, update settings' },
    { id: 'reader',           emoji: '📖', title: 'Reader',            desc: 'Reading mode, display, navigation' },
    { id: 'downloads',        emoji: '⬇️',  title: 'Downloads',         desc: 'Quality, location, auto-download' },
    { id: 'updates',          emoji: '🔄', title: 'Updates',           desc: 'Scheduled refresh, refresh on open' },
    { id: 'data',             emoji: '💾', title: 'Data & Storage',    desc: 'Backup, restore, clear history' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-title">Settings</span>
      </div>

      <div className="page-scroll">
        <div className="page-content">
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => setSection(row.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', marginBottom: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                textAlign: 'left', transition: 'border-color 0.16s ease',
              }}
            >
              <span style={{ fontSize: '1.4rem', width: 32, textAlign: 'center' }}>{row.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {row.title}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {row.desc}
                </div>
              </div>
              <ChevronRightIcon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ))}

          {/* About */}
          <div className="settings-section" style={{ marginTop: 8 }}>
            <div className="settings-section-header">About</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">ComiFountain</div>
                <div className="settings-row-desc">Version 1.0.0</div>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Library</div>
                <div className="settings-row-desc">{library.length} manga</div>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Downloads</div>
                <div className="settings-row-desc">{downloads.length} chapters saved</div>
              </div>
            </div>
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

// ── APPEARANCE SECTION ────────────────────────────────────────────
function AppearanceSection({ settings, updateSettings, onBack }) {
  const subTheme = settings.subTheme || '';

  const globalOptions = [
    { id: 'light',  label: 'Light',  icon: '☀️' },
    { id: 'dark',   label: 'Dark',   icon: '🌙' },
    { id: 'amoled', label: 'AMOLED', icon: '⬛' },
  ];

  const subOptions = [
    { id: '',           label: 'Default',    desc: 'Purple & Red defaults' },
    { id: 'solid',      label: 'Solid',      desc: 'One base color of your choice' },
    { id: 'dual-shift', label: 'Dual Shift', desc: 'Slowly cycles between two colors' },
    { id: 'dynamic',    label: 'Dynamic',    desc: 'Reacts to wallpaper / Material You' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackIcon /></button>
        <span className="page-title">Appearance</span>
      </div>

      <div className="page-scroll">
        <div className="page-content">

          {/* Global mode */}
          <SectionLabel>Color Mode</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {globalOptions.map((opt) => (
              <ThemeBtn
                key={opt.id}
                label={opt.label}
                icon={opt.icon}
                active={settings.theme === opt.id}
                onClick={() => updateSettings({ theme: opt.id })}
              />
            ))}
          </div>

          {/* Sub-theme */}
          <SectionLabel>Color Theme</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {subOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => updateSettings({ subTheme: opt.id })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: subTheme === opt.id ? 'var(--chip-bg)' : 'var(--bg-card)',
                  border: subTheme === opt.id ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: subTheme === opt.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {opt.desc}
                  </div>
                </div>
                {subTheme === opt.id && (
                  <span style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Solid options */}
          {subTheme === 'solid' && (
            <>
              <SectionLabel>Primary Color</SectionLabel>
              <ColorPicker
                value={settings.solidColor || '#9b30ff'}
                onChange={(hex) => updateSettings({ solidColor: hex })}
              />
              <SectionLabel style={{ marginTop: 16 }}>Secondary Color</SectionLabel>
              <ColorPicker
                value={settings.solidColor2 || '#e63946'}
                onChange={(hex) => updateSettings({ solidColor2: hex })}
              />
            </>
          )}

          {/* Dual-shift options */}
          {subTheme === 'dual-shift' && (
            <>
              <SectionLabel>Color A</SectionLabel>
              <ColorPicker
                value={settings.shiftColor1 || '#9b30ff'}
                onChange={(hex) => updateSettings({ shiftColor1: hex })}
              />
              <SectionLabel style={{ marginTop: 16 }}>Color B</SectionLabel>
              <ColorPicker
                value={settings.shiftColor2 || '#e63946'}
                onChange={(hex) => updateSettings({ shiftColor2: hex })}
              />
              <div className="settings-section" style={{ marginTop: 16 }}>
                <div className="settings-row" style={{ borderBottom: 'none' }}>
                  <div className="settings-row-info">
                    <div className="settings-row-label">Shift Speed</div>
                    <div className="settings-row-desc">{settings.shiftSpeed || 8}s cycle</div>
                  </div>
                  <input
                    type="range" min={2} max={30} step={1}
                    value={settings.shiftSpeed || 8}
                    onChange={(e) => updateSettings({ shiftSpeed: Number(e.target.value) })}
                    style={{ width: 100 }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Dynamic info */}
          {subTheme === 'dynamic' && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                🖼️ Wallpaper Colors
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                On Android 12+, the app reads your wallpaper's dominant color automatically
                via Material You. On older devices it falls back to the system accent color.
                Restart the app after changing your wallpaper.
              </p>
            </div>
          )}

          {/* Live preview */}
          <SectionLabel style={{ marginTop: 20 }}>Preview</SectionLabel>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 44, height: 60, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Sample Manga
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Chapter 42 • 2h ago
                </div>
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: '65%' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="chip">Action</span>
              <span className="chip chip-gray">Ongoing</span>
              <span className="chip chip-green">New</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>▶ Continue</button>
              <button className="btn btn-secondary btn-sm">♥</button>
            </div>
          </div>

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

// ── READER SECTION ────────────────────────────────────────────────
function ReaderSection({ settings, updateSettings, onBack }) {
  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackIcon /></button>
        <span className="page-title">Reader</span>
      </div>
      <div className="page-scroll">
        <div className="page-content">
          <div className="settings-section">
            <div className="settings-section-header">Reading Mode</div>
            {READING_MODES.map((m) => (
              <div
                key={m.id}
                className="settings-row"
                onClick={() => updateSettings({ defaultReadingMode: m.id })}
                style={{ cursor: 'pointer' }}
              >
                <div className="settings-row-label">{m.label}</div>
                {settings.defaultReadingMode === m.id && (
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>✓</span>
                )}
              </div>
            ))}
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Display</div>
            <Row label="Show Page Number">
              <Toggle checked={settings.showPageNumber} onChange={(v) => updateSettings({ showPageNumber: v })} />
            </Row>
            <Row label="Show Progress Bar">
              <Toggle checked={settings.showProgressBar} onChange={(v) => updateSettings({ showProgressBar: v })} />
            </Row>
            <Row label="Keep Screen On" desc="Prevent sleep while reading">
              <Toggle checked={settings.keepScreenOn} onChange={(v) => updateSettings({ keepScreenOn: v })} />
            </Row>
            <Row label="Double-tap to Zoom">
              <Toggle checked={settings.doubleTapZoom} onChange={(v) => updateSettings({ doubleTapZoom: v })} />
            </Row>
            <Row label="Auto Next Chapter" desc="Jump to next when last page reached">
              <Toggle checked={settings.autoNextChapter} onChange={(v) => updateSettings({ autoNextChapter: v })} />
            </Row>
            <Row label={`Page Gap (Vertical) — ${settings.pageGap || 8}px`}>
              <input
                type="range" min={0} max={32} step={4}
                value={settings.pageGap || 8}
                onChange={(e) => updateSettings({ pageGap: Number(e.target.value) })}
                style={{ width: 90 }}
              />
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DOWNLOADS SECTION ─────────────────────────────────────────────
function DownloadsSection({ settings, updateSettings, downloads, clearDownloads, showToast, onBack }) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackIcon /></button>
        <span className="page-title">Downloads</span>
      </div>
      <div className="page-scroll">
        <div className="page-content">
          <div className="settings-section">
            <div className="settings-section-header">Quality</div>
            {QUALITIES.map((q) => (
              <div
                key={q.id}
                className="settings-row"
                onClick={() => updateSettings({ downloadQuality: q.id })}
                style={{ cursor: 'pointer' }}
              >
                <div className="settings-row-label">{q.label}</div>
                {settings.downloadQuality === q.id && (
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>✓</span>
                )}
              </div>
            ))}
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Location</div>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <div className="settings-row-info">
                <div className="settings-row-label">Save to</div>
              </div>
              <select
                className="input"
                style={{ width: 'auto' }}
                value={settings.downloadLocation}
                onChange={(e) => updateSettings({ downloadLocation: e.target.value })}
              >
                <option value="internal">Documents/ComiFountain</option>
                <option value="downloads">Downloads folder</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Storage</div>
            <Row label="Downloaded chapters" desc={`${downloads.length} chapters saved`}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setConfirm(true)}
              >
                Clear
              </button>
            </Row>
          </div>
        </div>
      </div>

      {confirm && (
        <div className="modal-overlay center" onClick={() => setConfirm(false)}>
          <div className="modal center-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Clear all downloads?</div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Removes download records. Files may still exist on device.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => {
                clearDownloads?.();
                showToast('Downloads cleared', 'info');
                setConfirm(false);
              }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LIBRARY SECTION ───────────────────────────────────────────────
function LibrarySection({ settings, updateSettings, categories, showToast, onLocalMangaAdded, addLocalManga, onBack }) {
  const { addCategory, renameCategory, removeCategory } = useStore();
  const [newCatName, setNewCatName] = useState('');

  const handleAddLocalManga = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.zip,.cbz,.cbr,.pdf,image/*';
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        addLocalManga({
          title:    file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          cover:    null,
          url:      URL.createObjectURL(file),
          local:    true,
          chapters: [{ id: 'local-1', title: 'Chapter 1', url: URL.createObjectURL(file), local: true }],
        });
      });
      showToast(`${files.length} manga added`, 'success');
      onLocalMangaAdded?.();
    };
    input.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackIcon /></button>
        <span className="page-title">Library</span>
      </div>
      <div className="page-scroll">
        <div className="page-content">

          <div className="settings-section">
            <div className="settings-section-header">Updates</div>
            <Row label="Refresh on app open">
              <Toggle checked={settings.refreshOnOpen} onChange={(v) => updateSettings({ refreshOnOpen: v })} />
            </Row>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Content</div>
            <Row label="Show 18+ content" desc="Show adult sources and results">
              <Toggle checked={settings.show18Plus} onChange={(v) => updateSettings({ show18Plus: v })} />
            </Row>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Local Manga</div>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <div className="settings-row-info">
                <div className="settings-row-label">Add local files</div>
                <div className="settings-row-desc">CBZ, ZIP, PDF or images</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleAddLocalManga}>
                <FolderIcon size={14} /> Browse
              </button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Categories</div>
            {categories.length === 0 && (
              <div style={{ padding: '12px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No custom categories yet. Create one below.
              </div>
            )}
            {categories.map((cat) => (
              <div key={cat.id} className="settings-row">
                <div className="settings-row-label">{cat.name}</div>
                <button
                  className="btn-icon"
                  style={{ color: 'var(--accent-secondary)' }}
                  onClick={() => { removeCategory(cat.id); showToast('Category removed', 'info'); }}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
              <input
                className="input"
                placeholder="New category name…"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary btn-sm"
                disabled={!newCatName.trim()}
                onClick={() => {
                  addCategory(newCatName.trim());
                  setNewCatName('');
                  showToast('Category added', 'success');
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

// ── UPDATES SECTION ───────────────────────────────────────────────
function UpdatesSection({ settings, updateSettings, onBack }) {
  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackIcon /></button>
        <span className="page-title">Updates</span>
      </div>
      <div className="page-scroll">
        <div className="page-content">
          <div className="settings-section">
            <div className="settings-section-header">Automatic Refresh</div>
            <Row label="Refresh on app open">
              <Toggle checked={settings.refreshOnOpen} onChange={(v) => updateSettings({ refreshOnOpen: v })} />
            </Row>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <div className="settings-row-info">
                <div className="settings-row-label">Scheduled refresh</div>
              </div>
              <select
                className="input"
                style={{ width: 'auto' }}
                value={settings.scheduledRefresh || 'never'}
                onChange={(e) => updateSettings({ scheduledRefresh: e.target.value })}
              >
                {REFRESH_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DATA SECTION ──────────────────────────────────────────────────
function DataSection({ library, history, downloads, categories, clearHistory, exportBackup, importBackup, backupRef, showToast, onBack }) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const now  = new Date();
    const pad  = (n) => String(n).padStart(2, '0');
    const name = `ComiFountain backup ${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}.json`;
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported!', 'success');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importBackup(ev.target.result);
      showToast(ok ? 'Backup restored!' : 'Invalid backup file', ok ? 'success' : 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-icon" onClick={onBack}><BackIcon /></button>
        <span className="page-title">Data & Storage</span>
      </div>
      <div className="page-scroll">
        <div className="page-content">
          <div className="settings-section">
            <div className="settings-section-header">Backup</div>
            <div style={{ padding: '10px 0', fontSize: '0.80rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Backs up library ({library.length} manga), categories ({categories.length}),
              sources, progress, bookmarks, history, and settings.
            </div>
            <Row label="Export backup" desc="Save .json file to device">
              <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                <BackupIcon size={14} /> Export
              </button>
            </Row>
            <Row label="Restore backup" desc="Import a .json backup file">
              <button className="btn btn-secondary btn-sm" onClick={() => backupRef.current?.click()}>
                <RestoreIcon size={14} /> Restore
              </button>
            </Row>
            <input
              ref={backupRef} type="file" accept=".json"
              style={{ display: 'none' }} onChange={handleImport}
            />
          </div>

          <div className="settings-section">
            <div className="settings-section-header">Clear Data</div>
            <Row label="Reading history" desc={`${history.length} entries`}>
              <button className="btn btn-danger btn-sm" onClick={() => { clearHistory(); showToast('History cleared', 'info'); }}>
                Clear
              </button>
            </Row>
          </div>

          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

// ── SHARED SMALL COMPONENTS ───────────────────────────────────────
function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.9px', color: 'var(--accent-primary)',
      fontFamily: 'var(--font-display)', marginBottom: 8, ...style,
    }}>
      {children}
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <div className="settings-row-label">{label}</div>
        {desc && <div className="settings-row-desc">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function ThemeBtn({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 6px', borderRadius: 'var(--radius-md)',
        border: active ? '2px solid var(--accent-primary)' : '1.5px solid var(--border)',
        background: active ? 'var(--chip-bg)' : 'var(--bg-card)',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.76rem',
        transition: 'all 0.16s ease',
      }}
    >
      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      {label}
    </button>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {COLORS.map((c) => (
          <button
            key={c.hex}
            title={c.name}
            onClick={() => onChange(c.hex)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: c.hex, border: value === c.hex ? '3px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer', transform: value === c.hex ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.16s ease', boxShadow: value === c.hex ? `0 0 0 3px var(--accent-glow)` : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="color" value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 40, borderRadius: 6, border: '1.5px solid var(--border)', cursor: 'pointer', padding: 2, background: 'none' }}
        />
        <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
