import type { ParticipationEntry, Player } from "@/lib/rosterTypes";

const PLAYER_HEADERS = ["player_uuid", "player_id", "player_name", "alliance", "created_at", "updated_at"];

const PARTICIPATION_HEADERS = [
  "participation_uuid",
  "event_uuid",
  "event_type",
  "event_name",
  "event_status",
  "player_uuid",
  "player_id",
  "player_name",
  "alliance",
  "availability",
  "infantry_fc_level",
  "infantry_helios",
  "lancer_fc_level",
  "lancer_helios",
  "marksmen_fc_level",
  "marksmen_helios",
  "rally_join_heroes",
  "defense_join_heroes",
  "submitted_at",
  "edited_at",
  "google_sheets_sync_status"
];

export function buildPlayersCsv(players: Player[]) {
  const rows = players.map((player) => [
    player.id,
    player.playerId,
    player.playerName,
    player.alliance,
    player.createdAt,
    player.updatedAt
  ]);

  return toCsv([PLAYER_HEADERS, ...rows]);
}

export function buildParticipationCsv(entries: ParticipationEntry[]) {
  const rows = entries.map((entry) => [
    entry.id,
    entry.event.id,
    entry.event.eventType,
    entry.event.name,
    entry.event.status,
    entry.player.id,
    entry.player.playerId,
    entry.player.playerName,
    entry.player.alliance,
    entry.availability,
    entry.infantryFcLevel,
    String(entry.infantryHelios),
    entry.lancerFcLevel,
    String(entry.lancerHelios),
    entry.marksmenFcLevel,
    String(entry.marksmenHelios),
    entry.rallyJoinHeroes.join("; "),
    entry.defenseJoinHeroes.join("; "),
    entry.submittedAt,
    entry.editedAt,
    entry.sheetSyncStatus
  ]);

  return toCsv([PARTICIPATION_HEADERS, ...rows]);
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
