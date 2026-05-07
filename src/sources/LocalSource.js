// ── LOCAL SOURCE ─────────────────────────────────────────────────
// Handles locally stored manga on the device.
//
// FOLDER STRUCTURE EXPECTED:
//   /Root Folder/
//     Manga Title/           ← series folder
//       Chapter 1/           ← chapter folder (images inside)
//         001.jpg
//         002.jpg
//       Chapter 2.cbz        ← CBZ archive
//     Another Manga.cbz      ← single CBZ at root = one manga
//
// HOW IT WORKS IN THE BROWSER (no native plugin needed):
//   Uses <input type="file" webkitdirectory> to let user pick a folder
//   All files come in as a flat FileList with their relativePaths
//   We reconstruct the tree from relativePaths

export const LocalSource = {
  id:          'local',
  name:        'Local Source',
  lang:        'all',
  isBuiltIn:   true,
  isLocal:     true,
  supportsSearch: true,
  supportsBrowse: true,

  // ── In-memory file tree built from the picked folder ──────────
  _fileMap:  {},   // relativePath → File object
  _rootName: '',   // name of root folder

  // ── Called by SourcesPage when user picks a folder ────────────
  loadFromFileList(fileList) {
    this._fileMap  = {};
    this._rootName = '';

    const files = Array.from(fileList);
    if (files.length === 0) return 0;

    // webkitRelativePath = "RootFolder/SeriesName/Chapter1/001.jpg"
    this._rootName = files[0].webkitRelativePath.split('/')[0];

    for (const file of files) {
      const path = file.webkitRelativePath;
      this._fileMap[path] = file;
    }

    return files.length;
  },

  // ── Get all unique series from the file tree ──────────────────
  async browse() {
    const paths = Object.keys(this._fileMap);
    if (paths.length === 0) return [];

    const seriesMap = {};

    for (const path of paths) {
      const parts = path.split('/');
      // parts[0] = root, parts[1] = series name (or cbz at root)
      if (parts.length < 2) continue;

      const seriesName = parts[1];

      if (!seriesMap[seriesName]) {
        seriesMap[seriesName] = {
          id:         `local:${seriesName}`,
          title:      fileNameToTitle(seriesName),
          cover:      null,
          sourceId:   'local',
          sourceName: 'Local Source',
          local:      true,
          _files:     [],
        };
      }
      seriesMap[seriesName]._files.push(path);
    }

    // Find covers for each series
    const result = [];
    for (const key of Object.keys(seriesMap)) {
      const series = seriesMap[key];
      series.cover = await this._findCover(series._files);
      delete series._files;
      result.push(series);
    }

    return result.sort((a, b) => a.title.localeCompare(b.title));
  },

  async search(query) {
    const all = await this.browse();
    const q   = query.toLowerCase();
    return all.filter((m) => m.title.toLowerCase().includes(q));
  },

  // ── Get full details + chapter list for a series ──────────────
  async getMangaDetails(id) {
    const seriesName = id.replace('local:', '');
    const paths      = Object.keys(this._fileMap)
      .filter((p) => p.startsWith(`${this._rootName}/${seriesName}/`));

    if (paths.length === 0) return null;

    // Build chapter map: chapterFolder/cbz → [files]
    const chapterMap = {};

    for (const path of paths) {
      const parts = path.split('/');
      // parts[0]=root, parts[1]=series, parts[2]=chapter, parts[3]=image
      if (parts.length < 3) continue;

      const chapterName = parts[2];
      if (!chapterMap[chapterName]) chapterMap[chapterName] = [];
      chapterMap[chapterName].push(path);
    }

    const chapters = Object.keys(chapterMap).map((chName, i) => ({
      id:       `local:${seriesName}/${chName}`,
      title:    fileNameToTitle(chName),
      number:   parseChNum(chName),
      date:     '',
      index:    i,
      sourceId: 'local',
      mangaId:  id,
      _isCBZ:   chName.toLowerCase().endsWith('.cbz') || chName.toLowerCase().endsWith('.zip'),
    })).sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

    const allFiles = paths;
    const cover    = await this._findCover(allFiles);

    return {
      id,
      title:      fileNameToTitle(seriesName),
      cover,
      description: '',
      genres:     [],
      status:     'Local',
      author:     '',
      sourceId:   'local',
      sourceName: 'Local Source',
      local:      true,
      chapters,
    };
  },

  // ── Get pages for a chapter ───────────────────────────────────
  async getPageList(mangaId, chapterId) {
    const parts      = chapterId.replace('local:', '').split('/');
    const seriesName = parts[0];
    const chapterName= parts[1];

    if (!chapterName) return [];

    const isCBZ = /\.(cbz|zip)$/i.test(chapterName);

    if (isCBZ) {
      return await this._extractCBZ(seriesName, chapterName);
    }

    // Folder of images
    const prefix = `${this._rootName}/${seriesName}/${chapterName}/`;
    const images = Object.keys(this._fileMap)
      .filter((p) => p.startsWith(prefix) && isImagePath(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const pages = [];
    for (let i = 0; i < images.length; i++) {
      const file = this._fileMap[images[i]];
      if (file) {
        const url = URL.createObjectURL(file);
        pages.push({ index: i, url, _objectUrl: true });
      }
    }
    return pages;
  },

  // ── Internal helpers ──────────────────────────────────────────

  async _findCover(filePaths) {
    // Look for a file named "cover" or first image in first chapter
    const coverFile = filePaths.find((p) =>
      /cover\.(jpg|jpeg|png|webp)/i.test(p) && isImagePath(p)
    );

    const firstImage = coverFile || filePaths
      .filter((p) => isImagePath(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];

    if (!firstImage) return null;

    const file = this._fileMap[firstImage];
    if (!file) return null;

    return URL.createObjectURL(file);
  },

  async _extractCBZ(seriesName, cbzName) {
    const path = `${this._rootName}/${seriesName}/${cbzName}`;
    const file = this._fileMap[path];
    if (!file) return [];

    try {
      const { default: JSZip } = await import('jszip');
      const zip   = await JSZip.loadAsync(file);
      const names = Object.keys(zip.files)
        .filter((n) => !zip.files[n].dir && isImagePath(n))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const pages = [];
      for (let i = 0; i < names.length; i++) {
        const blob = await zip.files[names[i]].async('blob');
        const url  = URL.createObjectURL(blob);
        pages.push({ index: i, url, _objectUrl: true });
      }
      return pages;
    } catch (e) {
      console.error('CBZ extract error:', e);
      return [];
    }
  },

  // ── Cleanup object URLs when done reading ─────────────────────
  revokePages(pages) {
    for (const p of pages) {
      if (p._objectUrl && p.url?.startsWith('blob:')) {
        URL.revokeObjectURL(p.url);
      }
    }
  },
};

// ── Helpers ───────────────────────────────────────────────────────
function isImagePath(path) {
  return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(path);
}

function fileNameToTitle(name) {
  return name
    .replace(/\.(cbz|zip|cbr)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function parseChNum(name) {
  const clean = name.replace(/\.(cbz|zip|cbr)$/i, '');
  const m     = clean.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : '0';
}
