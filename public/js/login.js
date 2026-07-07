const API = '/api/auth';

const state = {
  selectedRole: 'CITIZEN',
  isLogin: true
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => selectRole(card.dataset.role));
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  loadDepartments();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (token && user) {
    redirectToDashboard(user.role);
  }
}

function selectRole(role) {
  state.selectedRole = role;
  document.querySelectorAll('.role-card').forEach(c => {
    c.classList.toggle('active', c.dataset.role === role);
  });
  document.getElementById('reg-role').value = role;
  const deptGroup = document.getElementById('dept-group');
  if (role === 'CITIZEN' || role === 'ADMIN') {
    deptGroup.style.display = 'none';
    document.getElementById('reg-dept').required = false;
  } else {
    deptGroup.style.display = 'block';
    document.getElementById('reg-dept').required = true;
  }
}

function switchTab(tab) {
  state.isLogin = tab === 'login';
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('login-section').classList.toggle('active', tab === 'login');
  document.getElementById('register-section').classList.toggle('active', tab === 'register');
}

async function loadDepartments() {
  try {
    const res = await fetch('/api/departments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
    });
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    const select = document.getElementById('reg-dept');
    data.departments?.forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept._id;
      opt.textContent = dept.name;
      select.appendChild(opt);
    });
  } catch {
    const select = document.getElementById('reg-dept');
    const names = ['Sanitation Department', 'Roads Department', 'Municipality Department', 'Electricity Department', 'Traffic Police Department', 'Municipal Corporation', 'Parks & Horticulture Department'];
    names.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      select.appendChild(opt);
    });
  }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) return showError('Please fill in all fields.');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    redirectToDashboard(data.user.role);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = state.selectedRole;
  const departmentId = document.getElementById('reg-dept').value;

  if (!name || !email || !password) return showError('Please fill in all fields.');
  if (password.length < 6) return showError('Password must be at least 6 characters.');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const body = { name, email, password, role };
    if ((role === 'FIELD_OFFICER' || role === 'DEPT_HEAD') && departmentId) {
      body.departmentId = departmentId;
    }

    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    redirectToDashboard(data.user.role);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function redirectToDashboard(role) {
  const map = {
    CITIZEN: '/citizen-report.html',
    FIELD_OFFICER: '/officer-dashboard.html',
    ADMIN: '/admin-dashboard.html',
    DEPT_HEAD: '/dept-head-dashboard.html'
  };
  window.location.href = map[role] || '/';
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}
