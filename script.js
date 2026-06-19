const USERS_KEY = "lumora_users";
const SESSION_KEY = "lumora_session";

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function signup(email, password) {
  let users = getUsers();

  if (users[email]) {
    alert("User already exists");
    return;
  }

  users[email] = {
    password,
    files: [],
    createdAt: Date.now()
  };

  saveUsers(users);
  alert("Account created");
}

function login(email, password) {
  let users = getUsers();

  if (!users[email] || users[email].password !== password) {
    alert("Invalid login");
    return;
  }

  setSession({ email });
  alert("Logged in!");
  window.location.href = "index.html";
}

function getCurrentUser() {
  return getSession()?.email;
}

function getUserData() {
  let users = getUsers();
  let email = getCurrentUser();
  return users[email];
}


function createIcon(svg) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span;
}

const ICONS = {
  upload: `<svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 16V4"/>
    <path d="M8 8l4-4 4 4"/>
    <path d="M4 20h16"/>
  </svg>`,

  folder: `<svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 7h6l2 2h10v10H3z"/>
  </svg>`
};

function injectIcons() {
  const u = document.getElementById("icon-upload");
  const f = document.getElementById("icon-folder");

  if (u) u.appendChild(createIcon(ICONS.upload));
  if (f) f.appendChild(createIcon(ICONS.folder));
}

const STAGING_KEY = "lumora_staging";
const LIBRARY_KEY = "lumora_library";
const HISTORY_KEY = "lumora_history";

/* =========================
STORAGE HELPERS
========================= */
function getStaging() {
  return JSON.parse(localStorage.getItem(STAGING_KEY) || "[]");
}

function getLibrary() {
  return JSON.parse(localStorage.getItem(LIBRARY_KEY) || "{}");
}

function saveStaging(data) {
  localStorage.setItem(STAGING_KEY, JSON.stringify(data));
}

function saveLibrary(data) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(data));
}

/* =========================
DELETE STAGED FILE
========================= */
function deleteStaged(id) {
  let staging = getStaging().filter(f => f.id != id);
  saveStaging(staging);
  renderStaging();
}

/* =========================
RENDER STAGING (UPLOAD PAGE)
========================= */
function renderStaging() {

  console.log("renderStaging running");

  const box = document.getElementById("staging");

  if (!box) {
    console.log("No staging div found");
    return;
  }

  let staging = getStaging();

  console.log(staging);

  box.innerHTML = "";

  staging.forEach(file => {

box.innerHTML = staging.map(file => `
<div class="file-item">

<div>
<b>${file.name}</b>
<br>
<small>
${(file.size/1024).toFixed(1)} KB
</small>
</div>

<div>
<button onclick="commitFile('${file.id}')">
Commit Changes
</button>

<button onclick="deleteStaged('${file.id}')">
Delete
</button>
</div>

</div>
`).join("");

  });

}

function handleUpload(files) {

  let staging = getStaging();

  Array.from(files).forEach(file => {

    staging.push({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type
    });

  });

  saveStaging(staging);

  renderStaging();

}

/* =========================
COMMIT FILE (MOVE TO LIBRARY)
========================= */
let selectedFileId = null;

/* OPEN COMMIT MODAL */
function commitFile(id) {
  selectedFileId = id;
  document.getElementById("commitModal").style.display = "flex";
}

function confirmCommit(folder) {
  let staging = getStaging();
  let library = getLibrary();

  let file = staging.find(f => f.id == selectedFileId);
  if (!file) return;

  if (!library[folder]) library[folder] = [];

  library[folder].push(file);

  staging = staging.filter(f => f.id != selectedFileId);

  saveStaging(staging);
  saveLibrary(library);

  closeModal();
  renderStaging();
  renderLibrary();
}

/* CLOSE MODAL */
function closeModal() {
  let modal = document.getElementById("commitModal");
  if (modal) modal.style.display = "none";
}

/* =========================
RENDER LIBRARY (GITHUB STYLE)
========================= */
function renderLibrary() {
  const box = document.getElementById("library");
  if (!box) return;

  let library = getLibrary();
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

  let html = "";

/* FOLDERS */
  Object.keys(library).forEach(folder => {
    html += `
      <div class="folder">
        <h3>📁 ${folder.toUpperCase()}</h3>

        ${library[folder].map(file => `
          <div class="file-item">
            <span>${file.name}</span>

            <div>
              <button disabled>
Preview unavailable
</button>
              <button onclick="downloadFile('${file.data}','${file.name}')">Download</button>
              <button onclick="moveFile('${file.id}','${folder}')">Move</button>
              <button onclick="deleteFile('${folder}','${file.id}')">Delete</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  });

/* HISTORY */
  html += `
    <div class="folder">
      <h3>🧾 Commit History</h3>
      ${history.map(h => `
        <div class="file-item">
          <span>${h.file} → ${h.folder}</span>
          <small>${h.time}</small>
        </div>
      `).join("")}
    </div>
  `;

  box.innerHTML = html;
}

/* =========================
VIEW FILE
========================= */
function viewFile(data, name) {
  const win = window.open();
  win.document.write(`
    <title>${name}</title>
    <iframe src="${data}" style="width:100%;height:100vh;border:none;"></iframe>
  `);
}

/* =========================
DOWNLOAD FILE
========================= */
function downloadFile(data, name) {
  const a = document.createElement("a");
  a.href = data;
  a.download = name;
  a.click();
}

/* =========================
DELETE FILE FROM LIBRARY
========================= */
function deleteFile(folder, id) {
  let library = getLibrary();

  library[folder] = library[folder].filter(f => f.id != id);

  if (library[folder].length === 0) {
    delete library[folder];
  }

  saveLibrary(library);
  renderLibrary();
}

/* =========================
UPLOAD SETUP (MULTIPLE + DRAG DROP)
========================= */
function setupUpload() {
  console.log("setupUpload running");

  const input = document.getElementById("fileInput");
  const drop = document.getElementById("dropZone");

  console.log(input);
  console.log(drop);

  if (!input || !drop) {
    console.log("input or dropzone missing");
    return;
  }

  input.addEventListener("change", e => {
    console.log("FILE SELECTED");
    handleUpload(e.target.files);
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

    console.log("FILES DROPPED");

    handleUpload(e.dataTransfer.files);
  });
}

/* =========================
INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const upload = document.getElementById("icon-upload");
  const folder = document.getElementById("icon-folder");

  if (upload) upload.innerHTML = ICONS.upload;
  if (folder) folder.innerHTML = ICONS.folder;
});

function moveFile(id, currentFolder) {
  let library = getLibrary();

  let newFolder = prompt("Move to: notes | ai | business");
  if (!newFolder || newFolder === currentFolder) return;

  let fileIndex = library[currentFolder].findIndex(f => f.id == id);
  let file = library[currentFolder][fileIndex];

  library[currentFolder].splice(fileIndex, 1);

  if (!library[newFolder]) library[newFolder] = [];
  library[newFolder].push(file);

  saveLibrary(library);
  renderLibrary();
}

function generateShareLink(fileId) {
  return `${window.location.origin}/library.html#file=${fileId}`;
}

function openSharedFile() {
  const hash = window.location.hash;
  if (!hash.includes("file=")) return;

  const id = hash.split("file=")[1];

  let users = getUsers();

  for (let email in users) {
    let file = users[email].files.find(f => f.id === id);

    if (file) {
      document.body.innerHTML = `
        <h2>${file.name}</h2>
        <iframe src="${file.data}" style="width:100%;height:90vh;"></iframe>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", openSharedFile);


function askAI(input) {
  input = input.toLowerCase();

  if (input.includes("summarize")) {
    return "This file contains structured content that likely belongs to your uploaded documents.";
  }

  if (input.includes("organize")) {
    return "I recommend sorting files into AI Research and Business folders based on keywords.";
  }

  if (input.includes("what")) {
    return "This document appears to be user-uploaded educational or work material.";
  }

  return "I’m not fully sure, but I can help you organize or analyze files.";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("PAGE LOADED");

  setupUpload();

  console.log("UPLOAD SETUP DONE");

  renderStaging();

  console.log("STAGING RENDERED");

  renderLibrary();
});