const axios = require("axios");

/* ============================================
   API CONFIG — 5 APIs for full 18-category coverage
   ============================================ */
const NEWS_API_BASE      = "https://newsapi.org/v2";
const GNEWS_API_BASE     = "https://gnews.io/api/v4";
const MEDIASTACK_BASE    = "http://api.mediastack.com/v1";
const THENEWSAPI_BASE    = "https://api.thenewsapi.com/v1";
const CURRENTS_BASE      = "https://api.currentsapi.services/v1";

const NEWS_API_KEY    = process.env.NEWS_API_KEY;
const GNEWS_API_KEY   = process.env.GNEWS_API_KEY;
const MEDIASTACK_KEY  = process.env.MEDIASTACK_KEY;
const THENEWSAPI_KEY  = process.env.THENEWSAPI_KEY;
const CURRENTS_KEY    = process.env.CURRENTS_KEY;

/* ============================================
   IN-MEMORY CACHE — 30 min TTL
   Prevents burning through daily quotas during testing
   ============================================ */
const cache    = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  console.log(`[Cache] HIT: ${key}`);
  return entry.data;
}

function cacheSet(key, data) {
  if (!data || !data.length) return;
  cache.set(key, { data, ts: Date.now() });
  console.log(`[Cache] SET: ${key} → ${data.length} articles`);
}

/* ============================================
   CATEGORY / KEYWORD MAPPINGS
   ============================================ */

// NewsAPI — only 7 valid categories
const NEWSAPI_CAT = {
  technology: "technology", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "general", education: "general", environment: "science",
  world: "general", finance: "business",
};

// GNews — topic endpoint
const GNEWS_TOPIC = {
  technology: "technology", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "nation", education: "nation", environment: "science",
  world: "world", finance: "business",
};

// MediaStack categories
const MEDIASTACK_CAT = {
  technology: "technology", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "politics", education: "general", environment: "science",
  world: "general", finance: "business",
  // MediaStack supports these directly
  music: "entertainment", art: "entertainment", fashion: "entertainment",
  food: "general", gaming: "technology", travel: "general", religion: "general",
};

// TheNewsAPI categories
const THENEWSAPI_CAT = {
  technology: "tech", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "politics", education: "general", environment: "science",
  world: "world", finance: "finance",
  music: "entertainment", art: "entertainment", fashion: "lifestyle",
  food: "food", gaming: "tech", travel: "travel", religion: "general",
};

// Currents API — language + keyword based
const CURRENTS_LANG = "en";

// Specific keywords per interest — used by all keyword-based APIs
const KEYWORDS = {
  technology:    "technology gadgets software",
  science:       "science research discovery",
  health:        "health medicine wellness",
  business:      "business economy corporate",
  sports:        "sports athletes competition",
  entertainment: "entertainment celebrity movies",
  politics:      "politics government election",
  education:     "education school university",
  environment:   "environment climate nature",
  world:         "world international global news",
  finance:       "finance stocks investment market",
  music:         "music singer album concert band",
  art:           "art painting exhibition museum gallery",
  fashion:       "fashion clothing style designer runway",
  food:          "food recipes cooking cuisine restaurant",
  gaming:        "video games gaming esports console",
  travel:        "travel destinations tourism vacation",
  religion:      "religion church mosque temple faith worship",
};

/* ============================================
   NORMALIZERS — unified article shape
   ============================================ */
const norm = (articleId, title, description, url, urlToImage, source, publishedAt, content, category) => ({
  articleId, title: title || "No Title", description: description || "",
  url: url || "", urlToImage: urlToImage || "",
  source: source || "Unknown", publishedAt: publishedAt || null,
  content: content || "", category: category || "general",
});

const normalizeNewsAPI = (a, i, cat) => norm(
  Buffer.from(a.url || `na-${Date.now()}-${i}`).toString("base64").slice(0, 40),
  a.title, a.description, a.url, a.urlToImage,
  a.source?.name, a.publishedAt, a.content, cat
);

const normalizeGNews = (a, i, cat) => norm(
  Buffer.from(a.url || `gn-${Date.now()}-${i}`).toString("base64").slice(0, 40),
  a.title, a.description, a.url, a.image,        // GNews uses "image"
  a.source?.name, a.publishedAt, a.content, cat
);

const normalizeMediastack = (a, i, cat) => norm(
  Buffer.from(a.url || `ms-${Date.now()}-${i}`).toString("base64").slice(0, 40),
  a.title, a.description, a.url, a.image,
  a.source, a.published_at, "", cat
);

const normalizeTheNewsAPI = (a, i, cat) => norm(
  Buffer.from(a.url || `tn-${Date.now()}-${i}`).toString("base64").slice(0, 40),
  a.title, a.description, a.url, a.image_url,    // TheNewsAPI uses "image_url"
  a.source, a.published_at, "", cat
);

const normalizeCurrents = (a, i, cat) => norm(
  Buffer.from(a.url || `cu-${Date.now()}-${i}`).toString("base64").slice(0, 40),
  a.title, a.description, a.url, a.image,
  a.author, a.published, "", cat
);

/* ============================================
   INDIVIDUAL API FETCHERS
   Each returns [] on failure — never throws
   ============================================ */

// 1. NewsAPI — top-headlines by category
const fromNewsAPI = async (interest, pageSize) => {
  const category = NEWSAPI_CAT[interest];
  if (!category || !NEWS_API_KEY) return [];
  const key = `newsapi:${category}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit.map(a => ({ ...a, category: interest }));
  try {
    const res = await axios.get(`${NEWS_API_BASE}/top-headlines`, {
      params: { category, country: "us", pageSize, apiKey: NEWS_API_KEY },
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]" && a.url)
      .map((a, i) => normalizeNewsAPI(a, i, interest));
    cacheSet(key, articles);
    console.log(`[NewsAPI] ${interest} → ${articles.length}`);
    return articles;
  } catch (e) {
    console.error(`[NewsAPI] error for ${interest}:`, e.response?.data?.message || e.message);
    return [];
  }
};

// 2. GNews — top-headlines by topic
const fromGNews = async (interest, pageSize) => {
  const topic = GNEWS_TOPIC[interest];
  if (!topic || !GNEWS_API_KEY) return [];
  const key = `gnews:topic:${topic}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit.map(a => ({ ...a, category: interest }));
  try {
    const res = await axios.get(`${GNEWS_API_BASE}/top-headlines`, {
      params: { topic, lang: "en", max: Math.min(pageSize, 10), apikey: GNEWS_API_KEY },
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeGNews(a, i, interest));
    cacheSet(key, articles);
    console.log(`[GNews] ${interest} → ${articles.length}`);
    return articles;
  } catch (e) {
    console.error(`[GNews] error for ${interest}:`, e.response?.data || e.message);
    return [];
  }
};

// 3. GNews — keyword search (for interests without topic mapping)
const fromGNewsKeyword = async (interest, pageSize) => {
  if (!GNEWS_API_KEY) return [];
  const q = KEYWORDS[interest] || interest;
  const key = `gnews:kw:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const res = await axios.get(`${GNEWS_API_BASE}/search`, {
      params: { q, lang: "en", max: Math.min(pageSize, 10), sortby: "publishedAt", apikey: GNEWS_API_KEY },
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeGNews(a, i, interest));
    cacheSet(key, articles);
    console.log(`[GNews-KW] ${interest} → ${articles.length}`);
    return articles;
  } catch (e) {
    console.error(`[GNews-KW] error for ${interest}:`, e.response?.data || e.message);
    return [];
  }
};

// 4. MediaStack — news by keyword
const fromMediastack = async (interest, pageSize) => {
  if (!MEDIASTACK_KEY) return [];
  const q = KEYWORDS[interest] || interest;
  const key = `ms:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const res = await axios.get(`${MEDIASTACK_BASE}/news`, {
      params: { access_key: MEDIASTACK_KEY, keywords: q, languages: "en", limit: Math.min(pageSize, 25), sort: "published_desc" },
    });
    const articles = (res.data.data || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeMediastack(a, i, interest));
    cacheSet(key, articles);
    console.log(`[Mediastack] ${interest} → ${articles.length}`);
    return articles;
  } catch (e) {
    console.error(`[Mediastack] error for ${interest}:`, e.response?.data || e.message);
    return [];
  }
};

// 5. TheNewsAPI — news by category or keyword
const fromTheNewsAPI = async (interest, pageSize) => {
  if (!THENEWSAPI_KEY) return [];
  const category = THENEWSAPI_CAT[interest];
  const key = `tn:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const params = {
      api_token: THENEWSAPI_KEY,
      language: "en",
      limit: Math.min(pageSize, 3),  // free plan = 3 per request
    };
    if (category && category !== "general") params.categories = category;
    else params.search = KEYWORDS[interest] || interest;

    const res = await axios.get(`${THENEWSAPI_BASE}/news/all`, { params });
    const articles = (res.data.data || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeTheNewsAPI(a, i, interest));
    cacheSet(key, articles);
    console.log(`[TheNewsAPI] ${interest} → ${articles.length}`);
    return articles;
  } catch (e) {
    console.error(`[TheNewsAPI] error for ${interest}:`, e.response?.data || e.message);
    return [];
  }
};

// 6. Currents API — keyword search
const fromCurrents = async (interest, pageSize) => {
  if (!CURRENTS_KEY) return [];
  const q = KEYWORDS[interest] || interest;
  const key = `cu:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const res = await axios.get(`${CURRENTS_BASE}/search`, {
      params: { keywords: q, language: CURRENTS_LANG, limit: Math.min(pageSize, 20), apiKey: CURRENTS_KEY },
    });
    const articles = (res.data.news || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeCurrents(a, i, interest));
    cacheSet(key, articles);
    console.log(`[Currents] ${interest} → ${articles.length}`);
    return articles;
  } catch (e) {
    console.error(`[Currents] error for ${interest}:`, e.response?.data || e.message);
    return [];
  }
};

/* ============================================
   SMART FETCHER
   Tries all APIs in priority order, stops when
   we have enough articles. Combines results if needed.
   ============================================ */

// Which APIs to try per interest, in order
const API_PRIORITY = {
  // Tier 1: NewsAPI + GNews topic cover these well
  technology:    [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  science:       [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  health:        [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  business:      [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  sports:        [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  entertainment: [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  politics:      [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  education:     [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  environment:   [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  world:         [fromNewsAPI, fromGNews, fromMediastack, fromTheNewsAPI, fromCurrents],
  finance:       [fromNewsAPI, fromGNews, fromTheNewsAPI, fromMediastack, fromCurrents],
  // Tier 2: NewsAPI/GNews can't handle these — start with keyword APIs
  music:         [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  art:           [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  fashion:       [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  food:          [fromGNewsKeyword, fromMediastack, fromTheNewsAPI, fromCurrents, fromGNews],
  gaming:        [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  travel:        [fromGNewsKeyword, fromMediastack, fromTheNewsAPI, fromCurrents, fromGNews],
  religion:      [fromCurrents, fromMediastack, fromGNewsKeyword, fromTheNewsAPI, fromGNews],
};

const fetchForInterest = async (interest, pageSize = 10) => {
  const apiFns = API_PRIORITY[interest] || [fromNewsAPI, fromGNews, fromMediastack, fromCurrents];
  const seen   = new Set();

  for (const apiFn of apiFns) {
    try {
      const articles = await apiFn(interest, pageSize);
      const fresh = articles.filter(a => a.url && !seen.has(a.url));
      fresh.forEach(a => seen.add(a.url));
      if (fresh.length >= 5) {
        console.log(`[Smart] "${interest}" satisfied by ${apiFn.name} (${fresh.length} articles)`);
        return fresh.slice(0, pageSize);
      }
    } catch (e) {
      console.error(`[Smart] ${apiFn.name} threw for "${interest}":`, e.message);
    }
  }

  // If no single API gave 5+, combine whatever we got
  console.warn(`[Smart] "${interest}" — combining partial results from all APIs`);
  const allResults = await Promise.allSettled(
    apiFns.map(fn => fn(interest, pageSize))
  );
  const combined = new Map();
  allResults.forEach(r => {
    if (r.status === "fulfilled") {
      r.value.forEach(a => { if (a.url && !combined.has(a.url)) combined.set(a.url, a); });
    }
  });
  return [...combined.values()].slice(0, pageSize);
};

/* ============================================
   PUBLIC EXPORTS
   ============================================ */

const fetchByInterests = async (interests, language = "en", { page = 1, pageSize = 20 } = {}) => {
  const topInterests = interests.slice(0, 3);
  const perInterest  = Math.ceil(pageSize / topInterests.length);
  console.log(`\n[fetchByInterests] interests=[${topInterests.join(", ")}]`);

  const results = await Promise.all(
    topInterests.map(interest => fetchForInterest(interest, perInterest))
  );

  const seen = new Set();
  return results
    .flat()
    .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
    .slice(0, pageSize);
};

const searchNews = async (keyword, { page = 1, pageSize = 10 } = {}) => {
  console.log(`\n[searchNews] "${keyword}"`);
  const cacheKey = `search:${keyword}:${pageSize}`;
  const hit = cacheGet(cacheKey); if (hit) return hit;

  // Try all search-capable APIs in parallel, use first good result
  const [gnews, currents, mediastack, thenews] = await Promise.allSettled([
    GNEWS_API_KEY ? axios.get(`${GNEWS_API_BASE}/search`, {
      params: { q: keyword, lang: "en", max: Math.min(pageSize, 10), sortby: "relevance", apikey: GNEWS_API_KEY },
    }).then(r => (r.data.articles || []).filter(a => a.title && a.url).map((a, i) => normalizeGNews(a, i, "general"))) : Promise.resolve([]),

    CURRENTS_KEY ? axios.get(`${CURRENTS_BASE}/search`, {
      params: { keywords: keyword, language: "en", limit: Math.min(pageSize, 20), apiKey: CURRENTS_KEY },
    }).then(r => (r.data.news || []).filter(a => a.title && a.url).map((a, i) => normalizeCurrents(a, i, "general"))) : Promise.resolve([]),

    MEDIASTACK_KEY ? axios.get(`${MEDIASTACK_BASE}/news`, {
      params: { access_key: MEDIASTACK_KEY, keywords: keyword, languages: "en", limit: Math.min(pageSize, 25) },
    }).then(r => (r.data.data || []).filter(a => a.title && a.url).map((a, i) => normalizeMediastack(a, i, "general"))) : Promise.resolve([]),

    THENEWSAPI_KEY ? axios.get(`${THENEWSAPI_BASE}/news/all`, {
      params: { api_token: THENEWSAPI_KEY, search: keyword, language: "en", limit: 3 },
    }).then(r => (r.data.data || []).filter(a => a.title && a.url).map((a, i) => normalizeTheNewsAPI(a, i, "general"))) : Promise.resolve([]),
  ]);

  const seen = new Set();
  const combined = [gnews, currents, mediastack, thenews]
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value)
    .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
    .slice(0, pageSize);

  if (combined.length > 0) { cacheSet(cacheKey, combined); return combined; }

  // Last resort: NewsAPI /everything
  try {
    const res = await axios.get(`${NEWS_API_BASE}/everything`, {
      params: { q: keyword, sortBy: "relevancy", language: "en", pageSize, apiKey: NEWS_API_KEY },
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]" && a.url)
      .map((a, i) => normalizeNewsAPI(a, i, "general"));
    if (articles.length) { cacheSet(cacheKey, articles); return articles; }
  } catch (e) {
    console.error(`[NewsAPI] search fallback error:`, e.message);
  }

  return [];
};

const fetchTopHeadlines = async (category = "general", language = "en", { pageSize = 10 } = {}) => {
  console.log(`\n[fetchTopHeadlines] category="${category}"`);
  return fetchForInterest(category, pageSize);
};

// Keep this export so article.controller.js can still call it directly
const fetchByCategory = async (category, pageSize = 10) => {
  return fetchForInterest(category, pageSize);
};

module.exports = {
  fetchByCategory,
  fetchByInterests,
  searchNews,
  fetchTopHeadlines,
};