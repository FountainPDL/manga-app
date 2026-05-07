import { useState } from 'react';
import { useStore } from '@store';
import { formatDate } from '@utils/scraper';
import { UpdatesIcon, HistoryIcon, BookmarkIcon, TrashIcon, RefreshIcon } from '@components/common/Icons';

export function UpdatesPage({ onOpenManga }) {
  const [activeTab, setActiveTab] = useState('updates');
  const { updates, history, bookmarks, clearHistory, removeFromHistory, removeBookmark, library, showToast } = useStore();

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-title">
          {activeTab === 'updates' ? 'Updates' : activeTab === 'history' ? 'History' : 'Bookmarks'}
        </span>
        {activeTab === 'history' && history.length > 0 && (
          <button
            className="btn-icon"
            style={{ color: 'var(--accent-secondary)' }}
            onClick={() => { clearHistory(); showToast('History cleared', 'info'); }}
          >
            <TrashIcon size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div className="tabs">
          {[
            { id: 'updates', label: 'Updates', icon: <UpdatesIcon size={14} /> },
            { id: 'history', label: 'History', icon: <HistoryIcon size={14} /> },
            { id: 'bookmarks', label: 'Bookmarks', icon: <BookmarkIcon size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        {activeTab === 'updates' && (
          <UpdatesTab updates={updates} library={library} onOpenManga={onOpenManga} />
        )}
        {activeTab === 'history' && (
          <HistoryTab history={history} onOpenManga={onOpenManga} onRemove={removeFromHistory} />
        )}
        {activeTab === 'bookmarks' && (
          <BookmarksTab bookmarks={bookmarks} onOpenManga={onOpenManga} onRemove={removeBookmark} />
        )}
      </div>
    </div>
  );
}

// ==================== UPDATES TAB ====================
function UpdatesTab({ updates, library, onOpenManga }) {
  if (library.length === 0) {
    return (
      <div className="empty-state">
        <UpdatesIcon size={48} />
        <h3>No library yet</h3>
        <p>Add manga to your library to track updates here.</p>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="empty-state">
        <RefreshIcon size={48} />
        <h3>No updates yet</h3>
        <p>Updates will appear here when new chapters are available for manga in your library.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {updates.map((update) => (
        <div
          key={update.mangaId}
          className="card"
          style={{ padding: 12, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
          onClick={() => onOpenManga({ id: update.mangaId, title: update.mangaTitle, cover: update.mangaCover })}
        >
          <img
            src={update.mangaCover}
            alt={update.mangaTitle}
            style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
            onError={(e) => { e.target.src = `https://via.placeholder.com/48x68/1a0030/b060ff?text=M`; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }} className="truncate">{update.mangaTitle}</div>
            <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginTop: 3 }}>{update.newChapter}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{formatDate(update.updatedAt)}</div>
          </div>
          <span className="chip chip-green">New</span>
        </div>
      ))}
    </div>
  );
}

// ==================== HISTORY TAB ====================
function HistoryTab({ history, onOpenManga, onRemove }) {
  if (history.length === 0) {
    return (
      <div className="empty-state">
        <HistoryIcon size={48} />
        <h3>No history</h3>
        <p>Manga you've read will appear here.</p>
      </div>
    );
  }

  // Group by date
  const grouped = groupByDate(history);

  return (
    <div>
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10,
            fontFamily: 'var(--font-display)',
          }}>
            {date}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((entry, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: 12, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
                onClick={() => onOpenManga({ id: entry.mangaId, title: entry.mangaTitle, cover: entry.mangaCover })}
              >
                <img
                  src={entry.mangaCover}
                  alt={entry.mangaTitle}
                  style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                  onError={(e) => { e.target.src = `https://via.placeholder.com/44x62/1a0030/b060ff?text=M`; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }} className="truncate">{entry.mangaTitle}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3 }} className="truncate">{entry.chapterTitle}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                    Page {entry.page + 1}/{entry.totalPages} • {formatDate(entry.timestamp)}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  style={{ color: 'var(--text-muted)', padding: 6 }}
                  onClick={(e) => { e.stopPropagation(); onRemove(entry.mangaId); }}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== BOOKMARKS TAB ====================
function BookmarksTab({ bookmarks, onOpenManga, onRemove }) {
  if (bookmarks.length === 0) {
    return (
      <div className="empty-state">
        <BookmarkIcon size={48} />
        <h3>No bookmarks</h3>
        <p>Bookmark pages while reading to find them quickly later.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bookmarks.map((bm) => (
        <div
          key={bm.id}
          className="card"
          style={{ padding: 12, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
          onClick={() => onOpenManga({ id: bm.mangaId, title: bm.mangaTitle, cover: bm.mangaCover })}
        >
          {bm.mangaCover && (
            <img
              src={bm.mangaCover}
              alt={bm.mangaTitle}
              style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              onError={(e) => { e.target.src = `https://via.placeholder.com/44x62/1a0030/b060ff?text=M`; }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }} className="truncate">{bm.mangaTitle}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3 }} className="truncate">{bm.chapterTitle}</div>
            <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', marginTop: 2 }}>
              Page {bm.page + 1}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{formatDate(bm.createdAt)}</div>
          </div>
          <button
            className="btn-icon"
            style={{ color: 'var(--accent-secondary)', padding: 6 }}
            onClick={(e) => { e.stopPropagation(); onRemove(bm.id); }}
          >
            <TrashIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ==================== HELPERS ====================
function groupByDate(items) {
  const groups = {};
  items.forEach((item) => {
    const date = new Date(item.timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    const key = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff} days ago`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}
