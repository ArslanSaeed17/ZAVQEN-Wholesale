// =========================================================
// Checkout — requires login. Order creation goes through
// POST /orders/checkout, which re-validates MOQ and stock
// server-side (in one DB transaction) rather than trusting this page.
// =========================================================

let currentUser = null;
let cartRows = [];
let addresses = [];

async function initCheckout() {
  currentUser = await requireAuth(`login.html?returnTo=${encodeURIComponent("checkout.html")}`);
  if (!currentUser) return;

  await Promise.all([loadCartSummary(), loadAddresses()]);
  wireForm();
}

async function loadCartSummary() {
  const box = document.getElementById("checkout-items");
  try {
    cartRows = await apiFetch("/cart");
  } catch (err) {
    console.error(err);
    return;
  }

  if (!cartRows.length) {
    box.innerHTML = `<div class="empty-state">Your cart is empty. <a href="products.html" style="color:var(--brass)">Browse products →</a></div>`;
    document.getElementById("place-order-btn").disabled = true;
    return;
  }

  const invalid = cartRows.filter(r => !r.product || !r.product.is_active || r.quantity > r.product.stock || r.quantity < r.product.moq);
  if (invalid.length) {
    box.innerHTML = `<div class="form-msg error" style="display:block">Some items in your cart need attention. <a href="cart.html" style="color:inherit;text-decoration:underline">Go back to cart →</a></div>`;
    document.getElementById("place-order-btn").disabled = true;
    return;
  }

  const subtotal = cartRows.reduce((sum, r) => sum + r.product.price * r.quantity, 0);
  box.innerHTML = cartRows.map(r => `
    <div class="summary-row">
      <span>${escapeHtml(r.product.name)} × ${r.quantity}</span>
      <span>${formatPKR(r.product.price * r.quantity)}</span>
    </div>`).join("") + `
    <div class="summary-row summary-total"><span>Subtotal</span><span>${formatPKR(subtotal)}</span></div>`;
}

async function loadAddresses() {
  const box = document.getElementById("address-list");
  try {
    addresses = await apiFetch("/addresses");
  } catch (err) {
    console.error(err);
    return;
  }

  if (!addresses.length) {
    box.innerHTML = `<p class="pd-note" style="margin-bottom:16px">No saved addresses yet — add one below.</p>`;
    document.getElementById("new-address-fields").style.display = "block";
    document.getElementById("save-address-toggle").style.display = "none";
    return;
  }

  box.innerHTML = addresses.map((a, i) => `
    <label class="address-opt">
      <input type="radio" name="address" value="${a.id}" ${i === 0 ? "checked" : ""}>
      <span>
        <b>${escapeHtml(a.full_name)}</b><br>
        ${escapeHtml(a.line1)}${a.line2 ? ", " + escapeHtml(a.line2) : ""}, ${escapeHtml(a.city)}${a.state ? ", " + escapeHtml(a.state) : ""}<br>
        ${escapeHtml(a.phone)}
      </span>
    </label>`).join("") + `
    <label class="address-opt">
      <input type="radio" name="address" value="new">
      <span><b>Use a new address</b></span>
    </label>`;

  document.querySelectorAll('input[name="address"]').forEach(inp =>
    inp.addEventListener("change", () => {
      document.getElementById("new-address-fields").style.display = inp.value === "new" ? "block" : "none";
    })
  );
}

function wireForm() {
  document.getElementById("checkout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("checkout-msg");
    const btn = document.getElementById("place-order-btn");
    msg.style.display = "none";

    const selected = document.querySelector('input[name="address"]:checked');
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;

    if (!paymentMethod) {
      msg.textContent = "Choose a payment method.";
      msg.className = "form-msg error";
      msg.style.display = "block";
      return;
    }

    let payload = { payment_method: paymentMethod };

    if (!selected || selected.value === "new") {
      const shipping = {
        full_name: document.getElementById("na_full_name").value.trim(),
        phone: document.getElementById("na_phone").value.trim(),
        line1: document.getElementById("na_line1").value.trim(),
        line2: document.getElementById("na_line2").value.trim(),
        city: document.getElementById("na_city").value.trim(),
        state: document.getElementById("na_state").value.trim(),
        postal_code: document.getElementById("na_postal").value.trim(),
        country: document.getElementById("na_country").value.trim() || "Pakistan",
      };
      if (!shipping.full_name || !shipping.phone || !shipping.line1 || !shipping.city) {
        msg.textContent = "Fill in the required address fields.";
        msg.className = "form-msg error";
        msg.style.display = "block";
        return;
      }
      payload = { ...payload, ...shipping };

      if (document.getElementById("save-address-checkbox")?.checked) {
        try { await apiFetch("/addresses", { method: "POST", body: { ...shipping, is_default: false } }); }
        catch (err) { console.error(err); }
      }
    } else {
      payload.address_id = selected.value;
    }

    btn.disabled = true;
    btn.textContent = "Placing order…";

    try {
      const order = await apiFetch("/orders/checkout", { method: "POST", body: payload });
      refreshCartBadge();
      window.location.href = `order-success.html?order=${order.id}`;
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Couldn't place order. Please review your cart and try again.";
      msg.className = "form-msg error";
      msg.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Place Order";
    }
  });
}

document.addEventListener("DOMContentLoaded", initCheckout);
