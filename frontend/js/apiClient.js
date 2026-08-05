// =========================================================
// API client — shared singleton, replaces supabaseClient.js.
// Talks to the FastAPI backend over plain fetch(), auth token
// kept in localStorage and sent as an Authorization: Bearer header.
// =========================================================

// EDIT THIS before deploying — your Railway backend's public URL.
// No trailing slash (e.g. "https://your-backend.up.railway.app", not ".../").
const API_BASE_URL_RAW = "https://web-production-e0f23.up.railway.app";
const API_BASE_URL = API_BASE_URL_RAW.replace(/\/+$/, ""); // strip any trailing slash regardless

const TOKEN_KEY = "zavqen_token";

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// core request helper — every API call in the app goes through this.
async function apiFetch(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
  });

  if (res.status === 204) return null;

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

// ---------- current user / auth state ----------
let _cachedUser = null;
let _userFetched = false;

async function getCurrentUser() {
  if (!getToken()) return null;
  if (_userFetched) return _cachedUser;
  try {
    _cachedUser = await apiFetch("/auth/me");
  } catch {
    clearToken();
    _cachedUser = null;
  }
  _userFetched = true;
  return _cachedUser;
}

// kept for compatibility with pages that called getCurrentProfile() under Supabase —
// under the new API, "user" and "profile" are the same object.
async function getCurrentProfile() {
  return getCurrentUser();
}

function invalidateUserCache() {
  _cachedUser = null;
  _userFetched = false;
}

async function logout() {
  clearToken();
  invalidateUserCache();
  window.location.href = "index.html";
}

async function requireAuth(redirectTo = "login.html") {
  const user = await getCurrentUser();
  if (!user) { window.location.href = redirectTo; return null; }
  return user;
}

async function requireAdmin(redirectTo = "index.html") {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") { window.location.href = redirectTo; return null; }
  return user;
}

// ---------- formatting / validation helpers (unchanged, pure JS) ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatPKR(amount) {
  return "Rs " + Number(amount).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function stockPill(stock) {
  if (stock <= 0) return `<span class="stock-pill out">Out of stock</span>`;
  if (stock <= 20) return `<span class="stock-pill low">Low stock — ${stock} left</span>`;
  return `<span class="stock-pill in">In stock</span>`;
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" isn't a supported image type (use JPG, PNG, WEBP, or GIF).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" is larger than 5MB.`;
  }
  return null;
}

// uploads a validated image file to the admin upload endpoint, returns its public URL
async function uploadImage(file, folder = "products") {
  const err = validateImageFile(file);
  if (err) throw new Error(err);
  const form = new FormData();
  form.append("file", file);
  const data = await apiFetch(`/admin/upload?folder=${folder}`, { method: "POST", body: form, isForm: true });
  return data.url;
}

// ---------- site settings ----------
let _settingsCache = null;
async function getAllSiteSettings() {
  if (_settingsCache) return _settingsCache;
  try {
    _settingsCache = await apiFetch("/settings");
  } catch (e) {
    console.error("settings fetch error", e);
    return {};
  }
  return _settingsCache;
}
async function getSiteSetting(key, fallback = "") {
  const all = await getAllSiteSettings();
  return all[key] ?? fallback;
}

async function hydrateSiteSettingsUI() {
  const hasTargets = document.querySelector("[data-whatsapp-link],[data-contact-email],[data-contact-phone],[data-contact-address]");
  if (!hasTargets) return;
  const s = await getAllSiteSettings();

  document.querySelectorAll("[data-whatsapp-link]").forEach(el => {
    const num = (s.whatsapp_number || "").replace(/[^0-9]/g, "");
    if (num) { el.href = `https://wa.me/${num}`; el.style.display = ""; }
    else { el.style.display = "none"; }
  });
  document.querySelectorAll("[data-contact-email]").forEach(el => {
    if (s.contact_email) { el.textContent = s.contact_email; el.href = `mailto:${s.contact_email}`; }
  });
  document.querySelectorAll("[data-contact-phone]").forEach(el => {
    if (s.contact_phone) { el.textContent = s.contact_phone; el.href = `tel:${s.contact_phone.replace(/[^0-9+]/g, "")}`; }
  });
  document.querySelectorAll("[data-contact-address]").forEach(el => {
    if (s.contact_address) el.textContent = s.contact_address;
  });
}
document.addEventListener("DOMContentLoaded", hydrateSiteSettingsUI);
