-- Add Exalted T12 skill level columns to participation_entries.
--
-- IMPORTANT: Run this in the Supabase project that matches your deployed app's
-- NEXT_PUBLIC_SUPABASE_URL (check Vercel → Settings → Environment Variables).
--
-- Values are '0', '1', '2', or '3'. NULL means the player answered "No" to Exalted T12.
--
-- Step 1: Add columns (safe to re-run)
alter table public.participation_entries
  add column if not exists infantry_exalted_skill_level text,
  add column if not exists lancer_exalted_skill_level text,
  add column if not exists marksmen_exalted_skill_level text;

-- Step 2: Verify — MUST return 3 rows before continuing
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'participation_entries'
  and column_name like '%exalted_skill_level'
order by column_name;

-- Step 3: Reload PostgREST schema cache (run only after Step 2 shows 3 rows)
notify pgrst, 'reload schema';
