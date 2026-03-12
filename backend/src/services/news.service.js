const axios = require("axios");

/* ============================================
   API CONFIG
   ============================================ */
const NEWS_API_BASE  = "https://newsapi.org/v2";
const GNEWS_API_BASE = "https://gnews.io/api/v4";
const MEDIASTACK_BASE = "http://api.mediastack.com/v1";
const THENEWSAPI_BASE = "https://api.thenewsapi.com/v1";
const CURRENTS_BASE  = "https://api.currentsapi.services/v1";

const NEWS_API_KEY   = process.env.NEWS_API_KEY;
const GNEWS_API_KEY  = process.env.GNEWS_API_KEY;
const MEDIASTACK_KEY = process.env.MEDIASTACK_KEY;
const THENEWSAPI_KEY = process.env.THENEWSAPI_KEY;
const CURRENTS_KEY   = process.env.CURRENTS_KEY;

/* ============================================
   CACHE — 30 min TTL
   ============================================ */
const cache = new Map();
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
   CATEGORY MAPPINGS
   ============================================ */
const NEWSAPI_CAT = {
  technology: "technology", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "general", education: "general", environment: "science",
  world: "general", finance: "business",
};

const GNEWS_TOPIC = {
  technology: "technology", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "nation", education: "nation", environment: "science",
  world: "world", finance: "business",
};

const THENEWSAPI_CAT = {
  technology: "tech", science: "science", health: "health",
  business: "business", sports: "sports", entertainment: "entertainment",
  politics: "politics", education: "general", environment: "science",
  world: "world", finance: "finance",
  music: "entertainment", art: "entertainment", fashion: "lifestyle",
  food: "food", gaming: "tech", travel: "travel", religion: "general",
};

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
   NORMALIZERS
   ============================================ */
const norm = (articleId, title, description, url, urlToImage, source, publishedAt, content, category) => ({
  articleId, title: title || "No Title", description: description || "",
  url: url || "", urlToImage: urlToImage || "",
  source: source || "Unknown", publishedAt: publishedAt || null,
  content: content || "", category: category || "general",
});

const normalizeNewsAPI     = (a, i, cat) => norm(Buffer.from(a.url||`na-${i}`).toString("base64").slice(0,40), a.title, a.description, a.url, a.urlToImage, a.source?.name, a.publishedAt, a.content, cat);
const normalizeGNews       = (a, i, cat) => norm(Buffer.from(a.url||`gn-${i}`).toString("base64").slice(0,40), a.title, a.description, a.url, a.image, a.source?.name, a.publishedAt, a.content, cat);
const normalizeMediastack  = (a, i, cat) => norm(Buffer.from(a.url||`ms-${i}`).toString("base64").slice(0,40), a.title, a.description, a.url, a.image, a.source, a.published_at, "", cat);
const normalizeTheNewsAPI  = (a, i, cat) => norm(Buffer.from(a.url||`tn-${i}`).toString("base64").slice(0,40), a.title, a.description, a.url, a.image_url, a.source, a.published_at, "", cat);
const normalizeCurrents    = (a, i, cat) => norm(Buffer.from(a.url||`cu-${i}`).toString("base64").slice(0,40), a.title, a.description, a.url, a.image, a.author, a.published, "", cat);

/* ============================================
   INDIVIDUAL FETCHERS — each returns [] on failure
   All have a 5s timeout to prevent hanging
   ============================================ */
const TIMEOUT = 5000; // 5 seconds max per API call

const fromNewsAPI = async (interest, pageSize) => {
  const category = NEWSAPI_CAT[interest];
  if (!category || !NEWS_API_KEY) return [];
  const key = `newsapi:${category}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit.map(a => ({ ...a, category: interest }));
  try {
    const res = await axios.get(`${NEWS_API_BASE}/top-headlines`, {
      params: { category, country: "us", pageSize, apiKey: NEWS_API_KEY },
      timeout: TIMEOUT,
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]" && a.url)
      .map((a, i) => normalizeNewsAPI(a, i, interest));
    cacheSet(key, articles);
    return articles;
  } catch (e) { console.error(`[NewsAPI] ${interest}:`, e.message); return []; }
};

const fromGNews = async (interest, pageSize) => {
  const topic = GNEWS_TOPIC[interest];
  if (!topic || !GNEWS_API_KEY) return [];
  const key = `gnews:topic:${topic}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit.map(a => ({ ...a, category: interest }));
  try {
    const res = await axios.get(`${GNEWS_API_BASE}/top-headlines`, {
      params: { topic, lang: "en", max: Math.min(pageSize, 10), apikey: GNEWS_API_KEY },
      timeout: TIMEOUT,
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeGNews(a, i, interest));
    cacheSet(key, articles);
    return articles;
  } catch (e) { console.error(`[GNews] ${interest}:`, e.message); return []; }
};

const fromGNewsKeyword = async (interest, pageSize) => {
  if (!GNEWS_API_KEY) return [];
  const q = KEYWORDS[interest] || interest;
  const key = `gnews:kw:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const res = await axios.get(`${GNEWS_API_BASE}/search`, {
      params: { q, lang: "en", max: Math.min(pageSize, 10), sortby: "publishedAt", apikey: GNEWS_API_KEY },
      timeout: TIMEOUT,
    });
    const articles = (res.data.articles || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeGNews(a, i, interest));
    cacheSet(key, articles);
    return articles;
  } catch (e) { console.error(`[GNews-KW] ${interest}:`, e.message); return []; }
};

const fromMediastack = async (interest, pageSize) => {
  if (!MEDIASTACK_KEY) return [];
  const q = KEYWORDS[interest] || interest;
  const key = `ms:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const res = await axios.get(`${MEDIASTACK_BASE}/news`, {
      params: { access_key: MEDIASTACK_KEY, keywords: q, languages: "en", limit: Math.min(pageSize, 25), sort: "published_desc" },
      timeout: TIMEOUT,
    });
    const articles = (res.data.data || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeMediastack(a, i, interest));
    cacheSet(key, articles);
    return articles;
  } catch (e) { console.error(`[Mediastack] ${interest}:`, e.message); return []; }
};

const fromTheNewsAPI = async (interest, pageSize) => {
  if (!THENEWSAPI_KEY) return [];
  const category = THENEWSAPI_CAT[interest];
  const key = `tn:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const params = { api_token: THENEWSAPI_KEY, language: "en", limit: Math.min(pageSize, 3) };
    if (category && category !== "general") params.categories = category;
    else params.search = KEYWORDS[interest] || interest;
    const res = await axios.get(`${THENEWSAPI_BASE}/news/all`, { params, timeout: TIMEOUT });
    const articles = (res.data.data || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeTheNewsAPI(a, i, interest));
    cacheSet(key, articles);
    return articles;
  } catch (e) { console.error(`[TheNewsAPI] ${interest}:`, e.message); return []; }
};

const fromCurrents = async (interest, pageSize) => {
  if (!CURRENTS_KEY) return [];
  const q = KEYWORDS[interest] || interest;
  const key = `cu:${interest}:${pageSize}`;
  const hit = cacheGet(key); if (hit) return hit;
  try {
    const res = await axios.get(`${CURRENTS_BASE}/search`, {
      params: { keywords: q, language: "en", limit: Math.min(pageSize, 20), apiKey: CURRENTS_KEY },
      timeout: TIMEOUT,
    });
    const articles = (res.data.news || [])
      .filter(a => a.title && a.url)
      .map((a, i) => normalizeCurrents(a, i, interest));
    cacheSet(key, articles);
    return articles;
  } catch (e) { console.error(`[Currents] ${interest}:`, e.message); return []; }
};

/* ============================================
   SMART FETCHER — PARALLEL (KEY CHANGE)
   Fire ALL relevant APIs at once, use first
   that returns ≥5 articles. No more waiting in line.
   ============================================ */

const API_PRIORITY = {
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
  music:         [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  art:           [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  fashion:       [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  food:          [fromGNewsKeyword, fromMediastack, fromTheNewsAPI, fromCurrents, fromGNews],
  gaming:        [fromGNewsKeyword, fromTheNewsAPI, fromMediastack, fromCurrents, fromGNews],
  travel:        [fromGNewsKeyword, fromMediastack, fromTheNewsAPI, fromCurrents, fromGNews],
  religion:      [fromCurrents, fromMediastack, fromGNewsKeyword, fromTheNewsAPI, fromGNews],
};

const fetchForInterest = async (interest, pageSize = 9) => {
  const cacheKey = `smart:${interest}:${pageSize}`;
  const hit = cacheGet(cacheKey); if (hit) return hit;

  const apiFns = API_PRIORITY[interest] || [fromNewsAPI, fromGNews, fromMediastack, fromCurrents];

  // ── PARALLEL RACE ──
  // Fire all APIs simultaneously. Resolve as soon as any returns ≥5 articles.
  // Others keep running but we use first good result.
  const result = await new Promise((resolve) => {
    let settled = false;
    let completed = 0;
    const allResults = [];

    apiFns.forEach(async (fn) => {
      try {
        const articles = await fn(interest, pageSize);
        allResults.push(...articles);
        completed++;

        if (!settled && articles.length >= 5) {
          settled = true;
          console.log(`[Smart] "${interest}" → ${fn.name} won race (${articles.length})`);
          resolve(articles.slice(0, pageSize));
        } else if (completed === apiFns.length && !settled) {
          // All done, none had ≥5 — combine everything
          const seen = new Map();
          allResults.forEach(a => { if (a.url && !seen.has(a.url)) seen.set(a.url, a); });
          console.warn(`[Smart] "${interest}" → combined ${seen.size} from all APIs`);
          resolve([...seen.values()].slice(0, pageSize));
        }
      } catch (e) {
        completed++;
        if (completed === apiFns.length && !settled) {
          resolve([]);
        }
      }
    });

    // Safety timeout — resolve with whatever we have after 8s
    setTimeout(() => {
      if (!settled) {
        settled = true;
        const seen = new Map();
        allResults.forEach(a => { if (a.url && !seen.has(a.url)) seen.set(a.url, a); });
        console.warn(`[Smart] "${interest}" → timeout fallback (${seen.size} articles)`);
        resolve([...seen.values()].slice(0, pageSize));
      }
    }, 8000);
  });

  if (result.length > 0) cacheSet(cacheKey, result);
  return result;
};

/* ============================================
   PUBLIC EXPORTS
   ============================================ */

const fetchByInterests = async (interests, language = "en", { page = 1, pageSize = 9 } = {}) => {
  const topInterests = interests.slice(0, 3);
  const perInterest  = Math.ceil(pageSize / topInterests.length);
  console.log(`\n[fetchByInterests] interests=[${topInterests.join(", ")}] PARALLEL`);

  // All interests fire in parallel — total wait = slowest single interest, not sum of all
  const results = await Promise.all(
    topInterests.map(interest => fetchForInterest(interest, perInterest))
  );

  const seen = new Set();
  return results
    .flat()
    .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
    .slice(0, pageSize);
};

const searchNews = async (keyword, { page = 1, pageSize = 9 } = {}) => {
  console.log(`\n[searchNews] "${keyword}"`);
  const cacheKey = `search:${keyword}:${pageSize}`;
  const hit = cacheGet(cacheKey); if (hit) return hit;

  const [gnews, currents, mediastack, thenews] = await Promise.allSettled([
    GNEWS_API_KEY ? axios.get(`${GNEWS_API_BASE}/search`, {
      params: { q: keyword, lang: "en", max: Math.min(pageSize, 10), sortby: "relevance", apikey: GNEWS_API_KEY },
      timeout: TIMEOUT,
    }).then(r => (r.data.articles||[]).filter(a=>a.title&&a.url).map((a,i)=>normalizeGNews(a,i,"general"))) : Promise.resolve([]),

    CURRENTS_KEY ? axios.get(`${CURRENTS_BASE}/search`, {
      params: { keywords: keyword, language: "en", limit: Math.min(pageSize, 20), apiKey: CURRENTS_KEY },
      timeout: TIMEOUT,
    }).then(r => (r.data.news||[]).filter(a=>a.title&&a.url).map((a,i)=>normalizeCurrents(a,i,"general"))) : Promise.resolve([]),

    MEDIASTACK_KEY ? axios.get(`${MEDIASTACK_BASE}/news`, {
      params: { access_key: MEDIASTACK_KEY, keywords: keyword, languages: "en", limit: Math.min(pageSize, 25) },
      timeout: TIMEOUT,
    }).then(r => (r.data.data||[]).filter(a=>a.title&&a.url).map((a,i)=>normalizeMediastack(a,i,"general"))) : Promise.resolve([]),

    THENEWSAPI_KEY ? axios.get(`${THENEWSAPI_BASE}/news/all`, {
      params: { api_token: THENEWSAPI_KEY, search: keyword, language: "en", limit: 3 },
      timeout: TIMEOUT,
    }).then(r => (r.data.data||[]).filter(a=>a.title&&a.url).map((a,i)=>normalizeTheNewsAPI(a,i,"general"))) : Promise.resolve([]),
  ]);

  const seen = new Set();
  const combined = [gnews, currents, mediastack, thenews]
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value)
    .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
    .slice(0, pageSize);

  if (combined.length > 0) { cacheSet(cacheKey, combined); return combined; }

  try {
    const res = await axios.get(`${NEWS_API_BASE}/everything`, {
      params: { q: keyword, sortBy: "relevancy", language: "en", pageSize, apiKey: NEWS_API_KEY },
      timeout: TIMEOUT,
    });
    const articles = (res.data.articles||[])
      .filter(a => a.title && a.title !== "[Removed]" && a.url)
      .map((a, i) => normalizeNewsAPI(a, i, "general"));
    if (articles.length) { cacheSet(cacheKey, articles); return articles; }
  } catch (e) { console.error(`[NewsAPI] search fallback:`, e.message); }

  return [];
};

const fetchTopHeadlines = async (category = "general", language = "en", { pageSize = 9 } = {}) => {
  console.log(`\n[fetchTopHeadlines] category="${category}"`);
  return fetchForInterest(category, pageSize);
};

const fetchByCategory = async (category, pageSize = 9) => {
  return fetchForInterest(category, pageSize);
};

module.exports = { fetchByCategory, fetchByInterests, searchNews, fetchTopHeadlines };