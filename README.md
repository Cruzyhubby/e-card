# Éclat — Multi-Event E-Card & Invitation Management

Production-grade platform for designing e-cards, distributing guest invitations, and verifying QR passes at the entrance. Three deployable pieces share one Laravel API and one Postgres database (Supabase).

| Piece | Stack | Purpose |
| --- | --- | --- |
| `admin/` | React 19 · Vite 7 · Tailwind CSS 3 · Lucide | Organizer dashboard + event studio + public invitation viewer |
| `backend/` | Laravel 12 · PHP 8.3 · Supabase Postgres · Sanctum · BaconQrCode | REST API, e-card SVG rendering, WhatsApp/SMTP dispatch, atomic check-in |
| `usher-app/` | React Native · Expo SDK 58 · expo-camera | Door scanner with VALID / ALREADY CHECKED-IN / DENIED feedback, signed in with an usher account |

API contract: [`docs/API.md`](docs/API.md). Supabase/database setup: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

---

## Feature tour

**Dashboard** — live metrics, invitation rate, searchable/filterable event grid, create/edit/delete events.

**Event studio** — six tabs per event:
1. **Overview** — funnel, capacity ring, recent gate scans, quick actions.
2. **Guest directory** — search, status filters, VIP flags, table/seat assignment, CSV import/export, pagination.
3. **E-Card studio** — five templates, colour controls, guest-name position, QR placement/size, live preview, save/revert.
4. **Distribution hub** — WhatsApp/e-mail templates with `{guest_name}`, `{table_number}`, `{event_title}`, `{qr_link}`; audience selection; per-channel preview; dispatch audit. Every dispatch also delivers a QR image (below the WhatsApp text, inside the e-mail) that opens the guest portal, where the e-card can be viewed and downloaded.
5. **Gate & ushers** — create usher accounts for the event, see scan counts and last activity, suspend/reactivate or remove an account. Accounts are provisioned like organizers: no password field, the phone digits become the temporary password, and a forced password change runs at first sign-in. No gate tokens are issued.
6. **Check-in logs** — live refresh, separate **scanned at** and **status** columns (valid, already used, denied) with colour codes, usher/device attribution.

**Guest portal** — at `/i/{qr_token}`: the e-card rendered exactly as designed in the studio (same palette, fonts, event description below the venue, guest-name position, QR placement/size), guest seating, event details, and a **Download e-card** button that saves the SVG. Both the distribution QR and the QR printed on the card resolve here.

**Platform console** — super admin only: platform totals (organizers, events, usher accounts, check-ins), delivery-provider readiness, recent security audit, organizer registration/suspension/deletion, searchable audit log, and encrypted WhatsApp/SMTP global settings. Organizer registration takes name, e-mail, and phone only — the phone digits are the initial password, and the host must set a new password at first sign-in. Guest directories, QR tokens, and gate scans are blocked for this role.

**Usher app** — sign in with the account e-mail and password created by the organizer, complete the forced password change on first use, then run continuous QR scanning with duplicate suppression, haptics, a big colour-coded result overlay, manual token entry, live gate totals from the server, and local session history. The account cannot scan any other event.

---

## Local development

### 1. Backend (Laragon / any PHP 8.3 + Supabase Postgres)

Supabase is used as the database only — full walkthrough in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). Short version:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# run database/supabase/schema.sql in the Supabase SQL Editor,
# then fill DB_* in .env from Project Settings -> Database -> Connection string
php artisan db:seed
php artisan serve --host=0.0.0.0 --port=8000   # phones on the same Wi-Fi can reach this
```

PHP needs `pdo_pgsql` enabled (`extension=pdo_pgsql` in `php.ini`). The schema file also seeds Laravel's `migrations` ledger, so **do not run `php artisan migrate`** on a database created from it.

`.env.example` sets `SERVER_HOST=0.0.0.0`, so a plain `php artisan serve` also binds to the LAN. A server bound to `127.0.0.1` is invisible to phones even when both are on the same Wi-Fi. If Windows Firewall prompts on first start, allow PHP for private networks.

Seeded accounts (console accounts use `password`; the usher account uses its phone digits and must change it on first sign-in):

| Role | E-mail | Access |
| --- | --- | --- |
| Super admin | `admin@eclat.app` | Platform overview, organizers, audit logs, global settings |
| Event organizer | `organizer@eclat.app` | Own events, guests, studio, distribution, usher accounts, check-in logs |
| Usher (event 1) | `usher@eclat.app` | Gate scanner for the first seeded event only |

Organizers created from the platform console get no typed password: their initial password is the digit-only phone number on the account, and the first sign-in opens a forced password screen before the workspace is accessible. Signing in later uses the chosen password.

Usher accounts work the same way. The organizer opens **Event Studio → Gate & ushers**, creates an account with name, e-mail, and phone (the digits become the temporary password), and shares those credentials with the usher. The usher signs in to the scanner app with the e-mail and temporary password, chooses a new password, and starts scanning. Accounts can be suspended, reactivated, or removed at any time. The seeded `usher@eclat.app` account uses the temporary password `2348000000001` (the digits of `+234 800 000 0001`) and is forced to change it on first sign-in.

The demo seeder dates its events relative to the day you seed: one event is live today, one has already taken place, and two are upcoming, so every dashboard timestamp is realistic. It also creates one usher account per event (`usher@eclat.app` for the first event, `gate.N@gate.eclat.local` for the rest) so each gate can be tested immediately.

### 2. Admin dashboard

```bash
cd admin
npm install
cp .env.example .env.local     # VITE_API_URL=http://127.0.0.1:8000
npm run dev                    # http://localhost:5173
```

While the API runs on `localhost:8000`, the Vite dev server proxies `/api` automatically. Every screen reads live data from the API — there is no offline or demo mode.

### 3. Usher scanner

```bash
cd usher-app
npm install
npx expo start        # phone / emulator
npm run web           # optional: open the scanner in a browser
```

The sign-in screen only asks for e-mail and password — there is no server URL or device ID to configure. On launch the app probes the likely API origins in parallel and keeps the first one that answers `GET /api/ping`:

- the saved session URL, if this device has signed in before
- the Expo dev host, the browser host, `localhost:8000`, or `10.0.2.2:8000` depending on platform
- a build-time `EXPO_PUBLIC_API_URL`, which always wins when set

A green **Connected** row confirms the API answered. If nothing answers, the row turns red with "No connection" and a **RETRY** action; sign-in also re-runs discovery automatically, so an IP change or a server restart heals itself. The device ID is taken from the usher account on the server, so it never has to be typed.

For deployed builds, bake the API origin into the app once — in `usher-app/eas.json`:

```json
"production": {
  "autoIncrement": true,
  "env": { "EXPO_PUBLIC_API_URL": "https://events.example.com" },
  "android": { "buildType": "app-bundle" }
}
```

The same variable works for local builds and exports via `usher-app/.env` (see `.env.example`). When it is set, the app talks to that server and never probes the network.

Sign in with the usher account created in **Event Studio → Gate & ushers** (e-mail plus the temporary phone-digit password). The app forces a password change on first sign-in, remembers the e-mail across sign-outs, and keeps the session until the token is revoked. If the organizer suspends or removes the account, the saved session is cleared and the app returns to sign-in.

Usher accounts cannot sign in to the admin web console; entering one there shows a message pointing to the scanner app.

---

## Production deployment (Docker + Supabase)

Prerequisites: Docker Engine + Compose v2, a domain pointing at the host, ports 80/443 reachable, and a Supabase project with `database/supabase/schema.sql` applied (see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)). The database is external — the compose stack no longer bundles MySQL.

```bash
# 1. Configure secrets
cp .env.production.example .env.production
openssl rand -base64 32          # use as APP_KEY=base64:<value>
# edit DB_HOST/DB_USERNAME/DB_PASSWORD (Supabase session pooler, port 5432),
# APP_URL, FRONTEND_URL, SANCTUM_STATEFUL_DOMAINS, mail + WhatsApp credentials

# 2. Build and start PHP-FPM + Nginx + admin bundle
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 3. Create the first super admin (platform owner — not seeded in production)
docker compose --env-file .env.production -f docker-compose.prod.yml exec app \
  php artisan eclat:create-admin --name="Your Name" --email=you@example.com
```

Open `https://events.example.com` (or `http://server-ip` before TLS). The container entrypoint waits for Postgres, caches config/routes/views, and runs `php artisan migrate --force` on every start; because the schema file seeds the migration ledger, that step is a no-op unless new migrations were added.

### HTTPS

Place Caddy or an nginx TLS terminator in front of the `web` service, or add certificates to `admin/nginx.conf`. With Caddy on the host:

```
events.example.com {
    reverse_proxy 127.0.0.1:80
}
```

Then set `APP_URL` and `FRONTEND_URL` to the HTTPS origin and `SANCTUM_STATEFUL_DOMAINS` to the hostname, and restart: `docker compose -f docker-compose.prod.yml up -d`.

### Messaging

A super admin configures delivery in **Global settings** (platform console): delivery mode, WhatsApp Cloud API, and SMTP credentials. Those values are stored encrypted at rest and secrets are never returned to the browser. Environment variables remain the fallback for a fresh install:

`ECLAT_MESSAGING_DRIVER=log` records dispatches without contacting providers. For real delivery set it to `live` and provide:

- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_FROM`
- `MAIL_*` SMTP credentials

Credentials saved in Global settings override the environment at runtime. Every dispatch is stored in `message_dispatches` for audit.

### Mobile release

```bash
cd usher-app
npx eas-cli login
npx eas-cli build:configure
```

Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS origin in the `production` profile of `eas.json` (see above), then:

```bash
npx eas-cli build --platform android --profile production
```

Ushers never enter a server address; the production build always connects to the baked-in API origin. Camera permission text is already configured in `app.json`.

---

## Security model

- **Super admin** — manages organizer accounts and global delivery settings, sees platform aggregates and the security audit trail. Guest directories, QR tokens, event detail, gate logs, and check-ins are deliberately blocked (policy + explicit `403`), so platform staff cannot inspect organizer guest data.
- **Organizer** — full control of their own events only: guests, tables/VIP, e-card studio, distribution, usher accounts, and check-in logs. Policies return `404`/`403` for another organizer's resources.
- **Usher** — a password account bound to one event. The scanner can verify passes for that event only; a QR from any other event returns DENIED and is logged. Gate totals are per usher.
- Sanctum personal access tokens; signing out deletes the current token. Suspending an organizer or usher, deleting an usher account, or changing a password revokes the affected sessions immediately.
- Organizer and usher accounts are created without a typed password: the phone digits are the temporary password and `must_change_password` blocks every endpoint except `/auth/me`, `/auth/logout`, and `/auth/password` until a new password is chosen. A successful change revokes all other sessions for that account.
- Every guest gets an unguessable UUID `qr_token`; invitation URLs never expose sequential IDs.
- Check-in runs inside a `lockForUpdate` transaction so two gates cannot admit the same guest.
- Global secrets (WhatsApp token, SMTP password) are encrypted at rest with the app key and masked in every API response.
- Audit logs capture sign-ins, organizer lifecycle changes, usher account create/suspend/activate/delete, and settings updates without guest PII.
- Login is rate-limited; API errors render JSON without stack traces when `APP_DEBUG=false`.
- CSV imports validate every row and report skipped rows with reasons.

## Verification performed

- Postgres/Supabase port: `backend/database/supabase/schema.sql` applied cleanly (9 tables, 11 ledger rows, RLS enabled everywhere), `php artisan migrate:fresh --seed` also succeeds on Postgres, and a 35-case API suite passes against it — mixed-case e-mail login, `whereLike` search, VIP aggregates, e-card/invitation routes, check-in VALID → ALREADY_CHECKED_IN → DENIED, non-UUID tokens returning DENIED/404 instead of 500, usher scoping + forced password change, platform console and audit search. Run on Postgres 18 locally (PGlite); Supabase runs the same SQL.
- `npm run build` — admin production bundle compiles cleanly.
- `php artisan migrate:fresh --seed` on MySQL 8.4, `php -l` across PHP sources.
- End-to-end API smoke test: login, dashboard, event CRUD, guest CRUD, CSV import, single + bulk dispatch, public invitation JSON, SVG e-card (480×680), check-in VALID → ALREADY_CHECKED_IN, logs/stats, 401 handling.
- E-card parity check: the server SVG was compared against the real studio component (`EcardPreview`) at 480×680 — title, date/time columns, venue, description, guest block, underline, QR frame and caption align within ~1px; embedded Instrument Serif / Plus Jakarta Sans keep the typography identical in document, `<img>` and downloaded-file contexts.
- Portal flow: distribution `qr.png` and the card's printed QR both decode to `{APP_URL}/i/{token}`; the portal renders the same card and its Download button returns the SVG as an attachment.
- Role regression across all three tiers: super admin sees platform totals and audit trail but gets 403 on `/events`; organizer manages only their own events, guests, and usher accounts; an usher account resolves `/auth/me` to a single event, returns 403 on other events' guests, and the scanner records VALID for its own event while cross-event scans land as DENIED with updated gate totals.
- Usher account regression: organizer creates an account with no password field and a phone number, the usher signs in with the phone digits, `403 password_change_required` blocks `/gate/stats`, `/auth/password` clears the flag and scanning returns 200; suspending blocks login and revokes tokens, reactivating restores access, deleting returns 204 and removes login.
- Password flow regression: organizer created without a password, first login with phone digits, `403 password_change_required` on `/events`, wrong/same-password rejections, successful change clears the flag, old password rejected and new password accepted, seeded accounts unaffected.
- Browser walkthrough of dashboard, all six studio tabs incl. Gate & ushers, gate logs, settings, and the public invitation page against the live API — plus the live super-admin console (platform overview, organizers, audit logs, global settings).
- Expo Android bundle export via Metro (663 modules) and web export (288 modules).
- Scanner sign-in in a browser against the live API: automatic server discovery (first responder wins), green **Connected** status, login, and the forced password screen. A build with `EXPO_PUBLIC_API_URL` set contacted only that origin. The admin console rejects usher credentials with a message directing them to the scanner app; organizer login still works.
- LAN path: API bound to `0.0.0.0`, `GET /api/ping` answered on the machine's LAN address with a private-origin CORS preflight, and the scanner web app opened from that LAN address connected and signed in.

## Repository layout

```
admin/            React dashboard (Vite, Tailwind)
backend/          Laravel 12 API
  app/            Controllers, requests, resources, services, policies, console
  database/       Migrations + demo seeder
  database/supabase/schema.sql   Postgres schema for a fresh Supabase project
  docker/         PHP config + entrypoint
usher-app/        Expo gate scanner
docs/API.md       Authoritative REST contract
docs/SUPABASE_SETUP.md            Supabase setup walkthrough (Swahili)
docker-compose.prod.yml
.env.production.example
```
