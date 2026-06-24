-- Run this in Supabase → SQL Editor after adding exalted_t12 columns.
-- Fixes: "Could not find the 'infantry_exalted_t12' column ... in the schema cache"

-- Step 1: Verify columns exist (expect 3 rows)
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'participation_entries'
  and column_name like '%exalted%'
order by column_name;

-- Step 2: Add columns if missing (safe to re-run)
alter table public.participation_entries
  add column if not exists infantry_exalted_t12 boolean not null default false,
  add column if not exists lancer_exalted_t12 boolean not null default false,
  add column if not exists marksmen_exalted_t12 boolean not null default false;

-- Step 3: Reload PostgREST schema cache
notify pgrst, 'reload schema';
