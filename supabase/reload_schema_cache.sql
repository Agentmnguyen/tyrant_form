-- Run in Supabase → SQL Editor on the project matching NEXT_PUBLIC_SUPABASE_URL.
-- Fixes: "Could not find the 'infantry_exalted_t12' column ... in the schema cache"
--
-- If verification returns 0 rows, columns were never added — run add_exalted_t12_columns.sql first.

-- Step 1: Add columns if missing
alter table public.participation_entries
  add column if not exists infantry_exalted_t12 boolean not null default false,
  add column if not exists lancer_exalted_t12 boolean not null default false,
  add column if not exists marksmen_exalted_t12 boolean not null default false;

-- Step 2: Verify columns exist (expect 3 rows — do not skip)
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'participation_entries'
  and column_name like '%exalted%'
order by column_name;

-- Step 3: Reload PostgREST schema cache
notify pgrst, 'reload schema';
