-- Add Exalted T12 columns to participation_entries.
--
-- IMPORTANT: Run this in the Supabase project that matches your deployed app's
-- NEXT_PUBLIC_SUPABASE_URL (check Vercel → Settings → Environment Variables).
--
-- Step 1: Add columns (safe to re-run)
alter table public.participation_entries
  add column if not exists infantry_exalted_t12 boolean not null default false,
  add column if not exists lancer_exalted_t12 boolean not null default false,
  add column if not exists marksmen_exalted_t12 boolean not null default false;

-- Step 2: Verify — MUST return 3 rows before continuing
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'participation_entries'
  and column_name like '%exalted%'
order by column_name;

-- Step 3: Reload PostgREST schema cache (run only after Step 2 shows 3 rows)
notify pgrst, 'reload schema';
