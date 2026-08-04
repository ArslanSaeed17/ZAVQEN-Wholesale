// =========================================================
// Admin · Orders — list, filter by status, view detail, update status
// Status updates require admin (require_admin dependency backend-side).
// =========================================================

let aoOrders = [];
let aoActiveStatus = "";

async function initAdminOrders() {
  const admin = await requireAdmin(`login.html?returnTo=${encodeURIComponent("admin-orders.html")}`);
  if (!admin) return;
  wireAdminSidebar("orders");

  document.querySelectorAll("#status-tabs .admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#status-tabs .admin-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      aoActiveStatus = tab.dataset.status;
      renderOrders();
    });
  });

  document.getElementById("order-modal-close").addEventListener("click", () => closeModal("order-modal"));

  await loadOrders();

  const deepLinkId = new URLSearchParams(window.location.search).get("order");
  if (deepLinkId) openOrderModal(deepLinkId);
}

async function loadOrders() {
  try {
    aoOrders = await apiFetch("/admin/orders");
  } catch (err) {
    console.error(err);
    aoOrders = [];
  }
  renderOrders();
}

function renderOrders() {
  const tbody = document.getElementById("orders-tbody");
  const rows = aoOrders.filter(o => !aoActiveStatus || o.status === aoActiveStatus);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No orders in this status.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(o => `
    <tr>
      <td class="cell-name">#${o.id.slice(0, 8).toUpperCase()}</td>
      <td>${escapeHtml(o.shipping_full_name)}</td>
      <td>${new Date(o.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}</td>
      <td>${o.payment_method === "cod" ? "COD" : "Bank Transfer"}</td>
      <td>${formatPKR(o.subtotal)}</td>
      <td>
        <select class="status-select" data-id="${o.id}">
          ${["pending", "processing", "shipped", "delivered", "cancelled"].map(s =>
            `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td class="table-actions"><button class="icon-btn" data-view="${o.id}" title="View">👁</button></td>
    </tr>`).join("");

  tbody.querySelectorAll(".status-select").forEach(sel =>
    sel.addEventListener("change", () => updateOrderStatus(sel.dataset.id, sel.value))
  );
  tbody.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => openOrderModal(b.dataset.view)));
}

async function updateOrderStatus(id, status) {
  try {
    await apiFetch(`/admin/orders/${id}/status`, { method: "PUT", body: { status } });
    const o = aoOrders.find(x => x.id === id);
    if (o) o.status = status;
  } catch (err) {
    console.error(err);
    alert("Couldn't update status.");
  }
}

function openOrderModal(id) {
  const o = aoOrders.find(x => x.id === id);
  const body = document.getElementById("order-modal-body");
  if (!o) { body.innerHTML = `<div class="empty-state">Order not found.</div>`; openModal("order-modal"); return; }

  document.getElementById("order-modal-title").textContent = `Order #${o.id.slice(0, 8).toUpperCase()}`;
  body.innerHTML = `
    <div class="checkout-block" style="margin-bottom:14px">
      <h3>Shipping</h3>
      <p class="pd-note" style="margin:0">
        ${escapeHtml(o.shipping_full_name)} · ${escapeHtml(o.shipping_phone)}<br>
        ${escapeHtml(o.shipping_address_line1)}${o.shipping_address_line2 ? ", " + escapeHtml(o.shipping_address_line2) : ""}, ${escapeHtml(o.shipping_city)}${o.shipping_state ? ", " + escapeHtml(o.shipping_state) : ""} ${escapeHtml(o.shipping_postal_code || "")}<br>
        ${escapeHtml(o.shipping_country)} · Payment: ${o.payment_method === "cod" ? "Cash on Delivery" : "Bank Transfer"}
      </p>
    </div>
    <div class="checkout-block">
      <h3>Items</h3>
      ${o.items.map(i => `
        <div class="summary-row"><span>${escapeHtml(i.product_name)} × ${i.quantity}</span><span>${formatPKR(i.line_total)}</span></div>
      `).join("")}
      <div class="summary-row summary-total"><span>Subtotal</span><span>${formatPKR(o.subtotal)}</span></div>
    </div>`;
  openModal("order-modal");
}

document.addEventListener("DOMContentLoaded", initAdminOrders);
