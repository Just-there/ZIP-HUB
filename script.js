/* =========================================================
   LUMORA — app logic
   Storage model: each signed-in user owns a `files` array.
   A file moves through one status: "staging" -> a folder
   name ("notes" | "ai" | "business"). Every commit appends
   an entry to that user's history log.
   ========================================================= */

const USERS_KEY = "lumora_users";
const SESSION_KEY = "lumora_session";

/* ---------- tiny safe-storage helpers ---------- */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`LUMORA: could not parse "${key}" from storage`, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`LUMORA: could not write "${key}" to storage`, err);
    showToast("Storage is full or unavailable.", true);
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- icon set (replaces all emoji) ---------- */
const ICONS = {
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  commit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>`,
  brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1.5 5.6A3 3 0 0 0 7 19a3 3 0 0 0 2 .8"/><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 1.5 5.6A3 3 0 0 1 17 19a3 3 0 0 1-2 .8"/><path d="M9 4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3"/><path d="M15 4a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>`,
  move: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l3 3 3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  log: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7"/><path d="M9 11h7"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M9.5 13h5"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
};

function icon(name, extraClass) {
  return `<span class="icon-wrap ${extraClass || ""}" aria-hidden="true">${ICONS[name] || ""}</span>`;
}

/* injects icons into any element with data-icon="name" */
function injectIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(el => {
    const name = el.getAttribute("data-icon");
    if (ICONS[name]) el.innerHTML = ICONS[name];
  });
}

/* ---------- folder display config ---------- */
const FOLDERS = {
  notes: { label: "Notes", icon: "book" },
  ai: { label: "AI Research", icon: "brain" },
  business: { label: "Business Plan", icon: "briefcase" },
};

/* ---------- toast ---------- */
let toastTimer = null;
function showToast(message, isError = false) {
  let toast = document.getElementById("lumoraToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "lumoraToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `${icon(isError ? "alert" : "check")}<span></span>`;
  toast.querySelector("span").textContent = message;
  toast.classList.toggle("error", isError);

  clearTimeout(toastTimer);
  toast.classList.remove("show");
  requestAnimationFrame(() => toast.classList.add("show"));
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* =========================================================
   AUTH
   ========================================================= */
function getUsers() {
  return readJSON(USERS_KEY, {});
}

function saveUsers(users) {
  writeJSON(USERS_KEY, users);
}

function setSession(user) {
  writeJSON(SESSION_KEY, user);
}

function getSession() {
  return readJSON(SESSION_KEY, null);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  return getSession()?.email || null;
}

function requireAuthRedirect() {
  if (!getCurrentUser()) {
    window.location.href = "login.html";
    return true;
  }
  return false;
}

function signup(email, password) {
  email = (email || "").trim().toLowerCase();

  if (!email || !password) {
    return { ok: false, message: "Enter an email and password." };
  }
  if (password.length < 4) {
    return { ok: false, message: "Password must be at least 4 characters." };
  }

  const users = getUsers();
  if (users[email]) {
    return { ok: false, message: "An account with that email already exists." };
  }

  users[email] = {
    password,
    files: [],
    history: [],
    createdAt: Date.now(),
  };

  saveUsers(users);
  setSession({ email });
  return { ok: true };
}

function login(email, password) {
  email = (email || "").trim().toLowerCase();
  const users = getUsers();

  if (!users[email] || users[email].password !== password) {
    return { ok: false, message: "That email or password doesn't match our records." };
  }

  setSession({ email });
  return { ok: true };
}

function logout() {
  clearSession();
  window.location.href = "login.html";
}

function getUserRecord() {
  const email = getCurrentUser();
  if (!email) return null;
  const users = getUsers();
  return users[email] || null;
}

function mutateUserRecord(fn) {
  const email = getCurrentUser();
  if (!email) return;
  const users = getUsers();
  if (!users[email]) return;
  fn(users[email]);
  saveUsers(users);
}

/* =========================================================
   FILES — staging, library, history
   All file data lives on the logged-in user's record so it
   never leaks across accounts and survives logout/login.
   ========================================================= */

function getStagingFiles() {
  const user = getUserRecord();
  if (!user) return [];
  return user.files.filter(f => f.status === "staging");
}

function getLibraryFiles() {
  const user = getUserRecord();
  if (!user) return {};
  const byFolder = {};
  user.files.forEach(f => {
    if (f.status === "staging") return;
    if (!byFolder[f.status]) byFolder[f.status] = [];
    byFolder[f.status].push(f);
  });
  return byFolder;
}

function getHistory() {
  const user = getUserRecord();
  return user ? user.history.slice().reverse() : [];
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — localStorage has limited headroom

async function handleUpload(fileList) {
  if (requireAuthRedirect()) return;

  const incoming = Array.from(fileList);
  if (incoming.length === 0) return;

  const tooLarge = incoming.filter(f => f.size > MAX_FILE_BYTES);
  const accepted = incoming.filter(f => f.size <= MAX_FILE_BYTES);

  for (const file of accepted) {
    try {
      const data = await readFileAsDataURL(file);
      mutateUserRecord(user => {
        user.files.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          data,
          status: "staging",
          uploadedAt: Date.now(),
        });
      });
    } catch (err) {
      console.error("LUMORA: failed to read file", file.name, err);
      showToast(`Couldn't read "${file.name}".`, true);
    }
  }

  if (tooLarge.length) {
    showToast(`${tooLarge.length} file(s) skipped — over the 5MB limit.`, true);
  } else if (accepted.length) {
    showToast(`${accepted.length} file${accepted.length > 1 ? "s" : ""} staged.`);
  }

  renderStaging();
}

function deleteStaged(id) {
  mutateUserRecord(user => {
    user.files = user.files.filter(f => f.id !== id);
  });
  renderStaging();
  showToast("Removed from staging.");
}

/* ---------- commit modal ---------- */
let selectedFileId = null;

function commitFile(id) {
  selectedFileId = id;
  const modal = document.getElementById("commitModal");
  if (modal) modal.style.display = "flex";
}

function confirmCommit(folder) {
  if (!selectedFileId) return;
  let fileName = "";

  mutateUserRecord(user => {
    const file = user.files.find(f => f.id === selectedFileId);
    if (!file) return;
    fileName = file.name;
    file.status = folder;
    file.committedAt = Date.now();
    user.history.push({
      file: fileName,
      folder,
      time: new Date().toLocaleString(),
    });
  });

  selectedFileId = null;
  closeModal("commitModal");
  renderStaging();
  renderLibrary();
  if (fileName) showToast(`Committed "${fileName}" to ${FOLDERS[folder]?.label || folder}.`);
}

/* ---------- move modal (replaces window.prompt) ---------- */
let moveFileId = null;

function moveFile(id) {
  moveFileId = id;
  const modal = document.getElementById("moveModal");
  if (modal) modal.style.display = "flex";
}

function confirmMove(folder) {
  if (!moveFileId) return;
  let fileName = "";

  mutateUserRecord(user => {
    const file = user.files.find(f => f.id === moveFileId);
    if (!file || file.status === folder) return;
    fileName = file.name;
    file.status = folder;
    user.history.push({
      file: fileName,
      folder,
      time: new Date().toLocaleString(),
    });
  });

  moveFileId = null;
  closeModal("moveModal");
  renderLibrary();
  if (fileName) showToast(`Moved "${fileName}" to ${FOLDERS[folder]?.label || folder}.`);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

function deleteFile(id) {
  let fileName = "";
  mutateUserRecord(user => {
    const file = user.files.find(f => f.id === id);
    if (file) fileName = file.name;
    user.files = user.files.filter(f => f.id !== id);
  });
  renderLibrary();
  if (fileName) showToast(`Deleted "${fileName}".`);
}

function downloadFile(id) {
  const user = getUserRecord();
  const file = user?.files.find(f => f.id === id);
  if (!file) return;
  const a = document.createElement("a");
  a.href = file.data;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function viewFile(id) {
  const user = getUserRecord();
  const file = user?.files.find(f => f.id === id);
  if (!file) return;

  const win = window.open();
  if (!win) {
    showToast("Allow pop-ups to preview this file.", true);
    return;
  }
  win.document.title = file.name;
  win.document.body.style.margin = "0";

  const isImage = file.type.startsWith("image/");
  const isPDF = file.type === "application/pdf";

  if (isImage) {
    const img = win.document.createElement("img");
    img.src = file.data;
    img.style.maxWidth = "100%";
    img.style.display = "block";
    img.style.margin = "0 auto";
    win.document.body.appendChild(img);
  } else if (isPDF) {
    const iframe = win.document.createElement("iframe");
    iframe.src = file.data;
    iframe.style.width = "100vw";
    iframe.style.height = "100vh";
    iframe.style.border = "none";
    win.document.body.appendChild(iframe);
  } else {
    win.document.body.style.fontFamily = "sans-serif";
    win.document.body.style.padding = "40px";
    const msg = win.document.createElement("p");
    msg.textContent = `Preview isn't available for this file type (${file.type || "unknown"}). Use download instead.`;
    win.document.body.appendChild(msg);
  }
}

function canPreview(type) {
  return type.startsWith("image/") || type === "application/pdf";
}

/* =========================================================
   RENDERING
   ========================================================= */

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderStaging() {
  const box = document.getElementById("staging");
  if (!box) return;

  if (!getCurrentUser()) {
    box.innerHTML = `<div class="empty-state">${icon("empty")}<p>Sign in to stage files.</p></div>`;
    return;
  }

  const staging = getStagingFiles();

  if (staging.length === 0) {
    box.innerHTML = `<div class="empty-state">${icon("empty")}<p>Nothing staged yet — drop a file above to get started.</p></div>`;
    return;
  }

  box.innerHTML = staging.map(file => `
    <div class="file-item">
      <div class="file-meta">
        ${icon("file")}
        <span class="file-name">${escapeHTML(file.name)}</span>
        <span class="file-size">${formatSize(file.size)}</span>
      </div>
      <div class="file-actions">
        <button class="btn ghost" onclick="commitFile('${file.id}')">${icon("commit")} Commit</button>
        <button class="icon-btn danger" title="Discard" onclick="deleteStaged('${file.id}')">${icon("trash")}</button>
      </div>
    </div>
  `).join("");
}

function renderLibrary() {
  const box = document.getElementById("library");
  if (!box) return;

  if (!getCurrentUser()) {
    box.innerHTML = `<div class="empty-state">${icon("empty")}<p>Sign in to see your library.</p></div>`;
    return;
  }

  const library = getLibraryFiles();
  const history = getHistory();
  const folderKeys = Object.keys(FOLDERS).filter(k => library[k]?.length);
  Object.keys(library).forEach(k => { if (!folderKeys.includes(k)) folderKeys.push(k); });

  let html = "";

  if (folderKeys.length === 0) {
    html += `
      <div class="folder">
        <div class="empty-state">
          ${icon("empty")}
          <p>Your library is empty. Commit a staged file to start organizing.</p>
        </div>
      </div>
    `;
  }

  folderKeys.forEach(key => {
    const meta = FOLDERS[key] || { label: key, icon: "folder" };
    const files = library[key] || [];

    html += `
      <div class="folder">
        <div class="folder-head">
          ${icon(meta.icon)}
          <h3>${escapeHTML(meta.label)}</h3>
          <span class="count">${files.length} file${files.length === 1 ? "" : "s"}</span>
        </div>
        ${files.map(file => `
          <div class="file-item">
            <div class="file-meta">
              ${icon("file")}
              <span class="file-name">${escapeHTML(file.name)}</span>
              <span class="file-size">${formatSize(file.size)}</span>
            </div>
            <div class="file-actions">
              <button class="icon-btn" title="${canPreview(file.type) ? "Preview" : "Preview unavailable"}" ${canPreview(file.type) ? "" : "disabled"} onclick="viewFile('${file.id}')">${icon("eye")}</button>
              <button class="icon-btn" title="Download" onclick="downloadFile('${file.id}')">${icon("download")}</button>
              <button class="icon-btn" title="Move" onclick="moveFile('${file.id}')">${icon("move")}</button>
              <button class="icon-btn danger" title="Delete" onclick="deleteFile('${file.id}')">${icon("trash")}</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  });

  html += `
    <div class="folder">
      <div class="folder-head">
        ${icon("log")}
        <h3>Commit History</h3>
        <span class="count">${history.length} entr${history.length === 1 ? "y" : "ies"}</span>
      </div>
      ${history.length === 0
        ? `<div class="empty-state"><p>No commits yet.</p></div>`
        : history.slice(0, 25).map(h => `
            <div class="history-row">
              <span class="hash">${h.file ? h.file.slice(0, 2).toUpperCase() : "??"}${Math.abs(hashCode(h.file + h.time)).toString(16).slice(0,4)}</span>
              <span class="desc">${escapeHTML(h.file)} &rarr; ${escapeHTML(FOLDERS[h.folder]?.label || h.folder)}</span>
              <span class="time">${escapeHTML(h.time)}</span>
            </div>
          `).join("")
      }
    </div>
  `;

  box.innerHTML = html;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/* =========================================================
   NAV — account pill shows signed-in state on every page
   ========================================================= */
function renderAccountStatus() {
  const slot = document.getElementById("navAccount");
  if (!slot) return;

  const email = getCurrentUser();

  if (!email) {
    slot.innerHTML = `<a class="btn ghost" href="login.html">${icon("user")} Sign in</a>`;
    return;
  }

  slot.innerHTML = `
    <span class="pill">${icon("user")} ${escapeHTML(email)}</span>
    <button onclick="logout()">${icon("logout")} Log out</button>
  `;
}

/* =========================================================
   UPLOAD SETUP (drag + drop + click)
   ========================================================= */
function setupUpload() {
  const input = document.getElementById("fileInput");
  const drop = document.getElementById("dropZone");

  if (!input || !drop) return;

  input.addEventListener("change", e => {
    handleUpload(e.target.files);
    input.value = "";
  });

  drop.addEventListener("dragover", e => {
    e.preventDefault();
    drop.classList.add("active");
  });

  drop.addEventListener("dragleave", () => {
    drop.classList.remove("active");
  });

  drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("active");
    handleUpload(e.dataTransfer.files);
  });
}

/* =========================================================
   SHARE LINKS
   ========================================================= */
function generateShareLink(fileId) {
  return `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}library.html#file=${fileId}`;
}

function openSharedFile() {
  const hash = window.location.hash;
  if (!hash.includes("file=")) return;

  const id = hash.split("file=")[1];
  const users = getUsers();

  for (const email in users) {
    const file = users[email].files.find(f => f.id === id);
    if (file) {
      document.body.innerHTML = `
        <div style="padding:24px;font-family:sans-serif;">
          <h2 style="margin-bottom:16px;">${escapeHTML(file.name)}</h2>
          ${canPreview(file.type)
            ? `<iframe src="${file.data}" style="width:100%;height:85vh;border:1px solid #ddd;border-radius:8px;"></iframe>`
            : `<p>Preview isn't available for this file type.</p>`}
        </div>
      `;
      return;
    }
  }
}

/* =========================================================
   "ASK OLIVER" — tiny rule-based helper stub
   ========================================================= */
function askAI(input) {
  input = (input || "").toLowerCase();

  if (input.includes("summarize")) {
    return "This file contains structured content from your uploaded documents.";
  }
  if (input.includes("organize")) {
    return "I'd sort these into Notes, AI Research, or Business Plan based on their content.";
  }
  if (input.includes("what")) {
    return "This looks like user-uploaded educational or work material.";
  }
  return "I'm not fully sure — but I can help you organize or review your files.";
}

/* =========================================================
   INIT — single entry point, runs once per page
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  injectIcons();
  renderAccountStatus();
  setupUpload();
  renderStaging();
  renderLibrary();
  openSharedFile();
});
