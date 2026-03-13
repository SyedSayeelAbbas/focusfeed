/* ============================================
   FOCUSFEED — Article View Logic
   ============================================ */

async function initArticlePage() {
  if (!await requireAuth()) return;
  initNavUser();

  // Support shareable URLs: /article.html?id=xyz
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id');
  const sessionId = sessionStorage.getItem('ff_article_id');
  const articleId = urlId || sessionId;

  if (!articleId) { window.location.href = '/dashboard.html'; return; }

  let article = getCachedArticle(articleId);

  // If not in cache (shared link), try to fetch from backend
  if (!article && urlId) {
    try {
      const res = await fetch(`${window.location.origin}/api/articles/preview?id=${encodeURIComponent(urlId)}`);
      if (res.ok) {
        const data = await res.json();
        article = data.data?.article;
        if (article) cacheArticle(article);
      }
    } catch(e) {}
  }

  if (!article) { window.location.href = '/dashboard.html'; return; }

  // Update URL to be shareable
  if (!urlId && sessionId) {
    history.replaceState(null, '', `/article.html?id=${encodeURIComponent(sessionId)}`);
  }

  // Mark as read
  if (typeof markAsRead === 'function') markAsRead(articleId);
  if (typeof addToHistory === 'function') addToHistory(article);

  renderArticle(article);
}

function renderArticle(article) {
  document.title = `${article.title} — FocusFeed`;

  const catEl = document.getElementById('article-category');
  if (catEl) catEl.innerHTML = `<span class="badge badge-amber">${categoryIcon(article.category)} ${article.category || 'General'}</span>`;

  const titleEl = document.getElementById('article-title');
  if (titleEl) titleEl.textContent = article.title;

  const sourceEl = document.getElementById('article-source');
  if (sourceEl) sourceEl.textContent = article.source || 'Unknown Source';

  const dateEl = document.getElementById('article-date');
  if (dateEl) dateEl.textContent = formatDate(article.publishedAt);

  const imgWrap = document.getElementById('article-image-wrap');
  if (imgWrap) {
    if (article.urlToImage) {
      imgWrap.innerHTML = `<img src="${article.urlToImage}" class="article-view-image" alt="${article.title}" onerror="this.style.display='none'">`;
    } else {
      imgWrap.style.display = 'none';
    }
  }

  const bodyEl = document.getElementById('article-body');
  if (bodyEl) {
    bodyEl.innerHTML = `<p>${article.description || 'No preview available.'}</p>`;
    if (article.content) {
      const cleaned = article.content.replace(/\[\+\d+ chars\]/, '').trim();
      if (cleaned) bodyEl.innerHTML += `<p style="margin-top:16px">${cleaned}</p>`;
    }
  }

  const linkEl = document.getElementById('article-link');
  if (linkEl && article.url) {
    linkEl.href = article.url;
    linkEl.style.display = 'inline-flex';
  }

  const bookmarkBtn = document.getElementById('bookmark-btn');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', async () => {
      try {
        await Bookmarks.add(article);
        bookmarkBtn.innerHTML = '<img src="/icons/bookmark.svg" class="svg-icon svg-icon-sm" alt=""> Bookmarked';
        bookmarkBtn.classList.add('active');
        showToast('Added to bookmarks!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        const shareUrl = `${window.location.origin}/article.html?id=${encodeURIComponent(article.articleId)}`;
        navigator.share({ title: article.title, url: shareUrl });
      } else {
        const shareUrl = `${window.location.origin}/article.html?id=${encodeURIComponent(article.articleId)}`;
        navigator.clipboard.writeText(shareUrl);
        showToast('Shareable link copied!', 'success');
      }
    });
  }
}