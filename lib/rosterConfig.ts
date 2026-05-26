export const ROSTER_CONFIG = {
  appName: "1474 Event Roster",
  masterPlayersSheetName: "MASTER_PLAYERS",
  masterParticipationSheetName: "MASTER_PARTICIPATION",
  eventTypes: ["SVS", "Frost Dragon Tyrant"],
  eventStatuses: ["draft", "open", "locked", "archived"],
  alliances: ["STD", "LOC", "HPY", "TEX", "NGL", "DIE"],
  availabilityOptions: ["Full Event", "3-4 hours", "2-3 hours", "Casual / Under 2 hours"],
  fcLevels: ["FC5", "FC6", "FC7", "FC8", "FC9", "FC10"],
  troopTypes: ["Infantry", "Lancer", "Marksmen"],
  rallyJoinHeroOptions: ["Norah", "Renee", "Mia", "Hendrik", "Gwen"],
  defenseJoinHeroOptions: ["Renee", "Wu Ming", "Gordan", "Ahmose", "Gatot"]
} as const;

export type EventType = (typeof ROSTER_CONFIG.eventTypes)[number];
export type EventStatus = (typeof ROSTER_CONFIG.eventStatuses)[number];
export type Alliance = (typeof ROSTER_CONFIG.alliances)[number];
export type Availability = (typeof ROSTER_CONFIG.availabilityOptions)[number];
export type FcLevel = (typeof ROSTER_CONFIG.fcLevels)[number];
export type TroopType = (typeof ROSTER_CONFIG.troopTypes)[number];
export type RallyJoinHeroOption = (typeof ROSTER_CONFIG.rallyJoinHeroOptions)[number];
export type DefenseJoinHeroOption = (typeof ROSTER_CONFIG.defenseJoinHeroOptions)[number];
export type HeroOption = RallyJoinHeroOption | DefenseJoinHeroOption;

export function isEventType(value: string): value is EventType {
  return (ROSTER_CONFIG.eventTypes as readonly string[]).includes(value);
}

export function isEventStatus(value: string): value is EventStatus {
  return (ROSTER_CONFIG.eventStatuses as readonly string[]).includes(value);
}

export function isAlliance(value: string): value is Alliance {
  return (ROSTER_CONFIG.alliances as readonly string[]).includes(value);
}

export function isAvailability(value: string): value is Availability {
  return (ROSTER_CONFIG.availabilityOptions as readonly string[]).includes(value);
}

export function isFcLevel(value: string): value is FcLevel {
  return (ROSTER_CONFIG.fcLevels as readonly string[]).includes(value);
}

export function isHeroOption(value: string): value is HeroOption {
  return isRallyJoinHeroOption(value) || isDefenseJoinHeroOption(value);
}

export function isRallyJoinHeroOption(value: string): value is RallyJoinHeroOption {
  return (ROSTER_CONFIG.rallyJoinHeroOptions as readonly string[]).includes(value);
}

export function isDefenseJoinHeroOption(value: string): value is DefenseJoinHeroOption {
  return (ROSTER_CONFIG.defenseJoinHeroOptions as readonly string[]).includes(value);
}

export function allHeroOptions() {
  return Array.from(new Set([...ROSTER_CONFIG.rallyJoinHeroOptions, ...ROSTER_CONFIG.defenseJoinHeroOptions]));
}
