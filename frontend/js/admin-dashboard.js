// =========================================================
// Admin Dashboard — overview stats + recent orders
// =========================================================

async function initAdminDashboard() {
  const admin = await requireAdmin(`login.html?returnTo=${encodeURIComponent("admin-dashboard.html")}`);
  if (!admin) return;
  wireAdminSidebar("dashboard");

  try {
    const stats = await apiFetch("/admin/dashboard");
    document.getElementById("stat-products").textContent = stats.product_count;
    document.getElementById("stat-orders").textContent = stats.order_count;
    document.getElementById("stat-pending").textContent = stats.pending_order_count;
    document.getElementById("stat-customers").textContent = stats.customer_count;
    document.getElementById("stat-revenue").textContent = formatPKR(stats.revenue);
  } catch (err) {
    console.error(err);
  }

  loadRecentOrders();
}

async function loadRecentOrders() {
  const box = document.getElementById("recent-orders");
  try {
    const orders = (await apiFetch("/admin/orders")).slice(0, 6);
    if (!orders.length) {
      box.innerHTML = `<div class="empty-state">No orders yet.</div>`;
      return;
    }
    box.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>${orders.map(o => `
        <tr>
          <td class="cell-name"><a href="admin-orders.html?order=${o.id}">#${o.id.slice(0, 8).toUpperCase()}</a></td>
          <td>${escapeHtml(o.shipping_full_name)}</td>
          <td>${new Date(o.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}</td>
          <td><span class="status-pill status-${o.status}">${o.status}</span></td>
          <td>${formatPKR(o.subtotal)}</td>
        </tr>`).join("")}</tbody></table></div>`;
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="empty-state">Couldn't load recent orders.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", initAdminDashboard);
