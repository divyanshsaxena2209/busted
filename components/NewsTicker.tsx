import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NewsItem {
  title: string;
  source: string;
  url: string;
  timeAgo: string;
  category: string;
}

const ERROR_FALLBACK = [
  {
    title: 'Network Error: Cannot connect to news feed',
    source: 'Busted System',
    url: '#',
    timeAgo: 'Just now',
    category: 'closures',
  }
];

const COLORS: Record<string, string> = {
  policy: 'bg-indigo-400',
  tolls: 'bg-emerald-400',
  closures: 'bg-red-600',
  'public transport': 'bg-green-400',
  infrastructure: 'bg-purple-400',
  weather: 'bg-cyan-400',
  accident: 'bg-red-500',
  traffic: 'bg-orange-400',
  general: 'bg-blue-400',
};

export const NewsTicker: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([{
    title: 'Loading live traffic updates...',
    source: 'System',
    url: '#',
    timeAgo: 'Just now',
    category: 'general'
  }]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Route not found or server error');

      const data = await res.json();
      if (data?.items?.length) {
        setItems(data.items);
      } else {
        setItems(ERROR_FALLBACK);
      }
    } catch (err) {
      setItems(ERROR_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 14400000);
    return () => clearInterval(interval);
  }, []);

  // Duplicate exactly once for a perfect 50% seamless loop
  const display = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden py-3 bg-black/20">
      {/* Fade Masks for smooth entry/exit */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* LIVE badge */}
      {!loading && items[0].source !== 'System' && items[0].source !== 'Busted System' && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-red-400 text-xs font-bold z-20 bg-background/90 px-2 py-1 rounded">
          ● LIVE
        </div>
      )}

      {/* Ticker Container */}
      <div className="flex w-full">
        <motion.div
          className="flex space-x-12 pl-12 w-max" // w-max ensures it doesn't squish
          animate={{ x: ['0%', '-50%'] }} // Perfectly shifts by exactly one array length
          transition={{
            repeat: Infinity,
            duration: 30, // Decreased from 35. Lower number = faster speed!
            ease: 'linear'
          }}
        >
          {display.map((item, i) => (
            <a
              key={i}
              href={item.url !== '#' ? item.url : undefined}
              target={item.url !== '#' ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-sm text-white ${item.url !== '#' ? 'hover:text-blue-300 transition-colors cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${COLORS[item.category] || COLORS.general}`} />
              <span className="whitespace-nowrap font-medium">{item.title}</span>
              <span className="text-white/40 text-xs whitespace-nowrap">
                — {item.source} • {item.timeAgo}
              </span>
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  );
};