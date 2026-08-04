// =========================================================
// Contact form — POST /contact on the FastAPI backend.
// =========================================================

const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("form-msg");
    const btn = document.getElementById("contact-btn");

    // honeypot — bots tend to fill every input, real visitors never see this field
    if (document.getElementById("cf_company").value.trim()) {
      showMsg(msg, "Message sent. We'll get back to you soon.", "success");
      contactForm.reset();
      return;
    }

    const payload = {
      name: document.getElementById("cf_name").value.trim(),
      email: document.getElementById("cf_email").value.trim(),
      subject: document.getElementById("cf_subject").value.trim() || null,
      message: document.getElementById("cf_message").value.trim(),
    };

    if (!payload.name || !/^\S+@\S+\.\S+$/.test(payload.email) || !payload.message) {
      return showMsg(msg, "Fill in your name, a valid email, and a message.", "error");
    }

    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      await apiFetch("/contact", { method: "POST", body: payload });
      showMsg(msg, "Message sent. We'll get back to you soon.", "success");
      contactForm.reset();
    } catch (err) {
      console.error(err);
      showMsg(msg, "Couldn't send your message. Please try again.", "error");
    }
    btn.disabled = false;
    btn.textContent = "Send Message";
  });
}
