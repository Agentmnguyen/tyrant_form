import "server-only";
import { createSign } from "node:crypto";
import { ROSTER_CONFIG } from "@/lib/rosterConfig";
import type { ParticipationEntry, Player, RosterEvent } from "@/lib/rosterTypes";

const SHEET_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const PLAYER_ID_COLUMN = "A";
const PARTICIPATION_ID_COLUMN = "A";

const PLAYER_HEADERS = [
  "Player UUID",
  "Player ID",
  "Player Name",
  "Alliance",
  "Created At",
  "Updated At",
  "Row Status",
  "Deleted At"
];

const PARTICIPATION_HEADERS = [
  "Participation UUID",
  "Event UUID",
  "Event Type",
  "Event Name",
  "Event Status",
  "Player UUID",
  "Player ID",
  "Player Name",
  "Alliance",
  "Availability",
  "Infantry FC Level",
  "Infantry Helios",
  "Infantry Exalted T12",
  "Lancer FC Level",
  "Lancer Helios",
  "Lancer Exalted T12",
  "Marksmen FC Level",
  "Marksmen Helios",
  "Marksmen Exalted T12",
  "Rally / Defense Heroes",
  "Voice Call",
  "Submitted At",
  "Edited At",
  "Sheet Sync Status",
  "Sheet Synced At",
  "Sheet Error",
  "Row Status",
  "Deleted At"
];

type SheetProperties = {
  sheets?: Array<{
    properties?: {
      title?: string;
    };
  }>;
};

export async function syncParticipationToGoogleSheets(entry: ParticipationEntry) {
  assertGoogleSheetsConfig();
  const sheets = [ROSTER_CONFIG.masterParticipationSheetName, entry.event.googleSheetTabName];
  await ensureSheet(ROSTER_CONFIG.masterPlayersSheetName, ...sheets);
  await writePlayerHeaders(ROSTER_CONFIG.masterPlayersSheetName);
  await writeParticipationHeaders(...sheets);
  await upsertPlayer(entry.player);

  for (const sheet of sheets) {
    await upsertParticipation(sheet, entry);
  }
}

export async function markParticipationDeletedInGoogleSheets(entry: ParticipationEntry) {
  assertGoogleSheetsConfig();
  const sheets = [ROSTER_CONFIG.masterParticipationSheetName, entry.event.googleSheetTabName];
  await ensureSheet(...sheets);
  await writeParticipationHeaders(...sheets);

  for (const sheet of sheets) {
    await markParticipationDeleted(sheet, entry);
  }
}

export async function markPlayerDeletedInGoogleSheets(player: Player) {
  assertGoogleSheetsConfig();
  await ensureSheet(ROSTER_CONFIG.masterPlayersSheetName);
  await writePlayerHeaders(ROSTER_CONFIG.masterPlayersSheetName);

  const rows = await findRowsById(ROSTER_CONFIG.masterPlayersSheetName, PLAYER_ID_COLUMN, player.id);
  const values = [playerRow(player, { rowStatus: "deleted", deletedAt: new Date().toISOString() })];

  for (const rowNumber of rows) {
    await updateValues(sheetRange(ROSTER_CONFIG.masterPlayersSheetName, `A${rowNumber}:H${rowNumber}`), values);
  }
}

export async function ensureEventSheet(event: RosterEvent) {
  assertGoogleSheetsConfig();
  await ensureSheet(ROSTER_CONFIG.masterPlayersSheetName, ROSTER_CONFIG.masterParticipationSheetName, event.googleSheetTabName);
  await writePlayerHeaders(ROSTER_CONFIG.masterPlayersSheetName);
  await writeParticipationHeaders(ROSTER_CONFIG.masterParticipationSheetName, event.googleSheetTabName);
}

export function getGoogleSheetsConfigStatus() {
  return {
    googleSheetId: Boolean(process.env.GOOGLE_SHEET_ID),
    legacyGoogleSheetsSpreadsheetId: Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
    googleServiceAccountEmail: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    googlePrivateKey: Boolean(process.env.GOOGLE_PRIVATE_KEY)
  };
}

export function isGoogleSheetsSyncEnabled() {
  const config = getGoogleSheetsConfigStatus();
  return (
    (config.googleSheetId || config.legacyGoogleSheetsSpreadsheetId) &&
    config.googleServiceAccountEmail &&
    config.googlePrivateKey
  );
}

function assertGoogleSheetsConfig() {
  const config = getGoogleSheetsConfigStatus();
  const missing: string[] = [];

  if (!config.googleSheetId && !config.legacyGoogleSheetsSpreadsheetId) missing.push("GOOGLE_SHEET_ID");
  if (!config.googleServiceAccountEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!config.googlePrivateKey) missing.push("GOOGLE_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(`Google Sheets config missing: ${missing.join(", ")}`);
  }
}

async function ensureSheet(...sheetNames: string[]) {
  const spreadsheetId = getSpreadsheetId();
  const sheetInfo = await sheetsFetch<SheetProperties>(`${SHEET_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`);
  const existing = new Set((sheetInfo.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));
  const requests: Array<{ addSheet: { properties: { title: string } } }> = sheetNames
    .filter((sheetName) => !existing.has(sheetName))
    .map((title) => ({ addSheet: { properties: { title } } }));

  if (requests.length > 0) {
    await sheetsFetch(`${SHEET_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests })
    });
  }
}

async function writePlayerHeaders(sheetName: string) {
  await updateValues(sheetRange(sheetName, "A1:H1"), [PLAYER_HEADERS]);
}

async function writeParticipationHeaders(...sheetNames: string[]) {
  const lastColumn = participationLastColumn();
  for (const sheetName of sheetNames) {
    await updateValues(sheetRange(sheetName, `A1:${lastColumn}1`), [PARTICIPATION_HEADERS]);
  }
}

async function upsertPlayer(player: Player) {
  const rows = await findRowsById(ROSTER_CONFIG.masterPlayersSheetName, PLAYER_ID_COLUMN, player.id);
  const values = [playerRow(player)];

  if (rows.length === 0) {
    await appendValues(sheetRange(ROSTER_CONFIG.masterPlayersSheetName, "A:H"), values);
    return;
  }

  for (const rowNumber of rows) {
    await updateValues(sheetRange(ROSTER_CONFIG.masterPlayersSheetName, `A${rowNumber}:H${rowNumber}`), values);
  }
}

async function upsertParticipation(sheetName: string, entry: ParticipationEntry) {
  const rows = await findRowsById(sheetName, PARTICIPATION_ID_COLUMN, entry.id);
  const values = [participationRow(entry)];
  const lastColumn = participationLastColumn();

  if (rows.length === 0) {
    await appendValues(sheetRange(sheetName, `A:${lastColumn}`), values);
    return;
  }

  for (const rowNumber of rows) {
    await updateValues(sheetRange(sheetName, `A${rowNumber}:${lastColumn}${rowNumber}`), values);
  }
}

async function markParticipationDeleted(sheetName: string, entry: ParticipationEntry) {
  const rows = await findRowsById(sheetName, PARTICIPATION_ID_COLUMN, entry.id);
  const values = [participationRow(entry, { rowStatus: "deleted", deletedAt: new Date().toISOString() })];
  const lastColumn = participationLastColumn();

  for (const rowNumber of rows) {
    await updateValues(sheetRange(sheetName, `A${rowNumber}:${lastColumn}${rowNumber}`), values);
  }
}

async function findRowsById(sheetName: string, column: string, id: string) {
  const response = await getValues(sheetRange(sheetName, `${column}:${column}`));
  return (response.values || []).flatMap((row, index) => (index > 0 && row[0] === id ? [index + 1] : []));
}

function playerRow(player: Player, override: { rowStatus?: string; deletedAt?: string } = {}) {
  return [
    player.id,
    player.playerId,
    player.playerName,
    player.alliance,
    player.createdAt,
    player.updatedAt,
    override.rowStatus || "active",
    override.deletedAt || ""
  ];
}

function participationRow(entry: ParticipationEntry, override: { rowStatus?: string; deletedAt?: string } = {}) {
  return [
    entry.id,
    entry.event.id,
    entry.event.eventType,
    entry.event.name,
    entry.event.status,
    entry.player.id,
    entry.player.playerId,
    entry.player.playerName,
    entry.player.alliance,
    entry.availability,
    entry.infantryFcLevel,
    yesNo(entry.infantryHelios),
    yesNo(entry.infantryExaltedT12),
    entry.lancerFcLevel,
    yesNo(entry.lancerHelios),
    yesNo(entry.lancerExaltedT12),
    entry.marksmenFcLevel,
    yesNo(entry.marksmenHelios),
    yesNo(entry.marksmenExaltedT12),
    entry.joinHeroes.join(", "),
    voiceCallValue(entry.joinVoiceCall),
    entry.submittedAt,
    entry.editedAt,
    entry.sheetSyncStatus,
    entry.sheetSyncedAt || "",
    entry.sheetError || "",
    override.rowStatus || "active",
    override.deletedAt || ""
  ];
}

async function getValues(range: string) {
  return sheetsFetch<{ values?: string[][] }>(`${SHEET_API_BASE}/${getSpreadsheetId()}/values/${encodeURIComponent(range)}`);
}

async function updateValues(range: string, values: string[][]) {
  await sheetsFetch(`${SHEET_API_BASE}/${getSpreadsheetId()}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ values })
  });
}

async function appendValues(range: string, values: string[][]) {
  await sheetsFetch(
    `${SHEET_API_BASE}/${getSpreadsheetId()}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values })
    }
  );
}

function participationLastColumn() {
  return columnLetter(PARTICIPATION_HEADERS.length);
}

function columnLetter(index: number) {
  let n = index;
  let result = "";

  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }

  return result;
}

function sheetRange(sheet: string, range: string) {
  return `'${sheet.replaceAll("'", "''")}'!${range}`;
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function voiceCallValue(value: boolean | null) {
  if (value === null) return "";
  return yesNo(value);
}

function getSpreadsheetId() {
  return process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
}

async function sheetsFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(parsed.error?.message || "Google Sheets request failed.");
  }

  return parsed as T;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const privateKey = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const jwt = `${unsigned}.${base64Url(signer.sign(privateKey))}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || "Unable to authenticate Google Sheets.");
  }

  return String(result.access_token);
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
