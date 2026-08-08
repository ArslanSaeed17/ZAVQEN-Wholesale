// =========================================================
// Auth: register / login / forgot-password / logout
// Talks to the FastAPI backend. Server-side validation still
// applies on the backend — this is a UX layer only, never trust it alone.
// =========================================================

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = "form-msg " + type;
  el.style.display = "block";
}

function setLoading(btn, isLoading, idleText) {
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Please wait…" : idleText;
}

// ---------- REGISTER ----------
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("form-msg");
    const btn = document.getElementById("register-btn");

    const fullName = document.getElementById("full_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm_password").value;

    if (fullName.length < 2) return showMsg(msg, "Enter your full name.", "error");
    if (!/^\S+@\S+\.\S+$/.test(email)) return showMsg(msg, "Enter a valid email.", "error");
    if (password.length < 8) return showMsg(msg, "Password must be at least 8 characters.", "error");
    if (password !== confirm) return showMsg(msg, "Passwords do not match.", "error");

    setLoading(btn, true, "Create account");
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: { email, password, full_name: fullName, phone: phone || null },
      });
      showMsg(msg, "Account created. Check your email to verify before logging in.", "success");
      registerForm.reset();
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
    setLoading(btn, false, "Create account");
  });
}

// ---------- LOGIN (with basic client-side attempt throttling) ----------
// This is a UX-level speed bump, not real protection — for real rate
// limiting, add a reverse proxy / API gateway limit in front of Railway.
const LOGIN_LOCKOUT_KEY = "zavqen_login_attempts";
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 60 * 1000;

function getLoginAttemptState() {
  try {
    return JSON.parse(sessionStorage.getItem(LOGIN_LOCKOUT_KEY)) || { count: 0, lockedUntil: 0 };
  } catch { return { count: 0, lockedUntil: 0 }; }
}
function setLoginAttemptState(state) {
  sessionStorage.setItem(LOGIN_LOCKOUT_KEY, JSON.stringify(state));
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("form-msg");
    const btn = document.getElementById("login-btn");

    const state = getLoginAttemptState();
    if (state.lockedUntil > Date.now()) {
      const secs = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      return showMsg(msg, `Too many attempts. Try again in ${secs}s.`, "error");
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    setLoading(btn, true, "Log in");
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
      setToken(data.access_token);
      invalidateUserCache();
      setLoginAttemptState({ count: 0, lockedUntil: 0 });

      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      window.location.href = returnTo ? decodeURIComponent(returnTo) : "index.html";
    } catch (err) {
      const next = { count: state.count + 1, lockedUntil: 0 };
      if (next.count >= LOGIN_MAX_ATTEMPTS) {
        next.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
        next.count = 0;
      }
      setLoginAttemptState(next);
      showMsg(msg, err.message, "error");
    }
    setLoading(btn, false, "Log in");
  });
}

// ---------- FORGOT PASSWORD ----------
const forgotForm = document.getElementById("forgot-form");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("form-msg");
    const btn = document.getElementById("forgot-btn");
    const email = document.getElementById("email").value.trim();

    setLoading(btn, true, "Send reset link");
    try {
      await apiFetch("/auth/forgot-password", { method: "POST", body: { email } });
      showMsg(msg, "If that email exists, a reset link has been sent.", "success");
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
    setLoading(btn, false, "Send reset link");
  });
}

// ---------- LOGOUT (any page with a #logout-link) ----------
document.addEventListener("click", (e) => {
  if (e.target.matches("#logout-link")) {
    e.preventDefault();
    logout();
  }
});

// ---------- NAVBAR AUTH STATE ----------
// Swaps "Login / Register" for "My Account / Logout" when a session exists.
async function renderNavAuthSlot() {
  const slot = document.getElementById("nav-auth-slot");
  if (!slot) return;
  const user = await getCurrentUser();
  if (user) {
    const adminLink = user.role === "admin" ? `<a href="admin-dashboard.html">Admin</a>` : "";
    slot.innerHTML = `${adminLink}<a href="dashboard.html">My Account</a><a href="#" id="logout-link">Logout</a>`;
  } else {
    slot.innerHTML = `<a href="login.html">Login</a><a href="register.html">Register</a>`;
  }
}

// ---------- NAVBAR CART BADGE ----------
async function refreshCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  const user = await getCurrentUser();
  if (!user) { badge.textContent = "0"; return; }
  try {
    const items = await apiFetch("/cart");
    badge.textContent = String(items.length);
  } catch (err) {
    console.error(err);
  }
}

// ---------- NAVBAR SEARCH (works from any page) ----------
function wireNavSearch() {
  const form = document.getElementById("nav-search-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("nav-search-input").value.trim();
    window.location.href = "products.html" + (q ? `?q=${encodeURIComponent(q)}` : "");
  });
}

// ---------- Footer credit (runs on every page, since auth.js is loaded everywhere) ----------
function injectFooterCreditStyles() {
  if (document.getElementById("footer-credit-style")) return;
  const style = document.createElement("style");
  style.id = "footer-credit-style";
  style.textContent = `
    @keyframes fc-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fc-glow {
      0%, 100% { color:#E4B57C; text-shadow:0 0 6px rgba(228,181,124,.9),0 0 18px rgba(228,181,124,.55); transform:scale(1); }
      25%      { color:#C17F2E; text-shadow:0 0 6px rgba(193,127,46,.9),0 0 18px rgba(193,127,46,.55); transform:scale(1.1); }
      50%      { color:#4E8672; text-shadow:0 0 6px rgba(78,134,114,.9),0 0 18px rgba(78,134,114,.55); transform:scale(1); }
      75%      { color:#B14330; text-shadow:0 0 6px rgba(177,67,48,.9),0 0 18px rgba(177,67,48,.55); transform:scale(1.1); }
    }
    .footer-credit { display:inline-flex; text-decoration:none; }
    .footer-credit .fc-letter {
      display:inline-block;
      font-weight:700;
      font-size:13px;
      letter-spacing:.02em;
      opacity:0;
      animation: fc-in .3s ease forwards, fc-glow 2.4s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

function renderFooterCredit() {
  const bar = document.querySelector(".footer-bottom");
  if (!bar || bar.querySelector(".footer-credit")) return;

  injectFooterCreditStyles();

  const credit = document.createElement("a");
  credit.className = "footer-credit";
  credit.href = "https://arslansaeed.live";
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";

  const text = "Developed by Arslan Saeed";
  [...text].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "fc-letter";
    span.textContent = ch === " " ? "\u00A0" : ch;
    span.style.animationDelay = `${i * 45}ms, ${i * 70}ms`;
    credit.appendChild(span);
  });

  bar.appendChild(credit);
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavAuthSlot();
  refreshCartBadge();
  wireNavSearch();
  renderFooterCredit();
});
