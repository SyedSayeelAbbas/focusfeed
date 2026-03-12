/* ============================================
   FOCUSFEED — Auth Logic (login, signup, interests)
   ============================================ */

// Admin access code — change this to whatever secret you want
const ADMIN_ACCESS_CODE = "focusfeed@admin2026";

/* ─────────────────────────────────────────────
   LOGIN PAGE
   ───────────────────────────────────────────── */
function initLoginPage() {
  if (Auth.isLoggedIn()) {
    const user = getUser();
    window.location.href = user?.role === 'admin'
      ? '/admin-dashboard.html'
      : '/dashboard.html';
    return;
  }

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    setLoading(btn, true);
    try {
      const email    = form.email.value.trim();
      const password = form.password.value;
      await Auth.login({ email, password });
      const user = getUser();
      showToast(`Welcome back, ${user?.name?.split(' ')[0]}!`, 'success');
      setTimeout(() => {
        if (user?.role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        } else {
          window.location.href = '/dashboard.html';
        }
      }, 600);
    } catch (err) {
      showToast(err.message || 'Login failed.', 'error');
      setLoading(btn, false, 'Sign In');
    }
  });

  document.querySelectorAll('.input-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.innerHTML = input.type === 'password' ? '<img src="/icons/eye.svg" class="svg-icon svg-icon-sm" alt="show">' : '<img src="/icons/eye.svg" class="svg-icon svg-icon-sm" alt="hide" style="opacity:0.4">';
    });
  });
}

/* ─────────────────────────────────────────────
   SIGNUP PAGE
   ───────────────────────────────────────────── */
function initSignupPage() {
  if (Auth.isLoggedIn()) { window.location.href = '/dashboard.html'; return; }

  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const name      = form.name.value.trim();
    const email     = form.email.value.trim();
    const password  = form.password.value;
    const confirm   = form.confirm.value;
    const role      = window._selectedRole || 'user';
    const adminCode = form.adminCode?.value || '';

    if (password !== confirm) { showToast('Passwords do not match.', 'error'); return; }
    if (password.length < 6)  { showToast('Password must be at least 6 characters.', 'error'); return; }

    // Validate admin access code before hitting the backend
    if (role === 'admin') {
      if (!adminCode) {
        showToast('Admin access code is required.', 'error'); return;
      }
      if (adminCode !== ADMIN_ACCESS_CODE) {
        showToast('Invalid admin access code.', 'error'); return;
      }
    }

    setLoading(btn, true);
    try {
      await Auth.register({ name, email, password, role });
      showToast('Account created! Let\'s pick your interests.', 'success');
      setTimeout(() => {
        if (role === 'admin') {
          window.location.href = '/interests.html';
        } else {
          window.location.href = '/interests.html';
        }
      }, 700);
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      setLoading(btn, false, 'Create Account');
    }
  });

  document.querySelectorAll('.input-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.innerHTML = input.type === 'password' ? '<img src="/icons/eye.svg" class="svg-icon svg-icon-sm" alt="show">' : '<img src="/icons/eye.svg" class="svg-icon svg-icon-sm" alt="hide" style="opacity:0.4">';
    });
  });
}

/* ─────────────────────────────────────────────
   INTERESTS PAGE
   ───────────────────────────────────────────── */
const ALL_INTERESTS = [
  { name: 'technology', label: 'Technology', icon: '<img src="/icons/technology.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'science', label: 'Science', icon: '<img src="/icons/science.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'health', label: 'Health', icon: '<img src="/icons/health.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'business', label: 'Business', icon: '<img src="/icons/business.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'sports', label: 'Sports', icon: '<img src="/icons/sports.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'entertainment', label: 'Entertainment', icon: '<img src="/icons/flash.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'politics', label: 'Politics', icon: '<img src="/icons/politics.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'education', label: 'Education', icon: '<img src="/icons/education.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'environment', label: 'Environment', icon: '<img src="/icons/environment.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'world', label: 'World', icon: '<img src="/icons/world.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'finance', label: 'Finance', icon: '<img src="/icons/finance.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'travel', label: 'Travel', icon: '<img src="/icons/travel.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'religion', label: 'Religion', icon: '<img src="/icons/religion.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'food', label: 'Food', icon: '<img src="/icons/food.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'gaming', label: 'Gaming', icon: '<img src="/icons/gaming.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'music', label: 'Music', icon: '<img src="/icons/music.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'art', label: 'Art', icon: '<img src="/icons/art.svg" class="svg-icon svg-icon-sm" alt="">' },
  { name: 'fashion', label: 'Fashion', icon: '<img src="/icons/fashion.svg" class="svg-icon svg-icon-sm" alt="">' },
];

function initInterestsPage() {
  if (!requireAuth()) return;

  const grid        = document.getElementById('interests-grid');
  const progressBar = document.getElementById('interests-progress');
  const countEl     = document.getElementById('selected-count');
  const saveBtn     = document.getElementById('save-interests-btn');

  let selected = new Set(getUser()?.interests || []);

  function render() {
    grid.innerHTML = ALL_INTERESTS.map(cat => `
      <div class="interest-chip ${selected.has(cat.name) ? 'selected' : ''}"
           data-cat="${cat.name}"
           onclick="toggleInterest('${cat.name}')">
        <div class="chip-icon">${cat.icon}</div>
        <div class="chip-label">${cat.label}</div>
        <div class="chip-check"><img src="/icons/right.svg" class="svg-icon svg-icon-sm" alt="✓"></div>
      </div>`).join('');
    const pct = Math.min((selected.size / 3) * 100, 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (countEl) countEl.textContent = `${selected.size} selected`;
    if (saveBtn) saveBtn.disabled = selected.size === 0;
  }

  window.toggleInterest = (cat) => {
    if (selected.has(cat)) selected.delete(cat);
    else selected.add(cat);
    render();
  };

  saveBtn?.addEventListener('click', async () => {
    if (selected.size === 0) { showToast('Please select at least one interest.', 'error'); return; }
    setLoading(saveBtn, true);
    try {
      await User.updateInterests([...selected]);
      showToast('Interests saved! Loading your feed…', 'success');
      const user = getUser();
      setTimeout(() => {
        if (user?.role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        } else {
          window.location.href = '/dashboard.html';
        }
      }, 700);
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(saveBtn, false, 'Continue →');
    }
  });

  render();
}