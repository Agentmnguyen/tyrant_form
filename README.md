# 1474 Event Roster

Next.js App Router app for shared 1474 event participation tracking across SVS and Frost Dragon Tyrant.

## Features

- Mobile-first public participation form
- One shared admin dashboard for all event types
- Persistent players across events
- Normalized events and participation entries
- One open public event per event type
- Admin event lifecycle: draft, open, locked, archived
- Player and participation editing
- Supabase source of truth
- Google Sheets sync to `MASTER_PLAYERS`, `MASTER_PARTICIPATION`, and event-specific tabs
- Event tab names such as `SVS - May 2026`, `Frost Dragon Tyrant - May 2026`, and `#2` suffixes for same-type duplicates

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in Supabase, admin PIN, and Google Sheets values.
5. Install and run:

```bash
npm install
npm run dev
```

The public participation form is `/`.
The admin dashboard is `/admin`.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key
ADMIN_PIN=your-admin-pin
GOOGLE_SHEET_ID=your-google-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`GOOGLE_SHEETS_SPREADSHEET_ID` is supported as a legacy fallback, but `GOOGLE_SHEET_ID` is preferred.

For Google Sheets sync, enable the Google Sheets API, create a service account key, and share the target spreadsheet with the service account email as an editor.

## Data Model

- `players`: persistent Player ID, player name, alliance.
- `events`: event type, name, month/year label, status, lifecycle dates, Google Sheet tab name.
- `participation_entries`: one player in one event, with availability, troop readiness, hero readiness, notes, timestamps, and sync status.

## Migration Notes

`supabase/schema.sql` does not drop older Tyrant-only tables. It creates the normalized roster tables and includes a best-effort migration block:

- Legacy `tyrant_events` copy into `events` as `Frost Dragon Tyrant`.
- Legacy `tyrant_submissions` copy into `players` and `participation_entries`.

Review migrated data before manually removing any legacy tables. The destructive step, if desired later, should be done separately after backup and verification.
