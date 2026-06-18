const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const SEARCH_QUERY = 'India AND (traffic OR accident OR highway OR expressway OR toll OR RTO OR challan)';

const KEYWORD_CLUSTERS = {
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
  "factory", "industrial", "steel plant", "chemical leak", "bomb blast", "israel", "iran", "trump", "ceasefire", "gaza", "russia", "ukraine", "strait", "hormuz", "vessel", "navy", "maritime"
];

function getArticleStats(article) {
  const matchedKeywords = [];
  const matchedClusters = [];
  const titleSearchable = (article.title || "").toLowerCase();
  const searchableText = [
    titleSearchable,
    (article.description || "").toLowerCase(),
    (article.content || "").toLowerCase()
  ].join(" ");

  for (const word of BLACKLIST_KEYWORDS) {
    if (searchableText.includes(word.toLowerCase())) {
      return { isBlacklisted: true, keywordCount: 0, clusterCount: 0, matchedKeywords: [], matchedClusters: [], titleSearchable, searchableText, hit: word };
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

async function test() {
  const gKey = process.env.GNEWS_API_KEY;
  const nKey = process.env.NEWS_API_KEY;
  let rawArticles = [];

  if (gKey) {
    const res = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(SEARCH_QUERY)}&lang=en&country=in&max=100&sortby=publishedAt&apikey=${gKey}`);
    const data = await res.json();
    rawArticles = rawArticles.concat(data.articles || []);
  }
  if (nKey) {
    const res2 = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(SEARCH_QUERY)}&language=en&pageSize=100&sortBy=publishedAt&apiKey=${nKey}`);
    const data2 = await res2.json();
    rawArticles = rawArticles.concat(data2.articles || []);
  }

  let filteredArticles = [];
  const articlePool = [];

  console.log('Total Raw:', rawArticles.length);
  let blacklistCount = 0;

  for (const a of rawArticles) {
    if (!a.title || a.title === '[Removed]') continue;
    
    const stats = getArticleStats(a);
    if (stats.isBlacklisted) {
      blacklistCount++;
      continue;
    }

    const newsItem = {
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
    };

    if (articlePool.some(existing => 
      existing.url === newsItem.url || 
      existing.title.toLowerCase().trim() === newsItem.title.toLowerCase().trim()
    )) continue;

    articlePool.push({ ...newsItem, _stats: stats });
    
    const hasSingleStrong = stats.matchedKeywords.some(kw => SINGLE_STRONG_KEYWORDS.includes(kw));
    
    if (
      stats.clusterCount >= 2 || 
      (stats.clusterCount === 1 && stats.keywordCount >= 2) || 
      hasSingleStrong
    ) {
      filteredArticles.push(articlePool[articlePool.length - 1]);
    }
  }

  console.log('Blacklisted count:', blacklistCount);
  console.log('Base Filtering count:', filteredArticles.length);

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
  console.log('After R1 count:', filteredArticles.length);

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
  console.log('After R2 count:', filteredArticles.length);

  if (filteredArticles.length < 10) {
    for (const item of articlePool) {
      if (filteredArticles.some(f => f.url === item.url)) continue;
      filteredArticles.push(item);
      if (filteredArticles.length >= 10) break;
    }
  }
  console.log('After Fallback 3 count:', filteredArticles.length);
  console.log('Total non-blacklisted article pool size:', articlePool.length);

}

test();
