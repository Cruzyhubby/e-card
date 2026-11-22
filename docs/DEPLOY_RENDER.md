# Deploying Fahari Creative on Render (free plan)

The deployment runs as **one Docker web service** that serves both the admin app and the
Laravel API on the same HTTPS domain. The database is your existing **Supabase Postgres**
project — nothing is stored on Render.

```
https://<service>.onrender.com/        -> admin app (React)
https://<service>.onrender.com/api/*   -> Laravel API
https://<service>.onrender.com/i/*     -> public invitation / e-card
https://<service>.onrender.com/up      -> health check
```

## What is already prepared in the repository

| File | Purpose |
| --- | --- |
| `render.yaml` | Render Blueprint: free plan, Frankfurt region, health check, env vars |
| `deploy/render/Dockerfile` | Builds admin + API into one nginx + php-fpm image |
| `deploy/render/entrypoint.sh` | Derives public URLs from Render, caches config/routes/views, runs migrations |
| `deploy/render/nginx.conf.template` | SPA + `/api` + `/i` routing, forwards the bearer token |
| `.dockerignore` | Keeps `.env` files, `node_modules`, `vendor` out of the image |
| `.env.production.example` | Reference for the environment values (self-hosted compose use) |

Secrets are **not** in the repository. `DB_PASSWORD` is entered once in the Render dashboard.

## Step 1 — GitHub account (free)

Render deploys from GitHub, so the code needs to be there first.

1. Open https://github.com/signup and create an account (email + password).
2. Verify the email.
3. Click **New repository**: name `eclat`, visibility **Private**, do **not** add a README.
4. Copy the repository URL, it looks like `https://github.com/<username>/eclat.git`.

The project is already committed locally on branch `main`, so nothing else is needed.

## Step 2 — Push the code

Option A (no terminal) — GitHub Desktop:

1. Install https://desktop.github.com and sign in.
2. **File → Add local repository** → choose `C:\Users\m3\Documents\Qoder\2026-11-08\4f76adeb`.
3. Click **Publish repository**, keep **Private**, publish.

Option B — command line (if Git Credential Manager is installed):

```bash
git remote add origin https://github.com/<username>/eclat.git
git push -u origin main
```

A browser window asks you to sign in to GitHub; no token needs to be copied anywhere.

## Step 3 — Render account (free, no card)

1. Open https://render.com and choose **Get Started**.
2. Sign in **with GitHub** and allow Render to see your repositories.
3. No payment method is required for the free plan.

## Step 4 — Create the service from the Blueprint

1. In Render click **New + → Blueprint**.
2. Pick the `eclat` repository. Render reads `render.yaml`.
3. Render shows one web service named `eclat`, plan **Free**, region **Frankfurt**.
4. It asks for two missing secrets:
   - **DB_PASSWORD**: Supabase dashboard → **Project Settings → Database → Database password** (the one already used in `backend/.env`).
   - **APP_KEY**: copy the `APP_KEY=` value from `backend/.env`, including the `base64:` prefix. It must be the same key that wrote the existing Supabase settings, which are encrypted at rest. Do not let Render generate one.
5. Click **Apply** and wait for the first build (about 5–10 minutes).

When the status turns **Live**, open:

- `https://<service>.onrender.com/up` → should show a healthy response
- `https://<service>.onrender.com/` → the admin login

## Step 5 — First login and security

The service uses your Supabase data, including any accounts seeded earlier, so log in with the
organizer account you already use locally. `DemoSeeder` refuses to run when `APP_ENV=production`
(override only with `ALLOW_DEMO_SEED=true`), so re-runs can never reset live passwords. Then:

1. Change the organizer and super-admin passwords (demo passwords are documented in this project's history and must never be reused).
2. Settings → **Two-factor authentication** → enable it for the organizer and for the account page's super admin. Save the recovery codes offline.
3. Settings → **SMS gateway (Kilakona)** → confirm the API key, API secret, sender ID, and that the base URL is `https://messaging.kilakona.co.tz`. Leave delivery mode on `log` until you are ready to spend SMS credits, then switch it to `live`.
4. Create one test event/guest and confirm it appears in Supabase → Table Editor.

`render.yaml` sets `SESSION_SECURE_COOKIE=true` and `SESSION_ENCRYPT=true`. Render is detected
automatically for trusted-proxy handling (`RENDER=true`); on any other host set
`TRUSTED_PROXIES` to the proxy IPs/CIDRs instead of leaving forwarded headers open to the internet.

## Updating the live app

Every `git push` to `main` triggers a new build and deploy. Supabase data is untouched.

```bash
git add -A
git commit -m "your change"
git push
```

## Free-plan limits (important)

- The service **sleeps after 15 minutes without traffic**; the next request wakes it in
  about 30–60 seconds. This is normal on the free plan.
- 512 MB RAM. Enough for this app at demo/early-production volume.
- The container filesystem is **ephemeral**: sessions and logs reset on every deploy.
  Events, guests, check-ins and designs live in Supabase, so they are safe.
- Custom domains are supported later (Settings → Custom Domains) at no extra cost on the
  free plan; add the domain in Render and in Supabase if you need allow-listing.

## Usher app (after the web app is live)

The Expo scanner needs the deployed API URL baked into the build:

```bash
cd usher-app
EXPO_PUBLIC_API_URL=https://<service>.onrender.com npx eas build -p android --profile preview
```

This requires a free Expo account (`npx eas login`) and produces an APK link for phones.
Until then the scanner still works against a locally running API on the same Wi-Fi.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Build fails at `composer install` | Platform extensions are installed in the image; re-run the deploy. |
| Logs show `could not translate host name` | Supabase project paused or wrong `DB_HOST`; resume it in Supabase. |
| Logs show `password authentication failed` | `DB_PASSWORD` in Render is wrong; edit it in Environment and redeploy. |
| Page loads but API returns 500 | Check Render logs for `Unsupported cipher or incorrect key length`; `APP_KEY` must be the `base64:` value from `backend/.env`. |
| Invitation page `/i/...` returns 500 while `/api` works | Same cause: invalid `APP_KEY`. Fix the env var and redeploy. |
| Health check fails | Entrypoint aborts if Supabase is unreachable, so the container will not start. |
