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
  { id: 7, name: 'Landscape Architecture', abbr: 'LA', icon: '🌿', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
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


// Returns true and bounces to login if the response is an expired/invalid
// session (401). Callers should stop and return when this is true.
function handleSessionExpired(res) {
  if (res && res.status === 401) {
    ui.toast('Your session expired — please sign in again');
    setTimeout(() => auth.logout(), 1400);
    return true;
  }
  return false;
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
    await loadMe();
    refreshNotifications();
    if (!this._notifTimer) this._notifTimer = setInterval(refreshNotifications, 60000);
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
  updateProjectNavBadges();
  router.go('overview');
}

// Glow a project nav item red when its section has something outstanding.
async function updateProjectNavBadges() {
  if (!currentProject) return;
  let changes = [], tasks = [];
  try { changes = await fetchProjectChanges(); } catch (e) {}
  try {
    const r = await fetch(`/projects/${currentProject.backendId}/tasks`, { headers: authHeaders() });
    if (r.ok) tasks = await r.json();
  } catch (e) {}

  const hasPendingReview = changes.some(c => c.reviews.some(r => r.status === 'pending'));
  const hasConflict = changes.some(c => c.reviews.some(r => r.status === 'flagged'));
  const hasOpenChange = changes.some(c => changeStatus(c) !== 'Resolved');
  const today = new Date().toISOString().slice(0, 10);
  const hasTaskAttention = tasks.some(t =>
    t.status !== 'complete' && (t.status === 'delayed' || t.status === 'at_risk' || (t.due_date && t.due_date < today)));

  const attention = {
    reviews: hasPendingReview || hasConflict,
    changes: hasOpenChange,
    impact: hasConflict,        // Coordination
    schedule: hasTaskAttention
  };
  document.querySelectorAll('#sidebar-project-nav .sidebar-link').forEach(l => {
    l.classList.toggle('has-attention', !!attention[l.dataset.page]);
  });
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
    updateSidebarProjectState();
    updateProjectNavBadges();
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

function renameCurrentProject() {
  if (!currentProject) return;
  document.getElementById('rename-project-name').value = currentProject.name;
  ui.showModal('modal-rename-project');
}

function archiveCurrentProject() {
  if (!currentProject) return;
  document.getElementById('delete-project-text').textContent =
    `Archive "${currentProject.name}"? It will be hidden from your projects but kept safely and can be restored anytime from My Work → Archived.`;
  ui.showModal('modal-delete-project');
}

async function confirmArchiveProject() {
  if (!currentProject) return;
  try {
    const res = await fetch(`/projects/${currentProject.backendId}/archive`, { method: 'PUT', headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (!res.ok) throw new Error(`Archive failed (${res.status})`);
    ui.hideModal('modal-delete-project');
    ui.toast('Project archived — restore anytime from My Work');
    await loadRealProjects();
    buildSidebar();
    exitProject();
  } catch (err) {
    ui.toast(err.message);
  }
}

async function deleteCurrentProjectPermanent() {
  if (!currentProject) return;
  const ok = await ui.confirm({
    title: 'Delete project permanently',
    message: `Permanently delete "${currentProject.name}" and everything in it — changes, reviews, documents, and tasks? This cannot be undone. Use Archive instead if you might want it back.`,
    confirmLabel: 'Delete permanently',
    danger: true
  });
  if (!ok) return;
  try {
    const res = await fetch(`/projects/${currentProject.backendId}`, { method: 'DELETE', headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
    ui.toast('Project deleted');
    await loadRealProjects();
    buildSidebar();
    exitProject();
  } catch (err) {
    ui.toast(err.message);
  }
}

async function restoreProject(projectId) {
  try {
    const res = await fetch(`/projects/${projectId}/restore`, { method: 'PUT', headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (!res.ok) throw new Error(`Restore failed (${res.status})`);
    ui.toast('Project restored');
    await loadRealProjects();
    buildSidebar();
    loaders['my-work']();
  } catch (err) {
    ui.toast(err.message);
  }
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

  const workspacePages = ['workspace', 'my-work', 'ops'];
  const titles = { ops: 'Landscape Operations', settings: 'My Profile', 'my-work': 'My Work' };

  if (workspacePages.includes(page) || page === 'settings') {
    centerEl.innerHTML = '';
    infoEl.innerHTML = `<span class="topbar-project-name">${titles[page] || 'My Workspace'}</span>`;
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
  },
  // Styled replacement for window.confirm(); resolves true/false.
  _confirmResolve: null,
  confirm({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = true } = {}) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-text').textContent = message;
    const btn = document.getElementById('confirm-ok-btn');
    btn.textContent = confirmLabel;
    btn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    this.showModal('modal-confirm');
    return new Promise(resolve => { this._confirmResolve = resolve; });
  },
  confirmOk() { this.hideModal('modal-confirm'); const r = this._confirmResolve; this._confirmResolve = null; if (r) r(true); },
  confirmCancel() { this.hideModal('modal-confirm'); const r = this._confirmResolve; this._confirmResolve = null; if (r) r(false); }
};

function disc(name) { return DISCIPLINES.find(d => d.name === name); }

const DISC_COLORS = {
  'Architecture': '#2E5BFF',
  'Landscape Architecture': '#10B981',
  'Civil Engineering': '#0CCE6B',
  'Mechanical': '#FF8C42',
  'Structural': '#8B5CF6',
  'Survey': '#FFA600',
  'Contractor': '#06B6D4',
  'Realtor': '#EC4899'
};
function discColor(name) { return DISC_COLORS[name] || '#5A6A80'; }
function discAbbr(name) {
  const words = name.split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}
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


/* ── CURRENT USER & PROFILE MENU ───────────────────────────────────── */

let currentUser = null;

function userInitials(name) {
  const parts = (name || '').split(/[\s._-]+/).filter(Boolean);
  const raw = parts.length > 1 ? parts[0][0] + parts[1][0] : (name || '??').slice(0, 2);
  return raw.toUpperCase();
}

let avatarVersion = '';

// Render a circular avatar element as either the uploaded photo or initials.
function applyAvatarEl(el, user, initials) {
  if (!el) return;
  if (user && user.avatar_url) {
    el.textContent = '';
    el.style.backgroundImage = `url("${user.avatar_url}${avatarVersion ? '?t=' + avatarVersion : ''}")`;
    el.classList.add('has-photo');
  } else {
    el.style.backgroundImage = '';
    el.textContent = initials;
    el.classList.remove('has-photo');
  }
}

function applyIdentity() {
  if (!currentUser) return;
  const displayName = currentUser.full_name || currentUser.username;
  const initials = userInitials(displayName);
  const role = currentUser.discipline || 'No discipline set';
  applyAvatarEl(document.getElementById('topbar-avatar'), currentUser, initials);
  applyAvatarEl(document.getElementById('profile-avatar'), currentUser, initials);
  applyAvatarEl(document.getElementById('sidebar-avatar'), currentUser, initials);
  document.getElementById('profile-name').textContent = displayName;
  document.getElementById('profile-role').textContent = role;
  const emailLine = document.getElementById('profile-email-line');
  if (emailLine) emailLine.textContent = currentUser.email || '';
  const companyLine = document.getElementById('profile-company-line');
  if (companyLine) {
    const roleLabel = currentUser.role ? currentUser.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
    companyLine.textContent = currentUser.company_name ? `${currentUser.company_name}${roleLabel ? ' · ' + roleLabel : ''}` : '';
  }
  const sbName = document.getElementById('sidebar-user-name');
  const sbRole = document.getElementById('sidebar-user-role');
  if (sbName) sbName.textContent = displayName;
  if (sbRole) sbRole.textContent = role;
  buildDisciplineSection();
}

// The sidebar Discipline section reflects the signed-in user's discipline.
function buildDisciplineSection() {
  const section = document.getElementById('sidebar-discipline-section');
  if (!section) return;
  const name = currentUser && currentUser.discipline;
  if (!name) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  const color = discColor(name);
  const card = document.getElementById('sidebar-disc-card');
  card.style.borderColor = color + '40';
  card.style.background = color + '14';
  const titleEl = document.getElementById('sidebar-disc-title');
  titleEl.textContent = name;
  titleEl.style.color = color;
  const linksEl = document.getElementById('sidebar-disc-links');
  if (name === 'Landscape Architecture') {
    linksEl.innerHTML = `
      <a class="sidebar-sublink" data-page="ops" onclick="router.go('ops')">Landscape Operations</a>
      <a class="sidebar-sublink" onclick="ui.toast('Nursery Inventory — coming soon')">Nursery Inventory</a>
      <a class="sidebar-sublink" onclick="ui.toast('Irrigation Issues — coming soon')">Irrigation Issues</a>
      <a class="sidebar-sublink" onclick="ui.toast('Maintenance Schedule — coming soon')">Maintenance Schedule</a>`;
  } else {
    linksEl.innerHTML = `<div class="sidebar-disc-empty">Discipline tools coming soon</div>`;
  }
}

async function loadMe() {
  try {
    const res = await fetch('/me', { headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (!res.ok) return;
    currentUser = await res.json();
    applyIdentity();
  } catch (e) { /* header keeps defaults */ }
}

async function uploadAvatar(input) {
  if (!input.files.length) return;
  const form = new FormData();
  form.append('file', input.files[0]);
  try {
    const res = await fetch('/me/avatar', { method: 'POST', headers: authHeaders(), body: form });
    if (handleSessionExpired(res)) { input.value = ''; return; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Upload failed'); }
    currentUser = await res.json();
    avatarVersion = String(Date.now());
    applyIdentity();
    if (router.current === 'settings') loaders.settings();
    ui.toast('Photo updated');
  } catch (err) {
    ui.toast(err.message);
  }
  input.value = '';
}

async function removeAvatar() {
  try {
    const res = await fetch('/me/avatar', { method: 'DELETE', headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (!res.ok) throw new Error('Could not remove photo');
    currentUser = await res.json();
    avatarVersion = String(Date.now());
    applyIdentity();
    if (router.current === 'settings') loaders.settings();
    ui.toast('Photo removed');
  } catch (err) {
    ui.toast(err.message);
  }
}

function toggleProfileMenu(e) {
  e.stopPropagation();
  const panel = document.getElementById('profile-panel');
  const opening = panel.classList.contains('hidden');
  document.getElementById('notif-panel').classList.add('hidden'); // close the other overlay
  panel.classList.toggle('hidden', !opening);
}

function closeProfileMenu() {
  document.getElementById('profile-panel').classList.add('hidden');
}

// One global handler: clicking anywhere outside an open overlay closes it.
document.addEventListener('click', (ev) => {
  const np = document.getElementById('notif-panel');
  const pp = document.getElementById('profile-panel');
  if (np && !np.classList.contains('hidden') && !ev.target.closest('.notif-wrap')) np.classList.add('hidden');
  if (pp && !pp.classList.contains('hidden') && !ev.target.closest('.profile-wrap')) pp.classList.add('hidden');
});

/* ── NOTIFICATIONS ─────────────────────────────────────────────────── */

let notifItems = [];

const NOTIF_ICONS = { review: '⏳', conflict: '⚠️', change: '📐', document: '📄', task: '🗓️' };

async function refreshNotifications() {
  try {
    const res = await fetch('/notifications', { headers: authHeaders() });
    if (!res.ok) return;
    notifItems = await res.json();
    const lastSeen = localStorage.getItem('kordyna_notif_seen') || '';
    const hasUnread = notifItems.some(n => n.at && n.at > lastSeen);
    document.getElementById('notif-dot').classList.toggle('hidden', !hasUnread);
  } catch (e) { /* bell stays quiet on network failure */ }
}

function toggleNotifications(e) {
  e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  const opening = panel.classList.contains('hidden');
  document.getElementById('profile-panel').classList.add('hidden'); // close the other overlay
  panel.classList.toggle('hidden', !opening);
  if (!opening) return;

  renderNotifications();
  // Opening the panel marks everything as seen
  if (notifItems.length && notifItems[0].at) {
    localStorage.setItem('kordyna_notif_seen', notifItems[0].at);
  }
  document.getElementById('notif-dot').classList.add('hidden');
}

function renderNotifications() {
  const lastSeen = localStorage.getItem('kordyna_notif_seen') || '';
  document.getElementById('notif-list').innerHTML = notifItems.map((n, i) =>
    `<div class="notif-item ${n.at && n.at > lastSeen ? 'unread' : ''}" onclick="openNotification(${i})">
      <span class="notif-icon notif-${n.type}">${NOTIF_ICONS[n.type] || '·'}</span>
      <div class="notif-body">
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.at ? shortDate(n.at) : ''}</div>
      </div>
    </div>`
  ).join('') || '<div class="notif-empty">Nothing yet — activity in your projects shows up here.</div>';
}

function openNotification(i) {
  const n = notifItems[i];
  if (!n) return;
  document.getElementById('notif-panel').classList.add('hidden');
  const p = PROJECTS.find(x => x.id === n.project_id);
  if (!p) { ui.toast('Project not available'); return; }
  currentProject = p;
  updateSidebarProjectState();
  if (n.type === 'task') router.go('schedule');
  else if (n.change_id) router.go('change-detail', { id: n.change_id });
  else router.go('documents');
}

/* ── PAGE LOADERS ──────────────────────────────────────────────────── */

const loaders = {};

/* ── WORKSPACE ─────────────────────────────────────────────────────── */

loaders.workspace = async function() {
  const firstName = ((currentUser && (currentUser.full_name || currentUser.username)) || 'there').trim().split(/\s+/)[0];

  document.getElementById('ws-greeting').innerHTML = `
    <div class="ws-greeting-line">Hey ${firstName}</div>
    <div class="ws-greeting-sub">This is what needs attention today.</div>`;

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
  document.getElementById('ws-reviews').innerHTML = myReviews.map(r =>
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

/* ── MY WORK (projects + my real activity) ─────────────────────────── */

loaders['my-work'] = async function() {
  // Projects
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

  // My real activity
  let activity = [];
  try {
    const res = await fetch('/my-activity', { headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (res.ok) activity = await res.json();
  } catch (e) { /* show empty state */ }
  const projName = id => (PROJECTS.find(p => p.backendId === id) || {}).name || '';
  document.getElementById('my-activity-list').innerHTML = activity.map(a =>
    `<div class="ws-activity-item">
      <div class="ws-activity-dot" style="background:${activityDotColor(a.verb, a.type)}"></div>
      <div class="ws-activity-body">
        <div class="ws-activity-text">${a.text}</div>
        <div class="ws-activity-time">${shortDate(a.at)}${projName(a.project_id) ? ' · ' + projName(a.project_id) : ''}</div>
      </div>
    </div>`
  ).join('') || '<div class="empty-state"><h3>Nothing yet</h3><p>Your uploads, reviews, changes, and tasks will show up here as you work.</p></div>';

  // Archived projects (restorable)
  let archived = [];
  try {
    const res = await fetch('/projects/archived', { headers: authHeaders() });
    if (res.ok) archived = await res.json();
  } catch (e) { /* leave empty */ }
  const section = document.getElementById('archived-section');
  section.classList.toggle('hidden', archived.length === 0);
  document.getElementById('archived-list').innerHTML = archived.map(p =>
    `<div class="archived-row">
      <div><div class="archived-name">${p.name}</div>${p.description ? `<div class="archived-client">${p.description}</div>` : ''}</div>
      <button class="btn btn-ghost btn-sm" onclick="restoreProject(${p.id})">Restore</button>
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

/* ── SETTINGS / MY PROFILE ─────────────────────────────────────────── */

loaders.settings = async function() {
  // Discipline dropdown from the established disciplines
  let discs = [];
  try { discs = await loadServerDisciplines(); } catch (e) { discs = []; }
  const sel = document.getElementById('profile-discipline');
  sel.innerHTML = '<option value="">Select a discipline</option>' +
    discs.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

  // Current values
  let me = currentUser;
  try {
    const res = await fetch('/me', { headers: authHeaders() });
    if (res.ok) { me = await res.json(); currentUser = me; }
  } catch (e) { /* fall back to cached currentUser */ }
  if (!me) return;
  document.getElementById('profile-full-name').value = me.full_name || '';
  document.getElementById('profile-email').value = me.email || '';
  document.getElementById('profile-phone').value = me.phone || '';
  document.getElementById('profile-company').value = me.company || '';
  document.getElementById('profile-username').value = me.username || '';
  sel.value = me.discipline_id != null ? String(me.discipline_id) : '';

  // Avatar block: photo or initials, name and role beside it
  const displayName = me.full_name || me.username;
  applyAvatarEl(document.getElementById('avatar-edit-circle'), me, userInitials(displayName));
  document.getElementById('avatar-edit-name').textContent = displayName;
  document.getElementById('avatar-edit-role').textContent = me.discipline || 'No discipline set';
  document.getElementById('avatar-remove-btn').classList.toggle('hidden', !me.avatar_url);
};

/* ── PROJECT OVERVIEW ──────────────────────────────────────────────── */

loaders.overview = async function() {
  if (!currentProject) { router.go('workspace'); return; }

  document.getElementById('overview-title').textContent = currentProject.name;
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
      ? `<button class="btn btn-ghost btn-sm cd-review-btn" onclick="updateReviewStatus(${c.id}, ${r.discipline_id}, 'pending')">Reopen</button>`
      : `<button class="btn btn-primary btn-sm cd-review-btn" onclick="updateReviewStatus(${c.id}, ${r.discipline_id}, 'reviewed')">Mark Reviewed</button>
         <button class="btn btn-danger btn-sm cd-review-btn" onclick="updateReviewStatus(${c.id}, ${r.discipline_id}, 'flagged')">Flag</button>`;
    return `<div class="cd-review-row">
      <div class="cd-review-disc">${r.discipline}</div>
      <div class="cd-review-actions">${reviewStatusBadge(label)}${buttons}</div>
    </div>`;
  }).join('') || '<p style="color:var(--text-muted)">No reviews assigned</p>';

  document.getElementById('cd-disciplines').innerHTML = c.reviews.map(r =>
    `<span class="cd-disc-tag"><span class="cd-disc-dot" style="background:${discColor(r.discipline)}"></span>${r.discipline}</span>`
  ).join('');

  document.getElementById('cd-timeline').innerHTML = `
    <div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:var(--primary)"></div><div><div class="cd-timeline-text">${c.creator || 'Someone'} uploaded old + new drawings</div><div class="cd-timeline-time">${shortDate(c.created_at)}</div></div></div>
    <div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:var(--green)"></div><div><div class="cd-timeline-text">System detected ${c.region_count} change regions and assigned ${c.reviews.length} discipline reviews</div><div class="cd-timeline-time">${shortDate(c.created_at)}</div></div></div>` +
    c.reviews.filter(r => r.status !== 'pending').map(r =>
      `<div class="cd-timeline-item"><div class="cd-timeline-dot" style="background:${r.status === 'flagged' ? 'var(--red)' : 'var(--green)'}"></div><div><div class="cd-timeline-text">${r.discipline} ${r.status === 'flagged' ? 'flagged a conflict' : 'completed review'}${r.notes ? ' — ' + r.notes : ''}</div><div class="cd-timeline-time">${shortDate(r.updated_at)}</div></div></div>`
    ).join('');

  document.getElementById('cd-actions').innerHTML = c.reviews.filter(r => r.status === 'pending').map(r =>
    `<div class="cd-action-item"><span class="cd-action-bullet"></span><span>Complete ${r.discipline} review</span></div>`
  ).join('') || '<p style="color:var(--text-muted)">No outstanding actions</p>';

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
    const nodeColor = r.status === 'reviewed' ? 'var(--green)' : r.status === 'flagged' ? 'var(--red)' : 'var(--yellow)';
    html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${nodeColor}" stroke-width="2" opacity="0.4"/>`;
    html += `<g class="impact-node" onclick="showImpactDetail('${r.discipline.replace(/'/g, "\\'")}',${change.id})" onmouseenter="this.classList.add('is-hover')" onmouseleave="this.classList.remove('is-hover')">
      <circle cx="${nx}" cy="${ny}" r="28" fill="${nodeColor}" opacity="0.2"/>
      <circle cx="${nx}" cy="${ny}" r="28" fill="none" stroke="${nodeColor}" stroke-width="2"/>
      <text x="${nx}" y="${ny-2}" text-anchor="middle" fill="var(--text)" font-size="12" font-weight="800">${discAbbr(r.discipline)}</text>
      <text x="${nx}" y="${ny+12}" text-anchor="middle" fill="var(--text-dim)" font-size="7" font-weight="600">${r.discipline.slice(0, 10).toUpperCase()}</text>
    </g>`;
  });
  svg.innerHTML = html;
}

function showImpactDetail(discName, changeId) {
  const cache = currentProject ? (projectChangeCache[currentProject.backendId] || []) : [];
  const change = cache.find(c => c.id === changeId);
  const review = change ? change.reviews.find(r => r.discipline === discName) : null;
  const label = review ? (review.status === 'reviewed' ? 'Reviewed' : review.status === 'flagged' ? 'Conflict' : 'Pending') : null;
  const panel = document.getElementById('impact-panel');
  if (!change) { panel.innerHTML = ''; return; }
  panel.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <span class="disc-abbr" style="background:${discColor(discName)}22;color:${discColor(discName)}">${discAbbr(discName)}</span>
        <div><div style="font-weight:700">${discName}</div><div style="font-size:0.78rem;color:var(--text-dim)">Reviewing this change</div></div>
      </div>
      ${label ? `<div style="margin-bottom:16px"><span style="font-size:0.78rem;font-weight:600;padding:3px 8px;border-radius:4px;background:${label==='Reviewed'?'var(--green-bg)':label==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'};color:${label==='Reviewed'?'var(--green)':label==='Conflict'?'var(--red)':'var(--yellow)'}">${label}</span></div>` : ''}

      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:6px">Document</div>
      <div style="font-weight:600;margin-bottom:4px">CE-${change.id} — ${change.title}</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:16px">${change.region_count} change region${change.region_count === 1 ? '' : 's'} detected${change.creator ? ' · uploaded by ' + change.creator : ''} · ${shortDate(change.created_at)}</div>

      ${review && review.notes ? `<div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:6px">Review notes</div><div style="font-size:0.82rem;color:var(--text-dim);margin-bottom:16px">${review.notes}</div>` : ''}
      ${review && review.updated_at && review.status !== 'pending' ? `<div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:16px">Last updated ${shortDate(review.updated_at)}</div>` : ''}

      <div style="display:flex;flex-direction:column;gap:8px">
        <a href="${change.diff_image}" target="_blank" class="btn btn-ghost btn-sm" style="text-align:center;text-decoration:none">View diff drawing</a>
        <button class="btn btn-ghost btn-sm" onclick="router.go('change-detail',{id:${change.id}})">Open change detail</button>
        ${review && review.status !== 'reviewed' ? `<button class="btn btn-primary btn-sm" onclick="updateReviewStatus(${changeId}, ${review.discipline_id}, 'reviewed')">Mark Reviewed</button>` : ''}
      </div>
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

  // Group reviews by change event so each change is one collapsible dropdown.
  const groups = {};
  filtered.forEach(r => { (groups[r.changeId] = groups[r.changeId] || []).push(r); });
  const order = projectChanges.map(c => c.id).filter(id => groups[id]);

  const statusStyle = ui =>
    `background:${ui==='Reviewed'?'var(--green-bg)':ui==='Conflict'?'var(--red-bg)':'var(--yellow-bg)'};color:${ui==='Reviewed'?'var(--green)':ui==='Conflict'?'var(--red)':'var(--yellow)'}`;

  document.getElementById('reviews-list').innerHTML = order.map(cid => {
    const rows = groups[cid];
    const title = rows[0].changeTitle;
    const date = rows[0].changeDate;
    const reviewed = rows.filter(r => r.ui === 'Reviewed').length;
    const conflicts = rows.filter(r => r.ui === 'Conflict').length;
    const pending = rows.filter(r => r.ui === 'Pending').length;
    // open by default when something needs attention
    const open = (conflicts || pending) ? 'open' : '';
    const meta = [
      conflicts ? `<span class="rev-meta-pill" style="${statusStyle('Conflict')}">${conflicts} conflict${conflicts>1?'s':''}</span>` : '',
      pending ? `<span class="rev-meta-pill" style="${statusStyle('Pending')}">${pending} pending</span>` : '',
      `<span class="rev-meta-count">${reviewed}/${rows.length} reviewed</span>`
    ].join('');
    const body = rows.map(r => {
      const action = r.ui === 'Pending'
        ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();updateReviewStatus(${r.changeId}, ${r.discipline_id}, 'reviewed')">Mark Reviewed</button>`
        : r.ui === 'Conflict'
        ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();updateReviewStatus(${r.changeId}, ${r.discipline_id}, 'reviewed')">Resolve</button>`
        : '';
      return `<div class="rev-row" onclick="router.go('change-detail',{id:${r.changeId}})">
        <span class="rev-row-disc"><span class="disc-dot" style="background:${discColor(r.discipline)}"></span> ${r.discipline}</span>
        <span class="review-card-status" style="${statusStyle(r.ui)}">${r.ui}</span>
        <span class="rev-row-date">${r.changeDate}</span>
        <span class="rev-row-action">${action}</span>
      </div>`;
    }).join('');
    return `<div class="rev-group ${open}">
      <div class="rev-group-header" onclick="this.parentElement.classList.toggle('open')">
        <div class="rev-group-title"><span class="chevron">▶</span><strong>${title}</strong><span class="rev-ce">CE-${cid}</span></div>
        <div class="rev-group-meta">${meta}<span class="rev-group-date">${date}</span></div>
      </div>
      <div class="rev-group-body">${body}</div>
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
      createdAtRaw: d.created_at,
      notes: d.notes,
      fileUrl: d.file_url || `/documents/${d.id}/file`,
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

  // Every discipline is always listed — the whole team's sections stay
  // visible even before they have uploaded anything.
  let serverDiscs = [];
  try { serverDiscs = await loadServerDisciplines(); } catch (e) { serverDiscs = []; }
  const groups = {};
  serverDiscs.forEach(sd => { groups[sd.name] = []; });

  // Show only the latest revision of each real document in the list;
  // older revisions stay reachable via Revision History in the detail.
  // (Server returns revisions newest-first per title.)
  const seen = new Set();
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
    const docs = groups[name];
    return `<div class="doc-group ${docs.length ? 'open' : ''}">
      <div class="doc-group-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="disc-dot" style="background:${discColor(name)}"></span>
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
        </div>`).join('') || '<div class="doc-group-empty">No documents yet</div>'}
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

  const revHistory = `<p class="doc-rev-current">Rev ${doc.rev} — ${doc.date} by ${doc.by}</p>`;

  const fileSection = doc.fileUrl
    ? `<div class="doc-detail-section"><h4>File</h4>
        <p><a onclick="replaceDocFile(${idx})" title="Click to upload a new revision of this file">📄 ${doc.filename}</a>
        <span class="doc-file-hint">click to replace — uploads a new revision</span></p></div>`
    : '';

  document.getElementById('doc-detail-panel').innerHTML = `
    <div class="doc-detail-view">
      <div class="doc-detail-title">${doc.code ? doc.code + ' — ' : ''}${doc.title}</div>
      <div class="doc-detail-meta">${doc.discipline} · Revision ${doc.rev} · Uploaded by ${doc.by} · ${doc.date}</div>
      <div class="doc-detail-section"><h4>Discipline</h4><p><span class="disc-dot" style="background:${discColor(doc.discipline)}"></span> ${doc.discipline}</p></div>
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
  if (!(await ui.confirm({ title: 'Delete document', message: `Delete ${label}? This cannot be undone.`, confirmLabel: 'Delete' }))) return;
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
  if (!(await ui.confirm({ title: 'Delete revision', message: `Delete "${doc.title}" Rev ${doc.rev}? This cannot be undone.`, confirmLabel: 'Delete' }))) return;
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
    const reviews = [];
    projectChanges.forEach(c => c.reviews.filter(r => r.discipline === sd.name).forEach(r => reviews.push(r)));
    const reviewed = reviews.filter(r => r.status === 'reviewed').length;
    const pending = reviews.filter(r => r.status === 'pending').length;
    const conflicts = reviews.filter(r => r.status === 'flagged').length;
    const docs = serverDocs.filter(doc => doc.discipline === sd.name).length;
    return `<div class="disc-card" onclick="router.go('discipline-detail',{name:'${sd.name.replace(/'/g, "\\'")}'})">
      <div class="disc-icon-wrap disc-abbr-wrap" style="background:${discColor(sd.name)}22;color:${discColor(sd.name)}">${discAbbr(sd.name)}</div>
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
    <div class="disc-icon-wrap disc-abbr-wrap" style="background:${discColor(name)}22;color:${discColor(name)};font-size:1.2rem">${discAbbr(name)}</div>
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

/* ── PROJECT ACTIVITY ──────────────────────────────────────────────── */

function activityDotColor(verb, type) {
  if (verb === 'flagged_conflict' || verb === 'deleted') return 'var(--red)';
  if (verb === 'completed_review' || verb === 'completed_task') return 'var(--green)';
  if (type === 'document') return 'var(--primary)';
  if (type === 'task') return 'var(--yellow)';
  return 'var(--primary)';
}

loaders.activity = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  let events = [];
  try {
    const res = await fetch(`/projects/${currentProject.backendId}/activity`, { headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (res.ok) events = await res.json();
  } catch (e) { events = []; }

  document.getElementById('activity-list').innerHTML = events.map(e =>
    `<div class="ws-activity-item">
      <div class="ws-activity-dot" style="background:${activityDotColor(e.verb, e.type)}"></div>
      <div class="ws-activity-body">
        <div class="ws-activity-text">${e.text}</div>
        <div class="ws-activity-time">${shortDate(e.at)}</div>
      </div>
    </div>`
  ).join('') || '<div class="empty-state"><h3>No activity yet</h3><p>Uploads, reviews, changes, and tasks in this project will appear here.</p></div>';
};


/* ── SCHEDULE ──────────────────────────────────────────────────────── */

const TASK_STATUS = {
  complete: { label: 'Complete', color: '#00C48C' },
  on_track: { label: 'On Track', color: '#2E5BFF' },
  at_risk:  { label: 'At Risk',  color: '#FFB547' },
  delayed:  { label: 'Delayed',  color: '#FF5A5F' }
};
let scheduleTasks = [];
let scheduleView = 'gantt';

loaders.schedule = async function() {
  if (!currentProject) { router.go('workspace'); return; }
  try {
    const res = await fetch(`/projects/${currentProject.backendId}/tasks`, { headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    scheduleTasks = res.ok ? await res.json() : [];
  } catch (e) { scheduleTasks = []; }

  // Summary by status
  const counts = { complete: 0, on_track: 0, at_risk: 0, delayed: 0 };
  scheduleTasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
  document.getElementById('sched-summary').innerHTML = `
    <div class="sched-stat"><div class="sched-stat-val">${scheduleTasks.length}</div><div class="sched-stat-label">Total Tasks</div></div>
    <div class="sched-stat"><div class="sched-stat-val" style="color:${TASK_STATUS.on_track.color}">${counts.on_track}</div><div class="sched-stat-label">On Track</div></div>
    <div class="sched-stat"><div class="sched-stat-val" style="color:${TASK_STATUS.at_risk.color}">${counts.at_risk}</div><div class="sched-stat-label">At Risk</div></div>
    <div class="sched-stat"><div class="sched-stat-val" style="color:${TASK_STATUS.delayed.color}">${counts.delayed}</div><div class="sched-stat-label">Delayed</div></div>
    <div class="sched-stat"><div class="sched-stat-val" style="color:${TASK_STATUS.complete.color}">${counts.complete}</div><div class="sched-stat-label">Complete</div></div>`;

  renderSchedule();
  updateProjectNavBadges();
};

function schedView(v) {
  scheduleView = v;
  document.querySelectorAll('.sched-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  renderSchedule();
}

function groupByDiscipline(tasks) {
  const groups = {};
  tasks.forEach(t => {
    const key = t.discipline || 'Unassigned';
    (groups[key] = groups[key] || []).push(t);
  });
  return groups;
}

function taskStatusBadge(status) {
  const s = TASK_STATUS[status] || TASK_STATUS.on_track;
  return `<span class="task-badge" style="background:${s.color}22;color:${s.color}">${s.label}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function renderSchedule() {
  const body = document.getElementById('sched-body');
  if (scheduleView === 'mine') {
    let mine = [];
    try {
      const res = await fetch('/my-tasks', { headers: authHeaders() });
      if (res.ok) mine = await res.json();
    } catch (e) {}
    body.innerHTML = renderTaskList(mine, true) ||
      '<div class="empty-state"><h3>No tasks assigned to you</h3><p>Tasks you own will appear here.</p></div>';
    return;
  }
  if (!scheduleTasks.length) {
    body.innerHTML = '<div class="empty-state"><h3>No tasks yet</h3><p>Add the first task to start building the project schedule.</p></div>';
    return;
  }
  if (scheduleView === 'list') {
    body.innerHTML = renderTaskList(scheduleTasks, false);
  } else {
    body.innerHTML = renderGantt(scheduleTasks);
  }
}

function renderTaskList(tasks, showProject) {
  if (!tasks.length) return '';
  const groups = groupByDiscipline(tasks);
  return Object.keys(groups).map(disc => `
    <div class="sched-group">
      <div class="sched-group-header"><span class="disc-dot" style="background:${discColor(disc)}"></span>${disc}<span class="sched-group-count">${groups[disc].length}</span></div>
      ${groups[disc].map(t => `
        <div class="task-row">
          <div class="task-row-main">
            <div class="task-row-title">${t.title}</div>
            <div class="task-row-meta">${t.assignee ? t.assignee : 'Unassigned'} · ${fmtDate(t.start_date)} → ${fmtDate(t.due_date)}${showProject && t.project_id ? ' · ' + ((PROJECTS.find(p=>p.backendId===t.project_id)||{}).name||'') : ''}</div>
          </div>
          <select class="task-status-select" onchange="updateTaskStatus(${t.id}, this.value)">
            ${Object.keys(TASK_STATUS).map(s => `<option value="${s}" ${s===t.status?'selected':''}>${TASK_STATUS[s].label}</option>`).join('')}
          </select>
          <button class="task-del" title="Delete task" onclick="deleteTask(${t.id})">
            <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>`).join('')}
    </div>`).join('');
}

function renderGantt(tasks) {
  const dated = tasks.filter(t => t.start_date || t.due_date);
  if (!dated.length) return renderTaskList(tasks, false);
  // date range
  const allDates = [];
  dated.forEach(t => { if (t.start_date) allDates.push(new Date(t.start_date)); if (t.due_date) allDates.push(new Date(t.due_date)); });
  let min = new Date(Math.min(...allDates)), max = new Date(Math.max(...allDates));
  // pad a few days each side
  min.setDate(min.getDate() - 2); max.setDate(max.getDate() + 2);
  const span = Math.max(1, (max - min) / 86400000);
  const pct = d => ((new Date(d) - min) / 86400000) / span * 100;

  // month ruler
  const months = [];
  let cur = new Date(min.getFullYear(), min.getMonth(), 1);
  while (cur <= max) {
    months.push({ label: cur.toLocaleDateString('en-US', { month: 'short' }), left: pct(cur < min ? min : cur) });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  const ruler = `<div class="gantt-ruler">${months.map(m => `<span class="gantt-month" style="left:${Math.max(0,m.left)}%">${m.label}</span>`).join('')}</div>`;

  const groups = groupByDiscipline(tasks);
  const rows = Object.keys(groups).map(disc => `
    <div class="gantt-group-header"><span class="disc-dot" style="background:${discColor(disc)}"></span>${disc}</div>
    ${groups[disc].map(t => {
      const s = TASK_STATUS[t.status] || TASK_STATUS.on_track;
      const start = t.start_date || t.due_date;
      const end = t.due_date || t.start_date;
      const left = pct(start);
      const width = Math.max(2, pct(end) - left);
      return `<div class="gantt-row">
        <div class="gantt-label" title="${t.title}">${t.title}</div>
        <div class="gantt-track">
          <div class="gantt-bar" style="left:${left}%;width:${width}%;background:${s.color}" onclick="ui.toast('${t.title.replace(/'/g,'')} · ${s.label}${t.assignee?' · '+t.assignee.replace(/'/g,''):''}')">
            <span class="gantt-bar-label">${t.assignee || ''}</span>
          </div>
        </div>
      </div>`;
    }).join('')}`).join('');

  return `<div class="gantt"><div class="gantt-head"><div class="gantt-label-head">Task</div>${ruler}</div>${rows}</div>`;
}

async function updateTaskStatus(taskId, status) {
  try {
    const res = await fetch(`/tasks/${taskId}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (handleSessionExpired(res)) return;
    if (!res.ok) throw new Error('Update failed');
    ui.toast('Task updated');
    loaders.schedule();
  } catch (err) { ui.toast(err.message); }
}

async function deleteTask(taskId) {
  if (!(await ui.confirm({ title: 'Delete task', message: 'Delete this task? This cannot be undone.', confirmLabel: 'Delete' }))) return;
  try {
    const res = await fetch(`/tasks/${taskId}`, { method: 'DELETE', headers: authHeaders() });
    if (handleSessionExpired(res)) return;
    if (!res.ok && res.status !== 204) throw new Error('Delete failed');
    ui.toast('Task deleted');
    loaders.schedule();
  } catch (err) { ui.toast(err.message); }
}

async function openNewTask() {
  if (!currentProject) return;
  // disciplines
  const discSel = document.getElementById('task-discipline');
  let discs = [];
  try { discs = await loadServerDisciplines(); } catch (e) {}
  discSel.innerHTML = '<option value="">Unassigned</option>' + discs.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  // company members
  const aSel = document.getElementById('task-assignee');
  let members = [];
  try { const r = await fetch('/company/members', { headers: authHeaders() }); if (r.ok) members = await r.json(); } catch (e) {}
  aSel.innerHTML = '<option value="">Unassigned</option>' + members.map(m => `<option value="${m.id}">${m.name}${m.discipline ? ' (' + m.discipline + ')' : ''}</option>`).join('');
  document.getElementById('task-title').value = '';
  document.getElementById('task-start').value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-status').value = 'on_track';
  ui.showModal('modal-new-task');
}

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
      updateSidebarProjectState();
      updateProjectNavBadges();
      router.go('change-detail', { id: change.id });
    } catch (err) {
      ui.toast(err.message);
    } finally {
      btn.textContent = 'Compare & Upload';
      btn.disabled = false;
    }
    return false;
  },

  async saveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-profile');
    const discVal = document.getElementById('profile-discipline').value;
    const payload = {
      full_name: document.getElementById('profile-full-name').value,
      email: document.getElementById('profile-email').value,
      phone: document.getElementById('profile-phone').value,
      company: document.getElementById('profile-company').value,
      discipline_id: discVal ? parseInt(discVal) : null
    };
    btn.textContent = 'Saving...';
    btn.disabled = true;
    try {
      const res = await fetch('/me', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (handleSessionExpired(res)) return false;
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Could not save'); }
      currentUser = await res.json();
      applyIdentity();    // refresh avatar + sidebar identity (new discipline/name)
      const dn = currentUser.full_name || currentUser.username;
      const aen = document.getElementById('avatar-edit-name');
      const aer = document.getElementById('avatar-edit-role');
      if (aen) aen.textContent = dn;
      if (aer) aer.textContent = currentUser.discipline || 'No discipline set';
      ui.toast('Profile saved');
    } catch (err) {
      ui.toast(err.message);
    } finally {
      btn.textContent = 'Save Changes';
      btn.disabled = false;
    }
    return false;
  },

  async createTask(e) {
    e.preventDefault();
    if (!currentProject) return false;
    const btn = document.getElementById('btn-create-task');
    const payload = {
      title: document.getElementById('task-title').value.trim(),
      discipline_id: document.getElementById('task-discipline').value ? parseInt(document.getElementById('task-discipline').value) : null,
      assignee_id: document.getElementById('task-assignee').value ? parseInt(document.getElementById('task-assignee').value) : null,
      start_date: document.getElementById('task-start').value || null,
      due_date: document.getElementById('task-due').value || null,
      status: document.getElementById('task-status').value
    };
    if (!payload.title) return false;
    btn.textContent = 'Creating...';
    btn.disabled = true;
    try {
      const res = await fetch(`/projects/${currentProject.backendId}/tasks`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (handleSessionExpired(res)) return false;
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Could not create task'); }
      ui.hideModal('modal-new-task');
      ui.toast('Task created');
      if (router.current === 'schedule') loaders.schedule();
    } catch (err) {
      ui.toast(err.message);
    } finally {
      btn.textContent = 'Create Task';
      btn.disabled = false;
    }
    return false;
  },

  async renameProject(e) {
    e.preventDefault();
    if (!currentProject) return false;
    const trimmed = document.getElementById('rename-project-name').value.trim();
    if (!trimmed) return false;
    if (trimmed === currentProject.name) { ui.hideModal('modal-rename-project'); return false; }
    try {
      const res = await fetch(`/projects/${currentProject.backendId}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, description: currentProject.client || null })
      });
      if (handleSessionExpired(res)) return false;
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Rename failed'); }
      currentProject.name = trimmed;
      await loadRealProjects();
      buildSidebar();
      updateSidebarProjectState();
      currentProject = PROJECTS.find(p => p.backendId === currentProject.backendId) || currentProject;
      document.getElementById('overview-title').textContent = currentProject.name;
      updateTopbar('overview');
      ui.hideModal('modal-rename-project');
      ui.toast('Project renamed');
    } catch (err) {
      ui.toast(err.message);
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
