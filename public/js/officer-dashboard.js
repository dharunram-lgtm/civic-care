(function() {
  let map = null;
  let mapMarkers = [];
  let complaintsData = [];


  const themeToggle = document.getElementById('theme-toggle-officer');
  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadComplaints();
  });

  function initMap() {
    if (typeof L === 'undefined') {
      document.getElementById('map').innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">Map library loading...</div>';
      return;
    }

    map = L.map('map', {
      center: [28.6139, 77.2090],
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 'CRITICAL': return '#EF4444';
      case 'HIGH': return '#F59E0B';
      case 'MEDIUM': return '#EAB308';
      case 'LOW': return '#10B981';
      default: return '#64748B';
    }
  }

  function createPulseIcon(priority) {
    const color = getPriorityColor(priority);
    const size = priority === 'CRITICAL' ? 20 : 14;
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px ${color}44, 0 0 20px ${color}66;animation:pulse-dot 2s ease-in-out infinite;"></div>`,
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, (size + 8) / 2]
    });
  }

  function updateMapMarkers(complaints) {
    if (!map) return;

    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    complaints.forEach(c => {
      if (c.location && c.location.coordinates) {
        const [lng, lat] = c.location.coordinates;
        const marker = L.marker([lat, lng], {
          icon: createPulseIcon(c.priority)
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:'Inter',sans-serif;min-width:200px;">
            <strong style="color:${getPriorityColor(c.priority)}">${c.priority || 'N/A'}</strong>
            <p style="margin:0.25rem 0;font-weight:600;">${c.title || 'Untitled'}</p>
            <p style="margin:0;font-size:0.8rem;color:#666;">${c.aiCategory || ''}</p>
            <p style="margin:0.25rem 0 0;font-size:0.8rem;color:#888;">AI: ${c.aiConfidenceScore || 0}% | ${c.status || ''}</p>
          </div>
        `);

        marker.on('click', () => highlightTicket(c._id));
        mapMarkers.push(marker);
      }
    });
  }

  function renderQueue(complaints) {
    const queue = document.getElementById('queue-list');
    if (!complaints.length) {
      queue.innerHTML = `
        <div class="queue-empty state-message">
          <div style="font-size:3rem;margin-bottom:0.5rem;">&#128197;</div>
          <p>No complaints match the current filters.</p>
        </div>`;
      return;
    }

    queue.innerHTML = complaints.map(c => {
      const priorityClass = c.priority || 'LOW';
      const statusClass = (c.status || '').replace(/\s+/g, '_');
      const date = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
        <div class="ticket-card glass-card" data-id="${c._id}">
          <div class="ticket-header">
            <div class="ticket-title">${c.title || 'Untitled Issue'}</div>
            <span class="priority-badge ${priorityClass}">${priorityClass}</span>
          </div>
          <div class="ticket-meta">
            <span>&#128205; ${c.departmentId?.name || 'Unassigned'}</span>
            <span>&#128197; ${date}</span>
            <span class="status-badge ${statusClass}">${(c.status || '').replace(/_/g, ' ')}</span>
          </div>
          <div class="ticket-confidence">&#129302; AI Match: ${c.aiConfidenceScore || 0}%</div>
          <div class="ticket-actions">
            ${c.status !== 'ACCEPTED' && c.status !== 'IN_PROGRESS' && c.status !== 'RESOLVED' && c.status !== 'CLOSED' ? `<button class="btn btn-accept accept-btn" data-id="${c._id}">&#10003; Accept</button>` : ''}
            ${c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS' ? `<button class="btn btn-critical dispatch-btn" data-id="${c._id}">&#128666; Dispatch</button>` : ''}
            ${c.status !== 'RESOLVED' && c.status !== 'CLOSED' ? `<button class="btn btn-primary complete-btn" data-id="${c._id}">&#9989; Complete</button>` : ''}
          </div>
        </div>`;
    }).join('');

    queue.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        acceptComplaint(btn.dataset.id);
      });
    });

    queue.querySelectorAll('.dispatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dispatchComplaint(btn.dataset.id);
      });
    });

    queue.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        completeComplaint(btn.dataset.id);
      });
    });

    queue.querySelectorAll('.ticket-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        highlightTicket(id);
        const c = complaintsData.find(x => x._id === id);
        if (c && map) {
          const [lng, lat] = c.location.coordinates;
          map.setView([lat, lng], 16);
        }
      });
    });
  }

  function highlightTicket(id) {
    document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
    const el = document.querySelector(`.ticket-card[data-id="${id}"]`);
    if (el) el.classList.add('selected');
  }

  function updateStats(complaints) {
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    const critical = complaints.filter(c => c.priority === 'CRITICAL' && c.status !== 'RESOLVED' && c.status !== 'CLOSED').length;
    const pending = complaints.filter(c => c.status === 'PENDING_AI_REVIEW' || c.status === 'PENDING_ADMIN_REVIEW').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-resolved').textContent = resolved;
    document.getElementById('stat-critical').textContent = critical;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('active-count').textContent = total - resolved;
    document.getElementById('critical-count').textContent = critical;
    document.getElementById('critical-badge').textContent = critical;
    document.getElementById('total-badge').textContent = total;
  }

  function acceptComplaint(id) {
    const c = complaintsData.find(x => x._id === id);
    if (c) {
      c.status = 'ACCEPTED';
      renderQueue(complaintsData);
      updateStats(complaintsData);
      const btn = document.querySelector(`.accept-btn[data-id="${id}"]`);
      if (btn) {
        btn.textContent = '\u2713 Accepted';
        btn.style.background = 'var(--accent-green)';
      }
    }
  }

  function dispatchComplaint(id) {
    const c = complaintsData.find(x => x._id === id);
    if (c) {
      c.status = 'IN_PROGRESS';
      renderQueue(complaintsData);
      updateStats(complaintsData);
    }
  }

  function completeComplaint(id) {
    const c = complaintsData.find(x => x._id === id);
    if (c) {
      c.status = 'RESOLVED';
      renderQueue(complaintsData);
      updateStats(complaintsData);
    }
  }

  function applyFilters() {
    const statusFilter = document.getElementById('filter-status').value;
    const priorityFilter = document.getElementById('filter-priority').value;

    let filtered = [...complaintsData];
    if (statusFilter) filtered = filtered.filter(c => c.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter(c => c.priority === priorityFilter);

    renderQueue(filtered);
  }

  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('filter-priority').addEventListener('change', applyFilters);

  async function loadComplaints() {
    try {
      const token = localStorage.getItem('civic_care_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let response;
      try {
        response = await fetch('/api/complaints', { headers });
      } catch (e) {
        response = null;
      }

      if (response && response.ok) {
        const data = await response.json();
        complaintsData = data.complaints || [];
      } else {
        complaintsData = [];
      }
    } catch (err) {
      complaintsData = [];
    }

    renderQueue(complaintsData);
    updateStats(complaintsData);
    updateMapMarkers(complaintsData);
  }

  initMap();
  loadComplaints();

  setInterval(() => {
    document.querySelectorAll('.ticket-card').forEach((card, i) => {
      if (!card.classList.contains('selected')) {
        card.style.opacity = '1';
      }
    });
  }, 30000);
})();
