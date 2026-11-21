# Éclat API Contract

Base URL: `{APP_URL}/api` — JSON only. Auth uses Laravel Sanctum bearer tokens.

All timestamps are ISO 8601 (`2026-11-08T18:42:00+01:00`). Dates are `YYYY-MM-DD`, times are `HH:mm` (24h).

## Envelope conventions

- Single resource: the resource object at the top level (e.g. `{ "id": 1, ... }`).
- Collections: `{ "data": [ ... ] }`.
- Validation errors: `422 { "message": "...", "errors": { "field": ["..."] } }`.
- Unauthenticated: `401 { "message": "Unauthenticated." }`.
- Missing resource: `404 { "message": "Not found." }`.

## Domain objects

### User
```json
{
  "id": 1,
  "name": "Amara Okafor",
  "email": "organizer@eclat.app",
  "role": "organizer",
  "status": "active",
  "must_change_password": false,
  "event_id": null,
  "device_id": null
}
```
`role` is one of `super_admin`, `organizer`, `usher`. `status` is `active` or `suspended`. Ushers carry the `event_id` their scanner account is scoped to and the `device_id` assigned by the organizer. `must_change_password` is `true` for organizer and usher accounts provisioned without a password until they replace the phone-number password at first sign-in.

### Usher account
```json
{
  "id": 8,
  "name": "Main Gate",
  "email": "usher@eclat.app",
  "phone": "+234 800 000 0001",
  "device_id": "USHER-01",
  "device_label": "GATE-01",
  "status": "active",
  "event_id": 1,
  "calling_enabled": true,
  "must_change_password": false,
  "scan_count": 25,
  "last_scan_at": "2026-11-08T18:40:00+01:00",
  "created_at": "2026-11-06T09:12:00+01:00"
}
```
Usher accounts are ordinary user accounts managed by the organizer. They sign in from the scanner app with their **gate label** and password (email still works as a fallback), and never expose token fields. `calling_enabled` tells the app whether to show the Calls tab. Suspending or deleting the account revokes all of its sessions.

### E-card config
```json
{
  "template": "noir",
  "bg_color": "#0B1120",
  "accent_color": "#C084FC",
  "text_color": "#F8FAFC",
  "name_y": 46,
  "qr_position": "bottom-center",
  "qr_size": 132
}
```
Constraints: `bg_color`, `accent_color`, `text_color` are hex `#RRGGBB`; `name_y` integer 20–80 (percent from top); `qr_position` is `bottom-left` | `bottom-center` | `bottom-right`; `qr_size` integer 88–180 (px at 480px preview width).

### Event
```json
{
  "id": 1,
  "title": "Adaeze & Tunde's Wedding",
  "category": "wedding",
  "host_name": "The Adeyemis",
  "event_date": "2026-12-12",
  "start_time": "16:00",
  "venue": "The Grand Ballroom, Eko Hotel, Lagos",
  "total_seats": 220,
  "total_tables": 22,
  "description": "",
  "accent_color": "#C084FC",
  "invitation_status": "draft",
  "ecard_config": { "...": "see above" },
  "guest_count": 48,
  "vip_count": 6,
  "sent_count": 36,
  "checked_in_count": 12,
  "created_at": "2026-11-01T09:00:00+01:00",
  "updated_at": "2026-11-01T09:00:00+01:00"
}
```
`category` is one of `wedding`, `engagement`, `birthday`, `graduation`, `conference`, `gala`, `kitchen-party`, `send-off`, `seminar`, `other`.
`invitation_status` is `draft` or `live` (set to `live` automatically on first successful dispatch).

### Guest
```json
{
  "id": 7,
  "event_id": 1,
  "name": "Ada Nwosu",
  "phone": "+234 803 555 0117",
  "email": "ada@example.com",
  "table_number": 4,
  "seat_number": 2,
  "is_vip": true,
  "status": "pending",
  "qr_token": "2b0f3f0e-8a8f-4c1e-b5f1-4a9f6a1c2d33",
  "invitation_url": "https://app.example/i/2b0f3f0e-...",
  "checked_in_at": null,
  "created_at": "2026-11-02T10:00:00+01:00"
}
```
`status` is `pending`, `sent`, `checked_in`, or `cancelled`. Guests with `checked_in` status keep the badge even after dispatch.

### Check-in log
```json
{
  "id": 101,
  "event_id": 1,
  "guest_id": 7,
  "guest_name": "Ada Nwosu",
  "table_number": 4,
  "usher_id": 3,
  "usher_name": "Gate 01",
  "device_id": "USHER-01",
  "validation_status": "valid",
  "token_attempted": "2b0f3f0e-...",
  "scanned_at": "2026-11-08T18:42:00+01:00"
}
```
`validation_status` is `valid`, `already_checked_in`, or `denied`. `guest_name`/`table_number` may be `null` when the token is unknown.

## Public

### GET `/api/ping`
No authentication. Used by the scanner app to confirm it is talking to the right server before sign-in.
Response `200`:
```json
{ "app": "Éclat", "service": "Gate API", "status": "ok", "time": "2026-11-15T09:30:00+03:00" }
```
Any other JSON shape means the URL points at a different service.

## Auth

### POST `/api/auth/login`
Body: `{ "login": "GATE-01", "password": "..." }` — `login` may be a gate label or an e-mail; `email` is accepted as an alias and one of the two is required.
Response `200`: `{ "token": "1|plaintext...", "user": User, "event": Event | null }`

Every role signs in here, including ushers from the scanner app. Gate accounts sign in with their label; `event` is populated only for ushers and is the single event their account is scoped to. Only active accounts with a valid assignment authenticate: suspended accounts and ushers without an event return `403` and receive no token; wrong credentials return `422`. Login is throttled to 5 attempts per minute per identifier + IP (`429` after that). An usher sign-in revokes that account's earlier tokens, so only one gate session stays active.

New organizer and usher accounts are created without a password: the initial password is the digit-only phone number on the account, and `must_change_password` is `true`. While that flag is set, every authenticated endpoint except `/api/auth/me`, `/api/auth/logout`, and `/api/auth/password` returns:

```
403 { "message": "Set a new password before continuing.", "code": "password_change_required" }
```

### GET `/api/auth/me` (auth)
Response `200`: `{ "user": User, "event": Event | null }`
`event` is populated only for ushers and is the single event their account is scoped to. `user.must_change_password` tells the client whether to open the forced password screen.

### PATCH `/api/auth/account` (auth)
Updates the signed-in organizer or super-admin console account.
```json
{ "name": "Amina Hassan", "email": "amina@example.com", "phone": "+255 754 000 000" }
```
`name` and `email` are required; `email` must be unique across users (the account's own address is allowed). `phone` is optional and is left untouched when omitted. Response `200`: `{ "user": User }`. Duplicate e-mail returns `422`. Ushers use `POST /api/auth/profile` instead; any other role receives `403`.

### POST `/api/auth/password` (auth)
```json
{ "current_password": "2348012345678", "password": "NewPassw0rd!", "password_confirmation": "NewPassw0rd!" }
```
`password` must be at least 8 characters, differ from `current_password`, and match the confirmation. Available to every role, including ushers completing their first sign-in. Response `200`: `{ "user": User }` with `must_change_password: false`. Wrong current password returns `422 { "message": "...", "errors": { "current_password": ["..."] } }`. All other bearer tokens for the account are revoked on success.

### POST `/api/auth/logout` (auth)
Deletes the bearer token used for the request. Response `204`; reusing that token afterwards returns `401`. The scanner app also removes the token from SecureStore.

## Dashboard

### GET `/api/dashboard` (auth)
```json
{
  "metrics": {
    "total_events": 4,
    "total_capacity": 1000,
    "total_guests": 274,
    "cards_sent": 211,
    "checked_in": 38,
    "vip_guests": 31
  },
  "recent_check_ins": [ CheckInLog, ... ]
}
```
Metrics are scoped to the authenticated organizer. Super admins use `GET /api/admin/overview` instead (guest-level data stays private); ushers cannot call this endpoint.

## Events

### GET `/api/events` (auth)
Query (optional): `search`, `category`.
Response `200`: `{ "data": [ Event, ... ] }` ordered by `event_date` ascending.
Organizers receive only their own events; a usher receives exactly the one event bound to their account. Super admins receive `403` — event and guest data is organizer-private.

### POST `/api/events` (auth)
```json
{
  "title": "Adaeze & Tunde's Wedding",
  "category": "wedding",
  "host_name": "The Adeyemis",
  "event_date": "2026-12-12",
  "start_time": "16:00",
  "venue": "The Grand Ballroom, Eko Hotel, Lagos",
  "total_seats": 220,
  "total_tables": 22,
  "description": "",
  "accent_color": "#C084FC"
}
```
Required: `title`, `category`, `host_name`, `event_date`, `start_time`, `venue`, `total_seats`, `total_tables`.
Response `201`: Event. A default `ecard_config` is generated (disabled=no). No guests are created.

### GET `/api/events/{event}` (auth)
Response `200`: Event.

### PUT/PATCH `/api/events/{event}` (auth)
Any subset of the create fields plus `invitation_status` and `ecard_config` (partial config merge allowed). Response `200`: Event.

### DELETE `/api/events/{event}` (auth)
Cascades guests and logs. Response `204`.

### GET `/api/events/{event}/stats` (auth)
```json
{
  "guests": 48, "vip": 6, "sent": 36, "checked_in": 12, "pending": 12,
  "tables": 22, "seats": 220, "seats_filled": 48,
  "invitation_rate_pct": 75, "check_in_rate_pct": 25, "capacity_used_pct": 22,
  "by_table": [{ "table_number": 1, "guests": 4 }]
}
```

### POST `/api/events/{event}/send` (auth)
Body: `{ "channel": "whatsapp" | "email", "guest_ids": [1,2] }`
`guest_ids` optional; omitted means every guest whose status is `pending`.
Response `200`: `{ "sent": 12, "skipped": 0, "event": Event }`
Sets guest status to `sent` (never downgrades `checked_in`), sets event `invitation_status` to `live`, writes dispatch audit rows.

## Guests

### GET `/api/events/{event}/guests` (auth)
Query (optional): `search`, `status` (`pending|sent|checked_in|cancelled`).
Response `200`: `{ "data": [ Guest, ... ] }` ordered by name.

### POST `/api/events/{event}/guests` (auth)
```json
{ "name": "Ada Nwosu", "phone": "+234...", "email": "ada@example.com", "table_number": 4, "seat_number": 2, "is_vip": true }
```
Required: `name`. Optional: `phone`, `email`, `table_number`, `seat_number`, `is_vip`, `status` (`pending` default).
Response `201`: Guest (a unique `qr_token` UUID is generated server-side). Assigning a table that is already full returns `422` with `errors.table_number`; bulk import still imports the row and flags the table as over capacity for review.

### PUT/PATCH `/api/guests/{guest}` (auth)
Any guest field except `qr_token` / `event_id`. Moving a guest onto a full table (or increasing seats beyond its remaining capacity) returns `422`; edits that do not change seating are always allowed. Response `200`: Guest.

### DELETE `/api/guests/{guest}` (auth)
Response `204`.

### POST `/api/events/{event}/guests/import/analyze` (auth, multipart)
Field `file`: `.xlsx`, `.csv` or `.txt` up to 8 MB. Rows are matched against the event list on phone or email and never written.
Response `200`:
```json
{
  "summary": { "total_rows": 42, "new": 34, "duplicates": 6, "invalid": 2 },
  "rows": [
    { "line": 2, "status": "new", "data": { "...": "..." } },
    { "line": 3, "status": "duplicate", "data": { "...": "..." }, "match": { "id": 9, "name": "Ada Nwosu" },
      "fields": [{ "key": "phone", "label": "Phone", "current": "+255...", "incoming": "+255..." }] },
    { "line": 4, "status": "invalid", "data": { "...": "..." }, "issues": ["name is required"] }
  ],
  "errors": []
}
```

### POST `/api/events/{event}/guests/import/apply` (auth)
```json
{ "rows": [ { "line": 2, "action": "create", "data": { "...": "..." } },
            { "line": 3, "action": "update", "guest_id": 9, "data": { "...": "..." }, "fields": ["phone"] },
            { "line": 4, "action": "skip" } ] }
```
`create` adds a guest and is also how the review UI keeps both records for a duplicate; `update` merges only the listed `fields` (blank cells never erase stored values); `skip` ignores the row. Response `200`: `{ "created": 1, "updated": 1, "skipped": 1, "failed": 0, "errors": [] }`.

### GET `/api/guests/import/template` (auth, organizer or super admin)
Downloads the CSV import template with the accepted headers.

### POST `/api/guests/{guest}/send` (auth)
Body: `{ "channel": "whatsapp" | "sms" | "email" }`. Response `200`: `{ "guest": Guest, "message": "Hi Ada, you're invited to ..." }`. SMS uses the Kilakona gateway configured in platform settings; the log driver records deliveries without contacting the provider.

## E-cards & public invitations

### GET `/api/invitations/{qr_token}` (public)
Response `200`:
```json
{ "guest": Guest, "event": Event, "ecard_config": { ... }, "ecard_svg_url": "https://.../api/invitations/{token}/ecard.svg" }
```

### GET `/api/invitations/{qr_token}/ecard.svg` (public)
Response `200`, `Content-Type: image/svg+xml`. Portrait 480×680 SVG e-card that reproduces the organizer's studio design: the palette and template from `ecard_config`, the monogram, the event description below the venue (clamped to two lines), glows, guest name at `name_y`, table/seat, and the QR at `qr_position`/`qr_size` encoding `{APP_URL}/i/{qr_token}`. The studio webfonts are embedded so downloads keep their typography offline.

Add `?download=1` to receive the file as an attachment (`Content-Disposition: attachment; filename="..."`). The portal's download button uses this.

### GET `/api/invitations/{qr_token}/qr.png` (public)
Response `200`, `Content-Type: image/png`, 720×720. Scannable QR whose payload is the guest portal, `{APP_URL}/i/{qr_token}`. Distribution sends this image after the WhatsApp message text and embeds it in the invitation e-mail, so scanning it opens the portal where the e-card can be viewed and downloaded. The scanner token normaliser extracts the token from this URL, so the same code still verifies at the gate.

### GET `/i/{qr_token}` (public, web)
Guest portal: renders the studio-accurate e-card, event details, and a prominent **Download e-card** button (SVG attachment). This is the destination of both the distribution QR and the QR printed on the card.

## Design studio & approvals

Every event keeps a versioned design history. A design is either a studio configuration or an uploaded SVG/PNG/JPG artwork. Invitations cannot be sent while the newest version is a draft, awaiting approval, or returned for changes; approval also copies the version config onto `events.ecard_config`, and the renderer uses the approved artwork as the e-card background with the guest name and live QR overlaid.

### GET `/api/templates` (auth — organizer or super admin)
Query (optional): `category`, `search`. Returns `{ data: [Template], categories: [...] }`. Every staff account can reuse the shared library; `Template.owned` tells the UI whether the caller may edit or delete it.

### POST `/api/templates` (multipart: `name`, `category`, `file`)
`file` accepts SVG, PNG, or JPG up to `eclat.design_max_upload_kb`. SVGs containing scripts, event handlers, or `javascript:` are rejected with `422`. The binary is stored inline (`file_data`) so no host filesystem is required.

### PATCH/DELETE `/api/templates/{template}`
Owner only (uploader). Other organizers receive `403`; super admins may manage their own uploads.

### GET `/api/templates/{template}/file` (signed URL)
Serves the stored artwork inline with `nosniff` and a sandbox CSP. Unsigned requests are rejected. `Template.file_url` is a 12-hour signed URL.

### GET `/api/events/{event}/designs` (auth — event owner)
```json
{
  "event": Event,
  "has_workflow": true,
  "sending_allowed": false,
  "latest": Design,
  "approved": Design,
  "pending": Design,
  "approval_url": "https://.../#/d/{approval_token}",
  "versions": [Design, ...]
}
```
`Design` carries `id`, `version`, `status`, `format`, `original_name`, `template`, `config`, `file_url`, `approved_at`, `approved_by_name`, `feedback`, `created_by`, `created_at`, `can_edit`, `needs_resubmit`.

### POST `/api/events/{event}/designs/template` — `{ template_id, config? }`
### POST `/api/events/{event}/designs/upload` — multipart `file`, `config` (JSON string)
### POST `/api/events/{event}/designs/config` — `{ config }`
Each creates a new draft version (`201`). `POST /api/events/{event}/designs/{design}/submit` moves a draft or returned version to `pending_approval`, rotates the 64-character `approval_token`, supersedes any other pending version, and returns `{ design, approval_url }`.

Saving an edited studio design after an approval automatically opens a new draft version, so sending re-locks until the customer approves the change.

### GET `/api/design-previews/{token}` (public)
`{ design, event, can_decide }`. The token is the random approval token, so customers review without an account.

### POST `/api/design-previews/{token}` (public)
```json
{ "action": "approve|changes", "name": "Amina Hassan", "comment": "optional; required when action=changes" }
```
Approval supersedes older approvals, stamps `approved_by_name`/`approved_at`, applies the version config to the event, and re-enables sending. Requesting changes marks the version `rejected` with feedback; the organizer can edit and resubmit. A token whose version has already been decided returns `422` on further decisions.

### GET `/api/design-previews/{token}/file` (public)
Serves the uploaded artwork inline for the review page. Studio-config-only versions render through `EcardPreview` instead (`file_url` is `null`).

## Check-in (usher scanner)

### POST `/api/check-in/verify` (auth — organizer or usher)
```json
{ "token": "2b0f3f0e-...", "device_id": "USHER-01", "event_id": 1 }
```
`event_id` is optional and only used by organizers scanning directly from the admin (it must be an event they own). A usher's event is taken from their account binding and cannot be overridden: a QR belonging to another event returns `DENIED` with “This pass belongs to a different event.” Super admins receive `403`.
Response `200` (validation outcome, never an exception for a bad token):
```json
{
  "status": "VALID",
  "message": "Welcome, Ada Nwosu. Table 4.",
  "guest": Guest | null,
  "event": Event | null,
  "table_number": 4,
  "checked_in_at": "2026-11-08T18:42:00+01:00"
}
```
`status`: `VALID` (first successful scan, guest marked checked-in atomically), `ALREADY_CHECKED_IN` (duplicate scan, no state change), `DENIED` (unknown/cancelled/foreign-event token — logged with `validation_status: denied`). Every scan writes a `check_in_logs` row with the acting usher, device id, and attempted token.

### GET `/api/events/{event}/check-ins` (auth)
Query (optional): `status` (`valid|already_checked_in|denied`), `limit` (default 100, max 500).
Response `200`:
```json
{ "data": [ CheckInLog, ... ], "stats": { "valid": 120, "denied": 3, "duplicate": 5 } }
```
Ordered newest first. Each log exposes `scanned_at` and `validation_status` separately so the UI can show both the scan time and the outcome.

### GET `/api/gate/stats` (auth — usher only)
Response `200`:
```json
{
  "event": Event,
  "stats": { "valid": 25, "duplicate": 3, "denied": 1, "scans": 29, "checked_in": 120, "guests": 250 },
  "recent": [ CheckInLog, ... ]
}
```
Totals cover only the authenticated usher's own scans, so each gate sees its own throughput. `recent` is the latest 10 scans at that gate. Organizers and super admins receive `403`.

## Gate accounts (organizer)

Created from **Event Studio → Gate & ushers** or the **Gate accounts** page. A gate account is a real user account (`role: usher`) bound to one event, provisioned with only a **gate label** and a **password**. Any person at that gate signs in with the shared label/password and must then complete `POST /api/auth/profile` with their own full names (three names), phone number and e-mail before scanning. No gate tokens are ever issued.

### Organizer-wide directory

These endpoints manage gate accounts across every event owned by the authenticated organizer. They return `403` for super admins and ushers, and `404` for an account attached to another organizer's event.

#### GET `/api/ushers` (auth — organizer)
Response `200`: `{ "data": [ GateAccount, ... ], "events": [ { "id": 1, "title": "...", "event_date": "2026-11-21", "invitation_status": "live" } ], "stats": { "total": 4, "active": 3, "suspended": 1, "assigned": 4, "scans": 29 } }`. A gate account includes `event_title`, `calling_enabled`, `scan_count` and `last_scan_at`.

#### POST `/api/ushers` (auth — organizer)
Body: `{ "event_id": 1, "device_label": "GATE-01", "password": "gate-2026", "calling_enabled": false }`. `event_id` must be one of the organizer's events. The label is unique across gate accounts (case-insensitive) and the password must be at least 6 characters. Response `201`: `{ "usher": GateAccount }`.

#### PATCH `/api/ushers/{usher}` (auth — organizer)
Body: `{ "device_label": "GATE-02", "password": "new-secret" }` — `password` is optional; omit it to keep the current password. Setting a password revokes the scanner's active sessions.

#### PATCH `/api/ushers/{usher}/status` (auth — organizer)
Body: `{ "status": "active" | "suspended" }`. Suspending revokes the usher's sessions immediately and releases their calling allocations for the current event.

#### DELETE `/api/ushers/{usher}` (auth — organizer)
Permanently deletes the gate account, its tokens and its event assignments. Scan logs keep their rows with a `null` usher. Response `204`.


### GET `/api/events/{event}/ushers` (auth — organizer owner)
Response `200`: `{ "data": [ Usher, ... ], "stats": { "total": 2, "active": 2, "scans": 31 } }`
Each usher includes `scan_count` and `last_scan_at`.

### POST `/api/events/{event}/ushers` (auth — organizer owner)
Body: `{ "device_label": "GATE-01", "password": "gate-2026", "calling_enabled": false }`.
The label must be unique across gate accounts (case-insensitive) and the password must be at least 6 characters. `calling_enabled` is optional.
Response `201`: `{ "usher": Usher }` with `email` and `phone` null until the first person signs in and completes their profile.

### POST `/api/events/{event}/ushers/assign` (auth — organizer owner)
Body: `{ "device_label": "GATE-01", "calling_enabled": false }`. Reuses an existing gate account on another event; its previous active event is ended and its tokens are revoked. When the account is moved from another event the password is regenerated and returned once so the organizer can share it: `{ "usher": Usher, "moved_from": "Old event", "credentials": { "device_label": "GATE-01", "password": "…" } }` (`credentials` is `null` for a first-time assignment).

### PATCH `/api/events/{event}/ushers/{usher}` (auth — organizer owner)
Body: `{ "device_label": "GATE-02", "password": "new-secret" }` — `password` is optional; omit it to keep the current password.

### DELETE `/api/events/{event}/ushers/{usher}/account` (auth — organizer owner)
Permanently deletes the gate account and its tokens. Scan logs keep their rows with a `null` usher. Response `204`.

### PATCH `/api/events/{event}/ushers/{usher}/status` (auth — organizer owner)
Body: `{ "status": "active" | "suspended" }`. Response `200`: `{ "usher": Usher }`.
Suspending revokes the usher's sessions immediately, so the scanner app can no longer scan until reactivated.

### DELETE `/api/events/{event}/ushers/{usher}` (auth — organizer owner)
Ends this event's assignment only; the reusable gate account and its scan/calling history stay intact. Response `204`.

## Calling operations

Pending guests are distributed equally across calling participants — calling-enabled ushers plus the organizer when opted in. A participant is a real organizer or usher account; there is no separate caller role.

Outcomes: `confirmed`, `not_confirmed`, `no_answer`, `busy`, `phone_off`, `wrong_number`, `call_back_later`. `confirmed` and `not_confirmed` update the guest's `confirmation_status` (`confirmed`/`declined`, source `call`) and `wrong_number` closes the allocation. Other outcomes keep it assigned. `call_back_later` requires `follow_up_at`. Every attempt is kept with participant, timestamp, outcome and notes even after a guest is reassigned.

### GET `/api/events/{event}/calling` (auth — organizer owner)
Response `200`:
```json
{
  "organizer_opt_in": true,
  "organizer": { "user_id": 1, "name": "Amara Okafor", "kind": "organizer", "stats": { ... } },
  "participants": [ { "user_id": 5, "name": "Gate 03", "kind": "usher", "stats": { ... } } ],
  "totals": { "guests_to_call": 42, "allocated": 42, "unallocated": 0, "called": 3, "confirmed": 1, "follow_ups_due": 0 },
  "allocations": [ Allocation, ... ],
  "follow_up_days": 2
}
```
Each `stats` block: `assigned`, `called`, `confirmed`, `unresponsive`, `pending`, `follow_ups_due`, `completion`. Each `Allocation` includes `history` (latest 20 attempts with `outcome_label`, `notes`, `user`, `at`), and `participant_user_id` is `null` when the guest sits in the unallocated pool.

### POST `/api/events/{event}/calling/opt-in` (auth — organizer owner)
Body `{ "enabled": true }`. Adds or removes the organizer as a calling participant. Returns the overview above.

### POST `/api/events/{event}/calling/allocate` (auth — organizer owner)
Body `{}`. Distributes every unallocated pending guest evenly by current load, including pooled guests returned by disabled/removed participants. Response `200`: overview plus `assigned` (count). `0` when nothing is left to allocate.

### PATCH `/api/events/{event}/calling/allocations/{allocation}` (auth — organizer owner)
Body `{ "participant_user_id": 5 }`, or `null` to return the guest to the pool. Response `200`: `{ "allocation": Allocation }`.

### POST `/api/events/{event}/calling/allocations/{allocation}/attempt` (auth — organizer owner)
Body `{ "outcome": "call_back_later", "notes": "…", "follow_up_at": "2026-11-24 10:00:00" }`. Response `200`: `{ "allocation": Allocation }` with history.

### GET `/api/calling/mine` (auth — usher)
The usher's own queue for their assigned event:
```json
{
  "event": { "id": 3, "title": "…", "event_date": "2026-11-15", "start_time": "18:00", "venue": "…" },
  "stats": { "assigned": 21, "called": 3, "confirmed": 1, "unresponsive": 0, "pending": 19, "follow_ups_due": 0, "completion": 14 },
  "allocations": [ Allocation, ... ],
  "follow_up_days": 2
}
```
Guests expose only name, phone, card type, attendee count, table and confirmation status. `403` when calling is not enabled for this gate.

### POST `/api/calling/allocations/{allocation}/attempt` (auth — usher)
Same body/response as the organizer attempt route, limited to allocations assigned to the authenticated usher on their current event. `403` for another participant's guest or when calling is disabled; `404` for allocations outside the usher's event; `422` for invalid outcomes or a missing `follow_up_at`.

## Reports

### GET `/api/events/{event}/reports` (auth — event organizer)
One payload covering the general event report and the confirmed guest register. `403` for non-owners.
```json
{
  "event": { "id": 1, "title": "…", "host_name": "…", "organizer": { "name": "…" }, "event_date": "2026-11-21", "start_time": "14:33", "start_time_label": "2:33 PM", "venue": "…", "invitation_status": "live", "accent_color": "#C084FC" },
  "generated_at": "2026-11-21T19:30:00+01:00",
  "totals": { "guests": 64, "seats": 64, "invited": 47, "checked_in": 12, "cancelled": 0 },
  "confirmations": { "confirmed": 1, "pending": 63, "declined": 0, "sources": [ { "source": "call", "label": "Recorded by call", "total": 1 } ] },
  "distribution": { "whatsapp": { "label": "WhatsApp", "sent": 31, "failed": 0, "queued": 0, "total": 31 }, "email": { … }, "sms": { … } },
  "calling": { "participants": [ { "name": "…", "kind": "organizer" } ], "allocated": 63, "completed": 1, "follow_ups_due": 0, "attempts": 1, "outcomes": [ { "value": "confirmed", "label": "Confirmed", "total": 1 } ] },
  "attendance": { "scans": 17, "valid": 12, "already_checked_in": 3, "denied": 2 },
  "tables": { "tables": 22, "capacity": 220, "guests": 60, "seats": 60, "over_capacity_tables": 0, "unassigned_guests": 4, "unassigned_seats": 4, "rows": [ … ] },
  "ushers": [ { "id": 8, "name": "…", "label": "GATE-01", "status": "active", "scans": 17, "last_scan_at": "…" } ],
  "confirmed_guests": [ { "id": 5, "name": "…", "phone": "…", "email": "…", "card_type": "vip", "card_type_label": "VIP", "attendees": 1, "table_number": null, "table_label": "TBA", "confirmation_status": "confirmed", "confirmation_source": "call", "confirmation_source_label": "Recorded by call", "confirmed_at": "…", "delivery": ["email"], "delivery_label": "E-mail" } ]
}
```

### GET `/api/events/{event}/reports/pdf` (auth — event organizer)
Downloads the same data as a branded A4 PDF (`Content-Type: application/pdf`, attachment filename `event-report-{title}-{date}.pdf`). The PDF carries Fahari branding and the event's accent colour.

## Platform administration (super admin)

All routes below require the `super-admin` middleware. They never expose guest names, contacts, QR tokens, scans, or event e-cards.

### GET `/api/admin/overview`
Response `200`:
```json
{
  "metrics": {
    "organizers": 4, "organizers_active": 3, "organizers_suspended": 1,
    "events": 12, "events_live": 7, "events_draft": 5, "events_upcoming": 6,
    "ushers": 9, "dispatches": 540, "dispatches_sent": 538, "dispatches_failed": 2,
    "check_ins_valid": 320, "check_ins_duplicate": 18, "check_ins_denied": 6
  },
  "delivery": { "driver": "log", "whatsapp_configured": true, "smtp_configured": false },
  "recent_events": [
    { "id": 1, "title": "...", "host_name": "...", "event_date": "2026-11-08",
      "invitation_status": "live", "accent_color": "#C084FC", "created_at": "...",
      "organizer": { "id": 1, "name": "...", "email": "..." } }
  ],
  "recent_audit": [ AuditLog, ... ]
}
```

### GET `/api/admin/reports`
System-wide reporting:
```json
{
  "generated_at": "…",
  "accounts": { "organizers": 2, "organizers_active": 2, "organizers_suspended": 0, "ushers": 4, "ushers_active": 4 },
  "usage": { "events": 4, "events_live": 4, "events_draft": 0, "events_upcoming": 3, "events_completed": 1, "guests": 314, "guests_confirmed": 1, "guests_declined": 0, "guests_checked_in": 20 },
  "delivery": { "channels": { "whatsapp": { "label": "WhatsApp", "sent": 127, "failed": 0, "queued": 0, "total": 127 }, "email": { … }, "sms": { … } }, "sent": 193, "failed": 0, "queued": 0 },
  "engagement": { "check_ins_valid": 20, "check_ins_duplicate": 5, "check_ins_denied": 4, "check_ins_total": 29, "calling_participants": 1, "calling_allocated": 63, "calling_completed": 1, "calling_attempts": 1, "calling_outcomes": [ … ] },
  "organizers": [ { "id": 1, "name": "…", "email": "…", "status": "active", "events": 4, "guests": 314, "confirmed": 1, "checked_in": 20, "dispatches_sent": 193, "dispatches_failed": 0, "call_attempts": 1 } ],
  "top_events": [ { "id": 3, "title": "…", "organizer": "…", "event_date": "…", "invitation_status": "live", "guests": 112, "confirmed": 0, "checked_in": 0 } ]
}
```

### GET `/api/admin/reports/pdf`
Downloads the system report as a branded A4 PDF (`platform-report-all-accounts-{date}.pdf`). Contains account, usage, delivery, calling and gate aggregates plus organizer performance; no guest PII.

### Organizers

- `GET /api/admin/organizers` → `{ "data": [ { id, name, email, phone, status, events_count, live_events_count, dispatches_count, check_ins_count, last_event_date, created_at } ], "stats": { "total", "active", "suspended" } }`
- `POST /api/admin/organizers` body `{ name, email, phone }` — no password field. `phone` is required and its digits (at least 7) become the initial password; `must_change_password` is set and the organizer must choose a new password at first sign-in → `201 { organizer }`
- `PATCH /api/admin/organizers/{organizer}` body `{ name, email, phone, password? }` — `password` is optional and must be at least 8 characters. When supplied it is set directly (`must_change_password` cleared) and all of the organizer's tokens are revoked, so they must sign in again → `{ organizer }`
- `PATCH /api/admin/organizers/{organizer}/status` body `{ "status": "active" | "suspended" }` → `{ organizer }`; suspending revokes all of the organizer's tokens immediately.
- `DELETE /api/admin/organizers/{organizer}` → `204`; cascades the organizer's events, guests, check-ins, dispatches, and usher accounts.

### GET `/api/admin/audit-logs`
Query (optional): `search`, `action`, `limit` (default 150, max 500).
Response `200`: `{ "data": [ AuditLog, ... ], "actions": ["auth.login", "usher.created", ...] }`
AuditLog: `{ id, action, description, actor_id, actor_name, actor_role, subject_type, subject_id, ip_address, meta, created_at }`. Guest PII is never written to the audit trail.

### GET/PUT `/api/admin/settings`
GET returns `{ "settings": { "groups": [ { "name": "WhatsApp gateway", "fields": [ { "key": "whatsapp.token", "label": "...", "type": "password", "secret": true, "options": null, "hint": "...", "default": null, "value": null, "has_value": true, "source": "database" } ] } ] } }`. Secret values are never returned (`value: null`, `has_value` tells whether one is stored). `delivery_mode` is `log` or `live`.
PUT body: `{ "settings": { "whatsapp.token": "EAA...", "mail.password": null } }`. Only changed keys are needed. For a secret, an empty string keeps the stored value and `null` clears it; for non-secrets, an empty string restores the default. Secrets are encrypted at rest. Response: `{ settings, updated: ["key", ...] }`.
