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

// Live projects, loaded from the backend after login.
let PROJECTS = [];

async function loadRealProjects() {
  try {
    const res = await fetch('/projects', { headers: authHeaders() });
    if (!res.ok) { PROJECTS = []; return; }
    const list = await res.json();
    PROJECTS = await Promise.all(list.map(async p => {
      let s = { changes: 0, documents: 0, reviews_pending: 0, reviews_flagged: 0, reviews_total: 0, confidence: 100 };
      try {
        const sr = await fetch(`/projects/${p.id}/summary`, { headers: authHeaders() });
        if (sr.ok) s = await sr.json();
      } catch (e) { /* summary is cosmetic; keep zeros */ }
      return {
        id: p.id, backendId: p.id,
        name: p.name, client: p.description || '',
        confidence: s.confidence, changes: s.changes,
        pendingReviews: s.reviews_pending, conflicts: s.reviews_flagged,
        docs: s.documents
      };
    }));
  } catch (e) {
    PROJECTS = [];
  }
}

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
    this.lastData = data;

    document.querySelectorAll('.sidebar-link, .sidebar-sublink').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    updateTopbar(page);

    if (loaders[page]) loaders[page](data);
    window.scrollTo(0, 0);
  }
};


/* ── API ───────────────────────────────────────────────────────────── */

function authHeaders() {
  return auth.token ? { 'Authorization': 'Bearer ' + auth.token } : {};
}

// Sample projects are frontend-only; create/find the matching backend
// project on first use so uploads have a real project_id to attach to.
async function ensureBackendProject() {
  if (!currentProject) throw new Error('No project selected');
  if (currentProject.backendId) return currentProject.backendId;
  const res = await fetch('/projects', { headers: authHeaders() });
  if (res.status === 401) { auth.logout(); throw new Error('Session expired — please sign in again'); }
  if (res.ok) {
    const list = await res.json();
    const match = list.find(p => p.name === currentProject.name);
    if (match) { currentProject.backendId = match.id; return match.id; }
  }
  const created = await fetch('/projects', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentProject.name, description: currentProject.client })
  });
  if (!created.ok) throw new Error('Could not access project on server');
  const p = await created.json();
  currentProject.backendId = p.id;
  return p.id;
}

// Backend discipline IDs (from /disciplines) may differ from the sample
// DISCIPLINES array, so the upload select is populated from the server.
let SERVER_DISCIPLINES = null;
async function loadServerDisciplines() {
  if (SERVER_DISCIPLINES) return SERVER_DISCIPLINES;
  const res = await fetch('/disciplines');
  if (!res.ok) throw new Error('Could not load disciplines');
  SERVER_DISCIPLINES = await res.json();
  return SERVER_DISCIPLINES;
}


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

  async enter() {
    document.getElementById('page-auth').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.getElementById('topbar').classList.remove('hidden');
    document.getElementById('main').style.display = '';
    await loadRealProjects();
    buildSidebar();
    loadDisciplineSelects();
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
  const p = PROJECTS.find(x => x.id === projectId);
  if (!p) { ui.toast('Project not found'); return; }
  currentProject = p;
  updateSidebarProjectState();
  router.go('overview');
}

/* Shared cache of a project's change events with their reviews. */
const projectChangeCache = {};

async function fetchProjectChanges(force = false) {
  if (!currentProject) return [];
  const pid = currentProject.backendId;
  if (!force && projectChangeCache[pid]) return projectChangeCache[pid];
  try {
    const res = await fetch(`/projects/${pid}/changes`, { headers: authHeaders() });
    const list = res.ok ? await res.json() : [];
    const detailed = await Promise.all(list.map(async c => {
      try {
        const dr = await fetch(`/changes/${c.id}`, { headers: authHeaders() });
        if (dr.ok) { const d = await dr.json(); return { ...c, reviews: d.reviews }; }
      } catch (e) { /* fall through */ }
      return { ...c, reviews: [] };
    }));
    projectChangeCache[pid] = detailed;
    return detailed;
  } catch (e) {
    return [];
  }
}

function changeStatus(c) {
  const total = c.reviews.length;
  const flagged = c.reviews.filter(r => r.status === 'flagged').length;
  const done = c.reviews.filter(r => r.status === 'reviewed').length;
  if (flagged) return 'Conflict';
  if (total && done === total) return 'Resolved';
  if (done > 0) return 'In Review';
  return 'Open';
}
function changeRisk(c) { return c.region_count > 8 ? 'High' : c.region_count > 3 ? 'Medium' : 'Low'; }
function changeProgress(c) {
  const total = c.reviews.length;
  return total ? Math.round(c.reviews.filter(r => r.status === 'reviewed').length / total * 100) : 0;
}
function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function updateReviewStatus(changeId, disciplineId, status) {
  try {
    const res = await fetch(`/changes/${changeId}/reviews/${disciplineId}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Update failed'); }
    ui.toast(status === 'reviewed' ? 'Review completed' : status === 'flagged' ? 'Conflict flagged' : 'Review reopened');
    if (currentProject) delete projectChangeCache[currentProject.backendId];
    await loadRealProjects();
    buildSidebar();
    if (loaders[router.current]) loaders[router.current](router.lastData);
  } catch (err) {
    ui.toast(err.message);
  }
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

  const workspacePages = ['workspace', 'my-reviews', 'my-projects', 'my-activity', 'ops'];

  if (workspacePages.includes(page)) {
    centerEl.innerHTML = '';
    infoEl.innerHTML = `<span class="topbar-project-name">${page === 'ops' ? 'Landscape Operations' : 'My Workspace'}</span>`;
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
  }).join('') + `<a class="sidebar-project-link sidebar-new-project" onclick="ui.showModal('modal-new-project')">
      <span class="sidebar-project-dot" style="background:var(--border-light)"></span>
      <span>＋ New Project</span>
    </a>`;
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

async function loadDisciplineSelects() {
  let list;
  try {
    list = await loadServerDisciplines();
  } catch (e) {
    list = DISCIPLINES;
  }
  const selects = [document.getElementById('reg-discipline'), document.getElementById('doc-upload-discipline')];
  selects.forEach(sel => {
    if (!sel) return;
    Array.from(sel.options).forEach(o => { if (o.value !== '') o.remove(); });
    list.forEach(d => {
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

loaders.workspace = async function() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  document.getElementById('ws-greeting').innerHTML = `
    <div class="ws-greeting-line">Hey Sara 👋</div>
    <div class="ws-greeting-sub">${greeting} — here's what needs your attention</div>`;

  const pendingReviews = PROJECTS.reduce((n, p) => n + p.pendingReviews, 0);
  const conflictReviews = PROJECTS.reduce((n, p) => n + p.conflicts, 0);
  const totalChanges = PROJECTS.reduce((n, p) => n + p.changes, 0);

  document.getElementById('ws-action-card').innerHTML = `
    <div class="ws-action-stat"><span class="ws-action-num blue">${pendingReviews}</span><span class="ws-action-label">Reviews Pending</span></div>
    <div class="ws-action-sep"></div>
    <div class="ws-action-stat"><span class="ws-action-num red">${conflictReviews}</span><span class="ws-action-label">Conflicts</span></div>
    <div class="ws-action-sep"></div>
    <div class="ws-action-stat"><span class="ws-action-num yellow">${totalChanges}</span><span class="ws-action-label">Change Events</span></div>
    <div class="ws-action-sep"></div>
    <div class="ws-action-stat"><span class="ws-action-num">${PROJECTS.length}</span><span class="ws-action-label">Active Projects</span></div>`;

  // Inbox: real pending reviews for the user's discipline
  let myReviews = [];
  try {
    const res = await fetch('/my-reviews', { headers: authHeaders() });
    if (res.ok) myReviews = await res.json();
  } catch (e) { /* show empty state */ }
  const projName = id => (PROJECTS.find(p => p.id === id) || {}).name || `Project ${id}`;
  document.getElementById('ws-reviews').innerHTML = myReviews.slice(0, 6).map(r =>
    `<div class="ws-review-item" onclick="enterProject(${r.project_id})">
      <div class="ws-review-icon pending">⏳</div>
      <div class="ws-review-body">
        <div class="ws-review-title">CE-${r.change_event_id} · ${r.change_title}</div>
        <div class="ws-review-meta"><span>Awaiting your review</span></div>
      </div>
      <span class="ws-review-project">${projName(r.project_id)}</span>
      <span class="ws-review-badge pending">Pending</span>
    </div>`
  ).join('') || '<div class="empty-state" style="min-height:120px"><p>No reviews waiting on you — inbox zero 🎉</p></div>';

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
  }).join('') + `<div class="ws-project-card ws-project-new" onclick="ui.showModal('modal-new-project')">
      <div class="ws-project-new-inner">＋ New Project</div>
    </div>`;

  document.getElementById('ws-activity').innerHTML = ACTIVITY.slice(0, 5).map(a =>
    `<div class="ws-activity-item">
      <div class="ws-activity-dot ${a.type}"></div>
      <div class="ws-activity-body">
        <div class="ws-activity-text">${a.text}</div>
        <div class="ws-activity-time">${a.time}</div>
      </div>
    </div>`
  ).join('');

  document.getElementById('ws-accountability').innerHTML = `
    <div class="ws-acc-card"><div class="ws-acc-val blue">${myReviews.length}</div><div class="ws-acc-label">In Queue</div></div>
    <div class="ws-acc-card"><div class="ws-acc-val red">${conflictReviews}</div><div class="ws-acc-label">Conflicts</div></div>
    <div class="ws-acc-card"><div class="ws-acc-val yellow">${totalChanges}</div><div class="ws-acc-label">Changes</div></div>
    <div class="ws-acc-card"><div class="ws-acc-val green">${PROJECTS.length}</div><div class="ws-acc-label">Projects</div></div>`;
};

/* ── MY REVIEWS (full page) ────────────────────────────────────────── */

loaders['my-reviews'] = async function() {
  let myReviews = [];
  try {
    const res = await fetch('/my-reviews', { headers: authHeaders() });
    if (res.ok) myReviews = await res.json();
  } catch (e) { /* show empty state */ }
  const projName = id => (PROJECTS.find(p => p.id === id) || {}).name || `Project ${id}`;
  document.getElementById('my-reviews-list').innerHTML = myReviews.map(r =>
    `<div class="ws-review-item" onclick="enterProject(${r.project_id})">
      <div class="ws-review-icon pending">⏳</div>
      <div class="ws-review-body">
        <div class="ws-review-title">CE-${r.change_event_id} · ${r.change_title}</div>
        <div class="ws-review-meta"><span>Awaiting your review${r.notes ? ' · ' + r.notes : ''}</span></div>
      </div>
      <span class="ws-review-project">${projName(r.project_id)}</span>
      <span class="ws-review-badge pending">Pending</span>
    </div>`
  ).join('') || '<div class="empty-state"><h3>Inbox zero</h3><p>No reviews are waiting on you. New reviews appear here when drawings change in your projects.</p></div>';
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
  }).join('') + `<div class="ws-project-card ws-project-new" onclick="ui.showModal('modal-new-project')">
      <div class="ws-project-new-inner">＋ New Project</div>
    </div>`;
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

/* ── LANDSCAPE OPERATIONS ──────────────────────────────────────────── */

const OPS_PRIORITIES = [
  {
    id: 1, location: 'Lot 14', project: 'Lakeside Mixed Use',
    issue: 'Needs Water', detail: 'Last watered 6 days ago',
    due: 'Due today', severity: 'high', action: 'Mark Watered',
    lastWatered: '6 days ago', lastInspection: '8 days ago', team: 'Maintenance', risk: 'High',
    notes: 'Plant material showing signs of drought stress. Irrigation line near front bed may be clogged.'
  },
  {
    id: 2, location: 'Nursery Area A', project: 'Oak Ridge',
    issue: 'Inspection Due', detail: 'Nursery stock check required',
    due: 'Due today', severity: 'medium', action: 'Complete Inspection',
    lastWatered: '2 days ago', lastInspection: '14 days ago', team: 'Nursery Crew', risk: 'Medium',
    notes: 'Quarterly nursery stock inspection due. Verify plant counts and check for pest activity.'
  },
  {
    id: 3, location: 'Irrigation Zone 3', project: 'Lakeside Mixed Use',
    issue: 'Possible Line Clog', detail: 'Low pressure reported near front beds',
    due: 'Review today', severity: 'high', action: 'View Issue',
    lastWatered: '1 day ago', lastInspection: '3 days ago', team: 'Irrigation', risk: 'High',
    notes: 'Low pressure reported near front beds. Possible clog in the main supply line — needs on-site diagnosis.'
  }
];

const OPS_SITES = [
  { name: 'Lakeside Mixed Use', open: 8, status: 'Needs Attention' },
  { name: 'Riverfront Townhomes', open: 4, status: 'On Track' },
  { name: 'Oak Ridge', open: 7, status: 'Needs Attention' },
  { name: 'Town Center', open: 2, status: 'On Track' }
];

const OPS_ACTIVITY = [
  'John Martinez watered Lot 18',
  'Sara Chen completed Nursery Area B inspection',
  'Maintenance Crew flagged Lot 14 as Needs Water',
  'Irrigation issue resolved at Riverfront Entry'
];

let opsSelectedId = null;

loaders.ops = function() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('ops-greeting').textContent = `${greeting}, Sara`;

  document.getElementById('ops-stats').innerHTML = `
    <div class="ops-stat"><div class="ops-stat-val" style="color:var(--red)">14</div><div class="ops-stat-label">Need Water</div></div>
    <div class="ops-stat"><div class="ops-stat-val" style="color:var(--yellow)">3</div><div class="ops-stat-label">Inspections Due</div></div>
    <div class="ops-stat"><div class="ops-stat-val" style="color:var(--yellow)">2</div><div class="ops-stat-label">Nursery Issues</div></div>
    <div class="ops-stat"><div class="ops-stat-val" style="color:var(--green)">87%</div><div class="ops-stat-label">Landscape Health</div></div>`;

  if (!OPS_PRIORITIES.find(p => p.id === opsSelectedId)) {
    opsSelectedId = OPS_PRIORITIES.length ? OPS_PRIORITIES[0].id : null;
  }
  renderOpsPriorities();
  renderOpsSites();
  renderOpsDetail();
};

function opsSevColor(sev) { return sev === 'high' ? 'var(--red)' : 'var(--yellow)'; }
function opsSevBg(sev) { return sev === 'high' ? 'var(--red-bg)' : 'var(--yellow-bg)'; }

function renderOpsPriorities() {
  document.getElementById('ops-priorities').innerHTML = OPS_PRIORITIES.map(p => `
    <div class="ops-priority ${p.id === opsSelectedId ? 'selected' : ''}" onclick="opsSelect(${p.id})">
      <div class="ops-priority-main">
        <div class="ops-priority-top">
          <span class="ops-sev-dot" style="background:${opsSevColor(p.severity)}"></span>
          <span class="ops-priority-loc">${p.location}</span>
          <span class="ops-badge" style="background:${opsSevBg(p.severity)};color:${opsSevColor(p.severity)}">${p.issue}</span>
        </div>
        <div class="ops-priority-proj">${p.project}</div>
        <div class="ops-priority-detail">${p.detail}</div>
      </div>
      <div class="ops-priority-side">
        <div class="ops-priority-due">
          <div style="color:${opsSevColor(p.severity)};font-weight:700;font-size:0.82rem">${p.due}</div>
          <div class="ops-priority-next">Next action</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();opsAction(${p.id})">${p.action}</button>
      </div>
    </div>`
  ).join('') || '<div class="empty-state" style="min-height:120px"><p>All clear — no priorities today 🎉</p></div>';
}

function renderOpsSites() {
  document.getElementById('ops-sites').innerHTML = OPS_SITES.map(s => `
    <div class="ops-site-card">
      <div class="ops-site-name">${s.name}</div>
      <div class="ops-site-open">${s.open}</div>
      <div class="ops-site-label">Open items</div>
      <span class="ops-badge" style="background:${s.status === 'On Track' ? 'var(--green-bg)' : 'var(--yellow-bg)'};color:${s.status === 'On Track' ? 'var(--green)' : 'var(--yellow)'}">${s.status}</span>
    </div>`
  ).join('');
}

function renderOpsDetail() {
  const p = OPS_PRIORITIES.find(x => x.id === opsSelectedId);
  const el = document.getElementById('ops-detail');
  if (!p) {
    el.innerHTML = '<div class="empty-state" style="min-height:200px"><p>Select a priority to see details</p></div>';
    return;
  }
  el.innerHTML = `
    <div class="ops-detail-header">
      <div>
        <div class="ops-detail-title">${p.location}</div>
        <div class="ops-detail-proj">${p.project}</div>
      </div>
      <span class="ops-badge" style="background:${opsSevBg(p.severity)};color:${opsSevColor(p.severity)}">${p.issue}</span>
    </div>
    <div class="ops-detail-grid">
      <div class="ops-detail-cell"><div class="ops-detail-cell-label">Last Watered</div><div class="ops-detail-cell-val" style="color:${p.severity==='high'?'var(--red)':'var(--text)'}">${p.lastWatered}</div></div>
      <div class="ops-detail-cell"><div class="ops-detail-cell-label">Last Inspection</div><div class="ops-detail-cell-val">${p.lastInspection}</div></div>
      <div class="ops-detail-cell"><div class="ops-detail-cell-label">Responsible Team</div><div class="ops-detail-cell-val">${p.team}</div></div>
      <div class="ops-detail-cell"><div class="ops-detail-cell-label">Risk Level</div><div class="ops-detail-cell-val" style="color:${opsSevColor(p.severity)}">${p.risk}</div></div>
    </div>
    <div class="ops-detail-notes">
      <div class="ops-detail-cell-label">Notes</div>
      <p>${p.notes}</p>
    </div>
    <div class="ops-detail-actions">
      <button class="ops-btn-green" onclick="opsAction(${p.id})">${p.action}</button>
      <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="ui.toast('Visit scheduled for ${p.location}')">Schedule Visit</button>
      <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="ui.toast('Note added to ${p.location}')">Add Note</button>
    </div>
    <div class="ops-detail-activity">
      <h3>Recent Activity</h3>
      ${OPS_ACTIVITY.slice(0, 3).map((a, i) => `
        <div class="ops-activity-row">
          <span class="ops-activity-dot"></span>
          <div><p>${a}</p><span>${i + 1} day${i === 0 ? '' : 's'} ago</span></div>
        </div>`).join('')}
    </div>`;
}

function opsSelect(id) {
  opsSelectedId = id;
  renderOpsPriorities();
  renderOpsDetail();
}

function opsAction(id) {
  const i = OPS_PRIORITIES.findIndex(p => p.id === id);
  if (i < 0) return;
  const p = OPS_PRIORITIES[i];
  ui.toast(`${p.action}: ${p.location} ✓`);
  OPS_PRIORITIES.splice(i, 1);
  if (opsSelectedId === id) opsSelectedId = OPS_PRIORITIES.length ? OPS_PRIORITIES[0].id : null;
  renderOpsPriorities();
  renderOpsDetail();
}

/* ── PROJECT OVERVIEW ──────────────────────────────────────────────── */

loaders.overview = async function() {
  if (!currentProject) { router.go('workspace'); return; }

  document.getElementById('overview-title').textContent = currentProject.name;
  document.getElementById('kpi-confidence').textContent = currentProject.confidence + '%';
  document.getElementById('kpi-changes').textContent = currentProject.changes;
  document.getElementById('kpi-reviews').textContent = currentProject.pendingReviews;
  document.getElementById('kpi-conflicts').textContent = currentProject.conflicts;
  document.getElementById('kpi-docs').textContent = currentProject.docs;

  const projectChanges = await fetchProjectChanges();

  document.getElementById('overview-changes').innerHTML = projectChanges.slice(0, 4).map(c => {
    const st = changeStatus(c);
    return `<div class="cd-timeline-item" style="cursor:pointer" onclick="router.go('change-detail',{id:${c.id}})">
      <div class="cd-timeline-dot" style="background:${st==='Conflict'?'var(--red)':st==='Resolved'?'var(--green)':'var(--yellow)'}"></div>
      <div>
        <div class="cd-timeline-text"><strong>CE-${c.id}</strong> ${c.title}</div>
        <div class="cd-timeline-time">${st} · ${shortDate(c.created_at)}</div>
      </div>
    </div>`;
  }).join('') || '<p style="color:var(--text-muted)">No change events yet — upload old + new drawings to detect changes.</p>';

  const totalReviews = projectChanges.reduce((n, c) => n + c.reviews.length, 0);
  const doneReviews = projectChanges.reduce((n, c) => n + c.reviews.filter(r => r.status === 'reviewed').length, 0);
  const flaggedReviews = projectChanges.reduce((n, c) => n + c.reviews.filter(r => r.status === 'flagged').length, 0);
  const completion = totalReviews ? Math.round(doneReviews / totalReviews * 100) : 100;
  const conflictFree = totalReviews ? Math.round((totalReviews - flaggedReviews) / totalReviews * 100) : 100;
  const factors = [
    { name: 'Review Completion', score: completion, color: completion >= 80 ? 'var(--green)' : completion >= 50 ? 'var(--yellow)' : 'var(--red)' },
    { name: 'Conflict-Free Reviews', score: conflictFree, color: conflictFree >= 90 ? 'var(--green)' : 'var(--red)' },
    { name: 'Documents on File', score: currentProject.docs > 0 ? 100 : 0, color: currentProject.docs > 0 ? 'var(--green)' : 'var(--yellow)' }
  ];
  document.getElementById('overview-factors').innerHTML = factors.map(f =>
    `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:0.85rem">${f.name}</span>
        <span style="font-size:0.85rem;font-weight:700">${f.score}%</span>
      </div>
      <div class="ct-progress-bar"><div class="ct-progress-fill" style="width:${f.score}%;background:${f.color}"></div></div>
    </div>`
  ).join('');

  const projectReviews = [];
  projectChanges.forEach(c => c.reviews.forEach(r => projectReviews.push({ ...r, change: c.id })));
  document.getElementById('overview-reviews').innerHTML = projectReviews.filter(r => r.status !== 'reviewed').slice(0, 5).map(r =>
    `<div class="cd-review-row">
      <div class="cd-review-disc"><span>${r.discipline}</span><span style="color:var(--text-muted);font-size:0.78rem"> · CE-${r.change}</span></div>
      ${reviewStatusBadge(r.status === 'flagged' ? 'Conflict' : 'Pending')}
    </div>`
  ).join('') || '<p style="color:var(--text-muted)">All reviews complete</p>';

  document.getElementById('overview-activity').innerHTML = projectChanges.slice(0, 4).map(c =>
    `<div class="cd-timeline-item">
      <div class="cd-timeline-dot" style="background:var(--primary)"></div>
      <div><div class="cd-timeline-text"><strong>${c.creator || 'Someone'}</strong> uploaded "${c.title}" — ${c.region_count} regions detected</div><div class="cd-timeline-time">${shortDate(c.created_at)}</div></div>
    </div>`
  ).join('') || '<p style="color:var(--text-muted)">No activity yet</p>';
};

/* ── CHANGES LIST ──────────────────────────────────────────────────── */

loaders.changes = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  const projectChanges = await fetchProjectChanges();
  document.getElementById('changes-list').innerHTML = projectChanges.map(c => {
    const st = changeStatus(c);
    const risk = changeRisk(c);
    return `<div class="change-row" onclick="router.go('change-detail',{id:${c.id}})">
      <span class="ct-id">CE-${c.id}</span>
      <span class="ct-title">${c.title}</span>
      <span class="ct-status">${statusBadge(st)}</span>
      <span>${c.creator || '—'}</span>
      <span>${c.region_count}</span>
      <span>${c.reviews.length} disciplines</span>
      <span><div class="ct-progress-bar"><div class="ct-progress-fill" style="width:${changeProgress(c)}%"></div></div></span>
      <span class="ct-risk risk-${risk.toLowerCase()}">${risk}</span>
      <span class="ct-date">${shortDate(c.created_at)}</span>
      <span class="ct-actions"><svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg></span>
    </div>`;
  }).join('') || '<div class="empty-state"><h3>No change events</h3><p>Upload an old and new version of a drawing — Kordyna detects what changed and routes reviews to every discipline.</p></div>';
};

/* ── CHANGE DETAIL ─────────────────────────────────────────────────── */

loaders['change-detail'] = async function(data) {
  if (!data || data.id == null) return;
  let c = null;
  try {
    const res = await fetch(`/changes/${data.id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Change not found');
    c = await res.json();
  } catch (err) {
    ui.toast(err.message);
    router.go('changes');
    return;
  }
  // Merge in list fields (creator) from the cache if present
  const cached = currentProject && (projectChangeCache[currentProject.backendId] || []).find(x => x.id === c.id);
  c.creator = cached ? cached.creator : null;

  const st = changeStatus(c);
  const risk = changeRisk(c);

  document.getElementById('cd-id').textContent = `CE-${c.id}`;
  document.getElementById('cd-title').textContent = c.title;
  document.getElementById('cd-meta').textContent = `Uploaded${c.creator ? ' by ' + c.creator : ''} · ${shortDate(c.created_at)} · ${c.region_count} change regions`;

  const stEl = document.getElementById('cd-status');
  stEl.textContent = st;
  stEl.style.background = st === 'Resolved' ? 'var(--green-bg)' : st === 'Conflict' ? 'var(--red-bg)' : 'var(--yellow-bg)';
  stEl.style.color = st === 'Resolved' ? 'var(--green)' : st === 'Conflict' ? 'var(--red)' : 'var(--yellow)';

  document.getElementById('cd-summary').innerHTML = `<p style="line-height:1.7;color:var(--text-dim)">Kordyna compared the old and new drawings and detected <strong>${c.region_count} change region${c.region_count === 1 ? '' : 's'}</strong>. Highlighted areas in the diff image below show exactly what moved, was added, or removed. Each discipline reviews the change for impact on their scope.</p>`;

  document.getElementById('cd-documents').innerHTML =
    `<div class="cd-doc-item"><span class="cd-doc-icon">🔍</span><a href="${c.diff_image}" target="_blank">Open full-size diff image</a></div>`;

  document.getElementById('cd-reviews').innerHTML = c.reviews.map(r => {
    const label = r.status === 'reviewed' ? 'Reviewed' : r.status === 'flagged' ? 'Conflict' : 'Pending';
    const buttons = r.status === 'reviewed'
      ? `<button class="btn btn-ghost btn-sm" onclick="updateReviewStatus(${c.id}, ${r.discipline_id}, 'pending')">Reopen</button>`
      : `<button class="btn btn-primary btn-sm" onclick="updateReviewStatus(${c.id}, ${r.discipline_id}, 'reviewed')">Mark Reviewed</button>
         <button class="btn btn-danger btn-sm" onclick="updateReviewStatus(${c.id}, ${r.discipline_id}, 'flagged')">Flag</button>`;
    return `<div class="cd-review-row">
      <div class="cd-review-disc">${r.discipline}</div>
      <div style="display:flex;align-items:center;gap:8px">${reviewStatusBadge(label)}${buttons}</div>
    </div>`;
  }).join('') || '<p style="color:var(--text-muted)">No reviews assigned</p>';

  document.getElementById('cd-disciplines').innerHTML = c.reviews.map(r => {
    const d = disc(r.discipline);
    return `<span class="cd-disc-tag"><span class="cd-disc-dot" style="background:${d ? d.color : 'var(--primary)'}"></span>${r.discipline}</span>`;
  }).join('');

  document.getElementById('cd-timeline').innerHTML = `
    <div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:var(--primary)"></div><div><div class="cd-timeline-text">${c.creator || 'Someone'} uploaded old + new drawings</div><div class="cd-timeline-time">${shortDate(c.created_at)}</div></div></div>
    <div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:var(--green)"></div><div><div class="cd-timeline-text">System detected ${c.region_count} change regions and assigned ${c.reviews.length} discipline reviews</div><div class="cd-timeline-time">${shortDate(c.created_at)}</div></div></div>` +
    c.reviews.filter(r => r.status !== 'pending').map(r =>
      `<div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:${r.status === 'flagged' ? 'var(--red)' : 'var(--green)'}"></div><div><div class="cd-timeline-text">${r.discipline} ${r.status === 'flagged' ? 'flagged a conflict' : 'completed review'}${r.notes ? ' — ' + r.notes : ''}</div><div class="cd-timeline-time">${shortDate(r.updated_at)}</div></div></div>`
    ).join('');

  document.getElementById('cd-actions').innerHTML = c.reviews.filter(r => r.status === 'pending').map(r =>
    `<div class="cd-action-item"><span class="cd-action-bullet"></span><span>Complete ${r.discipline} review</span></div>`
  ).join('') || '<p style="color:var(--text-muted)">No outstanding actions</p>';

  const done = c.reviews.filter(r => r.status === 'reviewed').length;
  document.getElementById('cd-confidence').innerHTML = `
    <div class="cd-conf-row"><span>Reviews complete</span><span style="font-weight:700">${done}/${c.reviews.length}</span></div>
    <div class="cd-conf-row"><span>Conflicts</span><span style="font-weight:700;color:${c.reviews.some(r=>r.status==='flagged')?'var(--red)':'var(--green)'}">${c.reviews.filter(r=>r.status==='flagged').length}</span></div>
    <div class="cd-conf-row"><span>Risk level</span><span class="ct-risk risk-${risk.toLowerCase()}" style="font-weight:700">${risk}</span></div>`;

  // Diff image in place of the sample impact mini-map
  const canvas = document.querySelector('#page-change-detail .cd-impact-canvas');
  if (canvas) {
    canvas.innerHTML = `<img src="${c.diff_image}" alt="Drawing diff" style="width:100%;height:100%;object-fit:contain"
      onerror="this.outerHTML='<div class=&quot;empty-state&quot; style=&quot;min-height:300px&quot;><p>Diff image no longer available (storage was reset). Re-upload the drawings to regenerate it.</p></div>'">`;
  }
};

/* ── IMPACT MAP ────────────────────────────────────────────────────── */

loaders.impact = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  const sel = document.getElementById('impact-change-select');
  const projectChanges = await fetchProjectChanges();
  sel.innerHTML = projectChanges.map(c => `<option value="${c.id}">CE-${c.id} — ${c.title}</option>`).join('')
    || '<option value="">No change events yet</option>';
  renderImpactMap();
};

function renderImpactMap() {
  const changeId = parseInt(document.getElementById('impact-change-select').value);
  const cache = currentProject ? (projectChangeCache[currentProject.backendId] || []) : [];
  const change = cache.find(c => c.id === changeId);
  const svg = document.getElementById('impact-svg');
  if (!change) { svg.innerHTML = ''; return; }
  const w = svg.parentElement.offsetWidth;
  const h = svg.parentElement.offsetHeight;
  const cx = w / 2, cy = h / 2;
  let html = `<circle cx="${cx}" cy="${cy}" r="36" fill="var(--primary)" opacity="0.9"/>
    <text x="${cx}" y="${cy-6}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">CE-${change.id}</text>
    <text x="${cx}" y="${cy+10}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="9">Source</text>`;

  const nodes = change.reviews;
  const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1);
  const radius = Math.min(w, h) * 0.35;

  nodes.forEach((r, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const d = disc(r.discipline);
    const nodeColor = r.status === 'reviewed' ? 'var(--green)' : r.status === 'flagged' ? 'var(--red)' : 'var(--yellow)';
    html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${nodeColor}" stroke-width="2" opacity="0.4"/>`;
    html += `<g class="impact-node" onclick="showImpactDetail('${r.discipline.replace(/'/g, "\\'")}',${change.id})">
      <circle cx="${nx}" cy="${ny}" r="28" fill="${nodeColor}" opacity="0.2"/>
      <circle cx="${nx}" cy="${ny}" r="28" fill="none" stroke="${nodeColor}" stroke-width="2"/>
      <text x="${nx}" y="${ny-4}" text-anchor="middle" fill="var(--text)" font-size="14">${d ? d.icon : '📐'}</text>
      <text x="${nx}" y="${ny+14}" text-anchor="middle" fill="var(--text-dim)" font-size="8" font-weight="600">${r.discipline.slice(0, 6).toUpperCase()}</text>
    </g>`;
  });
  svg.innerHTML = html;
}

function showImpactDetail(discName, changeId) {
  const d = disc(discName);
  const cache = currentProject ? (projectChangeCache[currentProject.backendId] || []) : [];
  const change = cache.find(c => c.id === changeId);
  const review = change ? change.reviews.find(r => r.discipline === discName) : null;
  const label = review ? (review.status === 'reviewed' ? 'Reviewed' : review.status === 'flagged' ? 'Conflict' : 'Pending') : null;
  const panel = document.getElementById('impact-panel');
  panel.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.5rem">${d ? d.icon : '📐'}</span>
        <div><div style="font-weight:700">${discName}</div><div style="font-size:0.78rem;color:var(--text-dim)">Assigned to review this change</div></div>
      </div>
      ${label ? `<div style="margin-bottom:12px"><span style="font-size:0.78rem;font-weight:600;padding:3px 8px;border-radius:4px;background:${label==='Reviewed'?'var(--green-bg)':label==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'};color:${label==='Reviewed'?'var(--green)':label==='Conflict'?'var(--red)':'var(--yellow)'}">${label}</span></div>` : ''}
      ${review && review.notes ? `<div style="font-size:0.82rem;color:var(--text-dim)">Notes: ${review.notes}</div>` : ''}
      ${review && review.status !== 'reviewed' ? `<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="updateReviewStatus(${changeId}, ${review.discipline_id}, 'reviewed')">Mark Reviewed</button>` : ''}
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

loaders.reviews = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  const projectChanges = await fetchProjectChanges();
  const allReviews = [];
  projectChanges.forEach(c => c.reviews.forEach(r => allReviews.push({
    ...r, changeId: c.id, changeTitle: c.title, changeDate: shortDate(c.created_at),
    ui: r.status === 'reviewed' ? 'Reviewed' : r.status === 'flagged' ? 'Conflict' : 'Pending'
  })));
  let filtered = allReviews;
  if (currentReviewTab === 'pending') filtered = allReviews.filter(r => r.ui === 'Pending');
  if (currentReviewTab === 'conflict') filtered = allReviews.filter(r => r.ui === 'Conflict');
  if (currentReviewTab === 'completed') filtered = allReviews.filter(r => r.ui === 'Reviewed');

  document.getElementById('reviews-list').innerHTML = filtered.map(r => {
    const d = disc(r.discipline);
    const action = r.ui === 'Pending'
      ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();updateReviewStatus(${r.changeId}, ${r.discipline_id}, 'reviewed')">Mark Reviewed</button>`
      : r.ui === 'Conflict'
      ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();updateReviewStatus(${r.changeId}, ${r.discipline_id}, 'reviewed')">Resolve</button>`
      : '';
    return `<div class="review-card" onclick="router.go('change-detail',{id:${r.changeId}})">
      <div><div class="review-card-title">${r.changeTitle}</div><div class="review-card-sub">CE-${r.changeId}</div></div>
      <div class="review-card-disc"><span style="color:${d?d.color:'var(--primary)'}">${d?d.icon:'📐'}</span> ${r.discipline}</div>
      <div><span class="review-card-status" style="background:${r.ui==='Reviewed'?'var(--green-bg)':r.ui==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'};color:${r.ui==='Reviewed'?'var(--green)':r.ui==='Conflict'?'var(--red)':'var(--yellow)'}">${r.ui}</span></div>
      <div class="review-card-date">${r.changeDate}</div>
      <div class="review-card-action">${action}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><h3>No reviews here</h3><p>Reviews are created automatically when a change event is uploaded.</p></div>';
};

/* ── DOCUMENTS ─────────────────────────────────────────────────────── */

let DOC_CACHE = [];

async function fetchServerDocuments() {
  if (!auth.token || !currentProject) return [];
  try {
    // Find (don't create) the backend project for the current sample project.
    if (!currentProject.backendId) {
      const res = await fetch('/projects', { headers: authHeaders() });
      if (!res.ok) return [];
      const match = (await res.json()).find(p => p.name === currentProject.name);
      if (!match) return [];
      currentProject.backendId = match.id;
    }
    const res = await fetch(`/projects/${currentProject.backendId}/documents`, { headers: authHeaders() });
    if (!res.ok) return [];
    const docs = await res.json();
    return docs.map(d => ({
      code: '',
      serverId: d.id,
      disciplineId: d.discipline_id,
      title: d.title,
      discipline: d.discipline,
      rev: d.revision,
      by: d.uploaded_by,
      date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      notes: d.notes,
      fileUrl: `/documents/${d.id}/file`,
      filename: d.filename,
      real: true
    }));
  } catch (e) {
    return [];
  }
}

loaders.documents = async function() {
  const serverDocs = await fetchServerDocuments();
  DOC_CACHE = serverDocs;

  // Show only the latest revision of each real document in the list;
  // older revisions stay reachable via Revision History in the detail.
  // (Server returns revisions newest-first per title.)
  const seen = new Set();
  const groups = {};
  DOC_CACHE.forEach((d, i) => {
    if (d.real) {
      const key = d.title + '|' + d.discipline;
      if (seen.has(key)) return;
      seen.add(key);
    }
    if (!groups[d.discipline]) groups[d.discipline] = [];
    groups[d.discipline].push({ ...d, _idx: i });
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
        ${docs.map(doc => `<div class="doc-item" data-idx="${doc._idx}" onclick="showDocDetail(${doc._idx})">
          ${doc.code ? `<span class="doc-item-code">${doc.code}</span>` : ''}
          <span class="doc-item-name">${doc.title}</span>
          <span class="doc-item-rev">Rev ${doc.rev}</span>
          ${doc.real ? `<button class="doc-item-del" onclick="event.stopPropagation();deleteDocAll(${doc._idx})" title="Delete document (all revisions)">
            <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>` : ''}
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  document.getElementById('doc-detail-panel').innerHTML = `<div class="doc-detail-empty"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><p>Select a document to view details</p></div>`;

  const changeSelect = document.getElementById('doc-upload-change');
  if (changeSelect) {
    const projectChanges = await fetchProjectChanges();
    changeSelect.innerHTML = '<option value="">None</option>' + projectChanges.map(c => `<option value="${c.id}">CE-${c.id} — ${c.title}</option>`).join('');
  }
};

function showDocDetail(idx) {
  const doc = DOC_CACHE[idx];
  if (!doc) return;
  const d = disc(doc.discipline);
  document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.doc-item[data-idx="${idx}"]`);
  if (item) item.classList.add('active');
  const linked = doc.code
    ? CHANGES.filter(c => c.affectedDocs.some(ad => ad.includes(doc.code))).map(c => `<span style="color:var(--primary);cursor:pointer" onclick="router.go('change-detail',{id:'${c.id}'})">${c.id}</span>`).join(', ')
    : '';

  // All revisions of this document (same title + discipline), newest first
  const revisions = [];
  DOC_CACHE.forEach((d2, i) => {
    if (d2.real === doc.real && d2.title === doc.title && d2.discipline === doc.discipline) revisions.push({ ...d2, _idx: i });
  });
  revisions.sort((a, b) => b.rev - a.rev);
  const revHistory = revisions.map(r =>
    `<p class="${r._idx === idx ? 'doc-rev-current' : 'doc-rev-link'}" ${r._idx !== idx ? `onclick="showDocDetail(${r._idx})"` : ''}>
      Rev ${r.rev} — ${r.date} by ${r.by}${r._idx === idx ? ' (viewing)' : ''}
    </p>`
  ).join('');

  const fileSection = doc.fileUrl
    ? `<div class="doc-detail-section"><h4>File</h4>
        <p><a onclick="replaceDocFile(${idx})" title="Click to upload a new revision of this file">📄 ${doc.filename}</a>
        <span class="doc-file-hint">click to replace — uploads a new revision</span></p></div>`
    : '';

  document.getElementById('doc-detail-panel').innerHTML = `
    <div class="doc-detail-view">
      <div class="doc-detail-title">${doc.code ? doc.code + ' — ' : ''}${doc.title}</div>
      <div class="doc-detail-meta">${doc.discipline} · Revision ${doc.rev} · Uploaded by ${doc.by} · ${doc.date}</div>
      <div class="doc-detail-section"><h4>Discipline</h4><p><span style="color:${d?d.color:'#666'}">${d?d.icon:''}</span> ${doc.discipline}</p></div>
      <div class="doc-detail-section"><h4>Revision History</h4>${revHistory}</div>
      ${doc.notes ? `<div class="doc-detail-section"><h4>Notes</h4><p>${doc.notes}</p></div>` : ''}
      ${fileSection}
      <div class="doc-detail-section"><h4>Linked Changes</h4><p>${linked || 'None'}</p></div>
      ${doc.fileUrl ? renderFilePreview(doc, idx) : ''}
    </div>`;

  // The DB row can outlive the file (server storage reset) — swap the
  // preview for a clear message instead of an embedded error page.
  if (doc.fileUrl) {
    // 1-byte range GET: the route doesn't accept HEAD (405 even when healthy)
    fetch(doc.fileUrl, { headers: { 'Range': 'bytes=0-0' } }).then(r => {
      if (r.body) r.body.cancel();
      if (r.ok) return;
      const pv = document.querySelector('.doc-preview');
      if (pv) pv.outerHTML = `
        <div class="doc-preview-missing">
          <p>⚠️ The file for this revision is no longer on the server.</p>
          <p>Server storage was reset by a redeploy. Click the file name above to upload it again as a new revision.</p>
        </div>`;
    }).catch(() => {});
  }
}

function renderFilePreview(doc, idx) {
  const ext = (doc.filename || '').split('.').pop().toLowerCase();
  const toolbar = `
    <div class="doc-preview-toolbar">
      <button class="doc-tool-btn" onclick="downloadDoc(${idx})" title="Download">
        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button class="doc-tool-btn" onclick="printDoc(${idx})" title="Print">
        <svg viewBox="0 0 24 24"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      </button>
      <button class="doc-tool-btn doc-tool-danger" onclick="deleteDoc(${idx})" title="Delete revision">
        <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>`;
  if (ext === 'pdf') {
    return `<div class="doc-preview">${toolbar}<iframe id="doc-preview-frame" src="${doc.fileUrl}#toolbar=0&view=FitH" title="${doc.filename}"></iframe></div>`;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return `<div class="doc-preview doc-preview-img">${toolbar}<img src="${doc.fileUrl}" alt="${doc.filename}"></div>`;
  }
  return '';
}

function replaceDocFile(idx) {
  const doc = DOC_CACHE[idx];
  if (!doc || !doc.real) { ui.toast('Sample documents have no file to replace'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.png,.jpg,.jpeg,.tiff,.dwg,.dxf';
  input.onchange = async () => {
    if (!input.files.length) return;
    ui.toast('Uploading new revision...');
    try {
      const projectId = await ensureBackendProject();
      const params = new URLSearchParams({ discipline_id: doc.disciplineId, title: doc.title });
      const form = new FormData();
      form.append('file', input.files[0]);
      const res = await fetch(`/projects/${projectId}/documents?${params}`, {
        method: 'POST', headers: authHeaders(), body: form
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Upload failed (${res.status})`);
      }
      const newDoc = await res.json();
      ui.toast(`"${newDoc.title}" updated — Rev ${newDoc.revision}`);
      await loaders.documents();
      const newIdx = DOC_CACHE.findIndex(d2 => d2.real && d2.serverId === newDoc.id);
      if (newIdx >= 0) showDocDetail(newIdx);
    } catch (err) {
      ui.toast(err.message);
    }
  };
  input.click();
}

async function deleteDocAll(idx) {
  const doc = DOC_CACHE[idx];
  if (!doc || !doc.real) { ui.toast('Sample documents cannot be deleted'); return; }
  const revisions = DOC_CACHE.filter(d => d.real && d.title === doc.title && d.discipline === doc.discipline);
  const label = revisions.length > 1 ? `all ${revisions.length} revisions of "${doc.title}"` : `"${doc.title}"`;
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
  try {
    for (const rev of revisions) {
      const res = await fetch(`/documents/${rev.serverId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
    }
    ui.toast(`"${doc.title}" deleted`);
    await loaders.documents();
  } catch (err) {
    ui.toast(err.message);
    await loaders.documents();
  }
}

async function deleteDoc(idx) {
  const doc = DOC_CACHE[idx];
  if (!doc || !doc.real) { ui.toast('Sample documents cannot be deleted'); return; }
  if (!confirm(`Delete "${doc.title}" Rev ${doc.rev}? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/documents/${doc.serverId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
    ui.toast(`"${doc.title}" Rev ${doc.rev} deleted`);
    await loaders.documents();
  } catch (err) {
    ui.toast(err.message);
  }
}

function downloadDoc(idx) {
  const doc = DOC_CACHE[idx];
  if (!doc || !doc.fileUrl) return;
  const a = document.createElement('a');
  a.href = doc.fileUrl;
  a.download = doc.filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function printDoc(idx) {
  const doc = DOC_CACHE[idx];
  if (!doc || !doc.fileUrl) return;
  const frame = document.getElementById('doc-preview-frame');
  if (frame) {
    try { frame.contentWindow.print(); return; } catch (e) { /* cross-context fallback below */ }
  }
  const w = window.open(doc.fileUrl, '_blank');
  if (w) w.addEventListener('load', () => w.print());
}

/* ── DISCIPLINES ───────────────────────────────────────────────────── */

loaders.disciplines = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  let serverDiscs = [];
  try { serverDiscs = await loadServerDisciplines(); } catch (e) { serverDiscs = []; }
  const projectChanges = await fetchProjectChanges();
  const serverDocs = await fetchServerDocuments();

  document.getElementById('disciplines-grid').innerHTML = serverDiscs.map(sd => {
    const d = disc(sd.name);
    const reviews = [];
    projectChanges.forEach(c => c.reviews.filter(r => r.discipline === sd.name).forEach(r => reviews.push(r)));
    const reviewed = reviews.filter(r => r.status === 'reviewed').length;
    const pending = reviews.filter(r => r.status === 'pending').length;
    const conflicts = reviews.filter(r => r.status === 'flagged').length;
    const docs = serverDocs.filter(doc => doc.discipline === sd.name).length;
    return `<div class="disc-card" onclick="router.go('discipline-detail',{name:'${sd.name.replace(/'/g, "\\'")}'})">
      <div class="disc-icon-wrap" style="background:${d ? d.bg : 'var(--primary-bg)'}">${d ? d.icon : '📐'}</div>
      <div class="disc-card-body">
        <div class="disc-card-name">${sd.name}</div>
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

loaders['discipline-detail'] = async function(data) {
  if (!currentProject) { router.go('workspace'); return; }
  const name = data && data.name;
  if (!name) return;
  const d = disc(name);
  const projectChanges = await fetchProjectChanges();
  const serverDocs = await fetchServerDocuments();
  const reviews = [];
  projectChanges.forEach(c => c.reviews.filter(r => r.discipline === name).forEach(r => reviews.push({
    ...r, changeId: c.id, changeTitle: c.title,
    ui: r.status === 'reviewed' ? 'Reviewed' : r.status === 'flagged' ? 'Conflict' : 'Pending'
  })));
  const docs = serverDocs.filter(doc => doc.discipline === name);

  document.getElementById('dd-header').innerHTML = `
    <div class="disc-icon-wrap" style="background:${d ? d.bg : 'var(--primary-bg)'};font-size:1.5rem">${d ? d.icon : '📐'}</div>
    <div class="dd-header-info"><h1>${name}</h1><p>${reviews.length} reviews · ${docs.length} documents</p></div>`;

  document.getElementById('dd-main').innerHTML = `
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Reviews</h2></div><div class="panel-body">
      ${reviews.map(r => `<div class="cd-review-row" style="cursor:pointer" onclick="router.go('change-detail',{id:${r.changeId}})"><div class="cd-review-disc">CE-${r.changeId} · ${r.changeTitle}</div>${reviewStatusBadge(r.ui)}</div>`).join('') || '<p style="color:var(--text-muted)">No reviews</p>'}
    </div></div>
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Documents</h2></div><div class="panel-body">
      ${docs.map(doc => `<div class="cd-doc-item"><span class="cd-doc-icon">📄</span><span>${doc.title}</span><span style="margin-left:auto;font-size:0.78rem;color:var(--text-muted)">Rev ${doc.rev}</span></div>`).join('') || '<p style="color:var(--text-muted)">No documents</p>'}
    </div></div>`;

  const reviewed = reviews.filter(r => r.ui === 'Reviewed').length;
  const total = reviews.length;
  const pct = total ? Math.round(reviewed / total * 100) : 0;
  document.getElementById('dd-side').innerHTML = `
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Performance</h2></div><div class="panel-body">
      <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:0.85rem">Review completion</span><span style="font-weight:700">${pct}%</span></div>
      <div class="ct-progress-bar"><div class="ct-progress-fill" style="width:${pct}%;background:var(--green)"></div></div></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>Reviewed</span><span style="font-weight:700;color:var(--green)">${reviewed}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>Pending</span><span style="font-weight:700;color:var(--yellow)">${reviews.filter(r=>r.ui==='Pending').length}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.85rem"><span>Conflicts</span><span style="font-weight:700;color:var(--red)">${reviews.filter(r=>r.ui==='Conflict').length}</span></div>
    </div></div>`;
};

/* ── CONFIDENCE ────────────────────────────────────────────────────── */

loaders.confidence = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  const projectChanges = await fetchProjectChanges();
  const score = currentProject.confidence;
  const circ = 2 * Math.PI * 42;
  const offset = circ * (1 - score / 100);
  const color = score >= 90 ? 'var(--green)' : score >= 70 ? 'var(--yellow)' : 'var(--red)';
  document.getElementById('conf-ring').innerHTML = `
    <svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="42"/><circle class="ring-fill" cx="50" cy="50" r="42" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/></svg>
    <div class="conf-score-num">${score}%</div>`;

  const total = projectChanges.reduce((n, c) => n + c.reviews.length, 0);
  const done = projectChanges.reduce((n, c) => n + c.reviews.filter(r => r.status === 'reviewed').length, 0);
  const flagged = projectChanges.reduce((n, c) => n + c.reviews.filter(r => r.status === 'flagged').length, 0);
  const completion = total ? Math.round(done / total * 100) : 100;
  const conflictFree = total ? Math.round((total - flagged) / total * 100) : 100;
  const factors = [
    { name: 'Review Completion', score: completion, color: completion >= 80 ? 'var(--green)' : completion >= 50 ? 'var(--yellow)' : 'var(--red)' },
    { name: 'Conflict-Free Reviews', score: conflictFree, color: conflictFree >= 90 ? 'var(--green)' : 'var(--red)' },
    { name: 'Documents on File', score: currentProject.docs > 0 ? 100 : 0, color: currentProject.docs > 0 ? 'var(--green)' : 'var(--yellow)' }
  ];
  document.getElementById('conf-main').innerHTML = factors.map(f =>
    `<div class="conf-factor"><div class="conf-factor-header"><span class="conf-factor-name">${f.name}</span><span class="conf-factor-score" style="color:${f.color}">${f.score}%</span></div>
    <div class="conf-factor-bar"><div class="conf-factor-fill" style="width:${f.score}%;background:${f.color}"></div></div></div>`
  ).join('');

  const recs = [];
  projectChanges.forEach(c => {
    c.reviews.filter(r => r.status === 'flagged').forEach(r => recs.push({ urgent: true, text: `Resolve ${r.discipline} conflict on CE-${c.id}`, id: c.id }));
  });
  projectChanges.forEach(c => {
    c.reviews.filter(r => r.status === 'pending').forEach(r => recs.push({ urgent: false, text: `Complete ${r.discipline} review on CE-${c.id}`, id: c.id }));
  });
  document.getElementById('conf-side').innerHTML = `
    <div class="panel"><div class="panel-header"><h2 class="panel-title">Recommendations</h2></div><div class="panel-body">
      ${recs.slice(0, 6).map(r => `<div class="cd-action-item" style="cursor:pointer" onclick="router.go('change-detail',{id:${r.id}})"><span class="cd-action-bullet" style="background:${r.urgent ? 'var(--red)' : 'var(--yellow)'}"></span><span>${r.text}</span></div>`).join('')
        || '<p style="color:var(--text-muted)">Nothing outstanding — confidence is healthy.</p>'}
    </div></div>`;
};


/* ── ACTIONS ───────────────────────────────────────────────────────── */

const actions = {
  async uploadChange(e) {
    e.preventDefault();
    const title = document.getElementById('change-upload-title').value.trim();
    const oldFile = document.getElementById('file-old');
    const newFile = document.getElementById('file-new');
    const btn = document.getElementById('btn-upload-change');
    if (!oldFile.files.length || !newFile.files.length) { ui.toast('Choose both an old and a new drawing'); return false; }
    btn.textContent = 'Comparing...';
    btn.disabled = true;
    try {
      const projectId = await ensureBackendProject();
      const form = new FormData();
      form.append('old_file', oldFile.files[0]);
      form.append('new_file', newFile.files[0]);
      const res = await fetch(`/projects/${projectId}/changes?title=${encodeURIComponent(title)}`, {
        method: 'POST', headers: authHeaders(), body: form
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Comparison failed (${res.status})`);
      }
      const change = await res.json();
      ui.hideModal('modal-upload-change');
      e.target.reset();
      ui.toast(`"${change.title}" — ${change.region_count} change regions detected`);
      delete projectChangeCache[projectId];
      await loadRealProjects();
      buildSidebar();
      router.go('change-detail', { id: change.id });
    } catch (err) {
      ui.toast(err.message);
    } finally {
      btn.textContent = 'Compare & Upload';
      btn.disabled = false;
    }
    return false;
  },

  async createProject(e) {
    e.preventDefault();
    const name = document.getElementById('new-project-name').value.trim();
    const client = document.getElementById('new-project-client').value.trim();
    if (!name) return false;
    try {
      const res = await fetch('/projects', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: client || null })
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Could not create project'); }
      const p = await res.json();
      ui.hideModal('modal-new-project');
      e.target.reset();
      ui.toast(`Project "${p.name}" created`);
      await loadRealProjects();
      buildSidebar();
      enterProject(p.id);
    } catch (err) {
      ui.toast(err.message);
    }
    return false;
  },

  async uploadDocument(e) {
    e.preventDefault();
    const titleInput = document.getElementById('doc-upload-title').value.trim();
    const code = document.getElementById('doc-upload-code').value.trim();
    const disciplineId = document.getElementById('doc-upload-discipline').value;
    const notes = document.getElementById('doc-upload-notes').value.trim();
    const fileInput = document.getElementById('file-doc');
    const btn = document.getElementById('btn-upload-doc');

    if (!fileInput.files.length) { ui.toast('Please choose a file'); return false; }
    const title = code ? `${code} — ${titleInput}` : titleInput;

    btn.textContent = 'Uploading...';
    btn.disabled = true;
    try {
      const projectId = await ensureBackendProject();
      const params = new URLSearchParams({ discipline_id: disciplineId, title });
      if (notes) params.set('notes', notes);
      const form = new FormData();
      form.append('file', fileInput.files[0]);
      const res = await fetch(`/projects/${projectId}/documents?${params}`, {
        method: 'POST',
        headers: authHeaders(),
        body: form
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Upload failed (${res.status})`);
      }
      const doc = await res.json();
      ui.hideModal('modal-upload-doc');
      e.target.reset();
      ui.toast(`"${doc.title}" uploaded — Rev ${doc.revision}`);
      if (router.current === 'documents') loaders.documents();
    } catch (err) {
      ui.toast(err.message);
    } finally {
      btn.textContent = 'Upload';
      btn.disabled = false;
    }
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
