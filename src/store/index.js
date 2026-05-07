import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useStore = create(
  persist(
    (set, get) => ({

      // ── SETTINGS ─────────────────────────────────────────────────
      settings: {
        theme:        'dark',
        subTheme:     '',
        solidColor:   '#9b30ff',
        solidColor2:  '#e63946',
        shiftColor1:  '#9b30ff',
        shiftColor2:  '#e63946',
        shiftSpeed:   8,
        shiftDegrees: 45,
        defaultReadingMode: 'rtl',
        autoNextChapter:    true,
        keepScreenOn:       true,
        showPageNumber:     true,
        showProgressBar:    true,
        doubleTapZoom:      true,
        pageGap:            8,
        backgroundColor:    '#000000',
        gridColumns:        2,
        libraryView:        'grid',
        libraryCompact:     false,
        downloadQuality:    'high',
        downloadLocation:   'internal',
        show18Plus:         false,
        refreshOnOpen:      false,
        scheduledRefresh:   'never',
        autoBackup:         false,
        backupInterval:     'weekly',
        localSourcePath:    '',       // path to local manga folder
        cacheEnabled:       true,
        cacheMaxSizeMB:     200,
        cacheExpireHours:   48,
      },

      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      // ── CATEGORIES ───────────────────────────────────────────────
      categories: [],

      addCategory: (name) =>
        set((s) => ({
          categories: [...s.categories, { id: generateId(), name, createdAt: Date.now() }],
        })),

      renameCategory: (id, name) =>
        set((s) => ({
          categories: s.categories.map((c) => c.id === id ? { ...c, name } : c),
        })),

      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          library:    s.library.map((m) => ({
            ...m,
            categories: (m.categories || []).filter((cid) => cid !== id),
          })),
        })),

      // ── SOURCES ──────────────────────────────────────────────────
      sources: [],

      addSource: (source) =>
        set((s) => ({
          sources: [...s.sources, { ...source, id: generateId(), addedAt: Date.now(), enabled: true }],
        })),

      updateSource: (id, updates) =>
        set((s) => ({
          sources: s.sources.map((src) => src.id === id ? { ...src, ...updates } : src),
        })),

      removeSource: (id) =>
        set((s) => ({ sources: s.sources.filter((src) => src.id !== id) })),

      // ── LIBRARY ──────────────────────────────────────────────────
      library: [],

      addToLibrary: (manga, categoryIds = []) =>
        set((s) => {
          if (s.library.find((m) => m.id === manga.id)) return s;
          return {
            library: [
              ...s.library,
              { ...manga, addedAt: Date.now(), inLibrary: true, categories: categoryIds },
            ],
          };
        }),

      removeFromLibrary: (mangaId) =>
        set((s) => ({ library: s.library.filter((m) => m.id !== mangaId) })),

      updateLibraryManga: (mangaId, updates) =>
        set((s) => ({
          library: s.library.map((m) => m.id === mangaId ? { ...m, ...updates } : m),
        })),

      setMangaCategories: (mangaId, categoryIds) =>
        set((s) => ({
          library: s.library.map((m) =>
            m.id === mangaId ? { ...m, categories: categoryIds } : m
          ),
        })),

      isInLibrary: (mangaId) => get().library.some((m) => m.id === mangaId),

      // ── PROGRESS ─────────────────────────────────────────────────
      progress: {},

      updateProgress: (mangaId, chapterId, page, totalPages) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [mangaId]: {
              ...s.progress[mangaId],
              lastChapterId: chapterId,
              lastPage:      page,
              totalPages,
              lastRead:      Date.now(),
              [chapterId]: { page, totalPages, completed: page >= totalPages - 1 },
            },
          },
        })),

      markChapterRead: (mangaId, chapterId) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [mangaId]: {
              ...s.progress[mangaId],
              [chapterId]: { ...(s.progress[mangaId]?.[chapterId] || {}), completed: true },
            },
          },
        })),

      markChapterUnread: (mangaId, chapterId) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [mangaId]: {
              ...s.progress[mangaId],
              [chapterId]: { ...(s.progress[mangaId]?.[chapterId] || {}), completed: false, page: 0 },
            },
          },
        })),

      getProgress: (mangaId) => get().progress[mangaId] || null,

      // ── HISTORY ──────────────────────────────────────────────────
      history: [],

      addToHistory: (entry) =>
        set((s) => {
          const filtered = s.history.filter(
            (h) => !(h.mangaId === entry.mangaId && h.chapterId === entry.chapterId)
          );
          return { history: [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, 300) };
        }),

      clearHistory:       () => set({ history: [] }),
      removeFromHistory:  (mangaId) =>
        set((s) => ({ history: s.history.filter((h) => h.mangaId !== mangaId) })),

      // ── BOOKMARKS ────────────────────────────────────────────────
      bookmarks: [],

      addBookmark: (bookmark) =>
        set((s) => ({
          bookmarks: [...s.bookmarks, { ...bookmark, id: generateId(), createdAt: Date.now() }],
        })),

      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

      isBookmarked: (mangaId, chapterId, page) =>
        get().bookmarks.some(
          (b) => b.mangaId === mangaId && b.chapterId === chapterId && b.page === page
        ),

      // ── DOWNLOADS ────────────────────────────────────────────────
      downloads:     [],
      downloadQueue: [],

      addDownload: (download) =>
        set((s) => ({
          downloads: [...s.downloads, { ...download, id: generateId(), downloadedAt: Date.now() }],
        })),

      removeDownload:  (id) =>
        set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) })),

      clearDownloads:  () => set({ downloads: [] }),

      getDownloads:    (mangaId) => get().downloads.filter((d) => d.mangaId === mangaId),

      isDownloaded:    (mangaId, chapterId) =>
        get().downloads.some((d) => d.mangaId === mangaId && d.chapterId === chapterId),

      addToQueue: (item) =>
        set((s) => ({
          downloadQueue: [...s.downloadQueue, { ...item, id: generateId(), status: 'queued' }],
        })),

      updateQueueItem: (id, updates) =>
        set((s) => ({
          downloadQueue: s.downloadQueue.map((i) => i.id === id ? { ...i, ...updates } : i),
        })),

      removeFromQueue: (id) =>
        set((s) => ({ downloadQueue: s.downloadQueue.filter((i) => i.id !== id) })),

      clearQueue: () => set({ downloadQueue: [] }),

      // ── UPDATES ──────────────────────────────────────────────────
      updates: [],
      setUpdates:  (updates) => set({ updates }),
      addUpdate:   (update)  =>
        set((s) => ({
          updates: [update, ...s.updates.filter((u) => u.mangaId !== update.mangaId)],
        })),

      // ── LOCAL MANGA ──────────────────────────────────────────────
      localManga: [],

      addLocalManga: (manga) =>
        set((s) => ({
          localManga: [
            ...s.localManga,
            { ...manga, id: generateId(), local: true, addedAt: Date.now() },
          ],
        })),

      // THIS was the bug — was missing or pointing to wrong array
      removeLocalManga: (id) =>
        set((s) => ({
          localManga: s.localManga.filter((m) => m.id !== id),
        })),

      // ── UI STATE (not persisted) ─────────────────────────────────
      activeTab: 'library',
      setActiveTab: (tab) => set({ activeTab: tab }),

      toasts: [],
      showToast: (message, type = 'info') => {
        const id = generateId();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3200);
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // ── CACHE ────────────────────────────────────────────────────
      // Simple in-memory + localStorage cache for API responses
      _cache: {},

      setCacheEntry: (key, value, ttlMs) =>
        set((s) => ({
          _cache: {
            ...s._cache,
            [key]: { value, expiresAt: Date.now() + ttlMs },
          },
        })),

      getCacheEntry: (key) => {
        const entry = get()._cache[key];
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
          // Expired — clean up
          set((s) => {
            const next = { ...s._cache };
            delete next[key];
            return { _cache: next };
          });
          return null;
        }
        return entry.value;
      },

      clearCache: () => set({ _cache: {} }),

      // ── BACKUP ───────────────────────────────────────────────────
      exportBackup: () => {
        const s = get();
        return JSON.stringify({
          version:    2,
          exportedAt: Date.now(),
          library:    s.library,
          categories: s.categories,
          sources:    s.sources,
          progress:   s.progress,
          bookmarks:  s.bookmarks,
          history:    s.history,
          settings:   s.settings,
          localManga: s.localManga,
          downloads:  s.downloads,
        }, null, 2);
      },

      importBackup: (data) => {
        try {
          const b = typeof data === 'string' ? JSON.parse(data) : data;
          set({
            library:    b.library    || [],
            categories: b.categories || [],
            sources:    b.sources    || [],
            progress:   b.progress   || {},
            bookmarks:  b.bookmarks  || [],
            history:    b.history    || [],
            settings:   { ...get().settings, ...(b.settings || {}) },
            localManga: b.localManga || [],
            downloads:  b.downloads  || [],
          });
          return true;
        } catch {
          return false;
        }
      },
    }),

    {
      name: 'comifountain-store',
      partialize: (s) => ({
        settings:      s.settings,
        categories:    s.categories,
        sources:       s.sources,
        library:       s.library,
        progress:      s.progress,
        history:       s.history,
        bookmarks:     s.bookmarks,
        downloads:     s.downloads,
        localManga:    s.localManga,
        updates:       s.updates,
        downloadQueue: s.downloadQueue,
        // Don't persist _cache — it rebuilds from API
      }),
    }
  )
);
