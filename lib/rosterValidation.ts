import { isAlliance, isAvailability, isExaltedSkillLevel, isFcLevel, isJoinHeroOption } from "@/lib/rosterConfig";
import type { ExaltedSkillLevel, JoinHeroOption } from "@/lib/rosterConfig";
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
    return firstError(fieldErrors, [
      "infantryFcLevel",
      "infantryExaltedSkillLevel",
      "lancerFcLevel",
      "lancerExaltedSkillLevel",
      "marksmenFcLevel",
      "marksmenExaltedSkillLevel"
    ]);
  }

  if (step === 3) {
    return firstError(fieldErrors, ["joinHeroes"]);
  }

  return result.ok ? "" : Object.values(fieldErrors)[0] || "Review your participation details.";
}

export function validateForm(form: ParticipationForm): { ok: true; data: ParticipationPayload } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const eventId = form.eventId.trim();
  const playerName = form.playerName.trim();
  const playerGameId = form.playerGameId.trim();
  const joinHeroes = normalizeJoinHeroes(form.joinHeroes);
  const hasInvalidJoinHero = form.joinHeroes.some((hero) => !isJoinHeroOption(hero));

  if (!eventId) fieldErrors.eventId = "No event is open for participation.";
  if (!playerName) fieldErrors.playerName = "Player name is required.";
  if (!playerGameId) fieldErrors.playerGameId = "Player ID is required.";
  if (!form.alliance || !isAlliance(form.alliance)) fieldErrors.alliance = "Choose the player's alliance.";
  if (!form.availability || !isAvailability(form.availability)) fieldErrors.availability = "Choose availability.";
  if (!form.infantryFcLevel || !isFcLevel(form.infantryFcLevel)) fieldErrors.infantryFcLevel = "Choose Infantry FC level.";
  if (!form.lancerFcLevel || !isFcLevel(form.lancerFcLevel)) fieldErrors.lancerFcLevel = "Choose Lancer FC level.";
  if (!form.marksmenFcLevel || !isFcLevel(form.marksmenFcLevel)) fieldErrors.marksmenFcLevel = "Choose Marksmen FC level.";
  if (form.infantryExaltedT12 && !isExaltedSkillLevel(form.infantryExaltedSkillLevel))
    fieldErrors.infantryExaltedSkillLevel = "Choose Infantry Exalted T12 skill level.";
  if (form.lancerExaltedT12 && !isExaltedSkillLevel(form.lancerExaltedSkillLevel))
    fieldErrors.lancerExaltedSkillLevel = "Choose Lancer Exalted T12 skill level.";
  if (form.marksmenExaltedT12 && !isExaltedSkillLevel(form.marksmenExaltedSkillLevel))
    fieldErrors.marksmenExaltedSkillLevel = "Choose Marksmen Exalted T12 skill level.";
  if (hasInvalidJoinHero) fieldErrors.joinHeroes = "Choose valid rally / defense heroes.";

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
      infantryExaltedT12: form.infantryExaltedT12,
      infantryExaltedSkillLevel: form.infantryExaltedT12 ? (form.infantryExaltedSkillLevel as ExaltedSkillLevel) : null,
      lancerFcLevel: form.lancerFcLevel as ParticipationPayload["lancerFcLevel"],
      lancerHelios: form.lancerHelios,
      lancerExaltedT12: form.lancerExaltedT12,
      lancerExaltedSkillLevel: form.lancerExaltedT12 ? (form.lancerExaltedSkillLevel as ExaltedSkillLevel) : null,
      marksmenFcLevel: form.marksmenFcLevel as ParticipationPayload["marksmenFcLevel"],
      marksmenHelios: form.marksmenHelios,
      marksmenExaltedT12: form.marksmenExaltedT12,
      marksmenExaltedSkillLevel: form.marksmenExaltedT12 ? (form.marksmenExaltedSkillLevel as ExaltedSkillLevel) : null,
      joinHeroes,
      joinVoiceCall: form.joinVoiceCall
    }
  };
}

export function validatePayload(value: unknown): { ok: true; data: ParticipationPayload } | { ok: false; fieldErrors: Record<string, string> } {
  if (!value || typeof value !== "object") {
    return { ok: false, fieldErrors: { form: "Invalid participation payload." } };
  }

  const payload = value as Partial<ParticipationForm> & {
    playerId?: unknown;
    joinVoiceCall?: unknown;
  };

  return validateForm({
    eventId: String(payload.eventId || ""),
    playerName: String(payload.playerName || ""),
    playerGameId: String(payload.playerGameId || payload.playerId || ""),
    alliance: (payload.alliance || "") as ParticipationForm["alliance"],
    availability: (payload.availability || "") as ParticipationForm["availability"],
    infantryFcLevel: (payload.infantryFcLevel || "") as ParticipationForm["infantryFcLevel"],
    infantryHelios: Boolean(payload.infantryHelios),
    infantryExaltedT12: Boolean(payload.infantryExaltedT12),
    infantryExaltedSkillLevel: toFormSkillLevel(payload.infantryExaltedSkillLevel),
    lancerFcLevel: (payload.lancerFcLevel || "") as ParticipationForm["lancerFcLevel"],
    lancerHelios: Boolean(payload.lancerHelios),
    lancerExaltedT12: Boolean(payload.lancerExaltedT12),
    lancerExaltedSkillLevel: toFormSkillLevel(payload.lancerExaltedSkillLevel),
    marksmenFcLevel: (payload.marksmenFcLevel || "") as ParticipationForm["marksmenFcLevel"],
    marksmenHelios: Boolean(payload.marksmenHelios),
    marksmenExaltedT12: Boolean(payload.marksmenExaltedT12),
    marksmenExaltedSkillLevel: toFormSkillLevel(payload.marksmenExaltedSkillLevel),
    joinHeroes: Array.isArray(payload.joinHeroes) ? (payload.joinHeroes as JoinHeroOption[]) : [],
    joinVoiceCall: payload.joinVoiceCall === null || payload.joinVoiceCall === undefined ? null : Boolean(payload.joinVoiceCall)
  });
}

export function normalizeJoinHeroes(heroes: readonly JoinHeroOption[]) {
  return Array.from(new Set(heroes.filter(isJoinHeroOption)));
}

export function toggleHeroSelection<T extends string>(current: readonly T[], hero: T) {
  return current.includes(hero) ? current.filter((selected) => selected !== hero) : [...current, hero];
}

export function normalizePlayerGameId(playerGameId: string) {
  return playerGameId.trim().toLowerCase();
}

function toFormSkillLevel(value: unknown): ParticipationForm["infantryExaltedSkillLevel"] {
  const level = value === null || value === undefined ? "" : String(value);
  return isExaltedSkillLevel(level) ? level : "";
}

function firstError(errors: Record<string, string>, keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean) || "";
}
