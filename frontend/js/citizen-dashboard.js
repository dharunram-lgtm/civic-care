(function() {
  const API = '/api/complaints';
  const token = localStorage.getItem('token');

  function loadComplaints() {
    fetch(API, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        renderStats(data.complaints);
        renderComplaints(data.complaints);
      })
      .catch(() => {
        document.getElementById('complaints-list').innerHTML =
          '<div class="empty-state glass-card"><div class="empty-icon">&#9888;</div><p>Failed to load complaints. Make sure the server is running.</p></div>';
      });
  }

  function renderStats(complaints) {
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    const critical = complaints.filter(c => c.priority === 'CRITICAL' && c.status !== 'RESOLVED' && c.status !== 'CLOSED').length;
    const pending = complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED' && c.status !== 'DUPLICATE').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-resolved').textContent = resolved;
    document.getElementById('stat-critical').textContent = critical;
    document.getElementById('stat-pending').textContent = pending;
  }

  function renderComplaints(complaints) {
    const container = document.getElementById('complaints-list');

    if (!complaints.length) {
      container.innerHTML =
        '<div class="empty-state glass-card">' +
        '<div class="empty-icon">&#128203;</div>' +
        '<p>No complaints yet.</p>' +
        '<p style="font-size:0.85rem;margin-top:0.5rem;">Report an issue to get started.</p>' +
        '<a href="/citizen-report.html" class="btn btn-primary" style="margin-top:1rem;">&#128221; Report an Issue</a>' +
        '</div>';
      return;
    }

    container.innerHTML = complaints.map(c => {
      const date = new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const dept = c.departmentId?.name || 'Unassigned';
      const statusClass = (c.status || '').replace(/\s+/g, '_');
      const priorityClass = c.priority || 'LOW';
      const desc = c.description ? c.description.substring(0, 100) + (c.description.length > 100 ? '...' : '') : '';

      return '<div class="complaint-card glass-card">' +
        '<div class="complaint-top">' +
        '<div class="complaint-title">' + (c.title || desc || 'Complaint') + '</div>' +
        '<div style="display:flex;gap:0.4rem;align-items:center;flex-shrink:0;">' +
        '<span class="priority-badge ' + priorityClass + '">' + c.priority + '</span>' +
        '<span class="status-badge ' + statusClass + '">' + c.status.replace(/_/g, ' ') + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="complaint-meta">' +
        '<span>&#128205; ' + (c.location?.coordinates?.map(v => v.toFixed(4)).join(', ') || 'N/A') + '</span>' +
        '<span>&#128194; ' + dept + '</span>' +
        '<span>&#128197; ' + date + '</span>' +
        (c.aiCategory ? '<span>&#129302; ' + c.aiCategory + '</span>' : '') +
        (c.masterComplaintId ? '<span style="color:var(--accent-yellow);">&#128264; Linked to duplicate</span>' : '') +
        '</div>' +
        '</div>';
    }).join('');
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('refresh-btn').addEventListener('click', loadComplaints);

  if (token) {
    loadComplaints();
  }

  const profileModal = document.getElementById('profile-modal');
  const profileClose = document.getElementById('profile-close');
  const profileOverlay = document.getElementById('profile-modal');

  document.querySelector('.user-info').addEventListener('click', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('profile-name').textContent = user.name || 'Citizen';
    document.getElementById('profile-role').textContent = user.role || 'CITIZEN';
    document.getElementById('profile-input-name').value = user.name || '';
    document.getElementById('profile-input-email').value = user.email || '';
    profileModal.hidden = false;
  });

  function closeProfile() {
    profileModal.hidden = true;
  }

  profileClose.addEventListener('click', closeProfile);
  profileOverlay.addEventListener('click', (e) => {
    if (e.target === profileOverlay) closeProfile();
  });

  document.getElementById('profile-save').addEventListener('click', async () => {
    const name = document.getElementById('profile-input-name').value.trim();
    const email = document.getElementById('profile-input-email').value.trim();
    if (!name || !email) return;

    const btn = document.getElementById('profile-save');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });

      if (!res.ok) throw new Error('Failed to save');

      const data = await res.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      document.getElementById('user-name').textContent = data.user.name;
      document.getElementById('profile-name').textContent = data.user.name;
      btn.textContent = 'Saved!';
      setTimeout(() => {
        btn.textContent = 'Save Changes';
        btn.disabled = false;
        closeProfile();
      }, 800);
    } catch {
      btn.textContent = 'Error - try again';
      btn.disabled = false;
      setTimeout(() => { btn.textContent = 'Save Changes'; }, 2000);
    }
  });

  document.getElementById('profile-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  });
})();
