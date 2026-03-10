/* ============================================
   FOCUSFEED — Utility Helpers
   ============================================ */

/* ── Toast Notifications ── */
function showToast(message, type = 'default') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', default: '●' };
  toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

/* ── Date Formatter ── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Truncate Text ── */
function truncate(str, len = 120) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

/* ── Set Button Loading State ── */
function setLoading(btn, loading, text = '') {
  if (loading) {
    btn._originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;margin:0;border-width:2px;display:inline-block;vertical-align:middle;"></span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = text || btn._originalText || 'Submit';
  }
}

/* ── Category Icons ── */
const CATEGORY_ICONS = {
  technology:  '💻', science:    '🔬', health:     '🏥',
  business:    '📈', sports:     '⚽', entertainment: '🎬',
  politics:    '🏛️',  education:  '📚', environment: '🌿',
  world:       '🌍', finance:    '💰', travel:      '✈️',
  religion:    '🕊️',  food:       '🍽️', fashion:     '👗',
  gaming:      '🎮', music:      '🎵', art:         '🎨',
  general:     '📰',
};

function categoryIcon(cat) {
  return CATEGORY_ICONS[cat?.toLowerCase()] || '📰';
}

/* ── Build Article Card HTML ── */
function buildArticleCard(article, index = 0) {
  const isFeatured = index === 0;
  const imgHtml = article.urlToImage
    ? `<img src="${article.urlToImage}" class="article-card-image" alt="${article.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=article-card-image-placeholder>${categoryIcon(article.category)}</div>'">`
    : `<div class="article-card-image-placeholder">${categoryIcon(article.category)}</div>`;

  const encoded = encodeURIComponent(JSON.stringify(article));
  return `
    <div class="article-card${isFeatured ? ' featured' : ''}" onclick="openArticle('${article.articleId}', ${index})">
      ${imgHtml}
      <div class="article-card-body">
        <div class="article-card-meta">
          <span class="article-card-source">${article.source || 'Unknown'}</span>
          <span class="article-card-date">${formatDate(article.publishedAt)}</span>
        </div>
        <div class="article-card-title">${article.title || 'Untitled'}</div>
        ${article.description ? `<div class="article-card-desc">${truncate(article.description)}</div>` : ''}
      </div>
      <div class="article-card-footer">
        <span class="badge badge-amber">${article.category || 'general'}</span>
        <div class="article-card-actions">
          <button class="btn-icon" title="Bookmark" onclick="event.stopPropagation(); toggleBookmark(this, ${JSON.stringify(article).replace(/"/g, '&quot;')})">🔖</button>
          <button class="btn-icon" title="Open source" onclick="event.stopPropagation(); window.open('${article.url}','_blank')">↗</button>
        </div>
      </div>
    </div>`;
}

/* ── Store current articles in session for article.html ── */
let _articleCache = {};

function cacheArticle(article) {
  _articleCache[article.articleId] = article;
  sessionStorage.setItem('ff_article_cache', JSON.stringify(_articleCache));
}

function getCachedArticle(id) {
  const cached = sessionStorage.getItem('ff_article_cache');
  if (cached) _articleCache = JSON.parse(cached);
  return _articleCache[id] || null;
}

/* ── Init user display in navbar ── */
function initNavUser() {
  const user = getUser();
  if (!user) return;
  const nameEl = document.getElementById('nav-user-name');
  const avatarEl = document.getElementById('nav-user-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (avatarEl) avatarEl.textContent = user.name?.charAt(0).toUpperCase() || 'U';
}