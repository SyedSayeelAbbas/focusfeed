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
    { name: 'technology',   label: 'Technology',   icon: '💻' },
    { name: 'science',      label: 'Science',       icon: '🔬' },
    { name: 'health',       label: 'Health',        icon: '🏥' },
    { name: 'business',     label: 'Business',      icon: '📈' },
    { name: 'sports',       label: 'Sports',        icon: '⚽' },
    { name: 'entertainment',label: 'Entertainment', icon: '🎬' },
    { name: 'politics',     label: 'Politics',      icon: '🏛️' },
    { name: 'education',    label: 'Education',     icon: '📚' },
    { name: 'environment',  label: 'Environment',   icon: '🌿' },
    { name: 'world',        label: 'World',         icon: '🌍' },
    { name: 'finance',      label: 'Finance',       icon: '💰' },
    { name: 'travel',       label: 'Travel',        icon: '✈️' },
    { name: 'gaming',       label: 'Gaming',        icon: '🎮' },
    { name: 'music',        label: 'Music',         icon: '🎵' },
    { name: 'art',          label: 'Art',           icon: '🎨' },
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
        <div class="chip-check">✓</div>
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