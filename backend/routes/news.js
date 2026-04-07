import { Router } from 'express';

const router = Router();

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

// ---------------------------------------------------------------------------
// Helper – convert ISO date → "X hours ago" etc.
// ---------------------------------------------------------------------------
export function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'recently';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Helper – tag category from title keywords
// ---------------------------------------------------------------------------
function tagCategory(title) {
  const t = title.toLowerCase();
  if (/(accident|crash)/.test(t)) return 'accident';
  if (/(traffic|jam|congestion)/.test(t)) return 'traffic';
  if (/(rain|flood)/.test(t)) return 'weather';
  if (/(metro|bus|train)/.test(t)) return 'public transport';
  if (/(construction|repair)/.test(t)) return 'construction';
  if (/(police|checking)/.test(t)) return 'police activity';
  if (/(road damage|pothole)/.test(t)) return 'civic issue';
  if (/(road.?safety|helmet|seat.?belt|drunk.?driving)/.test(t)) return 'road safety';
  return 'general';
}

// ---------------------------------------------------------------------------
// Fetch from APIs with Fallback logic
// ---------------------------------------------------------------------------
async function fetchNewsItems() {
  const query = encodeURIComponent('traffic OR road accident OR highway OR transport India');
  let itemsToReturn = [];
  let gNewsSucceeded = false;

  // ── GNews (Primary) ─────────────────────────────────────────────────────────
  if (process.env.GNEWS_API_KEY) {
    try {
      const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&country=in&max=10&apikey=${process.env.GNEWS_API_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      
      if (res.ok) {
        const data = await res.json();
        itemsToReturn = (data.articles || []).map(a => ({
          title: a.title,
          source: a.source?.name ?? 'Unknown',
          url: a.url,
          publishedAt: a.publishedAt,
          timeAgo: formatTimeAgo(a.publishedAt),
          category: tagCategory(a.title),
        }));
        gNewsSucceeded = true;
      } else {
        console.warn(`[news] GNews returned ${res.status}. Falling back to NewsAPI...`);
      }
    } catch(e) {
      console.warn(`[news] GNews fetch failed: ${e.message}. Falling back to NewsAPI...`);
    }
  }

  if (gNewsSucceeded) {
      return itemsToReturn;
  }

  // ── NewsAPI (Fallback) ──────────────────────────────────────────────────────
  if (process.env.NEWS_API_KEY) {
    const url = `https://newsapi.org/v2/everything?q=${query}&language=en&pageSize=10&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
    const data = await res.json();

    return (data.articles || [])
      .filter(a => a.title && a.title !== '[Removed]')
      .map(a => ({
        title: a.title,
        source: a.source?.name ?? 'Unknown',
        url: a.url,
        publishedAt: a.publishedAt,
        timeAgo: formatTimeAgo(a.publishedAt),
        category: tagCategory(a.title),
      }));
  }

  throw new Error("No news API key configured (GNEWS_API_KEY or NEWS_API_KEY)");
}

// ---------------------------------------------------------------------------
// Static fallback shown when both APIs fail / key missing
// ---------------------------------------------------------------------------
const FALLBACK_NEWS = [
  {
    title: 'Heavy traffic reported near major city intersections',
    source: 'Traffic Dept',
    url: '#',
    publishedAt: new Date().toISOString(),
    timeAgo: 'Just now',
    category: 'traffic',
  },
  {
    title: 'Road safety awareness drive launched across highways',
    source: 'MoRTH',
    url: '#',
    publishedAt: new Date().toISOString(),
    timeAgo: 'Just now',
    category: 'road safety',
  },
  {
    title: 'Expressway expansion project to ease congestion',
    source: 'NHAI',
    url: '#',
    publishedAt: new Date().toISOString(),
    timeAgo: 'Just now',
    category: 'general',
  },
];

// ---------------------------------------------------------------------------
// Core fetch logic (cache-aware)
// ---------------------------------------------------------------------------
async function getNews() {
  // Return cached result if still fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  try {
    const items = await fetchNewsItems();

    // Filter to India-relevant results, keep top 8
    const filtered = items
      .filter(i => i.title.length > 10)
      .slice(0, 8);

    _cache = filtered.length ? filtered : FALLBACK_NEWS;
    _cacheTime = Date.now();
    return _cache;

  } catch (err) {
    console.error('[NEWS] API fetch failed:', err.message);
    // Return stale cache if available, else fallback
    return _cache ?? FALLBACK_NEWS;
  }
}

// ---------------------------------------------------------------------------
// Route: GET /api/news
// ---------------------------------------------------------------------------
router.get('/', async (_req, res) => {
  try {
    const news = await getNews();
    res.json({ items: news, cached: !!_cache, updatedAt: new Date(_cacheTime).toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news', items: FALLBACK_NEWS });
  }
});

export default router;