async function initAdminDashboard() {
  if (!await requireAdmin()) return;  
  initNavUser();
  await loadAdminAnalytics();
}

async function loadAdminAnalytics() {
  try {
    const data = await Admin.getAnalytics();
    const stats = data.data.stats;

    setValue('metric-total-users',   stats.totalUsers        || 0);
    setValue('metric-active-users',  stats.activeUsers       || 0);
    setValue('metric-new-week',      stats.newUsersThisWeek  || 0);
    setValue('metric-bookmarks',     stats.totalBookmarks    || 0);

    renderInterestBars(stats.topInterests || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderInterestBars(interests) {
  const container = document.getElementById('interest-bars');
  if (!container || !interests.length) return;
  const max = interests[0]?.count || 1;
  container.innerHTML = interests.map(item => `
    <div class="interest-bar-item">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="interest-bar-label">${categoryIcon(item.interest)} ${item.interest}</span>
        <span class="interest-bar-count" style="font-size:0.8rem;font-weight:600;color:var(--violet-primary)">${item.count}</span>
      </div>
      <div class="interest-bar-track">
        <div class="interest-bar-fill" style="width:${(item.count / max * 100).toFixed(1)}%"></div>
      </div>
    </div>`).join('');
}

async function initManageUsers() {
  if (!await requireAdmin()) return;
  initNavUser();

  const searchInput = document.getElementById('user-search');
  searchInput?.addEventListener('input', (e) => filterUsers(e.target.value));

  await loadUsers();
}

let allUsers = [];

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto;width:30px;height:30px;border-width:2px"></div></td></tr>`;

  try {
    const data = await Admin.getUsers();
    allUsers = data.data.users || [];
    renderUsers(allUsers);
    const countEl = document.getElementById('user-count');
    if (countEl) countEl.textContent = allUsers.length;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sidebar-avatar" style="width:32px;height:32px;font-size:0.8rem;flex-shrink:0">${u.name?.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight:600;font-size:0.88rem;color:var(--text-main)">${u.name}</div>
            <div style="font-size:0.75rem;color:var(--text-soft)">${u.email}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-navy' : 'badge-amber'}">${u.role}</span></td>
      <td style="font-size:0.85rem;color:var(--text-secondary)">${(u.interests || []).slice(0,3).join(', ') || '—'}</td>
      <td style="font-size:0.82rem;color:var(--text-soft)">${formatDate(u.createdAt)}</td>
      <td>
        <span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">
          ${u.isActive ? '● Active' : '○ Inactive'}
        </span>
      </td>
      <td>
        <!--  FIX: use toggle-switch class that exists in admin.css -->
        <div class="toggle-switch ${u.isActive ? 'active' : ''}"
             onclick="toggleUser('${u._id}', this)"
             title="${u.isActive ? 'Deactivate' : 'Activate'} user"
             style="cursor:pointer">
        </div>
      </td>
    </tr>`).join('');
}

function filterUsers(q) {
  const filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase())
  );
  renderUsers(filtered);
}

window.toggleUser = async (id, toggleEl) => {
  try {
    await Admin.toggleUser(id);
    const user = allUsers.find(u => u._id === id);
    if (user) {
      user.isActive = !user.isActive;

      toggleEl.classList.toggle('active', user.isActive);
      toggleEl.title = `${user.isActive ? 'Deactivate' : 'Activate'} user`;

      const row = toggleEl.closest('tr');
      const badge = row?.querySelector('.badge.badge-success, .badge.badge-danger');
      if (badge) {
        badge.className = `badge ${user.isActive ? 'badge-success' : 'badge-danger'}`;
        badge.textContent = user.isActive ? '● Active' : '○ Inactive';
      }
    }
    showToast(`User ${user?.isActive ? 'activated' : 'deactivated'}.`, 'success');
  } catch (err) {

    toggleEl.classList.toggle('active');
    showToast(err.message, 'error');
  }
};

async function initReportsPage() {
  if (!await requireAdmin()) return; 
  initNavUser();
  await loadReports();
}

async function loadReports() {
  try {
    const [analyticsData, usersData] = await Promise.all([
      Admin.getAnalytics(),
      Admin.getUsers()
    ]);

    const stats = analyticsData.data.stats;
    const users = usersData.data.users || [];

    setValue('report-total',     stats.totalUsers);
    setValue('report-active',    stats.activeUsers);
    setValue('report-inactive',  stats.inactiveUsers);
    setValue('report-bookmarks', stats.totalBookmarks);
    setValue('report-new-week',  stats.newUsersThisWeek);

    renderInterestBars(stats.topInterests || []);

    const recentTbody = document.getElementById('recent-users-tbody');
    if (recentTbody) {
      const recent = [...users]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);
      recentTbody.innerHTML = recent.map(u => `
        <tr>
          <td style="font-weight:600;font-size:0.88rem;color:var(--text-main)">${u.name}</td>
          <td style="font-size:0.82rem;color:var(--text-soft)">${u.email}</td>
          <td><span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">${u.isActive ? '● Active' : '○ Inactive'}</span></td>
          <td style="font-size:0.82rem;color:var(--text-soft)">${formatDate(u.createdAt)}</td>
        </tr>`).join('');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}