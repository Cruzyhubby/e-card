# Éclat API (Laravel 12)

Backend for **Éclat**, a multi-event e-card and invitation management system. Implements the contract in `../docs/API.md`: Sanctum bearer auth, events, guests, CSV import, WhatsApp/e-mail dispatch, public SVG e-cards and an atomic usher check-in endpoint.

Verified on PHP 8.3 with Postgres 18 (PGlite): `schema.sql` applied through PDO with RLS on all 9 tables, `migrate:fresh --seed` from the migrations, and a 35-case API suite (login with mixed-case e-mail, `whereLike` search, VIP aggregates, invitation JSON/SVG/portal, check-in VALID → ALREADY_CHECKED_IN → DENIED, non-UUID tokens, usher scoping and forced password change, platform console and audit search). Earlier builds were regression-tested on MySQL 8.4.

## Requirements

- PHP 8.3+ with `pdo_pgsql`, `mbstring`, `openssl`, `xmlwriter`, `fileinfo`, `intl`, `bcmath`
- Composer 2
- A Supabase project (or any Postgres 14+ server)

## Install

Fresh checkout (dependencies are intentionally not committed). Full walkthrough: [`../docs/SUPABASE_SETUP.md`](../docs/SUPABASE_SETUP.md).

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

1. In the Supabase **SQL Editor**, run [`database/supabase/schema.sql`](database/supabase/schema.sql) on the fresh project.
2. Copy the session-pooler connection details into `DB_*` (`DB_CONNECTION=pgsql`, port `5432`, `DB_SSLMODE=require`).
3. Seed the demo data (no `migrate` needed — the schema file seeds the migration ledger):

```bash
php artisan db:seed
php artisan serve --host=0.0.0.0 --port=8000
```

The API is then available at `http://localhost:8000/api`; the health check is `/up`.

Adding a new migration later works normally with `php artisan make:migration` + `php artisan migrate`.

Production: create the first administrator without the demo seeder:

```bash
php artisan eclat:create-admin --name="Admin" --email=you@example.com
```

`composer.lock` pins the tested dependency set (Laravel 12).

## Demo accounts (console password: `password`)

| Role      | E-mail                 | Notes                  |
|-----------|------------------------|------------------------|
| Organizer | organizer@eclat.app    | Amara Okafor, owns all demo events |
| Admin     | admin@eclat.app        | Platform owner         |
| Usher     | usher@eclat.app        | Temporary password `2348000000001` (phone digits); forced change on first sign-in |

`DemoSeeder` creates four events (wedding, gala, birthday, graduation) with 40–112 guests each, mixed statuses, check-in logs and message dispatch history. Each event also gets its own usher (`gate.N@gate.eclat.local`).

## Messaging

`ECLAT_MESSAGING_DRIVER=log` (default) simulates delivery: the message is written to `storage/logs/laravel.log`, a `message_dispatches` row is marked `sent`, and guest/event statuses advance exactly as in live mode. With `ECLAT_MESSAGING_DRIVER=live`:

- **WhatsApp** uses the WhatsApp Cloud API through Laravel's HTTP client (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, optional `WHATSAPP_API_VERSION`).
- **Email** sends `App\Mail\InvitationMail` (inline SVG e-card) through the configured mailer; `MAIL_MAILER=log` also falls back to the log path.

Canonical message templates live in `config/eclat.php` and support `{guest_name}`, `{table_number}`, `{event_title}` and `{qr_link}`.

## Public invitation

QR codes encode `{APP_URL}/i/{qr_token}`. The Blade page at that URL embeds the generated 480×680 SVG e-card; the SVG itself is also served at `/api/invitations/{qr_token}/ecard.svg`.
