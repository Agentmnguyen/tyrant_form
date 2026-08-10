import type { Alliance, Availability, EventStatus, EventType, ExaltedSkillLevel, FcLevel, JoinHeroOption } from "@/lib/rosterConfig";

export type SheetSyncStatus = "pending" | "synced" | "sheet_sync_failed";

export type Player = {
  id: string;
  playerId: string;
  normalizedPlayerId: string;
  playerName: string;
  alliance: Alliance;
  createdAt: string;
  updatedAt: string;
};

export type RosterEvent = {
  id: string;
  eventType: EventType;
  name: string;
  monthYearLabel: string;
  status: EventStatus;
  createdAt: string;
  openedAt: string | null;
  closedAt: string | null;
  lockedAt: string | null;
  archivedAt: string | null;
  googleSheetTabName: string;
};

export type ParticipationEntry = {
  id: string;
  playerId: string;
  eventId: string;
  availability: Availability;
  infantryFcLevel: FcLevel;
  infantryHelios: boolean;
  infantryExaltedT12: boolean;
  infantryExaltedSkillLevel: ExaltedSkillLevel | null;
  lancerFcLevel: FcLevel;
  lancerHelios: boolean;
  lancerExaltedT12: boolean;
  lancerExaltedSkillLevel: ExaltedSkillLevel | null;
  marksmenFcLevel: FcLevel;
  marksmenHelios: boolean;
  marksmenExaltedT12: boolean;
  marksmenExaltedSkillLevel: ExaltedSkillLevel | null;
  joinHeroes: JoinHeroOption[];
  joinVoiceCall: boolean | null;
  submittedAt: string;
  editedAt: string;
  sheetSyncStatus: SheetSyncStatus;
  sheetSyncedAt: string | null;
  sheetError: string | null;
  player: Player;
  event: RosterEvent;
};

export type ParticipationForm = {
  eventId: string;
  playerName: string;
  playerGameId: string;
  alliance: "" | Alliance;
  availability: "" | Availability;
  infantryFcLevel: "" | FcLevel;
  infantryHelios: boolean;
  infantryExaltedT12: boolean;
  infantryExaltedSkillLevel: "" | ExaltedSkillLevel;
  lancerFcLevel: "" | FcLevel;
  lancerHelios: boolean;
  lancerExaltedT12: boolean;
  lancerExaltedSkillLevel: "" | ExaltedSkillLevel;
  marksmenFcLevel: "" | FcLevel;
  marksmenHelios: boolean;
  marksmenExaltedT12: boolean;
  marksmenExaltedSkillLevel: "" | ExaltedSkillLevel;
  joinHeroes: JoinHeroOption[];
  joinVoiceCall: boolean | null;
};

export type ParticipationPayload = {
  eventId: string;
  playerName: string;
  playerGameId: string;
  alliance: Alliance;
  availability: Availability;
  infantryFcLevel: FcLevel;
  infantryHelios: boolean;
  infantryExaltedT12: boolean;
  infantryExaltedSkillLevel: ExaltedSkillLevel | null;
  lancerFcLevel: FcLevel;
  lancerHelios: boolean;
  lancerExaltedT12: boolean;
  lancerExaltedSkillLevel: ExaltedSkillLevel | null;
  marksmenFcLevel: FcLevel;
  marksmenHelios: boolean;
  marksmenExaltedT12: boolean;
  marksmenExaltedSkillLevel: ExaltedSkillLevel | null;
  joinHeroes: JoinHeroOption[];
  joinVoiceCall: boolean | null;
};

export type PlayerWithStats = Player & {
  participationCount: number;
  lastParticipationAt: string | null;
};

export type PlayerSortKey = "playerName" | "lastParticipationAt";

export type PlayerListFilters = {
  nameSearch: string;
  idSearch: string;
  alliance: Alliance | "all";
};

export type AdminSortKey =
  | "submittedAt"
  | "playerName"
  | "playerGameId"
  | "eventType"
  | "eventName"
  | "alliance"
  | "availability"
  | "infantryFcLevel"
  | "sheetSyncStatus";

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      message?: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string>;
      data?: T;
      conflict?: unknown;
    };

export const initialParticipationForm: ParticipationForm = {
  eventId: "",
  playerName: "",
  playerGameId: "",
  alliance: "",
  availability: "",
  infantryFcLevel: "",
  infantryHelios: false,
  infantryExaltedT12: false,
  infantryExaltedSkillLevel: "",
  lancerFcLevel: "",
  lancerHelios: false,
  lancerExaltedT12: false,
  lancerExaltedSkillLevel: "",
  marksmenFcLevel: "",
  marksmenHelios: false,
  marksmenExaltedT12: false,
  marksmenExaltedSkillLevel: "",
  joinHeroes: [],
  joinVoiceCall: null
};
