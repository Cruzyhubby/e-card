# Kuweka Fahari Creative kwenye Supabase (Postgres)

Mwongozo huu unaeleza hatua kwa hatua jinsi ya kuunganisha Fahari Creative na **Supabase (database pekee)**.

Kile kinachobadilika: **database tu**. Laravel API, admin web, usher scanner na Sanctum auth zinabaki kama zilivyo. Hakuna Supabase JS client, hakuna Auth ya Supabase, hakuna Storage — Supabase inatumika kama Postgres ya kawaida tu.

> Nakala hii imeandaliwa kwa ajili ya **project safi (fresh)**. Huhitaji kuhamisha data ya MySQL iliyopo: unaunda schema, unaseed demo data, na unaanza.

---

## Muhtasari wa hatua

1. Unda Supabase project na uhifadhi database password.
2. Chukua **connection string** (session pooler, port 5432).
3. Washa `pdo_pgsql` kwenye PHP.
4. Endesha `backend/database/supabase/schema.sql` kwenye SQL Editor.
5. Weka `backend/.env` (DB_* + APP_KEY).
6. `php artisan db:seed`.
7. Endesha API, admin na scanner.
8. (Production) `docker compose` + `eclat:create-admin`.

---

## Hatua 1 — Unda Supabase project

1. Ingia [supabase.com](https://supabase.com) → **New project**.
2. Chagua organization, **jina la project**, na **region** iliyo karibu na watumiaji wako (mfano `eu-central-1`).
3. Weka **Database Password** — hii ni password ya `postgres`. **Ihifadhi mahali salama**; hautaiona tena.
4. Subiri project ijengeke (dakika 1–2).

## Hatua 2 — Chukua connection details

Dashboard → **Project Settings → Database → Connection string**.

Tumia **Session pooler** (port `5432`). Badala yake unaweza kutumia **Direct connection** (`db.<project-ref>.supabase.co:5432`) ikiwa mtandao wako unaruhusu IPv6.

| Kipengele | Thamani |
| --- | --- |
| Host | `aws-0-<region>.pooler.supabase.com` (nakili halisi kutoka dashboard) |
| Port | `5432` (session pooler) |
| Database | `postgres` |
| Username | `postgres.<project-ref>` |
| Password | ile uliyoweka Hatua 1 |
| SSL | `require` |

**Usitumie transaction pooler (port 6543)** na Laravel: inavunja prepared statements (`prepared statement "..." already exists`).

> Unaweza pia kubandika connection string nzima kwenye `DB_URL=postgresql://...` badala ya kuweka `DB_HOST`/`DB_PORT`/nk. Usichanganye zote mbili.

## Hatua 3 — Washa `pdo_pgsql` kwenye PHP

PHP 8.3 ina `php_pdo_pgsql.dll` tayari, lakini mara nyingi imezimwa.

**Laragon (Windows):** fungua `C:\laragon\bin\php\php-8.3...\php.ini`, tafuta na uondoe `;` mbele ya:

```ini
extension=pdo_pgsql
extension=pgsql
```

Kisha restart Laragon (au PHP-FPM/`artisan serve`). Hakikisha:

```bash
php -m | grep -i pgsql
# pdo_pgsql
# pgsql
```

Kama hujaiongeza, unaweza kufanya majaribio ya haraka kwa:

```bash
php -d extension=pdo_pgsql -d extension=pgsql artisan ...
```

**Linux/Docker:** washa `pdo_pgsql` kwenye `php.ini` au tumia `docker-php-ext-install pdo_pgsql` (Dockerfile ya mradi tayari imewekwa).

## Hatua 4 — Endesha schema

Dashboard → **SQL Editor → New query** → bandika **yaliyomo yote** ya:

```
backend/database/supabase/schema.sql
```

→ **Run**.

Faili hili:

- linaunda majedwali yote (`users`, `events`, `guests`, `check_in_logs`, `message_dispatches`, `personal_access_tokens`, `app_settings`, `audit_logs`);
- linaweka constraints, foreign keys na indexes sawa na migrations;
- linajaza jedwali la `migrations` ili Laravel lijue schema ni ya sasa;
- linawasha **Row Level Security (RLS)** kwenye kila jedwali.

Kila kitu kiko ndani ya `begin; ... commit;` — kama kuna error, hakuna kilichobadilika.

**Muhimu:**

- Usiendeshe `schema.sql` kwenye project yenye majedwali tayari. Kwa project safi pekee.
- **Usiendeshe `php artisan migrate`** baada ya `schema.sql`: ledger imejazwa, kwa hivyo `migrate` itasema “Nothing to migrate”. Hii ni sahihi. Migration mpya utakazoongeza baadaye zitaendelea kawaida.
- Kama ulishaendesha `migrate` kwa bahati mbaya, hakuna madhara — ila usiendeshe tena `schema.sql` juu yake.

## Hatua 5 — Weka `.env`

```bash
cd backend
cp .env.example .env
php artisan key:generate
```

Hariri `.env` na uweke thamani kutoka Hatua 2:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.YOUR_PROJECT_REF
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_SSLMODE=require
```

> Kama password ina alama maalum (mfano `#`), iweke ndani ya quotes: `DB_PASSWORD="P@ss#word"`. Alama `#` nje ya quotes inaanza comment.

Jaribu muunganisho:

```bash
php artisan migrate:status
```

Unapaswa kuona migrations zote zikiwa `Ran`.

## Hatua 6 — Seed demo data

```bash
php artisan db:seed
```

Hii inaunda: super admin, organizer, events 4, guests, check-in logs na ushers.

| Role | E-mail | Password |
| --- | --- | --- |
| Super admin | `admin@eclat.app` | `password` |
| Organizer | `organizer@eclat.app` | `password` |
| Usher (event 1) | `usher@eclat.app` | `2348000000001` (mara ya kwanza, lazima abadilishe) |

Kama tayari umeseed na unataka kuanza upya, **tu** kwenye database ya demo:

```bash
php artisan migrate:fresh --seed
```

⚠️ Hii inafuta majedwali na data yote ya database hiyo. Usiendeshe kwenye production.

## Hatua 7 — Endesha mfumo

```bash
# API
php artisan serve --host=0.0.0.0 --port=8000

# Admin (terminal nyingine)
cd admin && npm install && npm run dev      # http://localhost:5173

# Usher scanner (terminal nyingine)
cd usher-app && npm install && npx expo start
```

Usher app haihitaji server URL: inagundua API yenyewe kupitia `GET /api/ping`. Kwa build ya production weka `EXPO_PUBLIC_API_URL` kwenye `eas.json` (tazama README kuu).

## Hatua 8 — Production (Docker)

```bash
cp .env.production.example .env.production
# jaza DB_* (Supabase), APP_KEY, APP_URL, FRONTEND_URL,
# SANCTUM_STATEFUL_DOMAINS, MAIL_* na WHATSAPP_*

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

docker compose --env-file .env.production -f docker-compose.prod.yml exec app \
  php artisan eclat:create-admin --name="Jina Lako" --email=we@example.com
```

Entrypoint ya container inasubiri Postgres ipatikane (SSL ikiwemo), kisha inacache config/routes/views na kuendesha `php artisan migrate --force`. Kwa kuwa ledger imejazwa na `schema.sql`, hii ni no-op — ni salama kurudia kwa kila restart.

Hakuna MySQL container tena: database ni ya Supabase (nje ya Docker).

---

## RLS: kwa nini Supabase keys hazioni data

`schema.sql` inawasha RLS bila policy yoyote. Maana yake:

- **anon / authenticated keys** za Supabase (zinazotumika na `supabase-js`) **hazisomi wala haziandiki** majedwali haya — ni kizuizi cha usalama kwa bahati mbaya ya kufichua keys.
- **Laravel** inaunganisha kama mmiliki wa majedwali (`postgres`), ambaye RLS inamruhusu — kwa hivyo API yako inafanya kazi kawaida.

Kama siku moja utaongeza app inayotumia `supabase-js`, utahitaji kuandika policies kwa makusudi. Kwa sasa **hifadhi `service_role` key kama secret** na usiitumie kwenye browser.

---

## Shida zinazojulikana na suluhisho

| Dalili | Sababu | Suluhisho |
| --- | --- | --- |
| `could not find driver` | `pdo_pgsql` haijawashwa | Hatua 3, kisha restart PHP |
| `SSL connection is required` / `no pg_hba.conf entry` | SSL haijatumwa | `DB_SSLMODE=require` |
| `prepared statement "..." already exists` | Transaction pooler (6543) | Tumia session pooler / direct, port `5432` |
| `SQLSTATE[22P02] invalid input syntax for type uuid` | Token ya QR isiyo UUID | Sasisha code (scope `whereQrToken` ipo tayari); hii ni ishara unatumia nakala ya zamani |
| `TypeError: ... PostgreSQL ...` wakati wa seed | Column `is_vip = 1` kwenye code ya zamani | Postgres ni boolean: tumia code ya sasa (`CASE WHEN is_vip THEN 1 ELSE 0 END`) |
| Login inashindikana kwa e-mail iliyoandikwa kwa herufi kubwa | Postgres ni case-sensitive | Code ya sasa inanormalize e-mail kwa lowercase; data ya zamani ya MySQL inahitaji `lower(email)` |
| `relation "..." does not exist` | `schema.sql` haikuendeshwa | Endesha Hatua 4 kwenye SQL Editor |
| `Nothing to migrate` | Ledger imejazwa | Sahihi — schema ipo tayari |
| Connection inachelewa sana mara ya kwanza | Free tier inapause project isipotumika siku 7 | Fungua dashboard kwanza; jaribu tena |
| `password authentication failed` | Password/username si sahihi | Nakili tena; username ya pooler ni `postgres.<ref>` |
| `tenant/user postgres.<ref> not found` | Region ya pooler si sahihi (mf. umejaza `eu-central-1` badala ya region ya project) | Tumia host **halisi** inayoonyeshwa kwenye dashboard, mf. `aws-0-eu-central-2.pooler.supabase.com` |
| `could not translate host name` / connection inashindikana kwa `db.<ref>.supabase.co` | Direct connection ni IPv6 pekee, mtandao wako hauna IPv6 | Tumia **Session pooler** (ina IPv4) |
| Muda usio sahihi kwenye logs | Timestamps hazina timezone | Weka `APP_TIMEZONE` (mfano `Africa/Lagos`) |

---

## Orodha ya ukaguzi (checklist)

- [ ] Supabase project imeundwa, password imehifadhiwa
- [ ] Connection string (session pooler, 5432) imenakiliwa
- [ ] `php -m` inaonyesha `pdo_pgsql`
- [ ] `schema.sql` imeendeshwa bila error kwenye SQL Editor
- [ ] `backend/.env` ina DB_* sahihi na `APP_KEY`
- [ ] `php artisan migrate:status` inaonyesha migrations zote `Ran`
- [ ] `php artisan db:seed` imefanikiwa
- [ ] Admin web inaingia kwa `organizer@eclat.app`
- [ ] Usher scanner inaingia na kufanya check-in (VALID → ALREADY CHECKED IN)
- [ ] Production: `eclat:create-admin` imeundwa na admin wa kwanza
