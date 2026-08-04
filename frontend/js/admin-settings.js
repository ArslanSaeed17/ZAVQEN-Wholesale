// =========================================================
// Admin · Settings — site settings, self-service password change, contact inbox
// =========================================================

async function initAdminSettings() {
  const admin = await requireAdmin(`login.html?returnTo=${encodeURIComponent("admin-settings.html")}`);
  if (!admin) return;
  wireAdminSidebar("settings");

  await loadSettingsForm();
  await loadMessages();

  document.getElementById("settings-form").addEventListener("submit", saveSettings);
  document.getElementById("password-form").addEventListener("submit", changePassword);
}

async function loadSettingsForm() {
  try {
    const s = await apiFetch("/settings");
    document.getElementById("s_whatsapp").value = s.whatsapp_number || "";
    document.getElementById("s_email").value = s.contact_email || "";
    document.getElementById("s_phone").value = s.contact_phone || "";
    document.getElementById("s_address").value = s.contact_address || "";
  } catch (err) {
    console.error(err);
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const msg = document.getElementById("settings-msg");
  const btn = document.getElementById("settings-save-btn");

  const payload = {
    whatsapp_number: document.getElementById("s_whatsapp").value.trim().replace(/[^0-9]/g, ""),
    contact_email: document.getElementById("s_email").value.trim(),
    contact_phone: document.getElementById("s_phone").value.trim(),
    contact_address: document.getElementById("s_address").value.trim(),
  };

  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await apiFetch("/admin/settings", { method: "PUT", body: payload });
    adminMsg(msg, "Settings saved.", "success");
  } catch (err) {
    adminMsg(msg, err.message, "error");
  }
  btn.disabled = false;
  btn.textContent = "Save Settings";
}

async function changePassword(e) {
  e.preventDefault();
  const msg = document.getElementById("password-msg");
  const btn = document.getElementById("password-save-btn");

  const pw = document.getElementById("s_new_password").value;
  const confirm = document.getElementById("s_confirm_password").value;

  if (pw.length < 8) return adminMsg(msg, "Password must be at least 8 characters.", "error");
  if (pw !== confirm) return adminMsg(msg, "Passwords do not match.", "error");

  btn.disabled = true;
  btn.textContent = "Updating…";
  try {
    await apiFetch("/auth/change-password", { method: "POST", body: { new_password: pw } });
    adminMsg(msg, "Password updated.", "success");
    document.getElementById("password-form").reset();
  } catch (err) {
    adminMsg(msg, err.message, "error");
  }
  btn.disabled = false;
  btn.textContent = "Update Password";
}

async function loadMessages() {
  const box = document.getElementById("messages-list");
  let data;
  try {
    data = await apiFetch("/admin/messages");
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="empty-state">Couldn't load messages.</div>`;
    return;
  }

  if (!data.length) {
    box.innerHTML = `<div class="empty-state">No messages yet.</div>`;
    return;
  }

  box.innerHTML = data.map(m => `
    <div class="order-card" data-id="${m.id}">
      <div class="order-card-head">
        <div>
          <b>${escapeHtml(m.name)}</b>
          <span class="pd-note" style="margin:0 0 0 8px">${escapeHtml(m.email)}</span>
        </div>
        <button class="icon-btn danger msg-delete" data-id="${m.id}" title="Delete">🗑</button>
      </div>
      ${m.subject ? `<p class="pd-note" style="margin:8px 0 0"><b>${escapeHtml(m.subject)}</b></p>` : ""}
      <p class="order-items-preview">${escapeHtml(m.message)}</p>
      <div class="order-card-foot"><span>${new Date(m.created_at).toLocaleString("en-PK")}</span><span></span></div>
    </div>`).join("");

  box.querySelectorAll(".msg-delete").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this message?")) return;
      try { await apiFetch(`/admin/messages/${btn.dataset.id}`, { method: "DELETE" }); }
      catch (err) { console.error(err); }
      loadMessages();
    })
  );
}

document.addEventListener("DOMContentLoaded", initAdminSettings);
