import { voiceCallSummary } from "@/lib/format";
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
  "infantry_exalted_t12",
  "infantry_exalted_skill_level",
  "lancer_fc_level",
  "lancer_helios",
  "lancer_exalted_t12",
  "lancer_exalted_skill_level",
  "marksmen_fc_level",
  "marksmen_helios",
  "marksmen_exalted_t12",
  "marksmen_exalted_skill_level",
  "join_heroes",
  "join_voice_call",
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
    String(entry.infantryExaltedT12),
    entry.infantryExaltedSkillLevel || "",
    entry.lancerFcLevel,
    String(entry.lancerHelios),
    String(entry.lancerExaltedT12),
    entry.lancerExaltedSkillLevel || "",
    entry.marksmenFcLevel,
    String(entry.marksmenHelios),
    String(entry.marksmenExaltedT12),
    entry.marksmenExaltedSkillLevel || "",
    entry.joinHeroes.join("; "),
    voiceCallSummary(entry.joinVoiceCall),
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
