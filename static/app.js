/* ═══════════════════════════════════════════════════════════════════
   KORDYNA — Revision Intelligence Platform
   Application Logic
   ═══════════════════════════════════════════════════════════════════ */

const API = window.location.origin;

// ── API HELPER ─────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = opts.headers || {};
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = "Bearer " + token;
  if (!(opts.body instanceof FormData) && opts.body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { auth.logout(); throw new Error("Unauthorized"); }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── SAMPLE DATA ────────────────────────────────────────────────────
const DISCIPLINES = [
  { id: 1, name: "Landscape Architecture", abbr: "LA", icon: "🌿", color: "#2ECC71" },
  { id: 2, name: "Civil Engineering", abbr: "CE", icon: "🏗️", color: "#2E5BFF" },
  { id: 3, name: "Irrigation", abbr: "IR", icon: "💧", color: "#00D1FF" },
  { id: 4, name: "Architecture", abbr: "AR", icon: "🏛️", color: "#9B59B6" },
  { id: 5, name: "Structural Engineering", abbr: "SE", icon: "🔩", color: "#F5A623" },
  { id: 6, name: "MEP Engineering", abbr: "ME", icon: "⚡", color: "#E74C3C" },
  { id: 7, name: "Contractor", abbr: "GC", icon: "🔨", color: "#8899B4" },
  { id: 8, name: "Survey", abbr: "SV", icon: "📐", color: "#F39C12" },
  { id: 9, name: "Traffic Engineering", abbr: "TE", icon: "🚦", color: "#1ABC9C" },
];

const USERS = [
  { id: 1, name: "Jorge Morgan", initials: "JM", role: "Project Admin", discipline: null },
  { id: 2, name: "Sara Vega", initials: "SV", role: "Landscape Lead", discipline: 1 },
  { id: 3, name: "Tom Chen", initials: "TC", role: "Civil Lead", discipline: 2 },
  { id: 4, name: "Maria Lopez", initials: "ML", role: "Irrigation Eng.", discipline: 3 },
  { id: 5, name: "David Kim", initials: "DK", role: "Architect", discipline: 4 },
  { id: 6, name: "Priya Patel", initials: "PP", role: "Structural Eng.", discipline: 5 },
  { id: 7, name: "Alex Rivera", initials: "AR", role: "GC Super", discipline: 7 },
];

const CHANGES = [
  {
    id: "CE-001", title: "Grading Revision — East Retaining Wall",
    status: "in_review", risk: "high", uploadedBy: 3,
    docs: 3, date: "Jun 4, 2026",
    impacted: [2, 1, 5, 7],
    reviews: [
      { disc: 2, status: "reviewed", user: 3 },
      { disc: 1, status: "pending", user: 2 },
      { disc: 5, status: "flagged", user: 6 },
      { disc: 7, status: "pending", user: 7 },
    ],
    summary: "Revised grading at the east retaining wall to accommodate updated stormwater management requirements. The wall height increases from 6 ft to 8.5 ft, which triggers structural review and impacts landscape planting areas along the eastern edge. Civil drawings C3.1 and C3.2 updated with new contour elevations.",
    timeline: [
      { text: "<strong>Tom Chen</strong> uploaded new drawings C3.1, C3.2", time: "Jun 4, 10:32 AM", color: "var(--primary)" },
      { text: "Diff engine detected <strong>14 change regions</strong>", time: "Jun 4, 10:33 AM", color: "var(--cyan)" },
      { text: "Reviews routed to <strong>4 disciplines</strong>", time: "Jun 4, 10:33 AM", color: "var(--amber)" },
      { text: "<strong>Tom Chen</strong> (Civil) marked as reviewed", time: "Jun 5, 2:15 PM", color: "var(--green)" },
      { text: "<strong>Priya Patel</strong> (Structural) flagged conflict — wall exceeds load spec", time: "Jun 6, 9:45 AM", color: "var(--red)" },
    ],
    actions: [
      { text: "Structural engineer to verify wall load calculations", done: false },
      { text: "Landscape to confirm planting setback from revised wall", done: false },
      { text: "Contractor to update construction sequence", done: false },
      { text: "Civil drawings uploaded", done: true },
    ],
    affectedDocs: [
      { code: "C3.1", name: "Grading Plan — East", rev: "Rev 3", status: "Updated" },
      { code: "C3.2", name: "Retaining Wall Detail", rev: "Rev 2", status: "Updated" },
      { code: "L2.1", name: "Planting Plan — East Edge", rev: "Rev 1", status: "Review Needed" },
    ],
    confidence: { score: 88, delta: -4 },
  },
  {
    id: "CE-002", title: "Irrigation Main Line Reroute",
    status: "in_review", risk: "medium", uploadedBy: 4,
    docs: 2, date: "Jun 2, 2026",
    impacted: [3, 1, 2],
    reviews: [
      { disc: 3, status: "reviewed", user: 4 },
      { disc: 1, status: "reviewed", user: 2 },
      { disc: 2, status: "pending", user: 3 },
    ],
    summary: "Main irrigation line rerouted around Building B foundation to avoid conflict with structural footings. New route adds 120 LF of 4\" PVC and requires a pressure boost calculation. Landscape confirms planting zones remain within coverage.",
    timeline: [
      { text: "<strong>Maria Lopez</strong> uploaded IR2.1 revision", time: "Jun 2, 3:15 PM", color: "var(--primary)" },
      { text: "Diff engine detected <strong>8 change regions</strong>", time: "Jun 2, 3:16 PM", color: "var(--cyan)" },
      { text: "<strong>Maria Lopez</strong> (Irrigation) marked as reviewed", time: "Jun 3, 11:00 AM", color: "var(--green)" },
      { text: "<strong>Sara Vega</strong> (Landscape) marked as reviewed", time: "Jun 3, 4:30 PM", color: "var(--green)" },
    ],
    actions: [
      { text: "Civil to confirm no utility conflicts on new route", done: false },
      { text: "Irrigation coverage calculations updated", done: true },
      { text: "Landscape confirmed planting coverage", done: true },
    ],
    affectedDocs: [
      { code: "IR2.1", name: "Irrigation Plan — Building B", rev: "Rev 2", status: "Updated" },
      { code: "L1.3", name: "Planting Plan — Building B", rev: "Rev 1", status: "Reviewed" },
    ],
    confidence: { score: 92, delta: 0 },
  },
  {
    id: "CE-003", title: "Parking Lot Restripe — ADA Compliance",
    status: "approved", risk: "low", uploadedBy: 3,
    docs: 1, date: "May 28, 2026",
    impacted: [2, 9, 7],
    reviews: [
      { disc: 2, status: "reviewed", user: 3 },
      { disc: 9, status: "reviewed", user: null },
      { disc: 7, status: "reviewed", user: 7 },
    ],
    summary: "Parking lot restriped to add 2 additional ADA-compliant spaces per updated code requirement. Traffic flow patterns adjusted at entry/exit. All discipline reviews completed.",
    timeline: [
      { text: "<strong>Tom Chen</strong> uploaded C5.1 revision", time: "May 28, 9:00 AM", color: "var(--primary)" },
      { text: "All <strong>3 reviews</strong> completed", time: "May 30, 4:45 PM", color: "var(--green)" },
      { text: "Change approved — no conflicts", time: "May 30, 5:00 PM", color: "var(--green)" },
    ],
    actions: [
      { text: "ADA compliance verified", done: true },
      { text: "Traffic flow updated", done: true },
      { text: "Contractor confirmed schedule impact: none", done: true },
    ],
    affectedDocs: [
      { code: "C5.1", name: "Parking Lot Plan", rev: "Rev 4", status: "Approved" },
    ],
    confidence: { score: 100, delta: +2 },
  },
  {
    id: "CE-004", title: "Building B Foundation Depth Revision",
    status: "open", risk: "critical", uploadedBy: 6,
    docs: 2, date: "Jun 8, 2026",
    impacted: [5, 2, 4, 6, 7],
    reviews: [
      { disc: 5, status: "pending", user: 6 },
      { disc: 2, status: "pending", user: 3 },
      { disc: 4, status: "pending", user: 5 },
      { disc: 6, status: "pending", user: null },
      { disc: 7, status: "pending", user: 7 },
    ],
    summary: "Geotechnical report came back requiring deeper foundations for Building B. Footing depth increases from 4 ft to 7 ft. This affects MEP underground routing, civil utility depths, and potentially the architectural floor-to-floor heights. Highest-impact change event this cycle.",
    timeline: [
      { text: "<strong>Priya Patel</strong> uploaded S1.2, S1.3", time: "Jun 8, 11:00 AM", color: "var(--primary)" },
      { text: "Diff engine detected <strong>22 change regions</strong>", time: "Jun 8, 11:01 AM", color: "var(--cyan)" },
      { text: "Reviews routed to <strong>5 disciplines</strong>", time: "Jun 8, 11:01 AM", color: "var(--amber)" },
    ],
    actions: [
      { text: "Structural to finalize footing design", done: false },
      { text: "Civil to adjust utility depth at Building B", done: false },
      { text: "MEP to verify underground routing clearance", done: false },
      { text: "Architecture to review floor-to-floor impact", done: false },
      { text: "Contractor to re-estimate excavation scope", done: false },
    ],
    affectedDocs: [
      { code: "S1.2", name: "Foundation Plan — Building B", rev: "Rev 2", status: "Updated" },
      { code: "S1.3", name: "Footing Detail — Building B", rev: "Rev 1", status: "New" },
    ],
    confidence: { score: 78, delta: -14 },
  },
];

const DOCUMENTS = [
  { id: 1, code: "C3.1", title: "Grading Plan — East", discipline: 2, rev: 3, date: "Jun 4, 2026", linkedChange: "CE-001", revisions: [{n:3,date:"Jun 4, 2026",note:"Retaining wall grading update"},{n:2,date:"May 15, 2026",note:"Storm drainage adjustments"},{n:1,date:"Apr 2, 2026",note:"Initial issue"}] },
  { id: 2, code: "C3.2", title: "Retaining Wall Detail", discipline: 2, rev: 2, date: "Jun 4, 2026", linkedChange: "CE-001", revisions: [{n:2,date:"Jun 4, 2026",note:"Height increase to 8.5 ft"},{n:1,date:"Apr 2, 2026",note:"Initial issue"}] },
  { id: 3, code: "C5.1", title: "Parking Lot Plan", discipline: 2, rev: 4, date: "May 28, 2026", linkedChange: "CE-003", revisions: [{n:4,date:"May 28, 2026",note:"ADA restripe"},{n:3,date:"May 1, 2026",note:"Drain inlet relocation"},{n:2,date:"Apr 10, 2026",note:"Curb revisions"},{n:1,date:"Mar 15, 2026",note:"Initial issue"}] },
  { id: 4, code: "L2.1", title: "Planting Plan — East Edge", discipline: 1, rev: 1, date: "Apr 5, 2026", linkedChange: "CE-001", revisions: [{n:1,date:"Apr 5, 2026",note:"Initial issue"}] },
  { id: 5, code: "L1.3", title: "Planting Plan — Building B", discipline: 1, rev: 2, date: "Jun 3, 2026", linkedChange: "CE-002", revisions: [{n:2,date:"Jun 3, 2026",note:"Updated for irrigation reroute"},{n:1,date:"Apr 5, 2026",note:"Initial issue"}] },
  { id: 6, code: "IR2.1", title: "Irrigation Plan — Building B", discipline: 3, rev: 2, date: "Jun 2, 2026", linkedChange: "CE-002", revisions: [{n:2,date:"Jun 2, 2026",note:"Main line reroute"},{n:1,date:"Apr 8, 2026",note:"Initial issue"}] },
  { id: 7, code: "S1.2", title: "Foundation Plan — Building B", discipline: 5, rev: 2, date: "Jun 8, 2026", linkedChange: "CE-004", revisions: [{n:2,date:"Jun 8, 2026",note:"Deeper foundations per geotech"},{n:1,date:"Apr 1, 2026",note:"Initial issue"}] },
  { id: 8, code: "S1.3", title: "Footing Detail — Building B", discipline: 5, rev: 1, date: "Jun 8, 2026", linkedChange: "CE-004", revisions: [{n:1,date:"Jun 8, 2026",note:"New detail for revised footings"}] },
  { id: 9, code: "A2.1", title: "Floor Plan — Building B Level 1", discipline: 4, rev: 1, date: "Apr 3, 2026", linkedChange: null, revisions: [{n:1,date:"Apr 3, 2026",note:"Initial issue"}] },
  { id:10, code: "A2.2", title: "Building Section — Building B", discipline: 4, rev: 1, date: "Apr 3, 2026", linkedChange: null, revisions: [{n:1,date:"Apr 3, 2026",note:"Initial issue"}] },
  { id:11, code: "M1.1", title: "MEP Underground — Building B", discipline: 6, rev: 1, date: "Apr 10, 2026", linkedChange: null, revisions: [{n:1,date:"Apr 10, 2026",note:"Initial issue"}] },
  { id:12, code: "C1.1", title: "Overall Site Plan", discipline: 2, rev: 2, date: "May 1, 2026", linkedChange: null, revisions: [{n:2,date:"May 1, 2026",note:"Phase 2 overlay added"},{n:1,date:"Mar 15, 2026",note:"Initial issue"}] },
  { id:13, code: "SV1.1", title: "Topographic Survey", discipline: 8, rev: 1, date: "Mar 10, 2026", linkedChange: null, revisions: [{n:1,date:"Mar 10, 2026",note:"Initial survey"}] },
  { id:14, code: "TE1.1", title: "Traffic Impact Study", discipline: 9, rev: 1, date: "Mar 20, 2026", linkedChange: null, revisions: [{n:1,date:"Mar 20, 2026",note:"Initial study"}] },
];

const CONFIDENCE = {
  score: 92,
  factors: [
    { name: "Review Completion", value: 85, desc: "85% of required discipline reviews are complete" },
    { name: "Open Conflicts", value: 95, desc: "1 open conflict (Structural flagged wall load)" },
    { name: "Impact Coverage", value: 90, desc: "All change events have impact maps assigned" },
    { name: "Document Currency", value: 98, desc: "14 of 14 documents are current revision" },
  ],
};

const ACTIVITY = [
  { text: "<strong>Priya Patel</strong> uploaded Foundation Plan — Building B", time: "2h ago", color: "var(--red)" },
  { text: "<strong>Priya Patel</strong> flagged conflict on CE-001 — wall exceeds load spec", time: "3d ago", color: "var(--red)" },
  { text: "<strong>Tom Chen</strong> marked Civil review as complete on CE-001", time: "5d ago", color: "var(--green)" },
  { text: "<strong>Sara Vega</strong> completed Landscape review on CE-002", time: "1w ago", color: "var(--green)" },
  { text: "CE-003 Parking Lot Restripe — all reviews approved", time: "1w ago", color: "var(--green)" },
  { text: "<strong>Maria Lopez</strong> rerouted irrigation main line (CE-002)", time: "1w ago", color: "var(--primary)" },
];

// ── HELPERS ────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function disc(id) { return DISCIPLINES.find(d => d.id === id) || { name: "Unknown", abbr: "??", icon: "❓", color: "#8899B4" }; }
function user(id) { return USERS.find(u => u.id === id) || { name: "Unknown", initials: "??" }; }

function statusBadge(s) {
  const map = {
    open: ["Open", "badge-blue"],
    in_review: ["In Review", "badge-amber"],
    approved: ["Approved", "badge-green"],
    flagged: ["Conflict", "badge-red"],
    pending: ["Pending", "badge-amber"],
    reviewed: ["Reviewed", "badge-green"],
  };
  const [label, cls] = map[s] || [s, "badge-gray"];
  return `<span class="badge ${cls}">${label}</span>`;
}

function riskBadge(r) {
  const map = {
    low: "badge-green", medium: "badge-amber", high: "badge-red", critical: "badge-red",
  };
  return `<span class="badge ${map[r] || 'badge-gray'}">${r.charAt(0).toUpperCase() + r.slice(1)}</span>`;
}

function progressBar(reviews, color) {
  const done = reviews.filter(r => r.status === "reviewed").length;
  const pct = Math.round((done / reviews.length) * 100);
  const c = pct === 100 ? "var(--green)" : pct > 0 ? "var(--amber)" : "var(--text-dim)";
  return `<div class="progress-mini">
    <div class="progress-mini-bar"><div class="progress-mini-fill" style="width:${pct}%;background:${color || c}"></div></div>
    <span class="progress-mini-text">${done}/${reviews.length}</span>
  </div>`;
}

function factorColor(v) {
  if (v >= 90) return "var(--green)";
  if (v >= 70) return "var(--amber)";
  return "var(--red)";
}

// ── ROUTER ─────────────────────────────────────────────────────────
const router = {
  current: null,
  go(page, data) {
    document.querySelectorAll('#main > .page').forEach(p => p.classList.add('hidden'));
    const el = $('page-' + page);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });
    this.current = page;
    if (loaders[page]) loaders[page](data);
    $('main').scrollTop = 0;
  },
};

// ── AUTH ────────────────────────────────────────────────────────────
const auth = {
  showTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[onclick*="${tab}"]`)?.classList.add('active');
    $('form-login').classList.toggle('hidden', tab !== 'login');
    $('form-register').classList.toggle('hidden', tab !== 'register');
  },
  async login(e) {
    e.preventDefault();
    const username = $('login-user').value;
    const password = $('login-pass').value;
    try {
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);
      const res = await fetch(API + '/token', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', username);
      this.enter();
    } catch (err) {
      $('auth-error').textContent = err.message;
      $('auth-error').classList.remove('hidden');
    }
    return false;
  },
  async register(e) {
    e.preventDefault();
    try {
      const body = { username: $('reg-user').value, password: $('reg-pass').value };
      const disc = $('reg-discipline').value;
      if (disc) body.discipline_id = parseInt(disc);
      await api('/users', { method: 'POST', body });
      $('login-user').value = body.username;
      $('login-pass').value = body.password;
      this.showTab('login');
      $('auth-error').textContent = 'Account created. Sign in below.';
      $('auth-error').classList.remove('hidden');
      $('auth-error').style.color = 'var(--green)';
    } catch (err) {
      $('auth-error').textContent = err.message;
      $('auth-error').classList.remove('hidden');
    }
    return false;
  },
  enter() {
    $('page-auth').classList.add('hidden');
    $('sidebar').classList.remove('hidden');
    $('topbar').classList.remove('hidden');
    const name = localStorage.getItem('username') || 'User';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase();
    $('sidebar-user-name').textContent = name;
    $('sidebar-avatar').textContent = initials;
    $('topbar-avatar').textContent = initials;
    router.go('overview');
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    $('page-auth').classList.remove('hidden');
    $('sidebar').classList.add('hidden');
    $('topbar').classList.add('hidden');
    document.querySelectorAll('#main > .page').forEach(p => p.classList.add('hidden'));
  },
  check() {
    if (localStorage.getItem('token')) { this.enter(); }
  },
};

// ── UI ─────────────────────────────────────────────────────────────
const ui = {
  showModal(id) { $(id).classList.remove('hidden'); },
  hideModal(id) { $(id).classList.add('hidden'); },
  toast(msg, type = 'success') {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast toast-${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
  },
};

// ── PAGE LOADERS ───────────────────────────────────────────────────
const loaders = {};

// Overview
loaders.overview = function () {
  // Recent changes
  $('overview-changes').innerHTML = CHANGES.slice(0, 4).map(c => `
    <div class="ov-change" onclick="router.go('change-detail','${c.id}')">
      <span class="ov-change-id">${c.id}</span>
      <span class="ov-change-title truncate">${c.title}</span>
      ${statusBadge(c.status)}
    </div>
  `).join('');

  // Confidence factors
  $('overview-factors').innerHTML = CONFIDENCE.factors.map(f => `
    <div class="ov-factor">
      <div class="ov-factor-top">
        <span class="ov-factor-name">${f.name}</span>
        <span class="ov-factor-val" style="color:${factorColor(f.value)}">${f.value}%</span>
      </div>
      <div class="ov-factor-bar">
        <div class="ov-factor-fill" style="width:${f.value}%;background:${factorColor(f.value)}"></div>
      </div>
    </div>
  `).join('');

  // Review progress
  const discReviews = {};
  CHANGES.forEach(c => {
    c.reviews.forEach(r => {
      const d = disc(r.disc);
      if (!discReviews[d.name]) discReviews[d.name] = { total: 0, done: 0 };
      discReviews[d.name].total++;
      if (r.status === 'reviewed') discReviews[d.name].done++;
    });
  });
  $('overview-reviews').innerHTML = Object.entries(discReviews).map(([name, data]) => {
    const pct = Math.round((data.done / data.total) * 100);
    const cls = pct === 100 ? 'badge-green' : pct > 0 ? 'badge-amber' : 'badge-gray';
    return `<div class="ov-review">
      <span class="ov-review-disc">${name}</span>
      <span class="ov-review-badge badge ${cls}">${data.done}/${data.total}</span>
    </div>`;
  }).join('');

  // Activity
  $('overview-activity').innerHTML = ACTIVITY.map(a => `
    <div class="ov-activity">
      <div class="ov-activity-dot" style="background:${a.color}"></div>
      <div>
        <div class="ov-activity-text">${a.text}</div>
        <div class="ov-activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
};

// Change Events
loaders.changes = function () {
  $('changes-list').innerHTML = CHANGES.map(c => {
    const u = user(c.uploadedBy);
    return `<div class="change-row" onclick="router.go('change-detail','${c.id}')">
      <span class="ct-col ct-id">${c.id}</span>
      <span class="ct-col ct-title truncate">${c.title}</span>
      <span class="ct-col ct-status">${statusBadge(c.status)}</span>
      <span class="ct-col ct-by">${u.name}</span>
      <span class="ct-col ct-docs">${c.docs}</span>
      <span class="ct-col ct-disc">
        <div class="disc-pills">${c.impacted.slice(0, 3).map(d => `<span class="disc-pill">${disc(d).abbr}</span>`).join('')}${c.impacted.length > 3 ? `<span class="disc-pill">+${c.impacted.length - 3}</span>` : ''}</div>
      </span>
      <span class="ct-col ct-progress">${progressBar(c.reviews)}</span>
      <span class="ct-col ct-risk">${riskBadge(c.risk)}</span>
      <span class="ct-col ct-date">${c.date}</span>
      <span class="ct-col ct-actions">
        <button class="btn-icon" onclick="event.stopPropagation();deleteChange('${c.id}')">
          <svg viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </span>
    </div>`;
  }).join('');
};

// Change Detail
loaders['change-detail'] = function (id) {
  const c = CHANGES.find(ch => ch.id === id);
  if (!c) return;

  $('cd-id').textContent = c.id;
  $('cd-title').textContent = c.title;
  $('cd-meta').innerHTML = `
    <span>Uploaded by ${user(c.uploadedBy).name}</span>
    <span>·</span>
    <span>${c.date}</span>
    <span>·</span>
    <span>${c.docs} documents</span>
  `;
  $('cd-status').innerHTML = statusBadge(c.status).replace('badge ', 'badge cd-status-badge ');
  $('cd-status').className = 'cd-status';

  // Summary
  $('cd-summary').innerHTML = `<p class="cd-summary-text">${c.summary}</p>`;

  // Affected docs
  $('cd-documents').innerHTML = c.affectedDocs.map(d => `
    <div class="cd-doc">
      <div class="cd-doc-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div>
      <div class="cd-doc-info">
        <div class="cd-doc-name">${d.code} — ${d.name}</div>
        <div class="cd-doc-meta">${d.rev}</div>
      </div>
      <div class="cd-doc-badge">${statusBadge(d.status === 'Updated' ? 'in_review' : d.status === 'Approved' ? 'approved' : d.status === 'Reviewed' ? 'reviewed' : 'pending')}</div>
    </div>
  `).join('');

  // Mini impact map
  renderMiniImpact(c);

  // Timeline
  $('cd-timeline').innerHTML = c.timeline.map((t, i) => `
    <div class="tl-item">
      <div class="tl-dot-wrap">
        <div class="tl-dot" style="background:${t.color}"></div>
        ${i < c.timeline.length - 1 ? '<div class="tl-line"></div>' : ''}
      </div>
      <div class="tl-body">
        <div class="tl-text">${t.text}</div>
        <div class="tl-time">${t.time}</div>
      </div>
    </div>
  `).join('');

  // Review status
  $('cd-reviews').innerHTML = c.reviews.map(r => {
    const d = disc(r.disc);
    const iconBg = r.status === 'reviewed' ? 'var(--green-dim)' : r.status === 'flagged' ? 'var(--red-dim)' : 'var(--amber-dim)';
    const icon = r.status === 'reviewed' ? '✓' : r.status === 'flagged' ? '⚠' : '⏳';
    return `<div class="cd-rev">
      <div class="cd-rev-icon" style="background:${iconBg}">${icon}</div>
      <span class="cd-rev-name">${d.name}</span>
      ${statusBadge(r.status)}
    </div>`;
  }).join('');

  // Impacted disciplines
  $('cd-disciplines').innerHTML = c.impacted.map((id, i) => {
    const d = disc(id);
    const type = i === 0 ? 'Direct' : 'Indirect';
    return `<div class="cd-disc-tag">
      <div class="cd-disc-dot" style="background:${d.color}"></div>
      <span class="cd-disc-name">${d.name}</span>
      <span class="cd-disc-type">${type}</span>
    </div>`;
  }).join('');

  // Actions
  $('cd-actions').innerHTML = c.actions.map(a => `
    <div class="cd-action">
      <div class="cd-action-check ${a.done ? 'done' : ''}">${a.done ? '✓' : ''}</div>
      <span class="cd-action-text ${a.done ? 'done' : ''}">${a.text}</span>
    </div>
  `).join('');

  // Confidence
  const deltaColor = c.confidence.delta >= 0 ? 'var(--green)' : 'var(--red)';
  const deltaSign = c.confidence.delta >= 0 ? '+' : '';
  $('cd-confidence').innerHTML = `
    <div class="cd-conf-score">
      <div class="cd-conf-val" style="color:${factorColor(c.confidence.score)}">${c.confidence.score}%</div>
      <div class="cd-conf-delta" style="color:${deltaColor}">${deltaSign}${c.confidence.delta}% from baseline</div>
    </div>
  `;
};

// Impact Map
loaders.impact = function () {
  const sel = $('impact-change-select');
  sel.innerHTML = '<option value="all">All Change Events</option>' +
    CHANGES.map(c => `<option value="${c.id}">${c.id} — ${c.title}</option>`).join('');
  renderImpactMap();
};

// Reviews
loaders.reviews = function () { reviewTab('all'); };

// Documents
loaders.documents = function () { renderDocuments(); };

// Disciplines
loaders.disciplines = function () { renderDisciplines(); };

// Discipline Detail
loaders['discipline-detail'] = function (discId) { renderDisciplineDetail(discId); };

// Confidence
loaders.confidence = function () { renderConfidence(); };

// ── RENDER: Mini Impact Map ────────────────────────────────────────
function renderMiniImpact(change) {
  const svg = $('cd-impact-svg');
  if (!svg) return;
  const w = svg.parentElement.clientWidth || 600;
  const h = 260;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const cx = w / 2, cy = h / 2;
  const radius = 90;
  let html = '';

  // Edges
  change.impacted.forEach((id, i) => {
    const angle = (i / change.impacted.length) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const r = change.reviews.find(rv => rv.disc === id);
    const color = r ? (r.status === 'reviewed' ? 'var(--green)' : r.status === 'flagged' ? 'var(--red)' : 'var(--amber)') : 'var(--text-dim)';
    const dash = i === 0 ? '' : 'stroke-dasharray="6,4"';
    html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${color}" class="impact-edge" ${dash}/>`;
  });

  // Center
  html += `<circle cx="${cx}" cy="${cy}" r="28" class="impact-center-circle"/>`;
  html += `<text x="${cx}" y="${cy + 1}" class="impact-center-label" dy="0.35em">${change.id}</text>`;

  // Nodes
  change.impacted.forEach((id, i) => {
    const d = disc(id);
    const angle = (i / change.impacted.length) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const r = change.reviews.find(rv => rv.disc === id);
    const color = r ? (r.status === 'reviewed' ? 'var(--green)' : r.status === 'flagged' ? 'var(--red)' : 'var(--amber)') : 'var(--text-dim)';
    html += `<g class="impact-node">
      <circle cx="${nx}" cy="${ny}" r="24" class="impact-node-circle" stroke="${color}"/>
      <text x="${nx}" y="${ny}" class="impact-node-label" dy="0.35em">${d.abbr}</text>
    </g>`;
  });

  svg.innerHTML = html;
}

// ── RENDER: Full Impact Map ────────────────────────────────────────
function renderImpactMap() {
  const sel = $('impact-change-select');
  const filter = sel ? sel.value : 'all';
  const svg = $('impact-svg');
  if (!svg) return;
  const container = svg.parentElement;
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 500;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * 0.32;

  const allDiscs = new Map();
  const changes = filter === 'all' ? CHANGES : CHANGES.filter(c => c.id === filter);

  changes.forEach(c => {
    c.impacted.forEach(id => {
      if (!allDiscs.has(id)) allDiscs.set(id, { reviewed: false, flagged: false, pending: false });
      const r = c.reviews.find(rv => rv.disc === id);
      if (r) {
        if (r.status === 'reviewed') allDiscs.get(id).reviewed = true;
        if (r.status === 'flagged') allDiscs.get(id).flagged = true;
        if (r.status === 'pending') allDiscs.get(id).pending = true;
      }
    });
  });

  const nodes = Array.from(allDiscs.keys());
  let html = '';

  // Edges from center to each discipline
  nodes.forEach((id, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const state = allDiscs.get(id);
    const color = state.flagged ? 'var(--red)' : state.pending ? 'var(--amber)' : 'var(--green)';
    html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${color}" class="impact-edge"/>`;
  });

  // Cross-edges between disciplines that share a change
  changes.forEach(c => {
    for (let i = 0; i < c.impacted.length; i++) {
      for (let j = i + 1; j < c.impacted.length; j++) {
        const ai = nodes.indexOf(c.impacted[i]);
        const aj = nodes.indexOf(c.impacted[j]);
        if (ai < 0 || aj < 0) continue;
        const a1 = (ai / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const a2 = (aj / nodes.length) * Math.PI * 2 - Math.PI / 2;
        html += `<line x1="${cx + radius * Math.cos(a1)}" y1="${cy + radius * Math.sin(a1)}"
                        x2="${cx + radius * Math.cos(a2)}" y2="${cy + radius * Math.sin(a2)}"
                        stroke="var(--border-light)" stroke-dasharray="4,4" class="impact-edge" opacity="0.4"/>`;
      }
    }
  });

  // Center
  html += `<circle cx="${cx}" cy="${cy}" r="32" class="impact-center-circle"/>`;
  html += `<text x="${cx}" y="${cy}" class="impact-center-label" dy="-0.3em">CHANGE</text>`;
  html += `<text x="${cx}" y="${cy}" class="impact-center-label" dy="1em" style="font-size:10px;opacity:0.8">${changes.length} event${changes.length !== 1 ? 's' : ''}</text>`;

  // Nodes
  nodes.forEach((id, i) => {
    const d = disc(id);
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + radius * Math.cos(angle);
    const ny = cy + radius * Math.sin(angle);
    const state = allDiscs.get(id);
    const color = state.flagged ? 'var(--red)' : state.pending ? 'var(--amber)' : 'var(--green)';
    html += `<g class="impact-node" onclick="showImpactDetail(${id})">
      <circle cx="${nx}" cy="${ny}" r="30" class="impact-node-circle" stroke="${color}"/>
      <text x="${nx}" y="${ny - 6}" class="impact-node-label">${d.icon}</text>
      <text x="${nx}" y="${ny + 10}" class="impact-node-label" style="font-size:10px">${d.abbr}</text>
    </g>`;
  });

  svg.innerHTML = html;
}

function showImpactDetail(discId) {
  const d = disc(discId);
  const panel = $('impact-panel');
  const relatedChanges = CHANGES.filter(c => c.impacted.includes(discId));
  panel.innerHTML = `
    <div style="padding:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <span style="font-size:28px">${d.icon}</span>
        <div>
          <div style="font-weight:700;font-size:16px">${d.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${d.abbr}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.06em;margin-bottom:10px">Related Changes</div>
      ${relatedChanges.map(c => {
        const r = c.reviews.find(rv => rv.disc === discId);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="router.go('change-detail','${c.id}')">
          <div style="font-weight:600;font-size:13px">${c.id} — ${c.title}</div>
          <div style="margin-top:4px">${r ? statusBadge(r.status) : '<span class="badge badge-gray">Not Reviewed</span>'}</div>
        </div>`;
      }).join('')}
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.06em;margin:20px 0 10px">Documents</div>
      ${DOCUMENTS.filter(doc => doc.discipline === discId).map(doc => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div style="font-weight:600">${doc.code} — ${doc.title}</div>
          <div style="font-size:11px;color:var(--text-muted)">Rev ${doc.rev} · ${doc.date}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── RENDER: Reviews ────────────────────────────────────────────────
function reviewTab(tab) {
  document.querySelectorAll('.review-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  let allReviews = [];
  CHANGES.forEach(c => {
    c.reviews.forEach(r => {
      allReviews.push({ ...r, changeId: c.id, changeTitle: c.title });
    });
  });

  if (tab === 'pending') allReviews = allReviews.filter(r => r.status === 'pending');
  else if (tab === 'conflict') allReviews = allReviews.filter(r => r.status === 'flagged');
  else if (tab === 'completed') allReviews = allReviews.filter(r => r.status === 'reviewed');
  else if (tab === 'mine') allReviews = allReviews.filter(r => r.user === 1);

  $('reviews-list').innerHTML = allReviews.length === 0
    ? '<div class="empty-state"><p>No reviews match this filter</p></div>'
    : allReviews.map(r => {
      const d = disc(r.disc);
      const u = r.user ? user(r.user) : null;
      return `<div class="review-card" onclick="router.go('change-detail','${r.changeId}')">
        <div class="review-card-left">
          <div class="review-avatar" style="background:${d.color}20;color:${d.color}">${d.icon}</div>
          <div class="review-info">
            <div class="review-change">${r.changeId}</div>
            <div class="review-disc">${d.name} Review</div>
            <div class="review-sub">${r.changeTitle}${u ? ` · Assigned: ${u.name}` : ''}</div>
          </div>
        </div>
        <div class="review-card-right">
          ${statusBadge(r.status)}
          ${r.status === 'pending' ? `
            <div class="review-actions">
              <button class="btn btn-success btn-sm" onclick="event.stopPropagation();approveReview('${r.changeId}',${r.disc})">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();ui.showModal('modal-conflict')">Flag</button>
            </div>
          ` : ''}
        </div>
      </div>`;
    }).join('');
}

function approveReview(changeId, discId) {
  const c = CHANGES.find(ch => ch.id === changeId);
  if (!c) return;
  const r = c.reviews.find(rv => rv.disc === discId);
  if (r) r.status = 'reviewed';
  reviewTab(document.querySelector('.review-tab.active')?.dataset.tab || 'all');
  ui.toast('Review approved');
}

// ── RENDER: Documents ──────────────────────────────────────────────
let selectedDocId = null;

function renderDocuments() {
  const byDisc = {};
  DOCUMENTS.forEach(d => {
    const discName = disc(d.discipline).name;
    if (!byDisc[discName]) byDisc[discName] = { disc: disc(d.discipline), docs: [] };
    byDisc[discName].docs.push(d);
  });

  $('doc-accordion').innerHTML = Object.entries(byDisc).map(([name, data]) => `
    <div class="doc-accord open">
      <div class="doc-accord-head" onclick="this.parentElement.classList.toggle('open')">
        <div class="doc-accord-left">
          <svg class="doc-accord-arrow" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
          <span style="font-size:16px">${data.disc.icon}</span>
          <span class="doc-accord-name">${name}</span>
        </div>
        <span class="doc-accord-count">${data.docs.length}</span>
      </div>
      <div class="doc-accord-body">
        ${data.docs.map(d => `
          <div class="doc-row ${selectedDocId === d.id ? 'active' : ''}" onclick="selectDoc(${d.id})">
            <div class="doc-row-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div>
            <div class="doc-row-info">
              <div class="doc-row-title">${d.code} — ${d.title}</div>
              <div class="doc-row-meta">Rev ${d.rev} · ${d.date}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  if (selectedDocId) selectDoc(selectedDocId);
}

function selectDoc(id) {
  selectedDocId = id;
  document.querySelectorAll('.doc-row').forEach(r => r.classList.remove('active'));
  event?.target?.closest?.('.doc-row')?.classList?.add?.('active');

  const d = DOCUMENTS.find(doc => doc.id === id);
  if (!d) return;
  const di = disc(d.discipline);
  const linked = d.linkedChange ? CHANGES.find(c => c.id === d.linkedChange) : null;

  $('doc-detail-panel').innerHTML = `
    <div class="doc-detail-header">
      <div class="doc-detail-code">${d.code}</div>
      <div class="doc-detail-title">${d.title}</div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <span class="badge badge-blue">${di.name}</span>
        <span class="badge badge-gray">Rev ${d.rev}</span>
      </div>
    </div>
    <div class="doc-detail-section">
      <div class="doc-detail-section-title">Revision History</div>
      ${d.revisions.map(r => `
        <div class="doc-rev-row">
          <div class="doc-rev-num ${r.n === d.rev ? 'current' : ''}">R${r.n}</div>
          <div class="doc-rev-info">
            <div style="font-weight:600">${r.note}</div>
            <div class="doc-rev-date">${r.date}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ${linked ? `
      <div class="doc-detail-section">
        <div class="doc-detail-section-title">Linked Change Event</div>
        <div style="padding:8px 0;cursor:pointer" onclick="router.go('change-detail','${linked.id}')">
          <div style="font-weight:700;color:var(--primary);font-size:12px">${linked.id}</div>
          <div style="font-weight:600;margin-top:2px">${linked.title}</div>
          <div style="margin-top:4px">${statusBadge(linked.status)} ${riskBadge(linked.risk)}</div>
        </div>
      </div>
    ` : ''}
    <div class="doc-detail-section">
      <div class="doc-detail-section-title">Details</div>
      <div style="font-size:13px;color:var(--text-muted)">
        <div style="padding:4px 0">Discipline: <strong style="color:var(--text)">${di.name}</strong></div>
        <div style="padding:4px 0">Last Updated: <strong style="color:var(--text)">${d.date}</strong></div>
        <div style="padding:4px 0">Total Revisions: <strong style="color:var(--text)">${d.revisions.length}</strong></div>
      </div>
    </div>
  `;

  renderDocuments();
}

// ── RENDER: Disciplines ────────────────────────────────────────────
function renderDisciplines() {
  $('disciplines-grid').innerHTML = DISCIPLINES.map(d => {
    const docs = DOCUMENTS.filter(doc => doc.discipline === d.id);
    const changes = CHANGES.filter(c => c.impacted.includes(d.id));
    const reviews = [];
    CHANGES.forEach(c => { c.reviews.forEach(r => { if (r.disc === d.id) reviews.push(r); }); });
    const pending = reviews.filter(r => r.status === 'pending').length;
    const conflicts = reviews.filter(r => r.status === 'flagged').length;

    return `<div class="disc-card" onclick="router.go('discipline-detail',${d.id})">
      <div class="disc-card-header">
        <div class="disc-card-icon" style="background:${d.color}20">${d.icon}</div>
        <div>
          <div class="disc-card-name">${d.name}</div>
          <div class="disc-card-role">${d.abbr}</div>
        </div>
      </div>
      <div class="disc-card-metrics">
        <div class="disc-metric"><div class="disc-metric-val">${changes.length}</div><div class="disc-metric-label">Active Changes</div></div>
        <div class="disc-metric"><div class="disc-metric-val">${docs.length}</div><div class="disc-metric-label">Documents</div></div>
        <div class="disc-metric"><div class="disc-metric-val" style="color:${pending > 0 ? 'var(--amber)' : 'var(--green)'}">${pending}</div><div class="disc-metric-label">Pending Reviews</div></div>
        <div class="disc-metric"><div class="disc-metric-val" style="color:${conflicts > 0 ? 'var(--red)' : 'var(--green)'}">${conflicts}</div><div class="disc-metric-label">Conflicts</div></div>
      </div>
    </div>`;
  }).join('');
}

function renderDisciplineDetail(discId) {
  const d = disc(discId);
  const docs = DOCUMENTS.filter(doc => doc.discipline === discId);
  const changes = CHANGES.filter(c => c.impacted.includes(discId));
  const reviews = [];
  CHANGES.forEach(c => { c.reviews.forEach(r => { if (r.disc === discId) reviews.push({ ...r, changeId: c.id, changeTitle: c.title }); }); });

  $('dd-header').innerHTML = `
    <div class="disc-card-icon" style="background:${d.color}20;font-size:28px;width:56px;height:56px;border-radius:14px">${d.icon}</div>
    <div>
      <div style="font-size:20px;font-weight:800">${d.name}</div>
      <div style="font-size:13px;color:var(--text-muted)">${d.abbr} · ${docs.length} documents · ${changes.length} active changes</div>
    </div>
  `;

  $('dd-main').innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Active Changes</h2></div>
      <div class="panel-body">
        ${changes.length === 0 ? '<p style="color:var(--text-dim)">No active changes</p>' :
          changes.map(c => {
            const r = c.reviews.find(rv => rv.disc === discId);
            return `<div class="ov-change" onclick="router.go('change-detail','${c.id}')">
              <span class="ov-change-id">${c.id}</span>
              <span class="ov-change-title truncate">${c.title}</span>
              ${r ? statusBadge(r.status) : ''}
            </div>`;
          }).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Documents</h2></div>
      <div class="panel-body">
        ${docs.map(doc => `
          <div class="cd-doc">
            <div class="cd-doc-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div>
            <div class="cd-doc-info">
              <div class="cd-doc-name">${doc.code} — ${doc.title}</div>
              <div class="cd-doc-meta">Rev ${doc.rev} · ${doc.date}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('dd-side').innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Reviews</h2></div>
      <div class="panel-body">
        ${reviews.length === 0 ? '<p style="color:var(--text-dim)">No reviews</p>' :
          reviews.map(r => `
            <div class="cd-rev" style="cursor:pointer" onclick="router.go('change-detail','${r.changeId}')">
              <div class="cd-rev-icon" style="background:${r.status === 'reviewed' ? 'var(--green-dim)' : r.status === 'flagged' ? 'var(--red-dim)' : 'var(--amber-dim)'}">
                ${r.status === 'reviewed' ? '✓' : r.status === 'flagged' ? '⚠' : '⏳'}
              </div>
              <span class="cd-rev-name" style="font-size:12px">${r.changeId}<br><span style="color:var(--text-muted);font-weight:400">${r.changeTitle}</span></span>
              ${statusBadge(r.status)}
            </div>
          `).join('')}
      </div>
    </div>
  `;
}

// ── RENDER: Confidence ─────────────────────────────────────────────
function renderConfidence() {
  const score = CONFIDENCE.score;
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;

  $('conf-ring').innerHTML = `
    <svg class="conf-ring-svg" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="48" class="conf-ring-bg"/>
      <circle cx="60" cy="60" r="48" class="conf-ring-fg" stroke="${factorColor(score)}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
    </svg>
    <div class="conf-ring-text" style="color:${factorColor(score)}">${score}%</div>
  `;

  $('conf-main').innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Confidence Factors</h2></div>
      <div class="panel-body">
        ${CONFIDENCE.factors.map(f => `
          <div class="conf-factor">
            <div class="conf-factor-top">
              <span class="conf-factor-name">${f.name}</span>
              <span class="conf-factor-val" style="color:${factorColor(f.value)}">${f.value}%</span>
            </div>
            <div class="conf-factor-bar">
              <div class="conf-factor-fill" style="width:${f.value}%;background:${factorColor(f.value)}"></div>
            </div>
            <div class="conf-factor-desc">${f.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('conf-side').innerHTML = `
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Score by Change Event</h2></div>
      <div class="panel-body">
        ${CHANGES.map(c => `
          <div class="ov-change" onclick="router.go('change-detail','${c.id}')">
            <span class="ov-change-id">${c.id}</span>
            <span class="ov-change-title truncate">${c.title}</span>
            <span style="font-weight:800;color:${factorColor(c.confidence.score)}">${c.confidence.score}%</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">What's Affecting Confidence</h2></div>
      <div class="panel-body">
        <div class="cd-action"><div class="cd-action-check" style="border-color:var(--red)">!</div><span class="cd-action-text">Structural conflict on CE-001 (wall load)</span></div>
        <div class="cd-action"><div class="cd-action-check" style="border-color:var(--amber)">⏳</div><span class="cd-action-text">5 pending reviews across 2 change events</span></div>
        <div class="cd-action"><div class="cd-action-check" style="border-color:var(--amber)">⏳</div><span class="cd-action-text">CE-004 has 0/5 reviews complete (critical risk)</span></div>
        <div class="cd-action"><div class="cd-action-check done">✓</div><span class="cd-action-text done">CE-003 fully approved — no issues</span></div>
      </div>
    </div>
  `;
}

// ── ACTIONS ────────────────────────────────────────────────────────
const actions = {
  async uploadChange(e) {
    e.preventDefault();
    const title = $('change-upload-title').value;
    const fileOld = $('file-old').files[0];
    const fileNew = $('file-new').files[0];
    if (!title || !fileOld || !fileNew) return;

    const btn = $('btn-upload-change');
    btn.disabled = true;
    btn.textContent = 'Comparing...';

    try {
      const form = new FormData();
      form.append('title', title);
      form.append('old_file', fileOld);
      form.append('new_file', fileNew);
      form.append('project_id', '1');
      const token = localStorage.getItem('token');
      const res = await fetch(API + '/changes', {
        method: 'POST', body: form,
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) throw new Error(await res.text());
      ui.hideModal('modal-upload-change');
      ui.toast('Change event created');
      router.go('changes');
    } catch (err) {
      ui.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Compare & Upload';
    }
    return false;
  },

  async uploadDocument(e) {
    e.preventDefault();
    const title = $('doc-upload-title').value;
    const file = $('file-doc').files[0];
    const discipline = $('doc-upload-discipline').value;
    if (!title || !file || !discipline) return;

    const btn = $('btn-upload-doc');
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    try {
      const form = new FormData();
      form.append('title', title);
      form.append('file', file);
      form.append('discipline_id', discipline);
      form.append('project_id', '1');
      const code = $('doc-upload-code').value;
      if (code) form.append('code', code);
      const notes = $('doc-upload-notes').value;
      if (notes) form.append('notes', notes);
      const token = localStorage.getItem('token');
      const res = await fetch(API + '/projects/1/documents', {
        method: 'POST', body: form,
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) throw new Error(await res.text());
      ui.hideModal('modal-upload-doc');
      ui.toast('Document uploaded');
      router.go('documents');
    } catch (err) {
      ui.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
    return false;
  },

  flagConflict(e) {
    e.preventDefault();
    ui.hideModal('modal-conflict');
    ui.toast('Conflict flagged');
    return false;
  },
};

function deleteChange(id) {
  if (!confirm('Delete this change event?')) return;
  const idx = CHANGES.findIndex(c => c.id === id);
  if (idx >= 0) {
    CHANGES.splice(idx, 1);
    router.go('changes');
    ui.toast('Change deleted');
  }
}

// ── POPULATE SELECTS ───────────────────────────────────────────────
function populateSelects() {
  const regDisc = $('reg-discipline');
  if (regDisc) {
    DISCIPLINES.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      regDisc.appendChild(opt);
    });
  }
  const docDisc = $('doc-upload-discipline');
  if (docDisc) {
    docDisc.innerHTML = '<option value="">Select discipline</option>';
    DISCIPLINES.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      docDisc.appendChild(opt);
    });
  }
  const docChange = $('doc-upload-change');
  if (docChange) {
    docChange.innerHTML = '<option value="">None</option>';
    CHANGES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.id} — ${c.title}`;
      docChange.appendChild(opt);
    });
  }
}

// ── INIT ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateSelects();
  auth.check();
});
