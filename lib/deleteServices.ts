import type { ParticipationEntry, Player } from "@/lib/rosterTypes";

export type DeleteParticipationEntryDeps = {
  getEntry: (id: string) => Promise<ParticipationEntry>;
  deleteEntry: (id: string) => Promise<void>;
};

export type DeletePlayerDeps = {
  getPlayer: (id: string) => Promise<Player>;
  getParticipationCount: (playerId: string) => Promise<number>;
  deletePlayer: (id: string) => Promise<void>;
};

export async function deleteParticipationEntryWithDeps(id: string, deps: DeleteParticipationEntryDeps) {
  const entry = await deps.getEntry(id);
  await deps.deleteEntry(id);
  return entry;
}

export async function deletePlayerWithDeps(playerId: string, deps: DeletePlayerDeps) {
  const player = await deps.getPlayer(playerId);
  const participationCount = await deps.getParticipationCount(playerId);

  if (participationCount > 0) {
    const error = new Error("Player has participation entries. Delete those entries before deleting the player.");
    error.name = "PlayerHasParticipationError";
    throw error;
  }

  await deps.deletePlayer(playerId);
  return player;
}
