/* ============================================
   FOCUSFEED — Profile Page Logic
   ============================================ */

async function initProfilePage() {
  if (!await requireAuth()) return;
  initNavUser();

  // Apply saved theme immediately on load
  const user = getUser();
  applyTheme(user?.theme || 'dark');

  renderProfileCard(user);
  await loadProfileData();
  initProfileTabs();
  initProfileForms(user);
  renderReadingHistory();
}

/* ── Theme Engine ── */
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  // Persist locally so it survives page refreshes before next API load
  const stored = getUser();
  if (stored) {
    stored.theme = theme;
    localStorage.setItem('ff_user', JSON.stringify(stored));
  }
}

function renderProfileCard(user) {
  if (!user) return;
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) avatarEl.textContent = user.name?.charAt(0).toUpperCase() || 'U';
  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = user.name;
  const emailEl = document.getElementById('profile-email');
  if (emailEl) emailEl.textContent = user.email;
  const roleEl = document.getElementById('profile-role');
  if (roleEl) roleEl.innerHTML = `<span class="badge ${user.role === 'admin' ? 'badge-navy' : 'badge-amber'}">${user.role}</span>`;
}

async function loadProfileData() {
  // Show skeleton on interests grid while loading
  const grid = document.getElementById('interests-edit-grid');
  if (grid) grid.innerHTML = Array(6).fill(0).map(() =>
    `<div class="article-card-skeleton" style="height:80px;border-radius:12px"></div>`
  ).join('');
  try {
    const [profileData, bookmarkData] = await Promise.all([
      User.getProfile(),
      Bookmarks.getAll().catch(() => ({ data: { bookmarks: [] } }))
    ]);

    const user = profileData.data.user;
    const bookmarks = bookmarkData.data.bookmarks || [];

    const bkCountEl = document.getElementById('bookmark-stat');
    if (bkCountEl) bkCountEl.textContent = bookmarks.length;

    const intCountEl = document.getElementById('interest-stat');
    if (intCountEl) intCountEl.textContent = user.interests?.length || 0;

    // Apply theme from server (authoritative)
    if (user.theme) applyTheme(user.theme);

    renderInterestChips(user.interests || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderInterestChips(selected) {
  const ALL_INTERESTS = [
    { name: 'technology', label: 'Technology', icon: '<img src="/icons/Technology.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'science', label: 'Science', icon: '<img src="/icons/Science.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'health', label: 'Health', icon: '<img src="/icons/Health.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'business', label: 'Business', icon: '<img src="/icons/Business.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'sports', label: 'Sports', icon: '<img src="/icons/Sports.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'entertainment', label: 'Entertainment', icon: '<img src="/icons/flash.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'politics', label: 'Politics', icon: '<img src="/icons/Politics.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'education', label: 'Education', icon: '<img src="/icons/Education.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'environment', label: 'Environment', icon: '<img src="/icons/Environment.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'world', label: 'World', icon: '<img src="/icons/World.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'finance', label: 'Finance', icon: '<img src="/icons/Finance.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'travel', label: 'Travel', icon: '<img src="/icons/Travel.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'gaming', label: 'Gaming', icon: '<img src="/icons/Gaming.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'music', label: 'Music', icon: '<img src="/icons/Music.svg" class="svg-icon svg-icon-sm" alt="">' },
    { name: 'art', label: 'Art', icon: '<img src="/icons/Art.svg" class="svg-icon svg-icon-sm" alt="">' },
  ];

  const grid = document.getElementById('interests-edit-grid');
  if (!grid) return;

  let sel = new Set(selected);

  function render() {
    grid.innerHTML = ALL_INTERESTS.map(cat => `
      <div class="interest-chip ${sel.has(cat.name) ? 'selected' : ''}"
           onclick="profileToggleInterest('${cat.name}')">
        <div class="chip-icon">${cat.icon}</div>
        <div class="chip-label">${cat.label}</div>
        <div class="chip-check"><img src="/icons/right.svg" class="svg-icon svg-icon-sm" alt="✓"></div>
      </div>`).join('');
  }

  window.profileToggleInterest = (cat) => {
    if (sel.has(cat)) sel.delete(cat); else sel.add(cat);
    render();
  };

  window.saveProfileInterests = async () => {
    const btn = document.getElementById('save-interests-btn');
    setLoading(btn, true);
    try {
      await User.updateInterests([...sel]);
      showToast('Interests updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btn, false, 'Save Interests');
    }
  };

  render();
}

function initProfileForms(user) {
  // Profile edit form
  const editForm = document.getElementById('edit-profile-form');
  if (editForm) {
    if (editForm.elements['name'])     editForm.elements['name'].value     = user?.name     || '';
    if (editForm.elements['language']) editForm.elements['language'].value = user?.language || 'en';
    if (editForm.elements['theme'])    editForm.elements['theme'].value    = user?.theme    || 'dark';

    // Live preview: apply theme instantly when dropdown changes
    const themeSelect = editForm.elements['theme'];
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        applyTheme(themeSelect.value);
      });
    }

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = editForm.querySelector('[type=submit]');
      setLoading(btn, true);
      try {
        const payload = {
          name:     editForm.elements['name']?.value.trim(),
          language: editForm.elements['language']?.value,
          theme:    editForm.elements['theme']?.value,
        };
        await User.updateProfile(payload);
        applyTheme(payload.theme);   // apply after save confirmed
        showToast('Profile updated!', 'success');
        renderProfileCard(getUser());
        initNavUser();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, 'Save Changes');
      }
    });
  }

  // Password form
  const pwForm = document.getElementById('change-password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn     = pwForm.querySelector('[type=submit]');
      const current = pwForm.elements['currentPassword'].value;
      const newPw   = pwForm.elements['newPassword'].value;
      const confirm = pwForm.elements['confirmPassword'].value;
      if (newPw !== confirm) { showToast('Passwords do not match.', 'error'); return; }
      if (newPw.length < 6)  { showToast('Password must be at least 6 characters.', 'error'); return; }
      setLoading(btn, true);
      try {
        await Auth.changePassword({ currentPassword: current, newPassword: newPw });
        showToast('Password changed successfully!', 'success');
        pwForm.reset();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, 'Change Password');
      }
    });
  }
}

function initProfileTabs() {
  const tabs   = document.querySelectorAll('.profile-tab');
  const panels = document.querySelectorAll('.profile-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.panel);
      if (target) target.style.display = 'block';
    });
  });
  if (panels.length) {
    panels.forEach((p, i) => p.style.display = i === 0 ? 'block' : 'none');
    if (tabs.length) tabs[0].classList.add('active');
  }
}

/* ── Reading History Panel ── */
function renderReadingHistory() {
  const panel = document.getElementById('panel-history');
  if (!panel) return;
  const history = JSON.parse(localStorage.getItem('ff_history') || '[]');
  if (!history.length) {
    panel.innerHTML = `
      <h3 style="margin-bottom:16px">Reading History</h3>
      <div class="empty-state" style="padding:40px 20px">
        <div class="empty-icon" style="font-size:3rem;margin-bottom:16px">📖</div>
        <h3>No history yet</h3>
        <p>Articles you open will appear here.</p>
      </div>`;
    return;
  }
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3>Reading History</h3>
      <button onclick="clearReadingHistory()" class="btn btn-outline btn-sm" style="font-size:0.8rem;padding:6px 14px">Clear History</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${history.map(a => `
        <div class="article-card" style="flex-direction:row;gap:12px;padding:14px;cursor:pointer;align-items:flex-start" onclick="window.open('${a.url || '#'}','_blank')">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.75rem;color:var(--violet-primary);font-weight:600;margin-bottom:4px;text-transform:capitalize">${a.source || 'Unknown'} · ${a.category || 'general'}</div>
            <div style="font-size:0.9rem;font-weight:600;color:var(--text-main);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${a.title || 'Untitled'}</div>
            <div style="font-size:0.75rem;color:var(--text-soft);margin-top:6px">Read ${formatDate(a.readAt)}</div>
          </div>
          <span style="font-size:0.75rem;color:var(--text-soft);flex-shrink:0">↗</span>
        </div>`).join('')}
    </div>`;
}

window.clearReadingHistory = () => {
  localStorage.removeItem('ff_history');
  localStorage.removeItem('ff_read');
  renderReadingHistory();
  showToast('History cleared.', 'default');
};