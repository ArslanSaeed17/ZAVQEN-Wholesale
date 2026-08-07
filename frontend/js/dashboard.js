// =========================================================
// Customer Dashboard — Orders / Addresses / Profile
// =========================================================

let dashUser = null;
let dashAddresses = [];

async function initDashboard() {
  dashUser = await requireAuth(`login.html?returnTo=${encodeURIComponent("dashboard.html")}`);
  if (!dashUser) return;

  wireTabs();
  await Promise.all([loadOrders(), loadAddresses(), loadProfile()]);
  wireAddressForm();
  wireAddressToggle();
  wireProfileForm();
}

// ---------- tabs ----------
function wireTabs() {
  document.querySelectorAll(".dash-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".dash-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".dash-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });
}

// ---------- orders ----------
const ICON_BOX = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`;
const ICON_SPARKLE = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>`;
const ICON_CALENDAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
const ICON_USER_SM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`;
const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`;

async function loadOrders() {
  const box = document.getElementById("orders-list");
  let orders;
  try {
    orders = await apiFetch("/orders");
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="empty-state">Couldn't load orders.</div>`;
    return;
  }

  if (!orders.length) {
    box.innerHTML = `<div class="empty-state">No orders yet. <a href="products.html" style="color:var(--brass)">Start shopping →</a></div>`;
    return;
  }

  box.innerHTML = orders.map(o => {
    const itemCount = o.items.length;
    const itemsPreview = o.items.map(i => `${escapeHtml(i.product_name)} × ${i.quantity}`).join(" · ");
    const dateStr = new Date(o.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
    return `
    <div class="acct-order-card">
      <div class="acct-order-icon">${ICON_BOX}</div>
      <div class="acct-order-main">
        <div class="acct-order-top">
          <div class="acct-order-title"><span class="acct-order-sparkle">${ICON_SPARKLE}</span>Order #${o.id.slice(0,8).toUpperCase()}</div>
          <span class="status-pill status-${o.status} acct-status-pill">${o.status}</span>
        </div>
        <div class="acct-order-date">${ICON_CALENDAR}${dateStr}</div>
        <div class="acct-order-items">${ICON_USER_SM}<span>${itemsPreview}</span></div>
        <div class="acct-order-bottom">
          <span class="acct-item-badge">${ICON_BOX}${itemCount} item${itemCount === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div class="acct-order-side">
        <div class="acct-order-total"><span>Total Amount</span><b>${formatPKR(o.subtotal)}</b></div>
        <span class="acct-order-chevron">${ICON_CHEVRON}</span>
      </div>
    </div>`;
  }).join("");
}

// ---------- addresses ----------
const ICON_PIN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13z"/><circle cx="12" cy="9" r="2.6"/></svg>`;
const ICON_PENCIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

async function loadAddresses() {
  const box = document.getElementById("addresses-list");
  let data;
  try {
    data = await apiFetch("/addresses");
  } catch (err) {
    console.error(err);
    return;
  }

  dashAddresses = data;

  box.innerHTML = data.length
    ? data.map(a => `
      <div class="acct-address-card" data-id="${a.id}">
        <div class="acct-address-card-head">
          <span class="acct-address-icon">${ICON_PIN}</span>
          ${a.is_default ? '<span class="acct-badge-default">Default</span>' : ""}
        </div>
        <h4 class="acct-address-label">${escapeHtml(a.label)}</h4>
        <p class="acct-address-text">
          ${escapeHtml(a.line1)}${a.line2 ? ", " + escapeHtml(a.line2) : ""}<br>
          ${escapeHtml(a.city)}${a.state ? ", " + escapeHtml(a.state) : ""} ${escapeHtml(a.postal_code || "")}
        </p>
        <div class="acct-address-actions">
          <button type="button" class="btn btn-outline btn-sm addr-edit" data-id="${a.id}">${ICON_PENCIL}Edit</button>
          <button type="button" class="btn btn-outline btn-sm acct-btn-danger addr-delete" data-id="${a.id}">${ICON_TRASH}Delete</button>
        </div>
      </div>`).join("")
    : `<div class="empty-state">No saved addresses yet.</div>`;

  box.querySelectorAll(".addr-delete").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this address?")) return;
      try { await apiFetch(`/addresses/${btn.dataset.id}`, { method: "DELETE" }); }
      catch (err) { console.error(err); }
      loadAddresses();
    })
  );

  box.querySelectorAll(".addr-edit").forEach(btn =>
    btn.addEventListener("click", () => openAddressForm(btn.dataset.id))
  );
}

// ---------- add / edit address form ----------
function openAddressForm(editId) {
  const card = document.getElementById("address-form-card");
  const title = document.getElementById("address-form-title");
  const submitBtn = document.getElementById("address-submit-btn");
  const toggleBtn = document.getElementById("address-add-toggle");
  const form = document.getElementById("address-form");

  if (editId) {
    const addr = dashAddresses.find(a => a.id === editId);
    if (!addr) return;
    document.getElementById("addr_edit_id").value = addr.id;
    document.getElementById("addr_label").value = addr.label || "";
    document.getElementById("addr_full_name").value = addr.full_name || "";
    document.getElementById("addr_phone").value = addr.phone || "";
    document.getElementById("addr_line1").value = addr.line1 || "";
    document.getElementById("addr_line2").value = addr.line2 || "";
    document.getElementById("addr_city").value = addr.city || "";
    document.getElementById("addr_state").value = addr.state || "";
    document.getElementById("addr_postal").value = addr.postal_code || "";
    document.getElementById("addr_country").value = addr.country || "Pakistan";
    title.textContent = "Edit Address";
    submitBtn.textContent = "Update Address";
  } else {
    form.reset();
    document.getElementById("addr_edit_id").value = "";
    document.getElementById("addr_country").value = "Pakistan";
    title.textContent = "Add New Address";
    submitBtn.textContent = "Save Address";
  }

  document.getElementById("address-msg").style.display = "none";
  card.hidden = false;
  toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>Close`;
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeAddressForm() {
  const card = document.getElementById("address-form-card");
  const toggleBtn = document.getElementById("address-add-toggle");
  card.hidden = true;
  document.getElementById("address-form").reset();
  document.getElementById("addr_edit_id").value = "";
  toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Add New Address`;
}

function wireAddressToggle() {
  document.getElementById("address-add-toggle").addEventListener("click", () => {
    const card = document.getElementById("address-form-card");
    if (card.hidden) openAddressForm(null);
    else closeAddressForm();
  });
  document.getElementById("address-cancel-btn").addEventListener("click", closeAddressForm);
}

function wireAddressForm() {
  document.getElementById("address-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("address-msg");
    const editId = document.getElementById("addr_edit_id").value;
    const payload = {
      label: document.getElementById("addr_label").value.trim() || "Shipping",
      full_name: document.getElementById("addr_full_name").value.trim(),
      phone: document.getElementById("addr_phone").value.trim(),
      line1: document.getElementById("addr_line1").value.trim(),
      line2: document.getElementById("addr_line2").value.trim(),
      city: document.getElementById("addr_city").value.trim(),
      state: document.getElementById("addr_state").value.trim(),
      postal_code: document.getElementById("addr_postal").value.trim(),
      country: document.getElementById("addr_country").value.trim() || "Pakistan",
      is_default: editId ? (dashAddresses.find(a => a.id === editId)?.is_default || false) : false,
    };
    if (!payload.full_name || !payload.phone || !payload.line1 || !payload.city) {
      msg.textContent = "Fill in the required fields.";
      msg.className = "form-msg error";
      msg.style.display = "block";
      return;
    }
    try {
      if (editId) {
        await apiFetch(`/addresses/${editId}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/addresses", { method: "POST", body: payload });
      }
      msg.style.display = "none";
      closeAddressForm();
      loadAddresses();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-msg error";
      msg.style.display = "block";
    }
  });
}

// ---------- profile ----------
async function loadProfile() {
  document.getElementById("profile_email").value = dashUser.email;
  document.getElementById("profile_full_name").value = dashUser.full_name || "";
  document.getElementById("profile_phone").value = dashUser.phone || "";

  const name = dashUser.full_name || "";
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  document.getElementById("profile-avatar").textContent = initials;
  document.getElementById("profile-name-display").textContent = name || dashUser.email;
  document.getElementById("profile-member-since").textContent = dashUser.created_at
    ? new Date(dashUser.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })
    : "—";
}

function wireProfileForm() {
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("profile-msg");
    try {
      await apiFetch("/auth/me", {
        method: "PUT",
        body: {
          full_name: document.getElementById("profile_full_name").value.trim(),
          phone: document.getElementById("profile_phone").value.trim(),
        },
      });
      invalidateUserCache();
      dashUser = await getCurrentUser();
      await loadProfile();
      msg.textContent = "Profile updated.";
      msg.className = "form-msg success";
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-msg error";
    }
    msg.style.display = "block";
  });
}

document.addEventListener("DOMContentLoaded", initDashboard);
