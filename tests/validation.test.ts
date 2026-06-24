import assert from "node:assert/strict";
import test from "node:test";
import { deleteParticipationEntryWithDeps, deletePlayerWithDeps } from "@/lib/deleteServices";
import { generateEventNames } from "@/lib/eventNaming";
import type { ParticipationEntry, ParticipationForm, Player, RosterEvent } from "@/lib/rosterTypes";
import { toggleHeroSelection, validateForm } from "@/lib/rosterValidation";

const validForm: ParticipationForm = {
  eventId: "event-1",
  playerName: "Mick",
  playerGameId: "12345",
  alliance: "STD",
  availability: "Full Event",
  infantryFcLevel: "FC8",
  infantryHelios: true,
  infantryExaltedT12: false,
  lancerFcLevel: "FC8",
  lancerHelios: false,
  lancerExaltedT12: true,
  marksmenFcLevel: "FC10",
  marksmenHelios: true,
  marksmenExaltedT12: false,
  joinHeroes: ["Norah", "Renee", "Gatot"],
  joinVoiceCall: true
};

const testPlayer: Player = {
  id: "player-1",
  playerId: "12345",
  normalizedPlayerId: "12345",
  playerName: "Mick",
  alliance: "STD",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z"
};

const testEvent: RosterEvent = {
  id: "event-1",
  eventType: "SVS",
  name: "SVS - May 2026",
  monthYearLabel: "May 2026",
  status: "open",
  createdAt: "2026-05-01T00:00:00.000Z",
  openedAt: "2026-05-01T00:00:00.000Z",
  closedAt: null,
  lockedAt: null,
  archivedAt: null,
  googleSheetTabName: "SVS - May 2026"
};

const testParticipationEntry: ParticipationEntry = {
  id: "entry-1",
  playerId: testPlayer.id,
  eventId: testEvent.id,
  availability: "Full Event",
  infantryFcLevel: "FC8",
  infantryHelios: true,
  infantryExaltedT12: false,
  lancerFcLevel: "FC8",
  lancerHelios: false,
  lancerExaltedT12: true,
  marksmenFcLevel: "FC10",
  marksmenHelios: true,
  marksmenExaltedT12: false,
  joinHeroes: ["Norah"],
  joinVoiceCall: false,
  submittedAt: "2026-05-01T00:00:00.000Z",
  editedAt: "2026-05-01T00:00:00.000Z",
  sheetSyncStatus: "synced",
  sheetSyncedAt: "2026-05-01T00:00:00.000Z",
  sheetError: null,
  player: testPlayer,
  event: testEvent
};

test("valid participation form normalizes into a payload", () => {
  const result = validateForm(validForm);
  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.data.eventId, "event-1");
    assert.equal(result.data.playerGameId, "12345");
    assert.equal(result.data.availability, "Full Event");
    assert.deepEqual(result.data.joinHeroes, ["Norah", "Renee", "Gatot"]);
    assert.equal(result.data.joinVoiceCall, true);
  }
});

test("empty hero selections are valid", () => {
  const result = validateForm({
    ...validForm,
    joinHeroes: []
  });

  assert.equal(result.ok, true);
});

test("null voice call is valid and preserved", () => {
  const result = validateForm({
    ...validForm,
    joinVoiceCall: null
  });

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.data.joinVoiceCall, null);
  }
});

test("hero toggle adds and removes choices", () => {
  assert.deepEqual(toggleHeroSelection(["Norah"], "Renee"), ["Norah", "Renee"]);
  assert.deepEqual(toggleHeroSelection(["Norah", "Renee"], "Norah"), ["Renee"]);
});

test("invalid hero choices are rejected", () => {
  const result = validateForm({
    ...validForm,
    joinHeroes: ["Gwen" as never]
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.fieldErrors.joinHeroes, "Choose valid rally / defense heroes.");
  }
});

test("event tab names append a suffix by event type and month", () => {
  const date = new Date("2026-05-18T12:00:00Z");

  assert.deepEqual(generateEventNames("SVS", [], date), {
    name: "SVS - May 2026",
    monthYearLabel: "May 2026",
    googleSheetTabName: "SVS - May 2026"
  });
  assert.equal(generateEventNames("SVS", [{ eventType: "SVS", monthYearLabel: "May 2026", name: "SVS - May 2026" }], date).name, "SVS - May 2026 #2");
  assert.equal(
    generateEventNames("Frost Dragon Tyrant", [{ eventType: "SVS", monthYearLabel: "May 2026", name: "SVS - May 2026" }], date).name,
    "Frost Dragon Tyrant - May 2026"
  );
});

test("participation delete removes the requested entry", async () => {
  let deletedEntryId = "";

  const deleted = await deleteParticipationEntryWithDeps("entry-1", {
    getEntry: async (id) => {
      assert.equal(id, "entry-1");
      return testParticipationEntry;
    },
    deleteEntry: async (id) => {
      deletedEntryId = id;
    }
  });

  assert.equal(deleted.id, "entry-1");
  assert.equal(deletedEntryId, "entry-1");
});

test("player delete is blocked when participation entries exist", async () => {
  let deleteCalled = false;

  await assert.rejects(
    () =>
      deletePlayerWithDeps("player-1", {
        getPlayer: async () => testPlayer,
        getParticipationCount: async () => 1,
        deletePlayer: async () => {
          deleteCalled = true;
        }
      }),
    (error) => error instanceof Error && error.name === "PlayerHasParticipationError"
  );

  assert.equal(deleteCalled, false);
});

test("player delete is allowed when no participation entries exist", async () => {
  let deletedPlayerId = "";

  const deleted = await deletePlayerWithDeps("player-1", {
    getPlayer: async () => testPlayer,
    getParticipationCount: async () => 0,
    deletePlayer: async (id) => {
      deletedPlayerId = id;
    }
  });

  assert.equal(deleted.id, "player-1");
  assert.equal(deletedPlayerId, "player-1");
});
