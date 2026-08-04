// =========================================================
// Admin Panel — shared helpers used across all admin-*.html pages
// =========================================================

function wireAdminSidebar(page) {
  document.querySelectorAll(".admin-sidebar a[data-page]").forEach(a => {
    if (a.dataset.page === page) a.classList.add("active");
  });
}

function adminMsg(el, text, type) {
  el.textContent = text;
  el.className = "form-msg " + type;
  el.style.display = "block";
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}
// close any modal on overlay click or Escape
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) e.target.classList.remove("active");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
});
