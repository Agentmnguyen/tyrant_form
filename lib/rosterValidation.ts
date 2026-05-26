import {
  isAlliance,
  isAvailability,
  isDefenseJoinHeroOption,
  isFcLevel,
  isRallyJoinHeroOption
} from "@/lib/rosterConfig";
import type { DefenseJoinHeroOption, RallyJoinHeroOption } from "@/lib/rosterConfig";
import type { ParticipationForm, ParticipationPayload } from "@/lib/rosterTypes";

export function validateStep(step: number, form: ParticipationForm): string {
  const result = validateForm(form);
  const fieldErrors = result.ok ? {} : result.fieldErrors;

  if (step === 0) {
    return firstError(fieldErrors, ["playerName", "playerGameId", "alliance"]);
  }

  if (step === 1) {
    return firstError(fieldErrors, ["availability"]);
  }

  if (step === 2) {
    return firstError(fieldErrors, ["infantryFcLevel", "lancerFcLevel", "marksmenFcLevel"]);
  }

  if (step === 3) {
    return firstError(fieldErrors, ["rallyJoinHeroes", "defenseJoinHeroes"]);
  }

  return result.ok ? "" : Object.values(fieldErrors)[0] || "Review your participation details.";
}

export function validateForm(form: ParticipationForm): { ok: true; data: ParticipationPayload } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const eventId = form.eventId.trim();
  const playerName = form.playerName.trim();
  const playerGameId = form.playerGameId.trim();
  const rallyJoinHeroes = normalizeRallyJoinHeroes(form.rallyJoinHeroes);
  const defenseJoinHeroes = normalizeDefenseJoinHeroes(form.defenseJoinHeroes);
  const hasInvalidRallyHero = form.rallyJoinHeroes.some((hero) => !isRallyJoinHeroOption(hero));
  const hasInvalidDefenseHero = form.defenseJoinHeroes.some((hero) => !isDefenseJoinHeroOption(hero));

  if (!eventId) fieldErrors.eventId = "No event is open for participation.";
  if (!playerName) fieldErrors.playerName = "Player name is required.";
  if (!playerGameId) fieldErrors.playerGameId = "Player ID is required.";
  if (!form.alliance || !isAlliance(form.alliance)) fieldErrors.alliance = "Choose the player's alliance.";
  if (!form.availability || !isAvailability(form.availability)) fieldErrors.availability = "Choose availability.";
  if (!form.infantryFcLevel || !isFcLevel(form.infantryFcLevel)) fieldErrors.infantryFcLevel = "Choose Infantry FC level.";
  if (!form.lancerFcLevel || !isFcLevel(form.lancerFcLevel)) fieldErrors.lancerFcLevel = "Choose Lancer FC level.";
  if (!form.marksmenFcLevel || !isFcLevel(form.marksmenFcLevel)) fieldErrors.marksmenFcLevel = "Choose Marksmen FC level.";
  if (hasInvalidRallyHero) fieldErrors.rallyJoinHeroes = "Choose valid rally join heroes.";
  if (hasInvalidDefenseHero) fieldErrors.defenseJoinHeroes = "Choose valid defense join heroes.";

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
      rallyJoinHeroes,
      defenseJoinHeroes
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
    rallyJoinHeroes: Array.isArray(payload.rallyJoinHeroes) ? (payload.rallyJoinHeroes as RallyJoinHeroOption[]) : [],
    defenseJoinHeroes: Array.isArray(payload.defenseJoinHeroes) ? (payload.defenseJoinHeroes as DefenseJoinHeroOption[]) : []
  });
}

export function normalizeRallyJoinHeroes(heroes: readonly RallyJoinHeroOption[]) {
  return Array.from(new Set(heroes.filter(isRallyJoinHeroOption)));
}

export function normalizeDefenseJoinHeroes(heroes: readonly DefenseJoinHeroOption[]) {
  return Array.from(new Set(heroes.filter(isDefenseJoinHeroOption)));
}

export function toggleHeroSelection<T extends string>(current: readonly T[], hero: T) {
  return current.includes(hero) ? current.filter((selected) => selected !== hero) : [...current, hero];
}

export function normalizePlayerGameId(playerGameId: string) {
  return playerGameId.trim().toLowerCase();
}

function firstError(errors: Record<string, string>, keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean) || "";
}
