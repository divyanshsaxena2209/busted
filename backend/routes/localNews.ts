import express, { Router, type Request, type Response } from "express";
import { supabase } from "../db/supabaseClient.ts";

const router = Router();

// ─── In-memory cache ──────────────────────────────────────────────────────────
interface CacheEntry {
  data: LocalNewsResponse;
  expiresAt: number;
}

interface NewsItem {
  title: string;
  source: string;
  url: string;
  timeAgo: string;
  category: string;
}

interface LocalNewsResponse {
  items: NewsItem[];
  message?: string;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a UTC date string to a human-readable "X ago" string.
 */
function toTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Tags category from title keywords.
 */
function tagCategory(title: string): string {
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

/**
 * Builds the traffic-focused search query scoped to a district.
 */
function buildQuery(district: string): string {
  return `${district} traffic OR accident OR road blockage OR highway jam`;
}

/**
 * Fetches and filters local traffic news for a given district.
 * Tries GNews first. If it fails or no key is present, falls back to NewsAPI.
 */
async function fetchLocalNews(district: string): Promise<LocalNewsResponse> {
  const query = buildQuery(district);
  let gNewsSucceeded = false;
  let itemsToReturn: NewsItem[] = [];

  // ── GNews (Primary) ─────────────────────────────────────────────────────────
  if (process.env.GNEWS_API_KEY) {
    try {
      const url = new URL("https://gnews.io/api/v4/search");
      url.searchParams.set("q", query);
      url.searchParams.set("lang", "en");
      url.searchParams.set("max", "20");
      url.searchParams.set("apikey", process.env.GNEWS_API_KEY);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        
        const filtered: NewsItem[] = (json.articles ?? [])
          .filter((a: any) =>
            a.title?.toLowerCase().includes(district.toLowerCase())
          )
          .filter((a: any) => {
             const age = Date.now() - new Date(a.publishedAt).getTime();
             return age < 7 * 24 * 60 * 60 * 1000;
          })
          .sort((a: any, b: any) => {
            const aExact = a.title.toLowerCase().startsWith(district.toLowerCase()) ? 0 : 1;
            const bExact = b.title.toLowerCase().startsWith(district.toLowerCase()) ? 0 : 1;
            return aExact - bExact;
          })
          .map((a: any) => ({
            title: a.title,
            source: a.source?.name ?? "Unknown",
            url: a.url,
            timeAgo: toTimeAgo(a.publishedAt),
            category: tagCategory(a.title),
          }));
          
        itemsToReturn = filtered;
        gNewsSucceeded = true;
      } else {
        console.warn(`[localNews] GNews returned ${res.status}. Falling back to NewsAPI...`);
      }
    } catch(e: any) {
       console.warn(`[localNews] GNews fetch failed: ${e.message}. Falling back to NewsAPI...`);
    }
  }

  // If GNews succeeded, return the results
  if (gNewsSucceeded) {
      if (itemsToReturn.length === 0) {
          return { items: [], message: "No local updates available" };
      }
      return { items: itemsToReturn };
  }

  // ── NewsAPI (Fallback) ──────────────────────────────────────────────────────
  if (process.env.NEWS_API_KEY) {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", query);
    url.searchParams.set("language", "en");
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("apiKey", process.env.NEWS_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
    const json = await res.json();

    const filtered: NewsItem[] = (json.articles ?? [])
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .filter((a: any) =>
        a.title?.toLowerCase().includes(district.toLowerCase())
      )
      .filter((a: any) => {
         const age = Date.now() - new Date(a.publishedAt).getTime();
         return age < 7 * 24 * 60 * 60 * 1000;
      })
      .sort((a: any, b: any) => {
        const aExact = a.title.toLowerCase().startsWith(district.toLowerCase()) ? 0 : 1;
        const bExact = b.title.toLowerCase().startsWith(district.toLowerCase()) ? 0 : 1;
        return aExact - bExact;
      })
      .map((a: any) => ({
        title: a.title,
        source: a.source?.name ?? "Unknown",
        url: a.url,
        timeAgo: toTimeAgo(a.publishedAt),
        category: tagCategory(a.title),
      }));

    if (filtered.length === 0) {
      return { items: [], message: "No local updates available" };
    }
    return { items: filtered };
  }

  throw new Error("No news API key configured (GNEWS_API_KEY or NEWS_API_KEY)");
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * GET /api/news/local?district=<district_name>&userId=<user_id>
 *
 * Returns personalized traffic news filtered to the given district.
 * If userId is provided, it falls back to querying the user's district from Supabase.
 * Results are cached per-district for 5 minutes.
 */
router.get("/", async (req: Request, res: Response) => {
  let district = (req.query.district as string | undefined)?.trim();
  const userId = (req.query.userId as string | undefined)?.trim();

  // Fallback to Supabase Database to fetch the district based on user_id
  if (!district && userId && supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("district")
        .eq("id", userId)
        .single();

      if (!error && data?.district) {
        district = data.district;
      }
    } catch (dbErr) {
      console.error("[localNews] Supabase fetch error inside /api/news/local:", dbErr);
    }
  }

  if (!district) {
    return res.status(400).json({
      items: [],
      message: "Missing required query param: district or valid userId",
    });
  }

  // Normalize cache key
  const cacheKey = district.toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    const data = await fetchLocalNews(district);

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return res.json(data);
  } catch (err: any) {
    console.error("[localNews] fetch error:", err?.message ?? err);
    return res.status(500).json({
      items: [],
      message: "Failed to fetch local news. Please try again later.",
    });
  }
});

export default router;