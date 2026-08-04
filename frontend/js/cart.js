// =========================================================
// Cart page — requires login. Quantities are re-validated
// server-side at checkout, this is UX only.
// =========================================================

let cartData = [];

async function loadCart() {
  const user = await requireAuth(`login.html?returnTo=${encodeURIComponent("cart.html")}`);
  if (!user) return;

  const list = document.getElementById("cart-list");
  try {
    cartData = await apiFetch("/cart");
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="empty-state">Couldn't load your cart.</div>`;
    return;
  }

  if (!cartData.length) {
    list.innerHTML = `<div class="empty-state">Your cart is empty. <a href="products.html" style="color:var(--brass)">Browse products →</a></div>`;
    renderSummary([]);
    return;
  }

  list.innerHTML = cartData.map(rowHtml).join("");
  wireRowEvents();
  renderSummary(cartData);
}

function rowHtml(row) {
  const p = row.product;
  const img = p?.images?.[0] || "";
  const unavailable = !p || !p.is_active;
  return `
    <div class="cart-row" data-id="${row.id}" data-product-id="${p?.id || ""}">
      <div class="cart-row-img">${img ? `<img src="${img}" alt="${escapeHtml(p?.name || "")}">` : `<div class="skeleton" style="width:100%;height:100%"></div>`}</div>
      <div class="cart-row-info">
        <a href="product.html?slug=${p?.slug || ""}" class="cart-row-name">${escapeHtml(p?.name || "Unavailable product")}</a>
        ${unavailable ? `<span class="stock-pill out">No longer available</span>` : `
          <span class="cart-row-meta">${formatPKR(p.price)} / unit · MOQ ${p.moq} · ${p.stock} in stock</span>
        `}
      </div>
      ${!unavailable ? `
        <div class="cart-row-qty">
          <button class="qty-btn qty-dec" type="button">−</button>
          <input type="number" class="qty-input" min="${p.moq}" max="${p.stock}" value="${row.quantity}">
          <button class="qty-btn qty-inc" type="button">+</button>
        </div>
        <div class="cart-row-total">${formatPKR(p.price * row.quantity)}</div>
      ` : `<div></div><div></div>`}
      <button class="cart-row-remove" title="Remove">✕</button>
    </div>`;
}

function wireRowEvents() {
  document.querySelectorAll(".cart-row").forEach(rowEl => {
    const rowId = rowEl.dataset.id;
    const row = cartData.find(d => d.id === rowId);
    const removeBtn = rowEl.querySelector(".cart-row-remove");
    removeBtn.addEventListener("click", () => removeItem(rowId));

    const qtyInput = rowEl.querySelector(".qty-input");
    if (!qtyInput || !row?.product) return;
    const p = row.product;

    const commit = async (newQty) => {
      newQty = Math.max(p.moq, Math.min(p.stock, newQty));
      qtyInput.value = newQty;
      await updateQuantity(rowId, newQty);
    };

    rowEl.querySelector(".qty-dec").addEventListener("click", () => commit(parseInt(qtyInput.value, 10) - 1));
    rowEl.querySelector(".qty-inc").addEventListener("click", () => commit(parseInt(qtyInput.value, 10) + 1));
    qtyInput.addEventListener("change", () => commit(parseInt(qtyInput.value, 10) || p.moq));
  });
}

async function updateQuantity(rowId, quantity) {
  try {
    await apiFetch(`/cart/${rowId}`, { method: "PUT", body: { quantity } });
  } catch (err) {
    console.error(err);
    alert(err.message || "Couldn't update quantity.");
  }
  loadCart();
}

async function removeItem(rowId) {
  try {
    await apiFetch(`/cart/${rowId}`, { method: "DELETE" });
  } catch (err) {
    console.error(err);
    alert("Couldn't remove item.");
  }
  refreshCartBadge();
  loadCart();
}

function renderSummary(data) {
  const summary = document.getElementById("cart-summary");
  const validItems = data.filter(d => d.product && d.product.is_active);
  const subtotal = validItems.reduce((sum, d) => sum + d.product.price * d.quantity, 0);
  const hasUnavailable = data.some(d => !d.product || !d.product.is_active);

  summary.innerHTML = `
    <div class="summary-row"><span>Items</span><span>${validItems.length}</span></div>
    <div class="summary-row summary-total"><span>Subtotal</span><span>${formatPKR(subtotal)}</span></div>
    <p class="pd-note">Shipping and taxes are calculated at checkout.</p>
    ${hasUnavailable ? `<p class="form-msg error" style="display:block">Remove unavailable items before checking out.</p>` : ""}
    <a href="checkout.html" class="btn btn-primary btn-block" ${(!validItems.length || hasUnavailable) ? 'style="pointer-events:none;opacity:.5"' : ""}>
      Proceed to Checkout
    </a>`;
}

document.addEventListener("DOMContentLoaded", loadCart);
