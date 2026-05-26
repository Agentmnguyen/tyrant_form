import assert from "node:assert/strict";
import test from "node:test";
import { generateEventNames } from "@/lib/eventNaming";
import type { ParticipationForm } from "@/lib/rosterTypes";
import { toggleHeroSelection, validateForm } from "@/lib/rosterValidation";

const validForm: ParticipationForm = {
  eventId: "event-1",
  playerName: "Mick",
  playerGameId: "12345",
  alliance: "STD",
  availability: "Full Event",
  infantryFcLevel: "FC8",
  infantryHelios: true,
  lancerFcLevel: "FC8",
  lancerHelios: false,
  marksmenFcLevel: "FC10",
  marksmenHelios: true,
  rallyJoinHeroes: ["Norah", "Renee"],
  defenseJoinHeroes: ["Ahmose", "Renee"]
};

test("valid participation form normalizes into a payload", () => {
  const result = validateForm(validForm);
  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.data.eventId, "event-1");
    assert.equal(result.data.playerGameId, "12345");
    assert.equal(result.data.availability, "Full Event");
    assert.deepEqual(result.data.rallyJoinHeroes, ["Norah", "Renee"]);
    assert.deepEqual(result.data.defenseJoinHeroes, ["Ahmose", "Renee"]);
  }
});

test("empty hero selections are valid", () => {
  const result = validateForm({
    ...validForm,
    rallyJoinHeroes: [],
    defenseJoinHeroes: []
  });

  assert.equal(result.ok, true);
});

test("hero toggle adds and removes choices", () => {
  assert.deepEqual(toggleHeroSelection(["Norah"], "Renee"), ["Norah", "Renee"]);
  assert.deepEqual(toggleHeroSelection(["Norah", "Renee"], "Norah"), ["Renee"]);
});

test("invalid hero choices are rejected by section", () => {
  const result = validateForm({
    ...validForm,
    rallyJoinHeroes: ["Ahmose" as never]
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.fieldErrors.rallyJoinHeroes, "Choose valid rally join heroes.");
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
