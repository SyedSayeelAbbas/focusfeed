function showToast(message, type = 'default') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', default: '●' }; // text icons kept for toast
  toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

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

function truncate(str, len = 120) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

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

const CATEGORY_SVG = {
  technology:      'Technology',
  science:         'Science',
  health:          'Health',
  business:        'Business',
  sports:          'Sports',
  entertainment:   'flash',
  politics:        'Politics',
  education:       'Education',
  environment:     'Environment',
  world:           'World',
  finance:         'Finance',
  travel:          'Travel',
  religion:        'Religion',
  food:            'Food',
  gaming:          'Gaming',
  music:           'Music',
  art:             'Art',
  fashion:         'Fashion',
  general:         'laptop',
};

function categoryIcon(cat) {
  const name = CATEGORY_SVG[cat?.toLowerCase()] || 'laptop';
  return `<img src="/icons/${name}.svg" class="svg-icon svg-icon-sm" alt="${cat || 'general'}" style="vertical-align:middle">`;
}

function readingTime(text) {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function markAsRead(articleId) {
  const read = JSON.parse(localStorage.getItem('ff_read') || '[]');
  if (!read.includes(articleId)) {
    read.unshift(articleId);
    localStorage.setItem('ff_read', JSON.stringify(read.slice(0, 100)));
  }
}
function isRead(articleId) {
  const read = JSON.parse(localStorage.getItem('ff_read') || '[]');
  return read.includes(articleId);
}

function addToHistory(article) {
  if (!article || !article.articleId) return;
  const history = JSON.parse(localStorage.getItem('ff_history') || '[]');
  const filtered = history.filter(a => a.articleId !== article.articleId);
  filtered.unshift({
    articleId: article.articleId,
    title: article.title,
    source: article.source,
    category: article.category,
    url: article.url,
    publishedAt: article.publishedAt,
    readAt: new Date().toISOString()
  });
  localStorage.setItem('ff_history', JSON.stringify(filtered.slice(0, 20)));
}
function getHistory() {
  return JSON.parse(localStorage.getItem('ff_history') || '[]');
}

function buildArticleCard(article, index = 0) {
  const isFeatured = index === 0;
  const imgHtml = article.urlToImage
    ? `<img src="${article.urlToImage}" class="article-card-image" alt="${article.title}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="article-card-image-placeholder">${categoryIcon(article.category)}</div>`;

  const encoded = encodeURIComponent(JSON.stringify(article));
  const readClass = isRead(article.articleId) ? ' read' : '';
  return `
    <div class="article-card${isFeatured ? ' featured' : ''}${readClass}" onclick="openArticle('${article.articleId}', ${index})">
      ${imgHtml}
      <div class="article-card-body">
        <div class="article-card-meta">
          <span class="article-card-source">${article.source || 'Unknown'}</span>
          <span class="article-card-date">${formatDate(article.publishedAt)}</span>
        </div>
        <div class="article-card-title">${article.title || 'Untitled'}</div>
        ${article.description ? `<div class="article-card-desc">${truncate(article.description)}</div>` : ''}
        <div class="article-card-reading-time">${readingTime((article.description || '') + ' ' + (article.content || ''))}</div>
      </div>
      <div class="article-card-footer">
        <span class="badge badge-amber">${article.category || 'general'}</span>
        <div class="article-card-actions">
          <button class="btn-icon" title="Bookmark" onclick="event.stopPropagation(); toggleBookmark(this, ${JSON.stringify(article).replace(/"/g, '&quot;')})"><img src="/icons/bookmark.svg" class="svg-icon svg-icon-sm" alt="bookmark"></button>
          <button class="btn-icon" title="Open source" onclick="event.stopPropagation(); window.open('${article.url}','_blank')">↗</button>
        </div>
      </div>
    </div>`;
}

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

function initNavUser() {
  const user = getUser();
  if (!user) return;
  const nameEl = document.getElementById('nav-user-name');
  const avatarEl = document.getElementById('nav-user-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (avatarEl) avatarEl.textContent = user.name?.charAt(0).toUpperCase() || 'U';
}