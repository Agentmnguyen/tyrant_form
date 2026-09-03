-- Update Rally / Defense hero allowlist on participation_entries.join_heroes.
--
-- New options: Renee, Mia, Hendrik, Reina, Gatot, Norah
-- Removed: Wu Ming, Gordan
--
-- IMPORTANT: Run this in the Supabase project that matches your deployed app's
-- NEXT_PUBLIC_SUPABASE_URL (check Vercel → Settings → Environment Variables).

-- Step 1: Drop the old check so rows with removed heroes can be cleaned up
alter table public.participation_entries
  drop constraint if exists participation_entries_join_heroes_check;

-- Step 2: Strip heroes that are no longer selectable
update public.participation_entries
set join_heroes = coalesce((
  select array_agg(hero)
  from unnest(join_heroes) as hero
  where hero in ('Renee', 'Mia', 'Hendrik', 'Reina', 'Gatot', 'Norah')
), '{}'::text[]);

-- Step 3: Enforce the new allowlist
alter table public.participation_entries
  add constraint participation_entries_join_heroes_check check (
    join_heroes <@ array['Renee', 'Mia', 'Hendrik', 'Reina', 'Gatot', 'Norah']::text[]
  );
