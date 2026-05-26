create extension if not exists pgcrypto;

-- 1474 Event Roster normalized schema.
-- Migration risk note:
--   This schema creates new normalized tables and does not drop the older tyrant_* tables.
--   The optional migration block below copies existing tyrant data into the new tables when
--   those tables exist. Review copied data before removing any legacy tables manually.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  normalized_player_id text not null,
  player_name text not null,
  alliance text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint players_player_id_check check (length(trim(player_id)) > 0),
  constraint players_normalized_player_id_check check (length(trim(normalized_player_id)) > 0),
  constraint players_player_name_check check (length(trim(player_name)) > 0),
  constraint players_alliance_check check (alliance in ('STD', 'LOC', 'HPY', 'TEX', 'NGL', 'DIE'))
);

create unique index if not exists players_normalized_player_id_unique_idx
  on public.players (normalized_player_id);

create index if not exists players_player_name_idx on public.players (lower(player_name));
create index if not exists players_alliance_idx on public.players (alliance);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  name text not null,
  month_year_label text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz,
  locked_at timestamptz,
  archived_at timestamptz,
  google_sheet_tab_name text not null,
  metadata jsonb not null default '{}'::jsonb,

  constraint events_event_type_check check (event_type in ('SVS', 'Frost Dragon Tyrant')),
  constraint events_status_check check (status in ('draft', 'open', 'locked', 'archived')),
  constraint events_name_check check (length(trim(name)) > 0),
  constraint events_month_year_label_check check (length(trim(month_year_label)) > 0),
  constraint events_google_sheet_tab_name_check check (length(trim(google_sheet_tab_name)) > 0)
);

create unique index if not exists events_google_sheet_tab_name_unique_idx
  on public.events (lower(google_sheet_tab_name));

create unique index if not exists events_one_open_per_type_idx
  on public.events (event_type)
  where status = 'open';

create index if not exists events_event_type_idx on public.events (event_type);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_created_at_idx on public.events (created_at desc);

create table if not exists public.participation_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  availability text not null,

  infantry_fc_level text not null,
  infantry_helios boolean not null default false,
  lancer_fc_level text not null,
  lancer_helios boolean not null default false,
  marksmen_fc_level text not null,
  marksmen_helios boolean not null default false,

  heroes text[] not null,
  notes text not null default '',

  submitted_at timestamptz not null default now(),
  edited_at timestamptz not null default now(),
  sheet_sync_status text not null default 'pending',
  sheet_synced_at timestamptz,
  sheet_error text,
  metadata jsonb not null default '{}'::jsonb,

  constraint participation_entries_availability_check check (
    availability in ('Full Event', '3-4 hours', '2-3 hours', 'Casual / Under 2 hours')
  ),
  constraint participation_entries_infantry_fc_level_check check (infantry_fc_level in ('FC5', 'FC6', 'FC7', 'FC8', 'FC9', 'FC10')),
  constraint participation_entries_lancer_fc_level_check check (lancer_fc_level in ('FC5', 'FC6', 'FC7', 'FC8', 'FC9', 'FC10')),
  constraint participation_entries_marksmen_fc_level_check check (marksmen_fc_level in ('FC5', 'FC6', 'FC7', 'FC8', 'FC9', 'FC10')),
  constraint participation_entries_heroes_check check (
    cardinality(heroes) > 0
    and heroes <@ array['Ahmose', 'Gatot', 'Gordan', 'Renee', 'Wu Ming', 'None of the above']::text[]
    and (
      heroes = array['None of the above']::text[]
      or not ('None of the above' = any(heroes))
    )
  ),
  constraint participation_entries_sheet_sync_status_check check (sheet_sync_status in ('pending', 'synced', 'sheet_sync_failed'))
);

create unique index if not exists participation_entries_player_event_unique_idx
  on public.participation_entries (event_id, player_id);

create index if not exists participation_entries_player_id_idx on public.participation_entries (player_id);
create index if not exists participation_entries_event_id_idx on public.participation_entries (event_id);
create index if not exists participation_entries_submitted_at_idx on public.participation_entries (submitted_at desc);
create index if not exists participation_entries_availability_idx on public.participation_entries (availability);
create index if not exists participation_entries_heroes_idx on public.participation_entries using gin (heroes);
create index if not exists participation_entries_sheet_sync_status_idx on public.participation_entries (sheet_sync_status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_participation_edited_at()
returns trigger
language plpgsql
as $$
begin
  new.edited_at = now();
  return new;
end;
$$;

drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at
before update on public.players
for each row
execute function public.touch_updated_at();

drop trigger if exists participation_entries_touch_edited_at on public.participation_entries;
create trigger participation_entries_touch_edited_at
before update on public.participation_entries
for each row
execute function public.touch_participation_edited_at();

-- Best-effort migration from the earlier Frost Dragon Tyrant-only scaffold.
do $$
begin
  if to_regclass('public.tyrant_events') is not null then
    execute $migration$
      insert into public.events (
        id,
        event_type,
        name,
        month_year_label,
        status,
        created_at,
        opened_at,
        closed_at,
        archived_at,
        google_sheet_tab_name,
        metadata
      )
      select
        id,
        'Frost Dragon Tyrant',
        case
          when name ilike 'Frost Dragon Tyrant - %' then name
          else 'Frost Dragon Tyrant - ' || name
        end,
        regexp_replace(name, ' #([0-9]+)$', ''),
        case
          when submissions_open is true then 'open'
          when archived_at is not null then 'archived'
          else 'draft'
        end,
        created_at,
        case when submissions_open is true then created_at else null end,
        case when submissions_open is false then coalesce(archived_at, created_at) else null end,
        archived_at,
        case
          when name ilike 'Frost Dragon Tyrant - %' then name
          else 'Frost Dragon Tyrant - ' || name
        end,
        jsonb_build_object('migrated_from', 'tyrant_events')
      from public.tyrant_events
      on conflict (id) do nothing
    $migration$;
  end if;

  if to_regclass('public.tyrant_submissions') is not null then
    execute $migration$
      insert into public.players (
        player_id,
        normalized_player_id,
        player_name,
        alliance,
        created_at,
        updated_at
      )
      select distinct on (lower(trim(player_id)))
        trim(player_id),
        lower(trim(player_id)),
        trim(player_name),
        alliance,
        min(created_at) over (partition by lower(trim(player_id))),
        max(updated_at) over (partition by lower(trim(player_id)))
      from public.tyrant_submissions
      where status is distinct from 'Deleted'
      order by lower(trim(player_id)), updated_at desc
      on conflict (normalized_player_id) do update set
        player_id = excluded.player_id,
        player_name = excluded.player_name,
        alliance = excluded.alliance,
        updated_at = now()
    $migration$;

    execute $migration$
      insert into public.participation_entries (
        player_id,
        event_id,
        availability,
        infantry_fc_level,
        infantry_helios,
        lancer_fc_level,
        lancer_helios,
        marksmen_fc_level,
        marksmen_helios,
        heroes,
        notes,
        submitted_at,
        edited_at,
        sheet_sync_status,
        sheet_synced_at,
        sheet_error,
        metadata
      )
      select
        p.id,
        s.event_id,
        case
          when s.time_available = 'Less than 2 hours / casually' then 'Casual / Under 2 hours'
          else s.time_available
        end,
        s.infantry_fc_level,
        s.infantry_helios,
        s.lancer_fc_level,
        s.lancer_helios,
        s.marksmen_fc_level,
        s.marksmen_helios,
        s.heroes,
        '',
        s.created_at,
        s.updated_at,
        s.sheet_sync_status,
        s.sheet_synced_at,
        s.sheet_error,
        jsonb_build_object('migrated_from', 'tyrant_submissions', 'legacy_submission_id', s.id)
      from public.tyrant_submissions s
      join public.players p on p.normalized_player_id = lower(trim(s.player_id))
      join public.events e on e.id = s.event_id
      where s.status is distinct from 'Deleted'
      on conflict (event_id, player_id) do nothing
    $migration$;
  end if;
end;
$$;

alter table public.players enable row level security;
alter table public.players force row level security;

alter table public.events enable row level security;
alter table public.events force row level security;

alter table public.participation_entries enable row level security;
alter table public.participation_entries force row level security;

revoke all on table public.players from public;
revoke all on table public.players from anon;
revoke all on table public.players from authenticated;

revoke all on table public.events from public;
revoke all on table public.events from anon;
revoke all on table public.events from authenticated;

revoke all on table public.participation_entries from public;
revoke all on table public.participation_entries from anon;
revoke all on table public.participation_entries from authenticated;

grant usage on schema public to service_role;
grant select, insert, update on table public.players to service_role;
grant select, insert, update on table public.events to service_role;
grant select, insert, update on table public.participation_entries to service_role;

create policy players_service_role_select
  on public.players
  for select
  to service_role
  using (true);

create policy players_service_role_insert
  on public.players
  for insert
  to service_role
  with check (true);

create policy players_service_role_update
  on public.players
  for update
  to service_role
  using (true)
  with check (true);

create policy events_service_role_select
  on public.events
  for select
  to service_role
  using (true);

create policy events_service_role_insert
  on public.events
  for insert
  to service_role
  with check (true);

create policy events_service_role_update
  on public.events
  for update
  to service_role
  using (true)
  with check (true);

create policy participation_entries_service_role_select
  on public.participation_entries
  for select
  to service_role
  using (true);

create policy participation_entries_service_role_insert
  on public.participation_entries
  for insert
  to service_role
  with check (true);

create policy participation_entries_service_role_update
  on public.participation_entries
  for update
  to service_role
  using (true)
  with check (true);

revoke all on function public.touch_updated_at() from public;
revoke all on function public.touch_updated_at() from anon;
revoke all on function public.touch_updated_at() from authenticated;
grant execute on function public.touch_updated_at() to service_role;

revoke all on function public.touch_participation_edited_at() from public;
revoke all on function public.touch_participation_edited_at() from anon;
revoke all on function public.touch_participation_edited_at() from authenticated;
grant execute on function public.touch_participation_edited_at() to service_role;
