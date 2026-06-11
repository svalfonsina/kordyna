/* ═══════════════════════════════════════════════════════════════════
   KORDYNA — Revision Intelligence Platform
   Application Logic
   ═══════════════════════════════════════════════════════════════════ */

/* ── SAMPLE DATA ───────────────────────────────────────────────────── */

const DISCIPLINES = [
  { id: 1, name: 'Architecture', abbr: 'ARCH', icon: '🏛️', color: '#2E5BFF', bg: 'rgba(46,91,255,0.15)' },
  { id: 2, name: 'Structural', abbr: 'STR', icon: '🔩', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  { id: 3, name: 'Civil', abbr: 'CIV', icon: '🛣️', color: '#0CCE6B', bg: 'rgba(12,206,107,0.15)' },
  { id: 4, name: 'Mechanical', abbr: 'MECH', icon: '⚙️', color: '#FF8C42', bg: 'rgba(255,140,66,0.15)' },
  { id: 5, name: 'Electrical', abbr: 'ELEC', icon: '⚡', color: '#FFA600', bg: 'rgba(255,166,0,0.15)' },
  { id: 6, name: 'Plumbing', abbr: 'PLMB', icon: '🔧', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
  { id: 7, name: 'Landscape', abbr: 'LAND', icon: '🌿', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  { id: 8, name: 'Fire Protection', abbr: 'FP', icon: '🔥', color: '#EF4565', bg: 'rgba(239,69,101,0.15)' },
  { id: 9, name: 'Geotechnical', abbr: 'GEO', icon: '🪨', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' }
];

const USERS = [
  { id: 1, name: 'Sara Vega', initials: 'SV', discipline: 'Landscape' },
  { id: 2, name: 'James Chen', initials: 'JC', discipline: 'Architecture' },
  { id: 3, name: 'Maria Santos', initials: 'MS', discipline: 'Structural' },
  { id: 4, name: 'Kevin Park', initials: 'KP', discipline: 'Civil' },
  { id: 5, name: 'Diana Ross', initials: 'DR', discipline: 'Mechanical' },
  { id: 6, name: 'Tom Baker', initials: 'TB', discipline: 'Electrical' },
  { id: 7, name: 'Lisa Wang', initials: 'LW', discipline: 'Plumbing' }
];

const PROJECTS = [
  {
    id: 1, name: 'Lakeside Mixed Use', client: 'ACME Civil', confidence: 92,
    changes: 4, pendingReviews: 5, conflicts: 1, docs: 14,
    disciplines: [1,2,3,4,5,6,7],
    role: 'Landscape Lead'
  },
  {
    id: 2, name: 'Riverfront Development', client: 'Greenfield Corp', confidence: 84,
    changes: 6, pendingReviews: 8, conflicts: 2, docs: 22,
    disciplines: [1,2,3,5,7,9],
    role: 'Landscape Coordinator'
  },
  {
    id: 3, name: 'Town Center Renovation', client: 'City of Maplewood', confidence: 96,
    changes: 2, pendingReviews: 1, conflicts: 0, docs: 9,
    disciplines: [1,2,3,7],
    role: 'Landscape Lead'
  }
];

const CHANGES = [
  {
    id: 'CE-041', title: 'Grading Revision at North Entry',
    status: 'In Review', risk: 'High', date: 'Jun 9',
    uploadedBy: 'Kevin Park', documents: 3,
    impacted: ['Civil', 'Landscape', 'Structural'],
    reviewProgress: 33, projectId: 1,
    summary: 'Revised grading plan at the north vehicular entry to accommodate updated stormwater management requirements. Changes affect finished floor elevations for Building A and require retaining wall redesign along the northern property line.',
    affectedDocs: ['C4.1 Grading Plan', 'C4.2 Stormwater Details', 'L3.1 Planting Plan'],
    reviews: [
      { discipline: 'Civil', status: 'Reviewed', by: 'Kevin Park', date: 'Jun 8' },
      { discipline: 'Landscape', status: 'Pending', by: 'Sara Vega', date: null },
      { discipline: 'Structural', status: 'Pending', by: 'Maria Santos', date: null }
    ],
    timeline: [
      { text: 'Kevin Park uploaded new grading drawings', time: 'Jun 7, 2:30 PM', type: 'upload' },
      { text: 'System detected 12 change regions across 3 sheets', time: 'Jun 7, 2:31 PM', type: 'system' },
      { text: 'Reviews assigned to Civil, Landscape, Structural', time: 'Jun 7, 2:32 PM', type: 'system' },
      { text: 'Kevin Park completed Civil review', time: 'Jun 8, 10:15 AM', type: 'review' },
      { text: 'Sara Vega flagged potential conflict with planting areas', time: 'Jun 9, 9:00 AM', type: 'conflict' }
    ]
  },
  {
    id: 'CE-040', title: 'MEP Coordination — Level 2 Ceiling',
    status: 'Open', risk: 'Medium', date: 'Jun 8',
    uploadedBy: 'Diana Ross', documents: 4,
    impacted: ['Mechanical', 'Electrical', 'Plumbing', 'Architecture'],
    reviewProgress: 50, projectId: 1,
    summary: 'Ceiling space conflicts between HVAC ductwork and electrical conduit runs on Level 2. Requires coordination between MEP disciplines to establish routing priority and maintain minimum ceiling heights.',
    affectedDocs: ['M2.1 HVAC Plan L2', 'E3.1 Power Plan L2', 'P2.1 Plumbing Plan L2', 'A5.2 RCP Level 2'],
    reviews: [
      { discipline: 'Mechanical', status: 'Reviewed', by: 'Diana Ross', date: 'Jun 7' },
      { discipline: 'Electrical', status: 'Reviewed', by: 'Tom Baker', date: 'Jun 8' },
      { discipline: 'Plumbing', status: 'Pending', by: 'Lisa Wang', date: null },
      { discipline: 'Architecture', status: 'Pending', by: 'James Chen', date: null }
    ],
    timeline: [
      { text: 'Diana Ross uploaded revised HVAC routing', time: 'Jun 6, 4:00 PM', type: 'upload' },
      { text: 'System detected 8 change regions', time: 'Jun 6, 4:01 PM', type: 'system' },
      { text: 'Diana Ross completed Mechanical review', time: 'Jun 7, 11:00 AM', type: 'review' },
      { text: 'Tom Baker completed Electrical review with notes', time: 'Jun 8, 3:30 PM', type: 'review' }
    ]
  },
  {
    id: 'CE-039', title: 'Foundation Redesign — Building B',
    status: 'Conflict', risk: 'High', date: 'Jun 6',
    uploadedBy: 'Maria Santos', documents: 2,
    impacted: ['Structural', 'Civil', 'Geotechnical'],
    reviewProgress: 67, projectId: 1,
    summary: 'Updated foundation design for Building B based on revised geotechnical report. Deeper piles required in the southwest corner due to unexpected soil conditions.',
    affectedDocs: ['S2.1 Foundation Plan', 'S2.2 Pile Schedule'],
    reviews: [
      { discipline: 'Structural', status: 'Reviewed', by: 'Maria Santos', date: 'Jun 5' },
      { discipline: 'Civil', status: 'Reviewed', by: 'Kevin Park', date: 'Jun 6' },
      { discipline: 'Geotechnical', status: 'Conflict', by: null, date: null }
    ],
    timeline: [
      { text: 'Maria Santos uploaded revised foundation plans', time: 'Jun 4, 9:00 AM', type: 'upload' },
      { text: 'System detected 5 change regions across 2 sheets', time: 'Jun 4, 9:01 AM', type: 'system' },
      { text: 'Maria Santos completed Structural review', time: 'Jun 5, 2:00 PM', type: 'review' },
      { text: 'Kevin Park completed Civil review', time: 'Jun 6, 10:00 AM', type: 'review' },
      { text: 'Geotechnical flagged conflict — soil data discrepancy', time: 'Jun 6, 3:00 PM', type: 'conflict' }
    ]
  },
  {
    id: 'CE-038', title: 'Landscape Irrigation Revision',
    status: 'Resolved', risk: 'Low', date: 'Jun 3',
    uploadedBy: 'Sara Vega', documents: 2,
    impacted: ['Landscape', 'Civil'],
    reviewProgress: 100, projectId: 1,
    summary: 'Updated irrigation zones to match revised planting plan. Minor adjustments to head spacing and valve locations. No impact on civil utilities.',
    affectedDocs: ['L4.1 Irrigation Plan', 'L4.2 Irrigation Details'],
    reviews: [
      { discipline: 'Landscape', status: 'Reviewed', by: 'Sara Vega', date: 'Jun 2' },
      { discipline: 'Civil', status: 'Reviewed', by: 'Kevin Park', date: 'Jun 3' }
    ],
    timeline: [
      { text: 'Sara Vega uploaded revised irrigation plans', time: 'Jun 1, 1:00 PM', type: 'upload' },
      { text: 'System detected 3 change regions', time: 'Jun 1, 1:01 PM', type: 'system' },
      { text: 'Sara Vega completed Landscape review', time: 'Jun 2, 10:00 AM', type: 'review' },
      { text: 'Kevin Park completed Civil review — no impact', time: 'Jun 3, 9:00 AM', type: 'review' },
      { text: 'Change event resolved — all reviews complete', time: 'Jun 3, 9:00 AM', type: 'system' }
    ]
  }
];

const DOCUMENTS = [
  { id: 1, code: 'A1.1', title: 'Site Plan', discipline: 'Architecture', rev: 3, by: 'James Chen', date: 'Jun 5' },
  { id: 2, code: 'A2.1', title: 'Floor Plan Level 1', discipline: 'Architecture', rev: 4, by: 'James Chen', date: 'Jun 4' },
  { id: 3, code: 'A5.2', title: 'RCP Level 2', discipline: 'Architecture', rev: 2, by: 'James Chen', date: 'Jun 8' },
  { id: 4, code: 'S2.1', title: 'Foundation Plan', discipline: 'Structural', rev: 3, by: 'Maria Santos', date: 'Jun 4' },
  { id: 5, code: 'S2.2', title: 'Pile Schedule', discipline: 'Structural', rev: 2, by: 'Maria Santos', date: 'Jun 4' },
  { id: 6, code: 'C4.1', title: 'Grading Plan', discipline: 'Civil', rev: 5, by: 'Kevin Park', date: 'Jun 7' },
  { id: 7, code: 'C4.2', title: 'Stormwater Details', discipline: 'Civil', rev: 3, by: 'Kevin Park', date: 'Jun 7' },
  { id: 8, code: 'M2.1', title: 'HVAC Plan Level 2', discipline: 'Mechanical', rev: 2, by: 'Diana Ross', date: 'Jun 6' },
  { id: 9, code: 'E3.1', title: 'Power Plan Level 2', discipline: 'Electrical', rev: 2, by: 'Tom Baker', date: 'Jun 5' },
  { id: 10, code: 'P2.1', title: 'Plumbing Plan Level 2', discipline: 'Plumbing', rev: 1, by: 'Lisa Wang', date: 'May 28' },
  { id: 11, code: 'L3.1', title: 'Planting Plan', discipline: 'Landscape', rev: 3, by: 'Sara Vega', date: 'Jun 2' },
  { id: 12, code: 'L4.1', title: 'Irrigation Plan', discipline: 'Landscape', rev: 4, by: 'Sara Vega', date: 'Jun 1' },
  { id: 13, code: 'L4.2', title: 'Irrigation Details', discipline: 'Landscape', rev: 2, by: 'Sara Vega', date: 'Jun 1' },
  { id: 14, code: 'FP1.1', title: 'Fire Sprinkler Plan', discipline: 'Fire Protection', rev: 1, by: 'Tom Baker', date: 'May 20' }
];

const CONFIDENCE = {
  score: 92,
  factors: [
    { name: 'Review Completion', score: 88, weight: 30, color: 'var(--green)' },
    { name: 'Conflict Resolution', score: 85, weight: 25, color: 'var(--yellow)' },
    { name: 'Impact Coverage', score: 96, weight: 25, color: 'var(--green)' },
    { name: 'Document Currency', score: 98, weight: 20, color: 'var(--green)' }
  ]
};

const ACTIVITY = [
  { text: '<strong>Kevin Park</strong> completed Civil review on CE-041', time: '2 hours ago', type: 'review' },
  { text: '<strong>Sara Vega</strong> flagged conflict on CE-041 planting areas', time: '3 hours ago', type: 'conflict' },
  { text: '<strong>Tom Baker</strong> completed Electrical review on CE-040', time: '5 hours ago', type: 'review' },
  { text: '<strong>Diana Ross</strong> uploaded revised HVAC routing', time: '1 day ago', type: 'upload' },
  { text: '<strong>Maria Santos</strong> uploaded foundation redesign', time: '2 days ago', type: 'upload' },
  { text: '<strong>System</strong> resolved CE-038 — all reviews complete', time: '3 days ago', type: 'review' }
];

const MY_REVIEWS = [
  { id: 1, change: 'CE-041', title: 'Grading Revision at North Entry', discipline: 'Landscape', status: 'pending', project: 'Lakeside Mixed Use', projectId: 1, time: '3h ago', dueIn: 'Due tomorrow' },
  { id: 2, change: 'CE-052', title: 'Retaining Wall Redesign — Phase 2', discipline: 'Landscape', status: 'pending', project: 'Riverfront Development', projectId: 2, time: '6h ago', dueIn: 'Due in 2 days' },
  { id: 3, change: 'CE-053', title: 'Courtyard Planting Revision', discipline: 'Landscape', status: 'pending', project: 'Riverfront Development', projectId: 2, time: '1d ago', dueIn: 'Due in 3 days' },
  { id: 4, change: 'CE-019', title: 'Entry Landscape Buffer Update', discipline: 'Landscape', status: 'pending', project: 'Town Center Renovation', projectId: 3, time: '2d ago', dueIn: 'Due in 4 days' },
  { id: 5, change: 'CE-040', title: 'MEP Coordination — Level 2 Ceiling', discipline: 'Landscape', status: 'conflict', project: 'Lakeside Mixed Use', projectId: 1, time: '1d ago', dueIn: 'Overdue' },
  { id: 6, change: 'CE-050', title: 'Stormwater Basin Grading', discipline: 'Landscape', status: 'pending', project: 'Riverfront Development', projectId: 2, time: '3d ago', dueIn: 'Due in 5 days' },
  { id: 7, change: 'CE-038', title: 'Landscape Irrigation Revision', discipline: 'Landscape', status: 'done', project: 'Lakeside Mixed Use', projectId: 1, time: '5d ago', dueIn: 'Completed' },
  { id: 8, change: 'CE-015', title: 'Plaza Hardscape Revision', discipline: 'Landscape', status: 'done', project: 'Town Center Renovation', projectId: 3, time: '7d ago', dueIn: 'Completed' }
];

const MY_ACTIVITY_LOG = [
  { text: 'You flagged a conflict on <strong>CE-041</strong> planting areas', time: '3 hours ago', type: 'conflict', project: 'Lakeside Mixed Use' },
  { text: 'You completed review on <strong>CE-038</strong> Irrigation Revision', time: '3 days ago', type: 'review', project: 'Lakeside Mixed Use' },
  { text: 'You uploaded revised planting plans for <strong>CE-053</strong>', time: '4 days ago', type: 'upload', project: 'Riverfront Development' },
  { text: 'You completed review on <strong>CE-015</strong> Plaza Hardscape', time: '7 days ago', type: 'review', project: 'Town Center Renovation' },
  { text: 'You commented on <strong>CE-050</strong> stormwater coordination', time: '8 days ago', type: 'comment', project: 'Riverfront Development' }
];


/* ── STATE ─────────────────────────────────────────────────────────── */

let currentProject = null;

/* ── ROUTER ────────────────────────────────────────────────────────── */

const router = {
  current: null,
  go(page, data) {
    document.querySelectorAll('.main .page').forEach(p => p.classList.add('hidden'));
    const el = document.getElementById('page-' + page);
    if (el) { el.classList.remove('hidden'); }
    this.current = page;

    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    updateTopbar(page);

    if (loaders[page]) loaders[page](data);
    window.scrollTo(0, 0);
  }
};


/* ── AUTH ───────────────────────────────────────────────────────────── */

const auth = {
  token: localStorage.getItem('kordyna_token'),

  showTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (tab === 'login' ? i === 0 : i === 1)));
  },

  async login(e) {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    try {
      const body = new URLSearchParams({ username: user, password: pass });
      const res = await fetch('/auth/login', { method: 'POST', body });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      this.token = data.access_token;
      localStorage.setItem('kordyna_token', this.token);
      this.enter();
    } catch (err) {
      const el = document.getElementById('auth-error');
      el.textContent = err.message;
      el.classList.remove('hidden');
    }
    return false;
  },

  async register(e) {
    e.preventDefault();
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;
    const disc = document.getElementById('reg-discipline').value;
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass, discipline_id: disc || null })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Registration failed'); }
      const data = await res.json();
      this.token = data.access_token;
      localStorage.setItem('kordyna_token', this.token);
      this.enter();
    } catch (err) {
      const el = document.getElementById('auth-error');
      el.textContent = err.message;
      el.classList.remove('hidden');
    }
    return false;
  },

  enter() {
    document.getElementById('page-auth').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.getElementById('topbar').classList.remove('hidden');
    document.getElementById('main').style.display = '';
    buildSidebar();
    router.go('workspace');
  },

  logout() {
    this.token = null;
    localStorage.removeItem('kordyna_token');
    currentProject = null;
    document.getElementById('page-auth').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('topbar').classList.add('hidden');
    document.querySelectorAll('.main .page').forEach(p => p.classList.add('hidden'));
  },

  check() {
    if (this.token) this.enter();
    else {
      document.getElementById('main').style.display = 'none';
      loadDisciplineSelects();
    }
  }
};


/* ── PROJECT CONTEXT ───────────────────────────────────────────────── */

function enterProject(projectId) {
  currentProject = PROJECTS.find(p => p.id === projectId) || null;
  updateSidebarProjectState();
  router.go('overview');
}

function exitProject() {
  currentProject = null;
  updateSidebarProjectState();
  router.go('workspace');
}

function updateSidebarProjectState() {
  const projectNav = document.getElementById('sidebar-project-nav');
  const projectLabel = document.getElementById('sidebar-project-label');

  if (currentProject) {
    projectNav.classList.remove('hidden');
    projectLabel.textContent = currentProject.name;
  } else {
    projectNav.classList.add('hidden');
  }

  document.querySelectorAll('.sidebar-project-link').forEach(l => {
    l.classList.toggle('active', currentProject && parseInt(l.dataset.projectId) === currentProject.id);
  });
}

function updateTopbar(page) {
  const centerEl = document.getElementById('topbar-center');
  const infoEl = document.getElementById('topbar-project-info');

  const workspacePages = ['workspace', 'my-reviews', 'my-projects', 'my-activity'];

  if (workspacePages.includes(page)) {
    centerEl.innerHTML = '';
    infoEl.innerHTML = `<span class="topbar-project-name">My Workspace</span>`;
  } else if (currentProject) {
    infoEl.innerHTML = `
      <span class="topbar-back-btn" onclick="exitProject()">← Workspace</span>
      <span class="topbar-project-name">${currentProject.name}</span>
      <span class="topbar-project-client">${currentProject.client}</span>`;
    centerEl.innerHTML = `
      <div class="topbar-confidence">
        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        ${currentProject.confidence}%
      </div>`;
  }
}


/* ── BUILD SIDEBAR ─────────────────────────────────────────────────── */

function buildSidebar() {
  const container = document.getElementById('sidebar-projects');
  container.innerHTML = PROJECTS.map(p => {
    const confColor = p.confidence >= 90 ? 'var(--green)' : p.confidence >= 80 ? 'var(--yellow)' : 'var(--red)';
    return `<a class="sidebar-project-link" data-project-id="${p.id}" onclick="enterProject(${p.id})">
      <span class="sidebar-project-dot" style="background:${confColor}"></span>
      <span>${p.name}</span>
      <span class="sidebar-project-conf">${p.confidence}%</span>
    </a>`;
  }).join('');
}


/* ── UI HELPERS ────────────────────────────────────────────────────── */

const ui = {
  showModal(id) { document.getElementById(id).classList.remove('hidden'); },
  hideModal(id) { document.getElementById(id).classList.add('hidden'); },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 300); }, 3000);
  }
};

function disc(name) { return DISCIPLINES.find(d => d.name === name); }
function statusBadge(s) {
  const map = { 'Open': 'badge-open', 'In Review': 'badge-review', 'Resolved': 'badge-resolved', 'Conflict': 'badge-conflict' };
  return `<span class="badge ${map[s] || 'badge-open'}">${s}</span>`;
}
function reviewStatusBadge(s) {
  const map = { 'Reviewed': 'badge-resolved', 'Pending': 'badge-review', 'Conflict': 'badge-conflict' };
  return `<span class="cd-review-status ${map[s]}" style="background:${s==='Reviewed'?'var(--green-bg)':s==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'}; color:${s==='Reviewed'?'var(--green)':s==='Conflict'?'var(--red)':'var(--yellow)'}">${s}</span>`;
}

function loadDisciplineSelects() {
  const selects = [document.getElementById('reg-discipline'), document.getElementById('doc-upload-discipline')];
  selects.forEach(sel => {
    if (!sel) return;
    DISCIPLINES.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
  });
}


/* ── PAGE LOADERS ──────────────────────────────────────────────────── */

const loaders = {};

/* ── WORKSPACE ─────────────────────────────────────────────────────── */

loaders.workspace = function() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  document.getElementById('ws-greeting').innerHTML = `
    <div class="ws-greeting-line">Hey Sara 👋</div>
    <div class="ws-greeting-sub">${greeting} — here's what needs your attention</div>`;

  const pendingReviews = MY_REVIEWS.filter(r => r.status === 'pending').length;
  const conflictReviews = MY_REVIEWS.filter(r => r.status === 'conflict').length;
  const dueThisWeek = MY_REVIEWS.filter(r => r.status === 'pending').slice(0, 3).length;

  document.getElementById('ws-action-card').innerHTML = `
    <div class="ws-action-stat"><span class="ws-action-num blue">${pendingReviews}</span><span class="ws-action-label">Reviews Pending</span></div>
    <div class="ws-action-sep"></div>
    <div class="ws-action-stat"><span class="ws-action-num red">${conflictReviews}</span><span class="ws-action-label">Conflicts</span></div>
    <div class="ws-action-sep"></div>
    <div class="ws-action-stat"><span class="ws-action-num yellow">${dueThisWeek}</span><span class="ws-action-label">Due This Week</span></div>
    <div class="ws-action-sep"></div>
    <div class="ws-action-stat"><span class="ws-action-num">${PROJECTS.length}</span><span class="ws-action-label">Active Projects</span></div>`;

  const reviewsHtml = MY_REVIEWS.filter(r => r.status !== 'done').slice(0, 5).map(r => {
    const iconClass = r.status === 'conflict' ? 'conflict' : 'pending';
    const iconText = r.status === 'conflict' ? '!' : '⏳';
    const badgeClass = r.status;
    const badgeText = r.status === 'conflict' ? 'Conflict' : 'Pending';
    return `<div class="ws-review-item" onclick="enterProject(${r.projectId})">
      <div class="ws-review-icon ${iconClass}">${iconText}</div>
      <div class="ws-review-body">
        <div class="ws-review-title">${r.change} · ${r.title}</div>
        <div class="ws-review-meta"><span>${r.discipline}</span><span class="dot"></span><span>${r.dueIn}</span></div>
      </div>
      <span class="ws-review-project">${r.project}</span>
      <span class="ws-review-badge ${badgeClass}">${badgeText}</span>
      <span class="ws-review-time">${r.time}</span>
    </div>`;
  }).join('');
  document.getElementById('ws-reviews').innerHTML = reviewsHtml || '<div class="empty-state"><p>No pending reviews</p></div>';

  document.getElementById('ws-projects').innerHTML = PROJECTS.map(p => {
    const confClass = p.confidence >= 90 ? 'high' : p.confidence >= 80 ? 'mid' : 'low';
    return `<div class="ws-project-card" onclick="enterProject(${p.id})">
      <div class="ws-project-card-header">
        <div><div class="ws-project-name">${p.name}</div><div class="ws-project-client">${p.client}</div></div>
        <div class="ws-project-conf ${confClass}">${p.confidence}%</div>
      </div>
      <div class="ws-project-stats">
        <span><span class="ws-project-stat-val">${p.changes}</span> changes</span>
        <span><span class="ws-project-stat-val">${p.pendingReviews}</span> pending</span>
        <span><span class="ws-project-stat-val">${p.conflicts}</span> conflicts</span>
      </div>
    </div>`;
  }).join('');

  document.getElementById('ws-activity').innerHTML = ACTIVITY.slice(0, 5).map(a =>
    `<div class="ws-activity-item">
      <div class="ws-activity-dot ${a.type}"></div>
      <div class="ws-activity-body">
        <div class="ws-activity-text">${a.text}</div>
        <div class="ws-activity-time">${a.time}</div>
      </div>
    </div>`
  ).join('');

  const completed = MY_REVIEWS.filter(r => r.status === 'done').length;
  const avgTime = '1.2d';
  document.getElementById('ws-accountability').innerHTML = `
    <div class="ws-acc-card"><div class="ws-acc-val green">${completed}</div><div class="ws-acc-label">Completed</div></div>
    <div class="ws-acc-card"><div class="ws-acc-val blue">${pendingReviews}</div><div class="ws-acc-label">In Queue</div></div>
    <div class="ws-acc-card"><div class="ws-acc-val yellow">${avgTime}</div><div class="ws-acc-label">Avg Response</div></div>
    <div class="ws-acc-card"><div class="ws-acc-val green">96%</div><div class="ws-acc-label">On-Time Rate</div></div>`;
};

/* ── MY REVIEWS (full page) ────────────────────────────────────────── */

loaders['my-reviews'] = function() {
  document.getElementById('my-reviews-list').innerHTML = MY_REVIEWS.map(r => {
    const iconClass = r.status === 'conflict' ? 'conflict' : r.status === 'done' ? 'done' : 'pending';
    const iconText = r.status === 'conflict' ? '!' : r.status === 'done' ? '✓' : '⏳';
    const badgeClass = r.status === 'done' ? 'done' : r.status;
    const badgeText = r.status === 'conflict' ? 'Conflict' : r.status === 'done' ? 'Completed' : 'Pending';
    return `<div class="ws-review-item" onclick="enterProject(${r.projectId})">
      <div class="ws-review-icon ${iconClass}">${iconText}</div>
      <div class="ws-review-body">
        <div class="ws-review-title">${r.change} · ${r.title}</div>
        <div class="ws-review-meta"><span>${r.discipline}</span><span class="dot"></span><span>${r.dueIn}</span></div>
      </div>
      <span class="ws-review-project">${r.project}</span>
      <span class="ws-review-badge ${badgeClass}">${badgeText}</span>
      <span class="ws-review-time">${r.time}</span>
    </div>`;
  }).join('');
};

/* ── MY PROJECTS (full page) ───────────────────────────────────────── */

loaders['my-projects'] = function() {
  document.getElementById('my-projects-grid').innerHTML = PROJECTS.map(p => {
    const confClass = p.confidence >= 90 ? 'high' : p.confidence >= 80 ? 'mid' : 'low';
    return `<div class="ws-project-card" onclick="enterProject(${p.id})">
      <div class="ws-project-card-header">
        <div><div class="ws-project-name">${p.name}</div><div class="ws-project-client">${p.client}</div></div>
        <div class="ws-project-conf ${confClass}">${p.confidence}%</div>
      </div>
      <div class="ws-project-stats">
        <span><span class="ws-project-stat-val">${p.changes}</span> changes</span>
        <span><span class="ws-project-stat-val">${p.pendingReviews}</span> pending</span>
        <span><span class="ws-project-stat-val">${p.conflicts}</span> conflicts</span>
        <span><span class="ws-project-stat-val">${p.docs}</span> docs</span>
      </div>
    </div>`;
  }).join('');
};

/* ── MY ACTIVITY (full page) ───────────────────────────────────────── */

loaders['my-activity'] = function() {
  document.getElementById('my-activity-list').innerHTML = MY_ACTIVITY_LOG.map(a =>
    `<div class="ws-activity-item">
      <div class="ws-activity-dot ${a.type}"></div>
      <div class="ws-activity-body">
        <div class="ws-activity-text">${a.text}</div>
        <div class="ws-activity-time">${a.time} · ${a.project}</div>
      </div>
    </div>`
  ).join('');
};

/* ── PROJECT OVERVIEW ──────────────────────────────────────────────── */

loaders.overview = function() {
  if (!currentProject) { router.go('workspace'); return; }

  document.getElementById('overview-title').textContent = currentProject.name;
  document.getElementById('kpi-confidence').textContent = currentProject.confidence + '%';
  document.getElementById('kpi-changes').textContent = currentProject.changes;
  document.getElementById('kpi-reviews').textContent = currentProject.pendingReviews;
  document.getElementById('kpi-conflicts').textContent = currentProject.conflicts;
  document.getElementById('kpi-docs').textContent = currentProject.docs;

  const projectChanges = CHANGES.filter(c => c.projectId === currentProject.id);

  document.getElementById('overview-changes').innerHTML = projectChanges.slice(0, 3).map(c =>
    `<div class="cd-timeline-item" style="cursor:pointer" onclick="router.go('change-detail',{id:'${c.id}'})">
      <div class="cd-timeline-dot" style="background:${c.status==='Conflict'?'var(--red)':c.status==='Resolved'?'var(--green)':'var(--yellow)'}"></div>
      <div>
        <div class="cd-timeline-text"><strong>${c.id}</strong> ${c.title}</div>
        <div class="cd-timeline-time">${c.status} · ${c.date}</div>
      </div>
    </div>`
  ).join('') || '<p style="color:var(--text-muted)">No change events</p>';

  document.getElementById('overview-factors').innerHTML = CONFIDENCE.factors.map(f =>
    `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:0.85rem">${f.name}</span>
        <span style="font-size:0.85rem;font-weight:700">${f.score}%</span>
      </div>
      <div class="ct-progress-bar"><div class="ct-progress-fill" style="width:${f.score}%;background:${f.color}"></div></div>
    </div>`
  ).join('');

  const projectReviews = [];
  projectChanges.forEach(c => c.reviews.forEach(r => projectReviews.push({ ...r, change: c.id, changeTitle: c.title })));
  document.getElementById('overview-reviews').innerHTML = projectReviews.filter(r => r.status !== 'Reviewed').slice(0, 4).map(r =>
    `<div class="cd-review-row">
      <div class="cd-review-disc"><span>${r.discipline}</span><span style="color:var(--text-muted);font-size:0.78rem"> · ${r.change}</span></div>
      ${reviewStatusBadge(r.status)}
    </div>`
  ).join('') || '<p style="color:var(--text-muted)">All reviews complete</p>';

  document.getElementById('overview-activity').innerHTML = ACTIVITY.slice(0, 4).map(a =>
    `<div class="cd-timeline-item">
      <div class="cd-timeline-dot" style="background:${a.type==='conflict'?'var(--red)':a.type==='upload'?'var(--primary)':'var(--green)'}"></div>
      <div><div class="cd-timeline-text">${a.text}</div><div class="cd-timeline-time">${a.time}</div></div>
    </div>`
  ).join('');
};

/* ── CHANGES LIST ──────────────────────────────────────────────────── */

loaders.changes = function() {
  const projectChanges = currentProject ? CHANGES.filter(c => c.projectId === currentProject.id) : CHANGES;
  document.getElementById('changes-list').innerHTML = projectChanges.map(c =>
    `<div class="change-row" onclick="router.go('change-detail',{id:'${c.id}'})">
      <span class="ct-id">${c.id}</span>
      <span class="ct-title">${c.title}</span>
      <span class="ct-status">${statusBadge(c.status)}</span>
      <span>${c.uploadedBy}</span>
      <span>${c.documents}</span>
      <span>${c.impacted.length} disciplines</span>
      <span><div class="ct-progress-bar"><div class="ct-progress-fill" style="width:${c.reviewProgress}%"></div></div></span>
      <span class="ct-risk risk-${c.risk.toLowerCase()}">${c.risk}</span>
      <span class="ct-date">${c.date}</span>
      <span class="ct-actions"><svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg></span>
    </div>`
  ).join('');
};

/* ── CHANGE DETAIL ─────────────────────────────────────────────────── */

loaders['change-detail'] = function(data) {
  const c = CHANGES.find(x => x.id === (data && data.id));
  if (!c) return;

  document.getElementById('cd-id').textContent = c.id;
  document.getElementById('cd-title').textContent = c.title;
  document.getElementById('cd-meta').textContent = `Uploaded by ${c.uploadedBy} · ${c.date} · ${c.documents} documents`;

  const statusClass = c.status === 'Resolved' ? 'badge-resolved' : c.status === 'Conflict' ? 'badge-conflict' : 'badge-review';
  document.getElementById('cd-status').className = 'cd-status ' + statusClass;
  document.getElementById('cd-status').textContent = c.status;
  document.getElementById('cd-status').style.background = c.status === 'Resolved' ? 'var(--green-bg)' : c.status === 'Conflict' ? 'var(--red-bg)' : 'var(--yellow-bg)';
  document.getElementById('cd-status').style.color = c.status === 'Resolved' ? 'var(--green)' : c.status === 'Conflict' ? 'var(--red)' : 'var(--yellow)';

  document.getElementById('cd-summary').innerHTML = `<p style="line-height:1.7;color:var(--text-dim)">${c.summary}</p>`;

  document.getElementById('cd-documents').innerHTML = c.affectedDocs.map(d =>
    `<div class="cd-doc-item"><span class="cd-doc-icon">📄</span><span>${d}</span></div>`
  ).join('');

  document.getElementById('cd-reviews').innerHTML = c.reviews.map(r =>
    `<div class="cd-review-row"><div class="cd-review-disc">${r.discipline}</div>${reviewStatusBadge(r.status)}</div>`
  ).join('');

  document.getElementById('cd-disciplines').innerHTML = c.impacted.map(name => {
    const d = disc(name);
    return `<span class="cd-disc-tag"><span class="cd-disc-dot" style="background:${d ? d.color : '#666'}"></span>${name}</span>`;
  }).join('');

  document.getElementById('cd-timeline').innerHTML = c.timeline.map(t =>
    `<div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:${t.type==='conflict'?'var(--red)':t.type==='upload'?'var(--primary)':'var(--green)'}"></div><div><div class="cd-timeline-text">${t.text}</div><div class="cd-timeline-time">${t.time}</div></div></div>`
  ).join('');

  document.getElementById('cd-actions').innerHTML = c.reviews.filter(r => r.status !== 'Reviewed').map(r =>
    `<div class="cd-action-item"><span class="cd-action-bullet"></span><span>Complete ${r.discipline} review</span></div>`
  ).join('') || '<p style="color:var(--text-muted)">No outstanding actions</p>';

  const confImpact = c.status === 'Resolved' ? '+2%' : c.status === 'Conflict' ? '-5%' : '-2%';
  const confColor = c.status === 'Resolved' ? 'var(--green)' : 'var(--red)';
  document.getElementById('cd-confidence').innerHTML = `
    <div class="cd-conf-row"><span>Impact on confidence</span><span style="font-weight:700;color:${confColor}">${confImpact}</span></div>
    <div class="cd-conf-row"><span>Reviews complete</span><span style="font-weight:700">${c.reviews.filter(r=>r.status==='Reviewed').length}/${c.reviews.length}</span></div>
    <div class="cd-conf-row"><span>Risk level</span><span class="ct-risk risk-${c.risk.toLowerCase()}" style="font-weight:700">${c.risk}</span></div>`;

  drawMiniImpactMap(c);
};

/* ── IMPACT MAP ────────────────────────────────────────────────────── */

loaders.impact = function() {
  const sel = document.getElementById('impact-change-select');
  const projectChanges = currentProject ? CHANGES.filter(c => c.projectId === currentProject.id) : CHANGES;
  sel.innerHTML = projectChanges.map(c => `<option value="${c.id}">${c.id} — ${c.title}</option>`).join('');
  renderImpactMap();
};

function renderImpactMap() {
  const changeId = document.getElementById('impact-change-select').value;
  const change = CHANGES.find(c => c.id === changeId);
  if (!change) return;
  const svg = document.getElementById('impact-svg');
  const w = svg.parentElement.offsetWidth;
  const h = svg.parentElement.offsetHeight;
  const cx = w / 2, cy = h / 2;
  let html = `<circle cx="${cx}" cy="${cy}" r="36" fill="var(--primary)" opacity="0.9"/>
    <text x="${cx}" y="${cy-6}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">${change.id}</text>
    <text x="${cx}" y="${cy+10}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="9">Source</text>`;

  const allDiscs = DISCIPLINES;
  const angleStep = (2 * Math.PI) / allDiscs.length;
  const radius = Math.min(w, h) * 0.35;

  allDiscs.forEach((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const review = change.reviews.find(r => r.discipline === d.name);
    const isImpacted = change.impacted.includes(d.name);
    let nodeColor = 'var(--text-muted)';
    if (isImpacted && review) {
      nodeColor = review.status === 'Reviewed' ? 'var(--green)' : review.status === 'Conflict' ? 'var(--red)' : 'var(--yellow)';
    }
    if (isImpacted) {
      html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${nodeColor}" stroke-width="2" opacity="0.4"/>`;
    }
    html += `<g class="impact-node" onclick="showImpactDetail('${d.name}','${changeId}')">
      <circle cx="${nx}" cy="${ny}" r="28" fill="${isImpacted ? nodeColor : 'var(--border)'}" opacity="${isImpacted ? 0.2 : 0.3}"/>
      <circle cx="${nx}" cy="${ny}" r="28" fill="none" stroke="${isImpacted ? nodeColor : 'var(--border)'}" stroke-width="2"/>
      <text x="${nx}" y="${ny-4}" text-anchor="middle" fill="var(--text)" font-size="14">${d.icon}</text>
      <text x="${nx}" y="${ny+14}" text-anchor="middle" fill="var(--text-dim)" font-size="8" font-weight="600">${d.abbr}</text>
    </g>`;
  });
  svg.innerHTML = html;
}

function showImpactDetail(discName, changeId) {
  const d = disc(discName);
  const change = CHANGES.find(c => c.id === changeId);
  const review = change ? change.reviews.find(r => r.discipline === discName) : null;
  const isImpacted = change ? change.impacted.includes(discName) : false;
  const panel = document.getElementById('impact-panel');
  panel.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.5rem">${d ? d.icon : ''}</span>
        <div><div style="font-weight:700">${discName}</div><div style="font-size:0.78rem;color:var(--text-dim)">${isImpacted ? 'Impacted by this change' : 'Not impacted'}</div></div>
      </div>
      ${review ? `<div style="margin-bottom:12px"><span style="font-size:0.78rem;font-weight:600;padding:3px 8px;border-radius:4px;background:${review.status==='Reviewed'?'var(--green-bg)':review.status==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'};color:${review.status==='Reviewed'?'var(--green)':review.status==='Conflict'?'var(--red)':'var(--yellow)'}">${review.status}</span></div>` : ''}
      ${review && review.by ? `<div style="font-size:0.82rem;color:var(--text-dim)">Reviewer: ${review.by}</div>` : ''}
      ${review && review.date ? `<div style="font-size:0.82rem;color:var(--text-dim)">Reviewed: ${review.date}</div>` : ''}
    </div>`;
}

function drawMiniImpactMap(change) {
  const svg = document.getElementById('cd-impact-svg');
  if (!svg) return;
  const w = svg.parentElement.offsetWidth;
  const h = svg.parentElement.offsetHeight;
  const cx = w / 2, cy = h / 2;
  let html = `<circle cx="${cx}" cy="${cy}" r="24" fill="var(--primary)" opacity="0.9"/>
    <text x="${cx}" y="${cy+4}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${change.id}</text>`;
  const impacted = change.impacted.map(name => ({ ...disc(name), review: change.reviews.find(r => r.discipline === name) })).filter(Boolean);
  const angleStep = (2 * Math.PI) / impacted.length;
  const radius = Math.min(w, h) * 0.3;
  impacted.forEach((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const color = d.review ? (d.review.status === 'Reviewed' ? 'var(--green)' : d.review.status === 'Conflict' ? 'var(--red)' : 'var(--yellow)') : 'var(--text-muted)';
    html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${color}" stroke-width="1.5" opacity="0.3"/>`;
    html += `<circle cx="${nx}" cy="${ny}" r="20" fill="${color}" opacity="0.15"/><circle cx="${nx}" cy="${ny}" r="20" fill="none" stroke="${color}" stroke-width="1.5"/>`;
    html += `<text x="${nx}" y="${ny-2}" text-anchor="middle" font-size="12">${d.icon}</text>`;
    html += `<text x="${nx}" y="${ny+12}" text-anchor="middle" fill="var(--text-dim)" font-size="7" font-weight="600">${d.abbr}</text>`;
  });
  svg.innerHTML = html;
}

/* ── REVIEWS ───────────────────────────────────────────────────────── */

let currentReviewTab = 'all';
function reviewTab(tab) {
  currentReviewTab = tab;
  document.querySelectorAll('.review-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loaders.reviews();
}

loaders.reviews = function() {
  const allReviews = [];
  const projectChanges = currentProject ? CHANGES.filter(c => c.projectId === currentProject.id) : CHANGES;
  projectChanges.forEach(c => c.reviews.forEach(r => allReviews.push({ ...r, change: c.id, changeTitle: c.title, changeDate: c.date })));
  let filtered = allReviews;
  if (currentReviewTab === 'mine') filtered = allReviews.filter(r => r.discipline === 'Landscape');
  if (currentReviewTab === 'pending') filtered = allReviews.filter(r => r.status === 'Pending');
  if (currentReviewTab === 'conflict') filtered = allReviews.filter(r => r.status === 'Conflict');
  if (currentReviewTab === 'completed') filtered = allReviews.filter(r => r.status === 'Reviewed');

  document.getElementById('reviews-list').innerHTML = filtered.map(r => {
    const d = disc(r.discipline);
    return `<div class="review-card">
      <div><div class="review-card-title">${r.changeTitle}</div><div class="review-card-sub">${r.change}</div></div>
      <div class="review-card-disc"><span style="color:${d?d.color:'#666'}">${d?d.icon:''}</span> ${r.discipline}</div>
      <div><span class="review-card-status" style="background:${r.status==='Reviewed'?'var(--green-bg)':r.status==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'};color:${r.status==='Reviewed'?'var(--green)':r.status==='Conflict'?'var(--red)':'var(--yellow)'}">${r.status}</span></div>
      <div class="review-card-date">${r.date || 'Not yet'}</div>
      <div class="review-card-action">${r.status==='Pending'?'<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();ui.toast(\'Review submitted\')">Review</button>':r.status==='Conflict'?'<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();ui.toast(\'Opening conflict\')">Resolve</button>':''}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><p>No reviews match this filter</p></div>';
};

/* ── DOCUMENTS ─────────────────────────────────────────────────────── */

loaders.documents = function() {
  const groups = {};
  DOCUMENTS.forEach(d => {
    if (!groups[d.discipline]) groups[d.discipline] = [];
    groups[d.discipline].push(d);
  });

  document.getElementById('doc-accordion').innerHTML = Object.keys(groups).map(name => {
    const d = disc(name);
    const docs = groups[name];
    return `<div class="doc-group open">
      <div class="doc-group-header" onclick="this.parentElement.classList.toggle('open')">
        <span style="color:${d?d.color:'#666'}">${d?d.icon:''}</span>
        <span>${name}</span>
        <span class="count">${docs.length}</span>
        <span class="chevron">▶</span>
      </div>
      <div class="doc-group-body">
        ${docs.map(doc => `<div class="doc-item" onclick="showDocDetail(${doc.id})">
          <span class="doc-item-code">${doc.code}</span>
          <span class="doc-item-name">${doc.title}</span>
          <span class="doc-item-rev">Rev ${doc.rev}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  document.getElementById('doc-detail-panel').innerHTML = `<div class="doc-detail-empty"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><p>Select a document to view details</p></div>`;

  const changeSelect = document.getElementById('doc-upload-change');
  if (changeSelect) {
    const projectChanges = currentProject ? CHANGES.filter(c => c.projectId === currentProject.id) : CHANGES;
    changeSelect.innerHTML = '<option value="">None</option>' + projectChanges.map(c => `<option value="${c.id}">${c.id} — ${c.title}</option>`).join('');
  }
};

function showDocDetail(id) {
  const doc = DOCUMENTS.find(d => d.id === id);
  if (!doc) return;
  const d = disc(doc.discipline);
  document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('doc-detail-panel').innerHTML = `
    <div class="doc-detail-view">
      <div class="doc-detail-title">${doc.code} — ${doc.title}</div>
      <div class="doc-detail-meta">${doc.discipline} · Revision ${doc.rev} · Uploaded by ${doc.by} · ${doc.date}</div>
      <div class="doc-detail-section"><h4>Discipline</h4><p><span style="color:${d?d.color:'#666'}">${d?d.icon:''}</span> ${doc.discipline}</p></div>
      <div class="doc-detail-section"><h4>Revision History</h4><p>Current revision: ${doc.rev}. Last updated ${doc.date} by ${doc.by}.</p></div>
      <div class="doc-detail-section"><h4>Linked Changes</h4><p>${CHANGES.filter(c=>c.affectedDocs.some(ad=>ad.includes(doc.code))).map(c=>`<span style="color:var(--primary);cursor:pointer" onclick="router.go('change-detail',{id:'${c.id}'})">${c.id}</span>`).join(', ')||'None'}</p></div>
    </div>`;
}

/* ── DISCIPLINES ───────────────────────────────────────────────────── */

loaders.disciplines = function() {
  document.getElementById('disciplines-grid').innerHTML = DISCIPLINES.map(d => {
    const reviews = [];
    const projectChanges = currentProject ? CHANGES.filter(c => c.projectId === currentProject.id) : CHANGES;
    projectChanges.forEach(c => c.reviews.filter(r => r.discipline === d.name).forEach(r => reviews.push(r)));
    const reviewed = reviews.filter(r => r.status === 'Reviewed').length;
    const pending = reviews.filter(r => r.status === 'Pending').length;
    const conflicts = reviews.filter(r => r.status === 'Conflict').length;
    const docs = DOCUMENTS.filter(doc => doc.discipline === d.name).length;
    return `<div class="disc-card" onclick="router.go('discipline-detail',{name:'${d.name}'})">
      <div class="disc-icon-wrap" style="background:${d.bg}">${d.icon}</div>
      <div class="disc-card-body">
        <div class="disc-card-name">${d.name}</div>
        <div class="disc-metric-grid">
          <div class="disc-metric"><span class="disc-metric-val" style="color:var(--green)">${reviewed}</span> <span class="disc-metric-label">reviewed</span></div>
          <div class="disc-metric"><span class="disc-metric-val" style="color:var(--yellow)">${pending}</span> <span class="disc-metric-label">pending</span></div>
          <div class="disc-metric"><span class="disc-metric-val" style="color:var(--red)">${conflicts}</span> <span class="disc-metric-label">conflicts</span></div>
          <div class="disc-metric"><span class="disc-metric-val">${docs}</span> <span class="disc-metric-label">documents</span></div>
        </div>
      </div>
    </div>`;
  }).join('');
};

/* ── DISCIPLINE DETAIL ─────────────────────────────────────────────── */

loaders['discipline-detail'] = function(data) {
  const d = disc(data && data.name);
  if (!d) return;
  const reviews = [];
  const projectChanges = currentProject ? CHANGES.filter(c => c.projectId === currentProject.id) : CHANGES;
  projectChanges.forEach(c => c.reviews.filter(r => r.discipline === d.name).forEach(r => reviews.push({ ...r, change: c.id, changeTitle: c.title })));
  const docs = DOCUMENTS.filter(doc => doc.discipline === d.name);

  document.getElementById('dd-header').innerHTML = `
    <div class="disc-icon-wrap" style="background:${d.bg};font-size:1.5rem">${d.icon}</div>
    <div class="dd-header-info"><h1>${d.name}</h1><p>${reviews.length} reviews · ${docs.length} documents</p></div>`;

  document.getElementById('dd-main').innerHTML = `
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Reviews</h2></div><div class="panel-body">
      ${reviews.map(r => `<div class="cd-review-row"><div class="cd-review-disc">${r.change} · ${r.changeTitle}</div>${reviewStatusBadge(r.status)}</div>`).join('') || '<p style="color:var(--text-muted)">No reviews</p>'}
    </div></div>
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Documents</h2></div><div class="panel-body">
      ${docs.map(doc => `<div class="cd-doc-item"><span class="cd-doc-icon">📄</span><span>${doc.code} — ${doc.title}</span><span style="margin-left:auto;font-size:0.78rem;color:var(--text-muted)">Rev ${doc.rev}</span></div>`).join('') || '<p style="color:var(--text-muted)">No documents</p>'}
    </div></div>`;

  const reviewed = reviews.filter(r => r.status === 'Reviewed').length;
  const total = reviews.length;
  const pct = total ? Math.round(reviewed / total * 100) : 0;
  document.getElementById('dd-side').innerHTML = `
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Performance</h2></div><div class="panel-body">
      <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:0.85rem">Review completion</span><span style="font-weight:700">${pct}%</span></div>
      <div class="ct-progress-bar"><div class="ct-progress-fill" style="width:${pct}%;background:var(--green)"></div></div></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>Reviewed</span><span style="font-weight:700;color:var(--green)">${reviewed}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>Pending</span><span style="font-weight:700;color:var(--yellow)">${reviews.filter(r=>r.status==='Pending').length}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.85rem"><span>Conflicts</span><span style="font-weight:700;color:var(--red)">${reviews.filter(r=>r.status==='Conflict').length}</span></div>
    </div></div>`;
};

/* ── CONFIDENCE ────────────────────────────────────────────────────── */

loaders.confidence = function() {
  const score = currentProject ? currentProject.confidence : CONFIDENCE.score;
  const circ = 2 * Math.PI * 42;
  const offset = circ * (1 - score / 100);
  const color = score >= 90 ? 'var(--green)' : score >= 70 ? 'var(--yellow)' : 'var(--red)';
  document.getElementById('conf-ring').innerHTML = `
    <svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="42"/><circle class="ring-fill" cx="50" cy="50" r="42" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/></svg>
    <div class="conf-score-num">${score}%</div>`;

  document.getElementById('conf-main').innerHTML = CONFIDENCE.factors.map(f =>
    `<div class="conf-factor"><div class="conf-factor-header"><span class="conf-factor-name">${f.name}</span><span class="conf-factor-score" style="color:${f.color}">${f.score}%</span></div>
    <div class="conf-factor-bar"><div class="conf-factor-fill" style="width:${f.score}%;background:${f.color}"></div></div></div>`
  ).join('');

  document.getElementById('conf-side').innerHTML = `
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Recommendations</h2></div><div class="panel-body">
      <div class="cd-action-item"><span class="cd-action-bullet" style="background:var(--red)"></span><span>Resolve geotechnical conflict on CE-039</span></div>
      <div class="cd-action-item"><span class="cd-action-bullet"></span><span>Complete pending Landscape review on CE-041</span></div>
      <div class="cd-action-item"><span class="cd-action-bullet"></span><span>Complete Plumbing + Architecture reviews on CE-040</span></div>
    </div></div>`;
};


/* ── ACTIONS ───────────────────────────────────────────────────────── */

const actions = {
  async uploadChange(e) {
    e.preventDefault();
    const title = document.getElementById('change-upload-title').value;
    const btn = document.getElementById('btn-upload-change');
    btn.textContent = 'Comparing...';
    btn.disabled = true;
    setTimeout(() => {
      ui.hideModal('modal-upload-change');
      btn.textContent = 'Compare & Upload';
      btn.disabled = false;
      ui.toast(`Change event "${title}" created`);
    }, 2000);
    return false;
  },

  async uploadDocument(e) {
    e.preventDefault();
    const title = document.getElementById('doc-upload-title').value;
    ui.hideModal('modal-upload-doc');
    ui.toast(`Document "${title}" uploaded`);
    return false;
  },

  async flagConflict(e) {
    e.preventDefault();
    ui.hideModal('modal-conflict');
    ui.toast('Conflict flagged and team notified');
    return false;
  }
};


/* ── INIT ──────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => auth.check());
