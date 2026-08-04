// =========================================================
// Admin · Customers — list with order count / total spend
// Data comes from GET /admin/customers (admin-only, backend computes
// per-customer aggregates — customers can never call this themselves).
// =========================================================

let acsCustomers = [];

async function initAdminCustomers() {
  const admin = await requireAdmin(`login.html?returnTo=${encodeURIComponent("admin-customers.html")}`);
  if (!admin) return;
  wireAdminSidebar("customers");

  await loadCustomers();
  document.getElementById("customer-search").addEventListener("input", (e) => renderCustomers(e.target.value));
}

async function loadCustomers() {
  const tbody = document.getElementById("customers-tbody");
  try {
    acsCustomers = await apiFetch("/admin/customers");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5">Couldn't load customers.</td></tr>`;
    return;
  }
  renderCustomers("");
}

function renderCustomers(filterText) {
  const tbody = document.getElementById("customers-tbody");
  const q = (filterText || "").trim().toLowerCase();
  const rows = acsCustomers.filter(c => !q || (c.full_name || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q));

  document.getElementById("customer-count").textContent = `${rows.length} customer${rows.length === 1 ? "" : "s"}`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No customers found.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(c => `
    <tr>
      <td class="cell-name">${escapeHtml(c.full_name || "—")}</td>
      <td>${escapeHtml(c.phone || "—")}</td>
      <td>${new Date(c.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}</td>
      <td>${c.order_count}</td>
      <td>${formatPKR(c.total_spent)}</td>
    </tr>`).join("");
}

document.addEventListener("DOMContentLoaded", initAdminCustomers);
