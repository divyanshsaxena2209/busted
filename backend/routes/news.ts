import { Router, Request, Response } from 'express';

const router = Router();

interface NewsItem {
  title: string;
  description?: string;
  content?: string;
  source: string;
  url: string;
  publishedAt: string;
  timeAgo: string;
  category: string;
  matchedKeywords?: string[];
  matchedClusters?: string[];
  keywordCount?: number;
  clusterCount?: number;
}

let _cache: NewsItem[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

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

const SEARCH_QUERY = 'India AND (traffic OR accident OR highway OR expressway OR toll OR RTO OR challan)';

const KEYWORD_CLUSTERS: Record<string, string[]> = {
  "Traffic Management": [
    "traffic police", "traffic jam", "traffic congestion", "gridlock", "traffic advisory",
    "traffic diversion", "road closure", "lane closure", "detour", "roadblock"
  ],
  "Road Infrastructure": [
    "flyover", "underpass", "overpass", "expressway", "national highway", "state highway",
    "ring road", "bypass", "bridge", "tunnel", "interchange", "road widening",
    "road construction", "road repair", "service road"
  ],
  "Accidents": [
    "road accident", "traffic accident", "fatal accident", "road mishap", "collision",
    "crash", "pileup", "multi-vehicle crash", "hit-and-run", "vehicle overturned"
  ],
  "Enforcement": [
    "challan", "e-challan", "traffic violation", "speeding violation", "overspeeding",
    "drunk driving", "rash driving", "reckless driving", "wrong-side driving",
    "red light jumping", "helmet violation", "seat belt violation", "illegal parking"
  ],
  "Authorities": [
    "NHAI", "MoRTH", "National Highways Authority of India",
    "Ministry of Road Transport and Highways", "RTO", "traffic commissioner",
    "transport commissioner", "Delhi Traffic Police", "Mumbai Traffic Police",
    "Bengaluru Traffic Police", "Hyderabad Traffic Police", "Chennai Traffic Police",
    "Kolkata Traffic Police", "Pune Traffic Police", "Noida Traffic Police", "Gurugram Traffic Police"
  ],
  "Road Safety": [
    "road safety", "traffic safety", "black spot", "accident-prone zone",
    "safety audit", "pedestrian safety", "cyclist safety"
  ],
  "Smart Mobility": [
    "intelligent traffic system", "ITS", "adaptive traffic signal",
    "traffic signal synchronization", "ANPR", "automatic number plate recognition",
    "urban mobility", "public transport", "metro expansion", "BRTS"
  ]
};

const SINGLE_STRONG_KEYWORDS = [
  "traffic police", "road accident", "traffic accident", "fatal accident", "collision",
  "crash", "pileup", "traffic congestion", "traffic jam", "gridlock", "traffic diversion",
  "traffic advisory", "road closure", "lane closure", "e-challan", "challan", "flyover",
  "expressway", "national highway", "state highway", "NHAI", "MoRTH", "road safety"
];

const RELAXATION_LEVEL_1_KEYWORDS = [
  "flyover", "underpass", "bridge", "expressway", "highway", "traffic", "traffic police",
  "accident", "road safety", "road closure", "diversion"
];

const RELAXATION_LEVEL_2_TITLE_KEYWORDS = [
  "traffic", "accident", "crash", "highway", "expressway", "flyover", "road closure",
  "road safety", "NHAI"
];

const BLACKLIST_KEYWORDS = [
  "actor", "actress", "movie", "celebrity", "sports", "cricket", "football",
  "crypto", "bitcoin", "finance", "gaming", "lifestyle", "tourism", "election",
  "bollywood", "hollywood", "fraud", "scam", 
  "dubai", "uae", "pakistan", "bangladesh", "nepal", "sri lanka", "china", "usa", "uk", "london", "new york", "america",
  "abduction", "extortion", "conspiracy", "murder", "rape", "robbery", "kidnapping", "smuggling", "terrorist", "militant", "narcotics", "drugs", "suicide",
  "factory", "industrial", "steel plant", "chemical leak", "bomb blast", "israel", "iran", "trump", "ceasefire", "gaza", "russia", "ukraine", "strait", "hormuz", "vessel", "navy", "maritime",
  "shigella", "disease", "virus", "inflation", "stock market", "sensex", "nifty", "fmcg", "take a toll", "taking a toll", "takes a toll", "death toll", "world-class city"
];

function getArticleStats(article: any) {
  const matchedKeywords: string[] = [];
  const matchedClusters: string[] = [];
  const titleSearchable = (article.title || "").toLowerCase();
  const searchableText = [
    titleSearchable,
    (article.description || "").toLowerCase(),
    (article.content || "").toLowerCase()
  ].join(" ");

  for (const word of BLACKLIST_KEYWORDS) {
    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`);
    if (regex.test(searchableText)) {
      return { isBlacklisted: true, keywordCount: 0, clusterCount: 0, matchedKeywords: [], matchedClusters: [], titleSearchable, searchableText };
    }
  }

  for (const [clusterName, keywords] of Object.entries(KEYWORD_CLUSTERS)) {
    let clusterMatched = false;
    for (const keyword of keywords) {
      if (searchableText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        clusterMatched = true;
      }
    }
    if (clusterMatched) {
      matchedClusters.push(clusterName);
    }
  }

  const uniqueMatchedKeywords = [...new Set(matchedKeywords)];

  return {
    isBlacklisted: false,
    keywordCount: uniqueMatchedKeywords.length,
    clusterCount: matchedClusters.length,
    matchedKeywords: uniqueMatchedKeywords,
    matchedClusters,
    titleSearchable,
    searchableText
  };
}

async function fetchFromGNews(apiKey: string): Promise<any[]> {
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(SEARCH_QUERY)}&lang=en&country=in&max=100&sortby=publishedAt&apikey=${apiKey}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`GNews failed with status ${res.status}`);
  const data = await res.json();
  return data.articles || [];
}

async function fetchFromNewsAPI(apiKey: string): Promise<any[]> {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(SEARCH_QUERY)}&language=en&pageSize=100&sortBy=publishedAt&apiKey=${apiKey}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`NewsAPI failed with status ${res.status}`);
  const data = await res.json();
  return (data.articles || []).filter((a: any) => a.title && a.title !== "[Removed]");
}

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

function processArticles(rawArticles: any[]): NewsItem[] {
  let filteredArticles: (NewsItem & { _stats: ReturnType<typeof getArticleStats> })[] = [];
  const articlePool: (NewsItem & { _stats: ReturnType<typeof getArticleStats> })[] = [];

  for (const a of rawArticles) {
    if (!a.title) continue;

    const stats = getArticleStats(a);
    if (stats.isBlacklisted) continue;

    const newsItem: NewsItem = {
      title: a.title,
      description: a.description,
      content: a.content,
      source: a.source?.name || "Unknown",
      url: a.url,
      publishedAt: a.publishedAt,
      timeAgo: formatTimeAgo(a.publishedAt),
      category: tagCategory(a.title),
      matchedKeywords: stats.matchedKeywords,
      matchedClusters: stats.matchedClusters,
      keywordCount: stats.keywordCount,
      clusterCount: stats.clusterCount
    };

    // Ensure we don't add duplicate articles by URL or Title
    if (articlePool.some(existing => 
      existing.url === newsItem.url || 
      existing.title.toLowerCase().trim() === newsItem.title.toLowerCase().trim()
    )) continue;

    articlePool.push({ ...newsItem, _stats: stats });

    // Base Filtering
    const hasSingleStrong = stats.matchedKeywords.some(kw => SINGLE_STRONG_KEYWORDS.includes(kw));

    if (
      stats.clusterCount >= 2 ||
      (stats.clusterCount === 1 && stats.keywordCount >= 2) ||
      hasSingleStrong
    ) {
      filteredArticles.push(articlePool[articlePool.length - 1]);
    }
  }

  // Relaxation Level 1
  if (filteredArticles.length < 10) {
    for (const item of articlePool) {
      if (filteredArticles.some(f => f.url === item.url)) continue;

      const stats = item._stats;
      const hasRelaxation1 = stats.matchedKeywords.some(kw => RELAXATION_LEVEL_1_KEYWORDS.includes(kw));
      if (stats.keywordCount >= 1 && hasRelaxation1) {
        filteredArticles.push(item);
      }
    }
  }

  // Relaxation Level 2
  if (filteredArticles.length < 10) {
    for (const item of articlePool) {
      if (filteredArticles.some(f => f.url === item.url)) continue;

      const stats = item._stats;
      const hasRelaxation2Title = RELAXATION_LEVEL_2_TITLE_KEYWORDS.some(kw => stats.titleSearchable.includes(kw));
      if (hasRelaxation2Title) {
        filteredArticles.push(item);
      }
    }
  }

  // Relaxation Level 3 (Emergency Fallback)
  // If we still don't have 10 articles, require at least one basic keyword match to prevent completely irrelevant news
  if (filteredArticles.length < 10) {
    for (const item of articlePool) {
      if (filteredArticles.some(f => f.url === item.url)) continue;

      const stats = item._stats;
      const hasBasicRelevance = stats.keywordCount > 0 || 
        /(traffic|highway|expressway|vehicle|car\b|bus\b|truck\b|rto\b|commute|flyover|underpass)/i.test(stats.titleSearchable);

      if (hasBasicRelevance) {
        filteredArticles.push(item);
        if (filteredArticles.length >= 10) break;
      }
    }
  }

  // Final Ranking
  filteredArticles.sort((a, b) => {
    const cCountA = a.clusterCount || 0;
    const cCountB = b.clusterCount || 0;
    if (cCountA !== cCountB) return cCountB - cCountA;

    const kCountA = a.keywordCount || 0;
    const kCountB = b.keywordCount || 0;
    if (kCountA !== kCountB) return kCountB - kCountA;

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Strip _stats from output objects before returning
  const finalArticles = filteredArticles.map(({ _stats, ...rest }) => rest as NewsItem);

  return finalArticles.slice(0, 20); // Aim for 10-20 articles
}

async function getNews(): Promise<NewsItem[]> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const provider = (process.env.NEWS_API_PROVIDER || "all").trim().toLowerCase();
  const gKey = process.env.GNEWS_API_KEY || "";
  const nKey = process.env.NEWS_API_KEY || "";
  let rawArticles: any[] = [];

  // Always try to fetch from both to maximize the pool, unless explicitly restricted
  const fetchPromises: Promise<any[]>[] = [];

  if (gKey && provider !== "newsapi") {
    fetchPromises.push(fetchFromGNews(gKey).catch(err => {
      console.error("[News] GNews Error:", err);
      return [];
    }));
  }

  if (nKey && provider !== "gnews") {
    fetchPromises.push(fetchFromNewsAPI(nKey).catch(err => {
      console.error("[News] NewsAPI Error:", err);
      return [];
    }));
  }

  const results = await Promise.all(fetchPromises);
  for (const items of results) {
    rawArticles = rawArticles.concat(items);
  }

  let finalItems = processArticles(rawArticles);

  _cache = finalItems.length ? finalItems : FALLBACK;
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