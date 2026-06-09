const API = window.location.origin;

// ── API helper ──────────────────────────────────────────────────────

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
    document.querySelector(".app-body").style.display = isAuth ? "none" : "";

    if (!isAuth && !localStorage.getItem("token")) { this.go("auth"); return; }

    const username = localStorage.getItem("username") || "";
    document.getElementById("nav-user").textContent = username;
    document.getElementById("nav-avatar").textContent = username.charAt(0).toUpperCase();

    document.getElementById(`page-${page}`).classList.remove("hidden");

    if (page === "dashboard") loaders.dashboard();
    else if (page === "project") loaders.project(params.id);
    else if (page === "change") loaders.change(params.id);
    else if (page === "reviews") loaders.myReviews();
    else if (page === "disciplines") loaders.disciplines();
    else if (page === "auth") loaders.authInit();
  }
};

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
            <span class="card-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
              Created ${formatDate(p.created_at)}
            </span>
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

      const membersDiv = document.getElementById("project-members");
      if (disciplines.length > 0) {
        membersDiv.innerHTML = disciplines.map(d =>
          `<span class="chip">${esc(d.name)}</span>`
        ).join("");
      }

      const listDiv = document.getElementById("changes-list");
      const emptyDiv = document.getElementById("changes-empty");

      if (changes.length === 0) {
        listDiv.classList.add("hidden");
        emptyDiv.classList.remove("hidden");
      } else {
        emptyDiv.classList.add("hidden");
        listDiv.classList.remove("hidden");
        listDiv.innerHTML = changes.map(c => `
          <div class="change-row" onclick="router.go('change', {id: ${c.id}, projectId: ${id}})">
            <div class="change-row-left">
              <h4>${esc(c.title)}</h4>
              <span>${formatDate(c.created_at)}</span>
            </div>
            <span class="change-badge">${c.region_count} region${c.region_count !== 1 ? "s" : ""}</span>
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

      const img = document.getElementById("diff-image");
      img.src = API + data.diff_image;

      const reviewsDiv = document.getElementById("reviews-list");
      reviewsDiv.innerHTML = data.reviews.map(r => `
        <div class="review-card" id="review-${r.discipline_id}">
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

  async disciplines() {
    try {
      const discs = await api("/disciplines");
      const grid = document.getElementById("disciplines-list");
      const colors = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24"];
      grid.innerHTML = discs.map((d, i) => `
        <div class="card" style="cursor:default">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="width:36px;height:36px;border-radius:8px;background:${colors[i % 4]}20;display:flex;align-items:center;justify-content:center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors[i % 4]}" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div class="card-title">${esc(d.name)}</div>
          </div>
        </div>
      `).join("");
    } catch (err) { toast(err.message); }
  }
};

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
      loaders.dashboard();
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
      form.append("title", title);

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

  async updateReview(changeId, disciplineId, status) {
    try {
      const notesEl = document.getElementById(`notes-${disciplineId}`);
      const notes = notesEl ? notesEl.value : null;
      await api(`/changes/${changeId}/reviews/${disciplineId}`, {
        method: "PUT",
        json: { status, notes }
      });
      toast(`Review ${status}`);
      loaders.change(changeId);
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

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
