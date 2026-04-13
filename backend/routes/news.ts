import { Router, Request, Response } from 'express';

const router = Router();

interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  timeAgo: string;
  category: string;
}

let _cache: NewsItem[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);

  // Safety check if the API sends a weird date
  if (isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;

  // Fallback for very old news (though your APIs usually return recent ones)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// 🎯 Highly targeted categories based on your requirements
function tagCategory(title: string): string {
  const t = title.toLowerCase();

  if (/(policy|rule|government|rto|morth|advisory|law)/.test(t)) return "policy";
  if (/(toll|fastag|tax|tariff)/.test(t)) return "tolls";
  if (/(close|block|divert|diversion|barricade)/.test(t)) return "closures";
  if (/(metro|bus|train|railway|transit)/.test(t)) return "public transport";
  if (/(infrastructure|construction|expressway|highway|project)/.test(t)) return "infrastructure";
  if (/(weather|rain|flood|fog|smog|monsoon)/.test(t)) return "weather";
  if (/(accident|crash|collision|fatality)/.test(t)) return "accident";
  if (/(traffic|jam|congestion|snarl)/.test(t)) return "traffic";

  return "general";
}

// Optimized query that respects free-tier API limits while hitting all your targets
// 🎯 Laser-focused on Indian ground traffic, roads, and daily commutes
const SEARCH_QUERY = '"India" AND ("traffic jam" OR "highway" OR "expressway" OR "road safety" OR "toll plaza" OR "road closure" OR "traffic advisory" OR "RTO" OR "NHAI")';

async function fetchFromGNews(apiKey: string): Promise<NewsItem[]> {
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(SEARCH_QUERY)}&lang=en&country=in&max=10&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews failed with status ${res.status}`);
  const data = await res.json();

  return (data.articles || []).map((a: any) => ({
    title: a.title,
    source: a.source?.name || "Unknown",
    url: a.url,
    publishedAt: a.publishedAt,
    timeAgo: formatTimeAgo(a.publishedAt),
    category: tagCategory(a.title)
  }));
}

async function fetchFromNewsAPI(apiKey: string): Promise<NewsItem[]> {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(SEARCH_QUERY)}&language=en&pageSize=10&sortBy=publishedAt&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI failed with status ${res.status}`);
  const data = await res.json();

  return (data.articles || [])
    .filter((a: any) => a.title && a.title !== "[Removed]")
    .map((a: any) => ({
      title: a.title,
      source: a.source?.name || "Unknown",
      url: a.url,
      publishedAt: a.publishedAt,
      timeAgo: formatTimeAgo(a.publishedAt),
      category: tagCategory(a.title)
    }));
}

// Diagnostic fallback: If you see this, the APIs are failing or keys are missing
const FALLBACK: NewsItem[] = [
  {
    title: "Backend active: Waiting for live traffic APIs to connect...",
    source: "System",
    url: "#",
    publishedAt: new Date().toISOString(),
    timeAgo: "Just now",
    category: "general"
  }
];

async function getNews(): Promise<NewsItem[]> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const gKey = process.env.GNEWS_API_KEY || "";
  const nKey = process.env.NEWS_API_KEY || "";
  let items: NewsItem[] = [];

  try {
    if (gKey) items = await fetchFromGNews(gKey);
  } catch (err) {
    console.error("[News] GNews Error:", err);
  }

  if (!items.length && nKey) {
    try {
      items = await fetchFromNewsAPI(nKey);
    } catch (err) {
      console.error("[News] NewsAPI Error:", err);
    }
  }

  _cache = items.length ? items.slice(0, 10) : FALLBACK;
  _cacheTime = Date.now();
  return _cache;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const news = await getNews();
    res.json({ items: news });
  } catch (err) {
    console.error("[News] Route error:", err);
    res.status(500).json({ items: FALLBACK });
  }
});

export const newsRoutes = router;