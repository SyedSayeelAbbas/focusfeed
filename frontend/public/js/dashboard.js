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
  updateNotificationBadge();

  // Support both desktop (in navbar) and mobile (below navbar) search inputs
  const searchInputDesktop = document.getElementById('search-input-desktop');
  const searchInputMobile  = document.getElementById('search-input');
  // Use whichever is visible, fall back to mobile
  const searchInput = searchInputMobile || searchInputDesktop;
  // Sync inputs so both work
  function syncSearch(val) {
    if (searchInputDesktop) searchInputDesktop.value = val;
    if (searchInputMobile)  searchInputMobile.value  = val;
  }
  let searchTimer;
  // Wire events on both mobile and desktop search inputs
  function wireSearchInput(el) {
    if (!el) return;
    el.addEventListener('focus', () => showSearchSuggestions(el));
    el.addEventListener('blur', () => setTimeout(hideSearchSuggestions, 200));
    el.addEventListener('input', (e) => {
      syncSearch(e.target.value);
      const q = e.target.value.trim();
      if (q.length > 1) showSearchSuggestions(el);
      else hideSearchSuggestions();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = e.target.value.trim();
        hideSearchSuggestions();
        if (q) { saveSearchHistory(q); runSearch(q); }
        else { currentCategory = null; loadFeed(); }
      }
    });
  }
  wireSearchInput(searchInputMobile);
  wireSearchInput(searchInputDesktop);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) hideSearchSuggestions();
  });

  document.getElementById('load-more-btn')?.addEventListener('click', loadMore);

  // Infinite scroll
  window.addEventListener('scroll', () => {
    if (isLoading) return;
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    if (scrolled >= total - 300) {
      const btn = document.getElementById('load-more-btn');
      if (btn && btn.style.display !== 'none') loadMore();
    }
  });

  // Mobile sidebar toggle
  (function() {
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar   = document.querySelector('.sidebar');
    const overlay   = document.getElementById('sidebar-overlay');

    function openSidebar() {
      sidebar?.classList.add('open');
      overlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (hamburger) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
      });
    }
    overlay?.addEventListener('click', closeSidebar);

    // Close sidebar when any link or button inside it is clicked on mobile
    sidebar?.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= 1024) closeSidebar();
      });
    });
  })();

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
    // Fallback: show top headlines if personal feed fails
    try {
      const fallback = await Articles.getTopHeadlines('general', 9);
      allArticles = (fallback.data.articles || []).map(a => ({...a, category: 'general'}));
      allArticles.forEach(cacheArticle);
      renderFeed(allArticles, '📰 Top Headlines');
    } catch(e) {
      showFeedError(err.message);
    }
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
  saveSearchHistory(q);
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

/* ── Search History ── */
function saveSearchHistory(q) {
  const history = JSON.parse(localStorage.getItem('ff_search_history') || '[]');
  const filtered = history.filter(h => h !== q);
  filtered.unshift(q);
  localStorage.setItem('ff_search_history', JSON.stringify(filtered.slice(0, 5)));
}

function showSearchSuggestions(input) {
  hideSearchSuggestions();
  const history = JSON.parse(localStorage.getItem('ff_search_history') || '[]');
  if (!history.length) return;
  const box = document.createElement('div');
  box.id = 'search-suggestions';
  box.className = 'search-suggestions';
  box.innerHTML = `
    <div class="search-suggestions-label">Recent Searches</div>
    ${history.map(q => `
      <div class="search-suggestion-item" onclick="if(document.getElementById('search-input'))document.getElementById('search-input').value='${q.replace(/'/g,"\'")}';hideSearchSuggestions();runSearch('${q.replace(/'/g,"\'")}')">
        <span style="opacity:0.4;font-size:0.8rem">🔍</span> ${q}
        <button onclick="event.stopPropagation();removeSearchHistory('${q.replace(/'/g,"\'")}');" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-soft);font-size:0.8rem;padding:0 4px">✕</button>
      </div>`).join('')}
  `;
  const bar = input.closest('.search-bar') || input.parentElement;
  bar.style.position = 'relative';
  bar.appendChild(box);
}

function hideSearchSuggestions() {
  document.getElementById('search-suggestions')?.remove();
}

window.removeSearchHistory = (q) => {
  const history = JSON.parse(localStorage.getItem('ff_search_history') || '[]');
  localStorage.setItem('ff_search_history', JSON.stringify(history.filter(h => h !== q)));
  const input = document.getElementById('search-input') || document.getElementById('search-input-desktop');
  if (input) showSearchSuggestions(input);
};

/* ── Notification Badge ── */
function updateNotificationBadge() {
  const lastVisit = localStorage.getItem('ff_last_visit');
  const now = Date.now();
  localStorage.setItem('ff_last_visit', now.toString());
  if (!lastVisit) return;

  const newCount = allArticles.filter(a => {
    const pub = new Date(a.publishedAt).getTime();
    return pub > parseInt(lastVisit);
  }).length;

  if (newCount > 0) {
    document.querySelectorAll('a[href="/dashboard.html"]').forEach(link => {
      if (!link.querySelector('.notif-badge')) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.textContent = newCount > 9 ? '9+' : newCount;
        link.style.position = 'relative';
        link.appendChild(badge);
      }
    });
  }
}