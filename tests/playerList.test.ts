import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlayerStats,
  filterPlayers,
  paginatePlayers,
  sortPlayers
} from "@/lib/playerList";
import type { ParticipationEntry, Player, RosterEvent } from "@/lib/rosterTypes";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    playerId: "10001",
    normalizedPlayerId: "10001",
    playerName: "Alpha",
    alliance: "SFS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function makeEvent(overrides: Partial<RosterEvent> = {}): RosterEvent {
  return {
    id: "event-1",
    eventType: "SVS",
    name: "SVS - Jan 2026",
    monthYearLabel: "Jan 2026",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    lockedAt: null,
    archivedAt: null,
    googleSheetTabName: "SVS - Jan 2026",
    ...overrides
  };
}

function makeEntry(overrides: Partial<ParticipationEntry> = {}): ParticipationEntry {
  const player = overrides.player ?? makePlayer();
  const event = overrides.event ?? makeEvent();

  return {
    id: "entry-1",
    playerId: player.id,
    eventId: event.id,
    availability: "Full Event",
    infantryFcLevel: "FC8",
    infantryHelios: false,
    infantryExaltedT12: false,
    infantryExaltedSkillLevel: null,
    lancerFcLevel: "FC8",
    lancerHelios: false,
    lancerExaltedT12: false,
    lancerExaltedSkillLevel: null,
    marksmenFcLevel: "FC8",
    marksmenHelios: false,
    marksmenExaltedT12: false,
    marksmenExaltedSkillLevel: null,
    joinHeroes: [],
    joinVoiceCall: null,
    submittedAt: "2026-01-10T10:00:00.000Z",
    editedAt: "2026-01-10T10:00:00.000Z",
    sheetSyncStatus: "synced",
    sheetSyncedAt: null,
    sheetError: null,
    player,
    event,
    ...overrides
  };
}

test("buildPlayerStats derives count and last participation from entries", () => {
  const alpha = makePlayer({ id: "player-alpha", playerName: "Alpha" });
  const beta = makePlayer({ id: "player-beta", playerName: "Beta", playerId: "20002", alliance: "ZRO" });
  const eventTwo = makeEvent({ id: "event-2", name: "SVS - Feb 2026" });

  const entries = [
    makeEntry({
      id: "entry-1",
      player: alpha,
      submittedAt: "2026-01-10T10:00:00.000Z",
      editedAt: "2026-01-12T12:00:00.000Z"
    }),
    makeEntry({
      id: "entry-2",
      player: alpha,
      event: eventTwo,
      submittedAt: "2026-02-01T08:00:00.000Z",
      editedAt: "2026-02-05T16:00:00.000Z"
    })
  ];

  const stats = buildPlayerStats([alpha, beta], entries);
  const alphaStats = stats.find((player) => player.id === "player-alpha");
  const betaStats = stats.find((player) => player.id === "player-beta");

  assert.equal(alphaStats?.participationCount, 2);
  assert.equal(alphaStats?.lastParticipationAt, "2026-02-05T16:00:00.000Z");
  assert.equal(betaStats?.participationCount, 0);
  assert.equal(betaStats?.lastParticipationAt, null);
});

test("filterPlayers matches name, id, and alliance independently", () => {
  const players = buildPlayerStats(
    [
      makePlayer({ id: "1", playerName: "Alpha One", playerId: "10001", alliance: "SFS" }),
      makePlayer({ id: "2", playerName: "Beta Two", playerId: "20002", alliance: "ZRO" })
    ],
    []
  );

  const byName = filterPlayers(players, { nameSearch: "alpha", idSearch: "", alliance: "all" });
  assert.equal(byName.length, 1);
  assert.equal(byName[0]?.playerName, "Alpha One");

  const byId = filterPlayers(players, { nameSearch: "", idSearch: "20002", alliance: "all" });
  assert.equal(byId.length, 1);
  assert.equal(byId[0]?.playerId, "20002");

  const byAlliance = filterPlayers(players, { nameSearch: "", idSearch: "", alliance: "ZRO" });
  assert.equal(byAlliance.length, 1);
  assert.equal(byAlliance[0]?.alliance, "ZRO");

  const combined = filterPlayers(players, { nameSearch: "beta", idSearch: "20002", alliance: "ZRO" });
  assert.equal(combined.length, 1);
  assert.equal(combined[0]?.id, "2");
});

test("sortPlayers handles name and activity sorts with nulls last", () => {
  const players = buildPlayerStats(
    [
      makePlayer({ id: "1", playerName: "Charlie" }),
      makePlayer({ id: "2", playerName: "Alpha" }),
      makePlayer({ id: "3", playerName: "Bravo" })
    ],
    [
      makeEntry({
        id: "entry-1",
        player: makePlayer({ id: "2", playerName: "Alpha" }),
        submittedAt: "2026-03-01T00:00:00.000Z",
        editedAt: "2026-03-01T00:00:00.000Z"
      }),
      makeEntry({
        id: "entry-2",
        player: makePlayer({ id: "3", playerName: "Bravo" }),
        submittedAt: "2026-01-01T00:00:00.000Z",
        editedAt: "2026-01-01T00:00:00.000Z"
      })
    ]
  );

  const nameAsc = sortPlayers(players, "playerName", "asc").map((player) => player.playerName);
  assert.deepEqual(nameAsc, ["Alpha", "Bravo", "Charlie"]);

  const nameDesc = sortPlayers(players, "playerName", "desc").map((player) => player.playerName);
  assert.deepEqual(nameDesc, ["Charlie", "Bravo", "Alpha"]);

  const recentFirst = sortPlayers(players, "lastParticipationAt", "desc").map((player) => player.playerName);
  assert.deepEqual(recentFirst, ["Alpha", "Bravo", "Charlie"]);

  const oldestFirst = sortPlayers(players, "lastParticipationAt", "asc").map((player) => player.playerName);
  assert.deepEqual(oldestFirst, ["Bravo", "Alpha", "Charlie"]);
});

test("paginatePlayers returns page slices and range labels", () => {
  const players = buildPlayerStats(
    Array.from({ length: 5 }, (_, index) =>
      makePlayer({ id: `player-${index}`, playerName: `Player ${index}`, playerId: `${index}` })
    ),
    []
  );

  const firstPage = paginatePlayers(players, 1, 2);
  assert.equal(firstPage.items.length, 2);
  assert.equal(firstPage.total, 5);
  assert.equal(firstPage.totalPages, 3);
  assert.equal(firstPage.rangeLabel, "Showing 1–2 of 5");

  const lastPage = paginatePlayers(players, 3, 2);
  assert.equal(lastPage.items.length, 1);
  assert.equal(lastPage.rangeLabel, "Showing 5–5 of 5");

  const empty = paginatePlayers([], 1, 50);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.rangeLabel, "Showing 0 of 0");
});
