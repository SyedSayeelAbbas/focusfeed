/* ============================================
   FOCUSFEED — Bookmarks Page Logic
   ============================================ */

let bookmarksList = [];

async function initBookmarksPage() {
  if (!await requireAuth()) return;   // ✅ FIX: added await
  initNavUser();
  await loadBookmarks();
}

async function loadBookmarks() {
  const grid = document.getElementById('bookmarks-grid');
  const countEl = document.getElementById('bookmark-count');
  if (grid) grid.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await Bookmarks.getAll();
    bookmarksList = data.data.bookmarks || [];

    if (countEl) countEl.textContent = bookmarksList.length;

    if (!bookmarksList.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔖</div>
        <h3>No bookmarks yet</h3>
        <p>Save articles from your feed to read them later.</p>
        <a href="/dashboard.html" class="btn btn-primary btn-sm" style="margin-top:16px;">Browse Feed</a>
      </div>`;
      return;
    }

    grid.innerHTML = bookmarksList.map(bk => buildBookmarkCard(bk)).join('');
  } catch (err) {
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">⚠️</div><h3>${err.message}</h3>
    </div>`;
  }
}

function buildBookmarkCard(bk) {
  return `
    <div class="article-card" id="bk-${bk._id}">
      ${bk.urlToImage
        ? `<img src="${bk.urlToImage}" class="article-card-image" loading="lazy" alt="${bk.title}" onerror="this.style.display='none'">`
        : `<div class="article-card-image-placeholder">${categoryIcon(bk.category)}</div>`}
      <div class="article-card-body">
        <div class="article-card-meta">
          <span class="article-card-source">${bk.source || 'Unknown'}</span>
          <span class="article-card-date">${formatDate(bk.publishedAt)}</span>
        </div>
        <div class="article-card-title">${bk.title}</div>
        ${bk.description ? `<div class="article-card-desc">${truncate(bk.description)}</div>` : ''}
      </div>
      <div class="article-card-footer">
        <span class="badge badge-amber">${bk.category || 'general'}</span>
        <div class="article-card-actions">
          <button class="btn-icon" title="Read article" onclick="window.open('${bk.url}','_blank')">↗</button>
          <button class="btn-icon btn-icon-danger" title="Remove bookmark" onclick="removeBookmark('${bk._id}', this)">🗑</button>
        </div>
      </div>
    </div>`;
}

window.removeBookmark = async (id, btn) => {
  try {
    btn.disabled = true;
    await Bookmarks.remove(id);
    const card = document.getElementById(`bk-${id}`);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      card.style.transition = '0.3s';
      setTimeout(() => card.remove(), 300);
    }
    bookmarksList = bookmarksList.filter(b => b._id !== id);
    const countEl = document.getElementById('bookmark-count');
    if (countEl) countEl.textContent = bookmarksList.length;
    showToast('Bookmark removed.', 'default');
    if (!bookmarksList.length) setTimeout(loadBookmarks, 400);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
};