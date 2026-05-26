import {
  NONE_HERO_OPTION,
  isAlliance,
  isAvailability,
  isFcLevel,
  isHeroOption
} from "@/lib/rosterConfig";
import type { HeroOption } from "@/lib/rosterConfig";
import type { ParticipationForm, ParticipationPayload } from "@/lib/rosterTypes";

export function validateStep(step: number, form: ParticipationForm): string {
  const result = validateForm(form);
  const fieldErrors = result.ok ? {} : result.fieldErrors;

  if (step === 0) {
    return firstError(fieldErrors, ["eventId"]);
  }

  if (step === 1) {
    return firstError(fieldErrors, ["playerName", "playerGameId", "alliance"]);
  }

  if (step === 2) {
    return firstError(fieldErrors, ["availability"]);
  }

  if (step === 3) {
    return firstError(fieldErrors, ["infantryFcLevel", "lancerFcLevel", "marksmenFcLevel"]);
  }

  if (step === 4) {
    return firstError(fieldErrors, ["heroes"]);
  }

  return result.ok ? "" : Object.values(fieldErrors)[0] || "Review your participation details.";
}

export function validateForm(form: ParticipationForm): { ok: true; data: ParticipationPayload } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const eventId = form.eventId.trim();
  const playerName = form.playerName.trim();
  const playerGameId = form.playerGameId.trim();
  const notes = form.notes.trim();
  const hasInvalidHero = form.heroes.some((hero) => !isHeroOption(hero));
  const heroes = normalizeHeroes(form.heroes);

  if (!eventId) fieldErrors.eventId = "Choose an open event.";
  if (!playerName) fieldErrors.playerName = "Player name is required.";
  if (!playerGameId) fieldErrors.playerGameId = "Player ID is required.";
  if (!form.alliance || !isAlliance(form.alliance)) fieldErrors.alliance = "Choose the player's alliance.";
  if (!form.availability || !isAvailability(form.availability)) fieldErrors.availability = "Choose availability.";
  if (!form.infantryFcLevel || !isFcLevel(form.infantryFcLevel)) fieldErrors.infantryFcLevel = "Choose Infantry FC level.";
  if (!form.lancerFcLevel || !isFcLevel(form.lancerFcLevel)) fieldErrors.lancerFcLevel = "Choose Lancer FC level.";
  if (!form.marksmenFcLevel || !isFcLevel(form.marksmenFcLevel)) fieldErrors.marksmenFcLevel = "Choose Marksmen FC level.";
  if (heroes.length === 0) fieldErrors.heroes = "Choose at least one hero option.";
  if (hasInvalidHero) fieldErrors.heroes = "Choose valid hero options.";
  if (heroes.length > 1 && heroes.includes(NONE_HERO_OPTION)) {
    fieldErrors.heroes = `"${NONE_HERO_OPTION}" cannot be combined with other heroes.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      eventId,
      playerName,
      playerGameId,
      alliance: form.alliance as ParticipationPayload["alliance"],
      availability: form.availability as ParticipationPayload["availability"],
      infantryFcLevel: form.infantryFcLevel as ParticipationPayload["infantryFcLevel"],
      infantryHelios: form.infantryHelios,
      lancerFcLevel: form.lancerFcLevel as ParticipationPayload["lancerFcLevel"],
      lancerHelios: form.lancerHelios,
      marksmenFcLevel: form.marksmenFcLevel as ParticipationPayload["marksmenFcLevel"],
      marksmenHelios: form.marksmenHelios,
      heroes,
      notes
    }
  };
}

export function validatePayload(value: unknown): { ok: true; data: ParticipationPayload } | { ok: false; fieldErrors: Record<string, string> } {
  if (!value || typeof value !== "object") {
    return { ok: false, fieldErrors: { form: "Invalid participation payload." } };
  }

  const payload = value as Partial<ParticipationForm> & {
    playerId?: unknown;
  };

  return validateForm({
    eventId: String(payload.eventId || ""),
    playerName: String(payload.playerName || ""),
    playerGameId: String(payload.playerGameId || payload.playerId || ""),
    alliance: (payload.alliance || "") as ParticipationForm["alliance"],
    availability: (payload.availability || "") as ParticipationForm["availability"],
    infantryFcLevel: (payload.infantryFcLevel || "") as ParticipationForm["infantryFcLevel"],
    infantryHelios: Boolean(payload.infantryHelios),
    lancerFcLevel: (payload.lancerFcLevel || "") as ParticipationForm["lancerFcLevel"],
    lancerHelios: Boolean(payload.lancerHelios),
    marksmenFcLevel: (payload.marksmenFcLevel || "") as ParticipationForm["marksmenFcLevel"],
    marksmenHelios: Boolean(payload.marksmenHelios),
    heroes: Array.isArray(payload.heroes) ? (payload.heroes as HeroOption[]) : [],
    notes: String(payload.notes || "")
  });
}

export function normalizeHeroes(heroes: readonly HeroOption[]) {
  const unique = Array.from(new Set(heroes.filter(isHeroOption)));

  if (unique.includes(NONE_HERO_OPTION)) {
    return unique.length === 1 ? [NONE_HERO_OPTION] : unique;
  }

  return unique;
}

export function toggleHeroSelection(current: readonly HeroOption[], hero: HeroOption) {
  if (hero === NONE_HERO_OPTION) {
    return current.includes(NONE_HERO_OPTION) ? [] : [NONE_HERO_OPTION];
  }

  const withoutNone = current.filter((selected) => selected !== NONE_HERO_OPTION);
  return withoutNone.includes(hero) ? withoutNone.filter((selected) => selected !== hero) : [...withoutNone, hero];
}

export function normalizePlayerGameId(playerGameId: string) {
  return playerGameId.trim().toLowerCase();
}

function firstError(errors: Record<string, string>, keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean) || "";
}
