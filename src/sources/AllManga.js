// ── ALLMANGA SOURCE ──────────────────────────────────────────────
// Correct working GraphQL queries verified against the actual API

const API     = 'https://api.allanime.day/api';
const ORIGIN  = 'https://allmanga.to';
const HEADERS = {
  'Content-Type': 'application/json',
  'Referer':      ORIGIN,
  'Origin':       ORIGIN,
  'User-Agent':   'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
};

async function gql(query, variables) {
  const res = await fetch(API, {
    method:  'POST',
    headers: HEADERS,
    body:    JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AllManga API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Correct working queries ────────────────────────────────────────
const Q_BROWSE = `
query($search: SearchInput, $limit: Int, $page: Int) {
  mangas(search: $search, limit: $limit, page: $page) {
    edges {
      _id
      name
      thumbnail
      status
      genres
    }
  }
}`;

const Q_DETAILS = `
query($id: String!) {
  manga(_id: $id) {
    _id
    name
    thumbnail
    description
    genres
    status
    authors
    chaptersCount
    chapters {
      edges {
        _id
        chapterNum
        title
        uploadDate
      }
    }
  }
}`;

const Q_PAGES = `
query($id: String!, $chapterNum: String!) {
  chapter(_id: $id, chapterNum: $chapterNum) {
    pages {
      edges {
        pictureUrlHead
        pictureUrls
        pageNum
      }
    }
  }
}`;

export const AllMangaSource = {
  id:          'allanime',
  name:        'AllManga',
  lang:        'en',
  baseUrl:     ORIGIN,
  isBuiltIn:   true,
  supportsSearch: true,
  supportsBrowse: true,

  async browse(page = 1) {
    try {
      const data = await gql(Q_BROWSE, {
        search: { sortBy: 'Latest', isManga: true },
        limit:  30,
        page,
      });
      return (data?.mangas?.edges || []).map(normalizeManga);
    } catch (e) {
      console.error('AllManga browse error:', e);
      throw e;
    }
  },

  async search(query, page = 1) {
    try {
      const data = await gql(Q_BROWSE, {
        search: { query, isManga: true },
        limit:  30,
        page,
      });
      return (data?.mangas?.edges || []).map(normalizeManga);
    } catch (e) {
      console.error('AllManga search error:', e);
      throw e;
    }
  },

  async getMangaDetails(id) {
    try {
      const data = await gql(Q_DETAILS, { id });
      const m = data?.manga;
      if (!m) return null;

      const chapters = (m.chapters?.edges || []).map((ch, i) => ({
        id:       ch._id,
        title:    ch.title || `Chapter ${ch.chapterNum}`,
        number:   String(ch.chapterNum),
        date:     ch.uploadDate ? new Date(ch.uploadDate).toLocaleDateString() : '',
        index:    i,
        sourceId: 'allanime',
        mangaId:  id,
      })).sort((a, b) => parseFloat(b.number) - parseFloat(a.number));

      return {
        ...normalizeManga(m),
        description: m.description || '',
        author:      (m.authors || []).join(', '),
        chapters,
      };
    } catch (e) {
      console.error('AllManga details error:', e);
      throw e;
    }
  },

  async getPageList(mangaId, chapterNum) {
    try {
      const data = await gql(Q_PAGES, { id: mangaId, chapterNum: String(chapterNum) });
      const edges = data?.chapter?.pages?.edges || [];
      return edges
        .sort((a, b) => a.pageNum - b.pageNum)
        .map((p) => ({
          index: p.pageNum,
          url:   p.pictureUrls?.[0] || p.pictureUrlHead || '',
        }))
        .filter((p) => p.url);
    } catch (e) {
      console.error('AllManga pages error:', e);
      throw e;
    }
  },
};

function normalizeManga(m) {
  return {
    id:         m._id,
    title:      m.name || 'Unknown',
    altTitles:  [],
    cover:      m.thumbnail || '',
    genres:     m.genres || [],
    status:     m.status || '',
    sourceId:   'allanime',
    sourceName: 'AllManga',
    url:        `${ORIGIN}/manga/${m._id}`,
  };
}
