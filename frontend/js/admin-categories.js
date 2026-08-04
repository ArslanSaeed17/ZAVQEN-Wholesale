// =========================================================
// Admin · Categories — full CRUD against /admin/categories
// =========================================================

let acCategories = [];
let acImageUrl = "";
let acSlugDirty = false;

async function initAdminCategories() {
  const admin = await requireAdmin(`login.html?returnTo=${encodeURIComponent("admin-categories.html")}`);
  if (!admin) return;
  wireAdminSidebar("categories");

  await loadCategories();

  document.getElementById("add-category-btn").addEventListener("click", () => openCategoryModal(null));
  document.getElementById("category-modal-close").addEventListener("click", () => closeModal("category-modal"));
  document.getElementById("category-form").addEventListener("submit", saveCategory);
  document.getElementById("c_image_input").addEventListener("change", handleCategoryImage);

  document.getElementById("c_name").addEventListener("input", (e) => {
    if (!acSlugDirty) document.getElementById("c_slug").value = slugify(e.target.value);
  });
  document.getElementById("c_slug").addEventListener("input", () => { acSlugDirty = true; });
}

async function loadCategories() {
  const tbody = document.getElementById("categories-tbody");
  try {
    acCategories = await apiFetch("/admin/categories");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5">Couldn't load categories.</td></tr>`;
    return;
  }

  if (!acCategories.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No categories yet.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = acCategories.map(c => `
    <tr>
      <td>${c.image_url ? `<img class="table-img" src="${c.image_url}" alt="">` : `<div class="table-img"></div>`}</td>
      <td class="cell-name">${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.slug)}</td>
      <td>${c.product_count ?? 0}</td>
      <td class="table-actions">
        <button class="icon-btn" data-edit="${c.id}" title="Edit">✎</button>
        <button class="icon-btn danger" data-delete="${c.id}" title="Delete">🗑</button>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openCategoryModal(b.dataset.edit)));
  tbody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteCategory(b.dataset.delete)));
}

function openCategoryModal(id) {
  const msg = document.getElementById("category-form-msg");
  msg.style.display = "none";
  acSlugDirty = false;

  const c = id ? acCategories.find(x => x.id === id) : null;
  document.getElementById("category-modal-title").textContent = c ? "Edit Category" : "Add Category";
  document.getElementById("c_id").value = c ? c.id : "";
  document.getElementById("c_name").value = c ? c.name : "";
  document.getElementById("c_slug").value = c ? c.slug : "";
  document.getElementById("c_description").value = c ? (c.description || "") : "";
  acImageUrl = c ? (c.image_url || "") : "";
  if (c) acSlugDirty = true;
  renderCategoryImagePreview();

  openModal("category-modal");
}

function renderCategoryImagePreview() {
  const box = document.getElementById("c_image_preview");
  box.innerHTML = acImageUrl
    ? `<div class="img-preview"><img src="${acImageUrl}" alt=""><button type="button" class="img-remove" id="c_image_remove">✕</button></div>`
    : "";
  document.getElementById("c_image_remove")?.addEventListener("click", () => { acImageUrl = ""; renderCategoryImagePreview(); });
}

async function handleCategoryImage(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const msg = document.getElementById("category-form-msg");

  try {
    acImageUrl = await uploadImage(file, "categories");
    renderCategoryImagePreview();
  } catch (err) {
    adminMsg(msg, `Upload failed: ${err.message}`, "error");
  }
}

async function saveCategory(e) {
  e.preventDefault();
  const msg = document.getElementById("category-form-msg");
  const btn = document.getElementById("category-save-btn");

  const id = document.getElementById("c_id").value;
  const payload = {
    name: document.getElementById("c_name").value.trim(),
    slug: slugify(document.getElementById("c_slug").value),
    description: document.getElementById("c_description").value.trim(),
    image_url: acImageUrl || null,
  };

  if (!payload.name || !payload.slug) return adminMsg(msg, "Name and slug are required.", "error");

  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    if (id) await apiFetch(`/admin/categories/${id}`, { method: "PUT", body: payload });
    else await apiFetch("/admin/categories", { method: "POST", body: payload });
    closeModal("category-modal");
    loadCategories();
  } catch (err) {
    adminMsg(msg, err.message, "error");
  }
  btn.disabled = false;
  btn.textContent = "Save Category";
}

async function deleteCategory(id) {
  const c = acCategories.find(x => x.id === id);
  if (!confirm(`Delete "${c?.name || "this category"}"? Products in it will become uncategorized, not deleted.`)) return;
  try {
    await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
    loadCategories();
  } catch (err) {
    console.error(err);
    alert("Couldn't delete category.");
  }
}

document.addEventListener("DOMContentLoaded", initAdminCategories);
