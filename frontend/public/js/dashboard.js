/* ============================================
   FOCUSFEED — Dashboard Logic
   ============================================ */

let currentPage = 1;
let currentCategory = 'all';
let isLoading = false;
let allArticles = [];

async function initDashboard() {
  if (!await requireAuth()) return;
  initNavUser();

  const user = getUser();
  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = `Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0] || 'Reader'}`;

  buildFilterChips(user?.interests || []);
  await loadFeed();

  const searchInput = document.getElementById('search-input');
  let searchTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { if (!q) loadFeed(); return; }
    searchTimer = setTimeout(() => runSearch(q), 500);
  });
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(searchTimer); runSearch(e.target.value.trim()); }
  });

  document.getElementById('load-more-btn')?.addEventListener('click', loadMore);
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function buildFilterChips(interests) {
  const row = document.getElementById('filter-row');
  if (!row) return;
  const all = ['all', ...interests];
  row.innerHTML = all.map(cat => `
    <button
      class="filter-chip ${cat === currentCategory ? 'active' : ''}"
      data-category="${cat}"
      onclick="setCategory('${cat}')">
      ${cat === 'all' ? '<img src="/icons/All.svg" class="svg-icon svg-icon-sm" alt=""> All' : `${categoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
    </button>`).join('');
}

window.setCategory = async (cat) => {
  currentCategory = cat;
  currentPage = 1;

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === cat);
  });

  if (cat === 'all') {
    await loadFeed();
  } else {
    await loadTopHeadlines(cat);
  }
};

async function loadFeed() {
  setFeedLoading(true);
  const loadMoreBtn = document.getElementById('load-more-btn');
  try {
    const data = await Articles.getFeed(1, 9);
    allArticles = data.data.articles || [];
    allArticles.forEach(cacheArticle);
    renderFeed(allArticles);
    if (loadMoreBtn) loadMoreBtn.style.display = allArticles.length >= 5 ? 'inline-flex' : 'none';
  } catch (err) {
    showFeedError(err.message);
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  } finally {
    setFeedLoading(false);
  }
}

async function loadTopHeadlines(category) {
  setFeedLoading(true);
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  try {
    const data = await Articles.getTopHeadlines(category, 9);
    allArticles = data.data.articles || [];

    // ✅ FIX: Force correct category label on every article so cards always
    // show "music" not "entertainment", "environment" not "science", etc.
    allArticles = allArticles.map(a => ({ ...a, category }));
    allArticles.forEach(cacheArticle);

    const label = `${categoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
    renderFeed(allArticles, label);
  } catch (err) {
    showFeedError(err.message);
  } finally {
    setFeedLoading(false);
  }
}

async function runSearch(q) {
  if (!q) return;
  setFeedLoading(true);
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === 'all');
  });
  try {
    const data = await Articles.search(q);
    allArticles = data.data.articles || [];
    allArticles.forEach(cacheArticle);
    renderFeed(allArticles, `Results for "${q}"`);
  } catch (err) {
    showFeedError(err.message);
  } finally {
    setFeedLoading(false);
  }
}

async function loadMore() {
  if (isLoading) return;
  currentPage++;
  isLoading = true;
  const btn = document.getElementById('load-more-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  try {
    // Fetch top headlines for a different general category each time
    // since news APIs don't support true pagination on free plans
    const fallbackCategories = ['world', 'technology', 'science', 'health', 'business', 'sports'];
    const cat = fallbackCategories[(currentPage - 2) % fallbackCategories.length];
    const data = await Articles.getTopHeadlines(cat, 10);
    const more = (data.data.articles || []).map(a => ({ ...a, category: cat }));

    // Only add articles we haven't shown yet
    const existingUrls = new Set(allArticles.map(a => a.url));
    const fresh = more.filter(a => !existingUrls.has(a.url));
    fresh.forEach(cacheArticle);
    allArticles = [...allArticles, ...fresh];

    const grid = document.getElementById('feed-grid');
    fresh.forEach((a, i) => {
      grid.insertAdjacentHTML('beforeend', buildArticleCard(a, allArticles.length - fresh.length + i));
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Load More Articles';
      // Hide after 4 loads to avoid infinite empty fetches
      btn.style.display = currentPage > 5 ? 'none' : 'inline-flex';
    }
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Load More Articles'; }
  } finally {
    isLoading = false;
  }
}

function renderFeed(articles, title = '') {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  const feedTitle = document.getElementById('feed-title');
  if (feedTitle) feedTitle.innerHTML = title || 'Your Feed';

  if (!articles.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon"><img src="/icons/bookmark.svg" class="svg-icon svg-icon-xl" alt="" style="opacity:0.3"></div>
      <h3>No articles found</h3>
      <p>Try different keywords or update your interests.</p>
    </div>`;
    return;
  }
  grid.innerHTML = articles.map((a, i) => buildArticleCard(a, i)).join('');
}

function setFeedLoading(loading) {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  if (loading) {
    grid.innerHTML = Array(9).fill(0).map(() => `
      <div class="article-card-skeleton"></div>
    `).join('');
  }
}

function showFeedError(msg) {
  const grid = document.getElementById('feed-grid');
  if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
    <div class="empty-icon"><img src="/icons/warn.svg" class="svg-icon svg-icon-xl" alt="" style="opacity:0.3"></div><h3>Could not load articles</h3><p>${msg}</p>
  </div>`;
}

window.openArticle = (id, index) => {
  sessionStorage.setItem('ff_article_id', id);
  window.location.href = '/article.html';
};

window.toggleBookmark = async (btn, article) => {
  try {
    if (btn.classList.contains('active')) {
      showToast('Already bookmarked', 'default');
    } else {
      btn.disabled = true;
      await Bookmarks.add(article);
      btn.classList.add('active');
      btn.disabled = false;
      showToast('Bookmarked!', 'success');
    }
  } catch (err) {
    btn.disabled = false;
    showToast(err.message, 'error');
  }
};