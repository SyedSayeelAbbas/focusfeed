/* ============================================
   FOCUSFEED — Article View Logic
   ============================================ */

async function initArticlePage() {
  if (!await requireAuth()) return;                                                    // FIX 1: added await
  initNavUser();

  const articleId = sessionStorage.getItem('ff_article_id');
  if (!articleId) { window.location.href = '/dashboard.html'; return; } // FIX 2: correct path

  const article = getCachedArticle(articleId);
  if (!article) { window.location.href = '/dashboard.html'; return; }   // FIX 3: correct path

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
        navigator.share({ title: article.title, url: article.url });
      } else {
        navigator.clipboard.writeText(article.url);
        showToast('Link copied!', 'success');
      }
    });
  }
}