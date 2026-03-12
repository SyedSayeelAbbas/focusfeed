/* ============================================
   FOCUSFEED — API Layer
   All backend communication goes through here.
   ============================================ */

const API_BASE = window.location.origin + '/api';

/* ── Token Helpers ── */
const getToken = () => localStorage.getItem('ff_token');
const setToken = (t) => localStorage.setItem('ff_token', t);
const removeToken = () => localStorage.removeItem('ff_token');

const getUser = () => {
  const u = localStorage.getItem('ff_user');
  return u ? JSON.parse(u) : null;
};
const setUser = (u) => localStorage.setItem('ff_user', JSON.stringify(u));
const removeUser = () => localStorage.removeItem('ff_user');

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