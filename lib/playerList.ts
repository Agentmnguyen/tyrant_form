import type {
  ParticipationEntry,
  Player,
  PlayerListFilters,
  PlayerSortKey,
  PlayerWithStats
} from "@/lib/rosterTypes";

export type SortDirection = "asc" | "desc";

export const DEFAULT_PLAYER_PAGE_SIZE = 50;

export type PlayerPaginationResult = {
  items: PlayerWithStats[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  rangeLabel: string;
};

function entryActivityAt(entry: ParticipationEntry) {
  const submitted = new Date(entry.submittedAt).getTime();
  const edited = new Date(entry.editedAt).getTime();
  return Math.max(submitted, edited);
}

export function buildPlayerStats(players: Player[], entries: ParticipationEntry[]): PlayerWithStats[] {
  const statsByPlayerId = new Map<string, { count: number; lastAt: number | null }>();

  for (const entry of entries) {
    const playerId = entry.player.id;
    const activityAt = entryActivityAt(entry);
    const current = statsByPlayerId.get(playerId);

    if (!current) {
      statsByPlayerId.set(playerId, { count: 1, lastAt: activityAt });
      continue;
    }

    current.count += 1;
    current.lastAt = current.lastAt === null ? activityAt : Math.max(current.lastAt, activityAt);
  }

  return players.map((player) => {
    const stats = statsByPlayerId.get(player.id);
    return {
      ...player,
      participationCount: stats?.count ?? 0,
      lastParticipationAt: stats?.lastAt ? new Date(stats.lastAt).toISOString() : null
    };
  });
}

export function filterPlayers(players: PlayerWithStats[], filters: PlayerListFilters): PlayerWithStats[] {
  const nameNeedle = filters.nameSearch.trim().toLowerCase();
  const idNeedle = filters.idSearch.trim().toLowerCase();

  return players.filter((player) => {
    const nameOk = !nameNeedle || player.playerName.toLowerCase().includes(nameNeedle);
    const idOk = !idNeedle || player.playerId.toLowerCase().includes(idNeedle);
    const allianceOk = filters.alliance === "all" || player.alliance === filters.alliance;
    return nameOk && idOk && allianceOk;
  });
}

function compareActivity(a: string | null, b: string | null, direction: SortDirection) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const result = new Date(a).getTime() - new Date(b).getTime();
  return direction === "asc" ? result : -result;
}

export function sortPlayers(players: PlayerWithStats[], sortKey: PlayerSortKey, direction: SortDirection): PlayerWithStats[] {
  const sorted = [...players];

  sorted.sort((a, b) => {
    if (sortKey === "lastParticipationAt") {
      return compareActivity(a.lastParticipationAt, b.lastParticipationAt, direction);
    }

    const result = a.playerName.localeCompare(b.playerName);
    return direction === "asc" ? result : -result;
  });

  return sorted;
}

export function paginatePlayers(
  players: PlayerWithStats[],
  page: number,
  pageSize: number = DEFAULT_PLAYER_PAGE_SIZE
): PlayerPaginationResult {
  const total = players.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const items = players.slice(startIndex, endIndex);

  const rangeLabel =
    total === 0 ? "Showing 0 of 0" : `Showing ${startIndex + 1}–${endIndex} of ${total}`;

  return {
    items,
    total,
    totalPages,
    page: safePage,
    pageSize,
    rangeLabel
  };
}

export function processPlayerList({
  players,
  entries,
  filters,
  sortKey,
  sortDirection,
  page,
  pageSize = DEFAULT_PLAYER_PAGE_SIZE
}: {
  players: Player[];
  entries: ParticipationEntry[];
  filters: PlayerListFilters;
  sortKey: PlayerSortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize?: number;
}) {
  const enriched = buildPlayerStats(players, entries);
  const filtered = filterPlayers(enriched, filters);
  const sorted = sortPlayers(filtered, sortKey, sortDirection);
  const paginated = paginatePlayers(sorted, page, pageSize);

  return {
    enriched,
    filtered,
    sorted,
    paginated,
    filteredCount: filtered.length
  };
}
