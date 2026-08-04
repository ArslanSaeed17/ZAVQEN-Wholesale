// =========================================================
// Single product page
// =========================================================

function relatedCardHtml(p) {
  const img = p.images && p.images[0] ? p.images[0] : "";
  return `
    <a class="product-card" href="product.html?slug=${encodeURIComponent(p.slug)}">
      <div class="p-img-wrap">
        ${img ? `<img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<div class="skeleton" style="width:100%;height:100%"></div>`}
        <span class="swatch-tag">MOQ ${p.moq}</span>
      </div>
      <div class="p-body">
        <div class="p-name">${escapeHtml(p.name)}</div>
        <div class="p-price-row"><span class="p-price">${formatPKR(p.price)}</span></div>
        ${stockPill(p.stock)}
      </div>
    </a>`;
}

async function loadProduct() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const wrap = document.getElementById("product-wrap");
  if (!slug) {
    wrap.innerHTML = `<div class="empty-state">Product not found.</div>`;
    return;
  }

  let p;
  try {
    p = await apiFetch(`/products/${encodeURIComponent(slug)}`);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state">This product is unavailable.</div>`;
    return;
  }

  document.title = `${p.name} — ZAVQEN Wholesale`;
  const images = p.images && p.images.length ? p.images : [""];

  wrap.innerHTML = `
    <div class="pd-gallery">
      <div class="pd-main-img">${images[0] ? `<img id="pd-main-img" src="${images[0]}" alt="${escapeHtml(p.name)}">` : `<div class="skeleton" style="width:100%;height:100%"></div>`}</div>
      ${images.length > 1 ? `<div class="pd-thumbs">${images.map(img => `<img src="${img}" class="pd-thumb" data-src="${img}">`).join("")}</div>` : ""}
    </div>
    <div class="pd-info">
      <span class="eyebrow">SKU ${escapeHtml(p.sku || "—")}</span>
      <h1 style="font-size:28px;margin:8px 0 12px">${escapeHtml(p.name)}</h1>
      <div class="p-price" style="font-size:22px">${formatPKR(p.price)}<span style="color:var(--ink-faint);font-size:13px;font-weight:400"> / unit</span></div>
      ${stockPill(p.stock)}
      <div class="pd-meta">
        <div><span class="eyebrow">MOQ</span><b>${p.moq} units</b></div>
        <div><span class="eyebrow">Stock</span><b>${p.stock} available</b></div>
      </div>
      <p class="pd-desc">${escapeHtml(p.description || "No description provided.")}</p>
      <div class="pd-qty-row">
        <label for="qty">Quantity</label>
        <input type="number" id="qty" min="${p.moq}" step="1" value="${p.moq}">
      </div>
      <button class="btn btn-primary btn-block" id="add-to-cart-btn" ${p.stock <= 0 ? "disabled" : ""}>
        ${p.stock <= 0 ? "Out of stock" : "Add to Cart"}
      </button>
      <p class="pd-note">Minimum order quantity applies — cart will round up to MOQ automatically.</p>
    </div>`;

  document.querySelectorAll(".pd-thumb").forEach(t =>
    t.addEventListener("click", () => { document.getElementById("pd-main-img").src = t.dataset.src; })
  );

  document.getElementById("add-to-cart-btn")?.addEventListener("click", () => addToCart(p));

  loadRelated(p);
}

async function addToCart(p) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `login.html?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }

  const qtyInput = document.getElementById("qty");
  let qty = parseInt(qtyInput.value, 10);
  if (isNaN(qty) || qty < p.moq) qty = p.moq;
  if (qty > p.stock) qty = p.stock;

  const btn = document.getElementById("add-to-cart-btn");
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Adding…";

  try {
    // repeated "Add to Cart" clicks should top up quantity, not replace it —
    // so check whether this product is already in the cart first.
    const cart = await apiFetch("/cart");
    const existing = cart.find(c => c.product_id === p.id);
    const totalQty = existing ? Math.min(existing.quantity + qty, p.stock) : qty;
    await apiFetch("/cart", { method: "POST", body: { product_id: p.id, quantity: totalQty } });

    refreshCartBadge();
    btn.textContent = "Added ✓";
  } catch (err) {
    console.error(err);
    alert(err.message || "Couldn't add to cart. Please try again.");
    btn.textContent = originalText;
  }

  btn.disabled = false;
  setTimeout(() => { btn.textContent = originalText; }, 1200);
}

async function loadRelated(p) {
  const grid = document.getElementById("related-grid");
  if (!grid) return;
  try {
    const data = await apiFetch(`/products/${encodeURIComponent(p.slug)}/related`);
    grid.innerHTML = data.length
      ? data.map(relatedCardHtml).join("")
      : `<div class="empty-state">No related products yet.</div>`;
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", loadProduct);
