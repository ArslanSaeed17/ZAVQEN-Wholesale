// =========================================================
// Product listing: search + filters + sort + pagination
// State lives in the URL querystring so listings are shareable/bookmarkable.
// =========================================================

const PAGE_SIZE = 12;

function getState() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q") || "",
    category: params.get("category") || "",
    price: params.get("price") || "",       // "0-1000" | "1000-5000" | "5000+"
    availability: params.get("availability") || "", // "in" | "out"
    sort: params.get("sort") || "newest",
    page: parseInt(params.get("page") || "1", 10),
  };
}

function setState(patch) {
  const state = { ...getState(), ...patch };
  if (!("page" in patch)) state.page = 1; // any filter change resets pagination
  const params = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => { if (v) params.set(k, v); });
  window.location.search = params.toString();
}

function productCardHtml(p) {
  const img = p.images && p.images[0] ? p.images[0] : "";
  const outOfStock = p.stock <= 0;
  return `
    <div class="product-card" data-product-id="${p.id}" data-moq="${p.moq}" data-stock="${p.stock}">
      <a class="p-card-link" href="product.html?slug=${encodeURIComponent(p.slug)}">
        <div class="p-img-wrap">
          ${img ? `<img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<div class="skeleton" style="width:100%;height:100%"></div>`}
          <span class="swatch-tag">MOQ ${p.moq}</span>
        </div>
        <div class="p-body">
          <div class="p-name">${escapeHtml(p.name)}</div>
          <div class="p-price-row"><span class="p-price">${formatPKR(p.price)}</span></div>
          ${stockPill(p.stock)}
        </div>
      </a>
      <div class="p-cta-row">
        <button type="button" class="btn btn-primary btn-sm add-to-cart-grid-btn" ${outOfStock ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          ${outOfStock ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </div>`;
}

// Add-to-cart from the grid: same /cart contract product.js already uses,
// just triggered from a button instead of the product detail page. Uses
// event delegation on #product-grid so it keeps working after every
// re-render (loadProducts() replaces grid.innerHTML on each filter/sort/page change).
function wireGridAddToCart() {
  const grid = document.getElementById("product-grid");
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".add-to-cart-grid-btn");
    if (!btn || btn.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const user = await getCurrentUser();
    if (!user) {
      window.location.href = `login.html?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    const card = btn.closest(".product-card");
    const productId = card.dataset.productId;
    const moq = parseInt(card.dataset.moq, 10) || 1;
    const stock = parseInt(card.dataset.stock, 10) || 0;

    btn.disabled = true;
    const original = btn.innerHTML;
    btn.textContent = "Adding…";

    try {
      // repeated clicks top up quantity rather than replace it, same rule product.js uses
      const cart = await apiFetch("/cart");
      const existing = cart.find(c => c.product_id === productId);
      const qty = existing ? Math.min(existing.quantity + moq, stock) : Math.min(moq, stock);
      await apiFetch("/cart", { method: "POST", body: { product_id: productId, quantity: qty } });
      refreshCartBadge();
      btn.textContent = "Added ✓";
    } catch (err) {
      console.error(err);
      alert(err.message || "Couldn't add to cart. Please try again.");
      btn.innerHTML = original;
      btn.disabled = false;
      return;
    }

    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1200);
  });
}

async function loadCategoryFilters(activeSlug) {
  const box = document.getElementById("filter-category");
  try {
    const cats = await apiFetch("/categories");
    box.innerHTML = cats.map(c => `
      <label class="filter-opt">
        <input type="radio" name="category" value="${c.slug}" ${activeSlug === c.slug ? "checked" : ""}>
        ${escapeHtml(c.name)}
      </label>`).join("") + `
      <label class="filter-opt">
        <input type="radio" name="category" value="" ${activeSlug === "" ? "checked" : ""}>
        All categories
      </label>`;
    box.querySelectorAll("input").forEach(inp =>
      inp.addEventListener("change", () => setState({ category: inp.value }))
    );
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="empty-state">Couldn't load categories.</div>`;
  }
}

function wireStaticFilters(state) {
  document.querySelectorAll('input[name="price"]').forEach(inp => {
    inp.checked = inp.value === state.price;
    inp.addEventListener("change", () => setState({ price: inp.value }));
  });
  document.querySelectorAll('input[name="availability"]').forEach(inp => {
    inp.checked = inp.value === state.availability;
    inp.addEventListener("change", () => setState({ availability: inp.value }));
  });
  const sortSelect = document.getElementById("sort-select");
  sortSelect.value = state.sort;
  sortSelect.addEventListener("change", () => setState({ sort: sortSelect.value, page: state.page }));

  const searchInput = document.getElementById("listing-search-input");
  searchInput.value = state.q;
  document.getElementById("listing-search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    setState({ q: searchInput.value.trim() });
  });
}

function priceRangeParams(price) {
  if (price === "0-1000") return { price_min: 0, price_max: 1000 };
  if (price === "1000-5000") return { price_min: 1001, price_max: 5000 };
  if (price === "5000+") return { price_min: 5001 };
  return {};
}

async function loadProducts() {
  const state = getState();
  wireStaticFilters(state);
  await loadCategoryFilters(state.category);

  const grid = document.getElementById("product-grid");
  const countEl = document.getElementById("result-count");
  grid.innerHTML = Array.from({ length: 8 }).map(() =>
    `<div class="product-card"><div class="skeleton" style="aspect-ratio:1/1"></div></div>`
  ).join("");

  const params = new URLSearchParams({
    sort: state.sort,
    page: state.page,
    page_size: PAGE_SIZE,
    ...(state.q ? { search: state.q } : {}),
    ...(state.category ? { category: state.category } : {}),
    ...(state.availability ? { availability: state.availability } : {}),
    ...priceRangeParams(state.price),
  });

  try {
    const result = await apiFetch(`/products?${params.toString()}`);
    countEl.textContent = `${result.total} product${result.total === 1 ? "" : "s"}`;
    grid.innerHTML = result.items.length
      ? result.items.map(productCardHtml).join("")
      : `<div class="empty-state">No products match your filters.</div>`;
    renderPagination(result.total, state.page);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">Something went wrong loading products.</div>`;
  }
}

function renderPagination(total, currentPage) {
  const box = document.getElementById("pagination");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  box.innerHTML = "";
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => setState({ page: i }));
    box.appendChild(btn);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  wireGridAddToCart();
});
