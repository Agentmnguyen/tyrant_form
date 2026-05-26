import assert from "node:assert/strict";
import test from "node:test";
import { generateEventNames } from "@/lib/eventNaming";
import { NONE_HERO_OPTION } from "@/lib/rosterConfig";
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
  heroes: ["Ahmose", "Renee"],
  notes: "Can flex timing."
};

test("valid participation form normalizes into a payload", () => {
  const result = validateForm(validForm);
  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.data.eventId, "event-1");
    assert.equal(result.data.playerGameId, "12345");
    assert.equal(result.data.availability, "Full Event");
    assert.deepEqual(result.data.heroes, ["Ahmose", "Renee"]);
    assert.equal(result.data.notes, "Can flex timing.");
  }
});

test("None of the above clears selected heroes", () => {
  const result = toggleHeroSelection(["Ahmose", "Gatot"], NONE_HERO_OPTION);
  assert.deepEqual(result, [NONE_HERO_OPTION]);
});

test("selecting a hero clears None of the above", () => {
  const result = toggleHeroSelection([NONE_HERO_OPTION], "Wu Ming");
  assert.deepEqual(result, ["Wu Ming"]);
});

test("None of the above cannot be combined with other heroes", () => {
  const result = validateForm({
    ...validForm,
    heroes: ["Ahmose", NONE_HERO_OPTION]
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.fieldErrors.heroes, `"${NONE_HERO_OPTION}" cannot be combined with other heroes.`);
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
