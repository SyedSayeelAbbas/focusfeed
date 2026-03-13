/* ============================================
   FOCUSFEED — API Layer
   All backend communication goes through here.
   ============================================ */

const API_BASE = window.location.origin + '/api';

/* ── Token Helpers ── */
const getToken = () => sessionStorage.getItem('ff_token');
const setToken = (t) => sessionStorage.setItem('ff_token', t);
const removeToken = () => {
  sessionStorage.removeItem('ff_token');
  localStorage.removeItem('ff_token'); // also clear old localStorage tokens
};

const getUser = () => {
  const u = sessionStorage.getItem('ff_user');
  return u ? JSON.parse(u) : null;
};
const setUser = (u) => sessionStorage.setItem('ff_user', JSON.stringify(u));
const removeUser = () => {
  sessionStorage.removeItem('ff_user');
  localStorage.removeItem('ff_user'); // also clear old localStorage users
};

/* ── Core Fetch Wrapper ── */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  // If token is expired or invalid, clear storage and redirect to login
  if (res.status === 401) {
    removeToken();
    removeUser();
    window.location.href = '/login.html';
    throw new Error(data.message || 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(data.message || `Error ${res.status}`);
  }
  return data;
}

/* ── Validate token with backend on page load ── */
async function validateSession() {
  const token = getToken();
  if (!token) return false;
  try {
    await apiFetch('/auth/me');
    return true;
  } catch (err) {
    // Token invalid/expired — clear everything
    removeToken();
    removeUser();
    return false;
  }
}

/* ============================================
   AUTH
   ============================================ */
const Auth = {
  async register(payload) {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setToken(data.data.token);
    setUser(data.data.user);
    return data;
  },

  async login(payload) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    setToken(data.data.token);
    setUser(data.data.user);
    return data;
  },

  async me() {
    return apiFetch('/auth/me');
  },

  async changePassword(payload) {
    return apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify(payload) });
  },

  logout() {
    removeToken();
    removeUser();
    window.location.href = '/login.html';
  },

  isLoggedIn() {
    return !!getToken();
  },

  isAdmin() {
    const user = getUser();
    return user?.role === 'admin';
  }
};

/* ============================================
   USER
   ============================================ */
const User = {
  async getProfile() {
    return apiFetch('/users/profile');
  },

  async updateProfile(payload) {
    const data = await apiFetch('/users/profile', { method: 'PUT', body: JSON.stringify(payload) });
    setUser(data.data.user);
    return data;
  },

  async updateInterests(interests) {
    const data = await apiFetch('/users/interests', { method: 'PUT', body: JSON.stringify({ interests }) });
    const user = getUser();
    if (user) { user.interests = interests; setUser(user); }
    return data;
  }
};

/* ============================================
   ARTICLES
   ============================================ */
const Articles = {
  async getFeed(page = 1, pageSize = 20) {
    return apiFetch(`/articles/feed?page=${page}&pageSize=${pageSize}`);
  },

  async search(q, page = 1) {
    return apiFetch(`/articles/search?q=${encodeURIComponent(q)}&page=${page}`);
  },

  async getTopHeadlines(category = 'general', pageSize = 10) {
    return apiFetch(`/articles/top?category=${category}&pageSize=${pageSize}`);
  }
};

/* ============================================
   BOOKMARKS
   ============================================ */
const Bookmarks = {
  async getAll() {
    return apiFetch('/bookmarks');
  },

  async add(article) {
    return apiFetch('/bookmarks', { method: 'POST', body: JSON.stringify(article) });
  },

  async remove(id) {
    return apiFetch(`/bookmarks/${id}`, { method: 'DELETE' });
  }
};

/* ============================================
   ADMIN
   ============================================ */
const Admin = {
  async getUsers() {
    return apiFetch('/admin/users');
  },

  async toggleUser(id) {
    return apiFetch(`/admin/users/${id}/toggle`, { method: 'PUT' });
  },

  async getCategories() {
    return apiFetch('/admin/categories');
  },

  async createCategory(payload) {
    return apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
  },

  async deleteCategory(id) {
    return apiFetch(`/admin/categories/${id}`, { method: 'DELETE' });
  },

  async getAnalytics() {
    return apiFetch('/admin/analytics');
  }
};

/* ============================================
   AUTH GUARDS — validate token with backend
   ============================================ */

// For protected user pages (dashboard, bookmarks, profile, article, interests)
async function requireAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  // Verify token is still valid with the backend
  const valid = await validateSession();
  if (!valid) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// For admin-only pages
async function requireAdmin() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  const valid = await validateSession();
  if (!valid) {
    window.location.href = '/login.html';
    return false;
  }
  if (!Auth.isAdmin()) {
    window.location.href = '/dashboard.html';
    return false;
  }
  return true;
}

/* ============================================
   AUTO LOGOUT — Inactivity & Tab Revisit
   ============================================ */
(function () {
  const TIMEOUT     = 30 * 60 * 1000;
  const WARN_BEFORE =  2 * 60 * 1000;
  const KEY         = 'ff_last_active';

  const skip = ['/', '/index.html', '/login.html', '/signup.html', '/interests.html'];
  if (skip.some(p => window.location.pathname === p || window.location.pathname.endsWith(p))) return;
  if (!getToken()) return;

  let warnTimer = null, logoutTimer = null, warnEl = null;

  function doLogout() {
    removeToken(); removeUser();
    localStorage.removeItem(KEY);
    sessionStorage.setItem('ff_auto_logout', '1');
    window.location.href = '/login.html';
  }

  function resetTimers() {
    localStorage.setItem(KEY, Date.now().toString());
    clearTimeout(warnTimer); clearTimeout(logoutTimer);
    if (warnEl) { warnEl.remove(); warnEl = null; }

    warnTimer = setTimeout(() => {
      warnEl = document.createElement('div');
      warnEl.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:9999;background:var(--bg-card);border-left:4px solid #f59e0b;border-radius:10px;padding:14px 18px;box-shadow:0 8px 24px rgba(0,0,0,0.15);max-width:300px;font-size:0.88rem;color:var(--text-main);';
      warnEl.innerHTML = '<strong>Still there?</strong><br><span style="color:var(--text-soft)">You\'ll be signed out in 2 minutes.</span><br><button id="_stay_btn" style="margin-top:8px;padding:6px 14px;background:var(--violet-primary);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Keep me signed in</button>';
      document.body.appendChild(warnEl);
      document.getElementById('_stay_btn').onclick = resetTimers;
    }, TIMEOUT - WARN_BEFORE);

    logoutTimer = setTimeout(doLogout, TIMEOUT);
  }

  ['click','mousemove','keydown','scroll','touchstart'].forEach(ev => {
    document.addEventListener(ev, resetTimers, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const last = parseInt(localStorage.getItem(KEY) || '0');
      if (last && Date.now() - last > TIMEOUT) doLogout();
      else resetTimers();
    }
  });

  resetTimers();
})();