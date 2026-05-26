import type {
  Alliance,
  Availability,
  DefenseJoinHeroOption,
  EventStatus,
  EventType,
  FcLevel,
  RallyJoinHeroOption
} from "@/lib/rosterConfig";

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
  lancerFcLevel: FcLevel;
  lancerHelios: boolean;
  marksmenFcLevel: FcLevel;
  marksmenHelios: boolean;
  rallyJoinHeroes: RallyJoinHeroOption[];
  defenseJoinHeroes: DefenseJoinHeroOption[];
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
  lancerFcLevel: "" | FcLevel;
  lancerHelios: boolean;
  marksmenFcLevel: "" | FcLevel;
  marksmenHelios: boolean;
  rallyJoinHeroes: RallyJoinHeroOption[];
  defenseJoinHeroes: DefenseJoinHeroOption[];
};

export type ParticipationPayload = {
  eventId: string;
  playerName: string;
  playerGameId: string;
  alliance: Alliance;
  availability: Availability;
  infantryFcLevel: FcLevel;
  infantryHelios: boolean;
  lancerFcLevel: FcLevel;
  lancerHelios: boolean;
  marksmenFcLevel: FcLevel;
  marksmenHelios: boolean;
  rallyJoinHeroes: RallyJoinHeroOption[];
  defenseJoinHeroes: DefenseJoinHeroOption[];
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
  lancerFcLevel: "",
  lancerHelios: false,
  marksmenFcLevel: "",
  marksmenHelios: false,
  rallyJoinHeroes: [],
  defenseJoinHeroes: []
};
