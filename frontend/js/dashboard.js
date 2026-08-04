// =========================================================
// Customer Dashboard — Orders / Addresses / Profile
// =========================================================

let dashUser = null;

async function initDashboard() {
  dashUser = await requireAuth(`login.html?returnTo=${encodeURIComponent("dashboard.html")}`);
  if (!dashUser) return;

  wireTabs();
  await Promise.all([loadOrders(), loadAddresses(), loadProfile()]);
  wireAddressForm();
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

  box.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <b>Order #${o.id.slice(0,8).toUpperCase()}</b>
          <span class="pd-note" style="margin:0 0 0 8px">${new Date(o.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}</span>
        </div>
        <span class="status-pill status-${o.status}">${o.status}</span>
      </div>
      <div class="order-items-preview">
        ${o.items.map(i => `<span>${escapeHtml(i.product_name)} × ${i.quantity}</span>`).join(" · ")}
      </div>
      <div class="order-card-foot">
        <span>${o.items.length} item${o.items.length === 1 ? "" : "s"}</span>
        <b>${formatPKR(o.subtotal)}</b>
      </div>
    </div>`).join("");
}

// ---------- addresses ----------
async function loadAddresses() {
  const box = document.getElementById("addresses-list");
  let data;
  try {
    data = await apiFetch("/addresses");
  } catch (err) {
    console.error(err);
    return;
  }

  box.innerHTML = data.length
    ? data.map(a => `
      <div class="order-card" data-id="${a.id}">
        <div class="order-card-head">
          <b>${escapeHtml(a.label)}${a.is_default ? " · Default" : ""}</b>
          <button class="btn btn-outline btn-sm addr-delete" data-id="${a.id}">Delete</button>
        </div>
        <p class="pd-note" style="margin-top:8px">
          ${escapeHtml(a.full_name)} · ${escapeHtml(a.phone)}<br>
          ${escapeHtml(a.line1)}${a.line2 ? ", " + escapeHtml(a.line2) : ""}, ${escapeHtml(a.city)}${a.state ? ", " + escapeHtml(a.state) : ""} ${escapeHtml(a.postal_code || "")}
        </p>
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
}

function wireAddressForm() {
  document.getElementById("address-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("address-msg");
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
      is_default: false,
    };
    if (!payload.full_name || !payload.phone || !payload.line1 || !payload.city) {
      msg.textContent = "Fill in the required fields.";
      msg.className = "form-msg error";
      msg.style.display = "block";
      return;
    }
    try {
      await apiFetch("/addresses", { method: "POST", body: payload });
      msg.style.display = "none";
      e.target.reset();
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
