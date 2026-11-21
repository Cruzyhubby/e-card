-- Éclat — Supabase / PostgreSQL schema
-- Mirrors backend/database/migrations as of 2026-11-21.
--
-- Use this file on a FRESH Supabase project:
--   1. Supabase Dashboard -> SQL Editor -> paste and run this file.
--   2. From backend/: php artisan db:seed
--
-- Do not run `php artisan migrate` on a database created with this file:
-- the migration rows at the bottom tell Laravel that the schema is current.

begin;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists "users" (
    "id" bigserial primary key,
    "name" varchar(255) not null,
    "email" varchar(255) not null,
    "password" varchar(255) not null,
    "must_change_password" boolean not null default false,
    "role" varchar(20) not null default 'organizer',
    "status" varchar(20) not null default 'active',
    "phone" varchar(32) null,
    "device_id" varchar(100) null,
    "device_label" varchar(40) null,
    "remember_token" varchar(100) null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "users" add constraint "users_email_unique" unique ("email");
alter table "users" add constraint "users_device_label_unique" unique ("device_label");
create index if not exists "users_role_index" on "users" ("role");
create index if not exists "users_status_index" on "users" ("status");

create table if not exists "events" (
    "id" bigserial primary key,
    "user_id" bigint not null,
    "title" varchar(255) not null,
    "category" varchar(32) not null,
    "host_name" varchar(255) not null,
    "event_date" date not null,
    "start_time" varchar(5) not null,
    "venue" varchar(255) not null,
    "total_seats" integer not null,
    "total_tables" integer not null,
    "description" text null,
    "accent_color" char(7) not null default '#C084FC',
    "invitation_status" varchar(255) not null default 'draft' check ("invitation_status" in ('draft', 'live')),
    "ecard_config" json null,
    "settings" json null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "events" add constraint "events_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;
create index if not exists "events_event_date_index" on "events" ("event_date");
create index if not exists "events_category_index" on "events" ("category");

alter table "users" add column if not exists "event_id" bigint null;
alter table "users" add constraint "users_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete set null;

create table if not exists "guests" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "name" varchar(255) not null,
    "phone" varchar(32) null,
    "email" varchar(255) null,
    "table_number" integer null,
    "seat_number" integer null,
    "is_vip" boolean not null default false,
    "card_type" varchar(255) not null default 'single' check ("card_type" in ('single', 'double', 'group', 'vip')),
    "attendees_count" smallint not null default 1,
    "confirmation_status" varchar(255) not null default 'pending' check ("confirmation_status" in ('pending', 'confirmed', 'declined')),
    "confirmation_source" varchar(20) null,
    "confirmed_at" timestamp(0) without time zone null,
    "notes" text null,
    "status" varchar(255) not null default 'pending' check ("status" in ('pending', 'sent', 'checked_in', 'cancelled')),
    "qr_token" uuid not null,
    "checked_in_at" timestamp(0) without time zone null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "guests" add constraint "guests_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "guests" add constraint "guests_qr_token_unique" unique ("qr_token");
create index if not exists "guests_event_id_status_index" on "guests" ("event_id", "status");
create index if not exists "guests_event_id_name_index" on "guests" ("event_id", "name");
create index if not exists "guests_event_id_confirmation_status_index" on "guests" ("event_id", "confirmation_status");
create index if not exists "guests_event_id_card_type_index" on "guests" ("event_id", "card_type");

create table if not exists "event_tables" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "number" integer not null,
    "label" varchar(60) null,
    "capacity" integer not null default 0,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "event_tables" add constraint "event_tables_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "event_tables" add constraint "event_tables_event_id_number_unique" unique ("event_id", "number");

create table if not exists "check_in_logs" (
    "id" bigserial primary key,
    "event_id" bigint null,
    "guest_id" bigint null,
    "usher_id" bigint null,
    "device_id" varchar(100) null,
    "token_attempted" varchar(100) null,
    "validation_status" varchar(255) not null check ("validation_status" in ('valid', 'already_checked_in', 'denied')),
    "scanned_at" timestamp(0) without time zone not null,
    "ip_address" varchar(45) null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "check_in_logs" add constraint "check_in_logs_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "check_in_logs" add constraint "check_in_logs_guest_id_foreign" foreign key ("guest_id") references "guests" ("id") on delete set null;
alter table "check_in_logs" add constraint "check_in_logs_usher_id_foreign" foreign key ("usher_id") references "users" ("id") on delete set null;
create index if not exists "check_in_logs_event_id_scanned_at_index" on "check_in_logs" ("event_id", "scanned_at");

create table if not exists "message_dispatches" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "guest_id" bigint null,
    "channel" varchar(255) not null check ("channel" in ('whatsapp', 'email', 'sms')),
    "recipient" varchar(255) not null,
    "status" varchar(255) not null default 'queued' check ("status" in ('queued', 'sent', 'failed')),
    "provider_message_id" varchar(255) null,
    "error" text null,
    "sent_at" timestamp(0) without time zone null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "message_dispatches" add constraint "message_dispatches_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "message_dispatches" add constraint "message_dispatches_guest_id_foreign" foreign key ("guest_id") references "guests" ("id") on delete cascade;
create index if not exists "message_dispatches_event_id_status_index" on "message_dispatches" ("event_id", "status");
create index if not exists "message_dispatches_event_id_channel_index" on "message_dispatches" ("event_id", "channel");

create table if not exists "personal_access_tokens" (
    "id" bigserial primary key,
    "tokenable_type" varchar(255) not null,
    "tokenable_id" bigint not null,
    "name" varchar(255) not null,
    "token" varchar(64) not null,
    "abilities" text null,
    "last_used_at" timestamp(0) without time zone null,
    "expires_at" timestamp(0) without time zone null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "personal_access_tokens" add constraint "personal_access_tokens_token_unique" unique ("token");
create index if not exists "personal_access_tokens_tokenable_type_tokenable_id_index" on "personal_access_tokens" ("tokenable_type", "tokenable_id");
create index if not exists "personal_access_tokens_expires_at_index" on "personal_access_tokens" ("expires_at");

create table if not exists "app_settings" (
    "key" varchar(120) primary key,
    "value" text null,
    "is_secret" boolean not null default false,
    "updated_by" bigint null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "app_settings" add constraint "app_settings_updated_by_foreign" foreign key ("updated_by") references "users" ("id") on delete set null;

create table if not exists "audit_logs" (
    "id" bigserial primary key,
    "actor_id" bigint null,
    "actor_name" varchar(255) null,
    "actor_role" varchar(32) null,
    "action" varchar(80) not null,
    "description" varchar(500) not null,
    "subject_type" varchar(80) null,
    "subject_id" bigint null,
    "ip_address" varchar(45) null,
    "user_agent" varchar(255) null,
    "meta" json null,
    "created_at" timestamp(0) without time zone null
);

alter table "audit_logs" add constraint "audit_logs_actor_id_foreign" foreign key ("actor_id") references "users" ("id") on delete set null;
create index if not exists "audit_logs_action_created_at_index" on "audit_logs" ("action", "created_at");
create index if not exists "audit_logs_created_at_index" on "audit_logs" ("created_at");

-- ---------------------------------------------------------------------------
-- Usher assignments and calling operations
-- ---------------------------------------------------------------------------

create table if not exists "event_usher_assignments" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "user_id" bigint not null,
    "calling_enabled" boolean not null default false,
    "status" varchar(16) not null default 'active',
    "assigned_at" timestamp(0) without time zone null,
    "ended_at" timestamp(0) without time zone null,
    "assigned_by" bigint null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "event_usher_assignments" add constraint "event_usher_assignments_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "event_usher_assignments" add constraint "event_usher_assignments_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;
alter table "event_usher_assignments" add constraint "event_usher_assignments_assigned_by_foreign" foreign key ("assigned_by") references "users" ("id") on delete set null;
create index if not exists "event_usher_assignments_user_id_status_index" on "event_usher_assignments" ("user_id", "status");
create index if not exists "event_usher_assignments_event_id_status_index" on "event_usher_assignments" ("event_id", "status");

create table if not exists "calling_participants" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "user_id" bigint not null,
    "kind" varchar(16) not null default 'usher',
    "active" boolean not null default true,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "calling_participants" add constraint "calling_participants_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "calling_participants" add constraint "calling_participants_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;
alter table "calling_participants" add constraint "calling_participants_event_id_user_id_unique" unique ("event_id", "user_id");
create index if not exists "calling_participants_event_id_active_index" on "calling_participants" ("event_id", "active");

create table if not exists "call_allocations" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "guest_id" bigint not null,
    "participant_user_id" bigint null,
    "status" varchar(16) not null default 'assigned',
    "last_outcome" varchar(24) null,
    "follow_up_at" timestamp(0) without time zone null,
    "assigned_at" timestamp(0) without time zone null,
    "completed_at" timestamp(0) without time zone null,
    "assigned_by" bigint null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "call_allocations" add constraint "call_allocations_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "call_allocations" add constraint "call_allocations_guest_id_foreign" foreign key ("guest_id") references "guests" ("id") on delete cascade;
alter table "call_allocations" add constraint "call_allocations_participant_user_id_foreign" foreign key ("participant_user_id") references "users" ("id") on delete set null;
alter table "call_allocations" add constraint "call_allocations_assigned_by_foreign" foreign key ("assigned_by") references "users" ("id") on delete set null;
alter table "call_allocations" add constraint "call_allocations_event_id_guest_id_unique" unique ("event_id", "guest_id");
create index if not exists "call_allocations_participant_user_id_status_index" on "call_allocations" ("participant_user_id", "status");
create index if not exists "call_allocations_event_id_status_index" on "call_allocations" ("event_id", "status");
create index if not exists "call_allocations_event_id_follow_up_at_index" on "call_allocations" ("event_id", "follow_up_at");

create table if not exists "call_attempts" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "guest_id" bigint not null,
    "user_id" bigint not null,
    "outcome" varchar(24) not null,
    "notes" text null,
    "follow_up_at" timestamp(0) without time zone null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "call_attempts" add constraint "call_attempts_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "call_attempts" add constraint "call_attempts_guest_id_foreign" foreign key ("guest_id") references "guests" ("id") on delete cascade;
alter table "call_attempts" add constraint "call_attempts_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;
create index if not exists "call_attempts_event_id_created_at_index" on "call_attempts" ("event_id", "created_at");
create index if not exists "call_attempts_guest_id_created_at_index" on "call_attempts" ("guest_id", "created_at");
create index if not exists "call_attempts_user_id_created_at_index" on "call_attempts" ("user_id", "created_at");

-- ---------------------------------------------------------------------------
-- E-Card Studio: shared templates and per-event design versions
-- ---------------------------------------------------------------------------

create table if not exists "shared_templates" (
    "id" bigserial primary key,
    "user_id" bigint not null,
    "name" varchar(255) not null,
    "category" varchar(32) not null default 'other',
    "format" varchar(12) not null default 'svg',
    "file_path" varchar(255) not null,
    "file_data" text null,
    "original_name" varchar(255) null,
    "preview_path" varchar(255) null,
    "metadata" json null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "shared_templates" add constraint "shared_templates_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;
create index if not exists "shared_templates_category_index" on "shared_templates" ("category");

create table if not exists "design_versions" (
    "id" bigserial primary key,
    "event_id" bigint not null,
    "template_id" bigint null,
    "version" integer not null default 1,
    "kind" varchar(16) not null default 'working',
    "format" varchar(12) not null default 'svg',
    "status" varchar(24) not null default 'draft',
    "file_path" varchar(255) null,
    "file_data" text null,
    "original_name" varchar(255) null,
    "config" json null,
    "approval_token" varchar(64) null,
    "approved_at" timestamp(0) without time zone null,
    "approved_by_name" varchar(255) null,
    "feedback" text null,
    "created_by" bigint null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "design_versions" add constraint "design_versions_event_id_foreign" foreign key ("event_id") references "events" ("id") on delete cascade;
alter table "design_versions" add constraint "design_versions_template_id_foreign" foreign key ("template_id") references "shared_templates" ("id") on delete set null;
alter table "design_versions" add constraint "design_versions_created_by_foreign" foreign key ("created_by") references "users" ("id") on delete set null;
alter table "design_versions" add constraint "design_versions_event_id_version_unique" unique ("event_id", "version");
alter table "design_versions" add constraint "design_versions_approval_token_unique" unique ("approval_token");
create index if not exists "design_versions_event_id_status_index" on "design_versions" ("event_id", "status");

create table if not exists "design_approvals" (
    "id" bigserial primary key,
    "design_version_id" bigint not null,
    "action" varchar(24) not null,
    "actor_name" varchar(255) null,
    "actor_id" bigint null,
    "comment" text null,
    "acted_at" timestamp(0) without time zone null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "design_approvals" add constraint "design_approvals_design_version_id_foreign" foreign key ("design_version_id") references "design_versions" ("id") on delete cascade;
alter table "design_approvals" add constraint "design_approvals_actor_id_foreign" foreign key ("actor_id") references "users" ("id") on delete set null;
create index if not exists "design_approvals_design_version_id_acted_at_index" on "design_approvals" ("design_version_id", "acted_at");

-- Design artwork storage (added 2026-11-21)
alter table "shared_templates" add column if not exists "file_data" text null;
alter table "shared_templates" add column if not exists "original_name" varchar(255) null;
alter table "design_versions" add column if not exists "format" varchar(12) not null default 'svg';
alter table "design_versions" add column if not exists "file_data" text null;
alter table "design_versions" add column if not exists "original_name" varchar(255) null;

create table if not exists "organizer_settings" (
    "user_id" bigint primary key,
    "settings" json null,
    "created_at" timestamp(0) without time zone null,
    "updated_at" timestamp(0) without time zone null
);

alter table "organizer_settings" add constraint "organizer_settings_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;

-- ---------------------------------------------------------------------------
-- Laravel migration ledger
-- ---------------------------------------------------------------------------

create table if not exists "migrations" (
    "id" serial primary key,
    "migration" varchar(255) not null,
    "batch" integer not null
);

insert into "migrations" ("migration", "batch")
select "migration", 1
from (values
    ('2024_01_01_000000_create_users_table'),
    ('2024_01_01_000010_create_events_table'),
    ('2024_01_01_000020_create_guests_table'),
    ('2024_01_01_000030_create_check_in_logs_table'),
    ('2024_01_01_000040_create_message_dispatches_table'),
    ('2024_01_01_000050_create_personal_access_tokens_table'),
    ('2026_11_09_000001_add_privileges_to_users_table'),
    ('2026_11_09_000002_create_app_settings_table'),
    ('2026_11_09_000003_create_audit_logs_table'),
    ('2026_11_10_000001_add_must_change_password_to_users_table'),
    ('2026_11_20_000000_enable_supabase_row_level_security'),
    ('2026_11_21_000001_add_invitation_fields_to_guests_table'),
    ('2026_11_21_000002_create_event_tables_table'),
    ('2026_11_21_000003_create_event_usher_assignments_table'),
    ('2026_11_21_000004_create_calling_tables'),
    ('2026_11_21_000005_create_design_tables'),
    ('2026_11_21_000006_create_organizer_settings_table'),
    ('2026_11_21_000007_add_sms_channel_to_message_dispatches')
) as seeded("migration")
where not exists (
    select 1 from "migrations" m where m."migration" = seeded."migration"
);

-- ---------------------------------------------------------------------------
-- Security: block Supabase's public API roles
-- ---------------------------------------------------------------------------
-- The admin and usher apps talk only to the Laravel API, which connects as the
-- table owner and bypasses RLS. With RLS enabled and no policies, the anon and
-- authenticated keys exposed by Supabase cannot read or write these tables.

alter table "users" enable row level security;
alter table "events" enable row level security;
alter table "guests" enable row level security;
alter table "check_in_logs" enable row level security;
alter table "message_dispatches" enable row level security;
alter table "personal_access_tokens" enable row level security;
alter table "app_settings" enable row level security;
alter table "audit_logs" enable row level security;
alter table "event_tables" enable row level security;
alter table "event_usher_assignments" enable row level security;
alter table "calling_participants" enable row level security;
alter table "call_allocations" enable row level security;
alter table "call_attempts" enable row level security;
alter table "shared_templates" enable row level security;
alter table "design_versions" enable row level security;
alter table "design_approvals" enable row level security;
alter table "organizer_settings" enable row level security;
alter table "migrations" enable row level security;

commit;
