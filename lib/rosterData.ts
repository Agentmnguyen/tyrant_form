import "server-only";
import { deleteParticipationEntryWithDeps, deletePlayerWithDeps } from "@/lib/deleteServices";
import { generateEventNames } from "@/lib/eventNaming";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePlayerGameId } from "@/lib/rosterValidation";
import type { Alliance, EventStatus, EventType } from "@/lib/rosterConfig";
import type {
  ParticipationEntry,
  ParticipationPayload,
  Player,
  RosterEvent,
  SheetSyncStatus
} from "@/lib/rosterTypes";

type PlayerRow = {
  id: string;
  player_id: string;
  normalized_player_id: string;
  player_name: string;
  alliance: Alliance;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  event_type: EventType;
  name: string;
  month_year_label: string;
  status: EventStatus;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  locked_at: string | null;
  archived_at: string | null;
  google_sheet_tab_name: string;
};

type ParticipationEntryRow = {
  id: string;
  player_id: string;
  event_id: string;
  availability: ParticipationPayload["availability"];
  infantry_fc_level: ParticipationPayload["infantryFcLevel"];
  infantry_helios: boolean;
  lancer_fc_level: ParticipationPayload["lancerFcLevel"];
  lancer_helios: boolean;
  marksmen_fc_level: ParticipationPayload["marksmenFcLevel"];
  marksmen_helios: boolean;
  join_heroes: ParticipationPayload["joinHeroes"];
  join_voice_call: boolean | null;
  submitted_at: string;
  edited_at: string;
  sheet_sync_status: SheetSyncStatus;
  sheet_synced_at: string | null;
  sheet_error: string | null;
  players: PlayerRow;
  events: EventRow;
};

export type RosterAdminData = {
  events: RosterEvent[];
  players: Player[];
  participationEntries: ParticipationEntry[];
};

export type EventOpenConflict = {
  openEvent: RosterEvent;
  targetEvent: RosterEvent;
};

export async function getPublicOpenEventState() {
  const openEvents = await listOpenEvents();

  return {
    openEvent: openEvents[0] || null
  };
}

export async function submitParticipation(payload: ParticipationPayload) {
  const event = await getEvent(payload.eventId);

  if (!event || event.status !== "open") {
    const error = new Error("This event is not open for public participation.");
    error.name = "SubmissionsClosedError";
    throw error;
  }

  const player = await upsertPlayer({
    playerGameId: payload.playerGameId,
    playerName: payload.playerName,
    alliance: payload.alliance
  });

  const entry = await upsertParticipationEntry(player.id, event.id, payload);
  return getParticipationEntry(entry.id);
}

export async function getRosterAdminData(): Promise<RosterAdminData> {
  const [events, players, participationEntries] = await Promise.all([
    listEvents(),
    listPlayers(),
    listParticipationEntries()
  ]);

  return {
    events,
    players,
    participationEntries
  };
}

export async function listOpenEvents() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as EventRow[]).map(mapEvent);
}

export async function listEvents() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as EventRow[]).map(mapEvent);
}

export async function listPlayers() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("player_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as PlayerRow[]).map(mapPlayer);
}

export async function listParticipationEntries() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("participation_entries")
    .select("*, players(*), events(*)")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as ParticipationEntryRow[]).map(mapParticipationEntry);
}

export async function getEvent(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapEvent(data as EventRow) : null;
}

export async function getParticipationEntry(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("participation_entries")
    .select("*, players(*), events(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const notFound = new Error("Participation entry was not found.");
    notFound.name = "NotFoundError";
    throw notFound;
  }

  return mapParticipationEntry(data as ParticipationEntryRow);
}

export async function getPlayer(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const notFound = new Error("Player was not found.");
    notFound.name = "NotFoundError";
    throw notFound;
  }

  return mapPlayer(data as PlayerRow);
}

export async function startNewEvent(eventType: EventType) {
  const supabase = getSupabaseAdmin();
  const existingEvents = await listEvents();
  const names = generateEventNames(eventType, existingEvents);

  const { data, error } = await supabase
    .from("events")
    .insert({
      event_type: eventType,
      name: names.name,
      month_year_label: names.monthYearLabel,
      google_sheet_tab_name: names.googleSheetTabName,
      status: "draft"
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEvent(data as EventRow);
}

export async function openEvent(eventId: string, lockExisting = false) {
  const supabase = getSupabaseAdmin();
  const targetEvent = await getEvent(eventId);

  if (!targetEvent) {
    const notFound = new Error("Event was not found.");
    notFound.name = "NotFoundError";
    throw notFound;
  }

  if (targetEvent.status === "archived") {
    throw new Error("Restore this event before opening it.");
  }

  const openConflict = (await listEvents()).find((event) => event.status === "open" && event.id !== targetEvent.id);

  if (openConflict && !lockExisting) {
    const conflict = new Error("Another event is already open.");
    conflict.name = "OpenEventConflictError";
    (conflict as Error & { conflict?: EventOpenConflict }).conflict = {
      openEvent: openConflict,
      targetEvent
    };
    throw conflict;
  }

  if (openConflict) {
    const { error: lockError } = await supabase
      .from("events")
      .update({
        status: "locked",
        closed_at: new Date().toISOString(),
        locked_at: new Date().toISOString()
      })
      .eq("status", "open")
      .neq("id", targetEvent.id);

    if (lockError) {
      throw new Error(lockError.message);
    }
  }

  const { data, error } = await supabase
    .from("events")
    .update({
      status: "open",
      opened_at: targetEvent.openedAt || new Date().toISOString(),
      closed_at: null,
      locked_at: null
    })
    .eq("id", targetEvent.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEvent(data as EventRow);
}

export async function closeEvent(eventId: string) {
  return updateEventStatus(eventId, "draft", {
    closed_at: new Date().toISOString(),
    locked_at: null
  });
}

export async function lockEvent(eventId: string) {
  return updateEventStatus(eventId, "locked", {
    closed_at: new Date().toISOString(),
    locked_at: new Date().toISOString()
  });
}

export async function archiveEvent(eventId: string) {
  return updateEventStatus(eventId, "archived", {
    closed_at: new Date().toISOString(),
    archived_at: new Date().toISOString()
  });
}

export async function restoreEvent(eventId: string) {
  return updateEventStatus(eventId, "draft", {
    archived_at: null
  });
}

export async function updatePlayer(playerId: string, patch: { playerGameId: string; playerName: string; alliance: Alliance }) {
  const supabase = getSupabaseAdmin();
  const normalizedPlayerId = normalizePlayerGameId(patch.playerGameId);
  const { data, error } = await supabase
    .from("players")
    .update({
      player_id: patch.playerGameId.trim(),
      normalized_player_id: normalizedPlayerId,
      player_name: patch.playerName.trim(),
      alliance: patch.alliance
    })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const duplicate = new Error("Another player already uses this Player ID.");
      duplicate.name = "DuplicatePlayerError";
      throw duplicate;
    }

    throw new Error(error.message);
  }

  if (!data) {
    const notFound = new Error("Player was not found.");
    notFound.name = "NotFoundError";
    throw notFound;
  }

  return mapPlayer(data as PlayerRow);
}

export async function updateParticipationEntry(id: string, payload: ParticipationPayload) {
  const entry = await getParticipationEntry(id);
  const player = await updatePlayer(entry.player.id, {
    playerGameId: payload.playerGameId,
    playerName: payload.playerName,
    alliance: payload.alliance
  });

  const updated = await upsertParticipationEntry(player.id, entry.event.id, {
    ...payload,
    eventId: entry.event.id
  });

  return getParticipationEntry(updated.id);
}

export async function updateSheetSyncStatus(id: string, status: SheetSyncStatus, errorMessage?: string | null) {
  const supabase = getSupabaseAdmin();
  const patch =
    status === "synced"
      ? { sheet_sync_status: status, sheet_synced_at: new Date().toISOString(), sheet_error: null }
      : { sheet_sync_status: status, sheet_error: errorMessage || null };

  const { data, error } = await supabase
    .from("participation_entries")
    .update(patch)
    .eq("id", id)
    .select("*, players(*), events(*)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapParticipationEntry(data as ParticipationEntryRow);
}

export async function deleteParticipationEntry(id: string) {
  const supabase = getSupabaseAdmin();
  return deleteParticipationEntryWithDeps(id, {
    getEntry: getParticipationEntry,
    deleteEntry: async (entryId) => {
      const { error } = await supabase.from("participation_entries").delete().eq("id", entryId);

      if (error) {
        throw new Error(error.message);
      }
    }
  });
}

export async function deletePlayer(playerId: string) {
  const supabase = getSupabaseAdmin();
  return deletePlayerWithDeps(playerId, {
    getPlayer,
    getParticipationCount: async (id) => {
      const { count, error } = await supabase
        .from("participation_entries")
        .select("id", { count: "exact", head: true })
        .eq("player_id", id);

      if (error) {
        throw new Error(error.message);
      }

      return count || 0;
    },
    deletePlayer: async (id) => {
      const { error } = await supabase.from("players").delete().eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    }
  });
}

async function upsertPlayer(payload: { playerGameId: string; playerName: string; alliance: Alliance }) {
  const supabase = getSupabaseAdmin();
  const normalizedPlayerId = normalizePlayerGameId(payload.playerGameId);
  const { data, error } = await supabase
    .from("players")
    .upsert(
      {
        player_id: payload.playerGameId.trim(),
        normalized_player_id: normalizedPlayerId,
        player_name: payload.playerName.trim(),
        alliance: payload.alliance
      },
      { onConflict: "normalized_player_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPlayer(data as PlayerRow);
}

async function upsertParticipationEntry(playerId: string, eventId: string, payload: ParticipationPayload) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("participation_entries")
    .upsert(
      {
        player_id: playerId,
        event_id: eventId,
        availability: payload.availability,
        infantry_fc_level: payload.infantryFcLevel,
        infantry_helios: payload.infantryHelios,
        lancer_fc_level: payload.lancerFcLevel,
        lancer_helios: payload.lancerHelios,
        marksmen_fc_level: payload.marksmenFcLevel,
        marksmen_helios: payload.marksmenHelios,
        join_heroes: payload.joinHeroes,
        join_voice_call: payload.joinVoiceCall,
        edited_at: now,
        sheet_sync_status: "pending",
        sheet_error: null
      },
      { onConflict: "event_id,player_id" }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as { id: string };
}

async function updateEventStatus(eventId: string, status: EventStatus, patch: Record<string, string | null>) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .update({
      status,
      ...patch
    })
    .eq("id", eventId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const notFound = new Error("Event was not found.");
    notFound.name = "NotFoundError";
    throw notFound;
  }

  return mapEvent(data as EventRow);
}

export function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    playerId: row.player_id,
    normalizedPlayerId: row.normalized_player_id,
    playerName: row.player_name,
    alliance: row.alliance,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapEvent(row: EventRow): RosterEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    name: row.name,
    monthYearLabel: row.month_year_label,
    status: row.status,
    createdAt: row.created_at,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    lockedAt: row.locked_at,
    archivedAt: row.archived_at,
    googleSheetTabName: row.google_sheet_tab_name
  };
}

export function mapParticipationEntry(row: ParticipationEntryRow): ParticipationEntry {
  return {
    id: row.id,
    playerId: row.player_id,
    eventId: row.event_id,
    availability: row.availability,
    infantryFcLevel: row.infantry_fc_level,
    infantryHelios: row.infantry_helios,
    lancerFcLevel: row.lancer_fc_level,
    lancerHelios: row.lancer_helios,
    marksmenFcLevel: row.marksmen_fc_level,
    marksmenHelios: row.marksmen_helios,
    joinHeroes: row.join_heroes || [],
    joinVoiceCall: row.join_voice_call ?? null,
    submittedAt: row.submitted_at,
    editedAt: row.edited_at,
    sheetSyncStatus: row.sheet_sync_status,
    sheetSyncedAt: row.sheet_synced_at,
    sheetError: row.sheet_error,
    player: mapPlayer(row.players),
    event: mapEvent(row.events)
  };
}
