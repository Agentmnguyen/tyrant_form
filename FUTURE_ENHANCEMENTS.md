# Future Enhancements

## One open event per event type

**Goal:** Allow at most one open SVS event and one open Frost Dragon Tyrant event at the same time (two open events max), instead of a single globally open event.

**Prerequisite:** Clean up data so there is at most one `open` row per `event_type` before applying the schema change.

### Schema

- Drop `events_one_open_global_idx` on `public.events ((status)) WHERE status = 'open'`.
- Recreate `events_one_open_per_type_idx` on `(event_type) WHERE status = 'open'` (same pattern as the initial app migration).
- Note in README migration docs: after deploy, two open events are valid; the DB still blocks a second open row for the same type.

### API

- **`GET /api/events/open`:** Return `{ openEvents: RosterEvent[] }` (0–2 items) instead of `{ openEvent }`. Order by `event_type` then `created_at` if helpful for stable UI.
- **`openEvent()` (`lib/rosterData.ts`):** Treat conflicts only when another row with the **same `event_type`** is already `open`; restore a same-type error message. With `lockExisting`, lock only that same-type row (not every open row).
- **`POST /api/participation`:** Unchanged — still takes `eventId` and checks that event is `open`.

### Admin workflow

- Event Controls copy: one open event **per type**, not one globally.
- Open conflict confirm: mention `eventType` again (e.g. “…already open for SVS…”).
- `lockExisting`: replaces only the open event of the **same type**.
- “Open event(s)” stat may be `0`, `1`, or `2`; consider plural label “Open events”.

### Public form

- Fetch `openEvents` from the API.
- **0 open:** keep today’s closed state.
- **1 open:** auto-set `form.eventId` (today’s behavior).
- **2 open:** bring back a Select Event step (or picker) for SVS vs Frost Dragon Tyrant; restore `validateStep` on `eventId` for that step.
- Review still shows the chosen event; submit still sends `eventId`.
