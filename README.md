# ZAVQEN Wholesale — FastAPI + Railway + Vercel Edition

Same site, new backend: instead of Supabase, this version runs on a
FastAPI REST API (Postgres + JWT auth) that you deploy to Railway, with the
same static frontend deployed to Vercel — your usual stack.

```
zavqen-wholesale/
├── backend/                     <- deploy this to Railway
│   ├── main.py, config.py, database.py, models.py, schemas.py
│   ├── security.py, deps.py
│   ├── routers/                  auth, catalog, cart, orders, admin, public
│   ├── uploads/                  product/category images land here (see note below)
│   ├── requirements.txt, Procfile, .env.example
│
└── frontend/                    <- deploy this to Vercel
    ├── *.html                    23 pages
    ├── css/style.css
    └── js/
        ├── apiClient.js           <-- ONLY file you must edit before deploy
        └── ... (auth, products, cart, checkout, admin-*, etc.)
```

## 1. Deploy the backend to Railway

1. Push the `backend/` folder to a GitHub repo.
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo, set the **Root Directory** to `backend`.
3. Add a **PostgreSQL** plugin to the same Railway project — Railway automatically injects `DATABASE_URL` into your service, you don't set it yourself.
4. In your backend service → **Variables**, add:
   ```
   JWT_SECRET=<generate with: openssl rand -hex 32>
   CORS_ORIGINS=https://your-frontend.vercel.app
   PUBLIC_BASE_URL=https://<your-railway-service>.up.railway.app
   FRONTEND_URL=https://your-frontend.vercel.app
   ENV=production
   BOOTSTRAP_ADMIN_EMAIL=you@example.com
   ```
   (You'll fill in the real Railway/Vercel URLs after your first deploy — Railway assigns the domain once the service is up; just redeploy after setting these.)
5. Railway auto-detects `requirements.txt` + `Procfile` and deploys with `uvicorn main:app`. Tables are created automatically on first startup — no manual migration step.
6. Visit `https://<your-backend>.up.railway.app/health` — should return `{"status":"healthy"}`.

### ⚠️ Persistent image storage
Uploaded product/category images are saved to `backend/uploads/` on local disk.
Railway's filesystem is **ephemeral** — it resets on every redeploy, so uploaded
images would be lost. Before going live:
- In Railway, add a **Volume** and mount it at `/app/uploads` on your backend service.
- That's it — the code already writes to `uploads/` relative to the app root, so it'll persist automatically once the volume is mounted.

### About the admin account
`BOOTSTRAP_ADMIN_EMAIL` auto-promotes whichever account registers with that
exact email to `role: admin` — no manual SQL needed. Set it to your own email
**before** you register on the live site.

## 2. Point the frontend at your backend

Open `frontend/js/apiClient.js`, edit this one line:

```js
const API_BASE_URL = "https://YOUR-BACKEND.up.railway.app";
```

This is the only file that needs editing before deploy.

## 3. Deploy the frontend to Vercel

1. Push `frontend/` to GitHub (same repo or a separate one).
2. Vercel → **Add New Project**, import the repo, set **Root Directory** to `frontend`.
3. Framework preset: **Other** (plain static HTML, no build step).
4. Deploy. `vercel.json` already sets security headers and a 404 fallback.
5. Go back to Railway and update `CORS_ORIGINS` / `FRONTEND_URL` to your real Vercel URL, then redeploy the backend so CORS allows it.

## 4. Register your admin account

1. Visit your live frontend → **Register** with the email you set as `BOOTSTRAP_ADMIN_EMAIL`.
2. Because there's no email provider configured yet, the verification link is printed to the **Railway service logs** (Deployments → your deployment → Logs) as `[verify email] you@example.com -> https://.../auth/verify?token=...`. Copy that link into your browser to verify.
3. Log in — you're an admin, the navbar shows an **Admin** link.

Every other account that registers afterward gets the normal `customer` role — only the bootstrap email is auto-promoted.

### Wiring up real emails (optional, for production)
Right now, verification and password-reset links are only logged server-side
(and echoed in the API response while `ENV` isn't `production`). To send real
emails, add an SMTP call inside `routers/auth.py` where the `print(...)` lines
are — any provider works (SendGrid, Mailgun, Gmail SMTP, etc.).

## 5. Two things to set after you deploy (Admin → Settings)

No code editing needed for either:
- **WhatsApp number** — lights up the WhatsApp buttons on Contact page + homepage footer.
- **Your own password** — change it any time from the same page.

---

## What changed vs. the Supabase version

| | Supabase version | This version |
|---|---|---|
| Database | Supabase Postgres | Your own Postgres (Railway plugin) |
| Auth | Supabase Auth | JWT (python-jose) + bcrypt (passlib), issued by `/auth/login` |
| Access control | Postgres Row Level Security | FastAPI dependencies (`get_current_user`, `require_admin`) checked on every route |
| File storage | Supabase Storage bucket | Local disk under `backend/uploads/` (mount a Railway Volume for persistence) |
| Email verification | Supabase's built-in email flow | Custom token + link, logged server-side (wire up SMTP for real email) |

Everything else — the storefront, cart/checkout logic (MOQ + stock re-validated
server-side inside one atomic DB transaction), the admin panel, and every page's
look — is unchanged. Only how the frontend *talks* to the backend changed:
`js/apiClient.js` replaces `supabaseClient.js`, and each page's JS now calls
`apiFetch("/some/route", ...)` instead of `supabase.from("table")...`.

## Full test flow

Register → verify (via logged link) → login → browse products → Add to Cart →
Checkout → Place Order → confirmation → Dashboard shows the order as *pending*.
As admin: Admin → Orders → move it through Processing → Shipped → Delivered.

## API reference (while building further features)

Interactive docs are auto-generated by FastAPI — once deployed, visit:
```
https://<your-backend>.up.railway.app/docs
```
to see every endpoint, its request/response shape, and try it live.
