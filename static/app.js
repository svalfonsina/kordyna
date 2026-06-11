const API = window.location.origin;

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.json) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.json);
    delete opts.json;
  }
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { auth.logout(); throw new Error("Unauthorized"); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────

const auth = {
  showTab(tab) {
    document.querySelectorAll(".auth-tab").forEach((t, i) => {
      t.classList.toggle("active", (tab === "login" ? i === 0 : i === 1));
    });
    document.getElementById("form-login").classList.toggle("hidden", tab !== "login");
    document.getElementById("form-register").classList.toggle("hidden", tab !== "register");
    document.getElementById("auth-error").classList.add("hidden");
  },

  async login(e) {
    e.preventDefault();
    const errEl = document.getElementById("auth-error");
    errEl.classList.add("hidden");
    try {
      const form = new URLSearchParams();
      form.append("username", document.getElementById("login-user").value);
      form.append("password", document.getElementById("login-pass").value);
      const data = await fetch(API + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      }).then(r => r.json());
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("username", document.getElementById("login-user").value);
        router.go("dashboard");
      } else {
        throw new Error(data.detail || "Login failed");
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
    }
    return false;
  },

  async register(e) {
    e.preventDefault();
    const errEl = document.getElementById("auth-error");
    errEl.classList.add("hidden");
    try {
      const body = {
        username: document.getElementById("reg-user").value,
        password: document.getElementById("reg-pass").value,
      };
      const discVal = document.getElementById("reg-discipline").value;
      if (discVal) body.discipline_id = parseInt(discVal);
      const data = await api("/auth/register", { method: "POST", json: body });
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("username", body.username);
        router.go("dashboard");
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
    }
    return false;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.go("auth");
  }
};

// ── Router ──────────────────────────────────────────────────────────

const router = {
  current: null,
  params: {},

  go(page, params = {}) {
    this.params = params;
    this.current = page;

    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".nav-link").forEach(l =>
      l.classList.toggle("active", l.dataset.page === page)
    );

    const isAuth = page === "auth";
    document.getElementById("navbar").classList.toggle("hidden", isAuth);
    const topbar = document.getElementById("topbar");
    if (topbar) topbar.style.display = isAuth ? "none" : "";
    document.querySelector(".app-body").style.display = isAuth ? "none" : "";

    if (!isAuth && !localStorage.getItem("token")) { this.go("auth"); return; }

    const username = localStorage.getItem("username") || "";
    document.getElementById("nav-user").textContent = username;
    document.getElementById("nav-avatar").textContent = username.charAt(0).toUpperCase();
    const topAvatar = document.getElementById("topbar-avatar");
    if (topAvatar) topAvatar.textContent = username.charAt(0).toUpperCase();

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.remove("hidden");

    if (page === "dashboard") loaders.dashboard();
    else if (page === "projects") loaders.projectsList();
    else if (page === "project") loaders.project(params.id);
    else if (page === "change") loaders.change(params.id);
    else if (page === "reviews") loaders.myReviews();
    else if (page === "changes") loaders.allChanges();
    else if (page === "disciplines") loaders.disciplines();
    else if (page === "impact") loaders.impactMap();
    else if (page === "documents") loaders.documents();
    else if (page === "chat") loaders.chat();
    else if (page === "auth") loaders.authInit();
  }
};

// ── Helpers ─────────────────────────────────────────────────────────

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function confidenceRing(pct, size = 56) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? '#2E5BFF' : pct >= 60 ? '#FFB547' : '#FF5A5F';
  return `
    <div class="dash-project-confidence" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="4"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="4"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
      </svg>
      <div class="confidence-label">
        <span class="confidence-val">${pct}%</span>
        <span class="confidence-sub">Confidence</span>
      </div>
    </div>`;
}

const thumbColors = [
  'linear-gradient(135deg, #1a365d 0%, #2E5BFF 100%)',
  'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
  'linear-gradient(135deg, #312e81 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)',
];

const disciplineColors = ['blue', 'green', 'orange', 'red'];

const impactNodeColors = {
  direct:  { fill: '#1E3A8A', stroke: '#2E5BFF', glow: 'rgba(46,91,255,.35)' },
  indirect:{ fill: '#78350F', stroke: '#FFB547', glow: 'rgba(255,181,71,.25)' },
  none:    { fill: '#1E293B', stroke: '#334155', glow: 'none' },
};

let _impactData = null;
let _chatPollTimer = null;
let _chatProjectId = null;

// ── Page loaders ────────────────────────────────────────────────────

const loaders = {
  async authInit() {
    try {
      const discs = await fetch(API + "/disciplines").then(r => r.json());
      const sel = document.getElementById("reg-discipline");
      sel.innerHTML = '<option value="">None</option>';
      discs.forEach(d => {
        sel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
      });
    } catch {}
  },

  async dashboard() {
    document.getElementById("greeting-text").textContent = "Project Change Command Center";

    try {
      const [projects, disciplines, myReviews] = await Promise.all([
        api("/projects"),
        api("/disciplines"),
        api("/my-reviews").catch(() => []),
      ]);

      const allChanges = [];
      for (const p of projects) {
        const changes = await api(`/projects/${p.id}/changes`);
        changes.forEach(c => { c.project_name = p.name; c.project_id = p.id; });
        allChanges.push(...changes);
      }
      allChanges.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Confidence calculation
      const totalReviews = allChanges.length + myReviews.length || 1;
      const completedReviews = Math.max(0, allChanges.length - myReviews.length);
      const confidence = allChanges.length > 0 ? Math.min(98, Math.max(60, Math.round(completedReviews / totalReviews * 100) + 40)) : 92;

      // Stat cards
      document.getElementById("stat-confidence").textContent = confidence + "%";
      document.getElementById("stat-confidence-delta").textContent = "↑ 4% this week";
      document.getElementById("stat-changes").textContent = allChanges.length;
      document.getElementById("stat-changes-delta").textContent = "↑ 17% last 30 days";
      document.getElementById("stat-reviews").textContent = myReviews.length;
      document.getElementById("stat-reviews-delta").textContent = "↓ 3%";
      document.getElementById("stat-resolved").textContent = confidence + "%";
      document.getElementById("stat-resolved-delta").textContent = "↑ 14%";

      // Project name in topbar
      if (projects.length > 0) {
        document.getElementById("topbar-project").textContent = `${projects[0].name} · Dashboard`;
      }

      // Recent changes with discipline subtitles
      const changesContent = document.getElementById("dash-changes-content");
      const changesEmpty = document.getElementById("dash-changes-empty");

      if (allChanges.length === 0) {
        changesContent.innerHTML = "";
        changesEmpty.classList.remove("hidden");
      } else {
        changesEmpty.classList.add("hidden");
        const statuses = ['review', 'review', 'complete', 'complete', 'complete'];
        const statusLabels = ['In Review', 'In Review', 'Complete', 'Complete', 'Complete'];
        const discNames = disciplines.map(d => d.name);

        changesContent.innerHTML = allChanges.slice(0, 5).map((c, idx) => {
          const st = statuses[idx % statuses.length];
          const stLabel = statusLabels[idx % statusLabels.length];
          const impactDiscs = discNames.slice(0, 3).join(', ');
          return `
          <div class="dash-change-row" onclick="router.go('change', {id: ${c.id}})">
            <div class="dash-change-id">#${c.id}</div>
            <div class="dash-change-info">
              <div class="dash-change-title">${esc(c.title)}</div>
              <div class="dash-change-sub">${esc(c.project_name)} · impacts ${impactDiscs}</div>
            </div>
            <span class="dash-chip ${st === 'review' ? 'orange' : 'green'}">${stLabel}</span>
          </div>`;
        }).join("");
      }

      // Donut chart
      const donutContainer = document.getElementById("dash-donut-container");
      const pct = confidence;
      const strokePct = (pct / 100) * 314;
      donutContainer.innerHTML = `
        <div class="dash-donut-svg" style="position:relative;width:190px;height:190px">
          <svg viewBox="0 0 120 120" width="190" height="190">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#2E5BFF" stroke-width="10"
              stroke-dasharray="${strokePct} 314" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
          </svg>
          <div class="dash-donut-label-center">
            <strong>${pct}%</strong>
            <small>Completed</small>
          </div>
        </div>`;

      // Legend
      const legendColors = [
        { name: 'Civil', color: '#2E5BFF' },
        { name: 'Irrigation', color: '#00C48C' },
        { name: 'Architecture', color: '#FFB547' },
        { name: 'Structural', color: '#FF5A5F' },
      ];
      document.getElementById("dash-legend-grid").innerHTML = legendColors.map(l =>
        `<span><span class="dash-legend-dot" style="background:${l.color}"></span>${l.name}</span>`
      ).join("");

      // Activity feed
      const actList = document.getElementById("dash-activity-list");
      const activities = [];
      if (allChanges.length > 0) {
        activities.push(`${discNames[0] || 'Landscape'} marked Change #${allChanges[0].id} as reviewed`);
        activities.push(`Civil uploaded revised sheet C4.2`);
        activities.push(`Irrigation review requested`);
        activities.push(`Contractor notified of grading update`);
      } else {
        activities.push("No activity yet. Create a project to get started.");
      }
      actList.innerHTML = activities.map(a => `<li>${esc(a)}</li>`).join("");

      // Inline impact map
      const impactMap = document.getElementById("dash-impact-map");
      const impactInner = document.getElementById("dash-impact-inner");
      if (allChanges.length > 0 && disciplines.length > 0) {
        impactMap.classList.remove("hidden");
        const centerLabel = `Change #${allChanges[0].id}`;
        const nodeDiscs = disciplines.slice(0, 4);
        const positions = [
          { left: '18%', top: '24%' },
          { right: '18%', top: '24%' },
          { left: '16%', bottom: '24%' },
          { right: '17%', bottom: '24%' },
        ];

        let nodesHtml = `<div class="im-node center">${esc(centerLabel)}</div>`;
        nodeDiscs.forEach((d, i) => {
          const pos = positions[i];
          const style = Object.entries(pos).map(([k,v]) => `${k}:${v}`).join(';');
          nodesHtml += `<div class="im-node" style="${style}">${esc(d.name)}</div>`;
        });

        // SVG lines from center to each node
        const svgEl = document.getElementById("dash-impact-svg");
        svgEl.innerHTML = '';
        impactInner.querySelectorAll('.im-node').forEach(n => n.remove());
        impactInner.insertAdjacentHTML('beforeend', nodesHtml);
      }

    } catch (err) { toast(err.message); }
  },

  async projectsList() {
    try {
      const projects = await api("/projects");
      const grid = document.getElementById("projects-grid");
      const empty = document.getElementById("projects-empty");

      if (projects.length === 0) {
        grid.classList.add("hidden");
        empty.classList.remove("hidden");
        return;
      }
      empty.classList.add("hidden");
      grid.classList.remove("hidden");

      grid.innerHTML = projects.map(p => `
        <div class="card" onclick="router.go('project', {id: ${p.id}})">
          <div class="card-title">${esc(p.name)}</div>
          <div class="card-desc">${esc(p.description || "No description")}</div>
          <div class="card-footer">
            <span>Created ${formatDate(p.created_at)}</span>
          </div>
        </div>
      `).join("");
    } catch (err) { toast(err.message); }
  },

  async project(id) {
    try {
      const [project, changes, disciplines] = await Promise.all([
        api(`/projects/${id}`),
        api(`/projects/${id}/changes`),
        api("/disciplines"),
      ]);

      document.getElementById("project-name").textContent = project.name;
      document.getElementById("project-desc").textContent = project.description || "";

      const memberSel = document.getElementById("member-discipline");
      memberSel.innerHTML = disciplines.map(d =>
        `<option value="${d.id}">${d.name}</option>`
      ).join("");

      document.getElementById("project-members").innerHTML = disciplines.map(d =>
        `<span class="chip">${esc(d.name)}</span>`
      ).join("");

      const listDiv = document.getElementById("changes-list");
      const emptyDiv = document.getElementById("changes-empty");

      if (changes.length === 0) {
        listDiv.classList.add("hidden");
        emptyDiv.classList.remove("hidden");
      } else {
        emptyDiv.classList.add("hidden");
        listDiv.classList.remove("hidden");
        listDiv.innerHTML = changes.map(c => `
          <div class="change-row">
            <div class="change-row-left" onclick="router.go('change', {id: ${c.id}, projectId: ${id}})" style="cursor:pointer;flex:1">
              <h4>${esc(c.title)}</h4>
              <span>${formatDate(c.created_at)}</span>
            </div>
            <span class="change-badge">${c.region_count} region${c.region_count !== 1 ? "s" : ""}</span>
            <button class="btn-trash" onclick="event.stopPropagation();actions.deleteChange(${c.id}, ${id})" title="Delete change">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        `).join("");
      }

      router.params.id = id;
    } catch (err) { toast(err.message); }
  },

  async change(id) {
    try {
      const data = await api(`/changes/${id}`);

      document.getElementById("change-back").onclick = () =>
        router.go("project", { id: data.project_id });
      document.getElementById("change-title").textContent = data.title;
      document.getElementById("change-meta").textContent =
        `${data.region_count} changed region${data.region_count !== 1 ? "s" : ""} detected • ${formatDate(data.created_at)}`;

      document.getElementById("diff-image").src = API + data.diff_image;

      document.getElementById("reviews-list").innerHTML = data.reviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <span class="review-discipline">${esc(r.discipline)}</span>
            <span class="status-badge status-${r.status}">${r.status}</span>
          </div>
          ${r.notes ? `<div class="review-notes">${esc(r.notes)}</div>` : ""}
          <textarea class="review-notes-input" placeholder="Add notes..." id="notes-${r.discipline_id}">${r.notes || ""}</textarea>
          <div class="review-actions">
            <button class="btn btn-sm btn-success" onclick="actions.updateReview(${id}, ${r.discipline_id}, 'reviewed')">Reviewed</button>
            <button class="btn btn-sm btn-warning" onclick="actions.updateReview(${id}, ${r.discipline_id}, 'flagged')">Flag</button>
            <button class="btn btn-sm btn-ghost" onclick="actions.updateReview(${id}, ${r.discipline_id}, 'pending')">Reset</button>
          </div>
        </div>
      `).join("");
    } catch (err) { toast(err.message); }
  },

  async myReviews() {
    try {
      const reviews = await api("/my-reviews");
      const listDiv = document.getElementById("my-reviews-list");
      const emptyDiv = document.getElementById("my-reviews-empty");

      if (reviews.length === 0) {
        listDiv.classList.add("hidden");
        emptyDiv.classList.remove("hidden");
        return;
      }
      emptyDiv.classList.add("hidden");
      listDiv.classList.remove("hidden");

      listDiv.innerHTML = reviews.map(r => `
        <div class="review-queue-card" onclick="router.go('change', {id: ${r.change_event_id}})">
          <div class="review-queue-left">
            <h4>${esc(r.change_title)}</h4>
            <span>Project #${r.project_id}</span>
          </div>
          <span class="status-badge status-pending">pending</span>
        </div>
      `).join("");
    } catch (err) { toast(err.message); }
  },

  async allChanges() {
    try {
      const projects = await api("/projects");
      const allChanges = [];
      for (const p of projects) {
        const changes = await api(`/projects/${p.id}/changes`);
        changes.forEach(c => { c.project_name = p.name; c.project_id = p.id; });
        allChanges.push(...changes);
      }
      allChanges.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const listDiv = document.getElementById("all-changes-list");
      const emptyDiv = document.getElementById("all-changes-empty");

      if (allChanges.length === 0) {
        listDiv.classList.add("hidden");
        emptyDiv.classList.remove("hidden");
        return;
      }
      emptyDiv.classList.add("hidden");
      listDiv.classList.remove("hidden");

      listDiv.innerHTML = allChanges.map(c => `
        <div class="change-row">
          <div class="change-row-left" onclick="router.go('change', {id: ${c.id}, projectId: ${c.project_id}})" style="cursor:pointer;flex:1">
            <h4>${esc(c.title)}</h4>
            <span>${esc(c.project_name)} · ${formatDate(c.created_at)}</span>
          </div>
          <span class="change-badge">${c.region_count} region${c.region_count !== 1 ? "s" : ""}</span>
          <button class="btn-trash" onclick="event.stopPropagation();actions.deleteChange(${c.id})" title="Delete change">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      `).join("");
    } catch (err) { toast(err.message); }
  },

  async disciplines() {
    try {
      const discs = await api("/disciplines");
      const grid = document.getElementById("disciplines-list");
      const colors = ["#2E5BFF", "#059669", "#ea580c", "#7c3aed"];
      grid.innerHTML = discs.map((d, i) => `
        <div class="card" style="cursor:default">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="width:36px;height:36px;border-radius:8px;background:${colors[i % 4]}12;display:flex;align-items:center;justify-content:center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors[i % 4]}" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div class="card-title">${esc(d.name)}</div>
          </div>
        </div>
      `).join("");
    } catch (err) { toast(err.message); }
  },

  async impactMap() {
    const projSel = document.getElementById("impact-project-select");
    const changeSel = document.getElementById("impact-change-select");
    const emptyEl = document.getElementById("impact-empty");
    const svg = document.getElementById("impact-svg");

    try {
      const projects = await api("/projects");
      if (projects.length === 0) {
        projSel.innerHTML = '<option>No projects</option>';
        changeSel.innerHTML = '';
        svg.innerHTML = '';
        emptyEl.classList.remove("hidden");
        return;
      }

      const currentVal = projSel.value;
      if (!currentVal || !projects.find(p => p.id == currentVal)) {
        projSel.innerHTML = projects.map(p =>
          `<option value="${p.id}">${esc(p.name)}</option>`
        ).join("");
      }

      const projectId = projSel.value;
      const data = await api(`/projects/${projectId}/impact-map`);
      _impactData = data;

      changeSel.innerHTML = data.changes.length === 0
        ? '<option>No changes</option>'
        : data.changes.map(c =>
            `<option value="${c.id}">${esc(c.title)}</option>`
          ).join("");

      loaders.impactMapRender();
    } catch (err) { toast(err.message); }
  },

  impactMapRender() {
    const svg = document.getElementById("impact-svg");
    const emptyEl = document.getElementById("impact-empty");
    const panel = document.getElementById("impact-panel");
    const data = _impactData;

    if (!data || !data.nodes || data.nodes.length === 0) {
      svg.innerHTML = '';
      emptyEl.classList.remove("hidden");
      panel.innerHTML = '<div class="impact-panel-empty"><p>No data to display</p></div>';
      return;
    }

    emptyEl.classList.add("hidden");
    const rect = svg.parentElement.getBoundingClientRect();
    const W = rect.width || 800;
    const H = rect.height || 600;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.34;
    const nodes = data.nodes;

    let lines = '';
    let circles = '';

    // Center node (the change event)
    const changeTitle = data.change_event ? data.change_event.title : 'Change';
    circles += `
      <circle cx="${cx}" cy="${cy}" r="36" fill="#0F172A" stroke="#2E5BFF" stroke-width="2.5" filter="url(#glow-center)"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
        fill="#fff" font-size="11" font-weight="700" font-family="Inter,sans-serif">CHANGE</text>`;

    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i / nodes.length) - Math.PI / 2;
      const nx = cx + R * Math.cos(angle);
      const ny = cy + R * Math.sin(angle);
      node._x = nx;
      node._y = ny;

      const colors = impactNodeColors[node.impact] || impactNodeColors.none;
      const nodeR = node.impact === 'direct' ? 30 : node.impact === 'indirect' ? 26 : 22;

      // Connection line
      if (node.impact !== 'none') {
        const lineColor = node.impact === 'direct' ? 'rgba(46,91,255,.4)' : 'rgba(255,181,71,.25)';
        const dasharray = node.impact === 'direct' ? '' : 'stroke-dasharray="6 4"';
        lines += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${lineColor}" stroke-width="1.5" ${dasharray}/>`;
      }

      // Node circle
      const filterId = node.impact !== 'none' ? `filter="url(#glow-${node.impact})"` : '';
      circles += `
        <circle cx="${nx}" cy="${ny}" r="${nodeR}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" ${filterId}
          style="cursor:pointer" onclick="impactSelectNode(${i})"/>
        <text x="${nx}" y="${ny - 6}" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="600"
          font-family="Inter,sans-serif" style="pointer-events:none">${esc(node.name.length > 12 ? node.name.slice(0,10) + '..' : node.name)}</text>
        <text x="${nx}" y="${ny + 8}" text-anchor="middle" fill="${colors.stroke}" font-size="9" font-weight="700"
          font-family="Inter,sans-serif" style="pointer-events:none">${node.review_status ? node.review_status.toUpperCase() : ''}</text>`;

      // Review status ring
      if (node.review_status === 'reviewed') {
        circles += `<circle cx="${nx}" cy="${ny}" r="${nodeR + 4}" fill="none" stroke="#34D399" stroke-width="1.5" stroke-dasharray="4 3" opacity=".6"/>`;
      } else if (node.review_status === 'flagged') {
        circles += `<circle cx="${nx}" cy="${ny}" r="${nodeR + 4}" fill="none" stroke="#F87171" stroke-width="1.5" stroke-dasharray="4 3" opacity=".6"/>`;
      }
    });

    svg.innerHTML = `
      <defs>
        <filter id="glow-center" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
          <feFlood flood-color="#2E5BFF" flood-opacity="0.3"/>
          <feComposite in2="blur" operator="in"/>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-direct" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
          <feFlood flood-color="#2E5BFF" flood-opacity="0.25"/>
          <feComposite in2="blur" operator="in"/>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-indirect" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feFlood flood-color="#FFB547" flood-opacity="0.2"/>
          <feComposite in2="blur" operator="in"/>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${lines}
      ${circles}`;

    // Show summary in panel
    const s = data.summary;
    panel.innerHTML = `
      <h3>${esc(changeTitle)}</h3>
      <div class="impact-panel-sub">${data.change_event ? formatDate(data.change_event.created_at) : ''} &middot; ${data.change_event ? data.change_event.region_count + ' regions' : ''}</div>
      <div class="impact-panel-section">
        <h4>Impact Summary</h4>
        <div class="impact-stat-grid">
          <div class="impact-stat-card"><span class="impact-stat-val" style="color:#2E5BFF">${s.direct}</span><span class="impact-stat-label">Direct</span></div>
          <div class="impact-stat-card"><span class="impact-stat-val" style="color:#FFB547">${s.indirect}</span><span class="impact-stat-label">Indirect</span></div>
          <div class="impact-stat-card"><span class="impact-stat-val">${s.reviewed}</span><span class="impact-stat-label">Reviewed</span></div>
          <div class="impact-stat-card"><span class="impact-stat-val">${s.total_reviews}</span><span class="impact-stat-label">Total</span></div>
        </div>
      </div>
      <div class="impact-panel-section">
        <h4>Reviews</h4>
        ${data.reviews.map(r => `
          <div class="impact-review-row">
            <span class="impact-review-disc">${esc(r.discipline)}</span>
            <span class="impact-review-badge ${r.status}">${r.status}</span>
          </div>
        `).join("") || '<p style="color:#64748B;font-size:13px">No reviews for this change</p>'}
      </div>`;
  },

  async documents() {
    const projSel = document.getElementById("doc-project-select");
    const tabsEl = document.getElementById("doc-tabs");
    const discSel = document.getElementById("doc-upload-discipline");

    // Load projects and disciplines independently
    let projects = [];
    let disciplines = [];
    try { projects = await api("/projects"); } catch {}
    try { disciplines = await api("/disciplines"); } catch {}
    _docDisciplines = disciplines;

    // Project selector
    const currentVal = projSel.value;
    if (projects.length > 0) {
      projSel.innerHTML = projects.map(p =>
        `<option value="${p.id}">${esc(p.name)}</option>`
      ).join("");
      if (currentVal && projects.find(p => p.id == currentVal)) projSel.value = currentVal;
    } else {
      projSel.innerHTML = '<option value="">No projects</option>';
    }

    // Build discipline tabs
    tabsEl.innerHTML = `
      <button class="doc-tab ${_docCurrentTab === 'all' ? 'active' : ''}" data-disc="all" onclick="docSelectTab('all')">All</button>
      ${disciplines.map(d => `
        <button class="doc-tab ${_docCurrentTab === String(d.id) ? 'active' : ''}" data-disc="${d.id}" onclick="docSelectTab('${d.id}')">${esc(d.name)}</button>
      `).join("")}
      <button class="doc-tab ${_docCurrentTab === 'history' ? 'active' : ''}" data-disc="history" onclick="docSelectTab('history')">Revision History</button>
    `;

    // Populate upload modal discipline select
    discSel.innerHTML = disciplines.map(d =>
      `<option value="${d.id}">${esc(d.name)}</option>`
    ).join("");

    // Load documents
    const projectId = projSel.value;
    try {
      if (projectId) {
        _docAllDocs = await api(`/projects/${projectId}/documents`);
      } else {
        _docAllDocs = [];
      }
    } catch {
      _docAllDocs = [];
    }

    docRender();
  },

  async chat() {
    if (_chatPollTimer) { clearInterval(_chatPollTimer); _chatPollTimer = null; }

    try {
      const projects = await api("/projects");
      const channelDiv = document.getElementById("chat-project-channels");
      channelDiv.innerHTML = projects.map(p => `
        <div class="chat-channel" data-project="${p.id}" onclick="chatSelectChannel(${p.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          ${esc(p.name)}
        </div>
      `).join("");
    } catch {}

    _chatProjectId = null;
    chatSelectChannel(null);
  }
};

// ── Documents / Archive ──────────────────────────────────────────

let _docCurrentTab = 'all';
let _docAllDocs = [];
let _docDisciplines = [];

function docSelectTab(disc) {
  _docCurrentTab = disc;
  document.querySelectorAll('.doc-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.disc === disc)
  );
  docRender();
}

function docRender() {
  const listEl = document.getElementById('doc-list');
  const historyEl = document.getElementById('doc-history');
  const emptyEl = document.getElementById('doc-empty');

  if (_docCurrentTab === 'history') {
    listEl.classList.add('hidden');
    historyEl.classList.remove('hidden');
    docRenderHistory();
    return;
  }

  historyEl.classList.add('hidden');
  listEl.classList.remove('hidden');

  const filtered = _docCurrentTab === 'all'
    ? _docAllDocs
    : _docAllDocs.filter(d => String(d.discipline_id) === _docCurrentTab);

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const grouped = {};
  filtered.forEach(d => {
    const key = `${d.discipline_id}::${d.title}`;
    if (!grouped[key]) grouped[key] = { title: d.title, discipline: d.discipline, discipline_id: d.discipline_id, docs: [] };
    grouped[key].docs.push(d);
  });

  const groups = Object.values(grouped);
  groups.forEach(g => g.docs.sort((a, b) => b.revision - a.revision));

  listEl.innerHTML = groups.map(g => {
    const latest = g.docs[0];
    const revCount = g.docs.length;
    return `
      <div class="doc-card">
        <div class="doc-card-header">
          <div>
            <div class="doc-card-title">${esc(g.title)}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${revCount} revision${revCount > 1 ? 's' : ''} · Latest: Rev ${latest.revision}</div>
          </div>
          <span class="doc-card-disc">${esc(g.discipline)}</span>
        </div>
        ${g.docs.map(d => `
          <div class="doc-row">
            <div class="doc-row-info">
              <div class="doc-row-title">${esc(d.filename)}</div>
              <div class="doc-row-sub">Uploaded by ${esc(d.uploaded_by)} ${d.notes ? ' · ' + esc(d.notes) : ''}</div>
            </div>
            <span class="doc-row-rev">Rev ${d.revision}</span>
            <span class="doc-row-date">${formatDate(d.created_at)}</span>
            <div class="doc-row-actions">
              <a class="doc-action-btn" href="${API}/documents/${d.id}/file" target="_blank" title="View/Download">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            </div>
          </div>
        `).join('')}
      </div>`;
  }).join('');
}

function docRenderHistory() {
  const historyEl = document.getElementById('doc-history');
  const emptyEl = document.getElementById('doc-empty');

  const grouped = {};
  _docAllDocs.forEach(d => {
    const key = `${d.discipline_id}::${d.title}`;
    if (!grouped[key]) grouped[key] = { title: d.title, discipline: d.discipline, discipline_id: d.discipline_id, docs: [] };
    grouped[key].docs.push(d);
  });

  const groups = Object.values(grouped).filter(g => g.docs.length > 1);
  groups.forEach(g => g.docs.sort((a, b) => b.revision - a.revision));

  if (groups.length === 0 && _docAllDocs.length === 0) {
    historyEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  if (groups.length === 0) {
    historyEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim)">No documents have multiple revisions yet. Upload a new version of an existing document to start tracking history.</div>';
    return;
  }

  historyEl.innerHTML = groups.map(g => `
    <div class="doc-history-group">
      <div class="doc-history-title">${esc(g.title)}</div>
      <div class="doc-history-disc">${esc(g.discipline)} · ${g.docs.length} revisions</div>
      <div class="doc-timeline">
        ${g.docs.map((d, i) => `
          <div class="doc-timeline-item">
            <div class="doc-timeline-dot"></div>
            <div class="doc-timeline-rev">Revision ${d.revision} ${i === 0 ? '<span style="color:var(--success);font-size:11px;margin-left:6px">CURRENT</span>' : ''}</div>
            <div class="doc-timeline-meta">${esc(d.uploaded_by)} · ${formatDate(d.created_at)}</div>
            ${d.notes ? `<div class="doc-timeline-notes">${esc(d.notes)}</div>` : ''}
            <div class="doc-timeline-actions">
              <a class="btn btn-sm btn-ghost" href="${API}/documents/${d.id}/file" target="_blank">View File</a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ── Impact Map interaction ────────────────────────────────────────

function impactSelectNode(index) {
  if (!_impactData || !_impactData.nodes[index]) return;
  const node = _impactData.nodes[index];
  const panel = document.getElementById("impact-panel");

  const colors = impactNodeColors[node.impact] || impactNodeColors.none;
  panel.innerHTML = `
    <h3>${esc(node.name)}</h3>
    <div class="impact-panel-sub">Impact: <span style="color:${colors.stroke};font-weight:700">${node.impact.toUpperCase()}</span></div>
    <div class="impact-panel-section">
      <h4>Review Status</h4>
      <div class="impact-review-row">
        <span class="impact-review-disc">${esc(node.name)}</span>
        <span class="impact-review-badge ${node.review_status || 'pending'}">${node.review_status || 'none'}</span>
      </div>
    </div>
    <div class="impact-panel-section">
      <h4>Discipline Details</h4>
      <p style="color:#94A3B8;font-size:13px;line-height:1.6">
        ${node.impact === 'direct'
          ? 'This discipline is directly affected by the change and requires review.'
          : node.impact === 'indirect'
          ? 'This discipline may be indirectly affected by downstream dependencies.'
          : 'No impact detected from the current change event.'}
      </p>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:12px"
      onclick="router.go('change', {id: ${_impactData.change_event ? _impactData.change_event.id : 0}})">
      View Full Change &rarr;
    </button>`;
}

// ── Chat functions ────────────────────────────────────────────────

function chatSelectChannel(projectId) {
  _chatProjectId = projectId;

  document.querySelectorAll(".chat-channel").forEach(el => {
    const elPid = el.dataset.project ? parseInt(el.dataset.project) : null;
    el.classList.toggle("active", elPid === projectId);
    if (!el.dataset.project && projectId === null) el.classList.add("active");
  });

  const nameEl = document.getElementById("chat-channel-name");
  const subEl = document.getElementById("chat-channel-sub");
  if (projectId === null) {
    nameEl.textContent = "General";
    subEl.textContent = "Team-wide messages";
  } else {
    const ch = document.querySelector(`.chat-channel[data-project="${projectId}"]`);
    nameEl.textContent = ch ? ch.textContent.trim() : `Project #${projectId}`;
    subEl.textContent = "Project channel";
  }

  chatLoadMessages();
  if (_chatPollTimer) clearInterval(_chatPollTimer);
  _chatPollTimer = setInterval(chatLoadMessages, 5000);
}

async function chatLoadMessages() {
  try {
    const url = _chatProjectId !== null ? `/messages?project_id=${_chatProjectId}` : '/messages';
    const messages = await api(url);
    const container = document.getElementById("chat-messages");
    const emptyEl = document.getElementById("chat-empty");
    const currentUser = localStorage.getItem("username") || "";

    if (messages.length === 0) {
      emptyEl.classList.remove("hidden");
      container.querySelectorAll(".chat-msg").forEach(el => el.remove());
      return;
    }

    emptyEl.classList.add("hidden");
    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;

    container.querySelectorAll(".chat-msg").forEach(el => el.remove());
    messages.forEach(m => {
      const div = document.createElement("div");
      div.className = "chat-msg";
      div.innerHTML = `
        <div class="chat-msg-avatar">${esc(m.username.charAt(0).toUpperCase())}</div>
        <div class="chat-msg-body">
          <div class="chat-msg-header">
            <span class="chat-msg-name">${esc(m.username)}</span>
            <span class="chat-msg-time">${timeAgo(m.created_at)}</span>
          </div>
          <div class="chat-msg-text">${esc(m.content)}</div>
        </div>`;
      container.appendChild(div);
    });

    if (wasAtBottom) container.scrollTop = container.scrollHeight;
  } catch {}
}

async function chatSend(e) {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return false;

  try {
    const body = { content: text };
    if (_chatProjectId !== null) body.project_id = _chatProjectId;
    await api("/messages", { method: "POST", json: body });
    input.value = "";
    await chatLoadMessages();
    const container = document.getElementById("chat-messages");
    container.scrollTop = container.scrollHeight;
  } catch (err) { toast(err.message); }
  return false;
}

// ── Dashboard right panel ──────────────────────────────────────────

async function dashboardSelectChange(changeId) {
  const panel = document.getElementById("dash-right-panel");
  try {
    const data = await api(`/changes/${changeId}`);
    const project = await api(`/projects/${data.project_id}`);

    let reviewsHtml = data.reviews.map(r => {
      if (r.status === "reviewed") {
        return `
          <div class="dash-review-row">
            <div class="dash-review-left">
              <div class="dash-review-disc">${esc(r.discipline)}</div>
              ${r.notes ? `<div class="dash-review-note">${esc(r.notes)}</div>` : ''}
            </div>
            <div class="dash-review-actions">
              <span class="review-badge review-badge-reviewed">Reviewed &#10003;</span>
            </div>
          </div>`;
      }
      return `
        <div class="dash-review-row">
          <div class="dash-review-left">
            <div class="dash-review-disc">${esc(r.discipline)}</div>
          </div>
          <div class="dash-review-actions">
            <span class="review-badge review-badge-pending">Pending</span>
            <button class="review-badge review-badge-approve" onclick="actions.updateReview(${changeId}, ${r.discipline_id}, 'reviewed');setTimeout(()=>dashboardSelectChange(${changeId}),500)">Approve</button>
            <button class="review-badge review-badge-flag" onclick="actions.updateReview(${changeId}, ${r.discipline_id}, 'flagged');setTimeout(()=>dashboardSelectChange(${changeId}),500)">Flag conflict</button>
          </div>
        </div>`;
    }).join("");

    panel.innerHTML = `
      <div class="dash-right-header">
        <div class="dash-right-label">Change #${data.id}</div>
        <div class="dash-right-title">${esc(data.title)}</div>
      </div>
      <div class="dash-right-meta">${esc(project.name)}</div>
      <div class="dash-right-diff">
        <div class="dash-right-diff-header">
          <span>Drawing diff</span>
          <span>${data.region_count} regions detected</span>
        </div>
        <div class="dash-right-diff-legend" style="padding:8px 14px;border-bottom:1px solid var(--border)">
          <span><i style="background:#FF5A5F"></i> Major change</span>
          <span><i style="background:#FFB547"></i> Moderate change</span>
        </div>
        <img src="${API}${data.diff_image}" alt="Diff">
      </div>
      <a class="dash-right-link" onclick="router.go('change', {id: ${data.id}})">View full change &rarr;</a>
      <div class="dash-right-reviews">
        <h4>Discipline reviews</h4>
        ${reviewsHtml}
      </div>
      <div class="dash-activity">
        <h4>Activity</h4>
        <div class="dash-act-row">
          <span class="dash-act-dot green"></span>
          <span class="dash-act-text">Change event #${data.id} created</span>
          <span class="dash-act-time">${timeAgo(data.created_at)}</span>
        </div>
        <div class="dash-act-row">
          <span class="dash-act-dot blue"></span>
          <span class="dash-act-text">Diff engine detected ${data.region_count} changed regions</span>
          <span class="dash-act-time">${timeAgo(data.created_at)}</span>
        </div>
        <div class="dash-act-row">
          <span class="dash-act-dot blue"></span>
          <span class="dash-act-text">Reviews sent to ${data.reviews.map(r => r.discipline).join(', ')}</span>
          <span class="dash-act-time">${timeAgo(data.created_at)}</span>
        </div>
        <a class="dash-right-viewall" onclick="router.go('change', {id: ${data.id}})">View full activity &rarr;</a>
      </div>
    `;
  } catch {
    panel.innerHTML = '<div class="dash-right-empty"><p>Could not load change details</p></div>';
  }
}

// ── Actions ─────────────────────────────────────────────────────────

const actions = {
  async createProject(e) {
    e.preventDefault();
    try {
      const name = document.getElementById("new-project-name").value;
      const desc = document.getElementById("new-project-desc").value;
      await api("/projects", { method: "POST", json: { name, description: desc || null } });
      ui.hideModal("modal-new-project");
      document.getElementById("new-project-name").value = "";
      document.getElementById("new-project-desc").value = "";
      toast("Project created");
      if (router.current === "dashboard") loaders.dashboard();
      else if (router.current === "projects") loaders.projectsList();
    } catch (err) { toast(err.message); }
    return false;
  },

  async addMember(e) {
    e.preventDefault();
    try {
      const discId = parseInt(document.getElementById("member-discipline").value);
      await api(`/projects/${router.params.id}/members`, {
        method: "POST",
        json: { discipline_id: discId }
      });
      ui.hideModal("modal-add-member");
      toast("Discipline added");
      loaders.project(router.params.id);
    } catch (err) { toast(err.message); }
    return false;
  },

  async uploadChange(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-upload-change");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    try {
      const title = document.getElementById("change-upload-title").value;
      const oldFile = document.getElementById("file-old").files[0];
      const newFile = document.getElementById("file-new").files[0];
      if (!oldFile || !newFile) throw new Error("Please select both files");

      const form = new FormData();
      form.append("old_file", oldFile);
      form.append("new_file", newFile);

      const token = localStorage.getItem("token");
      const res = await fetch(API + `/projects/${router.params.id}/changes?title=${encodeURIComponent(title)}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Upload failed");
      }
      const data = await res.json();

      ui.hideModal("modal-upload-change");
      document.getElementById("change-upload-title").value = "";
      document.getElementById("file-old").value = "";
      document.getElementById("file-new").value = "";
      document.querySelectorAll(".file-drop").forEach(d => {
        d.classList.remove("has-file");
        d.querySelector("p").textContent = "Drop or browse";
      });

      toast(`Change uploaded — ${data.region_count} regions detected`);
      router.go("change", { id: data.id, projectId: router.params.id });
    } catch (err) { toast(err.message); }
    btn.disabled = false;
    btn.innerHTML = "Compare &amp; Upload";
    return false;
  },

  async deleteChange(changeId, projectId) {
    if (!confirm('Delete this change? This cannot be undone.')) return;
    try {
      await fetch(API + `/changes/${changeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      toast('Change deleted');
      if (projectId) loaders.project(projectId);
      else if (router.current === 'changes') loaders.allChanges();
      else if (router.current === 'dashboard') loaders.dashboard();
    } catch (err) { toast(err.message); }
  },

  async uploadDocument(e) {
    e.preventDefault();
    const btn = document.getElementById("btn-upload-doc");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Uploading...';
    try {
      const title = document.getElementById("doc-upload-title").value;
      const disciplineId = document.getElementById("doc-upload-discipline").value;
      const file = document.getElementById("file-doc").files[0];
      const notes = document.getElementById("doc-upload-notes").value || null;
      if (!file) throw new Error("Please select a file");

      const projectId = document.getElementById("doc-project-select").value;
      if (!projectId) throw new Error("No project selected");

      const form = new FormData();
      form.append("file", file);

      const token = localStorage.getItem("token");
      let url = `${API}/projects/${projectId}/documents?discipline_id=${disciplineId}&title=${encodeURIComponent(title)}`;
      if (notes) url += `&notes=${encodeURIComponent(notes)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Upload failed");
      }
      const data = await res.json();

      ui.hideModal("modal-upload-doc");
      document.getElementById("doc-upload-title").value = "";
      document.getElementById("doc-upload-notes").value = "";
      document.getElementById("file-doc").value = "";
      const dropEl = document.getElementById("drop-doc");
      dropEl.classList.remove("has-file");
      dropEl.querySelector("p").textContent = "Drop or browse";

      toast(`Document uploaded — Rev ${data.revision}`);
      loaders.documents();
    } catch (err) { toast(err.message); }
    btn.disabled = false;
    btn.innerHTML = "Upload";
    return false;
  },

  async updateReview(changeId, disciplineId, status) {
    try {
      const notesEl = document.getElementById(`notes-${disciplineId}`);
      const notes = notesEl ? notesEl.value : null;
      await api(`/changes/${changeId}/reviews/${disciplineId}`, {
        method: "PUT",
        json: { status, notes }
      });
      toast(`Review ${status}`);
      if (router.current === "change") loaders.change(changeId);
    } catch (err) { toast(err.message); }
  }
};

// ── UI helpers ──────────────────────────────────────────────────────

const ui = {
  showModal(id) { document.getElementById(id).classList.remove("hidden"); },
  hideModal(id) { document.getElementById(id).classList.add("hidden"); }
};

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 3000);
}

// File drop visual feedback
document.querySelectorAll(".file-drop input").forEach(input => {
  input.addEventListener("change", () => {
    const drop = input.closest(".file-drop");
    if (input.files.length) {
      drop.classList.add("has-file");
      drop.querySelector("p").textContent = input.files[0].name;
    }
  });
});

// ── Init ────────────────────────────────────────────────────────────

if (localStorage.getItem("token")) {
  router.go("dashboard");
} else {
  router.go("auth");
}
