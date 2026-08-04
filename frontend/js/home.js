// =========================================================
// Homepage: categories, featured products, new arrivals
// =========================================================

function productCardHtml(p) {
  const img = p.images && p.images[0] ? p.images[0] : "";
  return `
    <a class="product-card" href="product.html?slug=${encodeURIComponent(p.slug)}">
      <div class="p-img-wrap">
        ${img ? `<img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<div class="skeleton" style="width:100%;height:100%"></div>`}
        <span class="swatch-tag">MOQ ${p.moq}</span>
      </div>
      <div class="p-body">
        <div class="p-name">${escapeHtml(p.name)}</div>
        <div class="p-price-row">
          <span class="p-price">${formatPKR(p.price)}</span>
        </div>
        ${stockPill(p.stock)}
      </div>
    </a>`;
}

function categoryCardHtml(c) {
  return `
    <a class="cat-card" href="products.html?category=${encodeURIComponent(c.slug)}">
      <div class="cat-img">${c.image_url ? `<img src="${c.image_url}" alt="${escapeHtml(c.name)}">` : ""}</div>
      <div class="cat-name">${escapeHtml(c.name)}</div>
    </a>`;
}

async function loadHomeData() {
  const catGrid = document.getElementById("cat-grid");
  const featuredGrid = document.getElementById("featured-grid");
  const arrivalsGrid = document.getElementById("arrivals-grid");

  try {
    const [categories, featured, arrivals] = await Promise.all([
      apiFetch("/categories"),
      apiFetch("/products?sort=newest&page=1&page_size=8"),
      apiFetch("/products?sort=newest&page=1&page_size=4"),
    ]);

    catGrid.innerHTML = categories.length
      ? categories.slice(0, 4).map(categoryCardHtml).join("")
      : `<div class="empty-state">Categories will appear here once added in Admin.</div>`;

    featuredGrid.innerHTML = featured.items.length
      ? featured.items.map(productCardHtml).join("")
      : `<div class="empty-state">No products yet — add your first product in Admin.</div>`;

    arrivalsGrid.innerHTML = arrivals.items.length
      ? arrivals.items.map(productCardHtml).join("")
      : `<div class="empty-state">Nothing new yet.</div>`;
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", loadHomeData);
