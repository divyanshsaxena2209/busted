import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  timeAgo: string;
  category: 'traffic' | 'accident' | 'road safety' | 'general';
}

// ---------------------------------------------------------------------------
// Fallback shown while loading or on error
// ---------------------------------------------------------------------------
const FALLBACK_ITEMS: NewsItem[] = [
  {
    title: 'No live updates available — check back shortly',
    source: 'Busted',
    url: '#',
    publishedAt: new Date().toISOString(),
    timeAgo: 'Just now',
    category: 'general',
  },
];

// ---------------------------------------------------------------------------
// Category dot colour
// ---------------------------------------------------------------------------
const CATEGORY_COLOUR: Record<string, string> = {
  accident: 'bg-red-500',
  traffic: 'bg-orange-400',
  'road safety': 'bg-yellow-400',
  general: 'bg-blue-400',
};

// ---------------------------------------------------------------------------
// Refresh interval: 8 minutes
// ---------------------------------------------------------------------------
const REFRESH_MS = 8 * 60 * 1000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const NewsTicker: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { items: NewsItem[] };
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
        setError(false);
      } else {
        setItems(FALLBACK_ITEMS);
      }
    } catch {
      setError(true);
      setItems(FALLBACK_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + periodic refresh
  useEffect(() => {
    fetchNews();
    const id = setInterval(fetchNews, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchNews]);

  // Duplicate items for seamless infinite scroll
  const displayed = [...items, ...items, ...items];

  return (
    <div className="relative w-full overflow-hidden py-3">
      {/* Fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-policeBlue to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-policeBlue to-transparent z-10 pointer-events-none" />

      {/* Live badge */}
      {!loading && !error && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      )}

      <div className="flex items-center whitespace-nowrap pl-16">
        <motion.div
          className="flex space-x-16"
          animate={{ x: ['0%', '-33.333%'] }}   // one full set width = 33 %
          transition={{
            repeat: Infinity,
            ease: 'linear',
            duration: Math.max(25, displayed.length * 4),
          }}
        >
          {displayed.map((item, idx) => (
            <a
              key={`${item.title}-${idx}`}
              href={item.url !== '#' ? item.url : undefined}
              target={item.url !== '#' ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-white/90 text-sm font-medium
                         hover:text-white transition-colors cursor-pointer"
            >
              {/* Category dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLOUR[item.category] ?? 'bg-blue-400'
                  }`}
              />

              {/* Title */}
              <span className="max-w-[480px] truncate">{item.title}</span>

              {/* Source + time */}
              <span className="text-white/40 text-xs font-normal shrink-0">
                — {item.source} • {item.timeAgo}
              </span>
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
