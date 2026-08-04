// =========================================================
// Admin · Products — full CRUD against /admin/products
// Server enforces admin-only writes independent of this UI (require_admin).
// =========================================================

let apCategories = [];
let apProducts = [];
let apCurrentImages = []; // image URLs for the product currently open in the modal
let apSlugDirty = false;

async function initAdminProducts() {
  const admin = await requireAdmin(`login.html?returnTo=${encodeURIComponent("admin-products.html")}`);
  if (!admin) return;
  wireAdminSidebar("products");

  await loadCategoryOptions();
  await loadProducts();

  document.getElementById("add-product-btn").addEventListener("click", () => openProductModal(null));
  document.getElementById("product-modal-close").addEventListener("click", () => closeModal("product-modal"));
  document.getElementById("product-form").addEventListener("submit", saveProduct);
  document.getElementById("p_images_input").addEventListener("change", handleImageSelect);

  document.getElementById("p_name").addEventListener("input", (e) => {
    if (!apSlugDirty) document.getElementById("p_slug").value = slugify(e.target.value);
  });
  document.getElementById("p_slug").addEventListener("input", () => { apSlugDirty = true; });

  document.getElementById("product-search").addEventListener("input", (e) => renderProducts(e.target.value));
}

async function loadCategoryOptions() {
  try {
    apCategories = await apiFetch("/categories");
  } catch (err) { console.error(err); apCategories = []; }
  const sel = document.getElementById("p_category");
  sel.innerHTML = `<option value="">— None —</option>` + apCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
}

async function loadProducts() {
  try {
    apProducts = await apiFetch("/admin/products");
  } catch (err) {
    console.error(err);
    apProducts = [];
  }
  renderProducts("");
}

function renderProducts(filterText) {
  const tbody = document.getElementById("products-tbody");
  const q = (filterText || "").trim().toLowerCase();
  const rows = apProducts.filter(p =>
    !q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)
  );

  document.getElementById("product-count").textContent = `${rows.length} product${rows.length === 1 ? "" : "s"}`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">No products found.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(p => `
    <tr data-id="${p.id}">
      <td>${p.images && p.images[0] ? `<img class="table-img" src="${p.images[0]}" alt="">` : `<div class="table-img"></div>`}</td>
      <td class="cell-name">${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.sku || "—")}</td>
      <td>${escapeHtml(p.category_name || "—")}</td>
      <td>${formatPKR(p.price)}</td>
      <td>${p.moq}</td>
      <td>${p.stock}</td>
      <td><button class="toggle-pill ${p.is_active ? "on" : "off"}" data-toggle="${p.id}">${p.is_active ? "Active" : "Hidden"}</button></td>
      <td class="table-actions">
        <button class="icon-btn" data-edit="${p.id}" title="Edit">✎</button>
        <button class="icon-btn danger" data-delete="${p.id}" title="Delete">🗑</button>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openProductModal(b.dataset.edit)));
  tbody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.delete)));
  tbody.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleActive(b.dataset.toggle)));
}

function openProductModal(id) {
  const msg = document.getElementById("product-form-msg");
  msg.style.display = "none";
  apSlugDirty = false;

  const p = id ? apProducts.find(x => x.id === id) : null;
  document.getElementById("product-modal-title").textContent = p ? "Edit Product" : "Add Product";
  document.getElementById("p_id").value = p ? p.id : "";
  document.getElementById("p_name").value = p ? p.name : "";
  document.getElementById("p_slug").value = p ? p.slug : "";
  document.getElementById("p_sku").value = p ? (p.sku || "") : "";
  document.getElementById("p_category").value = p ? (p.category_id || "") : "";
  document.getElementById("p_price").value = p ? p.price : "";
  document.getElementById("p_moq").value = p ? p.moq : 1;
  document.getElementById("p_stock").value = p ? p.stock : 0;
  document.getElementById("p_description").value = p ? (p.description || "") : "";
  document.getElementById("p_active").checked = p ? p.is_active : true;
  apCurrentImages = p && p.images ? [...p.images] : [];
  if (p) apSlugDirty = true; // don't auto-rewrite the slug of an existing product
  renderImagePreviews();

  openModal("product-modal");
}

function renderImagePreviews() {
  const box = document.getElementById("p_images_preview");
  box.innerHTML = apCurrentImages.map((url, i) => `
    <div class="img-preview">
      <img src="${url}" alt="">
      <button type="button" class="img-remove" data-i="${i}">✕</button>
    </div>`).join("");
  box.querySelectorAll(".img-remove").forEach(btn =>
    btn.addEventListener("click", () => { apCurrentImages.splice(Number(btn.dataset.i), 1); renderImagePreviews(); })
  );
}

async function handleImageSelect(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = ""; // allow re-selecting the same file later
  const msg = document.getElementById("product-form-msg");

  for (const file of files) {
    try {
      const url = await uploadImage(file, "products");
      apCurrentImages.push(url);
    } catch (err) {
      adminMsg(msg, `Upload failed for "${file.name}": ${err.message}`, "error");
    }
  }
  renderImagePreviews();
}

async function saveProduct(e) {
  e.preventDefault();
  const msg = document.getElementById("product-form-msg");
  const btn = document.getElementById("product-save-btn");

  const id = document.getElementById("p_id").value;
  const payload = {
    name: document.getElementById("p_name").value.trim(),
    slug: slugify(document.getElementById("p_slug").value),
    sku: document.getElementById("p_sku").value.trim() || null,
    category_id: document.getElementById("p_category").value || null,
    price: Number(document.getElementById("p_price").value),
    moq: parseInt(document.getElementById("p_moq").value, 10),
    stock: parseInt(document.getElementById("p_stock").value, 10),
    description: document.getElementById("p_description").value.trim(),
    images: apCurrentImages,
    is_active: document.getElementById("p_active").checked,
  };

  if (!payload.name || !payload.slug) return adminMsg(msg, "Name and slug are required.", "error");
  if (isNaN(payload.price) || payload.price < 0) return adminMsg(msg, "Enter a valid price.", "error");
  if (isNaN(payload.moq) || payload.moq < 1) return adminMsg(msg, "MOQ must be at least 1.", "error");
  if (isNaN(payload.stock) || payload.stock < 0) return adminMsg(msg, "Enter a valid stock quantity.", "error");

  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    if (id) await apiFetch(`/admin/products/${id}`, { method: "PUT", body: payload });
    else await apiFetch("/admin/products", { method: "POST", body: payload });
    closeModal("product-modal");
    loadProducts();
  } catch (err) {
    adminMsg(msg, err.message, "error");
  }
  btn.disabled = false;
  btn.textContent = "Save Product";
}

async function toggleActive(id) {
  const p = apProducts.find(x => x.id === id);
  if (!p) return;
  try {
    await apiFetch(`/admin/products/${id}`, { method: "PUT", body: { ...stripOut(p), is_active: !p.is_active } });
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Couldn't update status.");
  }
}

// admin/products PUT expects a ProductIn shape — strip the read-only fields
// (id, category_name, created_at) that come back from the API before resending.
function stripOut(p) {
  const { id, category_name, created_at, ...rest } = p;
  return rest;
}

async function deleteProduct(id) {
  const p = apProducts.find(x => x.id === id);
  if (!confirm(`Delete "${p?.name || "this product"}"? This can't be undone.`)) return;
  try {
    await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Couldn't delete product.");
  }
}

document.addEventListener("DOMContentLoaded", initAdminProducts);
